export function formatRupiah(angka) {
  const n = Number(angka || 0);
  return 'Rp' + n.toLocaleString('id-ID');
}

export function formatTanggal(tanggal) {
  if (!tanggal) return '-';
  const d = new Date(tanggal);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
