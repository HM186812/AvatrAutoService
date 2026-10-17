import { isResponse, jsonResponse, optionsResponse, requireActiveStaff } from '../_shared/staff-auth.ts';

const allowedRoles = new Set(['super_admin', 'admin', 'sales', 'technician', 'general_user']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const access = await requireActiveStaff(req);
  if (isResponse(access)) return access;

  try {
    const body = await req.json();
    const action = body.action;
    const userId = typeof body.userId === 'string' ? body.userId : '';
    if (!uuidPattern.test(userId)) return jsonResponse({ error: 'A valid staff user ID is required.' }, 400);
    if (action !== 'update' && action !== 'suspend' && action !== 'delete') return jsonResponse({ error: 'Unsupported staff action.' }, 400);

    const isAdmin = access.actorProfile.role === 'super_admin' || access.actorProfile.role === 'admin';
    const isSelf = userId === access.actor.id;

    if (action === 'delete') {
      if (!isAdmin) {
        return jsonResponse({ error: 'Only an active admin can delete staff accounts.' }, 403);
      }
      if (isSelf) {
        return jsonResponse({ error: 'You cannot delete your own account.' }, 400);
      }
    } else if (action === 'suspend') {
      if (!isAdmin) {
        return jsonResponse({ error: 'Only an active admin can suspend staff accounts.' }, 403);
      }
      if (isSelf) {
        return jsonResponse({ error: 'You cannot suspend your own account.' }, 400);
      }
    } else if (action === 'update' && !isAdmin && !isSelf) {
      return jsonResponse({ error: 'Only an active admin can update other staff accounts.' }, 403);
    }

    const { data: target, error: targetError } = await access.admin
      .from('staff_profiles')
      .select('id,role,status')
      .eq('id', userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return jsonResponse({ error: 'Staff profile was not found.' }, 404);

    const isTargetAdmin = target.role === 'super_admin' || target.role === 'admin';

    if (action === 'delete') {
      if (isTargetAdmin && target.status === 'active') {
        const { count, error: countError } = await access.admin
          .from('staff_profiles')
          .select('id', { count: 'exact', head: true })
          .in('role', ['super_admin', 'admin'])
          .eq('status', 'active');
        if (countError) throw countError;
        if ((count || 0) <= 1) return jsonResponse({ error: 'The last active admin cannot be deleted.' }, 409);
      }

      // Delete from auth.admin first; Postgres ON DELETE CASCADE will clean up staff_profiles
      const { error: authError } = await access.admin.auth.admin.deleteUser(userId);
      if (authError) {
        return jsonResponse({ error: `Auth deletion failed: ${authError.message}` }, 500);
      }

      const { error: profileError } = await access.admin
        .from('staff_profiles')
        .delete()
        .eq('id', userId);
      if (profileError) throw profileError;

      return jsonResponse({ success: true });
    }

    if (action === 'suspend') {
      if (isTargetAdmin && target.status === 'active') {
        const { count, error: countError } = await access.admin
          .from('staff_profiles')
          .select('id', { count: 'exact', head: true })
          .in('role', ['super_admin', 'admin'])
          .eq('status', 'active');
        if (countError) throw countError;
        if ((count || 0) <= 1) return jsonResponse({ error: 'The last active admin cannot be suspended.' }, 409);
      }

      const { error } = await access.admin
        .from('staff_profiles')
        .update({ status: 'suspended', updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      const { error: banError } = await access.admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
      if (banError) throw banError;
      return jsonResponse({ success: true });
    }

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : '';
    const department = typeof body.department === 'string' ? body.department.trim().slice(0, 100) : '';
    const requestedRole = typeof body.role === 'string' ? body.role : '';

    // Non-admins cannot change roles - their role is strictly pinned to target.role
    const role = isAdmin ? (requestedRole || target.role) : target.role;

    if (!name || !allowedRoles.has(role)) return jsonResponse({ error: 'Name and a valid staff role are required.' }, 400);
    const isNewRoleAdmin = role === 'super_admin' || role === 'admin';
    if (isTargetAdmin && target.status === 'active' && !isNewRoleAdmin) {
      const { count, error: countError } = await access.admin
        .from('staff_profiles')
        .select('id', { count: 'exact', head: true })
        .in('role', ['super_admin', 'admin'])
        .eq('status', 'active');
      if (countError) throw countError;
      if ((count || 0) <= 1) return jsonResponse({ error: 'The last active admin cannot be demoted.' }, 409);
    }

    const { data: roleRow, error: roleError } = await access.admin
      .from('staff_roles')
      .select('role_code,permissions')
      .eq('role_code', role)
      .eq('is_active', true)
      .maybeSingle();
    if (roleError) throw roleError;
    if (!roleRow) return jsonResponse({ error: 'The selected staff role is not active.' }, 400);

    const { data: profile, error } = await access.admin
      .from('staff_profiles')
      .update({ name, phone: phone || null, department: department || null, role, role_title: role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id,email,name,phone,role,department,role_title,status,created_at,last_login')
      .single();
    if (error) throw error;
    return jsonResponse({ profile, permissions: roleRow.permissions });
  } catch (error) {
    console.error('manage-staff failed', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Could not update the staff account.' }, 400);
  }
});
