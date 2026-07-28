'use client';

import { useEffect, useState } from 'react';
import { formatTanggal } from '../../../lib/formatters';

const PROGRES_OPTIONS = ['Belum Dikerjakan', 'Proses', 'Selesai'];

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
