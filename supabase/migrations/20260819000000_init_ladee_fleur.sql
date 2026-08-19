-- Migration: 20260819000000_init_ladee_fleur.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('staff', 'owner')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS bouquet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bouquet_template_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES bouquet_templates(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  qty_used NUMERIC(10, 2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_btm_template_id ON bouquet_template_materials(template_id);
CREATE INDEX IF NOT EXISTS idx_btm_material_id ON bouquet_template_materials(material_id);

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

CREATE TABLE IF NOT EXISTS order_item_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  qty_used NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oim_item_id ON order_item_materials(order_item_id);
CREATE INDEX IF NOT EXISTS idx_oim_material_id ON order_item_materials(material_id);

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

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouquet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouquet_template_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_materials ENABLE ROW LEVEL SECURITY;
