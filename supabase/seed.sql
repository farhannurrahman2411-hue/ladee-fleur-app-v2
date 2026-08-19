-- Seed Data: supabase/seed.sql

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
