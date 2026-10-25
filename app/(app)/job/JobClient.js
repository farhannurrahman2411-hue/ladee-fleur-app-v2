'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
  const [employees, setEmployees] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const loadOrders = useCallback(async (m, silent) => {
    if (!silent) setLoading(true);
    try {
      const url = m ? `/api/orders?bulan=${m}` : '/api/orders';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders || []);
    } catch (err) {
      setError('Gagal memuat data pesanan');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmployees(data.employees || []);
      setCanManage(!!data.can_manage);
    } catch (err) {
      setError('Daftar karyawan belum bisa dimuat. Pastikan tabel karyawan sudah dibuat.');
    }
  }, []);

  useEffect(() => {
    loadOrders(month);
  }, [month, loadOrders]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  async function updateField(id, field, value) {
    // Optimistic local state update
    handleLocalChange(id, field, value);
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (err) {
      console.error('Error saving field:', err);
    }
  }

  function handleLocalChange(id, field, value) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  }

  async function tambahKaryawan(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewName('');
      await loadEmployees();
    } catch (err) {
      alert('Gagal menambah karyawan: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function gantiNama(emp, input) {
    const name = input.value.trim();
    if (name === emp.name) return;
    if (!name) {
      input.value = emp.name;
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/employees/' + emp.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await Promise.all([loadEmployees(), loadOrders(month, true)]);
    } catch (err) {
      alert('Gagal mengganti nama: ' + err.message);
      input.value = emp.name;
    } finally {
      setBusy(false);
    }
  }

  const employeeNames = employees.map((emp) => emp.name);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-xl font-bold text-fleur-800">Job Perangkai Bouquet</h1>
          <Link href="/job/dashboard" className="text-xs text-fleur-600 hover:underline">
            Lihat Dashboard Upah &rarr;
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={() => setShowManage(!showManage)}
              className="bg-fleur-600 hover:bg-fleur-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {showManage ? 'Tutup Kelola' : 'Kelola Karyawan'}
            </button>
          )}
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {canManage && showManage && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <p className="text-sm font-medium text-fleur-800 mb-1">Kelola Karyawan</p>
          <p className="text-xs text-gray-500 mb-3">
            Ubah nama langsung di kotak, lalu klik di luar kotak untuk menyimpan. Nama di semua pesanan lama ikut berubah.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {employees.length === 0 && (
              <p className="text-xs text-gray-400">Belum ada karyawan.</p>
            )}
            {employees.map((emp) => (
              <input
                key={emp.id + '-' + emp.name}
                type="text"
                defaultValue={emp.name}
                onBlur={(ev) => gantiNama(emp, ev.target)}
                disabled={busy}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            ))}
          </div>
          <form onSubmit={tambahKaryawan} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama karyawan baru"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="bg-fleur-600 hover:bg-fleur-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              Tambah
            </button>
          </form>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Memuat...</p>
      ) : orders.length === 0 ? (
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
              {orders.map((o) => {
                const current = o.pengerja || '';
                const isLegacy = current !== '' && !employeeNames.includes(current);
                return (
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
                      <select
                        value={current}
                        onChange={(e) => updateField(o.id, 'pengerja', e.target.value)}
                        className="border rounded px-2 py-1 text-xs w-32"
                      >
                        <option value="">Pilih karyawan</option>
                        {isLegacy && <option value={current}>{current}</option>}
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name}
                          </option>
                        ))}
                      </select>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
