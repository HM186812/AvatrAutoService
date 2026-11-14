import test from 'node:test';
import assert from 'node:assert/strict';
import type { SystemUser } from '../src/types';

function installMemoryStorage() {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
  return mockStorage;
}

test('offlineDeleteUser soft-archives user (preserves offline record for bill lookups) and blocks login', async () => {
  process.env.VITE_FORCE_OFFLINE = 'true';
  process.env.VITE_ENABLE_OFFLINE_DEMO = 'true';
  installMemoryStorage();

  const {
    offlineDeleteUser,
    offlineSaveUser,
    offlineSignIn,
    getOfflineBackendData,
  } = await import('../src/backend/offlineStore');

  const sample: SystemUser = {
    id: 'staff-archive-test-1',
    name: 'Test Rep',
    email: 'test-rep@avatr.test',
    phone: '02099999999',
    role: 'sales',
    roleTitleLo: 'Sales',
    department: 'Sales',
    avatarInitials: 'TR',
    status: 'active',
    createdAt: '2026-11-14T00:00:00Z',
  };

  offlineSaveUser(sample);
  offlineDeleteUser(sample.id);

  const data = getOfflineBackendData();
  const saved = data.users.find((u) => u.id === sample.id);
  assert.ok(saved, 'Archived staff record must remain in store for historical bill name resolution');
  assert.equal(saved.status, 'archived');
  assert.throws(() => offlineSignIn(sample.email), /suspended|archived/i);
});

test('mapStaffProfile preserves active, suspended, and archived statuses accurately', async () => {
  const { mapStaffProfile } = await import('../src/backend/data');
  assert.equal(mapStaffProfile({ id: '1', role: 'sales', status: 'active' }).status, 'active');
  assert.equal(mapStaffProfile({ id: '2', role: 'sales', status: 'suspended' }).status, 'suspended');
  assert.equal(mapStaffProfile({ id: '3', role: 'sales', status: 'archived' }).status, 'archived');
  assert.equal(mapStaffProfile({ id: '4', role: 'technician', status: 'active' }).status, 'suspended');
});
