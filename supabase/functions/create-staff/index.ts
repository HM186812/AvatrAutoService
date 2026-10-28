import { isResponse, jsonResponse, optionsResponse, requireActiveStaff } from '../_shared/staff-auth.ts';

const allowedRoles = new Set(['super_admin', 'admin', 'sales', 'technician', 'general_user']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const access = await requireActiveStaff(req);
  if (isResponse(access)) return access;
  if (access.actorProfile.role !== 'super_admin' && access.actorProfile.role !== 'admin') {
    return jsonResponse({ error: 'Only an active admin can create staff accounts.' }, 403);
  }

  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : '';
    const department = typeof body.department === 'string' ? body.department.trim().slice(0, 100) : '';
    const role = typeof body.role === 'string' ? body.role : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !allowedRoles.has(role)) {
      return jsonResponse({ error: 'Name, valid email, and an allowed staff role are required.' }, 400);
    }
    if (role === 'super_admin' && access.actorProfile.role !== 'super_admin') {
      return jsonResponse({ error: 'Only a super_admin can create another super_admin account.' }, 403);
    }
    if (password && password.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
    }

    const { data: roleRow, error: roleError } = await access.admin
      .from('staff_roles')
      .select('role_code,permissions')
      .eq('role_code', role)
      .eq('is_active', true)
      .maybeSingle();
    if (roleError) throw roleError;
    if (!roleRow) return jsonResponse({ error: 'The selected staff role is not active.' }, 400);

    let authUserId = '';
    if (password) {
      const { data: created, error: createError } = await access.admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, phone, department, role },
      });
      if (createError) throw createError;
      if (!created.user) throw new Error('Supabase did not return the created account.');
      authUserId = created.user.id;
    } else {
      const { data: invited, error: inviteError } = await access.admin.auth.admin.inviteUserByEmail(email, {
        data: { name, phone, department, role },
        redirectTo: 'https://avatrautoservice.pheuangkeokisith.workers.dev/',
      });
      if (inviteError) throw inviteError;
      if (!invited.user) throw new Error('Supabase did not return the invited account.');
      authUserId = invited.user.id;
    }

    const { data: profile, error: profileError } = await access.admin
      .from('staff_profiles')
      .upsert(
        {
          id: authUserId,
          email,
          name,
          phone: phone || null,
          role,
          department: department || null,
          role_title: role,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('id,email,name,phone,role,department,role_title,status,created_at,last_login')
      .single();
    if (profileError) {
      await access.admin.auth.admin.deleteUser(authUserId);
      throw profileError;
    }

    return jsonResponse({ profile, permissions: roleRow.permissions });
  } catch (error) {
    console.error('create-staff failed', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Could not create the staff account.' }, 400);
  }
});
