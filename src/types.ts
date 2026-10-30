export type Language = 'lo' | 'en' | 'th';

export type ActiveMenu = 'dashboard' | 'installment_dashboard' | 'sales_leaderboard' | 'pos_sales' | 'customers' | 'inventory' | 'stock_in' | 'bills' | 'alerts' | 'users' | 'profile';

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
  canUpdatePDI?: boolean;
  canViewVehicles?: boolean;
}

export interface SystemUser {
  id: string; // Supabase UID or local ID
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  roleTitleLo: string;
  department: string;
  avatarInitials: string;
  avatarUrl?: string;
  permissions: UserPermissions;
  status?: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

export type CustomerCategory = 'walk_in' | 'online' | 'event';

export type StockStatus = 'ready' | 'pdi' | 'imported' | 'reserved' | 'sold' | 'event' | 'promotion';

export type PDIStatus = 'passed' | 'in_progress' | 'pending';

export type KPITimeframe = 'day' | 'week' | 'month' | 'year';

export interface InventoryItem {
  vin: string; // Document ID (17 chars)
  engineNumber?: string; // ເລກຈັກ / Motor No.
  model: string;
  plateNumber?: string; // ทะเบียน / ປ້າຍ
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
  location?: string;
  destinationWarehouse?: string;
  importDocNumber?: string;
  notes?: string;
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

export type BillType = 'sale' | 'import' | 'installment';

export interface InvoiceBillRecord {
  id: string; // Document ID e.g. "INV-2026-0001", "REC-2026-0001"
  type?: BillType; // 'sale' | 'import' | 'installment'
  billType: BillType; // 'sale' | 'import' | 'installment'
  billNumber: string;
  customerName?: string;
  customerPhone?: string;
  vin: string;
  engineNumber?: string; // ເລກຈັກ / Motor No.
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
  qrUsed?: string; // 'official_qr'
  salesRep?: string;
  timestamp?: any;
  date: string;
  
  // Vehicle Details
  trim?: string;
  plateNumber?: string;
  color?: string;
  interiorColor?: string;
  battery?: string;

  // For Sales Bills & Installments
  customerIDCard?: string;
  customerAddress?: string;
  customerProvince?: string;
  bankName?: string;
  transferRef?: string;
  financeCompany?: string;
  downPaymentPercent?: number;
  downPaymentUSD?: number;
  tenureMonths?: number;
  monthlyPaymentUSD?: number;
  monthlyPaymentLAK?: number;
  freeGifts?: string[];
  warrantyTerms?: string;
  warrantyStartDate?: string;
  warrantyExpiryDate?: string;
  warrantyYears?: number;
  warrantyDistanceKm?: number;
  currentMileageKm?: number;
  batteryHealthSOH?: number;
  afterSalesNotes?: string;

  // For Installment & Down Payment Bills
  installmentPeriod?: number; // ງວດທີ 1, 2, 3...
  installmentTotalPeriods?: number; // ຈຳນວນງວດທັງໝົດ ເຊັ່ນ 36, 48, 60
  installmentType?: 'down_payment' | 'monthly_installment'; // ບິນຮັບເງິນດາວ ຫຼື ບິນຮັບຄ່າງວດ
  leadId?: string; // ລິ້ງຫາລະຫັດລູກຄ້າ

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
  paymentSlipPath?: string;
  recordedBy?: string;
  notes?: string;
  status?: 'completed' | 'voided' | string;
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

export interface InstallmentPaymentRecord {
  period: number; // ງວດທີ 1, 2, 3...
  dueDate: string; // ວັນທີຄົບກຳນົດ YYYY-MM-DD
  amountUSD: number; // ຍອດງວດ USD
  amountLAK: number; // ຍອດງວດ LAK
  principalUSD: number; // ເງິນຕົ້ນ USD
  interestUSD: number; // ດອກເບ້ຍ USD
  status: 'paid' | 'due' | 'pending' | 'overdue';
  paidDate?: string; // ວັນທີຊຳລະ
  paidAmountUSD?: number;
  paidAmountLAK?: number;
  paymentMethod?: 'cash' | 'transfer';
  bankName?: string;
  transferRef?: string; // ເລກອ້າງອີງ / Slip No.
  receiptNo?: string; // ເລກບິນຮັບເງິນງວດ
  notes?: string;
  collectedBy?: string; // ພະນັກງານຮັບເງິນ
}

export interface Lead {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  idCardNumber?: string; // ເລກບັດປະຈຳຕົວ / Passport
  province?: string;
  district?: string;
  village?: string;
  category: CustomerCategory;
  source?: string;
  interestedModel: string;
  status: LeadStatus;
  priority: LeadPriority;
  notes: string;
  budget?: string;
  paymentType?: 'cash' | 'transfer' | 'finance' | 'installment';
  downPaymentPercent?: number;
  downPaymentUSD?: number;
  financeCompany?: string;
  tenureMonths?: number;
  monthlyPaymentUSD?: number;
  monthlyPaymentLAK?: number;
  installmentStatus?: 'pending_approval' | 'approved' | 'rejected' | 'contract_signed' | 'completed' | 'active_repaying';
  assignedTo: string;
  createdAt: string;
  lastFollowUp?: string;
  testDriveDate?: string;

  // Payment Confirmation fields
  paidAmountUSD?: number;
  paidAmountLAK?: number;
  paymentDate?: string;
  paymentMethodRef?: string;
  paymentBank?: string;
  paymentReceiptNo?: string;
  paymentConfirmedBy?: string;
  paymentTypeConfirmed?: 'deposit' | 'down_payment' | 'full' | 'installment' | 'installment_completed';
  paidDate?: string;
  isPaymentCompleted?: boolean;

  // Installment payment schedule ledger
  installmentRecords?: InstallmentPaymentRecord[];

  // After-Sales & Warranty Tracking fields
  plateNumber?: string; // ປ້າຍທະບຽນລົດ
  vin?: string; // ເລກ VIN 17 ຫຼັກ
  engineNumber?: string; // ເລກຈັກ / Motor No.
  color?: string; // ສີລົດ
  currentMileageKm?: number; // ເລກກິໂລແມັດປັດຈຸບັນ
  batteryHealthSOH?: number; // ສຸຂະພາບແບັດເຕີຣີ % (SOH)
  warrantyStartDate?: string; // ວັນທີເລີ່ມຮັບປະກັນ YYYY-MM-DD
  warrantyExpiryDate?: string; // ວັນທີສິ້ນສຸດຮັບປະກັນ YYYY-MM-DD
  warrantyYears?: number; // ຈຳນວນປີຮັບປະກັນ ເຊັ່ນ 3, 5, 8
  warrantyDistanceKm?: number; // ໄລຍະທາງຮັບປະກັນ km ເຊັ່ນ 100,000, 160,000
  warrantyTerms?: string; // ເງື່ອນໄຂ / ຊື່ແພັກເກັດການຮັບປະກັນ
  afterSalesNotes?: string; // ໝາຍເຫດການດູແລຫຼັງການຂາຍ
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
  mileageKm?: number;
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
  billId?: string;
  leadId?: string;
  type: StockLogType;
  vin: string;
  model: string;
  plateNumber?: string;
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

export type IssuedDocumentAction = 'print' | 'export_pdf' | 'export_csv';

export type IssuedDocType =
  | 'booking'
  | 'receipt'
  | 'handover'
  | 'authorization'
  | 'installment_schedule'
  | 'credit_agreement'
  | 'km7_release'
  | 'quotation'
  | 'official_bill'
  | 'pos_receipt'
  | 'after_sales_record';

export interface IssuedDocumentRecord {
  id: string;
  docType: IssuedDocType;
  docTitle: string;
  docNumber: string;
  customerName: string;
  customerPhone?: string;
  leadId?: string;
  billId?: string;
  vin?: string;
  model?: string;
  action: IssuedDocumentAction;
  formatLabel: string;
  issuedAt: string;
  issuedDate: string;
  issuedBy: string;
  amountUSD?: number;
  amountLAK?: number;
  notes?: string;
}
