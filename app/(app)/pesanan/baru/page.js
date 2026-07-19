'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '../../../../lib/formatters';

function emptyItem() {
  return { product_name: '', qty: 1, price: 0 };
}

export default function PesananBaruPage() {
  const router = useRouter();
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [dp, setDp] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const total = items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.price || 0), 0);

  function updateItem(idx, field, value) {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  }

  function addItem() {
    setItems([...items, emptyItem()]);
  }

  function removeItem(idx) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!customerName.trim()) {
      setError('Nama customer wajib diisi');
      return;
    }
    if (items.some((it) => !it.product_name.trim())) {
      setError('Semua nama produk wajib diisi');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_date: orderDate,
          customer_name: customerName,
          dp,
          notes,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/pesanan');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan pesanan');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-fleur-800 mb-4">Pesanan Baru</h1>

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
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Produk Pesanan</label>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <input
                  type="text"
                  placeholder="Nama produk (bebas / custom)"
                  value={it.product_name}
                  onChange={(e) => updateItem(idx, 'product_name', e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={it.qty}
                  onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                  className="w-16 border rounded-lg px-2 py-2 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Harga satuan"
                  value={it.price}
                  onChange={(e) => updateItem(idx, 'price', e.target.value)}
                  className="w-32 border rounded-lg px-2 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-red-500 px-2 py-2 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 text-fleur-600 text-sm font-medium hover:underline"
          >
            + Tambah item produk
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">DP (Uang Muka)</label>
            <input
              type="number"
              min="0"
              value={dp}
              onChange={(e) => setDp(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-sm text-gray-500">Total Pesanan</p>
            <p className="text-lg font-bold text-fleur-700">{formatRupiah(total)}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Catatan (opsional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-fleur-600 hover:bg-fleur-700 text-white px-5 py-2 rounded-lg font-medium disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan Pesanan'}
        </button>
      </form>
    </div>
  );
}
