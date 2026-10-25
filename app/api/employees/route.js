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
    .from('employees')
    .select('id, name')
    .order('name', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    employees: data || [],
    can_manage: session.role === 'owner',
  });
}

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh menambah karyawan' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Nama karyawan wajib diisi' }, { status: 400 });
    }
    const supabase = supabaseAdmin();
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .ilike('name', name);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Nama karyawan "' + name + '" sudah ada' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('employees')
      .insert({ name })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, employee: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menambah karyawan' }, { status: 500 });
  }
}
