import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { getSession } from '../../../lib/session';

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bulan = searchParams.get('bulan');
  const search = searchParams.get('search');
  const detailed = searchParams.get('detailed') === 'true';
  const limit = Number(searchParams.get('limit')) || 200;

  const supabase = supabaseAdmin();

  // Lean select for fast list rendering vs detailed select for calculations
  const selectQuery = detailed
    ? '*, order_items(*, order_item_materials(*, materials(name, price, unit)))'
    : '*, order_items(id, product_name, qty, price)';

  let query = supabase.from('orders').select(selectQuery);

  if (bulan) {
    const start = `${bulan}-01`;
    const [y, m] = bulan.split('-').map(Number);
    const endDate = new Date(y, m, 0).getDate();
    const end = `${bulan}-${String(endDate).padStart(2, '0')}`;
    query = query.gte('order_date', start).lte('order_date', end);
  }

  if (search) {
    const q = search.trim();
    if (q.toUpperCase().startsWith('BKT')) {
      query = query.ilike('order_code', `%${q}%`);
    } else {
      query = query.ilike('customer_name', `%${q}%`);
    }
  }

  const { data, error } = await query
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data || [] });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { order_date, customer_name, dp, status_pesanan, notes, items } = body;
    if (!customer_name || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Nama customer dan minimal 1 produk wajib diisi' },
        { status: 400 }
      );
    }
    const cleanItems = items
      .filter((it) => it.product_name && Number(it.qty) > 0)
      .map((it) => ({
        product_name: String(it.product_name).trim(),
        qty: Number(it.qty),
        price: Number(it.price) || 0,
        materials_used: Array.isArray(it.materials_used) ? it.materials_used : [],
      }));
    if (cleanItems.length === 0) {
      return NextResponse.json({ error: 'Item produk tidak valid' }, { status: 400 });
    }

    const total = cleanItems.reduce((sum, it) => sum + it.qty * it.price, 0);
    const dpNum = Number(dp) || 0;
    const status_bayar = dpNum >= total ? 'LUNAS' : 'BELUM LUNAS';
    const supabase = supabaseAdmin();

    // 1. Insert Order Header (1 HTTP call)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_date: order_date || new Date().toISOString().slice(0, 10),
        customer_name: customer_name.trim(),
        total,
        dp: dpNum,
        status_bayar,
        status_pesanan: status_pesanan || 'Diproses',
        notes: notes || null,
        created_by: session.username,
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // 2. Prepare items for batch insert
    const itemInsertRows = [];
    const itemMaterialsMap = [];

    cleanItems.forEach((it, idx) => {
      let hpp = 0;
      const matRows = [];
      for (const mu of it.materials_used) {
        const qtyUsed = Number(mu.qty_used) || 0;
        const unitPrice = Number(mu.price) || 0;
        if (qtyUsed <= 0 || !mu.material_id) continue;
        hpp += qtyUsed * unitPrice;
        matRows.push({
          material_id: mu.material_id,
          qty_used: qtyUsed * it.qty,
          unit_price: unitPrice,
        });
      }

      itemInsertRows.push({
        order_id: order.id,
        product_name: it.product_name,
        qty: it.qty,
        price: it.price,
        hpp: hpp * it.qty,
      });

      itemMaterialsMap.push(matRows);
    });

    // 3. Batch insert order items (1 HTTP call)
    const { data: insertedItems, error: itemsErr } = await supabase
      .from('order_items')
      .insert(itemInsertRows)
      .select();

    if (itemsErr) throw itemsErr;

    // 4. Batch insert all order item materials & batch stock decrements
    const allMaterialInsertRows = [];
    const stockDeductMap = {};

    (insertedItems || []).forEach((insertedItem, idx) => {
      const matRows = itemMaterialsMap[idx] || [];
      matRows.forEach((mr) => {
        allMaterialInsertRows.push({
          order_item_id: insertedItem.id,
          material_id: mr.material_id,
          qty_used: mr.qty_used,
          unit_price: mr.unit_price,
        });
        stockDeductMap[mr.material_id] = (stockDeductMap[mr.material_id] || 0) + mr.qty_used;
      });
    });

    if (allMaterialInsertRows.length > 0) {
      // 1 Batch Insert for all materials
      const { error: matErr } = await supabase
        .from('order_item_materials')
        .insert(allMaterialInsertRows);
      if (matErr) console.error('Error inserting order item materials:', matErr);

      // Parallel stock decrements
      const decrementPromises = Object.entries(stockDeductMap).map(([materialId, qty]) =>
        supabase.rpc('decrement_stock', {
          p_material_id: materialId,
          p_qty: qty,
        })
      );
      await Promise.all(decrementPromises);
    }

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    console.error('Error creating order:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan pesanan' },
      { status: 500 }
    );
  }
}
