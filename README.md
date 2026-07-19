# Aplikasi Ladee Fleur - Pemesanan & Nota

Aplikasi web untuk mencatat pesanan, mencetak nota, dan melihat rekap penjualan
toko Ladee Fleur. Bisa dipakai beberapa orang sekaligus (1 akun staff bersama
+ 1 akun owner khusus).

## Fitur

- Login dengan 2 peran: **staff** (input & lihat pesanan) dan **owner** (semua
  akses staff + rekap penjualan & export Excel).
- Nomor pesanan (kode BKT001, BKT002, dst) **dibuat otomatis**, tidak perlu diisi manual.
- Produk pesanan **bebas/custom** — bisa ketik nama produk apa saja, bisa lebih dari
  1 item per pesanan.
- Nota bisa langsung **dicetak dari browser**.
- Halaman **Rekap Penjualan** (total omzet, DP masuk, piutang, produk terlaris)
  hanya bisa diakses akun **owner**, lengkap dengan tombol **export ke Excel**.

---

## Langkah 1 — Siapkan database (Supabase, gratis)

1. Daftar/login di https://supabase.com lalu klik **New Project**.
2. Setelah project selesai dibuat, buka menu **SQL Editor** di sidebar kiri.
3. Klik **New query**, tempel seluruh isi file `supabase.sql` yang ada di folder ini,
   lalu klik **Run**. Ini akan membuat semua tabel yang dibutuhkan.
4. Buka menu **Project Settings > API**. Catat 2 nilai berikut, akan dipakai di Langkah 2:
   - **Project URL**
   - **service_role key** (bukan `anon` key — service_role bersifat rahasia, jangan disebar)

## Langkah 2 — Konfigurasi aplikasi

1. Install [Node.js](https://nodejs.org) versi 18 ke atas jika belum ada.
2. Buka folder project ini lewat terminal, lalu jalankan:
   ```
   npm install
   ```
3. Duplikat file `.env.local.example` menjadi `.env.local`, lalu isi:
   - `SUPABASE_URL` → Project URL dari Langkah 1
   - `SUPABASE_SERVICE_ROLE_KEY` → service_role key dari Langkah 1
   - `SESSION_SECRET` → ketik bebas, teks acak yang panjang (misal 40 karakter)

## Langkah 3 — Buat akun login

Jalankan perintah berikut, lalu ikuti instruksinya di terminal (akan ditanya
username, nama, password, dan role):

```
npm run create-user
```

Jalankan 2 kali: sekali untuk akun **staff** (role: staff), sekali lagi untuk
akun **owner** (role: owner). Password boleh diganti kapan saja dengan
menjalankan perintah ini lagi memakai username yang sama.

## Langkah 4 — Coba jalankan di komputer sendiri

```
npm run dev
```

Buka http://localhost:3000 di browser, login pakai akun yang tadi dibuat.

---

## Langkah 5 — Deploy supaya bisa diakses online (gratis, lewat Vercel)

1. Upload folder project ini ke GitHub (buat repository baru, lalu push semua file).
2. Daftar/login di https://vercel.com pakai akun GitHub kamu.
3. Klik **Add New Project**, pilih repository yang tadi di-push.
4. Sebelum klik Deploy, buka bagian **Environment Variables**, lalu tambahkan
   3 variabel yang sama seperti di `.env.local` kamu:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
5. Klik **Deploy**. Setelah selesai (sekitar 1-2 menit), Vercel akan memberi
   alamat website (misal `ladee-fleur.vercel.app`) yang bisa dipakai staff
   dan owner untuk login dari HP atau komputer mana saja.

Setiap kali kamu perlu ubah kode di kemudian hari, tinggal push perubahan ke
GitHub dan Vercel otomatis deploy ulang.

---

## Hal-hal yang perlu disesuaikan

- Nomor WhatsApp & Instagram di nota masih placeholder
  (`app/(app)/nota/[id]/page.js`) — cari teks `@ladeefleur` dan
  `08xx-xxxx-xxxx`, ganti dengan yang asli.
- Kalau nanti mau nambah pilihan status pesanan, edit `STATUS_PESANAN_OPTIONS`
  di `app/(app)/pesanan/page.js` dan `check` constraint `status_pesanan` di
  `supabase.sql`.

## Struktur singkat

```
app/
  login/              halaman login
  (app)/
    pesanan/           daftar pesanan (staff & owner)
    pesanan/baru/       form pesanan baru (produk custom, multi item)
    nota/[id]/          nota siap cetak
    rekap/              rekap penjualan + export Excel (khusus owner)
  api/                 semua endpoint backend
lib/                   helper (koneksi Supabase, sesi login, format angka)
scripts/create-user.js  bikin/reset akun login lewat terminal
supabase.sql            skema database, jalankan sekali di Supabase
```
