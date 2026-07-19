import { createClient } from '@supabase/supabase-js';

// PENTING: file ini hanya boleh dipakai di server (API routes / server components),
// jangan pernah diimpor di file yang berjalan di browser, karena pakai service role key.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env.local'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
