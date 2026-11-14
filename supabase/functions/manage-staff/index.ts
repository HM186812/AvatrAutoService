import {
  isResponse,
  jsonResponse,
  optionsResponse,
  rejectDisallowedOrigin,
  requireActiveStaff,
} from '../_shared/staff-auth.ts';

const allowedRoles = new Set(['super_admin', 'admin', 'sales']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const blockedOrigin = rejectDisallowedOrigin(req);
  if (blockedOrigin) return blockedOrigin;
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, req);

  const access = await requireActiveStaff(req);
  if (isResponse(access)) return access;

  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return jsonResponse({ error: 'Invalid JSON object payload.' }, 400, req);
    }
    const body = rawBody as Record<string, unknown>;
    const action = body.action;
    const userId = typeof body.userId === 'string' ? body.userId : '';
    if (!uuidPattern.test(userId)) return jsonResponse({ error: 'A valid staff user ID is required.' }, 400, req);
    if (action !== 'update' && action !== 'suspend' && action !== 'reactivate' && action !== 'delete') {
      return jsonResponse({ error: 'Unsupported staff action.' }, 400, req);
    }

    const isAdmin = access.actorProfile.role === 'super_admin' || access.actorProfile.role === 'admin';
    const isSelf = userId === access.actor.id;

    if (action === 'delete') {
      if (!isAdmin) {
        return jsonResponse({ error: 'Only an active admin can archive staff accounts.' }, 403, req);
      }
      if (isSelf) {
        return jsonResponse({ error: 'You cannot archive your own account.' }, 400, req);
      }
    } else if (action === 'suspend' || action === 'reactivate') {
      if (!isAdmin) {
        return jsonResponse({ error: 'Only an active admin can change staff account status.' }, 403, req);
      }
      if (action === 'suspend' && isSelf) {
        return jsonResponse({ error: 'You cannot suspend your own account.' }, 400, req);
      }
    } else if (action === 'update' && !isAdmin && !isSelf) {
      return jsonResponse({ error: 'Only an active admin can update other staff accounts.' }, 403, req);
    }

    const { data: target, error: targetError } = await access.admin
      .from('staff_profiles')
      .select('id,role,status')
      .eq('id', userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return jsonResponse({ error: 'Staff profile was not found.' }, 404, req);

    const isTargetAdmin = target.role === 'super_admin' || target.role === 'admin';
    if (target.role === 'super_admin' && access.actorProfile.role !== 'super_admin') {
      return jsonResponse({ error: 'Only a super_admin can modify or archive a super_admin account.' }, 403, req);
    }

    if (action === 'delete') {
      if (target.status === 'active') {
        return jsonResponse({ error: 'Deactivate this staff account before archiving it from the web.' }, 400, req);
      }
      if (target.status === 'archived') {
        return jsonResponse({ success: true, archived: true }, 200, req);
      }
      if (isTargetAdmin) {
        const { count, error: countError } = await access.admin
          .from('staff_profiles')
          .select('id', { count: 'exact', head: true })
          .in('role', ['super_admin', 'admin'])
          .eq('status', 'active');
        if (countError) throw countError;
        if ((count || 0) <= 0) return jsonResponse({ error: 'The last active admin cannot be archived.' }, 409, req);
      }

      // Soft-delete (archive): keep auth.users + staff_profiles rows intact for 10-year audit trails,
      // permanently ban auth login, and revoke active sessions.
      const { error: banError } = await access.admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
      if (banError) throw banError;

      const { error: revokeError } = await access.admin.rpc('revoke_staff_sessions', { p_user_id: userId });
      if (revokeError) {
        console.warn('revoke_staff_sessions notice:', revokeError.message);
      }

      const nowIso = new Date().toISOString();
      const { error: archiveError } = await access.admin
        .from('staff_profiles')
        .update({ status: 'archived', archived_at: nowIso, updated_at: nowIso })
        .eq('id', userId);
      if (archiveError) throw archiveError;

      return jsonResponse({ success: true, archived: true }, 200, req);
    }

    if (action === 'suspend') {
      if (target.status === 'archived') {
        return jsonResponse({ error: 'Archived staff accounts cannot be suspended.' }, 400, req);
      }
      if (isTargetAdmin && target.status === 'active') {
        const { count, error: countError } = await access.admin
          .from('staff_profiles')
          .select('id', { count: 'exact', head: true })
          .in('role', ['super_admin', 'admin'])
          .eq('status', 'active');
        if (countError) throw countError;
        if ((count || 0) <= 1) return jsonResponse({ error: 'The last active admin cannot be suspended.' }, 409, req);
      }

      // Ban auth account, revoke active sessions, then mark profile suspended (rolling back ban on DB failure)
      const { error: banError } = await access.admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
      if (banError) throw banError;

      const { error } = await access.admin
        .from('staff_profiles')
        .update({ status: 'suspended', updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) {
        await access.admin.auth.admin.updateUserById(userId, { ban_duration: 'none' }).catch(() => {});
        throw error;
      }

      const { error: revokeError } = await access.admin.rpc('revoke_staff_sessions', { p_user_id: userId });
      if (revokeError) {
        console.warn('revoke_staff_sessions notice:', revokeError.message);
      }

      return jsonResponse({ success: true }, 200, req);
    }

    if (action === 'reactivate') {
      if (target.status === 'archived') {
        return jsonResponse({ error: 'Archived staff accounts cannot be reactivated from the web.' }, 400, req);
      }
      const { error: unbanError } = await access.admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
      if (unbanError) throw unbanError;
      const { error } = await access.admin
        .from('staff_profiles')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) {
        await access.admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' }).catch(() => {});
        throw error;
      }
      return jsonResponse({ success: true }, 200, req);
    }

    if (target.status === 'archived') {
      return jsonResponse({ error: 'Archived staff accounts cannot be edited.' }, 400, req);
    }

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : '';
    const department = typeof body.department === 'string' ? body.department.trim().slice(0, 100) : '';
    const requestedRole = typeof body.role === 'string' ? body.role : '';

    // Non-admins cannot change roles - their role is strictly pinned to target.role
    const role = isAdmin ? (requestedRole || target.role) : target.role;

    if (!name || !allowedRoles.has(role)) return jsonResponse({ error: 'Name and a valid staff role are required.' }, 400, req);
    if (role === 'super_admin' && access.actorProfile.role !== 'super_admin') {
      return jsonResponse({ error: 'Only a super_admin can grant the super_admin role.' }, 403, req);
    }
    const isNewRoleAdmin = role === 'super_admin' || role === 'admin';
    if (isTargetAdmin && target.status === 'active' && !isNewRoleAdmin) {
      const { count, error: countError } = await access.admin
        .from('staff_profiles')
        .select('id', { count: 'exact', head: true })
        .in('role', ['super_admin', 'admin'])
        .eq('status', 'active');
      if (countError) throw countError;
      if ((count || 0) <= 1) return jsonResponse({ error: 'The last active admin cannot be demoted.' }, 409, req);
    }

    const { data: roleRow, error: roleError } = await access.admin
      .from('staff_roles')
      .select('role_code,permissions')
      .eq('role_code', role)
      .eq('is_active', true)
      .maybeSingle();
    if (roleError) throw roleError;
    if (!roleRow) return jsonResponse({ error: 'The selected staff role is not active.' }, 400, req);

    const { data: profile, error } = await access.admin
      .from('staff_profiles')
      .update({ name, phone: phone || null, department: department || null, role, role_title: role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id,email,name,phone,role,department,role_title,status,created_at,last_login')
      .single();
    if (error) throw error;
    return jsonResponse({ profile, permissions: roleRow.permissions }, 200, req);
  } catch (error) {
    console.error('manage-staff failed', error);
    return jsonResponse({ error: 'Could not update the staff account.' }, 500, req);
  }
});
