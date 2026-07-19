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
  let query = supabase.from('orders').select('*, order_items(*)');

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

  const total_pesanan = orders.length;
  const total_omzet = orders.reduce((s, o) => s + Number(o.total), 0);
  const total_dp_masuk = orders.reduce((s, o) => s + Number(o.dp), 0);
  const piutang = orders.reduce((s, o) => s + (Number(o.total) - Number(o.dp)), 0);

  const produkMap = {};
  for (const o of orders) {
    for (const it of o.order_items || []) {
      const key = it.product_name;
      if (!produkMap[key]) produkMap[key] = { produk: key, jumlah: 0, omzet: 0 };
      produkMap[key].jumlah += Number(it.qty);
      produkMap[key].omzet += Number(it.qty) * Number(it.price);
    }
  }
  const produk_terlaris = Object.values(produkMap).sort((a, b) => b.jumlah - a.jumlah);

  return NextResponse.json({
    total_pesanan,
    total_omzet,
    total_dp_masuk,
    piutang,
    produk_terlaris,
    orders,
  });
}
