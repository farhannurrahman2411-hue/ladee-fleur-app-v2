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
    .select('*, order_items(*)')
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
      }));

    if (cleanItems.length === 0) {
      return NextResponse.json(
        { error: 'Item produk tidak valid' },
        { status: 400 }
      );
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

    const itemsToInsert = cleanItems.map((it) => ({
      order_id: order.id,
      product_name: it.product_name,
      qty: it.qty,
      price: it.price,
    }));

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsErr) throw itemsErr;

    return NextResponse.json({ ok: true, order });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan pesanan' },
      { status: 500 }
    );
  }
}
