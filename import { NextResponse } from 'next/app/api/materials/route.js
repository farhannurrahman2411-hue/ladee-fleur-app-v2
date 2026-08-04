import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { getSession } from '../../../lib/session';

export async function GET(request) {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh akses' }, { status: 403 });
  }
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name');
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
    if (!body.name) {
      return NextResponse.json({ error: 'Nama bahan wajib diisi' }, { status: 400 });
    }
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('materials')
      .insert({
        name: body.name,
        category: body.category || null,
        price: Number(body.price) || 0,
        unit: body.unit || 'pcs',
        current_stock: Number(body.current_stock) || 0,
        min_stock: Number(body.min_stock) || 0,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, material: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menambah bahan' }, { status: 500 });
  }
}
