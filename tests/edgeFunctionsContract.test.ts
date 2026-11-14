import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

test('create-staff and manage-staff only permit super_admin, admin, and sales roles', () => {
  for (const fn of ['create-staff', 'manage-staff']) {
    const file = path.join(ROOT, 'supabase/functions', fn, 'index.ts');
    const src = fs.readFileSync(file, 'utf8');
    const match = src.match(/allowedRoles\s*=\s*new\s+Set\s*\(\s*\[([^\]]+)\]/);
    assert.ok(match, `Missing allowedRoles set in ${fn}`);
    assert.ok(match[1].includes("'admin'") && match[1].includes("'sales'") && match[1].includes("'super_admin'"), `${fn} missing active role`);
    assert.ok(!match[1].includes('technician'), `${fn} must not permit retired technician role`);
    assert.ok(!match[1].includes('general_user'), `${fn} must not permit retired general_user role`);
  }
});

test('staff-auth rejects unlisted browser Origins with 403 and never reflects fallback origin', () => {
  const authHelper = fs.readFileSync(path.join(ROOT, 'supabase/functions/_shared/staff-auth.ts'), 'utf8');
  assert.match(authHelper, /rejectDisallowedOrigin|isOriginAllowed/);
  assert.match(authHelper, /403/);
  assert.doesNotMatch(authHelper, /return allowlist\[0\]/);

  for (const fn of ['create-staff', 'manage-staff']) {
    const src = fs.readFileSync(path.join(ROOT, 'supabase/functions', fn, 'index.ts'), 'utf8');
    assert.match(src, /rejectDisallowedOrigin\(req\)/, `${fn} must enforce origin rejection before auth`);
  }

  const configToml = fs.readFileSync(path.join(ROOT, 'supabase/config.toml'), 'utf8');
  assert.match(configToml, /\[functions\.create-staff\][\s\S]*?verify_jwt\s*=\s*true/);
  assert.match(configToml, /\[functions\.manage-staff\][\s\S]*?verify_jwt\s*=\s*true/);
});

test('manage-staff revokes sessions on suspend and soft-archives instead of hard-deleting', () => {
  const src = fs.readFileSync(path.join(ROOT, 'supabase/functions/manage-staff/index.ts'), 'utf8');
  assert.doesNotMatch(src, /auth\.admin\.deleteUser/, 'manage-staff must never hard-delete auth.users');
  assert.doesNotMatch(src, /\.from\(['"]staff_profiles['"]\)\s*\.\s*delete\(/, 'manage-staff must never hard-delete staff_profiles rows');
  assert.match(src, /revoke_staff_sessions/);
  assert.match(src, /status:\s*['"]archived['"]/);
  assert.match(src, /target\.status\s*===\s*['"]active['"]/);
});

