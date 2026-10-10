'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah, formatTanggal } from '../../../../lib/formatters';

const UPAH_MATERIAL_NAME = 'Upah kerja 10 menit';

function getDefaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function UpahPerangkaiClient() {
  const [orders, setOrders] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(getDefaultMonth());
  const [openName, setOpenName] = useState(null);

  useEffect(() => {
    fetch('/api/materials')
      .then((r) => r.json())
      .then((d) => setMaterials(d.materials || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    setOpenName(null);
    fetch('/api/orders?detailed=true&limit=1000&bulan=' + month)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setOrders(d.orders || []);
      })
      .catch((err) => setError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [month]);

  const upahMaterial = materials.find((m) => m.name === UPAH_MATERIAL_NAME);
  const upahHargaTerkini = upahMaterial ? Number(upahMaterial.price) : 0;

  const selesai = orders.filter((o) => o.progres_pembuatan === 'Selesai');

  const byWorker = {};
  for (const o of selesai) {
    const nama = (o.pengerja || '').trim() || '(Belum diisi)';
    if (!byWorker[nama]) {
      byWorker[nama] = { nama, totalBouquet: 0, totalUpah: 0, lines: [] };
    }
    for (const it of o.order_items || []) {
      const qty = Number(it.qty) || 0;
      let upahTotal = 0;
      for (const mu of it.order_item_materials || []) {
        if (mu.materials && mu.materials.name === UPAH_MATERIAL_NAME) {
          upahTotal += Number(mu.qty_used) * Number(mu.materials.price);
        }
      }
      byWorker[nama].totalBouquet += qty;
      byWorker[nama].totalUpah += upahTotal;
      byWorker[nama].lines.push({
        key: o.id + '-' + it.id,
        kode: o.order_code,
        tanggal: o.order_date,
        produk: it.product_name,
        qty: qty,
        upahPerBouquet: qty > 0 ? upahTotal / qty : 0,
        upahTotal: upahTotal,
      });
    }
  }
  const rows = Object.values(byWorker).sort((a, b) => b.totalBouquet - a.totalBouquet);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/rekap" className="text-fleur-600 hover:underline text-sm">
            &larr; Kembali ke Rekap Penjualan
          </Link>
          <h1 className="text-xl font-bold text-fleur-800 mt-1">Upah Perangkai</h1>
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

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

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
                <th className="px-3 py-2">Total Upah</th>
                <th className="px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <Fragment key={d.nama}>
                  <tr className="border-t align-top">
                    <td className="px-3 py-2 font-medium">{d.nama}</td>
                    <td className="px-3 py-2">{d.totalBouquet}</td>
                    <td className="px-3 py-2 font-medium">{formatRupiah(d.totalUpah)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setOpenName(openName === d.nama ? null : d.nama)}
                        className="text-fleur-600 hover:underline text-xs font-medium"
                      >
                        {openName === d.nama ? 'Tutup Detail' : 'Lihat Detail'}
                      </button>
                    </td>
                  </tr>
                  {openName === d.nama && (
                    <tr className="border-t bg-fleur-50">
                      <td colSpan={4} className="px-3 py-3">
                        <p className="text-sm font-medium text-fleur-800 mb-2">
                          Detail pekerjaan {d.nama}
                        </p>
                        <div className="bg-white rounded-lg overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="text-left text-gray-500">
                              <tr>
                                <th className="px-3 py-2">Tanggal</th>
                                <th className="px-3 py-2">No. Pesanan</th>
                                <th className="px-3 py-2">Bouquet</th>
                                <th className="px-3 py-2">Jumlah</th>
                                <th className="px-3 py-2">Upah / Bouquet</th>
                                <th className="px-3 py-2">Total Upah</th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.lines.map((l) => (
                                <tr key={l.key} className="border-t">
                                  <td className="px-3 py-2">{formatTanggal(l.tanggal)}</td>
                                  <td className="px-3 py-2">{l.kode}</td>
                                  <td className="px-3 py-2">{l.produk}</td>
                                  <td className="px-3 py-2">{l.qty}</td>
                                  <td className="px-3 py-2">{formatRupiah(l.upahPerBouquet)}</td>
                                  <td className="px-3 py-2 font-medium">{formatRupiah(l.upahTotal)}</td>
                                </tr>
                              ))}
                              <tr className="border-t bg-gray-50 font-medium">
                                <td className="px-3 py-2" colSpan={3}>
                                  Total
                                </td>
                                <td className="px-3 py-2">{d.totalBouquet}</td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2">{formatRupiah(d.totalUpah)}</td>
                              </tr>
                            </tbody>
                          </table>
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
