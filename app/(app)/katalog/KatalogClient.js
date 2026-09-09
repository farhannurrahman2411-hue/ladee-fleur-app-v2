'use client';

import React, { useEffect, useState } from 'react';
import { formatRupiah } from '../../../lib/formatters';

const UPAH_MATERIAL_NAME = 'Upah kerja 10 menit';

function emptyMaterialUse() {
  return { material_id: '', qty_used: 1, query: '' };
}

export default function KatalogClient() {
  const [templates, setTemplates] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState([emptyMaterialUse()]);
  const [openPicker, setOpenPicker] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  function loadAll() {
    setLoading(true);
    Promise.all([
      fetch('/api/bouquet-templates').then((r) => r.json()),
      fetch('/api/materials').then((r) => r.json()),
    ])
      .then(([tplData, matData]) => {
        setTemplates(tplData.templates || []);
        setMaterials(matData.materials || []);
      })
      .finally(() => setLoading(false));
  }

  function patchMu(idx, fields) {
    const next = [...materialsUsed];
    next[idx] = Object.assign({}, next[idx], fields);
    setMaterialsUsed(next);
  }

  function addMu() {
    setMaterialsUsed([...materialsUsed, emptyMaterialUse()]);
  }

  function removeMu(idx) {
    setMaterialsUsed(materialsUsed.filter((_, i) => i !== idx));
  }

  function selectMaterial(idx, mat) {
    patchMu(idx, { material_id: mat.id, query: mat.name });
    setOpenPicker(null);
  }

  function resetForm() {
    setName('');
    setPrice('');
    setMaterialsUsed([emptyMaterialUse()]);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(t) {
    setEditingId(t.id);
    setName(t.name);
    setPrice(t.price);
    const muList = (t.bouquet_template_materials || []).map((tm) => ({
      material_id: tm.material_id,
      qty_used: tm.qty_used,
      query: tm.materials ? tm.materials.name : '',
    }));
    setMaterialsUsed(muList.length > 0 ? muList : [emptyMaterialUse()]);
    setShowForm(true);
  }

  const hppBahanPreview = materialsUsed.reduce((sum, mu) => {
    const mat = materials.find((m) => m.id === mu.material_id);
    if (!mat || mat.name === UPAH_MATERIAL_NAME) return sum;
    return sum + Number(mat.price) * Number(mu.qty_used || 0);
  }, 0);
  const upahPreview = materialsUsed.reduce((sum, mu) => {
    const mat = materials.find((m) => m.id === mu.material_id);
    if (!mat || mat.name !== UPAH_MATERIAL_NAME) return sum;
    return sum + Number(mat.price) * Number(mu.qty_used || 0);
  }, 0);
  const marginPreview = Number(price || 0) - hppBahanPreview - upahPreview;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama bouquet wajib diisi');
      return;
    }
    const rows = materialsUsed
      .filter((m) => m.material_id && Number(m.qty_used) > 0)
      .map((m) => ({ material_id: m.material_id, qty_used: m.qty_used }));
    try {
      const url = editingId ? '/api/bouquet-templates/' + editingId : '/api/bouquet-templates';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, materials_used: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      resetForm();
      loadAll();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    }
  }

  async function hapusTemplate(id, tplName) {
    if (!window.confirm('Yakin mau hapus template "' + tplName + '"?')) return;
    try {
      const res = await fetch('/api/bouquet-templates/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadAll();
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  }

  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { className: 'flex items-center justify-between mb-4' },
      React.createElement('h1', { className: 'text-xl font-bold text-fleur-800' }, 'Katalog Bouquet'),
      React.createElement(
        'button',
        {
          onClick: () => (showForm ? resetForm() : setShowForm(true)),
          className: 'bg-fleur-600 hover:bg-fleur-700 text-white px-4 py-2 rounded-lg text-sm font-medium',
        },
        showForm ? 'Tutup Form' : '+ Tambah Template'
      )
    ),
    React.createElement('input', {
      type: 'text',
      placeholder: 'Cari nama bouquet...',
      value: search,
      onChange: (e) => setSearch(e.target.value),
      className: 'w-full border rounded-lg px-3 py-2 mb-4 text-sm',
    }),
    showForm &&
      React.createElement(
        'form',
        { onSubmit: handleSubmit, className: 'bg-white rounded-xl shadow p-4 mb-4 space-y-3' },
        editingId &&
          React.createElement('p', { className: 'text-xs text-fleur-600 font-medium' }, 'Mode edit template'),
        React.createElement('input', {
          type: 'text',
          placeholder: 'Nama bouquet (misal: Bouquet Mawar Sedang)',
          value: name,
          onChange: (e) => setName(e.target.value),
          className: 'w-full border rounded-lg px-3 py-2 text-sm',
        }),
        React.createElement('input', {
          type: 'number',
          placeholder: 'Harga jual tetap',
          value: price,
          onChange: (e) => setPrice(e.target.value),
          className: 'w-full border rounded-lg px-3 py-2 text-sm',
        }),
        React.createElement(
          'div',
          null,
          React.createElement('p', { className: 'text-sm font-medium text-fleur-800 mb-2' }, 'Resep Bahan'),
          materialsUsed.map((mu, idx) => {
            const q = (mu.query || '').toLowerCase();
            const filtered = q ? materials.filter((m) => m.name.toLowerCase().includes(q)) : materials;
            const showDropdown = openPicker === idx && filtered.length > 0;
            return React.createElement(
              'div',
              { key: idx, className: 'flex gap-2 items-start mb-1' },
              React.createElement(
                'div',
                { style: { position: 'relative' }, className: 'flex-1' },
                React.createElement('input', {
                  type: 'text',
                  placeholder: 'Ketik nama bahan...',
                  value: mu.query,
                  onChange: (e) => {
                    patchMu(idx, { query: e.target.value, material_id: '' });
                    setOpenPicker(idx);
                  },
                  onFocus: () => setOpenPicker(idx),
                  onBlur: () => setTimeout(() => setOpenPicker(null), 200),
                  className: 'w-full border rounded px-2 py-1 text-xs',
                }),
                showDropdown &&
                  React.createElement(
                    'div',
                    {
                      style: { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20 },
                      className: 'bg-white border rounded shadow max-h-40 overflow-y-auto',
                    },
                    filtered.map((m) =>
                      React.createElement(
                        'div',
                        {
                          key: m.id,
                          onMouseDown: () => selectMaterial(idx, m),
                          className: 'px-2 py-1 text-xs hover:bg-fleur-50 cursor-pointer',
                        },
                        m.name + ' (' + m.unit + ') - ' + formatRupiah(m.price)
                      )
                    )
                  )
              ),
              React.createElement('input', {
                type: 'number',
                min: '0',
                step: '0.01',
                placeholder: 'Qty',
                value: mu.qty_used,
                onChange: (e) => patchMu(idx, { qty_used: e.target.value }),
                className: 'w-16 border rounded px-2 py-1 text-xs',
              }),
              React.createElement(
                'button',
                { type: 'button', onClick: () => removeMu(idx), className: 'text-red-500 text-xs px-1' },
                'X'
              )
            );
          }),
          React.createElement(
            'button',
            { type: 'button', onClick: addMu, className: 'text-fleur-600 text-xs font-medium hover:underline' },
            '+ Tambah Bahan'
          )
        ),
        React.createElement(
          'div',
          { className: 'bg-fleur-50 rounded-lg p-3 text-sm space-y-0.5' },
          React.createElement('p', null, 'HPP Bahan: ' + formatRupiah(hppBahanPreview)),
          React.createElement('p', null, 'Upah Kerja: ' + formatRupiah(upahPreview)),
          React.createElement('p', { className: 'font-medium' }, 'Margin: ' + formatRupiah(marginPreview))
        ),
        React.createElement(
          'button',
          {
            type: 'submit',
            className: 'bg-fleur-600 hover:bg-fleur-700 text-white px-4 py-2 rounded-lg text-sm font-medium',
          },
          editingId ? 'Simpan Perubahan' : 'Simpan Template'
        )
      ),
    loading
      ? React.createElement('p', { className: 'text-gray-500' }, 'Memuat...')
      : filteredTemplates.length === 0
      ? React.createElement('p', { className: 'text-gray-500' }, 'Belum ada template bouquet.')
      : React.createElement(
          'div',
          { className: 'bg-white rounded-xl shadow overflow-x-auto' },
          React.createElement(
            'table',
            { className: 'w-full text-sm' },
            React.createElement(
              'thead',
              { className: 'bg-fleur-100 text-fleur-800 text-left' },
              React.createElement(
                'tr',
                null,
                React.createElement('th', { className: 'px-3 py-2' }, 'Nama'),
                React.createElement('th', { className: 'px-3 py-2' }, 'Harga'),
                React.createElement('th', { className: 'px-3 py-2' }, 'HPP Bahan'),
                React.createElement('th', { className: 'px-3 py-2' }, 'Upah Kerja'),
                React.createElement('th', { className: 'px-3 py-2' }, 'Margin'),
                React.createElement('th', { className: 'px-3 py-2' }, 'Bahan'),
                React.createElement('th', { className: 'px-3 py-2' }, 'Aksi')
              )
            ),
            React.createElement(
              'tbody',
              null,
              filteredTemplates.map((t) => {
                const tplMaterials = t.bouquet_template_materials || [];
                const tplHppBahan = tplMaterials.reduce((sum, m) => {
                  if (!m.materials || m.materials.name === UPAH_MATERIAL_NAME) return sum;
                  return sum + Number(m.materials.price) * Number(m.qty_used);
                }, 0);
                const tplUpah = tplMaterials.reduce((sum, m) => {
                  if (!m.materials || m.materials.name !== UPAH_MATERIAL_NAME) return sum;
                  return sum + Number(m.materials.price) * Number(m.qty_used);
                }, 0);
                const tplMargin = Number(t.price) - tplHppBahan - tplUpah;
                return React.createElement(
                  'tr',
                  { key: t.id, className: 'border-t' },
                  React.createElement('td', { className: 'px-3 py-2 font-medium' }, t.name),
                  React.createElement('td', { className: 'px-3 py-2' }, formatRupiah(t.price)),
                  React.createElement('td', { className: 'px-3 py-2' }, formatRupiah(tplHppBahan)),
                  React.createElement('td', { className: 'px-3 py-2' }, formatRupiah(tplUpah)),
                  React.createElement('td', { className: 'px-3 py-2' }, formatRupiah(tplMargin)),
                  React.createElement(
                    'td',
                    { className: 'px-3 py-2 text-xs' },
                    tplMaterials
                      .map((m) => (m.materials ? m.materials.name + ' x' + m.qty_used : ''))
                      .join(', ')
                  ),
                  React.createElement(
                    'td',
                    { className: 'px-3 py-2' },
                    React.createElement(
                      'button',
                      {
                        onClick: () => startEdit(t),
                        className: 'text-fleur-600 hover:underline text-xs font-medium mr-2',
                      },
                      'Edit'
                    ),
                    React.createElement(
                      'button',
                      {
                        onClick: () => hapusTemplate(t.id, t.name),
                        className: 'text-red-600 hover:underline text-xs font-medium',
                      },
                      'Hapus'
                    )
                  )
                );
              })
            )
          )
        )
  );
}
