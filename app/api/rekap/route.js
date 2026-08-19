import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { getSession } from '../../../lib/session';

export async function GET(request) {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Khusus owner' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const bulan = searchParams.get('bulan'); // format YYYY-MM, opsional

  const supabase = supabaseAdmin();
  // Lean select: order_items already contains product_name, qty, price, and hpp
  let query = supabase
    .from('orders')
    .select('id, order_code, order_date, customer_name, total, dp, status_bayar, status_pesanan, order_items(product_name, qty, price, hpp)');

  if (bulan) {
    const start = `${bulan}-01`;
    const [y, m] = bulan.split('-').map(Number);
    const endDate = new Date(y, m, 0).getDate();
    const end = `${bulan}-${String(endDate).padStart(2, '0')}`;
    query = query.gte('order_date', start).lte('order_date', end);
  }

  const { data: orders, error } = await query.order('order_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orderList = orders || [];
  const total_pesanan = orderList.length;
  let total_omzet = 0;
  let total_dp_masuk = 0;
  let piutang = 0;
  let total_hpp = 0;

  const produkMap = {};

  for (let i = 0; i < total_pesanan; i++) {
    const o = orderList[i];
    const totalNum = Number(o.total || 0);
    const dpNum = Number(o.dp || 0);

    total_omzet += totalNum;
    total_dp_masuk += dpNum;
    piutang += totalNum - dpNum;

    for (const it of o.order_items || []) {
      total_hpp += Number(it.hpp || 0);
      const rawName = (it.product_name || '').trim();
      const key = rawName.toLowerCase();
      if (!produkMap[key]) {
        produkMap[key] = { produk: rawName, jumlah: 0, omzet: 0 };
      }
      const qtyNum = Number(it.qty || 0);
      const priceNum = Number(it.price || 0);
      produkMap[key].jumlah += qtyNum;
      produkMap[key].omzet += qtyNum * priceNum;
    }
  }

  const laba_kotor = total_omzet - total_hpp;
  const produk_terlaris = Object.values(produkMap).sort((a, b) => b.jumlah - a.jumlah);

  return NextResponse.json({
    total_pesanan,
    total_omzet,
    total_dp_masuk,
    piutang,
    total_hpp,
    laba_kotor,
    produk_terlaris,
    orders: orderList,
  });
}
