/**
 * scripts/clean-vehicle-models.cjs
 *
 * Cleans junk test vehicle models and deduplicates models in Supabase.
 * 1. Remaps all referencing foreign keys in `vehicles` to canonical model IDs.
 * 2. Remaps any referencing foreign keys in `customers` to canonical model IDs.
 * 3. Removes duplicate (`avatr-avatr-*`) and junk models from `vehicle_models`.
 * 4. Ensures only 4 canonical models remain:
 *    - avatr-12
 *    - avatr-11
 *    - avatr-07
 *    - avatr-07-ultra-performance-7713
 * 5. Verifies all 28 vehicles are intact with valid model references.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables (.env.test prioritized for credentials, fallback to .env.local)
const envTestPath = path.resolve(process.cwd(), '.env.test');
const envLocalPath = path.resolve(process.cwd(), '.env.local');

if (fs.existsSync(envTestPath)) {
  const parsed = dotenv.parse(fs.readFileSync(envTestPath));
  for (const [k, v] of Object.entries(parsed)) {
    if (!process.env[k]) process.env[k] = v;
  }
}
if (fs.existsSync(envLocalPath)) {
  const parsed = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const [k, v] of Object.entries(parsed)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const adminEmail = process.env.E2E_ADMIN_EMAIL || 'test01@gmail.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || '123456';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key in environment variables.');
  process.exit(1);
}

const CANONICAL_MODEL_IDS = [
  'avatr-12',
  'avatr-11',
  'avatr-07',
  'avatr-07-ultra-performance-7713'
];

const JUNK_MODEL_IDS = [
  'avatr-27842432184793-7314',
  'avatr-oefwojfiwejfiwefjh-8242',
  'avatr-ding-dong-3186',
  'avatr-abadabowl-9759'
];

const DUPLICATE_MODEL_IDS = [
  'avatr-avatr-12',
  'avatr-avatr-11',
  'avatr-avatr-07'
];

const MODELS_TO_DELETE = [...DUPLICATE_MODEL_IDS, ...JUNK_MODEL_IDS];

async function main() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Authenticating as admin (${adminEmail})...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (authError) {
    throw new Error(`Authentication failed: ${authError.message}`);
  }
  console.log('Authentication successful for UID:', authData.user.id);

  // Step 0: Ensure ultra performance model has canonical ID without double prefix
  console.log('\n--- Step 0: Normalizing ultra-performance model ID ---');
  const { data: legacyUpModel } = await supabase
    .from('vehicle_models')
    .select('id')
    .eq('id', 'avatr-avatr-07-ultra-performance-7713')
    .maybeSingle();

  if (legacyUpModel) {
    const { error: upErr } = await supabase
      .from('vehicle_models')
      .update({ id: 'avatr-07-ultra-performance-7713' })
      .eq('id', 'avatr-avatr-07-ultra-performance-7713');
    if (upErr) throw new Error(`Failed to normalize ultra-performance model id: ${upErr.message}`);
    console.log('Normalized avatr-avatr-07-ultra-performance-7713 -> avatr-07-ultra-performance-7713');
  } else {
    console.log('Ultra-performance model already normalized or not present with legacy ID.');
  }

  // Step 1: Update referencing rows in `vehicles` table
  console.log('\n--- Step 1: Remapping vehicles foreign keys ---');

  // 1a: avatr-avatr-12 -> avatr-12
  const { data: v12, error: errV12 } = await supabase
    .from('vehicles')
    .update({ model_id: 'avatr-12' })
    .eq('model_id', 'avatr-avatr-12')
    .select('vin');
  if (errV12) throw new Error(`Failed to remap vehicles avatr-avatr-12: ${errV12.message}`);
  console.log(`Remapped ${v12 ? v12.length : 0} vehicles from avatr-avatr-12 to avatr-12`);

  // 1b: avatr-avatr-11 -> avatr-11
  const { data: v11, error: errV11 } = await supabase
    .from('vehicles')
    .update({ model_id: 'avatr-11' })
    .eq('model_id', 'avatr-avatr-11')
    .select('vin');
  if (errV11) throw new Error(`Failed to remap vehicles avatr-avatr-11: ${errV11.message}`);
  console.log(`Remapped ${v11 ? v11.length : 0} vehicles from avatr-avatr-11 to avatr-11`);

  // 1c: avatr-avatr-07 -> avatr-07
  const { data: v07, error: errV07 } = await supabase
    .from('vehicles')
    .update({ model_id: 'avatr-07' })
    .eq('model_id', 'avatr-avatr-07')
    .select('vin');
  if (errV07) throw new Error(`Failed to remap vehicles avatr-avatr-07: ${errV07.message}`);
  console.log(`Remapped ${v07 ? v07.length : 0} vehicles from avatr-avatr-07 to avatr-07`);

  // 1d: junk models -> avatr-11
  const { data: vJunk, error: errVJunk } = await supabase
    .from('vehicles')
    .update({ model_id: 'avatr-11' })
    .in('model_id', JUNK_MODEL_IDS)
    .select('vin');
  if (errVJunk) throw new Error(`Failed to remap junk vehicles: ${errVJunk.message}`);
  console.log(`Remapped ${vJunk ? vJunk.length : 0} junk vehicles to avatr-11`);

  // Step 2: Update referencing rows in `customers` table
  console.log('\n--- Step 2: Remapping customers interested_model_id ---');
  await supabase
    .from('customers')
    .update({ interested_model_id: 'avatr-12' })
    .eq('interested_model_id', 'avatr-avatr-12');

  await supabase
    .from('customers')
    .update({ interested_model_id: 'avatr-11' })
    .eq('interested_model_id', 'avatr-avatr-11');

  await supabase
    .from('customers')
    .update({ interested_model_id: 'avatr-07' })
    .eq('interested_model_id', 'avatr-avatr-07');

  await supabase
    .from('customers')
    .update({ interested_model_id: 'avatr-11' })
    .in('interested_model_id', JUNK_MODEL_IDS);

  console.log('Remapped customers interested_model_id references to canonical model IDs.');

  // Step 3: Delete duplicate and junk rows from `vehicle_models`
  console.log('\n--- Step 3: Deleting duplicate and junk models from vehicle_models ---');
  console.log('Target models to delete:', MODELS_TO_DELETE);

  const { data: deletedModels, error: delErr } = await supabase
    .from('vehicle_models')
    .delete()
    .in('id', MODELS_TO_DELETE)
    .select('id, name');

  if (delErr) {
    throw new Error(`Failed to delete models from vehicle_models: ${delErr.message}`);
  }
  console.log(`Successfully deleted ${deletedModels ? deletedModels.length : 0} model records:`, deletedModels);

  // Step 4: Verification
  console.log('\n--- Step 4: Verification ---');

  // Verify vehicles count and valid foreign keys
  const { data: vehicles, error: vErr } = await supabase
    .from('vehicles')
    .select('vin, model_id');
  if (vErr) throw new Error(`Failed to query vehicles: ${vErr.message}`);

  console.log(`Total vehicles in database: ${vehicles.length}`);
  if (vehicles.length !== 28) {
    throw new Error(`Expected 28 vehicles, but found ${vehicles.length}`);
  }

  const invalidVehicles = vehicles.filter(v => !CANONICAL_MODEL_IDS.includes(v.model_id));
  if (invalidVehicles.length > 0) {
    throw new Error(`Found vehicles with non-canonical model_id: ${JSON.stringify(invalidVehicles)}`);
  }
  console.log('PASS: All 28 vehicles have valid canonical model IDs.');

  const vehicleModelCounts = {};
  vehicles.forEach(v => {
    vehicleModelCounts[v.model_id] = (vehicleModelCounts[v.model_id] || 0) + 1;
  });
  console.log('Vehicles distribution by model:', vehicleModelCounts);

  // Verify vehicle_models has only the 4 canonical models
  const { data: remainingModels, error: mErr } = await supabase
    .from('vehicle_models')
    .select('id, name');
  if (mErr) throw new Error(`Failed to query vehicle_models: ${mErr.message}`);

  console.log(`Remaining vehicle models count: ${remainingModels.length}`);
  console.log('Remaining models:', remainingModels);

  if (remainingModels.length !== 4) {
    throw new Error(`Expected exactly 4 models, but found ${remainingModels.length}`);
  }

  const remainingIds = remainingModels.map(m => m.id).sort();
  const expectedIds = [...CANONICAL_MODEL_IDS].sort();
  const match = JSON.stringify(remainingIds) === JSON.stringify(expectedIds);

  if (!match) {
    throw new Error(`Remaining model IDs ${JSON.stringify(remainingIds)} do not match expected ${JSON.stringify(expectedIds)}`);
  }
  console.log('PASS: Exactly 4 canonical models remain with zero duplicates or junk models.');

  // Verify customers
  const { data: customersWithJunk } = await supabase
    .from('customers')
    .select('id, interested_model_id')
    .in('interested_model_id', MODELS_TO_DELETE);

  if (customersWithJunk && customersWithJunk.length > 0) {
    throw new Error(`Found customers referencing deleted models: ${JSON.stringify(customersWithJunk)}`);
  }
  console.log('PASS: No customers reference deleted or duplicate models.');

  console.log('\n--- SUCCESS: Database cleanup and deduplication complete! ---');
}

main().catch(err => {
  console.error('\nERROR:', err);
  process.exit(1);
});
