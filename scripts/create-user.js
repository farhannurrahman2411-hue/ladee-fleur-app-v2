/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const username = (await ask('Username: ')).trim().toLowerCase();
  const full_name = (await ask('Nama lengkap: ')).trim();
  const password = await ask('Password: ');
  const roleInput = (await ask('Role (staff/owner): ')).trim().toLowerCase();
  const role = roleInput === 'owner' ? 'owner' : 'staff';

  const password_hash = await bcrypt.hash(password, 10);

  const { error } = await supabase
    .from('app_users')
    .upsert({ username, full_name, password_hash, role }, { onConflict: 'username' });

  if (error) {
    console.error('Gagal membuat user:', error.message);
    process.exit(1);
  }

  console.log(`Akun "${username}" (${role}) berhasil dibuat/diperbarui.`);
  rl.close();
}

main();
