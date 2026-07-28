'use client';

import { useEffect, useState } from 'react';
import { formatRupiah, formatTanggal } from '../../../../lib/formatters';

export default function NotaPage({ params }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setOrder(data.order);
      });
  }, [params.id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!order) return <p className="text-gray-500">Memuat nota...</p>;

  const sisa = order.total - order.dp;

  return (
    <div>
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={() => window.print()}
          className="bg-fleur-600 hover:bg-fleur-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Cetak Nota
        </button>
      </div>

      <div className="bg-white rounded-xl shadow max-w-xl mx-auto p-8 print:shadow-none print:p-0">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-fleur-700 tracking-wide">LADEE FLEUR</h1>
          <p className="text-sm text-gray-500">Artificial Flower Bouquet</p>
          <p className="mt-3 font-semibold tracking-widest text-sm">N O T A &nbsp; P E M E S A N A N</p>
        </div>

        <table className="w-full text-sm mb-4">
          <tbody>
            <tr>
              <td className="py-1 text-gray-500 w-40">No. Pesanan</td>
              <td className="py-1 font-medium">{order.order_code}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-500">Tanggal</td>
              <td className="py-1 font-medium">{formatTanggal(order.order_date)}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-500">Nama Customer</td>
              <td className="py-1 font-medium">{order.customer_name}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full text-sm border-t border-b mb-4">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left py-2">Produk</th>
              <th className="text-center py-2">Qty</th>
              <th className="text-right py-2">Harga</th>
              <th className="text-right py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(order.order_items || []).map((it) => (
              <tr key={it.id} className="border-t">
                <td className="py-2">{it.product_name}</td>
                <td className="py-2 text-center">{it.qty}</td>
                <td className="py-2 text-right">{formatRupiah(it.price)}</td>
                <td className="py-2 text-right">{formatRupiah(it.qty * it.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="w-full text-sm mb-6">
          <tbody>
            <tr>
              <td className="py-1 text-gray-500 w-40">Total</td>
              <td className="py-1 font-bold text-right">{formatRupiah(order.total)}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-500">DP (Uang Muka)</td>
              <td className="py-1 text-right">{formatRupiah(order.dp)}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-500">Sisa Pembayaran</td>
              <td className="py-1 text-right">{formatRupiah(sisa)}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-500">Status</td>
              <td className="py-1 text-right font-semibold">{order.status_bayar}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-center text-xs text-gray-500 border-t pt-4">
          <p>Terima kasih telah memesan di Ladee Fleur 🌷</p>
          <p>Instagram: @ladee.fleur &nbsp;|&nbsp; WhatsApp: 085961089225</p>
        </div>
      </div>
    </div>
  );
}
