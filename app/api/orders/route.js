import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { getSession } from '../../../lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  }
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, order_item_materials(*, materials(name)))')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ orders: data });
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

    for (const it of cleanItems) {
      let hpp = 0;
      const materialRows = [];
      for (const mu of it.materials_used) {
        const qtyUsed = Number(mu.qty_used) || 0;
        const unitPrice = Number(mu.price) || 0;
        if (qtyUsed <= 0 || !mu.material_id) continue;
        hpp += qtyUsed * unitPrice;
        materialRows.push({
          material_id: mu.material_id,
          qty_used: qtyUsed,
          unit_price: unitPrice,
        });
      }

      const { data: orderItem, error: itemErr } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_name: it.product_name,
          qty: it.qty,
          price: it.price,
          hpp: hpp * it.qty,
        })
        .select()
        .single();
      if (itemErr) throw itemErr;

      for (const mr of materialRows) {
        await supabase.from('order_item_materials').insert({
          order_item_id: orderItem.id,
          material_id: mr.material_id,
          qty_used: mr.qty_used * it.qty,
          unit_price: mr.unit_price,
        });
await supabase.rpc('decrement_stock', {
            p_material_id: mr.material_id,
            p_qty: mr.qty_used * it.qty,
          });
      }
    }

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan pesanan' },
      { status: 500 }
    );
  }
}
