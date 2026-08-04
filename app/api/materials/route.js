import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { getSession } from '../../../lib/session';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh akses' }, { status: 403 });
  }
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ materials: data });
}

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh akses' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { name, category, price, unit, current_stock, min_stock, purchase_links } = body;
    if (!name || !unit) {
      return NextResponse.json({ error: 'Nama dan satuan wajib diisi' }, { status: 400 });
    }
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('materials')
      .insert({
        name,
        category: category || null,
        price: Number(price) || 0,
        unit,
        current_stock: Number(current_stock) || 0,
        min_stock: Number(min_stock) || 0,
        purchase_links: Array.isArray(purchase_links) ? purchase_links : [],
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, material: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menambah bahan' }, { status: 500 });
  }
}
