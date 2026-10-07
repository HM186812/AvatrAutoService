import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC-CRquBIVO4SLQ8NZEm2x8OjMakgqh74Y",
  authDomain: "avatrautoservice.firebaseapp.com",
  projectId: "avatrautoservice",
  storageBucket: "avatrautoservice.firebasestorage.app",
  messagingSenderId: "804647778759",
  appId: "1:804647778759:web:131edd7ab6d26a2cf5c1e2"
};

async function testAuthAndFirestore() {
  console.log('🚀 [Diagnostic] Testing Authenticated Firebase Connection for avatrautoservice...');
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  const testEmail = `diag_test_${Date.now()}@avatr-test.la`;
  const testPassword = 'Password1234!';
  let testUser = null;

  try {
    // 1. Create temporary authenticated test user
    console.log(`🔐 1. Creating authenticated test user: ${testEmail}...`);
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    testUser = userCredential.user;
    console.log(`✅ User created & authenticated with UID: ${testUser.uid}`);

    // 2. Test user profile write to /users/{uid}
    console.log(`📝 2. Testing authenticated write to /users/${testUser.uid}...`);
    const userDocRef = doc(db, 'users', testUser.uid);
    await setDoc(userDocRef, {
      name: 'Diagnostic Tester',
      email: testEmail,
      role: 'general_user',
      createdAt: new Date().toISOString()
    });
    console.log(`✅ Authenticated User profile write succeeded!`);

    // 3. Test authenticated read from /users/{uid}
    console.log(`📖 3. Testing authenticated read from /users/${testUser.uid}...`);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      console.log(`✅ Read verified successfully:`, userDocSnap.data());
    }

    // 4. Test reading collections as authenticated user
    console.log(`🔍 4. Testing reading inventory, bills, vehicle_models as authenticated user...`);
    const invSnap = await getDocs(collection(db, 'inventory'));
    console.log(`✅ [inventory] collection read: ${invSnap.size} documents.`);

    const billsSnap = await getDocs(collection(db, 'bills'));
    console.log(`✅ [bills] collection read: ${billsSnap.size} documents.`);

    const modelsSnap = await getDocs(collection(db, 'vehicle_models'));
    console.log(`✅ [vehicle_models] collection read: ${modelsSnap.size} documents.`);

    // 5. Cleanup test data
    console.log(`🧹 5. Cleaning up test doc & auth user...`);
    await deleteDoc(userDocRef);
    await deleteUser(testUser);
    console.log(`✅ Cleanup completed.`);

    console.log('\n🌟 [SUCCESS] Cloud Firebase Authentication & Firestore read/write operations verified 100% OPERATIONAL!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Diagnostic test failed:', err);
    if (testUser) {
      try { await deleteUser(testUser); } catch {}
    }
    process.exit(1);
  }
}

testAuthAndFirestore();
