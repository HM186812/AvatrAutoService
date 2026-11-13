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
