import type {
  InventoryItem,
  InvoiceBillRecord,
  Lead,
  ServiceAppointment,
  StockLogRecord,
  SystemUser,
  TestDriveBooking,
  VehicleModel,
} from '../types';
import {
  AVATR_VEHICLES,
  INITIAL_BILLS,
  INITIAL_LEADS,
  INITIAL_SERVICES,
  INITIAL_TEST_DRIVES,
} from '../data/mockData';
import type { BackendData } from './data';
import { isOfflineDemoEnabled } from './client';

const STORAGE_KEY_PREFIX = 'avatr_offline_';

export const DEFAULT_OFFLINE_USERS: SystemUser[] = [
  {
    id: 'user-admin-01',
    name: 'ຜູ້ດູແລລະບົບ (Admin)',
    email: 'admin@avatr.la',
    phone: '020 55559999',
    role: 'super_admin',
    roleTitleLo: 'Admin',
    department: 'Executive Board',
    avatarInitials: 'AD',
    permissions: {
      canManageUsers: true,
      canDeleteUsers: true,
      canGrantRoles: true,
      canEditInventory: true,
      canUploadQR: true,
      canAddModels: true,
      canDeductPOS: true,
      canViewFinancials: true,
      canUpdatePDI: true,
      canViewVehicles: true,
    },
    status: 'active',
    createdAt: '2026-10-01T00:00:00Z',
    lastLogin: '2026-10-17T12:00:00Z',
  },
  {
    id: 'user-sales-01',
    name: 'ທ້າວ ສົມພອນ ໄຊຍະສິດ',
    email: 'sales@avatr.la',
    phone: '020 55112233',
    role: 'sales',
    roleTitleLo: 'Sales Consultant',
    department: 'Sales & Showroom',
    avatarInitials: 'SP',
    permissions: {
      canManageUsers: false,
      canDeleteUsers: false,
      canGrantRoles: false,
      canEditInventory: false,
      canUploadQR: false,
      canAddModels: false,
      canDeductPOS: true,
      canViewFinancials: false,
      canUpdatePDI: false,
      canViewVehicles: true,
    },
    status: 'active',
    createdAt: '2026-10-02T00:00:00Z',
    lastLogin: '2026-10-17T10:00:00Z',
  }
];

export const DEFAULT_OFFLINE_INVENTORY: InventoryItem[] = [
  {
    vin: 'AVATR12-2026-9901',
    model: 'AVATR 12',
    trim: 'AWD Dual-Motor Luxury (800V SiC)',
    color: 'Obsidian Black',
    colorHex: '#0a0a0b',
    interiorColor: 'Burgundy / Charcoal',
    battery: '94.5 kWh CATL Ternary',
    priceUSD: 46800,
    priceLAK: 1029600000,
    stockQuantity: 1,
    status: 'ready',
    pdiStatus: 'passed',
    pdiInspector: 'ບຸນມີ (Master EV Tech)',
    location: 'ໂຊຣູມໃຫຍ່ ຫຼັກ 7 ຖະໜົນ 450 ປີ',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    arrivalDate: '2026-10-01',
    mileageKm: 15,
  },
  {
    vin: 'AVATR11-2026-8899',
    model: 'AVATR 11',
    trim: 'Dual-Motor AWD Performance',
    color: 'Liquid Titanium',
    colorHex: '#71717a',
    interiorColor: 'Cognac Leather',
    battery: '116 kWh CATL Long Range',
    priceUSD: 52000,
    priceLAK: 1144000000,
    stockQuantity: 1,
    status: 'ready',
    pdiStatus: 'passed',
    pdiInspector: 'ສົມພອນ (EV Specialist)',
    location: 'ໂຊຣູມໃຫຍ່ ຫຼັກ 7 ຖະໜົນ 450 ປີ',
    imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    arrivalDate: '2026-10-05',
    mileageKm: 22,
  },
  {
    vin: 'AVATR07-2026-7788',
    model: 'AVATR 07',
    trim: 'Smart Urban Luxury Extended Range',
    color: 'Ceramic White',
    colorHex: '#f4f4f5',
    interiorColor: 'Pure White Luxury',
    battery: '39 kWh + 1.5T Range Extender',
    priceUSD: 36500,
    priceLAK: 803000000,
    stockQuantity: 1,
    status: 'ready',
    pdiStatus: 'passed',
    pdiInspector: 'ບຸນມີ (Master EV Tech)',
    location: 'ສາງໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ',
    imageUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80',
    arrivalDate: '2026-10-10',
    mileageKm: 8,
  },
  {
    vin: 'AVATR12-EVENT-2026',
    model: 'AVATR 12',
    trim: 'Grand Coupé Flagship Edition (Lao Motor Expo)',
    color: 'Liquid Titanium',
    colorHex: '#71717a',
    interiorColor: 'Full Caramel Luxe',
    battery: '94.5 kWh CATL Ternary',
    priceUSD: 46800,
    priceLAK: 1029600000,
    stockQuantity: 1,
    status: 'event',
    pdiStatus: 'passed',
    pdiInspector: 'ບຸນມີ (Master EV Tech)',
    location: 'ສູນການຄ້າ ລາວ-ໄອເຕັກ (Lao-ITECC Mall)',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    arrivalDate: '2026-10-15',
    mileageKm: 5,
    eventCampaign: 'Lao Motor Expo 2026',
    eventStartDate: '2026-10-15',
    eventEndDate: '2026-11-15',
    eventLocation: 'ສູນການຄ້າ ລາວ-ໄອເຕັກ (Lao-ITECC Mall) ບູດ A-01',
    promotionDiscountUSD: 2000,
    promotionNotes: 'ຟຣີຕູ້ສາກ Home Charger 7kW ຕິດຕັ້ງຮອດບ້ານ + ຟຣີປະກັນໄພຊັ້ນ 1 ດົນ 1 ປີ + ຟຣີຟີມກັນຄວາມຮ້ອນ Ceramic ຮອບຄັນ',
  }
];

function readStorage<T>(key: string, defaultValue: T): T {
  if (!isOfflineDemoEnabled) return defaultValue;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (!isOfflineDemoEnabled) return;

  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to write to localStorage [${key}]`, e);
  }
}

export function getOfflineBackendData(): BackendData {
  const rawUsers = readStorage<SystemUser[]>('users', DEFAULT_OFFLINE_USERS);
  const users = rawUsers
    .filter((u) => u.id !== 'user-tech-01' && !u.name?.includes('ຊ່າງເຕັກນິກ'))
    .map((u) => ({
      ...u,
      name: u.name.replace(/Super Admin/gi, 'Admin').trim(),
      roleTitleLo: u.roleTitleLo === 'Super Admin' ? 'Admin' : u.roleTitleLo,
    }));
  const vehicles = readStorage<VehicleModel[]>('vehicles', AVATR_VEHICLES);
  const rawLeads = readStorage<Lead[]>('leads', INITIAL_LEADS);
  const leads = [...rawLeads];
  INITIAL_LEADS.forEach((initLead) => {
    if (!leads.some((l) => l.id === initLead.id)) {
      leads.push(initLead);
    }
  });

  const deletedBillIds = new Set(readStorage<string[]>('deleted_bill_ids', []));
  const rawBills = readStorage<InvoiceBillRecord[]>('bills', INITIAL_BILLS);
  const seenBillKeys = new Set<string>();
  const bills: InvoiceBillRecord[] = [];
  rawBills.forEach((b) => {
    if (deletedBillIds.has(b.id)) return;
    const fixedBill = b.id === 'BILL-2026-0005' && b.billNumber === '011/KM7'
      ? { ...b, id: 'BILL-2026-0006' }
      : b;
    const key = `${fixedBill.id}|${fixedBill.billNumber}`;
    if (!seenBillKeys.has(key)) {
      seenBillKeys.add(key);
      bills.push(fixedBill);
    }
  });
  INITIAL_BILLS.forEach((initBill) => {
    if (deletedBillIds.has(initBill.id)) return;
    if (!bills.some((b) => b.id === initBill.id || b.billNumber === initBill.billNumber)) {
      bills.push(initBill);
    }
  });
  const rawInventory = readStorage<InventoryItem[]>('inventory', DEFAULT_OFFLINE_INVENTORY);
  const inventory = [...rawInventory];
  DEFAULT_OFFLINE_INVENTORY.forEach((defItem) => {
    if (!inventory.some((i) => i.vin === defItem.vin) && !bills.some((b) => b.vin === defItem.vin && (b.billType === 'sale' || b.billType === 'installment'))) {
      inventory.push(defItem);
    }
  });
  const stockLogs = readStorage<StockLogRecord[]>('stockLogs', []);
  const services = readStorage<ServiceAppointment[]>('services', INITIAL_SERVICES);
  const testDrives = readStorage<TestDriveBooking[]>('testDrives', INITIAL_TEST_DRIVES);
  const settings = readStorage<Record<string, unknown>>('settings', {
    companyBankInfo: {
      bankName: 'BCEL OnePay (ທະນາຄານການຄ້າຕ່າງປະເທດລາວ)',
      accountName: 'AVATR AUTO SERVICE SOLE CO., LTD',
      accountNumber: '010-12-00-01234567-001',
      currency: 'LAK / USD / THB',
      qrCodeUrl: '',
    }
  });

  return {
    users,
    vehicles,
    inventory,
    leads,
    bills,
    stockLogs,
    services,
    testDrives,
    settings,
    warnings: ['ໂໝດ Offline Demo: ລະບົບເຮັດວຽກຜ່ານ Local Storage ໂດຍບໍ່ຕ້ອງເຊື່ອມຕໍ່ຖານຂໍ້ມູນ Supabase Cloud'],
  };
}

export function offlineSignIn(emailOrId: string): SystemUser {
  const clean = emailOrId.trim().toLowerCase();
  const rawUsers = readStorage<SystemUser[]>('users', DEFAULT_OFFLINE_USERS);
  const users = rawUsers.filter((u) => u.id !== 'user-tech-01' && !u.name?.includes('ຊ່າງເຕັກນິກ'));
  const matched = users.find(
    (u) => u.email.toLowerCase() === clean || u.id.toLowerCase() === clean || (clean === 'admin' && u.role === 'super_admin')
  );

  const rawActive = matched || DEFAULT_OFFLINE_USERS[0];
  const activeUser = {
    ...rawActive,
    name: rawActive.name.replace(/Super Admin/gi, 'Admin').trim(),
    roleTitleLo: rawActive.roleTitleLo === 'Super Admin' ? 'Admin' : rawActive.roleTitleLo,
  };
  writeStorage('active_user', activeUser);
  return activeUser;
}

export function offlineSignUp(email: string, name: string, phone: string): SystemUser {
  const users = readStorage<SystemUser[]>('users', DEFAULT_OFFLINE_USERS);
  const newUser: SystemUser = {
    id: `offline-user-${Date.now()}`,
    name: name || 'Demo Staff',
    email: email.toLowerCase(),
    phone,
    role: 'general_user',
    roleTitleLo: 'General User',
    department: 'General Staff',
    avatarInitials: (name || 'DS').slice(0, 2).toUpperCase(),
    permissions: {
      canManageUsers: false,
      canDeleteUsers: false,
      canGrantRoles: false,
      canEditInventory: false,
      canUploadQR: false,
      canAddModels: false,
      canDeductPOS: false,
      canViewFinancials: false,
      canUpdatePDI: false,
      canViewVehicles: true,
    },
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  users.push(newUser);
  writeStorage('users', users);
  writeStorage('active_user', newUser);
  return newUser;
}

export function offlineGetActiveUser(): SystemUser | null {
  return readStorage<SystemUser | null>('active_user', null);
}

export function offlineClearActiveUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'active_user');
  } catch {}
}

export function offlineSaveUser(user: SystemUser): void {
  const users = readStorage<SystemUser[]>('users', DEFAULT_OFFLINE_USERS);
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.unshift(user);
  }
  writeStorage('users', users);
}

export function offlineDeleteUser(id: string): void {
  const users = readStorage<SystemUser[]>('users', DEFAULT_OFFLINE_USERS);
  const updated = users.filter((u) => u.id !== id);
  writeStorage('users', updated);

  const active = offlineGetActiveUser();
  if (active && active.id === id) {
    offlineClearActiveUser();
  }
}

export function offlineDeactivateUser(id: string): void {
  const users = readStorage<SystemUser[]>('users', DEFAULT_OFFLINE_USERS);
  const user = users.find((u) => u.id === id);
  if (user) {
    user.status = 'suspended';
    writeStorage('users', users);
  }
}

export function offlineSaveLead(lead: Lead): void {
  const leads = readStorage<Lead[]>('leads', INITIAL_LEADS);
  const idx = leads.findIndex((l) => l.id === lead.id);
  if (idx >= 0) {
    leads[idx] = lead;
  } else {
    leads.unshift(lead);
  }
  writeStorage('leads', leads);
}

export function offlineDeleteLead(id: string): void {
  const leads = readStorage<Lead[]>('leads', INITIAL_LEADS);
  writeStorage('leads', leads.filter((l) => l.id !== id));
}

export function offlineSaveBill(bill: InvoiceBillRecord, vehicle?: InventoryItem): void {
  const bills = readStorage<InvoiceBillRecord[]>('bills', INITIAL_BILLS);
  const idx = bills.findIndex((b) => b.id === bill.id);
  if (idx >= 0) {
    bills[idx] = bill;
  } else {
    bills.unshift(bill);
  }
  writeStorage('bills', bills);

  const billType = bill.billType || bill.type;
  const stockLogs = readStorage<StockLogRecord[]>('stockLogs', []);

  if (billType === 'import') {
    const inventory = readStorage<InventoryItem[]>('inventory', DEFAULT_OFFLINE_INVENTORY);
    const newItem: InventoryItem = vehicle || {
      vin: bill.vin,
      engineNumber: bill.engineNumber || '',
      model: bill.model,
      trim: bill.trim || '',
      plateNumber: bill.plateNumber || 'ລໍຖ້າຂຶ້ນທະບຽນ',
      color: bill.color || '-',
      colorHex: '#18181b',
      interiorColor: bill.interiorColor || 'Black',
      battery: bill.battery || 'CATL Ternary Lithium',
      priceUSD: bill.unitPriceUSD || bill.netTotalUSD || 0,
      priceLAK: bill.unitPriceLAK || bill.netTotalLAK || 0,
      stockQuantity: bill.quantity || 1,
      status: bill.statusInitial || 'ready',
      pdiStatus: (bill.pdiStatusInitial as InventoryItem['pdiStatus']) || 'passed',
      pdiInspector: bill.inspectorName,
      location: bill.destinationWarehouse || 'ສາງໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ',
      arrivalDate: (bill.date || new Date().toISOString()).slice(0, 10),
      mileageKm: 0,
    };
    const vIdx = inventory.findIndex((i) => i.vin === newItem.vin);
    if (vIdx >= 0) {
      inventory[vIdx] = { ...inventory[vIdx], ...newItem, stockQuantity: newItem.stockQuantity || 1 };
    } else {
      inventory.unshift(newItem);
    }
    writeStorage('inventory', inventory);

    const logEntry: StockLogRecord = {
      id: `LOG-IN-${Date.now().toString().slice(-6)}`,
      billId: bill.id,
      type: 'stock_in',
      vin: bill.vin,
      model: bill.model,
      plateNumber: newItem.plateNumber,
      color: newItem.color,
      quantity: bill.quantity || 1,
      priceUSD: bill.unitPriceUSD || bill.netTotalUSD || 0,
      priceLAK: bill.unitPriceLAK || bill.netTotalLAK || 0,
      timestamp: bill.date || new Date().toISOString(),
      recordedBy: bill.recordedBy || 'Admin',
      remainingStock: inventory.filter((i) => i.model === bill.model && i.status !== 'sold' && i.stockQuantity > 0).length,
      notes: bill.notes || `ນຳເຂົ້າລົດໃໝ່ ໃບຮັບເລກທີ ${bill.billNumber}`,
    };
    stockLogs.unshift(logEntry);
    writeStorage('stockLogs', stockLogs);
  } else if ((billType === 'sale' || billType === 'installment') && bill.installmentType !== 'monthly_installment' && bill.vin) {
    const inventory = readStorage<InventoryItem[]>('inventory', DEFAULT_OFFLINE_INVENTORY);
    const item = inventory.find((i) => i.vin === bill.vin);
    if (item) {
      item.status = 'sold';
      item.stockQuantity = 0;
      writeStorage('inventory', inventory);
    }
    const remainingQty = inventory.filter((i) => i.model === bill.model && i.status !== 'sold' && i.stockQuantity > 0).length;
    const logEntry: StockLogRecord = {
      id: `LOG-OUT-${Date.now().toString().slice(-6)}`,
      billId: bill.id,
      leadId: bill.leadId,
      type: 'stock_out',
      vin: bill.vin,
      model: bill.model,
      plateNumber: bill.plateNumber || item?.plateNumber || '',
      color: bill.color || item?.color || '',
      quantity: bill.quantity || 1,
      priceUSD: bill.netTotalUSD || bill.amountUSD || 0,
      priceLAK: bill.netTotalLAK || bill.amountLAK || 0,
      timestamp: bill.date || new Date().toISOString(),
      recordedBy: bill.recordedBy || 'Admin',
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      paymentMethod: bill.paymentMethod,
      remainingStock: remainingQty,
      notes: bill.notes || `ຂາຍອອກຜ່ານ POS ໃບບິນເລກທີ ${bill.billNumber}`,
    };
    stockLogs.unshift(logEntry);
    writeStorage('stockLogs', stockLogs);
  }
}

export function offlineDeleteBill(id: string): void {
  const bills = readStorage<InvoiceBillRecord[]>('bills', INITIAL_BILLS);
  const target = bills.find((b) => b.id === id);
  if (target) {
    target.status = 'voided';
    writeStorage('bills', bills);
    if (target.vin && (target.billType === 'sale' || target.type === 'sale' || target.billType === 'installment')) {
      const inventory = readStorage<InventoryItem[]>('inventory', DEFAULT_OFFLINE_INVENTORY);
      const item = inventory.find((i) => i.vin === target.vin);
      if (item) {
        item.status = 'ready';
        item.stockQuantity = 1;
        writeStorage('inventory', inventory);
      }
    }
  } else {
    writeStorage('bills', bills.filter((b) => b.id !== id));
  }
}

export function offlineSaveInventoryItem(item: InventoryItem): void {
  const inventory = readStorage<InventoryItem[]>('inventory', DEFAULT_OFFLINE_INVENTORY);
  const idx = inventory.findIndex((i) => i.vin === item.vin);
  if (idx >= 0) {
    inventory[idx] = item;
  } else {
    inventory.unshift(item);
  }
  writeStorage('inventory', inventory);
}

export function offlineDeleteInventoryItem(vin: string): void {
  const inventory = readStorage<InventoryItem[]>('inventory', DEFAULT_OFFLINE_INVENTORY);
  writeStorage('inventory', inventory.filter((i) => i.vin !== vin));
}

export function offlineSaveVehicleModel(model: VehicleModel): void {
  const vehicles = readStorage<VehicleModel[]>('vehicles', AVATR_VEHICLES);
  const idx = vehicles.findIndex((v) => v.id === model.id);
  if (idx >= 0) {
    vehicles[idx] = model;
  } else {
    vehicles.push(model);
  }
  writeStorage('vehicles', vehicles);
}

export function offlineDeleteVehicleModel(id: string): void {
  const vehicles = readStorage<VehicleModel[]>('vehicles', AVATR_VEHICLES);
  writeStorage('vehicles', vehicles.filter((v) => v.id !== id));
}

export function offlineSaveService(appointment: ServiceAppointment): void {
  const services = readStorage<ServiceAppointment[]>('services', []);
  const idx = services.findIndex((s) => s.id === appointment.id);
  if (idx >= 0) {
    services[idx] = appointment;
  } else {
    services.unshift(appointment);
  }
  writeStorage('services', services);
}

export function offlineSaveTestDrive(booking: TestDriveBooking): void {
  const testDrives = readStorage<TestDriveBooking[]>('testDrives', []);
  const idx = testDrives.findIndex((t) => t.id === booking.id);
  if (idx >= 0) {
    testDrives[idx] = booking;
  } else {
    testDrives.unshift(booking);
  }
  writeStorage('testDrives', testDrives);
}
