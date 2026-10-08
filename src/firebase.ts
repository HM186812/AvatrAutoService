import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  InventoryItem, 
  VehicleModel, 
  InvoiceBillRecord, 
  SystemUser, 
  DealershipConfig,
  CustomCurrencyConfig 
} from './types';
import { 
  INITIAL_INVENTORY, 
  AVATR_VEHICLES, 
  INITIAL_USERS, 
  INITIAL_BILLS 
} from './data/mockData';
import { DEFAULT_COMPANY_BANK_INFO } from './data/companySettings';
import { DEFAULT_CURRENCIES } from './data/currencies';

// 1. Firebase Configuration from Environment Variables (Spark Free Plan 100%)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Check if Firebase keys are properly provided
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.projectId && 
    firebaseConfig.apiKey !== 'your-api-key' &&
    !firebaseConfig.apiKey.includes('MY_')
  );
};

// 2. Initialize Firebase App & Services with Offline Persistence
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (typeof window !== 'undefined') {
  try {
    if (isFirebaseConfigured()) {
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      auth = getAuth(app);
      
      // Initialize Firestore with robust multi-tab Offline Persistence (IndexedDB)
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        });
      } catch (cacheErr) {
        // Fallback to standard getFirestore if persistence is already initialized
        db = getFirestore(app);
      }
      
      storage = getStorage(app);
      console.log('[Firebase Spark] Firebase Client SDK connected successfully with Offline Persistence enabled.');
    } else {
      console.info('[Firebase Spark] Running in Local Storage Mode (Add VITE_FIREBASE_API_KEY in .env.local to activate Cloud Firestore).');
    }
  } catch (err) {
    console.warn('[Firebase] Initialization fallback:', err);
  }
}

export { app, auth, db, storage };

// -------------------------------------------------------------
// 3. REAL-TIME FIRESTORE LISTENERS & SYNCHRONIZATION
// -------------------------------------------------------------

/**
 * 3.1 Collection: `inventory`
 * Real-time listener for car inventory
 */
export const subscribeToInventory = (
  onData: (items: InventoryItem[]) => void,
  onError?: (err: Error) => void
) => {
  if (!db || !isFirebaseConfigured()) return () => {};

  const colRef = collection(db, 'inventory');
  return onSnapshot(colRef, (snapshot) => {
    const items: InventoryItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        vin: docSnap.id,
        model: data.model || '',
        plateNumber: data.plateNumber || '',
        color: data.color || '',
        colorHex: data.colorHex || '#0a0a0b',
        interiorColor: data.interiorColor || '',
        trim: data.trim || '',
        battery: data.battery || '',
        priceUSD: Number(data.priceUSD) || 0,
        priceLAK: Number(data.priceLAK) || 0,
        stockQuantity: Number(data.stockQuantity) ?? 1,
        status: data.status || 'ready',
        pdiStatus: data.pdiStatus || 'passed',
        pdiInspector: data.pdiInspector || '',
        pdiNotes: data.pdiNotes || '',
        location: data.location || 'ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ',
        imageUrl: data.imageUrl || data.image || '',
        image: data.imageUrl || data.image || '',
        reservedForCustomer: data.reservedForCustomer || '',
        arrivalDate: data.arrivalDate || '',
        mileageKm: Number(data.mileageKm) || 0,
        eventStartDate: data.eventStartDate || '',
        eventEndDate: data.eventEndDate || '',
        eventCampaign: data.eventCampaign || '',
        eventLocation: data.eventLocation || '',
        promotionDiscountUSD: Number(data.promotionDiscountUSD) || 0,
        promotionNotes: data.promotionNotes || '',
        updatedAt: data.updatedAt,
      });
    });
    onData(items);
  }, (err) => {
    console.error('Firestore inventory listener error:', err);
    if (onError) onError(err);
  });
};

/**
 * Save or update an inventory item in Firestore
 */
export const saveInventoryItemToFirestore = async (item: InventoryItem) => {
  if (!db || !isFirebaseConfigured()) return;
  const docRef = doc(db, 'inventory', item.vin);
  const dataToSave = {
    ...item,
    vin: item.vin,
    imageUrl: item.imageUrl || item.image || '',
    image: item.imageUrl || item.image || '',
    updatedAt: serverTimestamp(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
};

/**
 * Delete an inventory item from Firestore (Super Admin only)
 */
export const deleteInventoryItemFromFirestore = async (vin: string) => {
  if (!db || !isFirebaseConfigured()) return;
  const docRef = doc(db, 'inventory', vin);
  await deleteDoc(docRef);
};

/**
 * 3.2 Collection: `vehicle_models`
 * Real-time listener for vehicle models
 */
export const subscribeToVehicleModels = (
  onData: (models: VehicleModel[]) => void,
  onError?: (err: Error) => void
) => {
  if (!db || !isFirebaseConfigured()) return () => {};

  const colRef = collection(db, 'vehicle_models');
  return onSnapshot(colRef, (snapshot) => {
    const models: VehicleModel[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      models.push({
        id: docSnap.id,
        name: data.name || '',
        subTitle: data.subTitle || '',
        tagline: data.tagline || '',
        category: data.category || '',
        priceStartingUSD: Number(data.priceStartingUSD) || 0,
        priceStartingLAK: Number(data.priceStartingLAK) || (Number(data.priceStartingUSD) || 0) * 22000,
        acceleration: data.acceleration || '3.9s',
        rangeCLTC: data.rangeCLTC || '700 km',
        batteryCapacity: data.batteryCapacity || '94.5 kWh',
        batterySupplier: data.batterySupplier || 'CATL',
        chargingSpeed: data.chargingSpeed || '800V Silicon Carbide',
        smartDriving: data.smartDriving || 'Huawei Qiankun ADS 3.0',
        powertrain: data.powertrain || 'Dual-Motor AWD',
        colors: data.colors || [],
        description: data.description || '',
        features: data.features || [],
        stockCount: Number(data.stockCount) || 0,
        heroImage: data.heroImage || '',
        gallery: data.gallery || [],
        isCustom: Boolean(data.isCustom),
        createdBy: data.createdBy || '',
      });
    });
    if (models.length > 0) {
      onData(models);
    }
  }, (err) => {
    console.error('Firestore vehicle_models listener error:', err);
    if (onError) onError(err);
  });
};

/**
 * Save or update a vehicle model in Firestore (Super Admin only)
 */
export const saveVehicleModelToFirestore = async (model: VehicleModel, superAdminUid?: string) => {
  if (!db || !isFirebaseConfigured()) return;
  const docRef = doc(db, 'vehicle_models', model.id);
  const dataToSave = {
    ...model,
    createdBy: model.createdBy || superAdminUid || 'super_admin',
    updatedAt: serverTimestamp(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
};

/**
 * Delete a vehicle model from Firestore (Super Admin only)
 */
export const deleteVehicleModelFromFirestore = async (modelId: string) => {
  if (!db || !isFirebaseConfigured()) return;
  const docRef = doc(db, 'vehicle_models', modelId);
  await deleteDoc(docRef);
};

/**
 * 3.3 Collection: `bills`
 * Real-time listener for official bills and invoices
 */
export const subscribeToBills = (
  onData: (bills: InvoiceBillRecord[]) => void,
  onError?: (err: Error) => void
) => {
  if (!db || !isFirebaseConfigured()) return () => {};

  const colRef = collection(db, 'bills');
  return onSnapshot(colRef, (snapshot) => {
    const billsList: InvoiceBillRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      billsList.push({
        id: docSnap.id,
        billNumber: data.billNumber || docSnap.id,
        billType: data.billType || data.type || 'sale',
        type: data.billType || data.type || 'sale',
        date: data.date || new Date().toISOString().slice(0, 10),
        customerName: data.customerName || '',
        customerPhone: data.customerPhone || '',
        vin: data.vin || '',
        model: data.model || '',
        amountUSD: Number(data.amountUSD || data.netTotalUSD) || 0,
        amountLAK: Number(data.amountLAK || data.netTotalLAK) || 0,
        netTotalUSD: Number(data.netTotalUSD || data.amountUSD) || 0,
        netTotalLAK: Number(data.netTotalLAK || data.amountLAK) || 0,
        unitPriceUSD: Number(data.unitPriceUSD) || 0,
        unitPriceLAK: Number(data.unitPriceLAK) || 0,
        discountUSD: Number(data.discountUSD) || 0,
        discountLAK: Number(data.discountLAK) || 0,
        paymentMethod: data.paymentMethod || 'transfer',
        qrUsed: data.qrUsed || 'official_qr',
        salesRep: data.salesRep || data.recordedBy || '',
        recordedBy: data.recordedBy || data.salesRep || '',
        notes: data.notes || '',
        plateNumber: data.plateNumber || '',
        color: data.color || '',
        trim: data.trim || '',
        battery: data.battery || '',
        quantity: Number(data.quantity) || 1,
        supplierName: data.supplierName || '',
        customsDocNumber: data.customsDocNumber || '',
        importEntryPort: data.importEntryPort || '',
        destinationWarehouse: data.destinationWarehouse || '',
        freeGifts: data.freeGifts || [],
        timestamp: data.timestamp,
      });
    });
    onData(billsList);
  }, (err) => {
    console.error('Firestore bills listener error:', err);
    if (onError) onError(err);
  });
};

/**
 * Save or record a bill in Firestore
 */
export const saveBillToFirestore = async (bill: InvoiceBillRecord) => {
  if (!db || !isFirebaseConfigured()) return;
  const docRef = doc(db, 'bills', bill.id);
  const dataToSave = {
    ...bill,
    id: bill.id,
    type: bill.billType || bill.type || 'sale',
    amountUSD: bill.netTotalUSD ?? bill.amountUSD ?? 0,
    amountLAK: bill.netTotalLAK ?? bill.amountLAK ?? 0,
    qrUsed: bill.qrUsed || 'official_qr',
    timestamp: serverTimestamp(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
};

/**
 * Delete a bill from Firestore (Super Admin only)
 */
export const deleteBillFromFirestore = async (billId: string) => {
  if (!db || !isFirebaseConfigured()) return;
  const docRef = doc(db, 'bills', billId);
  await deleteDoc(docRef);
};

/**
 * 3.4 Collection: `settings` (Doc: `dealership_config`)
 * Real-time listener for Company Official QR Code & Dealership Settings
 */
export const subscribeToDealershipConfig = (
  onData: (config: DealershipConfig) => void,
  onError?: (err: Error) => void
) => {
  if (!db || !isFirebaseConfigured()) return () => {};

  const docRef = doc(db, 'settings', 'dealership_config');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      onData({
        companyQrImageUrl: data.companyQrImageUrl ?? null,
        uploadedBy: data.uploadedBy || '',
        currencies: Array.isArray(data.currencies) && data.currencies.length > 0 ? data.currencies : DEFAULT_CURRENCIES,
        campaignCategories: Array.isArray(data.campaignCategories) ? data.campaignCategories : ['ງານ Motor Show 2026', 'ງານ Vientiane Motor Expo 2026', 'Mid-Year EV Special'],
        colorOptions: Array.isArray(data.colorOptions) ? data.colorOptions : [
          { name: 'Obsidian Black', hex: '#0a0a0b', previewClass: 'bg-zinc-950 border border-zinc-700' },
          { name: 'Ceramic White', hex: '#f4f4f5', previewClass: 'bg-zinc-100 border border-zinc-300' },
          { name: 'Liquid Titanium', hex: '#71717a', previewClass: 'bg-zinc-500 border border-zinc-400' },
        ],
        accountName: data.accountName || DEFAULT_COMPANY_BANK_INFO.accountName,
        bankName: data.bankName || DEFAULT_COMPANY_BANK_INFO.bankName,
        usdAccount: data.usdAccount || DEFAULT_COMPANY_BANK_INFO.usdAccount,
        lakAccount: data.lakAccount || DEFAULT_COMPANY_BANK_INFO.lakAccount,
        cnyAccount: data.cnyAccount || DEFAULT_COMPANY_BANK_INFO.cnyAccount,
        thbAccount: data.thbAccount || DEFAULT_COMPANY_BANK_INFO.thbAccount,
        hotline: data.hotline || DEFAULT_COMPANY_BANK_INFO.hotline,
        branch: data.branch || DEFAULT_COMPANY_BANK_INFO.branch,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      });
    }
  }, (err) => {
    console.error('Firestore settings listener error:', err);
    if (onError) onError(err);
  });
};

/**
 * Save dealership settings to Firestore (Super Admin only)
 */
export const saveDealershipConfigToFirestore = async (config: Partial<DealershipConfig>) => {
  if (!db || !isFirebaseConfigured()) return;
  const docRef = doc(db, 'settings', 'dealership_config');
  await setDoc(docRef, {
    ...config,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

/**
 * 3.5 Collection: `users`
 * Real-time listener for system users
 */
export const subscribeToUsers = (
  onData: (users: SystemUser[]) => void,
  onError?: (err: Error) => void
) => {
  if (!db || !isFirebaseConfigured()) return () => {};

  const colRef = collection(db, 'users');
  return onSnapshot(colRef, (snapshot) => {
    const userList: SystemUser[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      userList.push({
        id: docSnap.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || 'general_user',
        roleTitleLo: data.roleTitleLo || 'ຜູ້ໃຊ້ທົ່ວໄປ (General User)',
        department: data.department || 'General Staff',
        avatarInitials: data.avatarInitials || (data.name ? data.name.slice(0, 2) : 'US'),
        permissions: data.permissions || {
          canManageUsers: data.role === 'super_admin',
          canEditInventory: data.role === 'super_admin' || data.role === 'admin',
          canUploadQR: data.role === 'super_admin',
          canAddModels: data.role === 'super_admin',
          canDeleteUsers: data.role === 'super_admin',
          canGrantRoles: data.role === 'super_admin',
          canDeductPOS: data.role === 'super_admin' || data.role === 'admin' || data.role === 'sales',
          canViewFinancials: data.role === 'super_admin' || data.role === 'admin',
        },
        status: data.status || 'active',
        createdAt: data.createdAt || new Date().toISOString().slice(0, 10),
        lastLogin: data.lastLogin || '',
        password: data.password,
      });
    });
    if (userList.length > 0) {
      const hasSuperAdmin = userList.some(u => u.role === 'super_admin');
      if (!hasSuperAdmin && userList[0]) {
        userList[0].role = 'super_admin';
        userList[0].roleTitleLo = 'Admin (Super Admin & ຜູ້ອຳນວຍການສູນ)';
        userList[0].permissions = {
          canManageUsers: true,
          canDeleteUsers: true,
          canGrantRoles: true,
          canEditInventory: true,
          canUploadQR: true,
          canAddModels: true,
          canDeductPOS: true,
          canViewFinancials: true,
        };
      }
      onData(userList);
    }
  }, (err) => {
    console.error('Firestore users listener error:', err);
    if (onError) onError(err);
  });
};

/**
 * Save user doc in Firestore
 */
export const saveUserToFirestore = async (user: SystemUser) => {
  if (!db || !isFirebaseConfigured()) return;
  const docRef = doc(db, 'users', user.id);
  const dataToSave = {
    ...user,
    id: user.id,
    updatedAt: serverTimestamp(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
};

/**
 * Delete user doc from Firestore (Super Admin only)
 */
export const deleteUserFromFirestore = async (userId: string) => {
  if (!db || !isFirebaseConfigured()) return;
  const docRef = doc(db, 'users', userId);
  await deleteDoc(docRef);
};

// -------------------------------------------------------------
// 4. FIREBASE STORAGE: COMPANY QR CODE & ASSET UPLOADS
// -------------------------------------------------------------

// Helper: Compress image to small Base64 string for free Firestore storage
const compressImageToBase64 = (file: File | Blob, maxWidth = 800, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
    };
    reader.onerror = reject;
  });
};

/**
 * Upload Company Official BCEL QR Code
 * - Attempts Firebase Storage first if enabled
 * - Automatically falls back to Firestore compressed document storage (100% FREE Spark Plan, $0 cost)
 * - Updates Firestore settings/dealership_config in real-time
 */
export const uploadCompanyQrCodeToStorage = async (
  file: File | Blob, 
  superAdminUser: SystemUser
): Promise<string> => {
  if (superAdminUser.role !== 'super_admin') {
    throw new Error('ສິດບໍ່ພຽງພໍ: ສະເພາະ Admin (Super Admin) ເທົ່ານັ້ນທີ່ມີສິດອັບໂຫລດ QR ບໍລິສັດ');
  }

  let finalUrl = '';

  // Try Firebase Storage if available
  if (storage && isFirebaseConfigured()) {
    try {
      const timestamp = Date.now();
      const storagePath = `dealership_config/company_qr_${timestamp}.jpg`;
      const storageReference = ref(storage, storagePath);
      
      await uploadBytes(storageReference, file);
      finalUrl = await getDownloadURL(storageReference);
    } catch (storageErr) {
      console.warn('Firebase Storage unavailable or requires billing. Falling back to 100% Free Firestore storage:', storageErr);
    }
  }

  // If Storage not used or failed, use compressed Base64 stored directly in Firestore (100% Free Spark Plan)
  if (!finalUrl) {
    finalUrl = await compressImageToBase64(file);
  }

  // Update settings/dealership_config in Firestore so all staff devices sync instantly
  await saveDealershipConfigToFirestore({
    companyQrImageUrl: finalUrl,
    uploadedBy: superAdminUser.id,
    updatedBy: `${superAdminUser.name} (${superAdminUser.roleTitleLo})`,
  });

  return finalUrl;
};

// -------------------------------------------------------------
// 5. INITIAL DATABASE SEEDER (Populates Firestore once if empty)
// -------------------------------------------------------------

export const seedFirestoreIfEmpty = async () => {
  // Pure blank start: No automatic seeding. All collections stay 100% empty until user adds real data.
  return;
};
