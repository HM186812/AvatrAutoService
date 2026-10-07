import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC-CRquBIVO4SLQ8NZEm2x8OjMakgqh74Y",
  authDomain: "avatrautoservice.firebaseapp.com",
  projectId: "avatrautoservice",
  storageBucket: "avatrautoservice.firebasestorage.app",
  messagingSenderId: "804647778759",
  appId: "1:804647778759:web:131edd7ab6d26a2cf5c1e2"
};

async function setSuperAdmin() {
  const target = process.argv[2];
  
  if (!target) {
    console.log('ℹ️ Usage: node scripts/setSuperAdmin.mjs <email_or_phone_or_uid>');
    console.log('Example: node scripts/setSuperAdmin.mjs admin@avatr.la');
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log(`🔍 Searching for user matching: "${target}" in Firestore...`);
  const snap = await getDocs(collection(db, 'users'));
  
  let matchedDoc = null;
  snap.forEach(d => {
    const data = d.data();
    if (
      d.id === target ||
      (data.email && data.email.toLowerCase() === target.toLowerCase()) ||
      (data.phone && data.phone.replace(/\s+/g, '') === target.replace(/\s+/g, '')) ||
      (data.name && data.name.toLowerCase().includes(target.toLowerCase()))
    ) {
      matchedDoc = { id: d.id, ...data };
    }
  });

  if (!matchedDoc) {
    console.log(`❌ No user found matching "${target}". Listing existing users in Firestore:`);
    snap.forEach(d => {
      const data = d.data();
      console.log(` - UID: ${d.id} | Name: ${data.name} | Email: ${data.email} | Phone: ${data.phone} | Role: ${data.role}`);
    });
    process.exit(1);
  }

  console.log(`🎯 Found user: ${matchedDoc.name} (${matchedDoc.id})`);
  console.log(`⚡ Upgrading role to Super Admin...`);

  await setDoc(doc(db, 'users', matchedDoc.id), {
    ...matchedDoc,
    role: 'super_admin',
    roleTitleLo: 'Admin ໃຫຍ່ (Super Admin & ຜູ້ອຳນວຍການສູນ)',
    department: 'Executive Management & Direction',
    permissions: {
      canManageUsers: true,
      canDeleteUsers: true,
      canGrantRoles: true,
      canEditInventory: true,
      canUploadQR: true,
      canAddModels: true,
      canDeductPOS: true,
      canViewFinancials: true,
    }
  }, { merge: true });

  console.log(`🌟 [SUCCESS] User "${matchedDoc.name}" has been upgraded to Super Admin with FULL privileges!`);
  process.exit(0);
}

setSuperAdmin();
