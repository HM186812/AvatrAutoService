import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env
  : (typeof process !== 'undefined' ? process.env : {})) as Record<string, string | undefined>;

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabasePublishableKey = env.VITE_SUPABASE_ANON_KEY;

// =========================================================================
// ຕັ້ງຄ່າໂໝດຖານຂໍ້ມູນ (DATABASE CONNECTION MODE)
// ຖ້າບໍ່ມີ .env ຫຼື ບໍ່ມີ Key ລະບົບຈະ Fallback ເປັນ LocalStorage Offline Mode ອັດຕະໂນມັດ
// ຫາກຕ້ອງການບັງຄັບ Offline ຕະຫຼອດເວລາ ສາມາດໃສ່ VITE_FORCE_OFFLINE="true" ໃນ .env ໄດ້
// =========================================================================
export const FORCE_OFFLINE_DATABASE = env.VITE_FORCE_OFFLINE === 'true';

const isPlaceholder = (val?: string) =>
  !val ||
  val.trim() === '' ||
  val.includes('your-project-id') ||
  val.includes('your-anon-public-key');

function assertNotServiceRoleKey(key?: string) {
  if (!key || isPlaceholder(key)) return;
  if (key.startsWith('sb_secret_')) {
    throw new Error(
      'SECURITY HALT: A Supabase secret key must never be used in the browser.',
    );
  }
  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (payload?.role === 'service_role') {
        throw new Error(
          'SECURITY HALT: Detected a Supabase "service_role" secret key in VITE_SUPABASE_ANON_KEY. Never expose service_role keys in the browser. Use the public "anon" key instead.'
        );
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('SECURITY HALT:')) {
      throw err;
    }
  }
}

assertNotServiceRoleKey(supabasePublishableKey);

export const isSupabaseConfigured =
  !FORCE_OFFLINE_DATABASE &&
  !isPlaceholder(supabaseUrl) &&
  !isPlaceholder(supabasePublishableKey);

export const isOfflineDemoEnabled =
  Boolean(env.DEV || (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production')) &&
  env.VITE_ENABLE_OFFLINE_DEMO === 'true' &&
  !isSupabaseConfigured;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

export function createStatelessSupabaseClient() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
