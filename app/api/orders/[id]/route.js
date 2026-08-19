import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getSession } from '../../../../lib/session';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  }
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, order_item_materials(*, materials(name, unit, price)))')
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
  }
  return NextResponse.json({ order: data });
}

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const supabase = supabaseAdmin();
    const updates = {};

    if (body.status_pesanan) updates.status_pesanan = body.status_pesanan;
    if (body.status_bayar) {
      updates.status_bayar = body.status_bayar;
      if (body.status_bayar === 'LUNAS') {
        const { data: existing } = await supabase
          .from('orders')
          .select('total')
          .eq('id', params.id)
          .single();
        updates.dp = existing?.total || 0;
      }
    }
    if (body.dp !== undefined) {
      const { data: existing } = await supabase
        .from('orders')
        .select('total')
        .eq('id', params.id)
        .single();
      const dpNum = Number(body.dp) || 0;
      updates.dp = dpNum;
      updates.status_bayar = dpNum >= (existing?.total || 0) ? 'LUNAS' : 'BELUM LUNAS';
    }
    if (body.pengerja !== undefined) updates.pengerja = body.pengerja;
    if (body.tanggal_ambil !== undefined) updates.tanggal_ambil = body.tanggal_ambil || null;
    if (body.progres_pembuatan) updates.progres_pembuatan = body.progres_pembuatan;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.customer_name !== undefined) updates.customer_name = body.customer_name;
    if (body.order_date !== undefined) updates.order_date = body.order_date;

    // Item updates with batch operations (Owner only)
    if (Array.isArray(body.items)) {
      if (session.role !== 'owner') {
        return NextResponse.json({ error: 'Hanya owner yang boleh edit item pesanan' }, { status: 403 });
      }

      // 1. Fetch old items and materials (1 query)
      const { data: oldItems } = await supabase
        .from('order_items')
        .select('id, order_item_materials(material_id, qty_used)')
        .eq('order_id', params.id);

      // 2. Aggregate old stock restock amounts in memory
      const restockMap = {};
      for (const oi of oldItems || []) {
        for (const mu of oi.order_item_materials || []) {
          if (mu.material_id && mu.qty_used) {
            restockMap[mu.material_id] = (restockMap[mu.material_id] || 0) + Number(mu.qty_used);
          }
        }
      }

      // Parallel restock (1 roundtrip)
      const restockPromises = Object.entries(restockMap).map(([matId, qty]) =>
        supabase.rpc('increment_stock', { p_material_id: matId, p_qty: qty })
      );
      await Promise.all(restockPromises);

      // 3. Delete old items in 1 query
      await supabase.from('order_items').delete().eq('order_id', params.id);

      // 4. Clean and prepare new items
      const cleanItems = body.items
        .filter((it) => it.product_name && Number(it.qty) > 0)
        .map((it) => ({
          product_name: String(it.product_name).trim(),
          qty: Number(it.qty),
          price: Number(it.price) || 0,
          materials_used: Array.isArray(it.materials_used) ? it.materials_used : [],
        }));

      let newTotal = 0;
      const itemInsertRows = [];
      const itemMaterialsMap = [];

      cleanItems.forEach((it) => {
        newTotal += it.qty * it.price;
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
          order_id: params.id,
          product_name: it.product_name,
          qty: it.qty,
          price: it.price,
          hpp: hpp * it.qty,
        });

        itemMaterialsMap.push(matRows);
      });

      // 5. Batch insert new items (1 query)
      if (itemInsertRows.length > 0) {
        const { data: insertedItems, error: itemErr } = await supabase
          .from('order_items')
          .insert(itemInsertRows)
          .select();

        if (itemErr) throw itemErr;

        // 6. Batch insert all new materials (1 query) & parallel stock deduct
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
          await supabase.from('order_item_materials').insert(allMaterialInsertRows);
          const deductPromises = Object.entries(stockDeductMap).map(([matId, qty]) =>
            supabase.rpc('decrement_stock', { p_material_id: matId, p_qty: qty })
          );
          await Promise.all(deductPromises);
        }
      }

      updates.total = newTotal;
      const { data: existing } = await supabase
        .from('orders')
        .select('dp')
        .eq('id', params.id)
        .single();
      updates.status_bayar = Number(existing?.dp || 0) >= newTotal ? 'LUNAS' : 'BELUM LUNAS';
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, order: data });
  } catch (err) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: err.message || 'Gagal update pesanan' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh menghapus' }, { status: 403 });
  }
  const supabase = supabaseAdmin();
  const { error } = await supabase.from('orders').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
