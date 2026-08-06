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
    .from('bouquet_templates')
    .select('*, bouquet_template_materials(*, materials(name, price, unit))')
    .order('name', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ templates: data });
}

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh akses' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { name, price, materials_used } = body;
    if (!name || !Array.isArray(materials_used)) {
      return NextResponse.json({ error: 'Nama dan bahan wajib diisi' }, { status: 400 });
    }
    const supabase = supabaseAdmin();
    const { data: template, error: tplErr } = await supabase
      .from('bouquet_templates')
      .insert({ name: name.trim(), price: Number(price) || 0 })
      .select()
      .single();
    if (tplErr) throw tplErr;

    const rows = materials_used
      .filter((m) => m.material_id && Number(m.qty_used) > 0)
      .map((m) => ({
        template_id: template.id,
        material_id: m.material_id,
        qty_used: Number(m.qty_used),
      }));
    if (rows.length > 0) {
      const { error: matErr } = await supabase.from('bouquet_template_materials').insert(rows);
      if (matErr) throw matErr;
    }

    return NextResponse.json({ ok: true, template });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan template' }, { status: 500 });
  }
}
