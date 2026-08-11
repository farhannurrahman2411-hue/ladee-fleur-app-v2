'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah, formatTanggal } from '../../../lib/formatters';

const STATUS_PESANAN_OPTIONS = ['Diproses', 'Siap Diambil', 'Sudah Diambil', 'Dibatalkan'];
const STATUS_BAYAR_OPTIONS = ['BELUM LUNAS', 'LUNAS'];

export default function PesananClient({ role }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bulan, setBulan] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders || []);
    } catch (err) {
      setError('Gagal memuat data pesanan');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatusPesanan(id, status_pesanan) {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_pesanan }),
    });
    loadOrders();
  }

  async function updateStatusBayar(id, status_bayar) {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_bayar }),
    });
    loadOrders();
  }

  async function hapusPesanan(id, order_code) {
    const yakin = window.confirm(`Yakin mau hapus pesanan ${order_code}? Data yang dihapus tidak bisa dikembalikan.`);
    if (!yakin) return;

    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadOrders();
    } catch (err) {
      alert('Gagal menghapus pesanan: ' + err.message);
    }
  }

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch =
      o.order_code?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q);
    const matchBulan = bulan ? o.order_date?.startsWith(bulan) : true;
    return matchSearch && matchBulan;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-fleur-800">Data Pesanan</h1>
        <Link
          href="/pesanan/baru"
          className="bg-fleur-600 hover:bg-fleur-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Pesanan Baru
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Cari no. pesanan atau nama customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fleur-400"
        />
        <input
          type="month"
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        {bulan && (
          <button
            type="button"
            onClick={() => setBulan('')}
            className="text-xs text-gray-500 hover:underline px-2"
          >
            Reset Bulan
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Memuat...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">Belum ada pesanan.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-fleur-100 text-fleur-800 text-left">
              <tr>
                <th className="px-3 py-2">No. Pesanan</th>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Customer</th>
        <th className="px-3 py-2">Produk</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Sisa</th>
                <th className="px-3 py-2">Bayar</th>
                <th className="px-3 py-2">Status Pesanan</th>
                <th className="px-3 py-2">Nota</th>
                {role === 'owner' && <th className="px-3 py-2">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{o.order_code}</td>
                  <td className="px-3 py-2">{formatTanggal(o.order_date)}</td>
                  <td className="px-3 py-2">{o.customer_name}</td>
                  <td className="px-3 py-2 text-xs">
                    {(o.order_items || []).map((it) => `${it.product_name} x${it.qty}`).join(', ')}
                  </td>
                  <td className="px-3 py-2">{formatRupiah(o.total)}</td>
                  <td className="px-3 py-2">{formatRupiah(o.total - o.dp)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={o.status_bayar}
                      onChange={(e) => updateStatusBayar(o.id, e.target.value)}
                      className={`border rounded px-2 py-1 text-xs font-medium ${
                        o.status_bayar === 'LUNAS'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {STATUS_BAYAR_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={o.status_pesanan}
                      onChange={(e) => updateStatusPesanan(o.id, e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      {STATUS_PESANAN_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/nota/${o.id}`}
                      target="_blank"
                      className="text-fleur-600 hover:underline"
                    >
                      Lihat / Cetak
                    </Link>
                  </td>
                  {role === 'owner' && (
                    <td className="px-3 py-2">
                      <Link
                        href={`/pesanan/${o.id}/edit`}
                        className="text-fleur-600 hover:underline text-xs font-medium mr-2"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => hapusPesanan(o.id, o.order_code)}
                        className="text-red-600 hover:underline text-xs font-medium"
                      >
                        Hapus
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
