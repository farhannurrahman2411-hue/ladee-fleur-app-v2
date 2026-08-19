-- Performance optimization: composite indexes and atomic helpers

CREATE INDEX IF NOT EXISTS idx_orders_order_date_desc ON orders (order_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_materials_item_id ON order_item_materials (order_item_id);
CREATE INDEX IF NOT EXISTS idx_materials_name_lookup ON materials (name);
