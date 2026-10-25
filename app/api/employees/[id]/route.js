import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getSession } from '../../../../lib/session';

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh mengubah nama karyawan' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const newName = String(body.name || '').trim();
    if (!newName) {
      return NextResponse.json({ error: 'Nama karyawan wajib diisi' }, { status: 400 });
    }
    const supabase = supabaseAdmin();

    const { data: current, error: curErr } = await supabase
      .from('employees')
      .select('id, name')
      .eq('id', params.id)
      .maybeSingle();
    if (curErr) throw curErr;
    if (!current) {
      return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });
    }
    if (current.name === newName) {
      return NextResponse.json({ ok: true, employee: current });
    }

    const { data: dup } = await supabase
      .from('employees')
      .select('id')
      .ilike('name', newName)
      .neq('id', params.id);
    if (dup && dup.length > 0) {
      return NextResponse.json({ error: 'Nama karyawan "' + newName + '" sudah ada' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('employees')
      .update({ name: newName })
      .eq('id', params.id)
      .select()
      .single();
    if (error) throw error;

    // Samakan nama di pesanan lama supaya rekap upah tidak terpecah jadi dua orang
    await supabase.from('orders').update({ pengerja: newName }).eq('pengerja', current.name);

    return NextResponse.json({ ok: true, employee: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal mengubah nama karyawan' }, { status: 500 });
  }
}
