/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:admin123@127.0.0.1:5432/ladee_fleur_db';

  const isCloudSupabase =
    url && !url.includes('xxxxxxxx') && url.startsWith('http') && key;

  const username = (await ask('Username: ')).trim().toLowerCase();
  const full_name = (await ask('Nama lengkap: ')).trim();
  const password = await ask('Password: ');
  const roleInput = (await ask('Role (staff/owner): ')).trim().toLowerCase();
  const role = roleInput === 'owner' ? 'owner' : 'staff';

  const password_hash = await bcrypt.hash(password, 10);

  if (isCloudSupabase) {
    const supabase = createClient(url, key);
    const { error } = await supabase
      .from('app_users')
      .upsert({ username, full_name, password_hash, role }, { onConflict: 'username' });

    if (error) {
      console.error('Gagal membuat user di Supabase:', error.message);
      process.exit(1);
    }
  } else {
    // Gunakan direct PostgreSQL lokal
    const pool = new Pool({ connectionString: dbUrl });
    try {
      await pool.query(
        `INSERT INTO app_users (username, full_name, password_hash, role, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (username) 
         DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, updated_at = CURRENT_TIMESTAMP`,
        [username, full_name, password_hash, role]
      );
      await pool.end();
    } catch (err) {
      console.error('Gagal membuat user di PostgreSQL lokal:', err.message);
      process.exit(1);
    }
  }

  console.log(`✓ Akun "${username}" (${role}) berhasil dibuat/diperbarui.`);
  rl.close();
}

main();
