import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

let pgPool = null;

function getPgPool() {
  if (!pgPool) {
    const connectionString =
      process.env.DATABASE_URL;
    pgPool = new Pool({ connectionString });
  }
  return pgPool;
}

function isLocalPg() {
  const url = process.env.SUPABASE_URL || '';
  const isPlaceholder = url.includes('xxxxxxxx') || !url.startsWith('http');
  return isPlaceholder || Boolean(process.env.DATABASE_URL && !process.env.SUPABASE_URL);
}

// PostgreSQL Query Builder Adapter with Supabase-compatible API
class PgQueryBuilder {
  constructor(pool, tableName) {
    this.pool = pool;
    this.tableName = tableName;
    this._select = '*';
    this._filters = [];
    this._params = [];
    this._orders = [];
    this._action = 'SELECT';
    this._insertData = null;
    this._updateData = null;
    this._onConflict = null;
    this._single = false;
    this._maybeSingle = false;
  }

  select(fields = '*') {
    this._select = fields;
    return this;
  }

  eq(column, value) {
    this._params.push(value);
    this._filters.push(`"${column}" = $${this._params.length}`);
    return this;
  }

  neq(column, value) {
    this._params.push(value);
    this._filters.push(`"${column}" != $${this._params.length}`);
    return this;
  }

  ilike(column, pattern) {
    this._params.push(pattern);
    this._filters.push(`"${column}" ILIKE $${this._params.length}`);
    return this;
  }

  gte(column, value) {
    this._params.push(value);
    this._filters.push(`"${column}" >= $${this._params.length}`);
    return this;
  }

  lte(column, value) {
    this._params.push(value);
    this._filters.push(`"${column}" <= $${this._params.length}`);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this._orders.push(`"${column}" ${ascending ? 'ASC' : 'DESC'}`);
    return this;
  }

  insert(data) {
    this._action = 'INSERT';
    this._insertData = data;
    return this;
  }

  update(data) {
    this._action = 'UPDATE';
    this._updateData = data;
    return this;
  }

  delete() {
    this._action = 'DELETE';
    return this;
  }

  upsert(data, { onConflict = 'id' } = {}) {
    this._action = 'UPSERT';
    this._insertData = data;
    this._onConflict = onConflict;
    return this;
  }

  single() {
    this._single = true;
    return this._execute();
  }

  maybeSingle() {
    this._maybeSingle = true;
    return this._execute();
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }

  async _execute() {
    try {
      let queryText = '';
      let params = [...this._params];

      if (this._action === 'INSERT' || this._action === 'UPSERT') {
        const rows = Array.isArray(this._insertData)
          ? this._insertData
          : [this._insertData];
        if (rows.length === 0) {
          return { data: [], error: null };
        }

        const keys = Object.keys(rows[0]);
        const columns = keys.map((k) => `"${k}"`).join(', ');
        const valuePlaceholders = [];
        params = [];

        rows.forEach((row) => {
          const rowPlaceholders = [];
          keys.forEach((key) => {
            params.push(row[key] !== undefined ? row[key] : null);
            rowPlaceholders.push(`$${params.length}`);
          });
          valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        });

        queryText = `INSERT INTO "${this.tableName}" (${columns}) VALUES ${valuePlaceholders.join(', ')}`;

        if (this._action === 'UPSERT' && this._onConflict) {
          const updateSet = keys
            .filter((k) => k !== this._onConflict && k !== 'id')
            .map((k) => `"${k}" = EXCLUDED."${k}"`)
            .join(', ');
          if (updateSet) {
            queryText += ` ON CONFLICT ("${this._onConflict}") DO UPDATE SET ${updateSet}`;
          } else {
            queryText += ` ON CONFLICT ("${this._onConflict}") DO NOTHING`;
          }
        }

        queryText += ' RETURNING *';
      } else if (this._action === 'UPDATE') {
        const keys = Object.keys(this._updateData);
        if (keys.length === 0) {
          return { data: null, error: null };
        }

        params = [];
        const setClauses = keys.map((key) => {
          params.push(this._updateData[key]);
          return `"${key}" = $${params.length}`;
        });

        const filterClauses = [];
        this._filters.forEach((f, idx) => {
          params.push(this._params[idx]);
          filterClauses.push(f.replace(/\$\d+/, `$${params.length}`));
        });

        const whereSql = filterClauses.length > 0 ? ` WHERE ${filterClauses.join(' AND ')}` : '';
        queryText = `UPDATE "${this.tableName}" SET ${setClauses.join(', ')}${whereSql} RETURNING *`;
      } else if (this._action === 'DELETE') {
        const whereSql = this._filters.length > 0 ? ` WHERE ${this._filters.join(' AND ')}` : '';
        queryText = `DELETE FROM "${this.tableName}"${whereSql} RETURNING *`;
      } else {
        // SELECT
        const whereSql = this._filters.length > 0 ? ` WHERE ${this._filters.join(' AND ')}` : '';
        const orderSql = this._orders.length > 0 ? ` ORDER BY ${this._orders.join(', ')}` : '';
        queryText = `SELECT * FROM "${this.tableName}"${whereSql}${orderSql}`;
      }

      const res = await this.pool.query(queryText, params);
      let data = res.rows;

      // Handle nested relations if requested in SELECT
      if (this._action === 'SELECT' && this._select.includes('(')) {
        data = await this._enrichNestedData(data, this._select);
      }

      if (this._single) {
        if (data.length === 0) {
          return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
        }
        return { data: data[0], error: null };
      }

      if (this._maybeSingle) {
        return { data: data.length > 0 ? data[0] : null, error: null };
      }

      // If insert single row
      if ((this._action === 'INSERT' || this._action === 'UPSERT') && !Array.isArray(this._insertData) && (this._single || this._maybeSingle)) {
        return { data: data[0] || null, error: null };
      }

      return { data, error: null };
    } catch (err) {
      console.error(`PostgreSQL query error on [${this.tableName}]:`, err);
      return { data: null, error: { message: err.message, details: err } };
    }
  }

  async _enrichNestedData(rows, selectPattern) {
    if (!rows || rows.length === 0) return rows;

    // Handle orders -> order_items -> order_item_materials -> materials
    if (this.tableName === 'orders') {
      const orderIds = rows.map((r) => r.id);
      const itemsRes = await this.pool.query(
        `SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY created_at ASC`,
        [orderIds]
      );
      const items = itemsRes.rows;

      if (items.length > 0) {
        const itemIds = items.map((i) => i.id);
        const materialsRes = await this.pool.query(
          `SELECT oim.*, m.name as mat_name, m.unit as mat_unit, m.price as mat_price
           FROM order_item_materials oim
           LEFT JOIN materials m ON m.id = oim.material_id
           WHERE oim.order_item_id = ANY($1)`,
          [itemIds]
        );

        const materialsByItem = {};
        materialsRes.rows.forEach((m) => {
          if (!materialsByItem[m.order_item_id]) materialsByItem[m.order_item_id] = [];
          materialsByItem[m.order_item_id].push({
            id: m.id,
            order_item_id: m.order_item_id,
            material_id: m.material_id,
            qty_used: m.qty_used,
            unit_price: m.unit_price,
            materials: {
              name: m.mat_name,
              unit: m.mat_unit,
              price: m.mat_price,
            },
          });
        });

        const itemsByOrder = {};
        items.forEach((item) => {
          if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
          item.order_item_materials = materialsByItem[item.id] || [];
          itemsByOrder[item.order_id].push(item);
        });

        rows.forEach((order) => {
          order.order_items = itemsByOrder[order.id] || [];
        });
      } else {
        rows.forEach((order) => {
          order.order_items = [];
        });
      }
    }

    // Handle bouquet_templates -> bouquet_template_materials -> materials
    if (this.tableName === 'bouquet_templates') {
      const templateIds = rows.map((r) => r.id);
      const btmRes = await this.pool.query(
        `SELECT btm.*, m.name as mat_name, m.unit as mat_unit, m.price as mat_price
         FROM bouquet_template_materials btm
         LEFT JOIN materials m ON m.id = btm.material_id
         WHERE btm.template_id = ANY($1)`,
        [templateIds]
      );

      const btmByTemplate = {};
      btmRes.rows.forEach((btm) => {
        if (!btmByTemplate[btm.template_id]) btmByTemplate[btm.template_id] = [];
        btmByTemplate[btm.template_id].push({
          id: btm.id,
          template_id: btm.template_id,
          material_id: btm.material_id,
          qty_used: btm.qty_used,
          materials: {
            name: btm.mat_name,
            unit: btm.mat_unit,
            price: btm.mat_price,
          },
        });
      });

      rows.forEach((tpl) => {
        tpl.bouquet_template_materials = btmByTemplate[tpl.id] || [];
      });
    }

    return rows;
  }
}

class PgClientAdapter {
  constructor(pool) {
    this.pool = pool;
  }

  from(tableName) {
    return new PgQueryBuilder(this.pool, tableName);
  }

  async rpc(functionName, params = {}) {
    try {
      if (functionName === 'decrement_stock') {
        const { p_material_id, p_qty } = params;
        await this.pool.query(
          'UPDATE materials SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2',
          [p_qty, p_material_id]
        );
        return { data: null, error: null };
      }
      if (functionName === 'increment_stock') {
        const { p_material_id, p_qty } = params;
        await this.pool.query(
          'UPDATE materials SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2',
          [p_qty, p_material_id]
        );
        return { data: null, error: null };
      }
      return { data: null, error: null };
    } catch (err) {
      console.error(`RPC error [${functionName}]:`, err);
      return { data: null, error: { message: err.message } };
    }
  }
}

export function supabaseAdmin() {
  if (isLocalPg()) {
    return new PgClientAdapter(getPgPool());
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // Fallback to local PostgreSQL if available
    return new PgClientAdapter(getPgPool());
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
