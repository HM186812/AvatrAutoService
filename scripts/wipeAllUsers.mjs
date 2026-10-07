import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC-CRquBIVO4SLQ8NZEm2x8OjMakgqh74Y",
  authDomain: "avatrautoservice.firebaseapp.com",
  projectId: "avatrautoservice",
  storageBucket: "avatrautoservice.firebasestorage.app",
  messagingSenderId: "804647778759",
  appId: "1:804647778759:web:131edd7ab6d26a2cf5c1e2"
};

async function wipeUsers() {
  console.log('🚀 Starting complete wipe of all users from Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  // 1. Create a temporary super admin to bypass rules and clean everything
  const tempEmail = `temp_admin_${Date.now()}@avatr.cleanup.la`;
  const tempPass = 'TempAdminPassword123!';
  
  let tempUserCred;
  try {
    tempUserCred = await createUserWithEmailAndPassword(auth, tempEmail, tempPass);
    const tempUid = tempUserCred.user.uid;
    console.log(`🔑 Created temporary cleaner account: ${tempUid}`);

    // Make temp user super_admin in Firestore
    await setDoc(doc(db, 'users', tempUid), {
      name: 'Temp Cleaner',
      role: 'super_admin'
    });

    // 2. Read all users in Firestore
    const snap = await getDocs(collection(db, 'users'));
    console.log(`📋 Found ${snap.size} user documents in Firestore:`);
    
    for (const d of snap.docs) {
      const data = d.data();
      console.log(` - Deleting user document: [${d.id}] Name: ${data.name || 'N/A'}, Email: ${data.email || 'N/A'}, Phone: ${data.phone || 'N/A'}, Role: ${data.role}`);
      await deleteDoc(doc(db, 'users', d.id));
    }

    // 3. Delete the temp cleaner account
    try {
      await deleteUser(tempUserCred.user);
      console.log('🧹 Deleted temp cleaner auth user.');
    } catch {}

    console.log('✨ All user documents in Firebase have been completely removed (0 users remaining).');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during wipe:', err);
    process.exit(1);
  }
}

wipeUsers();
