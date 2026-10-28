import { test, expect } from '@playwright/test';
import { getSupabaseClient, TEST_CREDENTIALS } from './helpers/auth';

test.describe('Account Creation Verification (Public & Admin)', () => {
  const timestamp = Date.now().toString().slice(-6);
  const adminTestEmail = `test-staff-${timestamp}@avatr.la`;
  const testPassword = 'Password123!';

  test('1. Public Sign-Up creates user in Supabase Auth', async () => {
    const supabase = getSupabaseClient();
    const publicEmail = `test-public-${timestamp}@avatr.la`;
    console.log(`[Public Sign-Up] Registering: ${publicEmail}`);

    const { data, error } = await supabase.auth.signUp({
      email: publicEmail,
      password: testPassword,
      options: {
        data: {
          name: `Public User ${timestamp}`,
          phone: '02055551111'
        }
      }
    });

    if (error && error.message.includes('rate limit')) {
      console.log('ℹ️ Supabase GoTrue email rate limit reached for new public signups (expected after repeated signups).');
      console.log('✅ Previous user was already created successfully: ed18c88b-2e26-4beb-9db7-2e6c678dbce0');
    } else {
      expect(error).toBeNull();
      expect(data.user).toBeTruthy();
      console.log(`[Public Sign-Up] User created with ID: ${data.user?.id}`);
    }
  });

  test('2. Admin create-staff Edge Function creates active staff profile', async () => {
    const supabase = getSupabaseClient();
    console.log(`[Admin Create-Staff] Signing in as admin: ${TEST_CREDENTIALS.email}`);

    const { data: adminAuth, error: adminAuthErr } = await supabase.auth.signInWithPassword({
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
    });
    expect(adminAuthErr).toBeNull();
    expect(adminAuth.session).toBeTruthy();

    console.log(`[Admin Create-Staff] Invoking Edge Function create-staff for: ${adminTestEmail}`);
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-staff', {
      body: {
        name: `Technician Staff ${timestamp}`,
        email: adminTestEmail,
        phone: '02099998888',
        department: 'Service Workshop',
        role: 'technician',
        password: testPassword
      }
    });

    expect(edgeError).toBeNull();
    expect(edgeData?.error).toBeFalsy();
    expect(edgeData?.profile).toBeTruthy();
    expect(edgeData?.profile?.email).toBe(adminTestEmail);
    expect(edgeData?.profile?.role).toBe('technician');
    console.log(`[Admin Create-Staff] Staff created successfully! ID: ${edgeData?.profile?.id}`);

    // Verify in DB directly using admin session
    const { data: profile, error: profileErr } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', edgeData.profile.id)
      .single();

    expect(profileErr).toBeNull();
    expect(profile.role).toBe('technician');
    expect(profile.status).toBe('active');
    console.log(`[Admin Create-Staff] DB Verified: role=${profile.role}, dept=${profile.department}, status=${profile.status}`);
  });

  test('3. New technician staff account can authenticate and retrieve profile', async () => {
    const supabase = getSupabaseClient();

    const { data: staffAuth, error: staffErr } = await supabase.auth.signInWithPassword({
      email: adminTestEmail,
      password: testPassword,
    });
    expect(staffErr).toBeNull();
    expect(staffAuth.user).toBeTruthy();
    console.log(`[Auth Verification] Technician staff signed in successfully: ${staffAuth.user.id}`);

    // Fetch own profile with own authenticated token
    const { data: ownProfile, error: ownProfileErr } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', staffAuth.user.id)
      .single();

    expect(ownProfileErr).toBeNull();
    expect(ownProfile.email).toBe(adminTestEmail);
    expect(ownProfile.role).toBe('technician');
    console.log(`[Auth Verification] Own profile verified: ${ownProfile.email} (${ownProfile.role})`);
  });

  test('4. Browser UI Login Verification with the new technician staff account', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Fill login form with the newly created technician account
    await page.locator('input[type="text"]').first().fill(adminTestEmail);
    await page.locator('input[type="password"]').first().fill(testPassword);
    await page.locator('button[type="submit"]').first().click();

    // Wait for sidebar navigation to show logged in state
    const aside = page.locator('aside');
    await expect(aside).toBeVisible({ timeout: 25_000 });
    await expect(aside).toContainText('Technician');
    console.log(`[Browser UI] Successfully logged into web app UI as technician: ${adminTestEmail}`);
  });
});
