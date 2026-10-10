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
import { requireSupabase } from './client';
import { newRecordId } from './ids';
import {
  sanitizeText,
  sanitizePhone,
  sanitizeVIN,
  sanitizeNumber,
  hasDangerousPatterns
} from '../utils/security';

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
  super_admin: 'Super Admin',
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
    name: profile.name || profile.email || 'Staff',
    email: profile.email || '',
    phone: profile.phone || '',
    role,
    roleTitleLo: roleLabels[role] || roleLabels.general_user,
    department: profile.department || '',
    avatarInitials: initials(profile.name || profile.email || 'S'),
    permissions: rolePermissions(permissionRow),
    status: profile.status === 'active' ? 'active' : 'suspended',
    createdAt: profile.created_at || new Date().toISOString(),
    lastLogin: profile.last_login || undefined,
  };
}

export async function getSignedInStaff(userId: string): Promise<SystemUser> {
  const client = requireSupabase();
  const { data: profile, error: profileError } = await client
    .from('staff_profiles')
    .select('id,email,name,phone,role,department,role_title,status,created_at,last_login')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || profile.status !== 'active') {
    throw new Error('This login does not have an active staff profile. Ask the administrator to set up access.');
  }

  const { data: roleRow, error: roleError } = await client
    .from('staff_roles')
    .select('role_code,permissions')
    .eq('role_code', profile.role)
    .maybeSingle();

  if (roleError) throw roleError;
  return mapStaffProfile(profile, roleRow?.permissions);
}

export async function signInStaff(email: string, password: string): Promise<SystemUser> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
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
}): Promise<SystemUser> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke('create-staff', { body: input });
  if (error) throw error;
  if (!data?.profile) throw new Error('The account was invited, but no staff profile was returned.');
  return mapStaffProfile(data.profile, data.permissions);
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
    category: row.category || 'walk_in',
    source: row.source || undefined,
    interestedModel: modelById.get(row.interested_model_id)?.name || row.interested_model_id || '',
    status: row.status || 'new',
    priority: row.priority || 'normal',
    notes: row.notes || '',
    budget: row.budget || undefined,
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
    vin: item?.vehicle_vin || '',
    model: item?.model_name || '',
    trim: item?.trim || undefined,
    plateNumber: item?.plate_number || undefined,
    color: item?.color || undefined,
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
    customerName: row.customer_name || undefined,
    customerPhone: row.phone || undefined,
    customerIDCard: row.id_card || undefined,
    customerAddress: row.address || undefined,
    customerProvince: row.province || undefined,
    paymentMethod: row.payment_method || undefined,
    qrUsed: row.qr_used || undefined,
    bankName: row.bank_name || undefined,
    transferRef: row.transfer_ref || undefined,
    financeCompany: row.finance_company || undefined,
    downPaymentPercent: row.down_payment_percent == null ? undefined : Number(row.down_payment_percent),
    downPaymentUSD: row.down_payment_usd == null ? undefined : Number(row.down_payment_usd),
    tenureMonths: row.tenure_months || undefined,
    monthlyPaymentLAK: row.monthly_payment_lak == null ? undefined : Number(row.monthly_payment_lak),
    freeGifts: gifts,
    warrantyTerms: row.warranty_terms || undefined,
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
  };
}

export async function loadBackendData(): Promise<BackendData> {
  const client = requireSupabase();
  const [modelsResult, inventoryResult, customersResult, billsResult, itemsResult, movementsResult, profilesResult, rolesResult, servicesResult, testDrivesResult, settingsResult] = await Promise.all([
    client.from('vehicle_models').select('*').order('name'),
    client.from('vehicles').select('*').order('created_at', { ascending: false }),
    client.from('customers').select('*').order('created_at', { ascending: false }),
    client.from('bills').select('*').order('bill_date', { ascending: false }),
    client.from('bill_items').select('*'),
    client.from('stock_movements').select('*').order('created_at', { ascending: false }),
    client.from('staff_profiles').select('id,email,name,phone,role,department,role_title,status,created_at,last_login'),
    client.from('staff_roles').select('role_code,permissions'),
    client.from('service_appointments').select('*').order('scheduled_date', { ascending: true }),
    client.from('test_drives').select('*').order('drive_date', { ascending: true }),
    client.from('dealership_settings').select('config').eq('id', true).maybeSingle(),
  ]);

  for (const result of [modelsResult, inventoryResult, customersResult, billsResult, itemsResult, movementsResult]) {
    if (result.error) throw result.error;
  }

  // Directory access is restricted by RLS. A staff member who cannot view it can still use core data.
  const profiles = profilesResult.error ? [] : (profilesResult.data || []);
  const roles = rolesResult.error ? [] : (rolesResult.data || []);
  const permissionsByRole = new Map(roles.map((row: DbRow) => [row.role_code, row.permissions]));
  const users = profiles.map((row: DbRow) => mapStaffProfile(row, permissionsByRole.get(row.role)));
  const staffById = new Map(users.map((user) => [user.id, user]));
  const models = (modelsResult.data || []).map(mapVehicleModel);
  const modelById = new Map(models.map((model) => [model.id, model]));
  const inventory = (inventoryResult.data || []).map((row: DbRow) => mapInventoryItem(row, modelById));
  const leads = (customersResult.data || []).map((row: DbRow) => mapLead(row, modelById, staffById));
  const itemsByBill = new Map<string, DbRow[]>();
  for (const item of itemsResult.data || []) {
    const items = itemsByBill.get(item.bill_id) || [];
    items.push(item);
    itemsByBill.set(item.bill_id, items);
  }
  const bills = (billsResult.data || []).map((row: DbRow) => mapBill(row, (itemsByBill.get(row.id) || [])[0]));
  const services = (servicesResult.data || []).map((row: DbRow): ServiceAppointment => ({
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
    notes: row.notes || '',
  }));
  const testDrives = (testDrivesResult.data || []).map((row: DbRow): TestDriveBooking => ({
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
  const stockLogs = (movementsResult.data || []).map((movement: DbRow): StockLogRecord => {
    const bill = billById.get(movement.bill_id) as DbRow | undefined;
    const item = (itemsByBill.get(movement.bill_id) || [])[0];
    const vehicle = (inventoryResult.data || []).find((row: DbRow) => row.vin === movement.vehicle_vin);
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
    settingsResult.error ? `Dealership settings could not be loaded: ${settingsResult.error.message}` : null,
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
    settings: settingsResult.error ? {} : (settingsResult.data?.config || {}),
    warnings,
  };
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
  if (file.size > 5 * 1024 * 1024) throw new Error('Image files must be 5 MB or smaller.');
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  if (!['jpg', 'png', 'webp'].includes(extension)) throw new Error('Use a JPG, PNG, or WebP image.');

  const client = requireSupabase();
  const path = `${folder}/${newRecordId()}.${extension}`;
  const { error } = await client.storage.from('dealership-assets').upload(path, file, {
    contentType: file.type,
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
  const client = requireSupabase();
  const safePhone = sanitizePhone(appointment.phone, 30);
  const customerId = await findCustomerId(safePhone);
  const { error } = await client.from('service_appointments').insert({
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
    notes: sanitizeText(appointment.notes, 1000) || '',
    created_by: actorId,
  });
  if (error) throw error;
}

export async function saveTestDriveBooking(booking: TestDriveBooking, actorId: string) {
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

export async function saveLead(lead: Lead, assignedStaffId: string) {
  const client = requireSupabase();
  const { data: models, error: modelsError } = await client.from('vehicle_models').select('id,name');
  if (modelsError) throw modelsError;
  const modelId = (models || []).find((model) => model.name === lead.interestedModel)?.id;
  if (!modelId) throw new Error(`Vehicle model "${lead.interestedModel}" is not configured in the database.`);

  const safeName = sanitizeText(lead.customerName, 120);
  const safePhone = sanitizePhone(lead.phone, 30);
  const safeEmail = sanitizeText(lead.email, 120);
  const safeNotes = sanitizeText(lead.notes, 1000);
  const safeBudget = sanitizeText(lead.budget, 60);

  if (hasDangerousPatterns(lead.customerName) || hasDangerousPatterns(lead.notes)) {
    throw new Error('ตรวจพบอักขระหรือรูปแบบคำสั่งที่ไม่อนุญาตในข้อมูลลูกค้า');
  }

  const { error } = await client.from('customers').upsert({
    id: lead.id,
    name: safeName,
    phone: safePhone,
    email: safeEmail || null,
    category: lead.category,
    source: sanitizeText(lead.source, 100) || null,
    interested_model_id: modelId,
    status: lead.status,
    priority: lead.priority,
    budget: safeBudget || null,
    assigned_to: assignedStaffId || null,
    notes: safeNotes || null,
    last_follow_up: lead.lastFollowUp || null,
    next_test_drive_at: lead.testDriveDate || null,
  });
  if (error) throw error;
}

export async function saveInventoryItem(item: InventoryItem) {
  const client = requireSupabase();
  const { data: model, error: modelError } = await client.from('vehicle_models').select('id').eq('name', item.model).maybeSingle();
  if (modelError) throw modelError;
  if (!model) throw new Error(`Vehicle model "${item.model}" does not exist in vehicle_models.`);
  const safeVin = sanitizeVIN(item.vin);
  if (safeVin.length !== 17) {
    throw new Error('เลขตัวถัง (VIN) ต้องเป็นตัวพิมพ์ใหญ่ A-Z, 0-9 ความยาว 17 หลักพอดี');
  }

  const { error } = await client.from('vehicles').upsert({
    vin: safeVin,
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
  }, { onConflict: 'vin' });
  if (error) throw error;
}

export async function deleteInventoryItem(vin: string) {
  const client = requireSupabase();
  const { error } = await client.from('vehicles').delete().eq('vin', vin);
  if (error) throw error;
}

export async function saveVehicleModel(model: VehicleModel, createdBy: string) {
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

export async function saveBillRecord(bill: InvoiceBillRecord, actorId: string) {
  const client = requireSupabase();
  const type = bill.billType || bill.type;
  if (!type) throw new Error('Bill type is required.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bill.id)) {
    throw new Error('Bill ID must be a UUID before it is saved.');
  }
  const customerId = type === 'sale' && bill.customerPhone
    ? await findCustomerId(bill.customerPhone)
    : null;

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
    payment_method: sanitizeText(bill.paymentMethod, 30) || null,
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
  const { error } = await client.rpc('record_vehicle_bill', {
    p_bill: billRow,
    p_item: billItem,
    p_movement_type: type === 'import' ? 'stock_in' : 'stock_out',
  });
  if (error) throw error;
}

export async function uploadPaymentSlip(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
    throw new Error('Payment slips must be JPG, PNG, WebP, or PDF.');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('Payment slips must be 5 MB or smaller.');
  const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
  const path = `sales/${newRecordId()}.${extension}`;
  const { error } = await requireSupabase().storage.from('payment-slips').upload(path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: '3600',
  });
  if (error) throw error;
  return path;
}

export async function saveStaffProfile(user: SystemUser) {
  const client = requireSupabase();
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
  if (error) throw error;
  if (!data?.profile) throw new Error('The staff profile was not updated.');
  return mapStaffProfile(data.profile, data.permissions);
}

export async function deactivateStaffProfile(id: string) {
  const client = requireSupabase();
  const { error } = await client.functions.invoke('manage-staff', {
    body: { action: 'suspend', userId: id },
  });
  if (error) throw error;
}

export async function updateServiceAppointment(appointment: ServiceAppointment) {
  const client = requireSupabase();
  const { error } = await client.from('service_appointments').update({
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
    notes: appointment.notes,
    updated_at: new Date().toISOString(),
  }).eq('id', appointment.id);
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
  const client = requireSupabase();
  const { error } = await client.rpc('delete_vehicle_bill', { p_bill_id: id });
  if (error) throw error;
}
