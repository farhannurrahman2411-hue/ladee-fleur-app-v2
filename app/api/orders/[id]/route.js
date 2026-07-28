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
    .select('*, order_items(*)')
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
    const updates = {};

    if (body.status_pesanan) updates.status_pesanan = body.status_pesanan;
    if (body.status_bayar) {
     updates.status_bayar = body.status_bayar;
     if (body.status_bayar === 'LUNAS') {
       const supabase = supabaseAdmin();
       const { data: existing } = await supabase.from('orders').select('total').eq('id', params.id).single();
       updates.dp = existing?.total || 0;
     }
   }

    if (body.dp !== undefined) {
      const supabase = supabaseAdmin();
      const { data: existing } = await supabase
        .from('orders')
        .select('total')
        .eq('id', params.id)
        .single();
      const dpNum = Number(body.dp) || 0;
      updates.dp = dpNum;
      updates.status_bayar = dpNum >= (existing?.total || 0) ? 'LUNAS' : 'BELUM LUNAS';
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, order: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Gagal update pesanan' },
      { status: 500 }
    );
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
