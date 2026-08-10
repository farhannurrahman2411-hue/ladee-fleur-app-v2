'use client';

import { useEffect, useState } from 'react';
import { formatTanggal, formatRupiah } from '../../../lib/formatters';

const PROGRES_OPTIONS = ['Belum Dikerjakan', 'Proses', 'Selesai'];
const UPAH_MATERIAL_NAME = 'Upah kerja 10 menit';

const badgeColor = {
  'Belum Dikerjakan': 'bg-yellow-100 text-yellow-700',
  'Proses': 'bg-blue-100 text-blue-700',
  'Selesai': 'bg-green-100 text-green-700',
};

function getDefaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function JobClient() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(getDefaultMonth());

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

  async function updateField(id, field, value) {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  }

  function handleLocalChange(id, field, value) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  }

  const filtered = orders.filter((o) => {
    if (!month) return true;
    return o.order_date?.slice(0, 7) === month;
  });

  const selesai = filtered.filter((o) => o.progres_pembuatan === 'Selesai');

  const dashboard = {};
  for (const o of selesai) {
    const nama = (o.pengerja || '').trim() || '(Belum diisi)';
    if (!dashboard[nama]) {
      dashboard[nama] = { nama, totalBouquet: 0, jenis: {}, totalUpah: 0 };
    }
    for (const it of o.order_items || []) {
      dashboard[nama].totalBouquet += Number(it.qty) || 0;
      const jenisNama = it.product_name || '-';
      dashboard[nama].jenis[jenisNama] = (dashboard[nama].jenis[jenisNama] || 0) + Number(it.qty || 0);
      for (const mu of it.order_item_materials || []) {
        if (mu.materials && mu.materials.name === UPAH_MATERIAL_NAME) {
          dashboard[nama].totalUpah += Number(mu.qty_used) * Number(mu.unit_price);
        }
      }
    }
  }
  const dashboardRows = Object.values(dashboard).sort((a, b) => b.totalBouquet - a.totalBouquet);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-fleur-800">Job Perangkai Bouquet</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <h2 className="font-semibold text-fleur-800 mb-2">Dashboard Karyawan Bulan Ini</h2>
      {dashboardRows.length === 0 ? (
        <p className="text-gray-500 mb-6">Belum ada pesanan selesai bulan ini.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-fleur-100 text-fleur-800 text-left">
              <tr>
                <th className="px-3 py-2">Karyawan</th>
                <th className="px-3 py-2">Jumlah Bouquet</th>
                <th className="px-3 py-2">Jenis Bouquet</th>
                <th className="px-3 py-2">Total Upah</th>
              </tr>
            </thead>
            <tbody>
              {dashboardRows.map((d) => (
                <tr key={d.nama} className="border-t align-top">
                  <td className="px-3 py-2 font-medium">{d.nama}</td>
                  <td className="px-3 py-2">{d.totalBouquet}</td>
                  <td className="px-3 py-2 text-xs">
                    {Object.entries(d.jenis)
                      .map(([nama, qty]) => `${nama} x${qty}`)
                      .join(', ')}
                  </td>
                  <td className="px-3 py-2 font-medium">{formatRupiah(d.totalUpah)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="font-semibold text-fleur-800 mb-2">Semua Pesanan Bulan Ini</h2>
      {loading ? (
        <p className="text-gray-500">Memuat...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">Belum ada pesanan di bulan ini.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-fleur-100 text-fleur-800 text-left">
              <tr>
                <th className="px-3 py-2">No. Pesanan</th>
                <th className="px-3 py-2">Tanggal Pesan</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Nama Buket</th>
                <th className="px-3 py-2">Catatan Custom</th>
                <th className="px-3 py-2">Pengerja</th>
                <th className="px-3 py-2">Tanggal & Jam Ambil</th>
                <th className="px-3 py-2">Progres</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t align-top">
                  <td className="px-3 py-2 font-medium">{o.order_code}</td>
                  <td className="px-3 py-2">{formatTanggal(o.order_date)}</td>
                  <td className="px-3 py-2">{o.customer_name}</td>
                  <td className="px-3 py-2">
                    {(o.order_items || []).map((it) => it.product_name).join(', ')}
                  </td>
                  <td className="px-3 py-2">
                    <textarea
                      defaultValue={o.notes || ''}
                      onBlur={(e) => updateField(o.id, 'notes', e.target.value)}
                      placeholder="Catatan request..."
                      className="border rounded px-2 py-1 text-xs w-40"
                      rows={2}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      defaultValue={o.pengerja || ''}
                      onBlur={(e) => updateField(o.id, 'pengerja', e.target.value)}
                      placeholder="Nama karyawan"
                      className="border rounded px-2 py-1 text-xs w-28"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="datetime-local"
                      defaultValue={o.tanggal_ambil ? o.tanggal_ambil.slice(0, 16) : ''}
                      onBlur={(e) => updateField(o.id, 'tanggal_ambil', e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={o.progres_pembuatan || 'Belum Dikerjakan'}
                      onChange={(e) => {
                        handleLocalChange(o.id, 'progres_pembuatan', e.target.value);
                        updateField(o.id, 'progres_pembuatan', e.target.value);
                      }}
                      className={`border rounded px-2 py-1 text-xs font-medium ${
                        badgeColor[o.progres_pembuatan] || badgeColor['Belum Dikerjakan']
                      }`}
                    >
                      {PROGRES_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
