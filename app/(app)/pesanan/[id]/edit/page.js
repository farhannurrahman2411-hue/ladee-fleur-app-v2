'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatRupiah } from '../../../../../lib/formatters';

function toItemState(oi) {
  return {
    product_name: oi.product_name,
    qty: oi.qty,
    price: oi.price,
    materials_used: (oi.order_item_materials || []).map((mu) => ({
      material_id: mu.material_id,
      qty_used: oi.qty > 0 ? mu.qty_used / oi.qty : mu.qty_used,
      query: mu.materials ? mu.materials.name : '',
    })),
  };
}

function emptyMaterialUse() {
  return { material_id: '', qty_used: 1, query: '' };
}

export default function EditPesananPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [items, setItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [openPicker, setOpenPicker] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/orders/' + params.id).then((r) => r.json()),
      fetch('/api/materials').then((r) => r.json()),
    ])
      .then(([orderData, matData]) => {
        if (orderData.error) throw new Error(orderData.error);
        setCustomerName(orderData.order.customer_name);
        setOrderDate(orderData.order.order_date);
        setItems((orderData.order.order_items || []).map(toItemState));
        setMaterials(matData.materials || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const total = items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.price || 0), 0);

  function itemHpp(it) {
    return it.materials_used.reduce((sum, mu) => {
      const mat = materials.find((m) => m.id === mu.material_id);
      const price = mat ? Number(mat.price) : 0;
      return sum + price * Number(mu.qty_used || 0);
    }, 0) * Number(it.qty || 0);
  }

  const totalHpp = items.reduce((sum, it) => sum + itemHpp(it), 0);
  const margin = total - totalHpp;

  function updateItem(idx, field, value) {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  }

  function addItem() {
    setItems([...items, { product_name: '', qty: 1, price: 0, materials_used: [] }]);
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function addMaterialUse(itemIdx) {
    const next = [...items];
    next[itemIdx] = {
      ...next[itemIdx],
      materials_used: [...next[itemIdx].materials_used, emptyMaterialUse()],
    };
    setItems(next);
  }

  function removeMaterialUse(itemIdx, muIdx) {
    const next = [...items];
    next[itemIdx] = {
      ...next[itemIdx],
      materials_used: next[itemIdx].materials_used.filter((_, i) => i !== muIdx),
    };
    setItems(next);
  }

  function patchMaterialUse(itemIdx, muIdx, fields) {
    const next = [...items];
    const muList = [...next[itemIdx].materials_used];
    muList[muIdx] = Object.assign({}, muList[muIdx], fields);
    next[itemIdx] = Object.assign({}, next[itemIdx], { materials_used: muList });
    setItems(next);
  }

  function selectMaterial(itemIdx, muIdx, mat) {
    patchMaterialUse(itemIdx, muIdx, { material_id: mat.id, query: mat.name });
    setOpenPicker(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!customerName.trim()) {
      setError('Nama customer wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const itemsPayload = items.map((it) => ({
        product_name: it.product_name,
        qty: it.qty,
        price: it.price,
        materials_used: it.materials_used
          .filter((mu) => mu.material_id && Number(mu.qty_used) > 0)
          .map((mu) => {
            const mat = materials.find((m) => m.id === mu.material_id);
            return { material_id: mu.material_id, qty_used: mu.qty_used, price: mat ? mat.price : 0 };
          }),
      }));
      const res = await fetch('/api/orders/' + params.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          order_date: orderDate,
          items: itemsPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/pesanan');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan perubahan');
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500">Memuat...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-fleur-800 mb-4">Edit Pesanan</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nama Customer</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Produk Pesanan</label>
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex gap-2 items-start mb-2">
                  <input
                    type="text"
                    placeholder="Nama produk"
                    value={it.product_name}
                    onChange={(e) => updateItem(idx, 'product_name', e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    value={it.qty}
                    onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                    className="w-16 border rounded-lg px-2 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    value={it.price}
                    onChange={(e) => updateItem(idx, 'price', e.target.value)}
                    className="w-32 border rounded-lg px-2 py-2 text-sm"
                  />
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-500 px-2 py-2 text-sm">
                    X
                  </button>
                </div>

                <div className="pl-2 border-l-2 border-fleur-100">
                  <p className="text-xs font-medium text-gray-600 mb-1">Bahan yang dipakai (per 1 pcs)</p>
                  {it.materials_used.map((mu, muIdx) => {
                    const pickerKey = idx + '-' + muIdx;
                    const q = (mu.query || '').toLowerCase();
                    const filtered = q ? materials.filter((m) => m.name.toLowerCase().includes(q)) : materials;
                    const showDropdown = openPicker === pickerKey && filtered.length > 0;
                    return (
                      <div key={muIdx} className="flex gap-2 items-start mb-1">
                        <div className="flex-1" style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Ketik nama bahan..."
                            value={mu.query}
                            onChange={(e) => {
                              patchMaterialUse(idx, muIdx, { query: e.target.value, material_id: '' });
                              setOpenPicker(pickerKey);
                            }}
                            onFocus={() => setOpenPicker(pickerKey)}
                            onBlur={() => setTimeout(() => setOpenPicker(null), 200)}
                            className="w-full border rounded px-2 py-1 text-xs"
                          />
                          {showDropdown && (
                            <div
                              style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20 }}
                              className="bg-white border rounded shadow max-h-40 overflow-y-auto"
                            >
                              {filtered.map((m) => (
                                <div
                                  key={m.id}
                                  onMouseDown={() => selectMaterial(idx, muIdx, m)}
                                  className="px-2 py-1 text-xs hover:bg-fleur-50 cursor-pointer"
                                >
                                  {m.name} ({m.unit}) - {formatRupiah(m.price)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={mu.qty_used}
                          onChange={(e) => patchMaterialUse(idx, muIdx, { qty_used: e.target.value })}
                          className="w-16 border rounded px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => removeMaterialUse(idx, muIdx)}
                          className="text-red-500 text-xs px-1"
                        >
                          X
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => addMaterialUse(idx)}
                    className="text-fleur-600 text-xs font-medium hover:underline"
                  >
                    + Tambah Bahan
                  </button>
                  <p className="text-xs text-gray-400 mt-1">HPP item ini: {formatRupiah(itemHpp(it))}</p>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-2 text-fleur-600 text-sm font-medium hover:underline">
            + Tambah item produk
          </button>
        </div>

        <div className="flex flex-col justify-end">
          <p className="text-sm text-gray-500">Total Pesanan</p>
          <p className="text-lg font-bold text-fleur-700">{formatRupiah(total)}</p>
        </div>

        <div className="bg-fleur-50 rounded-lg p-3 text-sm">
          <p>Total HPP: {formatRupiah(totalHpp)}</p>
          <p>Margin: {formatRupiah(margin)}</p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-fleur-600 hover:bg-fleur-700 text-white px-5 py-2 rounded-lg font-medium disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>
    </div>
  );
}
