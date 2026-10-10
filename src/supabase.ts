import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  InventoryItem, 
  VehicleModel, 
  InvoiceBillRecord, 
  SystemUser, 
  DealershipConfig 
} from './types';
import { AVATR_VEHICLES } from './data/mockData';
import { DEFAULT_COMPANY_BANK_INFO } from './data/companySettings';
import { DEFAULT_CURRENCIES } from './data/currencies';

// -------------------------------------------------------------
// 1. SUPABASE CONFIGURATION & CLIENT INITIALIZATION
// -------------------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey !== 'your-anon-key' &&
    !supabaseAnonKey.includes('MY_')
  );
};

// Singleton Supabase Client
export let supabase: SupabaseClient | null = null;

if (typeof window !== 'undefined') {
  try {
    if (isSupabaseConfigured()) {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      console.log('[Supabase Cloud] Supabase Client SDK initialized with Real-Time Subscriptions.');
    } else {
      console.info('[Supabase Local] Running in Local Storage Fallback Mode (Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to connect Supabase Cloud).');
    }
  } catch (err) {
    console.warn('[Supabase] Initialization notice:', err);
  }
}

/**
 * Clean data: remove undefined values and ensure JSON serializability
 */
export const cleanSupabaseData = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (data instanceof Date) return data.toISOString();

  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanSupabaseData(item));
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    result[key] = cleanSupabaseData(value);
  }
  return result;
};

// -------------------------------------------------------------
// 2. SUPABASE AUTHENTICATION HELPERS
// -------------------------------------------------------------

export const signInWithSupabase = async (emailOrPhone: string, password?: string) => {
  if (!supabase || !isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase is not configured') };
  }
  const cleanId = emailOrPhone.trim().toLowerCase();
  const email = cleanId.includes('@') ? cleanId : `${cleanId.replace(/\s+/g, '')}@avatr.phone.la`;
  
  return await supabase.auth.signInWithPassword({
    email,
    password: password || 'Avatr2026!Default',
  });
};

export const signUpWithSupabase = async (
  emailOrPhone: string, 
  password?: string, 
  userMetadata?: Record<string, any>
) => {
  if (!supabase || !isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase is not configured') };
  }
  const cleanId = emailOrPhone.trim().toLowerCase();
  const email = cleanId.includes('@') ? cleanId : `${cleanId.replace(/\s+/g, '')}@avatr.phone.la`;

  return await supabase.auth.signUp({
    email,
    password: password || 'Avatr2026!Default',
    options: {
      data: userMetadata || {},
    },
  });
};

export const signOutSupabase = async () => {
  if (!supabase || !isSupabaseConfigured()) return;
  return await supabase.auth.signOut();
};

export const onSupabaseAuthStateChange = (callback: (event: string, session: any) => void) => {
  if (!supabase || !isSupabaseConfigured()) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
};

// -------------------------------------------------------------
// 3. REAL-TIME DATA SYNC & CRUD METHODS
// -------------------------------------------------------------

/**
 * 3.1 Table: `inventory`
 */
export const subscribeToInventory = (
  onData: (items: InventoryItem[]) => void,
  onError?: (err: any) => void
) => {
  if (!supabase || !isSupabaseConfigured()) return () => {};

  // Fetch initial rows
  supabase
    .from('inventory')
    .select('*')
    .order('updated_at', { ascending: false })
    .then(({ data, error }) => {
      if (error) {
        console.warn('[Supabase] Inventory fetch notice:', error.message);
        if (onError) onError(error);
        return;
      }
      if (data && data.length > 0) {
        onData(data.map(mapSupabaseInventoryRow));
      }
    });

  // Real-time channel listener
  const channel = supabase
    .channel('public:inventory')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
      supabase!
        .from('inventory')
        .select('*')
        .order('updated_at', { ascending: false })
        .then(({ data }) => {
          if (data) onData(data.map(mapSupabaseInventoryRow));
        });
    })
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
};

const mapSupabaseInventoryRow = (row: any): InventoryItem => ({
  vin: row.vin || row.id,
  model: row.model || '',
  plateNumber: row.plate_number || row.plateNumber || '',
  color: row.color || '',
  colorHex: row.color_hex || row.colorHex || '#0a0a0b',
  interiorColor: row.interior_color || row.interiorColor || '',
  trim: row.trim || '',
  battery: row.battery || '',
  priceUSD: Number(row.price_usd || row.priceUSD) || 0,
  priceLAK: Number(row.price_lak || row.priceLAK) || 0,
  stockQuantity: Number(row.stock_quantity ?? row.stockQuantity) ?? 1,
  status: row.status || 'ready',
  pdiStatus: row.pdi_status || row.pdiStatus || 'passed',
  pdiInspector: row.pdi_inspector || row.pdiInspector || '',
  pdiNotes: row.pdi_notes || row.pdiNotes || '',
  location: row.location || 'ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ',
  imageUrl: row.image_url || row.imageUrl || row.image || '',
  image: row.image_url || row.imageUrl || row.image || '',
  reservedForCustomer: row.reserved_for_customer || row.reservedForCustomer || '',
  arrivalDate: row.arrival_date || row.arrivalDate || '',
  mileageKm: Number(row.mileage_km || row.mileageKm) || 0,
  eventStartDate: row.event_start_date || row.eventStartDate || '',
  eventEndDate: row.event_end_date || row.eventEndDate || '',
  eventCampaign: row.event_campaign || row.eventCampaign || '',
  eventLocation: row.event_location || row.eventLocation || '',
  promotionDiscountUSD: Number(row.promotion_discount_usd || row.promotionDiscountUSD) || 0,
  promotionNotes: row.promotion_notes || row.promotionNotes || '',
  updatedAt: row.updated_at || row.updatedAt,
});

export const saveInventoryItemToSupabase = async (item: InventoryItem) => {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const payload = cleanSupabaseData({
      vin: item.vin,
      model: item.model,
      plate_number: item.plateNumber,
      color: item.color,
      color_hex: item.colorHex,
      interior_color: item.interiorColor,
      trim: item.trim,
      battery: item.battery,
      price_usd: item.priceUSD,
      price_lak: item.priceLAK,
      stock_quantity: item.stockQuantity,
      status: item.status,
      pdi_status: item.pdiStatus,
      pdi_inspector: item.pdiInspector,
      pdi_notes: item.pdiNotes,
      location: item.location,
      image_url: item.imageUrl || item.image || '',
      image: item.imageUrl || item.image || '',
      reserved_for_customer: item.reservedForCustomer || null,
      arrival_date: item.arrivalDate || null,
      mileage_km: item.mileageKm || 0,
      event_start_date: item.eventStartDate || null,
      event_end_date: item.eventEndDate || null,
      event_campaign: item.eventCampaign || null,
      event_location: item.eventLocation || null,
      promotion_discount_usd: item.promotionDiscountUSD || 0,
      promotion_notes: item.promotionNotes || null,
      updated_at: new Date().toISOString(),
    });

    const { error } = await supabase
      .from('inventory')
      .upsert(payload, { onConflict: 'vin' });

    if (error) {
      console.warn('[Supabase] Note on saveInventoryItem (local fallback active):', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Note on saveInventoryItem exception:', err?.message || err);
  }
};

export const deleteInventoryItemFromSupabase = async (vin: string) => {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('inventory').delete().eq('vin', vin);
    if (error) {
      console.warn('[Supabase] Note on deleteInventoryItem:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Note on deleteInventoryItem exception:', err?.message || err);
  }
};

/**
 * 3.2 Table: `vehicle_models`
 */
export const subscribeToVehicleModels = (
  onData: (models: VehicleModel[]) => void,
  onError?: (err: any) => void
) => {
  if (!supabase || !isSupabaseConfigured()) return () => {};

  supabase
    .from('vehicle_models')
    .select('*')
    .order('name', { ascending: true })
    .then(({ data, error }) => {
      if (error) {
        console.warn('[Supabase] Vehicle models fetch notice:', error.message);
        if (onError) onError(error);
        return;
      }
      if (data && data.length > 0) {
        onData(data.map(mapSupabaseVehicleModelRow));
      }
    });

  const channel = supabase
    .channel('public:vehicle_models')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_models' }, () => {
      supabase!
        .from('vehicle_models')
        .select('*')
        .order('name', { ascending: true })
        .then(({ data }) => {
          if (data) onData(data.map(mapSupabaseVehicleModelRow));
        });
    })
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
};

const mapSupabaseVehicleModelRow = (row: any): VehicleModel => ({
  id: row.id,
  name: row.name || '',
  subTitle: row.sub_title || row.subTitle || '',
  tagline: row.tagline || '',
  category: row.category || '',
  priceStartingUSD: Number(row.price_starting_usd || row.priceStartingUSD) || 0,
  priceStartingLAK: Number(row.price_starting_lak || row.priceStartingLAK) || (Number(row.price_starting_usd || row.priceStartingUSD) || 0) * 22000,
  acceleration: row.acceleration || '3.9s',
  rangeCLTC: row.range_cltc || row.rangeCLTC || '700 km',
  batteryCapacity: row.battery_capacity || row.batteryCapacity || '94.5 kWh',
  batterySupplier: row.battery_supplier || row.batterySupplier || 'CATL',
  chargingSpeed: row.charging_speed || row.chargingSpeed || '800V Silicon Carbide',
  smartDriving: row.smart_driving || row.smartDriving || 'Huawei Qiankun ADS 3.0',
  powertrain: row.powertrain || 'Dual-Motor AWD',
  colors: Array.isArray(row.colors) ? row.colors : (typeof row.colors === 'string' ? JSON.parse(row.colors || '[]') : []),
  description: row.description || '',
  features: Array.isArray(row.features) ? row.features : (typeof row.features === 'string' ? JSON.parse(row.features || '[]') : []),
  stockCount: Number(row.stock_count || row.stockCount) || 0,
  heroImage: row.hero_image || row.heroImage || '',
  gallery: Array.isArray(row.gallery) ? row.gallery : (typeof row.gallery === 'string' ? JSON.parse(row.gallery || '[]') : []),
  isCustom: Boolean(row.is_custom || row.isCustom),
  createdBy: row.created_by || row.createdBy || '',
});

export const saveVehicleModelToSupabase = async (model: VehicleModel, superAdminUid?: string) => {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const payload = cleanSupabaseData({
      id: model.id,
      name: model.name,
      sub_title: model.subTitle,
      tagline: model.tagline,
      category: model.category,
      price_starting_usd: model.priceStartingUSD,
      price_starting_lak: model.priceStartingLAK,
      acceleration: model.acceleration,
      range_cltc: model.rangeCLTC,
      battery_capacity: model.batteryCapacity,
      battery_supplier: model.batterySupplier,
      charging_speed: model.chargingSpeed,
      smart_driving: model.smartDriving,
      powertrain: model.powertrain,
      colors: model.colors,
      description: model.description,
      features: model.features,
      stock_count: model.stockCount,
      hero_image: model.heroImage,
      gallery: model.gallery,
      is_custom: Boolean(model.isCustom),
      created_by: model.createdBy || superAdminUid || 'super_admin',
      updated_at: new Date().toISOString(),
    });

    const { error } = await supabase
      .from('vehicle_models')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Note on saveVehicleModel (local fallback active):', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Note on saveVehicleModel exception:', err?.message || err);
  }
};

export const deleteVehicleModelFromSupabase = async (modelId: string) => {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('vehicle_models').delete().eq('id', modelId);
    if (error) {
      console.warn('[Supabase] Note on deleteVehicleModel:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Note on deleteVehicleModel exception:', err?.message || err);
  }
};

/**
 * 3.3 Table: `bills`
 */
export const subscribeToBills = (
  onData: (bills: InvoiceBillRecord[]) => void,
  onError?: (err: any) => void
) => {
  if (!supabase || !isSupabaseConfigured()) return () => {};

  supabase
    .from('bills')
    .select('*')
    .order('created_at', { ascending: false })
    .then(({ data, error }) => {
      if (error) {
        console.warn('[Supabase] Bills fetch notice:', error.message);
        if (onError) onError(error);
        return;
      }
      if (data && data.length > 0) {
        onData(data.map(mapSupabaseBillRow));
      }
    });

  const channel = supabase
    .channel('public:bills')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => {
      supabase!
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) onData(data.map(mapSupabaseBillRow));
        });
    })
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
};

const mapSupabaseBillRow = (row: any): InvoiceBillRecord => ({
  id: row.id,
  billNumber: row.bill_number || row.billNumber || row.id,
  billType: row.bill_type || row.billType || row.type || 'sale',
  type: row.bill_type || row.billType || row.type || 'sale',
  date: row.date || new Date().toISOString().slice(0, 10),
  customerName: row.customer_name || row.customerName || '',
  customerPhone: row.customer_phone || row.customerPhone || '',
  vin: row.vin || '',
  model: row.model || '',
  amountUSD: Number(row.amount_usd || row.net_total_usd || row.amountUSD) || 0,
  amountLAK: Number(row.amount_lak || row.net_total_lak || row.amountLAK) || 0,
  netTotalUSD: Number(row.net_total_usd || row.amount_usd || row.netTotalUSD) || 0,
  netTotalLAK: Number(row.net_total_lak || row.amount_lak || row.netTotalLAK) || 0,
  unitPriceUSD: Number(row.unit_price_usd || row.unitPriceUSD) || 0,
  unitPriceLAK: Number(row.unit_price_lak || row.unitPriceLAK) || 0,
  discountUSD: Number(row.discount_usd || row.discountUSD) || 0,
  discountLAK: Number(row.discount_lak || row.discountLAK) || 0,
  paymentMethod: row.payment_method || row.paymentMethod || 'transfer',
  qrUsed: row.qr_used || row.qrUsed || 'official_qr',
  salesRep: row.sales_rep || row.salesRep || row.recorded_by || '',
  recordedBy: row.recorded_by || row.recordedBy || row.sales_rep || '',
  notes: row.notes || '',
  plateNumber: row.plate_number || row.plateNumber || '',
  color: row.color || '',
  trim: row.trim || '',
  battery: row.battery || '',
  quantity: Number(row.quantity) || 1,
  supplierName: row.supplier_name || row.supplierName || '',
  customsDocNumber: row.customs_doc_number || row.customsDocNumber || '',
  importEntryPort: row.import_entry_port || row.importEntryPort || '',
  destinationWarehouse: row.destination_warehouse || row.destinationWarehouse || '',
  freeGifts: Array.isArray(row.free_gifts) ? row.free_gifts : (typeof row.free_gifts === 'string' ? JSON.parse(row.free_gifts || '[]') : []),
  timestamp: row.created_at || row.timestamp,
});

export const saveBillToSupabase = async (bill: InvoiceBillRecord) => {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const payload = cleanSupabaseData({
      id: bill.id,
      bill_number: bill.billNumber || bill.id,
      bill_type: bill.billType || bill.type || 'sale',
      type: bill.billType || bill.type || 'sale',
      date: bill.date || new Date().toISOString().slice(0, 10),
      customer_name: bill.customerName || null,
      customer_phone: bill.customerPhone || null,
      vin: bill.vin,
      model: bill.model,
      trim: bill.trim,
      color: bill.color,
      interior_color: bill.interiorColor || null,
      battery: bill.battery,
      plate_number: bill.plateNumber,
      quantity: bill.quantity || 1,
      unit_price_usd: bill.unitPriceUSD || 0,
      unit_price_lak: bill.unitPriceLAK || 0,
      discount_usd: bill.discountUSD || 0,
      discount_lak: bill.discountLAK || 0,
      net_total_usd: bill.netTotalUSD ?? bill.amountUSD ?? 0,
      net_total_lak: bill.netTotalLAK ?? bill.amountLAK ?? 0,
      amount_usd: bill.netTotalUSD ?? bill.amountUSD ?? 0,
      amount_lak: bill.netTotalLAK ?? bill.amountLAK ?? 0,
      payment_method: bill.paymentMethod || 'transfer',
      qr_used: bill.qrUsed || 'official_qr',
      supplier_name: bill.supplierName || null,
      customs_doc_number: bill.customsDocNumber || null,
      import_entry_port: bill.importEntryPort || null,
      destination_warehouse: bill.destinationWarehouse || null,
      inspector_name: bill.inspectorName || null,
      pdi_status_initial: bill.pdiStatusInitial || null,
      status_initial: bill.statusInitial || null,
      free_gifts: bill.freeGifts || [],
      sales_rep: bill.salesRep || bill.recordedBy || null,
      recorded_by: bill.recordedBy || bill.salesRep || null,
      notes: bill.notes || null,
      created_at: new Date().toISOString(),
    });

    const { error } = await supabase
      .from('bills')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Note on saveBill (local fallback active):', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Note on saveBill exception:', err?.message || err);
  }
};

export const deleteBillFromSupabase = async (billId: string) => {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('bills').delete().eq('id', billId);
    if (error) {
      console.warn('[Supabase] Note on deleteBill:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Note on deleteBill exception:', err?.message || err);
  }
};

/**
 * 3.4 Table: `settings` (Row: `dealership_config`)
 */
export const subscribeToDealershipConfig = (
  onData: (config: DealershipConfig) => void,
  onError?: (err: any) => void
) => {
  if (!supabase || !isSupabaseConfigured()) return () => {};

  supabase
    .from('dealership_config')
    .select('*')
    .limit(1)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.warn('[Supabase] Settings fetch notice:', error.message);
        if (onError) onError(error);
        return;
      }
      if (data) {
        onData(mapSupabaseConfigRow(data));
      }
    });

  const channel = supabase
    .channel('public:dealership_config')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dealership_config' }, () => {
      supabase!
        .from('dealership_config')
        .select('*')
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) onData(mapSupabaseConfigRow(data));
        });
    })
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
};

const mapSupabaseConfigRow = (data: any): DealershipConfig => ({
  companyQrImageUrl: data.company_qr_image_url ?? data.companyQrImageUrl ?? null,
  uploadedBy: data.uploaded_by || data.uploadedBy || '',
  currencies: Array.isArray(data.currencies) ? data.currencies : (typeof data.currencies === 'string' ? JSON.parse(data.currencies) : DEFAULT_CURRENCIES),
  campaignCategories: Array.isArray(data.campaign_categories) ? data.campaign_categories : ['ງານ Motor Show 2026', 'ງານ Vientiane Motor Expo 2026', 'Mid-Year EV Special'],
  colorOptions: Array.isArray(data.color_options) ? data.color_options : [
    { name: 'Obsidian Black', hex: '#0a0a0b', previewClass: 'bg-zinc-950 border border-zinc-700' },
    { name: 'Ceramic White', hex: '#f4f4f5', previewClass: 'bg-zinc-100 border border-zinc-300' },
    { name: 'Liquid Titanium', hex: '#71717a', previewClass: 'bg-zinc-500 border border-zinc-400' },
  ],
  accountName: data.account_name || DEFAULT_COMPANY_BANK_INFO.accountName,
  bankName: data.bank_name || DEFAULT_COMPANY_BANK_INFO.bankName,
  usdAccount: data.usd_account || DEFAULT_COMPANY_BANK_INFO.usdAccount,
  lakAccount: data.lak_account || DEFAULT_COMPANY_BANK_INFO.lakAccount,
  cnyAccount: data.cny_account || DEFAULT_COMPANY_BANK_INFO.cnyAccount,
  thbAccount: data.thb_account || DEFAULT_COMPANY_BANK_INFO.thbAccount,
  hotline: data.hotline || DEFAULT_COMPANY_BANK_INFO.hotline,
  branch: data.branch || DEFAULT_COMPANY_BANK_INFO.branch,
  updatedAt: data.updated_at,
  updatedBy: data.updated_by,
});

export const saveDealershipConfigToSupabase = async (config: Partial<DealershipConfig>) => {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const payload = cleanSupabaseData({
      id: 'default',
      company_qr_image_url: config.companyQrImageUrl,
      uploaded_by: config.uploadedBy,
      currencies: config.currencies,
      campaign_categories: config.campaignCategories,
      color_options: config.colorOptions,
      account_name: config.accountName,
      bank_name: config.bankName,
      usd_account: config.usdAccount,
      lak_account: config.lakAccount,
      cny_account: config.cnyAccount,
      thb_account: config.thbAccount,
      hotline: config.hotline,
      branch: config.branch,
      updated_by: config.updatedBy,
      updated_at: new Date().toISOString(),
    });

    const { error } = await supabase
      .from('dealership_config')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Note on saveDealershipConfig:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Note on saveDealershipConfig exception:', err?.message || err);
  }
};

/**
 * 3.5 Table: `users`
 */
export const subscribeToUsers = (
  onData: (users: SystemUser[]) => void,
  onError?: (err: any) => void
) => {
  if (!supabase || !isSupabaseConfigured()) return () => {};

  supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true })
    .then(({ data, error }) => {
      if (error) {
        console.warn('[Supabase] Users fetch notice:', error.message);
        if (onError) onError(error);
        return;
      }
      if (data && data.length > 0) {
        onData(data.map(mapSupabaseUserRow));
      }
    });

  const channel = supabase
    .channel('public:users')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
      supabase!
        .from('users')
        .select('*')
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data) onData(data.map(mapSupabaseUserRow));
        });
    })
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
};

const mapSupabaseUserRow = (data: any): SystemUser => ({
  id: data.id,
  name: data.name || '',
  email: data.email || '',
  phone: data.phone || '',
  role: data.role || 'general_user',
  roleTitleLo: data.role_title_lo || data.roleTitleLo || 'ຜູ້ໃຊ້ທົ່ວໄປ (General User)',
  department: data.department || 'General Staff',
  avatarInitials: data.avatar_initials || data.avatarInitials || (data.name ? data.name.slice(0, 2) : 'US'),
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
  createdAt: data.created_at || data.createdAt || new Date().toISOString().slice(0, 10),
  lastLogin: data.last_login || data.lastLogin || '',
  password: data.password,
});

export const saveUserToSupabase = async (user: SystemUser) => {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const payload = cleanSupabaseData({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      role_title_lo: user.roleTitleLo,
      department: user.department,
      avatar_initials: user.avatarInitials,
      permissions: user.permissions,
      status: user.status,
      created_at: user.createdAt,
      last_login: user.lastLogin,
      updated_at: new Date().toISOString(),
    });

    const { error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Note on saveUser:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Note on saveUser exception:', err?.message || err);
  }
};

export const getUserFromSupabase = async (userId: string): Promise<SystemUser | null> => {
  if (!supabase || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      role: data.role || 'general_user',
      roleTitleLo: data.role_title_lo || 'ຜູ້ໃຊ້ທົ່ວໄປ (General User)',
      department: data.department || 'General Staff',
      status: data.status || 'active',
      avatarInitials: data.avatar_initials || (data.name ? data.name.slice(0, 2) : 'US'),
      permissions: data.permissions || {
        canManageUsers: false,
        canDeleteUsers: false,
        canGrantRoles: false,
        canEditInventory: false,
        canUploadQR: false,
        canAddModels: false,
        canDeductPOS: false,
        canViewFinancials: false,
      },
      createdAt: data.created_at || new Date().toISOString().slice(0, 10),
      lastLogin: data.last_login,
    };
  } catch (err) {
    console.warn('[Supabase] Note on getUser:', err);
    return null;
  }
};

export const deleteUserFromSupabase = async (userId: string) => {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) {
      console.warn('[Supabase] Note on deleteUser:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Note on deleteUser exception:', err?.message || err);
  }
};

// -------------------------------------------------------------
// 4. STORAGE: COMPANY QR CODE & ASSET UPLOADS
// -------------------------------------------------------------

// Helper: Compress image to small Base64 string for instant zero-dependency storage
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
 * - Uploads to Supabase Storage Bucket ('avatr-assets') if available
 * - Automatically falls back to compressed Base64 stored in Supabase database & LocalStorage
 */
export const uploadCompanyQrCodeToStorage = async (
  file: File | Blob, 
  superAdminUser: SystemUser
): Promise<string> => {
  if (superAdminUser.role !== 'super_admin') {
    throw new Error('ສິດບໍ່ພຽງພໍ: ສະເພາະ Admin (Super Admin) ເທົ່ານັ້ນທີ່ມີສິດອັບໂຫລດ QR ບໍລິສັດ');
  }

  let finalUrl = '';

  // Try Supabase Storage if configured
  if (supabase && isSupabaseConfigured()) {
    try {
      const timestamp = Date.now();
      const fileName = `company_qr_${timestamp}.jpg`;
      const { data, error } = await supabase.storage
        .from('avatr-assets')
        .upload(`qr/${fileName}`, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage
          .from('avatr-assets')
          .getPublicUrl(`qr/${fileName}`);
        finalUrl = publicData?.publicUrl || '';
      }
    } catch (storageErr) {
      console.warn('[Supabase Storage] Fallback to compressed direct storage:', storageErr);
    }
  }

  if (!finalUrl) {
    finalUrl = await compressImageToBase64(file);
  }

  // Update dealership_config
  await saveDealershipConfigToSupabase({
    companyQrImageUrl: finalUrl,
    uploadedBy: superAdminUser.id,
    updatedBy: `${superAdminUser.name} (${superAdminUser.roleTitleLo})`,
  });

  return finalUrl;
};

// -------------------------------------------------------------
// 5. INITIAL DATABASE SEEDING (DEFAULT AVATR MODELS)
// -------------------------------------------------------------

export const seedSupabaseIfEmpty = async () => {
  if (!supabase || !isSupabaseConfigured()) return;
  try {
    const { data: existing, error } = await supabase
      .from('vehicle_models')
      .select('id, name');

    if (!error && (!existing || existing.length === 0)) {
      for (const v of AVATR_VEHICLES) {
        await saveVehicleModelToSupabase(v, 'system_default');
      }
      console.log('[Supabase] Initial AVATR models seeded successfully.');
    }
  } catch (err: any) {
    console.warn('[Supabase] Initial seed notice (local storage active):', err?.message || err);
  }
};

// -------------------------------------------------------------
// 6. BACKWARD-COMPATIBILITY ALIASES
// -------------------------------------------------------------
export const db = supabase;
export const auth = supabase ? supabase.auth : null;
export const storage = supabase ? supabase.storage : null;

export const isFirebaseConfigured = isSupabaseConfigured;
export const saveInventoryItemToFirestore = saveInventoryItemToSupabase;
export const deleteInventoryItemFromFirestore = deleteInventoryItemFromSupabase;
export const saveVehicleModelToFirestore = saveVehicleModelToSupabase;
export const deleteVehicleModelFromFirestore = deleteVehicleModelFromSupabase;
export const saveBillToFirestore = saveBillToSupabase;
export const deleteBillFromFirestore = deleteBillFromSupabase;
export const saveDealershipConfigToFirestore = saveDealershipConfigToSupabase;
export const saveUserToFirestore = saveUserToSupabase;
export const deleteUserFromFirestore = deleteUserFromSupabase;
export const seedFirestoreIfEmpty = seedSupabaseIfEmpty;
