import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getSession } from '../../../../lib/session';

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh akses' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.category !== undefined) updates.category = body.category;
    if (body.price !== undefined) updates.price = Number(body.price) || 0;
    if (body.unit !== undefined) updates.unit = body.unit;
    if (body.current_stock !== undefined) updates.current_stock = Number(body.current_stock) || 0;
    if (body.min_stock !== undefined) updates.min_stock = Number(body.min_stock) || 0;
    if (body.purchase_links !== undefined) updates.purchase_links = Array.isArray(body.purchase_links) ? body.purchase_links : [];

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, material: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal update bahan' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh akses' }, { status: 403 });
  }
  const supabase = supabaseAdmin();
  const { error } = await supabase.from('materials').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
