import { isResponse, jsonResponse, optionsResponse, requireActiveSuperAdmin } from '../_shared/staff-auth.ts';

const allowedRoles = new Set(['super_admin', 'admin', 'sales', 'technician', 'general_user']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const access = await requireActiveSuperAdmin(req);
  if (isResponse(access)) return access;

  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : '';
    const department = typeof body.department === 'string' ? body.department.trim().slice(0, 100) : '';
    const role = typeof body.role === 'string' ? body.role : '';
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !allowedRoles.has(role)) {
      return jsonResponse({ error: 'Name, valid email, and an allowed staff role are required.' }, 400);
    }

    const { data: roleRow, error: roleError } = await access.admin
      .from('staff_roles')
      .select('role_code,permissions')
      .eq('role_code', role)
      .eq('is_active', true)
      .maybeSingle();
    if (roleError) throw roleError;
    if (!roleRow) return jsonResponse({ error: 'The selected staff role is not active.' }, 400);

    const { data: invited, error: inviteError } = await access.admin.auth.admin.inviteUserByEmail(email, {
      data: { name, phone, department, role },
    });
    if (inviteError) throw inviteError;
    if (!invited.user) throw new Error('Supabase did not return the invited account.');

    const { data: profile, error: profileError } = await access.admin
      .from('staff_profiles')
      .select('id,email,name,phone,role,department,role_title,status,created_at,last_login')
      .eq('id', invited.user.id)
      .single();
    if (profileError) throw profileError;

    return jsonResponse({ profile, permissions: roleRow.permissions });
  } catch (error) {
    console.error('create-staff failed', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Could not create the staff account.' }, 400);
  }
});
