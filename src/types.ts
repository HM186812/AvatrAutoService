export type Language = 'lo' | 'en' | 'zh';

export type ActiveMenu = 'dashboard' | 'customers' | 'inventory' | 'stock_in' | 'pos' | 'bills' | 'alerts' | 'users' | 'profile';

export type UserRole = 'super_admin' | 'admin' | 'sales' | 'technician' | 'general_user';

export type Currency = 'USD' | 'THB' | 'LAK' | 'CNY' | 'EUR' | string;

export interface CustomCurrencyConfig {
  code: string;
  nameLo: string;
  symbol: string;
  rateToUSD: number; // e.g. 1 USD = 22000 LAK, 1 USD = 35.5 THB
}

export interface PendingMemberRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  appliedRole: UserRole;
  requestedAt: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface UserPermissions {
  canManageUsers: boolean;
  canEditInventory: boolean;
  canUploadQR?: boolean;
  canAddModels?: boolean;
  canDeleteUsers?: boolean;
  canGrantRoles?: boolean;
  canDeductPOS?: boolean;
  canViewFinancials?: boolean;
}

export interface SystemUser {
  id: string; // Firebase UID or local ID
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  roleTitleLo: string;
  department: string;
  avatarInitials: string;
  permissions: UserPermissions;
  status?: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  password?: string;
}

export type CustomerCategory = 'walk_in' | 'online' | 'event';

export type StockStatus = 'ready' | 'pdi' | 'imported' | 'reserved' | 'sold' | 'event' | 'promotion';

export type PDIStatus = 'passed' | 'in_progress' | 'pending';

export type KPITimeframe = 'day' | 'week' | 'month' | 'year';

export interface InventoryItem {
  vin: string; // Document ID (17 chars)
  model: string;
  plateNumber: string; // ทะเบียน / ປ້າຍ
  color: string;
  colorHex?: string;
  interiorColor: string;
  trim: string;
  battery: string;
  priceUSD: number;
  priceLAK: number;
  stockQuantity: number;
  status: StockStatus; // ready, event, promotion, reserved, sold, pdi, imported
  eventStartDate?: string; // YYYY-MM-DD
  eventEndDate?: string; // YYYY-MM-DD
  eventCampaign?: string; // ໝວດງານ e.g. 'ງານ Motor Show 2026'
  eventLocation?: string;
  pdiStatus: PDIStatus; // passed, in_progress, pending
  pdiInspector?: string;
  pdiNotes?: string;
  location: string;
  imageUrl?: string;
  image?: string; // Alias for backward compatibility
  reservedForCustomer?: string;
  arrivalDate?: string;
  mileageKm?: number;
  promotionDiscountUSD?: number;
  promotionNotes?: string;
  updatedAt?: any;
}

export interface VehicleColorOption {
  name: string;
  hex: string;
  previewClass?: string;
}

export interface VehicleModel {
  id: string; // Document ID, e.g. "avatr-12"
  name: string;
  subTitle: string;
  category: string;
  priceStartingUSD: number;
  rangeCLTC: string;
  acceleration: string;
  isCustom?: boolean;
  createdBy?: string;
  tagline?: string;
  priceStartingLAK?: number;
  batteryCapacity?: string;
  batterySupplier?: string;
  chargingSpeed?: string;
  smartDriving?: string;
  powertrain?: string;
  colors: VehicleColorOption[];
  description?: string;
  features: string[];
  stockCount?: number;
  heroImage?: string;
  gallery?: string[];
}

export type BillType = 'sale' | 'import';

export interface InvoiceBillRecord {
  id: string; // Document ID e.g. "INV-2026-0001", "REC-2026-0001"
  type?: BillType; // 'sale' | 'import'
  billType: BillType; // 'sale' | 'import'
  billNumber: string;
  customerName?: string;
  customerPhone?: string;
  vin: string;
  model: string;
  amountUSD?: number;
  amountLAK?: number;
  netTotalUSD: number;
  netTotalLAK: number;
  unitPriceUSD: number;
  unitPriceLAK: number;
  discountUSD: number;
  discountLAK: number;
  quantity: number;
  paymentMethod?: 'transfer' | 'cash' | 'finance';
  qrUsed?: string; // 'bcel_official_qr'
  salesRep?: string;
  timestamp?: any;
  date: string;
  
  // Vehicle Details
  trim?: string;
  plateNumber?: string;
  color?: string;
  interiorColor?: string;
  battery?: string;

  // For Sales Bills
  customerIDCard?: string;
  customerAddress?: string;
  customerProvince?: string;
  bankName?: string;
  transferRef?: string;
  financeCompany?: string;
  downPaymentPercent?: number;
  downPaymentUSD?: number;
  tenureMonths?: number;
  monthlyPaymentLAK?: number;
  freeGifts?: string[];
  warrantyTerms?: string;

  // For Import Bills
  supplierName?: string;
  customsDocNumber?: string;
  importEntryPort?: string;
  destinationWarehouse?: string;
  inspectorName?: string;
  pdiStatusInitial?: PDIStatus;
  statusInitial?: StockStatus;
  eventCampaign?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventLocation?: string;

  // Operational Metadata
  recordedBy?: string;
  notes?: string;
}

export interface DealershipConfig {
  companyQrImageUrl: string | null;
  uploadedBy?: string;
  currencies: CustomCurrencyConfig[];
  campaignCategories: string[];
  colorOptions: VehicleColorOption[];
  accountName?: string;
  bankName?: string;
  usdAccount?: string;
  lakAccount?: string;
  cnyAccount?: string;
  thbAccount?: string;
  hotline?: string;
  branch?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type LeadStatus = 'new' | 'contacted' | 'test_drive' | 'negotiation' | 'delivered' | 'lost';

export type LeadPriority = 'normal' | 'high' | 'vip';

export interface Lead {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  category: CustomerCategory;
  source?: string;
  interestedModel: string;
  status: LeadStatus;
  priority: LeadPriority;
  notes: string;
  budget?: string;
  assignedTo: string;
  createdAt: string;
  lastFollowUp?: string;
  testDriveDate?: string;
}

export interface ServiceAppointment {
  id: string;
  customerName: string;
  phone: string;
  model: string;
  plateNumber: string;
  serviceType: 'battery_check' | 'periodic_maintenance' | 'software_ota' | 'brake_suspension' | 'body_paint' | 'emergency_repair';
  scheduledDate: string;
  scheduledTime: string;
  status: 'pending' | 'in_progress' | 'inspection_done' | 'completed';
  technician: string;
  estimatedCostUSD: number;
  batteryHealthPercent?: number;
  notes: string;
}

export interface TestDriveBooking {
  id: string;
  customerName: string;
  phone: string;
  model: string;
  date: string;
  timeSlot: string;
  location: string;
  salesRep: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
}

export type StockLogType = 'stock_in' | 'stock_out';

export interface StockLogRecord {
  id: string;
  type: StockLogType;
  vin: string;
  model: string;
  plateNumber: string;
  color?: string;
  quantity: number;
  priceUSD: number;
  priceLAK: number;
  timestamp: string;
  recordedBy: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: 'cash' | 'transfer' | 'finance';
  remainingStock?: number;
  notes?: string;
}

export type SaleLogRecord = StockLogRecord;
