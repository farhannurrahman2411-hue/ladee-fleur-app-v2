'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah } from '../../../../lib/formatters';

const UPAH_MATERIAL_NAME = 'Upah kerja 10 menit';

function getDefaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function DashboardKaryawanClient() {
  const [orders, setOrders] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(getDefaultMonth());

  useEffect(() => {
    Promise.all([
      fetch('/api/orders').then((r) => r.json()),
      fetch('/api/materials').then((r) => r.json()),
    ])
      .then(([orderData, matData]) => {
        setOrders(orderData.orders || []);
        setMaterials(matData.materials || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const upahMaterial = materials.find((m) => m.name === UPAH_MATERIAL_NAME);
  const upahHargaTerkini = upahMaterial ? Number(upahMaterial.price) : 0;

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
          dashboard[nama].totalUpah += Number(mu.qty_used) * upahHargaTerkini;
        }
      }
    }
  }
  const rows = Object.values(dashboard).sort((a, b) => b.totalBouquet - a.totalBouquet);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/job" className="text-fleur-600 hover:underline text-sm">
            &larr; Kembali ke Job Perangkai Bouquet
          </Link>
          <h1 className="text-xl font-bold text-fleur-800 mt-1">Dashboard Upah Karyawan</h1>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Dihitung dari pesanan berstatus "Selesai" pada bulan yang dipilih, memakai harga upah terkini dari Database Bahan ({formatRupiah(upahHargaTerkini)}/10 menit).
      </p>

      {loading ? (
        <p className="text-gray-500">Memuat...</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">Belum ada pesanan selesai bulan ini.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
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
              {rows.map((d) => (
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
    </div>
  );
}
