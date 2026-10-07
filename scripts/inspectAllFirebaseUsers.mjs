import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC-CRquBIVO4SLQ8NZEm2x8OjMakgqh74Y",
  authDomain: "avatrautoservice.firebaseapp.com",
  projectId: "avatrautoservice",
  storageBucket: "avatrautoservice.firebasestorage.app",
  messagingSenderId: "804647778759",
  appId: "1:804647778759:web:131edd7ab6d26a2cf5c1e2"
};

async function inspectUsers() {
  console.log('🔍 Connecting to Firebase to inspect all user documents...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  // Authenticate with a temporary admin to read all users
  const tempEmail = `temp_reader_${Date.now()}@avatr.reader.la`;
  const tempPass = 'TempReaderPass123!';
  
  try {
    const tempCred = await createUserWithEmailAndPassword(auth, tempEmail, tempPass);
    const tempUid = tempCred.user.uid;
    
    // Grant super_admin to temp user to query everything
    await setDoc(doc(db, 'users', tempUid), {
      name: 'Temp Reader',
      role: 'super_admin'
    });

    const snap = await getDocs(collection(db, 'users'));
    console.log(`\n==============================================`);
    console.log(`📊 Total User Documents in Firestore: ${snap.size}`);
    console.log(`==============================================`);

    snap.forEach((d) => {
      if (d.id !== tempUid) {
        const data = d.data();
        console.log(`\n🔹 Document ID / UID: ${d.id}`);
        console.log(`   - Name: ${data.name || '(No name)'}`);
        console.log(`   - Email: ${data.email || '(No email)'}`);
        console.log(`   - Phone: ${data.phone || '(No phone)'}`);
        console.log(`   - Role: ${data.role || 'general_user'}`);
        console.log(`   - Role Title: ${data.roleTitleLo || ''}`);
        console.log(`   - Department: ${data.department || ''}`);
        console.log(`   - Created At: ${data.createdAt || ''}`);
        console.log(`   - Permissions:`, JSON.stringify(data.permissions || {}));
      }
    });

    // Cleanup temp user
    const tempDocRef = doc(db, 'users', tempUid);
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(tempDocRef);
    await deleteUser(tempCred.user);
    console.log(`\n==============================================\n`);
  } catch (err) {
    console.error('❌ Error reading users:', err.message);
  }
}

inspectUsers();
