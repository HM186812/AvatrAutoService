import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://avatrautoservice.bcsa7968.workers.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function getAllowedOrigins(): string[] {
  const configured = (Deno.env.get('ALLOWED_ORIGINS') || Deno.env.get('SITE_URL') || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
}

export function isOriginAllowed(req?: Request): boolean {
  const reqOrigin = req?.headers.get('Origin')?.trim().replace(/\/+$/, '');
  if (!reqOrigin) return true;
  return getAllowedOrigins().includes(reqOrigin);
}

function buildCorsHeaders(req?: Request): Record<string, string> {
  const reqOrigin = req?.headers.get('Origin')?.trim().replace(/\/+$/, '');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (reqOrigin && getAllowedOrigins().includes(reqOrigin)) {
    headers['Access-Control-Allow-Origin'] = reqOrigin;
  }
  return headers;
}

export function rejectDisallowedOrigin(req?: Request): Response | null {
  if (!req || isOriginAllowed(req)) return null;
  return new Response(JSON.stringify({ error: 'Origin not allowed.' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json', 'Vary': 'Origin' },
  });
}

export function jsonResponse(body: Record<string, unknown>, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function optionsResponse(req?: Request) {
  const blocked = rejectDisallowedOrigin(req);
  if (blocked) return blocked;
  return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
}

export async function requireActiveStaff(req: Request): Promise<{
  admin: SupabaseClient;
  actor: User;
  actorProfile: { id: string; role: string; status: string };
} | Response> {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');
  if (!url || !anonKey || !serviceRoleKey) return jsonResponse({ error: 'Server configuration is incomplete.' }, 500, req);
  if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'Authentication is required.' }, 401, req);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return jsonResponse({ error: 'Authentication is invalid or expired.' }, 401, req);

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin
    .from('staff_profiles')
    .select('id,role,status')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return jsonResponse({ error: 'Could not verify staff permissions.' }, 500, req);
  if (!profile || profile.status !== 'active') {
    return jsonResponse({ error: 'An active staff profile is required.' }, 403, req);
  }
  return { admin, actor: user, actorProfile: profile };
}

export async function requireActiveSuperAdmin(req: Request): Promise<{
  admin: SupabaseClient;
  actor: User;
} | Response> {
  const staff = await requireActiveStaff(req);
  if (isResponse(staff)) return staff;
  if (staff.actorProfile.role !== 'super_admin') {
    return jsonResponse({ error: 'Only an active super admin can perform this action.' }, 403, req);
  }
  return { admin: staff.admin, actor: staff.actor };
}

export function isResponse(value: { admin: SupabaseClient; actor: User } | { admin: SupabaseClient; actor: User; actorProfile: { id: string; role: string; status: string } } | Response): value is Response {
  return value instanceof Response;
}
