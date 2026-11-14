import type {
  ContactLogEntry,
  InstallmentPaymentRecord,
  InventoryItem,
  InvoiceBillRecord,
  Lead,
  ServiceAppointment,
  StockLogRecord,
  SystemUser,
  TestDriveBooking,
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
  offlineSaveSettingsPatch,
  offlineSaveTestDrive,
  offlineSaveUser,
  offlineSaveVehicleModel,
  offlineSignIn,
} from './offlineStore';
import { AVATR_VEHICLES } from '../data/mockData';
import { newRecordId } from './ids';
import { normalizeRole, ROLE_LABELS, NO_ROLE_MESSAGE } from '../utils/roles';
import { showToast } from '../components/common/Toast';
import { localRangeToUtc } from '../utils/search';

const isUuid = (val?: string | null): val is string => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

async function resolveStaffUuid(client: ReturnType<typeof requireSupabase>, rawIdentifier?: string | null): Promise<string | null> {
  const val = String(rawIdentifier || '').trim();
  if (!val) return null;
  const uuidCandidate: string | undefined = val;
  if (isUuid(uuidCandidate)) return uuidCandidate;
  const lower = val.toLowerCase();
  const cachedMatch = (cachedStaffUsers || []).find(
    (u) => u.id === val || u.name?.trim().toLowerCase() === lower || u.email?.trim().toLowerCase() === lower
  );
  if (cachedMatch && isUuid(cachedMatch.id)) return cachedMatch.id;
  try {
    const { data, error } = await client.rpc('get_staff_directory');
    if (!error && Array.isArray(data)) {
      const hit = (data as DbRow[]).find(
        (row) => String(row.id) === val || String(row.name || '').trim().toLowerCase() === lower
      );
      if (hit?.id && isUuid(String(hit.id))) return String(hit.id);
    }
  } catch {
    // Fallback to caller actorId
  }
  return null;
}
import {
  sanitizeText,
  sanitizePhone,
  sanitizeVIN,
  sanitizeNumber,
  hasDangerousPatterns
} from '../utils/security';
import { compressImageToWebP } from '../utils/imageCompressor';
import { STORAGE_BUCKET_MAX_BYTES, validateUploadFile } from '../utils/fileValidation';

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

const initials = (name: string) => name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

/**
 * Accounts whose stored role is neither Admin nor Sales (old Technician / General User accounts) have no access:
 * they are shown as suspended Sales accounts until an Admin assigns a role and re-activates them.
 */
export function mapStaffProfile(profile: DbRow): SystemUser {
  const role = normalizeRole(profile.role);
  return {
    id: profile.id,
    name: (profile.name || profile.email || 'Staff').replace(/Super\s*Admin/gi, 'Admin').trim(),
    email: profile.email || '',
    phone: profile.phone || '',
    role: role || 'sales',
    dbRole: profile.role || undefined,
    roleTitleLo: ROLE_LABELS[role || 'sales'],
    department: profile.department || '',
    avatarInitials: initials(profile.name || profile.email || 'S'),
    status: profile.status === 'archived' ? 'archived' : (role && profile.status === 'active' ? 'active' : 'suspended'),
    createdAt: profile.created_at || new Date().toISOString(),
    lastLogin: profile.last_login || undefined,
  };
}

/** Role to send when saving: keep a legacy 'super_admin' as it is, since it already means Admin. */
function roleForSave(user: SystemUser): string {
  return user.role === 'admin' && user.dbRole === 'super_admin' ? 'super_admin' : user.role;
}

/**
 * Some fields need a database migration. Without it they are dropped when saving, so other accounts never see them.
 * Tell staff once per session (the console logs every time).
 */
const warnedMigrations = new Set<string>();
function warnMissingColumns(migration: string, what: string) {
  console.warn(`${what} not saved to the database; apply migration ${migration}`);
  if (warnedMigrations.has(migration)) return;
  warnedMigrations.add(migration);
  showToast(`ບັນທຶກແລ້ວ ແຕ່ ${what} ບໍ່ໄດ້ເຂົ້າຖານຂໍ້ມູນ (ບັນຊີອື່ນຈະບໍ່ເຫັນ). ກະລຸນາແຈ້ງ Admin ໃຫ້ apply migration ${migration}`, 'warning');
}

function sanitizeContactHistory(history: ContactLogEntry[]): Record<string, unknown>[] {
  return history.slice(-500).map(e => ({
    id: sanitizeText(e.id, 80),
    at: sanitizeText(e.at, 40),
    type: e.type,
    note: sanitizeText(e.note, 1000),
    by: sanitizeText(e.by, 120) || null,
  }));
}

/**
 * Contact history is shared: another account may have added entries since this copy was loaded.
 * Keep every entry already in the database, add ours, and drop only entries removed on purpose.
 */
function mergeContactHistory(mine: ContactLogEntry[], latest: ContactLogEntry[], removedIds: string[] = []): ContactLogEntry[] {
  const removed = new Set(removedIds);
  const byId = new Map<string, ContactLogEntry>();
  latest.forEach(e => { if (e?.id) byId.set(e.id, e); });
  mine.forEach(e => { if (e?.id) byId.set(e.id, e); });
  return Array.from(byId.values())
    .filter(e => !removed.has(e.id))
    .sort((a, b) => (a.at || '').localeCompare(b.at || ''));
}

let cachedVehicleModels: DbRow[] | null = null;
let cachedStaffUsers: SystemUser[] | null = null;
let activeStaffPromise: { userId: string; promise: Promise<SystemUser> } | null = null;
let cachedStaffUser: { userId: string; user: SystemUser; timestamp: number } | null = null;

export function clearStaffCache() {
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
    const profileRes = await client
      .from('staff_profiles')
      .select('id,email,name,phone,role,department,role_title,status,created_at,last_login')
      .eq('id', userId)
      .maybeSingle();

    if (profileRes.error) throw profileRes.error;
    const profile = profileRes.data;
    if (!profile || profile.status !== 'active') {
      throw new Error('This login does not have an active staff profile. Ask the administrator to set up access.');
    }
    if (!normalizeRole(profile.role)) {
      throw new Error(NO_ROLE_MESSAGE);
    }

    const mapped = mapStaffProfile(profile);
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
    const newUser: SystemUser = {
      id: `offline-user-${Date.now()}`,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      role: input.role,
      roleTitleLo: ROLE_LABELS[input.role],
      department: input.department,
      avatarInitials: (input.name || 'US').slice(0, 2).toUpperCase(),
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
  const mapped = mapStaffProfile(data.profile);
  offlineSaveUser(mapped);
  return mapped;
}

function mapVehicleModel(row: DbRow): VehicleModel {
  const colors = Array.isArray(row.colors) ? row.colors : [];
  return {
    id: row.id,
    name: row.name || row.id,
    brand: row.brand || 'AVATR',
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
    frontMotorNumber: row.front_motor_number || undefined,
    rearMotorNumber: row.rear_motor_number || undefined,
    powertrainType: row.powertrain_type === 'BEV' || row.powertrain_type === 'REEV' ? row.powertrain_type : undefined,
    incomingBatch: row.incoming_batch || undefined,
    expectedArrivalDate: row.expected_arrival_date || undefined,
    issueNote: row.issue_note || undefined,
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
    // Pipeline columns (migration 20261109120000); absent until it is applied
    nextFollowUpAt: row.next_follow_up_at || undefined,
    contactHistory: Array.isArray(row.contact_history) ? row.contact_history : undefined,
    bookingDepositUSD: row.booking_deposit_usd == null ? undefined : Number(row.booking_deposit_usd),
    bookingPaymentMethod: row.booking_payment_method || undefined,
    bookingDate: row.booking_date || undefined,
    bookingNote: row.booking_note || undefined,
    // Excel-parity columns (migration 20261110120000)
    listPriceUSD: row.list_price_usd == null ? undefined : Number(row.list_price_usd),
    discountUSD: row.discount_usd == null ? undefined : Number(row.discount_usd),
    deliveryWindow: row.delivery_window || undefined,
    giftItems: Array.isArray(row.gift_items) && row.gift_items.length > 0 ? row.gift_items : undefined,
    giftBudgetUSD: row.gift_budget_usd == null ? undefined : Number(row.gift_budget_usd),
    vehicleDeliveredAt: row.vehicle_delivered_at || undefined,
    vehicleDeliveredBy: row.vehicle_delivered_by || undefined,
    deliveryNote: row.delivery_note || undefined,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Bills store staff as account ids; show the staff name when it is known (falls back to the stored value). */
function staffNameOf(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  if (!UUID_RE.test(value)) return value;
  return cachedStaffUsers?.find(u => u.id === value)?.name || undefined;
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
    // Not a DB column: derive it so receipts and down-payment bills stay distinguishable after reload.
    installmentType: Number(row.installment_period) >= 1
      ? 'monthly_installment'
      : (row.type === 'installment' ? 'down_payment' : undefined),
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
    recordedBy: staffNameOf(row.recorded_by),
    salesRep: staffNameOf(row.sales_rep) || staffNameOf(row.recorded_by),
    notes: row.notes || undefined,
    status: (row.status as 'completed' | 'voided') || 'completed',
    isArchived: row.is_archived === true ? true : undefined,
  };
}

/**
 * Add the void reason / who / when (table bill_void_logs, migration 20261111120000_bill_void_reason) to voided bills.
 * Without that migration the bills are returned unchanged.
 */
async function attachVoidInfo(bills: InvoiceBillRecord[]): Promise<InvoiceBillRecord[]> {
  if (!isSupabaseConfigured) return bills;
  const ids = bills.filter(b => b.status === 'voided').map(b => b.id);
  if (ids.length === 0) return bills;
  const client = requireSupabase();
  const byId = new Map<string, DbRow>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await client
      .from('bill_void_logs')
      .select('bill_id,reason,voided_by_name,voided_at')
      .in('bill_id', ids.slice(i, i + 200));
    if (error) return bills; // table not created yet
    (data || []).forEach((row: DbRow) => byId.set(row.bill_id, row));
  }
  if (byId.size === 0) return bills;
  return bills.map(b => {
    const log = byId.get(b.id);
    return log ? { ...b, voidReason: log.reason, voidedBy: log.voided_by_name || undefined, voidedAt: log.voided_at } : b;
  });
}

/** Most bills one date-range query returns; reaching it means the list may be incomplete. */
export const BILL_QUERY_LIMIT = 1000;

export async function fetchBillsByDateRange(params?: {
  dateFrom?: string;
  dateTo?: string;
  includeArchived?: boolean;
}): Promise<InvoiceBillRecord[]> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return getOfflineBackendData().bills;
  }
  const client = requireSupabase();
  const pageSize = 500;
  const MAX_QUERY_LIMIT = BILL_QUERY_LIMIT; // Hard ceiling to guard browser memory from unbounded date ranges
  let offset = 0;
  const allRows: DbRow[] = [];
  const targetTable = params?.includeArchived ? 'v_bills_10_year_audit' : 'bills';
  const selectQuery = params?.includeArchived ? '*' : '*, bill_items(*)';

  while (allRows.length < MAX_QUERY_LIMIT) {
    let query = client
      .from(targetTable)
      .select(selectQuery)
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

  return attachVoidInfo(allRows.map((row: DbRow) => {
    const firstItem = Array.isArray(row.bill_items) ? row.bill_items[0] : undefined;
    return mapBill(row, firstItem);
  }));
}

export async function archiveFiscalYearBills(year: number): Promise<{
  success: boolean;
  fiscal_year: number;
  archived_bills_count: number;
  archived_items_count: number;
  archived_at: string;
}> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('archive_fiscal_year_bills', { p_year: year });
  if (error) throw error;
  return data;
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

    // The dates are calendar days in Laos time; created_at is a UTC timestamp
    const utcRange = localRangeToUtc(params?.dateFrom, params?.dateTo);
    if (utcRange.from) {
      query = query.gte('created_at', utcRange.from);
    }
    if (utcRange.to) {
      query = query.lte('created_at', utcRange.to);
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

/** Read every row of a table page by page (PostgREST returns at most ~1000 rows per request). */
async function fetchAllRows(table: 'vehicles' | 'customers'): Promise<{ data: DbRow[]; error: { message: string } | null }> {
  const client = requireSupabase();
  const pageSize = 1000;
  const rows: DbRow[] = [];
  for (let offset = 0; offset < 50000; offset += pageSize) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) return { data: rows, error };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return { data: rows, error: null };
}

export const STOCK_HISTORY_PAGE_SIZE = 100;

/**
 * One page of stock movement history, newest first, with the bill (price, customer, voided or not) and the car.
 * Bills are looked up separately: the archive keeps no foreign key from stock_movements to bills, and older
 * bills are not in the app's first 100, which used to show $0 and no customer.
 */
export async function fetchStockMovements(
  offset = 0,
  limit = STOCK_HISTORY_PAGE_SIZE,
  ctx?: { staffById?: Map<string, SystemUser>; modelById?: Map<string, VehicleModel> }
): Promise<StockLogRecord[]> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return getOfflineBackendData().stockLogs.slice(offset, offset + limit);
  }
  const client = requireSupabase();
  const { data: movements, error } = await client
    .from('stock_movements')
    .select('*, vehicles(model_id, plate_number, color)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  const rows = movements || [];

  const billIds = [...new Set(rows.map((m: DbRow) => m.bill_id).filter(Boolean))] as string[];
  const billById = new Map<string, DbRow>();
  for (let i = 0; i < billIds.length; i += 100) {
    const chunk = billIds.slice(i, i + 100);
    const { data: bills } = await client
      .from('v_bills_10_year_audit')
      .select('id,customer_name,customer_phone,payment_method,status,notes,bill_items')
      .in('id', chunk);
    (bills || []).forEach((b: DbRow) => billById.set(b.id, b));
  }

  const staffById = ctx?.staffById || new Map((cachedStaffUsers || []).map(u => [u.id, u]));
  const modelById = ctx?.modelById || new Map(((cachedVehicleModels || []).map(mapVehicleModel)).map(m => [m.id, m]));

  return rows.map((movement: DbRow): StockLogRecord => {
    const bill = billById.get(movement.bill_id);
    const items = Array.isArray(bill?.bill_items) ? bill!.bill_items : [];
    const item = items.find((it: DbRow) => it.vehicle_vin === movement.vehicle_vin) || items[0];
    const vehicle = movement.vehicles as DbRow | null;
    const model = (vehicle?.model_id && modelById.get(vehicle.model_id)?.name) || item?.model_name;
    const staff = staffById.get(movement.recorded_by);
    return {
      id: movement.id,
      billId: movement.bill_id || undefined,
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
      billVoided: bill?.status === 'voided' || undefined,
    };
  });
}

let activeLoadBackendPromise: Promise<BackendData> | null = null;
let activeTier1Listeners: Array<(initial: Partial<BackendData>) => void> = [];
let latestTier1Payload: Partial<BackendData> | null = null;

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

  if (activeLoadBackendPromise) {
    if (onInitialTierLoaded) {
      if (latestTier1Payload) {
        try { onInitialTierLoaded(latestTier1Payload); } catch (_) {}
      } else {
        activeTier1Listeners.push(onInitialTierLoaded);
      }
    }
    return activeLoadBackendPromise;
  }

  if (onInitialTierLoaded) {
    activeTier1Listeners.push(onInitialTierLoaded);
  }

  activeLoadBackendPromise = (async () => {
    try {
      const client = requireSupabase();

      // Tier 1: Core showroom catalog & leads (1-RTT RPC with fallback for fast initial paint)
      let modelsData: DbRow[] = [];
      let inventoryData: DbRow[] = [];
      let customersData: DbRow[] = [];
      let settingsConfig: Record<string, unknown> = {};

      const [rpcInit, profilesResult, directoryResult] = await Promise.all([
        client.rpc('get_showroom_initial_data'),
        client.from('staff_profiles').select('id,email,name,phone,role,department,role_title,status,created_at,last_login'),
        client.rpc('get_staff_directory'),
      ]);

      if (!rpcInit.error && rpcInit.data) {
        modelsData = rpcInit.data.models || [];
        inventoryData = rpcInit.data.vehicles || [];
        customersData = rpcInit.data.customers || [];
        settingsConfig = rpcInit.data.settings?.config || rpcInit.data.settings || {};
      } else {
        // Graceful fallback to individual queries if RPC is not available
        const [modelsResult, inventoryResult, customersResult, settingsResult] = await Promise.all([
          cachedVehicleModels
            ? Promise.resolve({ data: cachedVehicleModels, error: null })
            : client.from('vehicle_models').select('id,name,subtitle,tagline,category,price_starting_usd,price_starting_lak,is_custom,colors,features,description,created_at').order('name'),
          // Every account must see the whole stock and customer list, so no 100-row cap here
          fetchAllRows('vehicles'),
          fetchAllRows('customers'),
          client.from('dealership_settings').select('config').eq('id', true).maybeSingle(),
        ]);

        if (modelsResult.error) throw modelsResult.error;
        if (inventoryResult.error) throw inventoryResult.error;
        if (customersResult.error) throw customersResult.error;

        modelsData = modelsResult.data || [];
        inventoryData = inventoryResult.data || [];
        customersData = customersResult.data || [];
        settingsConfig = settingsResult.data?.config || {};
      }

      const profiles = profilesResult.error ? [] : (profilesResult.data || []);
      const directoryRows = directoryResult.error ? [] : ((directoryResult.data as DbRow[]) || []);
      const mergedProfilesById = new Map<string, DbRow>();
      for (const dirRow of directoryRows) {
        if (dirRow?.id) mergedProfilesById.set(String(dirRow.id), dirRow);
      }
      for (const profRow of profiles) {
        if (profRow?.id) mergedProfilesById.set(String(profRow.id), { ...(mergedProfilesById.get(String(profRow.id)) || {}), ...profRow });
      }
      if (modelsData.length > 0) cachedVehicleModels = modelsData;
      const users = Array.from(mergedProfilesById.values()).map((row: DbRow) => mapStaffProfile(row));
      if (users.length > 0) cachedStaffUsers = users;
      const staffById = new Map(users.map((user) => [user.id, user]));
      const dbModels = modelsData.map(mapVehicleModel);
      const models = dbModels.length > 0 ? dbModels : AVATR_VEHICLES;
      const modelById = new Map(models.map((model) => [model.id, model]));
      // Cars whose import bill was voided stay in the database for history but are not stock
      const inventory = inventoryData
        .filter((row: DbRow) => row.status !== 'removed')
        .map((row: DbRow) => mapInventoryItem(row, modelById));
      const leads = customersData.map((row: DbRow) => mapLead(row, modelById, staffById));

      // Yield Tier 1 immediately to all listeners
      const tier1Payload = {
        users,
        vehicles: models,
        inventory,
        leads,
        settings: settingsConfig,
      };
      latestTier1Payload = tier1Payload;
      for (const listener of activeTier1Listeners) {
        try { listener(tier1Payload); } catch (_) {}
      }

      // Tier 2: Transactional logs, appointments, test drives, and bills (Paginated to 100 most recent records)
      const [billsResult, movementsResult, servicesResult, testDrivesResult] = await Promise.all([
        client.from('bills').select('*, bill_items(*)').order('bill_date', { ascending: false }).range(0, 99),
        fetchStockMovements(0, STOCK_HISTORY_PAGE_SIZE, { staffById, modelById })
          .then(data => ({ data, error: null as { message: string } | null }))
          .catch((error: { message?: string }) => ({ data: [] as StockLogRecord[], error: { message: error?.message || 'stock history' } })),
        // Latest 100 (upcoming and recent). Ascending order would keep only the oldest 100 and hide new bookings.
        client.from('service_appointments').select('*').order('scheduled_date', { ascending: false }).range(0, 99),
        client.from('test_drives').select('*').order('drive_date', { ascending: false }).range(0, 99),
      ]);

      if (billsResult.error) throw billsResult.error;

      const bills = await attachVoidInfo((billsResult.data || []).map((row: DbRow) => {
        const firstItem = Array.isArray(row.bill_items) ? row.bill_items[0] : undefined;
        return mapBill(row, firstItem);
      }));
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
      const stockLogs: StockLogRecord[] = movementsResult.error ? [] : movementsResult.data;

      const schemaWarnings: string[] = [];
      if (!rpcInit.error && (customersData.length === 250 || inventoryData.length === 500)) {
        schemaWarnings.push('ຖານຂໍ້ມູນສົ່ງລູກຄ້າໄດ້ສູງສຸດ 250 ຄົນ / ລົດ 500 ຄັນ: ຂໍ້ມູນທີ່ເກີນຈະບໍ່ສະແດງ. ກະລຸນາ apply migration 20261110120000_excel_parity_fields.');
      }
      if (customersData.length > 0 && !('contact_history' in customersData[0])) {
        schemaWarnings.push('ຖານຂໍ້ມູນຍັງບໍ່ມີຖັນປະຫວັດການຕິດຕໍ່/ມັດຈຳ/ສົ່ງມອບ: ກະລຸນາ apply migration 20261109120000_customer_pipeline_fields.');
      } else if (customersData.length > 0 && !('gift_items' in customersData[0])) {
        schemaWarnings.push('ຖານຂໍ້ມູນຍັງບໍ່ມີຖັນລາຄາ/ຂອງແຖມ ຂອງລູກຄ້າ: ກະລຸນາ apply migration 20261110120000_excel_parity_fields.');
      }
      if (inventoryData.length > 0 && !('front_motor_number' in inventoryData[0])) {
        schemaWarnings.push('ຖານຂໍ້ມູນຍັງບໍ່ມີຖັນເລກມໍເຕີ/ລອດ ຂອງລົດ: ກະລຸນາ apply migration 20261110120000_excel_parity_fields.');
      }

      const warnings = [
        ...schemaWarnings,
        profilesResult.error ? `Staff profiles could not be loaded: ${profilesResult.error.message}` : null,
        movementsResult.error ? `Stock movements could not be loaded: ${movementsResult.error.message}` : null,
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
      latestTier1Payload = null;
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
  await validateUploadFile(file, { allowedMimes: ['image/jpeg', 'image/png', 'image/webp'] });

  const targetFile = await compressImageToWebP(file, { maxDimension: 1200, quality: 0.8, maxSizeBytes: 300 * 1024 });
  const validatedTarget = await validateUploadFile(targetFile, {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxImageBytes: STORAGE_BUCKET_MAX_BYTES,
  });
  const extension = validatedTarget.extension;

  const client = requireSupabase();
  const path = `${folder}/${newRecordId()}.${extension}`;
  const { error } = await client.storage.from('dealership-assets').upload(path, targetFile, {
    contentType: validatedTarget.mime,
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

export async function saveDealershipSettingsPatch(patch: Record<string, unknown>, _actorId: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return offlineSaveSettingsPatch(patch);
  }
  const client = requireSupabase();
  const { data, error } = await client.rpc('patch_dealership_settings', { p_patch: patch });
  if (error) throw error;
  return (data || patch) as Record<string, unknown>;
}

/** Saves a customer and returns the saved copy (its contact history merged with the latest one in the database). */
export async function saveLead(
  lead: Lead,
  assignedStaffId: string,
  saleBill?: InvoiceBillRecord,
  options?: { removedContactIds?: string[] }
): Promise<Lead> {
  if (saleBill && !isSupabaseConfigured) {
    throw new Error(
      'Atomic POS sales require Supabase. Offline mode is demo-only.'
    );
  }
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineSaveLead(lead);
    return lead;
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
      modelId = matched?.id || null;
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
    finalAssignedStaffId = await resolveStaffUuid(client, lead.assignedTo);
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

  // Pipeline columns (migration 20261109120000_customer_pipeline_fields)
  const pipelineLeadPayload: Record<string, unknown> = {
    ...extendedLeadPayload,
    next_follow_up_at: sanitizeText(lead.nextFollowUpAt, 10) || null,
    contact_history: sanitizeContactHistory(Array.isArray(lead.contactHistory) ? lead.contactHistory : []),
    booking_deposit_usd: lead.bookingDepositUSD != null ? sanitizeNumber(lead.bookingDepositUSD, 0) : null,
    booking_payment_method: lead.bookingPaymentMethod === 'cash' || lead.bookingPaymentMethod === 'transfer' ? lead.bookingPaymentMethod : null,
    booking_date: sanitizeText(lead.bookingDate, 10) || null,
    booking_note: sanitizeText(lead.bookingNote, 500) || null,
    vehicle_delivered_at: sanitizeText(lead.vehicleDeliveredAt, 10) || null,
    vehicle_delivered_by: sanitizeText(lead.vehicleDeliveredBy, 120) || null,
    delivery_note: sanitizeText(lead.deliveryNote, 1000) || null,
  };

  // Excel-parity columns (migration 20261110120000_excel_parity_fields)
  const parityLeadPayload: Record<string, unknown> = {
    ...pipelineLeadPayload,
    list_price_usd: lead.listPriceUSD != null ? sanitizeNumber(lead.listPriceUSD, 0) : null,
    discount_usd: lead.discountUSD != null ? sanitizeNumber(lead.discountUSD, 0) : null,
    delivery_window: sanitizeText(lead.deliveryWindow, 120) || null,
    gift_items: Array.isArray(lead.giftItems)
      ? lead.giftItems.slice(0, 30)
          .map(g => ({ name: sanitizeText(g.name, 120), costUSD: sanitizeNumber(g.costUSD, 0) }))
          .filter(g => g.name)
      : [],
    gift_budget_usd: lead.giftBudgetUSD != null ? sanitizeNumber(lead.giftBudgetUSD, 0) : null,
  };

  if (saleBill) {
    await saveBillRecord(
      { ...saleBill, leadId: saleBill.leadId || safeLeadId },
      assignedStaffId,
      undefined,
      parityLeadPayload
    );
    offlineSaveLead({ ...lead, id: safeLeadId });
    return { ...lead, id: safeLeadId };
  }

  const sanitizedHistory = sanitizeContactHistory(Array.isArray(lead.contactHistory) ? lead.contactHistory : []);
  parityLeadPayload.contact_history = sanitizedHistory;

  const { data: rpcResult, error } = await client.rpc('upsert_customer_pipeline', {
    p_customer: parityLeadPayload,
    p_removed_contact_ids: options?.removedContactIds || [],
  });
  if (error) throw error;

  const returnedHistory = Array.isArray(rpcResult?.contact_history)
    ? (rpcResult.contact_history as ContactLogEntry[])
    : (options?.removedContactIds?.length
        ? (Array.isArray(lead.contactHistory) ? lead.contactHistory : []).filter(e => !options.removedContactIds!.includes(e.id))
        : (Array.isArray(lead.contactHistory) ? lead.contactHistory : []));

  const saved: Lead = { ...lead, id: safeLeadId, contactHistory: returnedHistory };
  offlineSaveLead(saved);
  return saved;
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
  const { error } = await requireSupabase().rpc('upsert_customer_pipeline', {
    p_customer: {
      id,
      status,
      last_follow_up: new Date().toISOString(),
    },
    p_removed_contact_ids: [],
  });
  if (error) throw error;
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
    reserved_for_customer: isUuid(item.reservedForCustomer) ? item.reservedForCustomer : null,
    arrival_date: sanitizeText(item.arrivalDate, 30) || null,
    mileage_km: sanitizeNumber(item.mileageKm, 0),
    event_campaign: sanitizeText(item.eventCampaign, 100) || null,
    event_start_date: sanitizeText(item.eventStartDate, 30) || null,
    event_end_date: sanitizeText(item.eventEndDate, 30) || null,
    event_location: sanitizeText(item.eventLocation, 100) || null,
    promotion_discount_usd: sanitizeNumber(item.promotionDiscountUSD, 0),
    promotion_notes: sanitizeText(item.promotionNotes, 500) || null,
  };
  // Excel-parity columns (migration 20261110120000_excel_parity_fields)
  const parityKeys = ['front_motor_number', 'rear_motor_number', 'powertrain_type', 'incoming_batch', 'expected_arrival_date', 'issue_note'];
  Object.assign(payload, {
    front_motor_number: sanitizeText(item.frontMotorNumber, 60) || null,
    rear_motor_number: sanitizeText(item.rearMotorNumber, 60) || null,
    powertrain_type: item.powertrainType === 'BEV' || item.powertrainType === 'REEV' ? item.powertrainType : null,
    incoming_batch: sanitizeText(item.incomingBatch, 120) || null,
    expected_arrival_date: sanitizeText(item.expectedArrivalDate, 10) || null,
    issue_note: sanitizeText(item.issueNote, 1000) || null,
  });
  let { error } = await client.from('vehicles').upsert(payload, { onConflict: 'vin' });
  if (error && parityKeys.some(k => error!.message?.includes(k))) {
    warnMissingColumns('20261110120000_excel_parity_fields', 'ເລກມໍເຕີ/ລອດ/ກຳນົດມາຮອດ ຂອງລົດ');
    parityKeys.forEach(k => delete payload[k]);
    ({ error } = await client.from('vehicles').upsert(payload, { onConflict: 'vin' }));
  }
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
  const modelPayload: Record<string, unknown> = {
    id: model.id,
    name: model.name,
    brand: sanitizeText(model.brand, 60) || 'AVATR',
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
  };
  let { error } = await client.from('vehicle_models').upsert(modelPayload, { onConflict: 'id' });
  if (error && error.message?.includes('brand')) {
    // migration 20261110120000 not applied yet
    delete modelPayload.brand;
    ({ error } = await client.from('vehicle_models').upsert(modelPayload, { onConflict: 'id' }));
  }
  if (error) throw error;
  cachedVehicleModels = null;
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
  cachedVehicleModels = null;
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

  if (type === 'installment') {
    throw new Error('Installment receipts must be recorded via recordInstallmentPayment.');
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
      const { error: upsertModelError } = await client.from('vehicle_models').upsert({
        id: fallbackId,
        name: vehicle.model || 'AVATR',
        category: 'EV',
        price_starting_usd: vehicle.priceUSD || 45000,
        price_starting_lak: vehicle.priceLAK || null,
      }, { onConflict: 'id' });
      if (upsertModelError) throw upsertModelError;
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
      front_motor_number: sanitizeText(vehicle.frontMotorNumber, 60) || null,
      rear_motor_number: sanitizeText(vehicle.rearMotorNumber, 60) || null,
      powertrain_type: vehicle.powertrainType === 'BEV' || vehicle.powertrainType === 'REEV' ? vehicle.powertrainType : null,
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
      reserved_for_customer: isUuid(vehicle.reservedForCustomer) ? vehicle.reservedForCustomer : null,
      arrival_date: arrivalDateIso,
      mileage_km: sanitizeNumber(vehicle.mileageKm, 0),
      incoming_batch: sanitizeText(vehicle.incomingBatch, 120) || null,
      expected_arrival_date: sanitizeText(vehicle.expectedArrivalDate, 10) || null,
      issue_note: sanitizeText(vehicle.issueNote, 1000) || null,
      event_campaign: sanitizeText(vehicle.eventCampaign, 100) || null,
      event_start_date: eventStartIso,
      event_end_date: eventEndIso,
      event_location: sanitizeText(vehicle.eventLocation, 100) || null,
      promotion_discount_usd: sanitizeNumber(vehicle.promotionDiscountUSD, 0),
      promotion_notes: sanitizeText(vehicle.promotionNotes, 500) || null,
    };
  }

  const resolvedSalesRep = (await resolveStaffUuid(client, bill.salesRep)) || actorId;

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
    sales_rep: resolvedSalesRep,
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
  const { error } = await client.rpc('record_vehicle_bill', rpcParams);
  if (error) {
    throw new Error(error.message || 'Sale could not be saved.');
  }
  offlineSaveBill(bill);
}

export async function uploadPaymentSlip(file: File, referenceId?: string): Promise<string> {
  const validated = await validateUploadFile(file, {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  });

  let targetFile = file;
  if (validated.mime !== 'application/pdf') {
    targetFile = await compressImageToWebP(file, { maxDimension: 1200, quality: 0.8, maxSizeBytes: 300 * 1024 });
  }

  const validatedTarget = await validateUploadFile(targetFile, {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxImageBytes: STORAGE_BUCKET_MAX_BYTES,
    maxPdfBytes: STORAGE_BUCKET_MAX_BYTES,
  });
  const extension = validatedTarget.extension;
  
  const safeRef = referenceId ? referenceId.replace(/[^a-zA-Z0-9_-]/g, '') : newRecordId();
  const path = `sales/slip_${safeRef}_${Date.now()}.${extension}`;

  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return path;
  }

  const { error } = await requireSupabase().storage.from('payment-slips').upload(path, targetFile, {
    contentType: validatedTarget.mime,
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
  const { error } = await client.rpc('attach_bill_payment_slip', {
    p_bill_id: billId,
    p_slip_path: path,
  });
  if (error) throw error;
  return path;
}

interface ParsedEdgeError {
  message: string;
  unavailable: boolean;
}

async function parseEdgeError(edgeError: unknown): Promise<ParsedEdgeError> {
  const errObj = (edgeError && typeof edgeError === 'object')
    ? edgeError as { name?: string; message?: string; context?: { status?: number; json?: () => Promise<{ error?: string }> } }
    : {};
  let message = errObj.message || 'Edge function call failed';
  const status = typeof errObj.context?.status === 'number' ? errObj.context.status : undefined;
  if (typeof errObj.context?.json === 'function') {
    try {
      const body = await errObj.context.json();
      if (body?.error) message = body.error;
    } catch {}
  }
  const unavailable =
    status === 404 ||
    errObj.name === 'FunctionsFetchError' ||
    message.includes('Failed to send') ||
    message.includes('404');
  return { message, unavailable };
}

export async function saveStaffProfile(user: SystemUser) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineSaveUser(user);
    return user;
  }
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('manage-staff', {
    body: {
      action: 'update',
      userId: user.id,
      name: user.name,
      phone: user.phone,
      department: user.department,
      role: roleForSave(user),
    },
  });
  if (!error && data?.profile) {
    const mapped = mapStaffProfile(data.profile);
    cachedStaffUsers = null;
    offlineSaveUser(mapped);
    return mapped;
  }
  if (error) {
    const parsed = await parseEdgeError(error);
    if (!parsed.unavailable) {
      throw new Error(parsed.message);
    }
    const { data: authData } = await client.auth.getUser();
    if (authData?.user?.id === user.id) {
      const { error: selfErr } = await client.rpc('update_own_staff_profile', {
        p_name: user.name,
        p_phone: user.phone || null,
        p_department: user.department || null,
      });
      if (selfErr) throw selfErr;
      const mapped = { ...user, roleTitleLo: ROLE_LABELS[user.role] };
      cachedStaffUsers = null;
      offlineSaveUser(mapped);
      return mapped;
    }
    throw new Error(parsed.message || 'Staff profile update requires the manage-staff Edge Function.');
  }

  throw new Error('Staff profile could not be updated. Check your permissions and try again.');
}

export async function deactivateStaffProfile(id: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineDeactivateUser(id);
    return;
  }
  const client = requireSupabase();
  const { error: edgeError } = await client.functions.invoke('manage-staff', {
    body: { action: 'suspend', userId: id },
  });
  if (!edgeError) {
    cachedStaffUsers = null;
    offlineDeactivateUser(id);
    return;
  }
  const parsed = await parseEdgeError(edgeError);
  throw new Error(parsed.message || 'Staff account could not be suspended.');
}

export async function reactivateStaffProfile(id: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return;
  }
  const client = requireSupabase();
  const { error: edgeError } = await client.functions.invoke('manage-staff', {
    body: { action: 'reactivate', userId: id },
  });
  if (!edgeError) {
    cachedStaffUsers = null;
    return;
  }
  const parsed = await parseEdgeError(edgeError);
  if (!parsed.unavailable) {
    throw new Error(parsed.message);
  }

  const { error: rpcError } = await client.rpc('reactivate_staff_profile', { p_user_id: id });
  if (!rpcError) {
    cachedStaffUsers = null;
    return;
  }

  throw new Error(rpcError.message || parsed.message || 'Staff account could not be reactivated.');
}

export async function deleteStaffProfile(id: string) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineDeleteUser(id);
    return;
  }

  const client = requireSupabase();

  // 1. Try edge function first (soft-archives account, bans login, revokes sessions)
  const { error: edgeError } = await client.functions.invoke('manage-staff', {
    body: { action: 'delete', userId: id },
  });
  if (!edgeError) {
    cachedStaffUsers = null;
    offlineDeleteUser(id);
    return;
  }

  const parsed = await parseEdgeError(edgeError);
  if (!parsed.unavailable) {
    throw new Error(parsed.message);
  }
  console.warn('manage-staff edge function unavailable, attempting RPC fallback:', parsed.message);

  // 2. Fall back to RPC delete_staff_profile only if edge function is unreachable or not yet deployed
  const { error: rpcError } = await client.rpc('delete_staff_profile', { p_user_id: id });
  if (!rpcError) {
    cachedStaffUsers = null;
    offlineDeleteUser(id);
    return;
  }

  throw new Error(rpcError.message || parsed.message || 'Staff account could not be deleted.');
}

export async function updateServiceAppointment(appointment: ServiceAppointment) {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineSaveService(appointment);
    return;
  }
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

export interface BillVoidInfo {
  voidReason: string;
  voidedBy: string;
  voidedAt: string;
  revertedCustomerId?: string | null;
}

/** Void a bill (Admin only). A reason is required and is stored with who voided it and when. */
export async function deleteBill(id: string, reason: string, actorName: string): Promise<BillVoidInfo> {
  const cleanReason = sanitizeText(reason, 1000);
  if (cleanReason.trim().length < 3) throw new Error('ກະລຸນາໃສ່ເຫດຜົນການຍົກເລີກບິນ (ຢ່າງໜ້ອຍ 3 ຕົວອັກສອນ)');
  const fallbackInfo: BillVoidInfo = { voidReason: cleanReason, voidedBy: actorName, voidedAt: new Date().toISOString() };
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    offlineDeleteBill(id);
    return fallbackInfo;
  }
  const client = requireSupabase();
  const { data, error } = await client.rpc('void_bill_with_reason', { p_bill_id: id, p_reason: cleanReason });
  if (error) throw error;
  return {
    voidReason: data?.reason || cleanReason,
    voidedBy: data?.voided_by_name || actorName,
    voidedAt: data?.voided_at || fallbackInfo.voidedAt,
    revertedCustomerId: data?.reverted_customer_id || null,
  };
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
  if (!isUuid(toStaff.id)) {
    throw new Error('Target staff ID must be a valid UUID.');
  }
  const validLeadUuids = (leadIds || []).filter(isUuid);
  if (leadIds && leadIds.length > 0 && validLeadUuids.length === 0) {
    return offlineCount;
  }
  const { data, error } = await client.rpc('handover_staff_leads', {
    p_from_staff_id: isUuid(fromStaff.id) ? fromStaff.id : null,
    p_to_staff_id: toStaff.id,
    p_lead_ids: validLeadUuids.length > 0 ? validLeadUuids : null,
  });
  if (error) {
    console.error('Supabase handoverStaffPendingLeads error:', error.message);
    throw error;
  }
  return typeof data === 'number' ? data : Number(data) || offlineCount;
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

export interface InstallmentPaymentInput {
  paidAmountUSD?: number;
  paidAmountLAK?: number;
  paidDate?: string;
  paymentMethod?: 'cash' | 'transfer' | string;
  bankName?: string;
  transferRef?: string;
  notes?: string;
}

export interface InstallmentPaymentResult {
  billId: string;
  billNumber: string;
  paidAmountUSD: number;
  paidAmountLAK: number;
  installmentStatus: Lead['installmentStatus'];
  updatedRecords: InstallmentPaymentRecord[];
}

export async function recordInstallmentPayment(
  customerId: string,
  period: number,
  payment: InstallmentPaymentInput,
): Promise<InstallmentPaymentResult> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    const data = getOfflineBackendData();
    const lead = data.leads.find((l) => l.id === customerId);
    const records = Array.isArray(lead?.installmentRecords) ? [...lead.installmentRecords] : [];
    const billId = newRecordId();
    const billNumber = `INS-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const updatedRecords = records.map((rec) =>
      rec.period === period
        ? {
            ...rec,
            status: 'paid' as const,
            paidDate: payment.paidDate || new Date().toISOString().slice(0, 10),
            paidAmountUSD: payment.paidAmountUSD ?? rec.amountUSD,
            paidAmountLAK: payment.paidAmountLAK ?? rec.amountLAK,
            paymentMethod: (payment.paymentMethod === 'cash' ? 'cash' : 'transfer') as 'cash' | 'transfer',
            bankName: payment.bankName,
            transferRef: payment.transferRef,
            receiptNo: billNumber,
            notes: payment.notes,
          }
        : rec,
    );
    const paidUSD = updatedRecords.filter((r) => r.status === 'paid').reduce((s, r) => s + (r.paidAmountUSD ?? r.amountUSD), 0);
    const paidLAK = updatedRecords.filter((r) => r.status === 'paid').reduce((s, r) => s + (r.paidAmountLAK ?? r.amountLAK), 0);
    const allPaid = updatedRecords.length > 0 && updatedRecords.every((r) => r.status === 'paid');
    const installmentStatus: Lead['installmentStatus'] = allPaid ? 'completed' : 'active_repaying';
    if (lead) {
      offlineSaveLead({ ...lead, installmentRecords: updatedRecords, paidAmountUSD: paidUSD, paidAmountLAK: paidLAK, installmentStatus });
    }
    return { billId, billNumber, paidAmountUSD: paidUSD, paidAmountLAK: paidLAK, installmentStatus, updatedRecords };
  }

  const client = requireSupabase();
  const payload = {
    paidAmountUSD: payment.paidAmountUSD != null ? sanitizeNumber(payment.paidAmountUSD, 0) : undefined,
    paidAmountLAK: payment.paidAmountLAK != null ? sanitizeNumber(payment.paidAmountLAK, 0) : undefined,
    paidDate: sanitizeText(payment.paidDate, 20) || undefined,
    paymentMethod: payment.paymentMethod === 'cash' ? 'cash' : 'transfer',
    bankName: sanitizeText(payment.bankName, 100) || undefined,
    transferRef: sanitizeText(payment.transferRef, 100) || undefined,
    notes: sanitizeText(payment.notes, 1000) || undefined,
  };
  const { data, error } = await client.rpc('record_installment_payment', {
    p_customer_id: customerId,
    p_period: period,
    p_payment: payload,
  });
  if (error) throw error;
  return {
    billId: String(data?.bill_id || ''),
    billNumber: String(data?.bill_number || ''),
    paidAmountUSD: Number(data?.paid_amount_usd) || 0,
    paidAmountLAK: Number(data?.paid_amount_lak) || 0,
    installmentStatus: (data?.installment_status || 'active_repaying') as Lead['installmentStatus'],
    updatedRecords: Array.isArray(data?.updated_records) ? (data.updated_records as InstallmentPaymentRecord[]) : [],
  };
}

export async function revertInstallmentPayment(
  customerId: string,
  period: number,
  reason?: string,
): Promise<{
  updatedRecords: InstallmentPaymentRecord[];
  paidAmountUSD: number;
  paidAmountLAK: number;
  voidedBillIds: string[];
}> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    const data = getOfflineBackendData();
    const lead = data.leads.find((l) => l.id === customerId);
    const updatedRecords = (lead?.installmentRecords || []).map((rec) =>
      rec.period === period
        ? { period: rec.period, dueDate: rec.dueDate, amountUSD: rec.amountUSD, amountLAK: rec.amountLAK, principalUSD: rec.principalUSD, interestUSD: rec.interestUSD, status: 'pending' as const }
        : rec,
    );
    const paidAmountUSD = updatedRecords.filter((r) => r.status === 'paid').reduce((s, r) => s + (r.paidAmountUSD ?? r.amountUSD), 0);
    const paidAmountLAK = updatedRecords.filter((r) => r.status === 'paid').reduce((s, r) => s + (r.paidAmountLAK ?? r.amountLAK), 0);
    if (lead) {
      offlineSaveLead({ ...lead, installmentRecords: updatedRecords, paidAmountUSD, paidAmountLAK, installmentStatus: 'active_repaying', isPaymentCompleted: false });
    }
    return { updatedRecords, paidAmountUSD, paidAmountLAK, voidedBillIds: [] };
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc('revert_installment_payment', {
    p_customer_id: customerId,
    p_period: period,
    p_reason: sanitizeText(reason || 'Payment reverted', 500),
  });
  if (error) throw error;
  return {
    updatedRecords: Array.isArray(data?.updated_records) ? (data.updated_records as InstallmentPaymentRecord[]) : [],
    paidAmountUSD: Number(data?.paid_amount_usd) || 0,
    paidAmountLAK: Number(data?.paid_amount_lak) || 0,
    voidedBillIds: Array.isArray(data?.voided_bill_ids) ? (data.voided_bill_ids as string[]) : [],
  };
}

export async function confirmInstallmentPayoff(
  customerId: string,
  notes?: string,
): Promise<Record<string, unknown> | null> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    const data = getOfflineBackendData();
    const lead = data.leads.find((l) => l.id === customerId);
    if (lead) {
      offlineSaveLead({
        ...lead,
        installmentStatus: 'completed',
        isPaymentCompleted: true,
        status: 'delivered',
        paymentTypeConfirmed: 'installment_completed',
        paidDate: new Date().toISOString().slice(0, 10),
        notes: notes || lead.notes,
      });
    }
    return null;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc('confirm_installment_payoff', {
    p_customer_id: customerId,
    p_notes: sanitizeText(notes, 1000) || null,
  });
  if (error) throw error;
  return (data as Record<string, unknown>) || null;
}

export interface CustomerPaymentConfirmationInput {
  paidAmountUSD: number;
  paidAmountLAK: number;
  installmentStatus?: Lead['installmentStatus'];
  paymentDate?: string;
  paymentMethodRef?: string;
  paymentBank?: string;
  paymentReceiptNo?: string;
  paymentConfirmedBy?: string;
  paymentTypeConfirmed?: Lead['paymentTypeConfirmed'];
  notes?: string;
}

export async function confirmCustomerPayment(
  customerId: string,
  payment: CustomerPaymentConfirmationInput,
): Promise<Record<string, unknown> | null> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    const data = getOfflineBackendData();
    const lead = data.leads.find((l) => l.id === customerId);
    if (lead) {
      offlineSaveLead({
        ...lead,
        status: 'delivered',
        ...payment,
        isPaymentCompleted: payment.paymentTypeConfirmed === 'full' ? true : lead.isPaymentCompleted,
      });
    }
    return null;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc('confirm_customer_payment', {
    p_customer_id: customerId,
    p_payment: {
      paidAmountUSD: sanitizeNumber(payment.paidAmountUSD, 0),
      paidAmountLAK: sanitizeNumber(payment.paidAmountLAK, 0),
      installmentStatus: payment.installmentStatus || null,
      paymentDate: sanitizeText(payment.paymentDate, 40) || null,
      paymentMethodRef: sanitizeText(payment.paymentMethodRef, 120) || null,
      paymentBank: sanitizeText(payment.paymentBank, 100) || null,
      paymentReceiptNo: sanitizeText(payment.paymentReceiptNo, 100) || null,
      paymentConfirmedBy: sanitizeText(payment.paymentConfirmedBy, 120) || null,
      paymentTypeConfirmed: payment.paymentTypeConfirmed || null,
      notes: sanitizeText(payment.notes, 1000) || null,
    },
  });
  if (error) throw error;
  return (data as Record<string, unknown>) || null;
}

export async function updateBillAfterSales(
  billId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured) {
    requireOfflineDemo();
    return;
  }
  const client = requireSupabase();
  const { error } = await client.rpc('update_bill_after_sales', {
    p_bill_id: billId,
    p_payload: payload,
  });
  if (error) throw error;
}

export interface DashboardSalesSummary {
  totalUnits: number;
  vehicleSalesRevenueUSD: number;
  monthlyInstallmentCollectedUSD: number;
}

export async function fetchDashboardSalesSummary(
  period: 'day' | 'week' | 'month' | 'year' = 'month',
  targetDate?: string,
): Promise<DashboardSalesSummary | null> {
  if (!isSupabaseConfigured) {
    return null;
  }
  try {
    const client = requireSupabase();
    const { data, error } = await client.rpc('get_dashboard_sales_summary', {
      p_period: period,
      p_target_date: targetDate || new Date().toLocaleDateString('en-CA'),
    });
    if (error || !data) {
      if (error) console.warn('get_dashboard_sales_summary notice:', error.message);
      return null;
    }
    return {
      totalUnits: Number(data.total_units) || 0,
      vehicleSalesRevenueUSD: Number(data.vehicle_sales_revenue_usd) || 0,
      monthlyInstallmentCollectedUSD: Number(data.monthly_installment_collected_usd) || 0,
    };
  } catch (err) {
    console.warn('Failed to fetch dashboard sales summary:', err);
    return null;
  }
}
