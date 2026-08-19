-- ==============================================================================
-- LADEE FLEUR - COMPLETE DATABASE SCHEMA & STORED PROCEDURES
-- Compatibility: Local PostgreSQL 14+ & Supabase Database Engine (Production & Local)
-- ==============================================================================

-- Aktifkan ekstensi UUID & Pgcrypto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABEL: app_users (Akun Pengguna: Staff & Owner)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('staff', 'owner')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. TABEL: materials (Master Data Bahan Baku & Inventory)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100),
  price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
  current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  purchase_links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);

-- ==============================================================================
-- 3. TABEL: bouquet_templates (Master Katalog Resep Buket)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS bouquet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. TABEL: bouquet_template_materials (Relasi Resep Bahan Template)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS bouquet_template_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES bouquet_templates(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  qty_used NUMERIC(10, 2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_btm_template_id ON bouquet_template_materials(template_id);
CREATE INDEX IF NOT EXISTS idx_btm_material_id ON bouquet_template_materials(material_id);

-- ==============================================================================
-- 5. TABEL: orders (Header Data Transaksi Pesanan)
-- ==============================================================================
CREATE SEQUENCE IF NOT EXISTS order_seq START 1;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code VARCHAR(20) UNIQUE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name VARCHAR(150) NOT NULL,
  total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  dp NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status_bayar VARCHAR(20) NOT NULL DEFAULT 'BELUM LUNAS' CHECK (status_bayar IN ('LUNAS', 'BELUM LUNAS')),
  status_pesanan VARCHAR(30) NOT NULL DEFAULT 'Diproses' CHECK (status_pesanan IN ('Diproses', 'Siap Diambil', 'Sudah Diambil', 'Dibatalkan')),
  pengerja VARCHAR(100),
  tanggal_ambil TIMESTAMPTZ,
  progres_pembuatan VARCHAR(30) NOT NULL DEFAULT 'Belum Dikerjakan' CHECK (progres_pembuatan IN ('Belum Dikerjakan', 'Proses', 'Selesai')),
  notes TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status_pesanan, progres_pembuatan);

-- ==============================================================================
-- 6. TABEL: order_items (Detail Item Buket per Pesanan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name VARCHAR(150) NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  hpp NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ==============================================================================
-- 7. TABEL: order_item_materials (Snapshot Bahan Baku Terpakai per Item)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS order_item_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  qty_used NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_order_date_desc ON orders (order_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oim_item_id ON order_item_materials(order_item_id);
CREATE INDEX IF NOT EXISTS idx_oim_material_id ON order_item_materials(material_id);

-- ==============================================================================
-- 8. TRIGGERS: Auto-Generate Nomor Pesanan (BKT001, BKT002, dst)
-- ==============================================================================
CREATE OR REPLACE FUNCTION set_order_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_code IS NULL OR TRIM(NEW.order_code) = '' THEN
    NEW.order_code := 'BKT' || LPAD(NEXTVAL('order_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_order_code ON orders;
CREATE TRIGGER trg_set_order_code
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION set_order_code();

-- ==============================================================================
-- 9. STORED PROCEDURES: Atomic Stock Decrement & Increment (RPC Supabase)
-- ==============================================================================
CREATE OR REPLACE FUNCTION decrement_stock(p_material_id UUID, p_qty NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE materials
  SET current_stock = current_stock - p_qty,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_material_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_stock(p_material_id UUID, p_qty NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE materials
  SET current_stock = current_stock + p_qty,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_material_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 10. TRIGGER: Auto-Restock Saat Order Dihapus (Mencegah Stock Leak)
-- ==============================================================================
CREATE OR REPLACE FUNCTION restock_on_order_delete()
RETURNS TRIGGER AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT oim.material_id, oim.qty_used
    FROM order_items oi
    JOIN order_item_materials oim ON oim.order_item_id = oi.id
    WHERE oi.order_id = OLD.id
  LOOP
    PERFORM increment_stock(rec.material_id, rec.qty_used);
  END LOOP;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restock_on_order_delete ON orders;
CREATE TRIGGER trg_restock_on_order_delete
BEFORE DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION restock_on_order_delete();

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouquet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouquet_template_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_materials ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 12. SEED DATA AWAL (Akun Owner/Staff, Bahan Awal, Template Katalog)
-- ==============================================================================
INSERT INTO app_users (username, password_hash, full_name, role)
VALUES 
  ('owner', '$2a$10$SrhJn0uYD9.dNN7DO8ffQOQxc2RTPcctYyk.HFGyojDGG09hGxT3m', 'Owner Ladee Fleur', 'owner'),
  ('staff', '$2a$10$SrhJn0uYD9.dNN7DO8ffQOQxc2RTPcctYyk.HFGyojDGG09hGxT3m', 'Staff Operasional', 'staff')
ON CONFLICT (username) DO NOTHING;

INSERT INTO materials (name, category, price, unit, current_stock, min_stock, purchase_links)
VALUES
  ('Upah kerja 10 menit', 'Upah', 3000.00, 'sesi', 99999.00, 0.00, '[]'::jsonb),
  ('Mawar Merah Artificial Premium', 'Bunga', 4500.00, 'tangkai', 120.00, 20.00, '[{"label": "Shopee Supplier Bunga", "url": "https://shopee.co.id"}]'::jsonb),
  ('Kertas Wrapping Cello Pink Glossy', 'Kertas Wrapping', 3500.00, 'lembar', 50.00, 10.00, '[]'::jsonb),
  ('Pita Satin 2cm Dusty Rose', 'Pita & Aksesoris', 1200.00, 'meter', 100.00, 15.00, '[]'::jsonb),
  ('Floral Foam Kering', 'Perlengkapan', 8000.00, 'balok', 25.00, 5.00, '[]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO bouquet_templates (name, price)
VALUES ('Bouquet Mawar Single Pink Elegant', 45000.00)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  tpl_id UUID;
  mat_mawar UUID;
  mat_wrap UUID;
  mat_pita UUID;
  mat_upah UUID;
BEGIN
  SELECT id INTO tpl_id FROM bouquet_templates WHERE name = 'Bouquet Mawar Single Pink Elegant' LIMIT 1;
  SELECT id INTO mat_mawar FROM materials WHERE name = 'Mawar Merah Artificial Premium' LIMIT 1;
  SELECT id INTO mat_wrap FROM materials WHERE name = 'Kertas Wrapping Cello Pink Glossy' LIMIT 1;
  SELECT id INTO mat_pita FROM materials WHERE name = 'Pita Satin 2cm Dusty Rose' LIMIT 1;
  SELECT id INTO mat_upah FROM materials WHERE name = 'Upah kerja 10 menit' LIMIT 1;

  IF tpl_id IS NOT NULL THEN
    INSERT INTO bouquet_template_materials (template_id, material_id, qty_used)
    VALUES
      (tpl_id, mat_mawar, 1),
      (tpl_id, mat_wrap, 1),
      (tpl_id, mat_pita, 1.5),
      (tpl_id, mat_upah, 1)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
