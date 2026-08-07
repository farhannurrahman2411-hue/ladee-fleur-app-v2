'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { formatRupiah, formatTanggal } from '../../../lib/formatters';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function RekapPage() {
  const [bulan, setBulan] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRekap(bulan);
  }, [bulan]);

  async function loadRekap(b) {
    setLoading(true);
    const res = await fetch(`/api/rekap?bulan=${b}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
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

   <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card label="Total Pesanan" value={data.total_pesanan} />
            <Card label="Total Omzet" value={formatRupiah(data.total_omzet)} />
            <Card label="Total HPP" value={formatRupiah(data.total_hpp)} />
            <Card label="Laba Kotor" value={formatRupiah(data.laba_kotor)} />
            <Card label="Total DP Masuk" value={formatRupiah(data.total_dp_masuk)} />
            <Card label="Piutang / Sisa" value={formatRupiah(data.piutang)} />
          </div>

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, wsPesanan, 'Data Pesanan');
    XLSX.utils.book_append_sheet(wb, wsProduk, 'Produk Terlaris');

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card label="Total Pesanan" value={data.total_pesanan} />
            <Card label="Total Omzet" value={formatRupiah(data.total_omzet)} />
            <Card label="Total DP Masuk" value={formatRupiah(data.total_dp_masuk)} />
            <Card label="Piutang / Sisa" value={formatRupiah(data.piutang)} />
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
