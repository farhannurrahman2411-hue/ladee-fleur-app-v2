'use client';

import { Fragment, useEffect, useState } from 'react';

function formatRupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}

const EMPTY_LINK = { label: '', url: '' };

export default function BahanClient() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', category: '', price: '', unit: 'pcs', current_stock: '', min_stock: '',
  });
  const [formLinks, setFormLinks] = useState([{ ...EMPTY_LINK }]);

  const [editingLinksId, setEditingLinksId] = useState(null);
  const [linkDraft, setLinkDraft] = useState([{ ...EMPTY_LINK }]);

  useEffect(() => {
    loadMaterials();
  }, []);

  async function loadMaterials() {
    setLoading(true);
    try {
      const res = await fetch('/api/materials');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMaterials(data.materials || []);
    } catch (err) {
      setError('Gagal memuat data bahan');
    } finally {
      setLoading(false);
    }
  }

  function addFormLink() {
    setFormLinks((prev) => [...prev, { ...EMPTY_LINK }]);
  }

  function removeFormLink(index) {
    setFormLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFormLink(index, field, value) {
    setFormLinks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    try {
      const cleanLinks = formLinks
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
        .filter((l) => l.url !== '');
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, purchase_links: cleanLinks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ name: '', category: '', price: '', unit: 'pcs', current_stock: '', min_stock: '' });
      setFormLinks([{ ...EMPTY_LINK }]);
      setShowForm(false);
      loadMaterials();
    } catch (err) {
      alert('Gagal menambah bahan: ' + err.message);
    }
  }

  async function updateField(id, field, value) {
    await fetch(`/api/materials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  }

  function handleLocalChange(id, field, value) {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }

  async function hapusBahan(id, name) {
    const yakin = window.confirm(`Yakin mau hapus bahan "${name}"?`);
    if (!yakin) return;
    try {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadMaterials();
    } catch (err) {
      alert('Gagal menghapus bahan: ' + err.message);
    }
  }

  function bukaKelolaLink(m) {
    const existing = Array.isArray(m.purchase_links) && m.purchase_links.length > 0
      ? m.purchase_links.map((l) => ({ label: l.label || '', url: l.url || '' }))
      : [{ ...EMPTY_LINK }];
    setLinkDraft(existing);
    setEditingLinksId(m.id);
  }

  function tutupKelolaLink() {
    setEditingLinksId(null);
    setLinkDraft([{ ...EMPTY_LINK }]);
  }

  function addDraftLink() {
    setLinkDraft((prev) => [...prev, { ...EMPTY_LINK }]);
  }

  function removeDraftLink(index) {
    setLinkDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDraftLink(index, field, value) {
    setLinkDraft((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  }

  async function simpanKelolaLink(id) {
    const cleanLinks = linkDraft
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
      .filter((l) => l.url !== '');
    try {
      await updateField(id, 'purchase_links', cleanLinks);
      handleLocalChange(id, 'purchase_links', cleanLinks);
      tutupKelolaLink();
    } catch (err) {
      alert('Gagal menyimpan link');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-fleur-800">Database Bahan</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-fleur-600 hover:bg-fleur-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {showForm ? 'Tutup Form' : '+ Tambah Bahan'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddSubmit} className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Nama bahan"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Kategori (misal: Bunga)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Harga per satuan"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Satuan (pcs, meter, dll)"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Stok saat ini"
            value={form.current_stock}
            onChange={(e) => setForm({ ...form, current_stock: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Stok minimum"
            value={form.min_stock}
            onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />

          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-sm font-medium text-fleur-800 mb-2">Link Beli (opsional, bisa lebih dari satu)</p>
            <div className="space-y-2">
              {formLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Label (misal: Shopee Toko A)"
                    value={link.label}
                    onChange={(e) => updateFormLink(idx, 'label', e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm w-1/3"
                  />
                  <input
                    type="url"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => updateFormLink(idx, 'url', e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm flex-1"
                  />
                  {formLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFormLink(idx)}
                      className="text-red-600 text-xs font-medium px-2"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addFormLink}
              className="text-fleur-700 text-xs font-medium mt-2 hover:underline"
            >
              + Tambah Link
            </button>
          </div>

          <button
            type="submit"
            className="col-span-2 bg-fleur-600 hover:bg-fleur-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Simpan Bahan
          </button>
        </form>
      )}

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Memuat...</p>
      ) : materials.length === 0 ? (
        <p className="text-gray-500">Belum ada bahan.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-fleur-100 text-fleur-800 text-left">
              <tr>
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2">Kategori</th>
                <th className="px-3 py-2">Harga</th>
                <th className="px-3 py-2">Satuan</th>
                <th className="px-3 py-2">Stok</th>
                <th className="px-3 py-2">Stok Min</th>
                <th className="px-3 py-2">Link Beli</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <Fragment key={m.id}>
                  <tr
                    className={`border-t ${
                      Number(m.current_stock) <= Number(m.min_stock) ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-medium">{m.name}</td>
                    <td className="px-3 py-2">{m.category || '-'}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        defaultValue={m.price}
                        onBlur={(e) => updateField(m.id, 'price', Number(e.target.value))}
                        className="border rounded px-2 py-1 text-xs w-24"
                      />
                    </td>
                    <td className="px-3 py-2">{m.unit}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        defaultValue={m.current_stock}
                        onBlur={(e) => updateField(m.id, 'current_stock', Number(e.target.value))}
                        className="border rounded px-2 py-1 text-xs w-20"
                      />
                    </td>
                    <td className="px-3 py-2">{m.min_stock}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        {Array.isArray(m.purchase_links) && m.purchase_links.length > 0 ? (
                          m.purchase_links.map((l, i) => (
                            
                              key={i}
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              {l.label || l.url}
                            </a>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                        <button
                          onClick={() => bukaKelolaLink(m)}
                          className="text-fleur-700 hover:underline text-xs font-medium text-left"
                        >
                          Kelola Link
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => hapusBahan(m.id, m.name)}
                        className="text-red-600 hover:underline text-xs font-medium"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                  {editingLinksId === m.id && (
                    <tr className="border-t bg-fleur-50">
                      <td colSpan={8} className="px-3 py-3">
                        <p className="text-sm font-medium text-fleur-800 mb-2">
                          Kelola Link Beli — {m.name}
                        </p>
                        <div className="space-y-2 max-w-2xl">
                          {linkDraft.map((link, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Label (misal: Shopee Toko A)"
                                value={link.label}
                                onChange={(e) => updateDraftLink(idx, 'label', e.target.value)}
                                className="border rounded-lg px-3 py-2 text-sm w-1/3"
                              />
                              <input
                                type="url"
                                placeholder="https://..."
                                value={link.url}
                                onChange={(e) => updateDraftLink(idx, 'url', e.target.value)}
                                className="border rounded-lg px-3 py-2 text-sm flex-1"
                              />
                              {linkDraft.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeDraftLink(idx)}
                                  className="text-red-600 text-xs font-medium px-2"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            type="button"
                            onClick={addDraftLink}
                            className="text-fleur-700 text-xs font-medium hover:underline"
                          >
                            + Tambah Link
                          </button>
                          <button
                            type="button"
                            onClick={() => simpanKelolaLink(m.id)}
                            className="bg-fleur-600 hover:bg-fleur-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                          >
                            Simpan Link
                          </button>
                          <button
                            type="button"
                            onClick={tutupKelolaLink}
                            className="text-gray-600 text-xs font-medium hover:underline"
                          >
                            Batal
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
