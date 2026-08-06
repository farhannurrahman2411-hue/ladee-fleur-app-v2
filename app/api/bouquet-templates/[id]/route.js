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
    const supabase = supabaseAdmin();

    if (body.name !== undefined || body.price !== undefined) {
      const updates = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.price !== undefined) updates.price = Number(body.price) || 0;
      const { error } = await supabase.from('bouquet_templates').update(updates).eq('id', params.id);
      if (error) throw error;
    }

    if (Array.isArray(body.materials_used)) {
      await supabase.from('bouquet_template_materials').delete().eq('template_id', params.id);
      const rows = body.materials_used
        .filter((m) => m.material_id && Number(m.qty_used) > 0)
        .map((m) => ({
          template_id: params.id,
          material_id: m.material_id,
          qty_used: Number(m.qty_used),
        }));
      if (rows.length > 0) {
        const { error: matErr } = await supabase.from('bouquet_template_materials').insert(rows);
        if (matErr) throw matErr;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal update template' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh akses' }, { status: 403 });
  }
  const supabase = supabaseAdmin();
  const { error } = await supabase.from('bouquet_templates').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
