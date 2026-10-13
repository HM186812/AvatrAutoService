import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function optionsResponse() {
  return new Response('ok', { headers: corsHeaders });
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
  if (!url || !anonKey || !serviceRoleKey) return jsonResponse({ error: 'Server configuration is incomplete.' }, 500);
  if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'Authentication is required.' }, 401);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return jsonResponse({ error: 'Authentication is invalid or expired.' }, 401);

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin
    .from('staff_profiles')
    .select('id,role,status')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return jsonResponse({ error: 'Could not verify staff permissions.' }, 500);
  if (!profile || profile.status !== 'active') {
    return jsonResponse({ error: 'An active staff profile is required.' }, 403);
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
    return jsonResponse({ error: 'Only an active super admin can perform this action.' }, 403);
  }
  return { admin: staff.admin, actor: staff.actor };
}

export function isResponse(value: { admin: SupabaseClient; actor: User } | { admin: SupabaseClient; actor: User; actorProfile: { id: string; role: string; status: string } } | Response): value is Response {
  return value instanceof Response;
}
