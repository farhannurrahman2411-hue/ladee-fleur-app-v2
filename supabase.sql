-- ==========================================================
-- SKEMA DATABASE LADEE FLEUR
-- Cara pakai: buka Supabase Dashboard > SQL Editor > New Query
-- lalu tempel seluruh isi file ini, klik "Run".
-- ==========================================================

-- Tabel akun login (staff & owner). Password TIDAK disimpan polos,
-- selalu di-hash. Buat akun lewat: npm run create-user
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  full_name text,
  role text not null check (role in ('staff', 'owner')),
  created_at timestamptz default now()
);

-- Nomor urut otomatis untuk kode pesanan (BKT001, BKT002, dst)
create sequence if not exists order_seq start 1;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique,
  order_date date not null default current_date,
  customer_name text not null,
  total numeric not null default 0,
  dp numeric not null default 0,
  status_bayar text not null default 'BELUM LUNAS' check (status_bayar in ('LUNAS', 'BELUM LUNAS')),
  status_pesanan text not null default 'Diproses' check (status_pesanan in ('Diproses', 'Siap Diambil', 'Sudah Diambil', 'Dibatalkan')),
  notes text,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_name text not null,
  qty integer not null default 1,
  price numeric not null default 0
);

-- Trigger: setiap ada pesanan baru, otomatis kasih kode BKT001, BKT002, dst.
create or replace function set_order_code()
returns trigger as $$
begin
  if new.order_code is null then
    new.order_code := 'BKT' || lpad(nextval('order_seq')::text, 3, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_order_code on orders;
create trigger trg_set_order_code
before insert on orders
for each row execute function set_order_code();

-- Index untuk mempercepat pencarian & rekap
create index if not exists idx_orders_order_date on orders(order_date);
create index if not exists idx_order_items_order_id on order_items(order_id);

-- Row Level Security: kita matikan RLS di sini karena semua akses data
-- lewat API route Next.js pakai service role key + sistem login sendiri
-- (bukan Supabase Auth). Service role key otomatis bypass RLS,
-- jadi baris di bawah ini sifatnya jaga-jaga saja.
alter table app_users enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
