'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { formatRupiah, formatTanggal } from '../../../lib/formatters';

const UPAH_MATERIAL_NAME = 'Upah kerja 10 menit';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function RekapPage() {
  const [bulan, setBulan] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRekap(bulan);
    fetch('/api/materials')
      .then((r) => r.json())
      .then((d) => setMaterials(d.materials || []))
      .catch(() => {});
  }, [bulan]);

  async function loadRekap(b) {
    setLoading(true);
    const res = await fetch(`/api/rekap?bulan=${b}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  const upahMaterial = materials.find((m) => m.name === UPAH_MATERIAL_NAME);
  const upahHargaTerkini = upahMaterial ? Number(upahMaterial.price) : 0;

  let karyawanRows = [];
  if (data && data.orders) {
    const selesai = data.orders.filter((o) => o.progres_pembuatan === 'Selesai');
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
    karyawanRows = Object.values(dashboard).sort((a, b) => b.totalBouquet - a.totalBouquet);
  }

  function exportExcel() {
    if (!data) return;

    const rows = data.orders.map((o) => ({
      'No Pesanan': o.order_code,
      Tanggal: o.order_date,
      Customer: o.customer_name,
      Produk: (o.order_items || [])
        .map((it) => `${it.product_name} x${it.qty}`)
        .join(', '),
      Total: o.total,
      DP: o.dp,
      Sisa: o.total - o.dp,
      'Status Bayar': o.status_bayar,
      'Status Pesanan': o.status_pesanan,
    }));

    const wsPesanan = XLSX.utils.json_to_sheet(rows);

    const wsProduk = XLSX.utils.json_to_sheet(
      data.produk_terlaris.map((p) => ({
        Produk: p.produk,
        'Jumlah Terjual': p.jumlah,
        Omzet: p.omzet,
      }))
    );

    const wsKaryawan = XLSX.utils.json_to_sheet(
      karyawanRows.map((k) => ({
        Karyawan: k.nama,
        'Jumlah Bouquet': k.totalBouquet,
        'Jenis Bouquet': Object.entries(k.jenis).map(([n, q]) => `${n} x${q}`).join(', '),
        'Total Upah': k.totalUpah,
      }))
    );

    const wsRingkasan = XLSX.utils.json_to_sheet([
      { Keterangan: 'Total Pesanan', Nilai: data.total_pesanan },
      { Keterangan: 'Total Omzet', Nilai: data.total_omzet },
      { Keterangan: 'Total HPP', Nilai: data.total_hpp },
      { Keterangan: 'Laba Kotor', Nilai: data.laba_kotor },
      { Keterangan: 'Total DP Masuk', Nilai: data.total_dp_masuk },
      { Keterangan: 'Piutang / Sisa Pembayaran', Nilai: data.piutang },
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, wsPesanan, 'Data Pesanan');
    XLSX.utils.book_append_sheet(wb, wsProduk, 'Produk Terlaris');
    XLSX.utils.book_append_sheet(wb, wsKaryawan, 'Upah Karyawan');

    XLSX.writeFile(wb, `Rekap-Penjualan-Ladee-Fleur-${bulan}.xlsx`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-fleur-800">Rekap Penjualan</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={exportExcel}
            disabled={!data || loading}
            className="bg-fleur-600 hover:bg-fleur-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            Export ke Excel
          </button>
        </div>
      </div>

      {loading || !data ? (
        <p className="text-gray-500">Memuat...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card label="Total Pesanan" value={data.total_pesanan} />
            <Card label="Total Omzet" value={formatRupiah(data.total_omzet)} />
            <Card label="Total HPP" value={formatRupiah(data.total_hpp)} />
            <Card label="Laba Kotor" value={formatRupiah(data.laba_kotor)} />
            <Card label="Total DP Masuk" value={formatRupiah(data.total_dp_masuk)} />
            <Card label="Piutang / Sisa" value={formatRupiah(data.piutang)} />
          </div>

          <h2 className="font-semibold text-fleur-800 mb-2">Upah Karyawan Bulan Ini</h2>
          <p className="text-xs text-gray-500 mb-2">
            Dihitung dari pesanan berstatus "Selesai", memakai harga upah terkini dari Database Bahan ({formatRupiah(upahHargaTerkini)}/10 menit).
          </p>
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
                {karyawanRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-gray-400">
                      Belum ada pesanan selesai bulan ini.
                    </td>
                  </tr>
                ) : (
                  karyawanRows.map((k) => (
                    <tr key={k.nama} className="border-t align-top">
                      <td className="px-3 py-2 font-medium">{k.nama}</td>
                      <td className="px-3 py-2">{k.totalBouquet}</td>
                      <td className="px-3 py-2 text-xs">
                        {Object.entries(k.jenis).map(([n, q]) => `${n} x${q}`).join(', ')}
                      </td>
                      <td className="px-3 py-2 font-medium">{formatRupiah(k.totalUpah)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 className="font-semibold text-fleur-800 mb-2">Produk Terlaris Bulan Ini</h2>
          <div className="bg-white rounded-xl shadow overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead className="bg-fleur-100 text-fleur-800 text-left">
                <tr>
                  <th className="px-3 py-2">Produk</th>
                  <th className="px-3 py-2">Jumlah Terjual</th>
                  <th className="px-3 py-2">Omzet</th>
                </tr>
              </thead>
              <tbody>
                {data.produk_terlaris.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-gray-400">
                      Belum ada data.
                    </td>
                  </tr>
                ) : (
                  data.produk_terlaris.map((p) => (
                    <tr key={p.produk} className="border-t">
                      <td className="px-3 py-2">{p.produk}</td>
                      <td className="px-3 py-2">{p.jumlah}</td>
                      <td className="px-3 py-2">{formatRupiah(p.omzet)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 className="font-semibold text-fleur-800 mb-2">Semua Pesanan Bulan Ini</h2>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-fleur-100 text-fleur-800 text-left">
                <tr>
                  <th className="px-3 py-2">No. Pesanan</th>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-gray-400">
                      Belum ada pesanan bulan ini.
                    </td>
                  </tr>
                ) : (
                  data.orders.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{o.order_code}</td>
                      <td className="px-3 py-2">{formatTanggal(o.order_date)}</td>
                      <td className="px-3 py-2">{o.customer_name}</td>
                      <td className="px-3 py-2">{formatRupiah(o.total)}</td>
                      <td className="px-3 py-2">{o.status_bayar}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-fleur-700">{value}</p>
    </div>
  );
}
