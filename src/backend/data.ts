import type {
  InventoryItem,
  InvoiceBillRecord,
  Lead,
  ServiceAppointment,
  StockLogRecord,
  SystemUser,
  TestDriveBooking,
  UserPermissions,
  UserRole,
  VehicleModel,
} from '../types';
import {
  isOfflineDemoEnabled,
  isSupabaseConfigured,
  requireSupabase,
} from './client';

function requireOfflineDemo() {
  if (!isOfflineDemoEnabled) {
    throw new Error('Supabase is not configured. Offline Demo is disabled.');
  }
}
import {
  DEFAULT_OFFLINE_USERS,
  getOfflineBackendData,
  offlineClearActiveUser,
  offlineDeactivateUser,
  offlineDeleteBill,
  offlineDeleteInventoryItem,
  offlineDeleteLead,
  offlineHandoverStaffLeads,
  offlineDeleteUser,
  offlineDeleteVehicleModel,
  offlineGetActiveUser,
  offlineSaveBill,
  offlineSaveInventoryItem,
  offlineSaveLead,
  offlineSaveService,
  offlineSaveTestDrive,
  offlineSaveUser,
  offlineSaveVehicleModel,
  offlineSignIn,
  offlineSignUp,
} from './offlineStore';
import { AVATR_VEHICLES } from '../data/mockData';
import { newRecordId } from './ids';

const isUuid = (val?: string | null): val is string => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));
import {
  sanitizeText,
  sanitizePhone,
  sanitizeVIN,
  sanitizeNumber,
  hasDangerousPatterns
} from '../utils/security';
import { compressImageToWebP } from '../utils/imageCompressor';

function sanitizePaymentMethod(method?: string | null, isInstallment?: boolean): 'transfer' | 'cash' | 'finance' | null {
  if (!method) return isInstallment ? 'transfer' : null;
  const lower = String(method).toLowerCase().trim();
  if (lower === 'cash') return 'cash';
  if (lower === 'finance') return 'finance';
  if (lower === 'transfer' || lower === 'qr' || lower === 'bank' || lower === 'installment') return 'transfer';
  return isInstallment ? 'transfer' : null;
}

type DbRow = Record<string, any>;

export interface BackendData {
  users: SystemUser[];
  leads: Lead[];
  inventory: InventoryItem[];
  stockLogs: StockLogRecord[];
  bills: InvoiceBillRecord[];
  vehicles: VehicleModel[];
  services: ServiceAppointment[];
  testDrives: TestDriveBooking[];
  settings: Record<string, unknown>;
  warnings: string[];
}

const roleLabels: Record<UserRole, string> = {
  super_admin: 'Admin',
  admin: 'Admin',
  sales: 'Sales',
  technician: 'Technician',
  general_user: 'General User',
};

const rolePermissions = (row: DbRow | undefined): UserPermissions => ({
  canManageUsers: Boolean(row?.canManageUsers),
  canDeleteUsers: Boolean(row?.canDeleteUsers),
  canGrantRoles: Boolean(row?.canGrantRoles),
  canEditInventory: Boolean(row?.canEditInventory),
  canUploadQR: Boolean(row?.canUploadQR),
  canAddModels: Boolean(row?.canAddModels),
  canDeductPOS: Boolean(row?.canDeductPOS),
  canViewFinancials: Boolean(row?.canViewFinancials),
  canUpdatePDI: Boolean(row?.canUpdatePDI),
  canViewVehicles: Boolean(row?.canViewVehicles),
});

const initials = (name: string) => name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export function mapStaffProfile(profile: DbRow, permissionRow?: DbRow): SystemUser {
  const role = (profile.role || 'general_user') as UserRole;
  return {
    id: profile.id,
    name: (profile.name || profile.email || 'Staff').replace(/Super\s*Admin/gi, 'Admin').trim(),
    email: profile.email || '',
    phone: profile.phone || '',
    role,
    roleTitleLo: (roleLabels[role] || roleLabels.general_user).replace(/Super\s*Admin/gi, 'Admin'),
    department: profile.department || '',
    avatarInitials: initials(profile.name || profile.email || 'S'),
    permissions: rolePermissions(permissionRow),
    status: profile.status === 'active' ? 'active' : 'suspended',
    createdAt: profile.created_at || new Date().toISOString(),
    lastLogin: profile.last_login || undefined,
  };
}

let cachedStaffRoles: DbRow[] | null = null;
let cachedVehicleModels: DbRow[] | null = null;
let cachedStaffUsers: SystemUser[] | null = null;
let activeStaffPromise: { userId: string; promise: Promise<SystemUser> } | null = null;
let cachedStaffUser: { userId: string; user: SystemUser; timestamp: number } | null = null;

export function clearStaffCache() {
  cachedStaffRoles = null;
  activeStaffPromise = null;
  cachedStaffUser = null;
}

export async function getSignedInStaff(userId: string): Promise<SystemUser> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return offlineGetActiveUser() || DEFAULT_OFFLINE_USERS[0];
  }
  if (cachedStaffUser && cachedStaffUser.userId === userId && Date.now() - cachedStaffUser.timestamp < 30_000) {
    return cachedStaffUser.user;
  }
  if (activeStaffPromise?.userId === userId) {
    return activeStaffPromise.promise;
  }

  const promise = (async () => {
    const client = requireSupabase();
    const [profileRes, rolesRes] = await Promise.all([
      client
        .from('staff_profiles')
        .select('id,email,name,phone,role,department,role_title,status,created_at,last_login')
        .eq('id', userId)
        .maybeSingle(),
      cachedStaffRoles
        ? Promise.resolve({ data: cachedStaffRoles, error: null })
        : client.from('staff_roles').select('role_code,permissions'),
    ]);

    if (profileRes.error) throw profileRes.error;
    const profile = profileRes.data;
    if (!profile || profile.status !== 'active') {
      throw new Error('This login does not have an active staff profile. Ask the administrator to set up access.');
    }
    if (rolesRes.error) throw rolesRes.error;
    if (!cachedStaffRoles && rolesRes.data) cachedStaffRoles = rolesRes.data;

    const matchedRole = (cachedStaffRoles || []).find((r: DbRow) => r.role_code === profile.role);
    const mapped = mapStaffProfile(profile, matchedRole?.permissions);
    cachedStaffUser = { userId, user: mapped, timestamp: Date.now() };
    return mapped;
  })();

  activeStaffPromise = { userId, promise };
  try {
    return await promise;
  } finally {
    if (activeStaffPromise?.userId === userId) activeStaffPromise = null;
  }
}

export async function signInStaff(email: string, password: string, captchaToken?: string): Promise<SystemUser> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return offlineSignIn(email);
  }
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Authentication did not return a user.');

  try {
    return await getSignedInStaff(data.user.id);
  } catch (profileError) {
    await client.auth.signOut();
    throw profileError;
  }
}

export async function signUpStaff(
  email: string,
  password: string,
  name: string,
  phone: string,
  captchaToken?: string
): Promise<SystemUser> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return offlineSignUp(email, name, phone);
  }
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { name: sanitizeText(name, 120), phone: sanitizePhone(phone, 30) },
      captchaToken,
      emailRedirectTo: typeof window !== "undefined" ? (window.location.origin + "/") : "https://avatrautoservice.pheuangkeokisith.workers.dev/",
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign-up did not return a user.');
  if (!data.session) throw new Error('Account created. Confirm the email, then sign in.');
  try {
    return await getSignedInStaff(data.user.id);
  } catch (profileError) {
    await client.auth.signOut();
    throw new Error('Account created and pending administrator approval.');
  }
}

export async function createStaffAccount(input: {
  name: string;
  email: string;
  phone: string;
  department: string;
  role: UserRole;
  password?: string;
}): Promise<SystemUser> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    const isAdmin = input.role === 'admin' || input.role === 'super_admin';
    const newUser: SystemUser = {
      id: `offline-user-${Date.now()}`,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      role: input.role,
      roleTitleLo: roleLabels[input.role] || 'General User',
      department: input.department,
      avatarInitials: (input.name || 'US').slice(0, 2).toUpperCase(),
      permissions: {
        canManageUsers: isAdmin,
        canDeleteUsers: isAdmin,
        canGrantRoles: isAdmin,
        canEditInventory: isAdmin || input.role === 'technician',
        canUploadQR: isAdmin,
        canAddModels: isAdmin,
        canDeductPOS: isAdmin || input.role === 'sales',
        canViewFinancials: isAdmin || input.role === 'sales',
        canUpdatePDI: isAdmin || input.role === 'technician',
        canViewVehicles: true,
      },
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    offlineSaveUser(newUser);
    return newUser;
  }

  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('create-staff', { body: input });
  if (error) {
    let errMsg = error.message || 'Could not create the staff account.';
    if (error && typeof error === 'object' && 'context' in error) {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (typeof ctx?.json === 'function') {
        try {
          const body = await ctx.json();
          if (body?.error) errMsg = body.error;
        } catch {}
      }
    }
    throw new Error(errMsg);
  }
  if (!data?.profile) {
    throw new Error(data?.error || 'Could not create the staff account.');
  }
  const mapped = mapStaffProfile(data.profile, data.permissions);
  offlineSaveUser(mapped);
  return mapped;
}

function mapVehicleModel(row: DbRow): VehicleModel {
  const colors = Array.isArray(row.colors) ? row.colors : [];
  return {
    id: row.id,
    name: row.name || row.id,
    subTitle: row.subtitle || '',
    tagline: row.tagline || '',
    category: row.category || '',
    priceStartingUSD: Number(row.price_starting_usd) || 0,
    priceStartingLAK: Number(row.price_starting_lak) || 0,
    acceleration: row.acceleration || '',
    rangeCLTC: row.range_cltc || '',
    batteryCapacity: row.battery_capacity || '',
    batterySupplier: row.battery_supplier || '',
    chargingSpeed: row.charging_speed || '',
    smartDriving: row.smart_driving || '',
    powertrain: row.powertrain || '',
    colors,
    description: row.description || '',
    features: Array.isArray(row.features) ? row.features : [],
    heroImage: row.hero_image || '',
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    isCustom: Boolean(row.is_custom),
    createdBy: row.created_by || undefined,
  };
}

function mapInventoryItem(row: DbRow, modelById: Map<string, VehicleModel>): InventoryItem {
  const model = modelById.get(row.model_id);
  const status = row.status || 'ready';
  return {
    vin: row.vin,
    engineNumber: row.engine_number || undefined,
    model: model?.name || row.model_id || '',
    plateNumber: row.plate_number || '',
    color: row.color || '',
    colorHex: row.color_hex || undefined,
    interiorColor: row.interior_color || '',
    trim: row.trim || '',
    battery: row.battery || '',
    priceUSD: Number(row.price_usd) || 0,
    priceLAK: Number(row.price_lak) || 0,
    stockQuantity: status === 'sold' ? 0 : 1,
    status,
    pdiStatus: row.pdi_status || 'pending',
    pdiInspector: row.pdi_inspector || undefined,
    pdiNotes: row.pdi_notes || undefined,
    location: row.location || '',
    imageUrl: row.image_url || undefined,
    image: row.image_url || undefined,
    reservedForCustomer: row.reserved_for_customer || undefined,
    arrivalDate: row.arrival_date || undefined,
    mileageKm: Number(row.mileage_km) || 0,
    eventCampaign: row.event_campaign || undefined,
    eventStartDate: row.event_start_date || undefined,
    eventEndDate: row.event_end_date || undefined,
    eventLocation: row.event_location || undefined,
    promotionDiscountUSD: Number(row.promotion_discount_usd) || undefined,
    promotionNotes: row.promotion_notes || undefined,
    updatedAt: row.updated_at,
  };
}

function mapLead(row: DbRow, modelById: Map<string, VehicleModel>, staffById: Map<string, SystemUser>): Lead {
  return {
    id: row.id,
    customerName: row.name || '',
    phone: row.phone || '',
    email: row.email || undefined,
    idCardNumber: row.id_card_number || undefined,
    province: row.province || undefined,
    district: row.district || undefined,
    village: row.village || undefined,
    category: row.category || 'walk_in',
    source: row.source || undefined,
    interestedModel: modelById.get(row.interested_model_id)?.name || row.interested_model_id || '',
    status: row.status || 'new',
    priority: row.priority || 'normal',
    notes: row.notes || '',
    budget: row.budget || undefined,
    paymentType: row.payment_type || undefined,
    downPaymentPercent: row.down_payment_percent == null ? undefined : Number(row.down_payment_percent),
    downPaymentUSD: row.down_payment_usd == null ? undefined : Number(row.down_payment_usd),
    financeCompany: row.finance_company || undefined,
    tenureMonths: row.tenure_months == null ? undefined : Number(row.tenure_months),
    monthlyPaymentLAK: row.monthly_payment_lak == null ? undefined : Number(row.monthly_payment_lak),
    installmentStatus: row.installment_status || undefined,
    paidAmountUSD: row.paid_amount_usd == null ? undefined : Number(row.paid_amount_usd),
    paidAmountLAK: row.paid_amount_lak == null ? undefined : Number(row.paid_amount_lak),
    paymentDate: row.payment_date || undefined,
    paymentMethodRef: row.payment_method_ref || undefined,
    paymentBank: row.payment_bank || undefined,
    paymentReceiptNo: row.payment_receipt_no || undefined,
    paymentConfirmedBy: row.payment_confirmed_by || undefined,
    paymentTypeConfirmed: row.payment_type_confirmed || undefined,
    paidDate: row.paid_date || undefined,
    isPaymentCompleted: Boolean(row.is_payment_completed),
    installmentRecords: Array.isArray(row.installment_records) ? row.installment_records : undefined,
    plateNumber: row.plate_number || undefined,
    vin: row.vin || undefined,
    engineNumber: row.engine_number || undefined,
    color: row.color || undefined,
    currentMileageKm: row.current_mileage_km == null ? undefined : Number(row.current_mileage_km),
    batteryHealthSOH: row.battery_health_soh == null ? undefined : Number(row.battery_health_soh),
    warrantyStartDate: row.warranty_start_date || undefined,
    warrantyExpiryDate: row.warranty_expiry_date || undefined,
    warrantyYears: row.warranty_years == null ? undefined : Number(row.warranty_years),
    warrantyDistanceKm: row.warranty_distance_km == null ? undefined : Number(row.warranty_distance_km),
    warrantyTerms: row.warranty_terms || undefined,
    afterSalesNotes: row.after_sales_notes || undefined,
    assignedTo: staffById.get(row.assigned_to)?.name || '',
    createdAt: row.created_at || '',
    lastFollowUp: row.last_follow_up || undefined,
    testDriveDate: row.next_test_drive_at || undefined,
  };
}

function mapBill(row: DbRow, item: DbRow | undefined): InvoiceBillRecord {
  const gifts = Array.isArray(row.free_gifts) ? row.free_gifts : [];
  const totalUsd = Number(row.total_usd) || 0;
  const totalLak = Number(row.total_lak) || 0;
  return {
    id: row.id,
    type: row.type,
    billType: row.type,
    billNumber: row.bill_number,
    date: row.bill_date || row.created_at || '',
    vin: item?.vehicle_vin || row.vin || '',
    engineNumber: item?.engine_number || undefined,
    model: item?.model_name || row.model_name || '',
    trim: item?.trim || undefined,
    plateNumber: item?.plate_number || row.plate_number || undefined,
    color: item?.color || row.color || undefined,
    interiorColor: item?.interior_color || undefined,
    battery: item?.battery || undefined,
    quantity: 1,
    unitPriceUSD: Number(item?.unit_price_usd) || totalUsd,
    unitPriceLAK: Number(item?.unit_price_lak) || totalLak,
    discountUSD: Number(item?.discount_usd) || 0,
    discountLAK: Number(item?.discount_lak) || 0,
    netTotalUSD: totalUsd,
    netTotalLAK: totalLak,
    amountUSD: totalUsd,
    amountLAK: totalLak,
    leadId: row.customer_id || undefined,
    customerName: row.customer_name || undefined,
    customerPhone: row.customer_phone || row.phone || undefined,
    customerIDCard: row.customer_id_card || row.id_card || undefined,
    customerAddress: row.customer_address || row.address || undefined,
    customerProvince: row.customer_province || row.province || undefined,
    paymentMethod: row.payment_method || undefined,
    qrUsed: row.qr_used || undefined,
    bankName: row.bank_name || undefined,
    transferRef: row.transfer_ref || undefined,
    financeCompany: row.finance_company || undefined,
    downPaymentPercent: row.down_payment_percent == null ? undefined : Number(row.down_payment_percent),
    downPaymentUSD: row.down_payment_usd == null ? undefined : Number(row.down_payment_usd),
    tenureMonths: row.tenure_months || undefined,
    monthlyPaymentLAK: row.monthly_payment_lak == null ? undefined : Number(row.monthly_payment_lak),
    installmentPeriod: row.installment_period == null ? undefined : Number(row.installment_period),
    freeGifts: gifts,
    warrantyTerms: row.warranty_terms || undefined,
    warrantyStartDate: row.warranty_start_date || undefined,
    warrantyExpiryDate: row.warranty_expiry_date || undefined,
    warrantyYears: row.warranty_years == null ? undefined : Number(row.warranty_years),
    warrantyDistanceKm: row.warranty_distance_km == null ? undefined : Number(row.warranty_distance_km),
    currentMileageKm: row.current_mileage_km == null ? undefined : Number(row.current_mileage_km),
    batteryHealthSOH: row.battery_health_soh == null ? undefined : Number(row.battery_health_soh),
    afterSalesNotes: row.after_sales_notes || undefined,
    paymentSlipPath: row.payment_slip_path || undefined,
    supplierName: row.supplier_name || undefined,
    customsDocNumber: row.customs_doc_number || undefined,
    importEntryPort: row.import_entry_port || undefined,
    destinationWarehouse: row.destination_warehouse || undefined,
    inspectorName: item?.inspector_name || undefined,
    pdiStatusInitial: item?.pdi_status_initial || undefined,
    statusInitial: item?.status_initial || undefined,
    eventCampaign: item?.event_campaign || undefined,
    eventStartDate: item?.event_start_date || undefined,
    eventEndDate: item?.event_end_date || undefined,
    eventLocation: item?.event_location || undefined,
    recordedBy: row.recorded_by || undefined,
    notes: row.notes || undefined,
    status: (row.status as 'completed' | 'voided') || 'completed',
  };
}

export async function fetchBillsByDateRange(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<InvoiceBillRecord[]> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return getOfflineBackendData().bills;
  }
  const client = requireSupabase();
  const pageSize = 500;
  const MAX_QUERY_LIMIT = 1000; // Hard ceiling to guard browser memory from unbounded date ranges
  let offset = 0;
  const allRows: DbRow[] = [];

  while (allRows.length < MAX_QUERY_LIMIT) {
    let query = client
      .from('bills')
      .select('*, bill_items(*)')
      .order('bill_date', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (params?.dateFrom) {
      query = query.gte('bill_date', params.dateFrom);
    }
    if (params?.dateTo) {
      query = query.lte('bill_date', `${params.dateTo}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) throw error;
    const batch = data || [];
    allRows.push(...batch);
    if (batch.length < pageSize || allRows.length >= MAX_QUERY_LIMIT) break;
    offset += pageSize;
  }

  return allRows.map((row: DbRow) => {
    const firstItem = Array.isArray(row.bill_items) ? row.bill_items[0] : undefined;
    return mapBill(row, firstItem);
  });
}

export async function fetchLeadsByDateRange(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<Lead[]> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return getOfflineBackendData().leads;
  }
  const client = requireSupabase();
  const pageSize = 500;
  const MAX_QUERY_LIMIT = 1000; // Hard ceiling to guard browser memory from unbounded date ranges
  let offset = 0;
  const allRows: DbRow[] = [];

  while (allRows.length < MAX_QUERY_LIMIT) {
    let query = client
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (params?.dateFrom) {
      query = query.gte('created_at', params.dateFrom);
    }
    if (params?.dateTo) {
      query = query.lte('created_at', `${params.dateTo}T23:59:59`);
    }

    const { data, error } = await query;
    if (error) throw error;
    const batch = data || [];
    allRows.push(...batch);
    if (batch.length < pageSize || allRows.length >= MAX_QUERY_LIMIT) break;
    offset += pageSize;
  }

  const dbModels = (cachedVehicleModels || []).map(mapVehicleModel);
  const models = dbModels.length > 0 ? dbModels : AVATR_VEHICLES;
  const modelById = new Map(models.map((model) => [model.id, model]));
  const staffById = new Map((cachedStaffUsers || []).map((user) => [user.id, user]));

  return allRows.map((row: DbRow) => mapLead(row, modelById, staffById));
}

let activeLoadBackendPromise: Promise<BackendData> | null = null;
let activeTier1Listeners: Array<(initial: Partial<BackendData>) => void> = [];

export async function loadBackendData(
  onInitialTierLoaded?: (initial: Partial<BackendData>) => void
): Promise<BackendData> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    const offlineData = getOfflineBackendData();
    onInitialTierLoaded?.({
      users: offlineData.users,
      leads: offlineData.leads,
      inventory: offlineData.inventory,
      vehicles: offlineData.vehicles,
    });
    return offlineData;
  }

  if (onInitialTierLoaded) {
    activeTier1Listeners.push(onInitialTierLoaded);
  }

  if (activeLoadBackendPromise) {
    return activeLoadBackendPromise;
  }

  activeLoadBackendPromise = (async () => {
    try {
      const client = requireSupabase();

      // Tier 1: Core showroom catalog & leads (1-RTT RPC with fallback for fast initial paint)
      let modelsData: DbRow[] = [];
      let inventoryData: DbRow[] = [];
      let customersData: DbRow[] = [];
      let rolesData: DbRow[] = [];
      let settingsConfig: Record<string, unknown> = {};

      const [rpcInit, profilesResult] = await Promise.all([
        client.rpc('get_showroom_initial_data'),
        client.from('staff_profiles').select('id,email,name,phone,role,department,role_title,status,created_at,last_login'),
      ]);

      if (!rpcInit.error && rpcInit.data) {
        modelsData = rpcInit.data.models || [];
        inventoryData = rpcInit.data.vehicles || [];
        customersData = rpcInit.data.customers || [];
        rolesData = rpcInit.data.roles || [];
        settingsConfig = rpcInit.data.settings?.config || rpcInit.data.settings || {};
      } else {
        // Graceful fallback to individual queries if RPC is not available
        const [modelsResult, inventoryResult, customersResult, rolesResult, settingsResult] = await Promise.all([
          cachedVehicleModels
            ? Promise.resolve({ data: cachedVehicleModels, error: null })
            : client.from('vehicle_models').select('id,name,subtitle,tagline,category,price_starting_usd,price_starting_lak,is_custom,colors,features,description,created_at').order('name'),
          client.from('vehicles').select('*').order('created_at', { ascending: false }).range(0, 99),
          client.from('customers').select('*').order('created_at', { ascending: false }).range(0, 99),
          cachedStaffRoles
            ? Promise.resolve({ data: cachedStaffRoles, error: null })
            : client.from('staff_roles').select('role_code,permissions'),
          client.from('dealership_settings').select('config').eq('id', true).maybeSingle(),
        ]);

        if (modelsResult.error) throw modelsResult.error;
        if (inventoryResult.error) throw inventoryResult.error;
        if (customersResult.error) throw customersResult.error;

        modelsData = modelsResult.data || [];
        inventoryData = inventoryResult.data || [];
        customersData = customersResult.data || [];
        rolesData = rolesResult.data || [];
        settingsConfig = settingsResult.data?.config || {};
      }

      const profiles = profilesResult.error ? [] : (profilesResult.data || []);
      if (rolesData.length > 0) cachedStaffRoles = rolesData;
      if (modelsData.length > 0) cachedVehicleModels = modelsData;
      const permissionsByRole = new Map(rolesData.map((row: DbRow) => [row.role_code, row.permissions]));
      const users = profiles.map((row: DbRow) => mapStaffProfile(row, permissionsByRole.get(row.role)));
      if (users.length > 0) cachedStaffUsers = users;
      const staffById = new Map(users.map((user) => [user.id, user]));
      const dbModels = modelsData.map(mapVehicleModel);
      const models = dbModels.length > 0 ? dbModels : AVATR_VEHICLES;
      const modelById = new Map(models.map((model) => [model.id, model]));
      const inventory = inventoryData.map((row: DbRow) => mapInventoryItem(row, modelById));
      const inventoryByVin = new Map(inventoryData.map((row: DbRow) => [row.vin, row]));
      const leads = customersData.map((row: DbRow) => mapLead(row, modelById, staffById));

      // Yield Tier 1 immediately to all listeners
      const tier1Payload = {
        users,
        vehicles: models,
        inventory,
        leads,
        settings: settingsConfig,
      };
      for (const listener of activeTier1Listeners) {
        try { listener(tier1Payload); } catch (_) {}
      }

      // Tier 2: Transactional logs, appointments, test drives, and bills (Paginated to 100 most recent records)
      const [billsResult, movementsResult, servicesResult, testDrivesResult] = await Promise.all([
        client.from('bills').select('*, bill_items(*)').order('bill_date', { ascending: false }).range(0, 99),
        client.from('stock_movements').select('*').order('created_at', { ascending: false }).range(0, 99),
        client.from('service_appointments').select('*').order('scheduled_date', { ascending: true }).range(0, 99),
        client.from('test_drives').select('*').order('drive_date', { ascending: true }).range(0, 99),
      ]);

      if (billsResult.error) throw billsResult.error;

      const bills = (billsResult.data || []).map((row: DbRow) => {
        const firstItem = Array.isArray(row.bill_items) ? row.bill_items[0] : undefined;
        return mapBill(row, firstItem);
      });
      const services = (servicesResult.error ? [] : (servicesResult.data || [])).map((row: DbRow): ServiceAppointment => ({
        id: row.id,
        customerName: row.customer_name,
        phone: row.phone,
        model: row.model,
        plateNumber: row.plate_number || '',
        serviceType: row.service_type,
        scheduledDate: row.scheduled_date,
        scheduledTime: row.scheduled_time,
        status: row.status,
        technician: row.technician || '',
        estimatedCostUSD: Number(row.estimated_cost_usd) || 0,
        batteryHealthPercent: row.battery_health_percent == null ? undefined : Number(row.battery_health_percent),
        mileageKm: row.mileage_km == null ? undefined : Number(row.mileage_km),
        notes: row.notes || '',
      }));
      const testDrives = (testDrivesResult.error ? [] : (testDrivesResult.data || [])).map((row: DbRow): TestDriveBooking => ({
        id: row.id,
        customerName: row.customer_name,
        phone: row.phone,
        model: row.model,
        date: row.drive_date,
        timeSlot: row.time_slot,
        location: row.location,
        salesRep: row.sales_rep || '',
        status: row.status,
      }));
      const billById = new Map((billsResult.data || []).map((bill: DbRow) => [bill.id, bill]));
      const stockLogs = (movementsResult.error ? [] : (movementsResult.data || [])).map((movement: DbRow): StockLogRecord => {
        const bill = billById.get(movement.bill_id) as DbRow | undefined;
        const item = Array.isArray(bill?.bill_items) ? bill.bill_items[0] : undefined;
        const vehicle = inventoryByVin.get(movement.vehicle_vin);
        const model = vehicle ? modelById.get(vehicle.model_id)?.name : item?.model_name;
        const staff = staffById.get(movement.recorded_by);
        return {
          id: movement.id,
          type: movement.movement_type,
          vin: movement.vehicle_vin,
          model: model || '',
          plateNumber: vehicle?.plate_number || item?.plate_number || '',
          color: vehicle?.color || item?.color || '',
          quantity: 1,
          priceUSD: Number(item?.unit_price_usd) || 0,
          priceLAK: Number(item?.unit_price_lak) || 0,
          timestamp: movement.created_at,
          recordedBy: staff?.name || movement.recorded_by || '',
          customerName: bill?.customer_name || undefined,
          customerPhone: bill?.customer_phone || undefined,
          paymentMethod: bill?.payment_method || undefined,
          notes: movement.notes || bill?.notes || undefined,
        };
      });

      const warnings = [
        servicesResult.error ? `Service appointments could not be loaded: ${servicesResult.error.message}` : null,
        testDrivesResult.error ? `Test drives could not be loaded: ${testDrivesResult.error.message}` : null,
      ].filter((warning): warning is string => Boolean(warning));

      return {
        users,
        leads,
        inventory,
        stockLogs,
        bills,
        vehicles: models,
        services: servicesResult.error ? [] : services,
        testDrives: testDrivesResult.error ? [] : testDrives,
        settings: settingsConfig,
        warnings,
      };
    } finally {
      activeLoadBackendPromise = null;
      activeTier1Listeners = [];
    }
  })();

  return activeLoadBackendPromise;
}

async function findCustomerId(phone: string): Promise<string | null> {
  const client = requireSupabase();
  // customers.phone is not unique, so take the oldest match instead of failing on duplicates.
  const { data, error } = await client
    .from('customers')
    .select('id')
    .eq('phone', phone)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.id || null;
}

export async function uploadDealershipAsset(file: File, folder: 'vehicles' | 'qr') {
  if (!file.type.startsWith('image/')) throw new Error('Choose a valid image file.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Image files must be 10 MB or smaller before compression.');

  const targetFile = await compressImageToWebP(file, { maxDimension: 1200, quality: 0.8, maxSizeBytes: 300 * 1024 });
  const extension = targetFile.type === 'image/webp' ? 'webp' : (targetFile.type === 'image/jpeg' ? 'jpg' : targetFile.type.split('/')[1]);
  if (!['jpg', 'png', 'webp'].includes(extension)) throw new Error('Use a JPG, PNG, or WebP image.');

  const client = requireSupabase();
  const path = `${folder}/${newRecordId()}.${extension}`;
  const { error } = await client.storage.from('dealership-assets').upload(path, targetFile, {
    contentType: targetFile.type,
    upsert: false,
    cacheControl: '3600',
  });
  if (error) throw error;
  const { data } = client.storage.from('dealership-assets').getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function removeDealershipAsset(path: string) {
  const { error } = await requireSupabase().storage.from('dealership-assets').remove([path]);
  if (error) throw error;
}

export async function saveServiceAppointment(appointment: ServiceAppointment, actorId: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineSaveService(appointment);
    return;
  }
  const client = requireSupabase();
  const safePhone = sanitizePhone(appointment.phone, 30);
  const customerId = await findCustomerId(safePhone);
  const payload: Record<string, unknown> = {
    id: appointment.id,
    customer_id: customerId,
    customer_name: sanitizeText(appointment.customerName, 120),
    phone: safePhone,
    model: sanitizeText(appointment.model, 100),
    plate_number: sanitizeText(appointment.plateNumber, 30) || '',
    service_type: sanitizeText(appointment.serviceType, 60),
    scheduled_date: sanitizeText(appointment.scheduledDate, 30),
    scheduled_time: sanitizeText(appointment.scheduledTime, 20),
    status: appointment.status,
    technician: sanitizeText(appointment.technician, 100) || '',
    estimated_cost_usd: sanitizeNumber(appointment.estimatedCostUSD, 0),
    battery_health_percent: appointment.batteryHealthPercent != null ? sanitizeNumber(appointment.batteryHealthPercent, 0, 0, 100) : null,
    mileage_km: appointment.mileageKm != null ? sanitizeNumber(appointment.mileageKm, 0) : null,
    notes: sanitizeText(appointment.notes, 1000) || '',
    created_by: actorId,
  };
  let { error } = await client.from('service_appointments').insert(payload);
  if (error && error.message?.includes('mileage_km')) {
    delete payload.mileage_km;
    const retry = await client.from('service_appointments').insert(payload);
    error = retry.error;
  }
  if (error) throw error;
}

export async function saveTestDriveBooking(booking: TestDriveBooking, actorId: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineSaveTestDrive(booking);
    return;
  }
  const client = requireSupabase();
  const safePhone = sanitizePhone(booking.phone, 30);
  const customerId = await findCustomerId(safePhone);
  const { error } = await client.from('test_drives').insert({
    id: booking.id,
    customer_id: customerId,
    customer_name: sanitizeText(booking.customerName, 120),
    phone: safePhone,
    model: sanitizeText(booking.model, 100),
    drive_date: sanitizeText(booking.date, 30),
    time_slot: sanitizeText(booking.timeSlot, 30),
    location: sanitizeText(booking.location, 150),
    sales_rep: sanitizeText(booking.salesRep, 100),
    status: booking.status,
    created_by: actorId,
  });
  if (error) throw error;
}

// A booking saved before its customer exists has no customer_id. Link it once the customer is saved.
export async function linkTestDriveToCustomer(bookingId: string, phone: string) {
  const client = requireSupabase();
  const customerId = await findCustomerId(phone);
  if (!customerId) return;
  const { error } = await client.from('test_drives').update({ customer_id: customerId }).eq('id', bookingId);
  if (error) throw error;
}

export async function saveDealershipSettingsPatch(patch: Record<string, unknown>, actorId: string) {
  const client = requireSupabase();
  const { data: existing, error: readError } = await client.from('dealership_settings').select('config').eq('id', true).maybeSingle();
  if (readError) throw readError;
  const config = { ...((existing?.config || {}) as DbRow), ...patch };
  const { error } = await client.from('dealership_settings').upsert({ id: true, config, updated_by: actorId });
  if (error) throw error;
  return config;
}

export async function saveLead(lead: Lead, assignedStaffId: string, saleBill?: InvoiceBillRecord) {
  if (saleBill && !isSupabaseConfigured) {
    throw new Error(
      'Atomic POS sales require Supabase. Offline mode is demo-only.'
    );
  }
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineSaveLead(lead);
    return;
  }
  const client = requireSupabase();

  // Robust, case-insensitive model lookup with fallback
  let modelId: string | null = null;
  try {
    const { data: models } = await client.from('vehicle_models').select('id,name');
    if (models && models.length > 0) {
      const target = (lead.interestedModel || '').trim().toLowerCase();
      const matched = models.find((m) =>
        (m.id && m.id.toLowerCase() === target) ||
        (m.name && m.name.toLowerCase() === target) ||
        (m.name && m.name.toLowerCase().replace(/\s+/g, '') === target.replace(/\s+/g, '')) ||
        (m.id && m.id.toLowerCase().replace(/[-_\s]+/g, '') === target.replace(/[-_\s]+/g, ''))
      );
      modelId = matched?.id || models[0].id || null;
    }
  } catch (err) {
    console.warn('Could not query vehicle_models for lead:', err);
  }

  const safeName = sanitizeText(lead.customerName, 120);
  const safePhone = sanitizePhone(lead.phone, 30);
  const safeEmail = sanitizeText(lead.email, 120);
  const safeNotes = sanitizeText(lead.notes, 1000);
  const safeBudget = sanitizeText(lead.budget, 60);

  if (hasDangerousPatterns(lead.customerName) || hasDangerousPatterns(lead.notes)) {
    throw new Error('ตรวจพบอักขระหรือรูปแบบคำสั่งที่ไม่อนุญาตในข้อมูลลูกค้า');
  }

  const isUuid = (val?: string | null) =>
    !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
  const safeLeadId = isUuid(lead.id) ? lead.id : newRecordId();

  let finalAssignedStaffId: string | null = null;

  if (lead.assignedTo) {
    if (isUuid(lead.assignedTo)) {
      finalAssignedStaffId = lead.assignedTo;
    } else {
      try {
        const { data: matchedStaff } = await client
          .from('staff_profiles')
          .select('id')
          .or('name.eq."' + lead.assignedTo + '",email.eq."' + lead.assignedTo + '"')
          .maybeSingle();
        if (matchedStaff?.id) {
          finalAssignedStaffId = matchedStaff.id;
        }
      } catch {
        // Ignore matching error
      }
    }
  }

  if (!finalAssignedStaffId && isUuid(lead.id)) {
    try {
      const { data: existingLead, error: existingError } = await client
        .from('customers')
        .select('assigned_to')
        .eq('id', lead.id)
        .maybeSingle();
      if (!existingError && existingLead?.assigned_to) {
        finalAssignedStaffId = existingLead.assigned_to;
      }
    } catch {
      // Ignore if table query fails
    }
  }

  if (!finalAssignedStaffId && isUuid(assignedStaffId)) {
    finalAssignedStaffId = assignedStaffId;
  }

  // Ensure staff ID is valid UUID if set, otherwise fallback to null to protect foreign keys
  if (finalAssignedStaffId && !isUuid(finalAssignedStaffId)) {
    finalAssignedStaffId = null;
  }

  let safeCreatedAt: string = new Date().toISOString();
  if (lead.createdAt) {
    const d = new Date(lead.createdAt);
    if (!isNaN(d.getTime())) {
      safeCreatedAt = d.toISOString();
    }
  }

  const baseLeadPayload: Record<string, unknown> = {
    id: safeLeadId,
    name: safeName,
    phone: safePhone,
    email: safeEmail || null,
    category: lead.category,
    source: sanitizeText(lead.source, 100) || null,
    interested_model_id: modelId,
    status: lead.status || 'new',
    priority: lead.priority || 'normal',
    budget: safeBudget || null,
    assigned_to: finalAssignedStaffId,
    notes: safeNotes || null,
    last_follow_up: lead.lastFollowUp || null,
    next_test_drive_at: lead.testDriveDate || null,
    id_card_number: sanitizeText(lead.idCardNumber, 60) || null,
    province: sanitizeText(lead.province, 100) || null,
    district: sanitizeText(lead.district, 100) || null,
    village: sanitizeText(lead.village, 120) || null,
    payment_type: lead.paymentType || null,
    down_payment_percent: lead.downPaymentPercent != null ? sanitizeNumber(lead.downPaymentPercent, 0, 0, 100) : null,
    down_payment_usd: lead.downPaymentUSD != null ? sanitizeNumber(lead.downPaymentUSD, 0) : null,
    finance_company: sanitizeText(lead.financeCompany, 120) || null,
    tenure_months: lead.tenureMonths != null ? sanitizeNumber(lead.tenureMonths, 0, 1, 120) : null,
    monthly_payment_lak: lead.monthlyPaymentLAK != null ? sanitizeNumber(lead.monthlyPaymentLAK, 0) : null,
    installment_status: lead.installmentStatus || null,
    paid_amount_usd: lead.paidAmountUSD != null ? sanitizeNumber(lead.paidAmountUSD, 0) : null,
    paid_amount_lak: lead.paidAmountLAK != null ? sanitizeNumber(lead.paidAmountLAK, 0) : null,
    payment_date: lead.paymentDate || null,
    payment_method_ref: sanitizeText(lead.paymentMethodRef, 120) || null,
    payment_bank: sanitizeText(lead.paymentBank, 100) || null,
    payment_receipt_no: sanitizeText(lead.paymentReceiptNo, 100) || null,
    payment_confirmed_by: sanitizeText(lead.paymentConfirmedBy, 120) || null,
    payment_type_confirmed: lead.paymentTypeConfirmed || null,
    installment_records: Array.isArray(lead.installmentRecords) ? lead.installmentRecords : [],
    created_at: safeCreatedAt,
  };

  const extendedLeadPayload: Record<string, unknown> = {
    ...baseLeadPayload,
    paid_date: sanitizeText(lead.paidDate, 30) || null,
    is_payment_completed: Boolean(lead.isPaymentCompleted),
    plate_number: sanitizeText(lead.plateNumber, 30) || null,
    vin: sanitizeText(lead.vin, 30) || null,
    engine_number: sanitizeText(lead.engineNumber, 60) || null,
    color: sanitizeText(lead.color, 60) || null,
    current_mileage_km: lead.currentMileageKm != null ? sanitizeNumber(lead.currentMileageKm, 0) : null,
    battery_health_soh: lead.batteryHealthSOH != null ? sanitizeNumber(lead.batteryHealthSOH, 0, 0, 100) : null,
    warranty_start_date: sanitizeText(lead.warrantyStartDate, 30) || null,
    warranty_expiry_date: sanitizeText(lead.warrantyExpiryDate, 30) || null,
    warranty_years: lead.warrantyYears != null ? sanitizeNumber(lead.warrantyYears, 0, 1, 30) : null,
    warranty_distance_km: lead.warrantyDistanceKm != null ? sanitizeNumber(lead.warrantyDistanceKm, 0) : null,
    warranty_terms: sanitizeText(lead.warrantyTerms, 500) || null,
    after_sales_notes: sanitizeText(lead.afterSalesNotes, 1000) || null,
  };

  if (saleBill) {
    await saveBillRecord(
      saleBill,
      assignedStaffId,
      undefined,
      extendedLeadPayload
    );
    offlineSaveLead({ ...lead, id: safeLeadId });
    return;
  }

  let { error } = await client.from('customers').upsert(extendedLeadPayload);
  if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
    // Fallback if new after-sales columns have not been migrated on the remote DB yet
    const retry = await client.from('customers').upsert(baseLeadPayload);
    error = retry.error;
  }
  if (error) throw error;

  // Sync offline store for instant local cache availability
  offlineSaveLead({ ...lead, id: safeLeadId });
}

export async function updateLeadStatus(id: string, status: Lead['status']) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isSupabaseConfigured || !isUuid) {
    requireOfflineDemo();
    const data = getOfflineBackendData();
    const target = data.leads.find((l) => l.id === id);
    if (target) {
      target.status = status;
      offlineSaveLead(target);
    }
    return;
  }
  const { data, error } = await requireSupabase()
    .from('customers')
    .update({ status, last_follow_up: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Customer was not updated. Check your access and try again.');
}

export async function deleteLead(id: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isSupabaseConfigured || !isUuid) {
    requireOfflineDemo();
    offlineDeleteLead(id);
    return;
  }
  const { data, error } = await requireSupabase()
    .from('customers')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Customer was not deleted. Check your access and try again.');
}

export async function saveInventoryItem(item: InventoryItem) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineSaveInventoryItem(item);
    return;
  }
  const client = requireSupabase();
  let { data: models, error: modelError } = await client.from('vehicle_models').select('id').eq('name', item.model).limit(1);
  if (modelError) throw modelError;
  let model = models?.[0];
  if (!model) {
    const fallbackId = `model-${newRecordId().slice(0, 8)}`;
    await client.from('vehicle_models').upsert({
      id: fallbackId,
      name: item.model || 'AVATR',
      category: 'EV',
      price_starting_usd: item.priceUSD || 45000,
      price_starting_lak: item.priceLAK || null,
    }, { onConflict: 'id' });
    model = { id: fallbackId };
  }
  const safeVin = sanitizeVIN(item.vin);
  if (safeVin.length !== 17) {
    throw new Error('เลขตัวถัง (VIN) ต้องเป็นตัวพิมพ์ใหญ่ A-Z, 0-9 ความยาว 17 หลักพอดี');
  }

  const payload: Record<string, unknown> = {
    vin: safeVin,
    engine_number: sanitizeText(item.engineNumber, 60) || null,
    model_id: model.id,
    plate_number: sanitizeText(item.plateNumber, 30) || null,
    color: sanitizeText(item.color, 60) || null,
    color_hex: sanitizeText(item.colorHex, 20) || null,
    interior_color: sanitizeText(item.interiorColor, 60) || null,
    trim: sanitizeText(item.trim, 60) || null,
    battery: sanitizeText(item.battery, 60) || null,
    price_usd: sanitizeNumber(item.priceUSD, 0),
    price_lak: sanitizeNumber(item.priceLAK, 0),
    status: item.status,
    pdi_status: item.pdiStatus,
    pdi_inspector: sanitizeText(item.pdiInspector, 100) || null,
    pdi_notes: sanitizeText(item.pdiNotes, 1000) || null,
    location: sanitizeText(item.location, 100) || null,
    image_url: sanitizeText(item.imageUrl || item.image, 500) || null,
    reserved_for_customer: item.reservedForCustomer || null,
    arrival_date: sanitizeText(item.arrivalDate, 30) || null,
    mileage_km: sanitizeNumber(item.mileageKm, 0),
    event_campaign: sanitizeText(item.eventCampaign, 100) || null,
    event_start_date: sanitizeText(item.eventStartDate, 30) || null,
    event_end_date: sanitizeText(item.eventEndDate, 30) || null,
    event_location: sanitizeText(item.eventLocation, 100) || null,
    promotion_discount_usd: sanitizeNumber(item.promotionDiscountUSD, 0),
    promotion_notes: sanitizeText(item.promotionNotes, 500) || null,
  };
  let { error } = await client.from('vehicles').upsert(payload, { onConflict: 'vin' });
  if (error && error.message?.includes('engine_number')) {
    delete payload.engine_number;
    const retry = await client.from('vehicles').upsert(payload, { onConflict: 'vin' });
    error = retry.error;
  }
  if (error) throw error;
}

export async function deleteInventoryItem(vin: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineDeleteInventoryItem(vin);
    return;
  }
  const client = requireSupabase();
  const { error: rpcError } = await client.rpc('delete_vehicle_from_inventory', { p_vin: vin });
  if (!rpcError) return;
  if (rpcError.code !== 'PGRST202' && !rpcError.message?.includes('delete_vehicle_from_inventory')) {
    throw new Error(rpcError.message);
  }

  // Fallback if RPC is not deployed yet
  const { data: items } = await client.from('bill_items').select('bill_id').eq('vehicle_vin', vin);
  const billIds = Array.from(new Set((items || []).map((i: DbRow) => i.bill_id).filter(Boolean)));
  for (const billId of billIds) {
    const { error: billErr } = await client.rpc('delete_vehicle_bill', { p_bill_id: billId });
    if (billErr) throw new Error(billErr.message);
  }

  const { data, error } = await client
    .from('vehicles')
    .delete()
    .eq('vin', vin)
    .select('vin')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Vehicle was not deleted. Check your access and try again.');
}

export async function saveVehicleModel(model: VehicleModel, createdBy: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineSaveVehicleModel(model);
    return;
  }
  const client = requireSupabase();
  const { error } = await client.from('vehicle_models').upsert({
    id: model.id,
    name: model.name,
    subtitle: model.subTitle || null,
    tagline: model.tagline || null,
    category: model.category || null,
    price_starting_usd: model.priceStartingUSD,
    price_starting_lak: model.priceStartingLAK || null,
    extra_specs: {},
    colors: model.colors || [],
    features: model.features || [],
    gallery: model.gallery || [],
    description: model.description || null,
    created_by: createdBy || null,
    range_cltc: model.rangeCLTC || null,
    acceleration: model.acceleration || null,
    battery_capacity: model.batteryCapacity || null,
    battery_supplier: model.batterySupplier || null,
    charging_speed: model.chargingSpeed || null,
    smart_driving: model.smartDriving || null,
    powertrain: model.powertrain || null,
    is_custom: Boolean(model.isCustom),
    hero_image: model.heroImage || null,
  }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteVehicleModel(id: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineDeleteVehicleModel(id);
    return;
  }
  const { data, error } = await requireSupabase()
    .from('vehicle_models')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Vehicle model was not deleted. Check your access and try again.');
}

export async function saveBillRecord(bill: InvoiceBillRecord, actorId: string, vehicle?: InventoryItem, customerPayload?: Record<string, unknown>) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    const inbound = (bill.billType || bill.type) === 'import';
    if (inbound) {
      if (!vehicle || vehicle.vin !== bill.vin) {
        throw new Error('Stock-in requires a vehicle with a matching VIN.');
      }
      offlineSaveInventoryItem(vehicle);
    }
    offlineSaveBill(bill, vehicle);
    return;
  }
  const client = requireSupabase();
  const type = bill.billType || bill.type;
  if (!type) throw new Error('Bill type is required.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bill.id)) {
    throw new Error('Bill ID must be a UUID before it is saved.');
  }
  const customerId = (type === 'sale' || type === 'installment') && bill.leadId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bill.leadId)
    ? bill.leadId
    : null;

  // Handle installment payment receipts or updates to an already-recorded bill without re-triggering stock movement RPC
  let existingBill: { id: string } | null = null;
  if (type === 'installment') {
    const { data } = await client.from('bills').select('id').eq('id', bill.id).maybeSingle();
    existingBill = data;
  }
  if (type === 'installment' || existingBill) {
    const baseDirectBill: Record<string, unknown> = {
      id: bill.id,
      bill_number: sanitizeText(bill.billNumber, 60),
      type,
      bill_date: sanitizeText(bill.date?.slice(0, 10), 20) || new Date().toISOString().slice(0, 10),
      customer_id: customerId,
      customer_name: sanitizeText(bill.customerName, 120) || null,
      customer_phone: sanitizePhone(bill.customerPhone, 30) || null,
      customer_id_card: sanitizeText(bill.customerIDCard, 60) || null,
      customer_address: sanitizeText(bill.customerAddress, 250) || null,
      customer_province: sanitizeText(bill.customerProvince, 100) || null,
      sales_rep: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId) ? actorId : null,
      recorded_by: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId) ? actorId : null,
      payment_method: sanitizePaymentMethod(bill.paymentMethod, type === 'installment'),
      qr_used: sanitizeText(bill.qrUsed, 60) || null,
      bank_name: sanitizeText(bill.bankName, 100) || null,
      transfer_ref: sanitizeText(bill.transferRef, 100) || null,
      finance_company: sanitizeText(bill.financeCompany, 100) || null,
      down_payment_percent: bill.downPaymentPercent != null ? sanitizeNumber(bill.downPaymentPercent, 0, 0, 100) : null,
      down_payment_usd: bill.downPaymentUSD != null ? sanitizeNumber(bill.downPaymentUSD, 0) : null,
      tenure_months: bill.tenureMonths != null ? sanitizeNumber(bill.tenureMonths, 0, 1, 120) : null,
      monthly_payment_lak: bill.monthlyPaymentLAK != null ? sanitizeNumber(bill.monthlyPaymentLAK, 0) : null,
      free_gifts: bill.freeGifts || [],
      warranty_terms: sanitizeText(bill.warrantyTerms, 500) || null,
      payment_slip_path: sanitizeText(bill.paymentSlipPath, 300) || null,
      total_usd: sanitizeNumber(bill.netTotalUSD, 0),
      total_lak: sanitizeNumber(bill.netTotalLAK, 0),
      notes: sanitizeText(bill.notes, 1000) || null,
    };

    const extendedDirectBill: Record<string, unknown> = {
      ...baseDirectBill,
      installment_period: bill.installmentPeriod != null ? sanitizeNumber(bill.installmentPeriod, 0, 1, 120) : null,
      warranty_start_date: sanitizeText(bill.warrantyStartDate, 30) || null,
      warranty_expiry_date: sanitizeText(bill.warrantyExpiryDate, 30) || null,
      warranty_years: bill.warrantyYears != null ? sanitizeNumber(bill.warrantyYears, 0, 1, 30) : null,
      warranty_distance_km: bill.warrantyDistanceKm != null ? sanitizeNumber(bill.warrantyDistanceKm, 0) : null,
      current_mileage_km: bill.currentMileageKm != null ? sanitizeNumber(bill.currentMileageKm, 0) : null,
      battery_health_soh: bill.batteryHealthSOH != null ? sanitizeNumber(bill.batteryHealthSOH, 0, 0, 100) : null,
      after_sales_notes: sanitizeText(bill.afterSalesNotes, 1000) || null,
    };

    // Editing an existing bill must not overwrite who originally sold/recorded it.
    if (existingBill) {
      for (const payload of [baseDirectBill, extendedDirectBill]) {
        delete payload.sales_rep;
        delete payload.recorded_by;
      }
    }

    let { error: directErr } = await client.from('bills').upsert(extendedDirectBill);
    if (directErr && (directErr.code === 'PGRST204' || directErr.message?.includes('column'))) {
      const retry = await client.from('bills').upsert(baseDirectBill);
      directErr = retry.error;
    }
    if (directErr) throw new Error(directErr.message || 'Bill could not be saved.');

    if (existingBill && (bill.plateNumber || bill.model || bill.color)) {
      await client
        .from('bill_items')
        .update({
          model_name: sanitizeText(bill.model, 100) || undefined,
          plate_number: sanitizeText(bill.plateNumber, 30) || null,
          color: sanitizeText(bill.color, 60) || null,
          engine_number: sanitizeText(bill.engineNumber, 60) || null,
        })
        .eq('bill_id', bill.id);
    }

    offlineSaveBill(bill);
    return;
  }

  let vehiclePayload: Record<string, unknown> | null = null;
  if (vehicle) {
    let model = (cachedVehicleModels || []).find(
      (m: DbRow) => m.name === vehicle.model || m.id === vehicle.model
    );
    if (!model) {
      const { data: dbModels, error: modelError } = await client
        .from('vehicle_models')
        .select('id')
        .eq('name', vehicle.model)
        .limit(1);
      if (modelError) throw modelError;
      model = dbModels?.[0];
    }
    if (!model) {
      const fallbackId = `model-${newRecordId().slice(0, 8)}`;
      await client.from('vehicle_models').upsert({
        id: fallbackId,
        name: vehicle.model || 'AVATR',
        category: 'EV',
        price_starting_usd: vehicle.priceUSD || 45000,
        price_starting_lak: vehicle.priceLAK || null,
      }, { onConflict: 'id' });
      model = { id: fallbackId };
    }

    let arrivalDateIso: string | null = null;
    if (vehicle.arrivalDate) {
      const parsed = new Date(vehicle.arrivalDate);
      arrivalDateIso = isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    let eventStartIso: string | null = null;
    if (vehicle.eventStartDate) {
      const parsed = new Date(vehicle.eventStartDate);
      eventStartIso = isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    let eventEndIso: string | null = null;
    if (vehicle.eventEndDate) {
      const parsed = new Date(vehicle.eventEndDate);
      eventEndIso = isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    vehiclePayload = {
      model_id: model.id,
      engine_number: sanitizeText(vehicle.engineNumber, 60) || null,
      plate_number: sanitizeText(vehicle.plateNumber, 30) || null,
      color: sanitizeText(vehicle.color, 60) || null,
      color_hex: sanitizeText(vehicle.colorHex, 20) || null,
      interior_color: sanitizeText(vehicle.interiorColor, 60) || null,
      trim: sanitizeText(vehicle.trim, 60) || null,
      battery: sanitizeText(vehicle.battery, 60) || null,
      price_usd: sanitizeNumber(vehicle.priceUSD, 0),
      price_lak: sanitizeNumber(vehicle.priceLAK, 0),
      status: vehicle.status || 'ready',
      pdi_status: vehicle.pdiStatus || 'pending',
      pdi_inspector: sanitizeText(vehicle.pdiInspector, 100) || null,
      pdi_notes: sanitizeText(vehicle.pdiNotes, 1000) || null,
      location: sanitizeText(vehicle.location, 100) || null,
      image_url: sanitizeText(vehicle.imageUrl || vehicle.image, 500) || null,
      reserved_for_customer: vehicle.reservedForCustomer || null,
      arrival_date: arrivalDateIso,
      mileage_km: sanitizeNumber(vehicle.mileageKm, 0),
      event_campaign: sanitizeText(vehicle.eventCampaign, 100) || null,
      event_start_date: eventStartIso,
      event_end_date: eventEndIso,
      event_location: sanitizeText(vehicle.eventLocation, 100) || null,
      promotion_discount_usd: sanitizeNumber(vehicle.promotionDiscountUSD, 0),
      promotion_notes: sanitizeText(vehicle.promotionNotes, 500) || null,
    };
  }

  const billRow = {
    id: bill.id,
    bill_number: sanitizeText(bill.billNumber, 60),
    type,
    bill_date: sanitizeText(bill.date?.slice(0, 10), 20),
    customer_id: customerId,
    customer_name: sanitizeText(bill.customerName, 120) || null,
    phone: sanitizePhone(bill.customerPhone, 30) || null,
    id_card: sanitizeText(bill.customerIDCard, 60) || null,
    address: sanitizeText(bill.customerAddress, 250) || null,
    province: sanitizeText(bill.customerProvince, 100) || null,
    sales_rep: actorId,
    recorded_by: actorId,
    payment_method: sanitizePaymentMethod(bill.paymentMethod, false),
    qr_used: sanitizeText(bill.qrUsed, 60) || null,
    bank_name: sanitizeText(bill.bankName, 100) || null,
    transfer_ref: sanitizeText(bill.transferRef, 100) || null,
    finance_company: sanitizeText(bill.financeCompany, 100) || null,
    down_payment_percent: bill.downPaymentPercent != null ? sanitizeNumber(bill.downPaymentPercent, 0, 0, 100) : null,
    down_payment_usd: bill.downPaymentUSD != null ? sanitizeNumber(bill.downPaymentUSD, 0) : null,
    tenure_months: bill.tenureMonths != null ? sanitizeNumber(bill.tenureMonths, 0, 1, 120) : null,
    monthly_payment_lak: bill.monthlyPaymentLAK != null ? sanitizeNumber(bill.monthlyPaymentLAK, 0) : null,
    free_gifts: bill.freeGifts || [],
    warranty_terms: sanitizeText(bill.warrantyTerms, 500) || null,
    payment_slip_path: sanitizeText(bill.paymentSlipPath, 300) || null,
    supplier_name: sanitizeText(bill.supplierName, 120) || null,
    customs_doc_number: sanitizeText(bill.customsDocNumber, 100) || null,
    import_entry_port: sanitizeText(bill.importEntryPort, 100) || null,
    destination_warehouse: sanitizeText(bill.destinationWarehouse, 100) || null,
    total_usd: sanitizeNumber(bill.netTotalUSD, 0),
    total_lak: sanitizeNumber(bill.netTotalLAK, 0),
    notes: sanitizeText(bill.notes, 1000) || null,
  };

  const billItem = {
    id: newRecordId(),
    bill_id: bill.id,
    line_number: 1,
    vehicle_vin: sanitizeVIN(bill.vin),
    engine_number: sanitizeText(bill.engineNumber || vehicle?.engineNumber, 60) || null,
    model_name: sanitizeText(bill.model, 100),
    trim: sanitizeText(bill.trim, 60) || null,
    plate_number: sanitizeText(bill.plateNumber, 30) || null,
    color: sanitizeText(bill.color, 60) || null,
    interior_color: sanitizeText(bill.interiorColor, 60) || null,
    battery: sanitizeText(bill.battery, 60) || null,
    unit_price_usd: sanitizeNumber(bill.unitPriceUSD, 0),
    unit_price_lak: sanitizeNumber(bill.unitPriceLAK, 0),
    discount_usd: sanitizeNumber(bill.discountUSD, 0),
    discount_lak: sanitizeNumber(bill.discountLAK, 0),
    pdi_status_initial: sanitizeText(bill.pdiStatusInitial, 30) || null,
    status_initial: bill.statusInitial || (type === 'sale' ? 'ready' : null),
    inspector_name: sanitizeText(bill.inspectorName, 100) || null,
    event_campaign: sanitizeText(bill.eventCampaign, 100) || null,
    event_start_date: sanitizeText(bill.eventStartDate, 30) || null,
    event_end_date: sanitizeText(bill.eventEndDate, 30) || null,
    event_location: sanitizeText(bill.eventLocation, 100) || null,
  };

  if (customerPayload) {
    if (type !== 'sale') {
      throw new Error('Combined customer transaction supports sales only.');
    }

    const result = await client.rpc('record_pos_sale', {
      p_customer: customerPayload,
      p_bill: billRow,
      p_item: billItem,
    });

    if (result.error) throw result.error;
    offlineSaveBill(bill);
    return;
  }

  const rpcParams: Record<string, unknown> = {
    p_bill: billRow,
    p_item: billItem,
    p_movement_type: type === 'import' ? 'stock_in' : 'stock_out',
  };
  if (vehiclePayload) {
    rpcParams.p_vehicle = vehiclePayload;
  }
  let { error } = await client.rpc('record_vehicle_bill', rpcParams);
  if (error && error.code === 'PGRST202' && vehiclePayload) {
    await saveInventoryItem(vehicle!);
    delete rpcParams.p_vehicle;
    const retry = await client.rpc('record_vehicle_bill', rpcParams);
    error = retry.error;
  }
  if (error) {
    throw new Error(error.message || 'Sale could not be saved.');
  }
  offlineSaveBill(bill);
}

export async function uploadPaymentSlip(file: File, referenceId?: string): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
    throw new Error('Payment slips must be JPG, PNG, WebP, or PDF.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Payment slips must be 10 MB or smaller before compression.');

  let targetFile = file;
  if (file.type.startsWith('image/')) {
    targetFile = await compressImageToWebP(file, { maxDimension: 1200, quality: 0.8, maxSizeBytes: 300 * 1024 });
  }

  const extension = targetFile.type === 'application/pdf'
    ? 'pdf'
    : (targetFile.type === 'image/webp' ? 'webp' : (targetFile.type === 'image/jpeg' ? 'jpg' : targetFile.type.split('/')[1]));
  
  const safeRef = referenceId ? referenceId.replace(/[^a-zA-Z0-9_-]/g, '') : newRecordId();
  const path = `sales/slip_${safeRef}_${Date.now()}.${extension}`;

  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return path;
  }

  const { error } = await requireSupabase().storage.from('payment-slips').upload(path, targetFile, {
    contentType: targetFile.type,
    upsert: false,
    cacheControl: '3600',
  });
  if (error) throw error;
  return path;
}

export async function getPaymentSlipUrl(path?: string): Promise<string> {
  if (!path || path.trim() === '') return '';
  if (!isSupabaseConfigured || path.startsWith('offline_') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const client = requireSupabase();
  const { data, error } = await client.storage.from('payment-slips').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function attachSlipToBill(billId: string, file: File): Promise<string> {
  const path = await uploadPaymentSlip(file, billId);
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return path;
  }
  const client = requireSupabase();
  const { error } = await client.from('bills').update({ payment_slip_path: path }).eq('id', billId);
  if (error) throw error;
  return path;
}

export async function saveStaffProfile(user: SystemUser) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineSaveUser(user);
    return user;
  }
  const client = requireSupabase();
  try {
    const { data, error } = await client.functions.invoke('manage-staff', {
      body: {
        action: 'update',
        userId: user.id,
        name: user.name,
        phone: user.phone,
        department: user.department,
        role: user.role,
      },
    });
    if (!error && data?.profile) {
      const mapped = mapStaffProfile(data.profile, data.permissions);
      offlineSaveUser(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('manage-staff update invocation error, trying direct update fallback:', err);
  }

  // Fallback direct table update
  const { data: updatedProfile, error: updateError } = await client
    .from('staff_profiles')
    .update({
      name: user.name,
      phone: user.phone || null,
      department: user.department || null,
      role: user.role,
      role_title: user.roleTitleLo || user.role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('id,email,name,phone,role,department,role_title,status,created_at,last_login')
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updatedProfile) {
    throw new Error('Staff profile could not be updated. Check your permissions and try again.');
  }

  const mapped = mapStaffProfile(updatedProfile, user.permissions);
  offlineSaveUser(mapped);
  return mapped;
}

export async function deactivateStaffProfile(id: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineDeactivateUser(id);
    return;
  }
  const client = requireSupabase();
  try {
    const { error } = await client.functions.invoke('manage-staff', {
      body: { action: 'suspend', userId: id },
    });
    if (!error) {
      offlineDeactivateUser(id);
      return;
    }
  } catch (err) {
    console.warn('manage-staff suspend invocation error, trying direct update fallback:', err);
  }

  const { data, error } = await client
    .from('staff_profiles')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Staff account could not be suspended. Check your permissions and try again.');
  }

  offlineDeactivateUser(id);
}

export async function reactivateStaffProfile(id: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return;
  }
  const client = requireSupabase();
  try {
    const { error } = await client.functions.invoke('manage-staff', {
      body: { action: 'reactivate', userId: id },
    });
    if (!error) return;
  } catch {}

  try {
    const { error: rpcError } = await client.rpc('reactivate_staff_profile', { p_user_id: id });
    if (!rpcError) return;
  } catch {}

  const { data, error } = await client
    .from('staff_profiles')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Staff account could not be reactivated. Check your permissions and try again.');
  }
}

export async function deleteStaffProfile(id: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineDeleteUser(id);
    return;
  }

  const client = requireSupabase();
  let edgeErrorMsg = '';

  // 1. Try edge function first (handles auth.admin.deleteUser + staff_profiles cascade)
  try {
    const { error: edgeError } = await client.functions.invoke('manage-staff', {
      body: { action: 'delete', userId: id },
    });
    if (!edgeError) {
      offlineDeleteUser(id);
      return;
    }

    edgeErrorMsg = edgeError.message;
    if (edgeError && typeof edgeError === 'object' && 'context' in edgeError) {
      const ctx = (edgeError as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (typeof ctx?.json === 'function') {
        try {
          const errBody = await ctx.json();
          if (errBody?.error) edgeErrorMsg = errBody.error;
        } catch {}
      }
    }

    // If it's a critical safety block (last admin or self delete), abort immediately with clear message
    if (edgeErrorMsg.includes('last active') || edgeErrorMsg.includes('own account')) {
      throw new Error(edgeErrorMsg);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('last active') || msg.includes('own account')) {
      throw err;
    }
    console.warn('manage-staff edge function delete failed, attempting fallbacks:', err);
  }

  // 2. Fall back to RPC delete_staff_profile if edge function is unreachable or not yet deployed
  let rpcErrorMsg = '';
  try {
    const { error: rpcError } = await client.rpc('delete_staff_profile', { p_user_id: id });
    if (!rpcError) {
      offlineDeleteUser(id);
      return;
    }
    rpcErrorMsg = rpcError.message;
    if (rpcErrorMsg.includes('last active') || rpcErrorMsg.includes('own account')) {
      throw new Error(rpcErrorMsg);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('last active') || msg.includes('own account')) {
      throw err;
    }
    console.warn('RPC delete_staff_profile failed, attempting direct table delete:', err);
  }

  // 3. Fall back to direct delete on staff_profiles table
  try {
    const { error: directError } = await client
      .from('staff_profiles')
      .delete()
      .eq('id', id);
    if (!directError) {
      offlineDeleteUser(id);
      return;
    }
  } catch (err) {
    console.warn('Direct delete staff_profiles failed:', err);
  }

  // 4. Clean up from offline store
  offlineDeleteUser(id);

  // If both server methods had definitive errors that weren't network/function 404, throw informative error
  if (edgeErrorMsg && !edgeErrorMsg.includes('Failed to send') && !edgeErrorMsg.includes('404')) {
    throw new Error(edgeErrorMsg);
  }
  if (rpcErrorMsg && !rpcErrorMsg.includes('function public.delete_staff_profile') && !rpcErrorMsg.includes('PGRST202')) {
    throw new Error(rpcErrorMsg);
  }
}

export async function updateServiceAppointment(appointment: ServiceAppointment) {
  const client = requireSupabase();
  const payload: Record<string, unknown> = {
    customer_name: appointment.customerName,
    phone: appointment.phone,
    model: appointment.model,
    plate_number: appointment.plateNumber,
    service_type: appointment.serviceType,
    scheduled_date: appointment.scheduledDate,
    scheduled_time: appointment.scheduledTime,
    status: appointment.status,
    technician: appointment.technician,
    estimated_cost_usd: appointment.estimatedCostUSD,
    battery_health_percent: appointment.batteryHealthPercent ?? null,
    mileage_km: appointment.mileageKm ?? null,
    notes: appointment.notes,
    updated_at: new Date().toISOString(),
  };
  let { error } = await client.from('service_appointments').update(payload).eq('id', appointment.id);
  if (error && error.message?.includes('mileage_km')) {
    delete payload.mileage_km;
    const retry = await client.from('service_appointments').update(payload).eq('id', appointment.id);
    error = retry.error;
  }
  if (error) throw error;
}

export async function updateTestDriveBooking(booking: TestDriveBooking) {
  const client = requireSupabase();
  const { error } = await client.from('test_drives').update({
    customer_name: booking.customerName,
    phone: booking.phone,
    model: booking.model,
    drive_date: booking.date,
    time_slot: booking.timeSlot,
    location: booking.location,
    sales_rep: booking.salesRep,
    status: booking.status,
    updated_at: new Date().toISOString(),
  }).eq('id', booking.id);
  if (error) throw error;
}

export async function deleteBill(id: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineDeleteBill(id);
    return;
  }
  const client = requireSupabase();
  const { error } = await client.rpc('delete_vehicle_bill', { p_bill_id: id });
  if (error) throw error;
}

export async function handoverStaffPendingLeads(
  fromStaff: { id: string; name: string },
  toStaff: { id: string; name: string },
  leadIds?: string[]
): Promise<number> {
  const offlineCount = offlineHandoverStaffLeads(fromStaff.name, toStaff.name, leadIds);
  if (!isSupabaseConfigured) {
    return offlineCount;
  }
  const client = requireSupabase();
  try {
    let query = client
      .from('customers')
      .update({
        assigned_to: toStaff.id,
        updated_at: new Date().toISOString(),
      });

    if (leadIds && leadIds.length > 0) {
      const validUuids = leadIds.filter(isUuid);
      if (validUuids.length > 0) {
        query = query.in('id', validUuids);
      } else {
        return offlineCount;
      }
    } else if (isUuid(fromStaff.id)) {
      query = query
        .eq('assigned_to', fromStaff.id)
        .not('status', 'in', '("delivered","lost")');
    }

    const { data, error } = await query.select('id');
    if (error) {
      console.error('Supabase handoverStaffPendingLeads error:', error.message);
      throw error;
    }
    return data?.length ?? offlineCount;
  } catch (err) {
    console.error('Supabase handoverStaffPendingLeads exception:', err);
    throw err;
  }
}

export async function generateNextBillNumber(prefix: string = 'INV'): Promise<string> {
  const currentYear = new Date().getFullYear();
  const fallback = `${prefix}-${currentYear}-${Date.now().toString().slice(-5)}`;
  if (!isSupabaseConfigured) {
    return fallback;
  }
  try {
    const client = requireSupabase();
    const { data, error } = await client.rpc('generate_next_bill_number', { p_prefix: prefix });
    if (error || !data) {
      console.warn('generate_next_bill_number RPC notice:', error?.message);
      return fallback;
    }
    return data;
  } catch (err) {
    console.warn('generate_next_bill_number RPC error:', err);
    return fallback;
  }
}
