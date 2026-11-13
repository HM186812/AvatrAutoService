import { useState, useEffect, useRef, useMemo } from 'react';
import { isAdminRole } from '../../utils/roles';
import { InventoryItem, VehicleModel, Language, InvoiceBillRecord, StockLogRecord, SystemUser, Lead } from '../../types';
import { getStoredCompanyBankInfo, saveStoredCompanyBankInfo, CompanyBankInfo, DEFAULT_COMPANY_BANK_INFO } from '../../data/companySettings';
import { translations } from '../../data/translations';
import { LAO_PROVINCES } from '../../data/laoProvinces';
import {
  uploadCompanyQrCodeToStorage,
  resetCompanyQrCode
} from '../../supabase';
import { newRecordId } from '../../backend/ids';
import { saveLead, uploadPaymentSlip, generateNextBillNumber } from '../../backend/data';
import { resolveLakExchangeRate } from '../../data/currencies';
import { generateInstallmentSchedule } from '../../utils/installment';
import AvatrLogo from '../layout/AvatrLogo';
import CustomerDocumentsModal, { DocumentType } from '../modals/CustomerDocumentsModal';
import { showToast, ToastType } from '../common';
import {
  Receipt,
  FileText,
  CheckCircle2,
  Car,
  Search,
  CreditCard,
  User,
  UserSearch,
  Phone,
  Calendar,
  Sparkles,
  ShieldCheck,
  Printer,
  ArrowRight,
  AlertCircle,
  FileCheck,
  Banknote,
  Building2,
  X,
  QrCode,
  Upload,
  Check,
  Maximize2,
  RefreshCw,
  Lock,
  Download,
  Loader2,
  ChevronDown
} from 'lucide-react';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl, formatWhatsAppDisplay, formatWhatsAppNumber, openWhatsApp } from '../../utils/whatsapp';
import { exportElementToPdf } from '../../utils/pdfExport';
import { logIssuedDocument } from '../../utils/documentLogger';
import { isSellable, isOnHand, compareInventory } from '../../data/stockSummary';

interface POSSalesViewProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  bills: InvoiceBillRecord[];
  setBills: React.Dispatch<React.SetStateAction<InvoiceBillRecord[]>>;
  leads: Lead[];
  setLeads?: React.Dispatch<React.SetStateAction<Lead[]>>;
  stockLogs: StockLogRecord[];
  setStockLogs: React.Dispatch<React.SetStateAction<StockLogRecord[]>>;
  vehicles: VehicleModel[];
  currentUser?: SystemUser;
  users?: SystemUser[];
  lang: Language;
  onNavigateToBills: () => void;
  prefilledCustomer?: Lead | null;
  onClearPrefilledCustomer?: () => void;
  /** Open the customer picker (search CRM or quick-create a walk-in). */
  onChooseCustomer?: () => void;
}

export default function POSSalesView({
  inventory,
  setInventory,
  bills,
  setBills,
  leads,
  setLeads,
  setStockLogs,
  vehicles,
  currentUser,
  users = [],
  lang,
  onNavigateToBills,
  prefilledCustomer,
  onClearPrefilledCustomer,
  onChooseCustomer,
}: POSSalesViewProps) {
  const t = translations[lang] || translations.lo;
  // Sellable now: PDI passed and ready / event / promotion. A reserved car shows only for the customer it is reserved for.
  const reservationHolder = prefilledCustomer
    ? { name: prefilledCustomer.customerName, phone: prefilledCustomer.phone }
    : undefined;
  const availableVehicles = inventory
    .filter(item => isSellable(item, reservationHolder))
    .sort(compareInventory(vehicles));
  // On hand but blocked (PDI not passed, reserved for someone else...): shown as a count so staff know why.
  const blockedOnHandCount = inventory.filter(item => isOnHand(item) && !isSellable(item, reservationHolder)).length;

  const [selectedVin, setSelectedVin] = useState<string>(availableVehicles[0]?.vin || '');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedModelCategory, setSelectedModelCategory] = useState<string>('all');

  // Selected vehicle object
  const selectedVehicle = availableVehicles.find(v => v.vin === selectedVin) || availableVehicles[0];

  // Customer Details Form - Zero pre-filled values
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerIDCard, setCustomerIDCard] = useState('');
  const [salesRepName, setSalesRepName] = useState<string>(
    // The customer's own consultant, otherwise whoever is making the sale. Never a fixed staff name.
    () => prefilledCustomer?.assignedTo || currentUser?.name || ''
  );

  // Pick the consultant from active staff accounts, so one person is always spelled the same way in Top Sales
  const salesRepSuggestions = useMemo(() => {
    const names = new Set<string>(
      users
        .filter((u) => u.status === 'active' && (u.role === 'sales' || u.role === 'admin'))
        .map((u) => u.name.trim())
        .filter(Boolean)
    );
    if (currentUser?.name && currentUser.status !== 'suspended') names.add(currentUser.name.trim());
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [users, currentUser?.name, currentUser?.status]);
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerProvince, setCustomerProvince] = useState('ນະຄອນຫຼວງວຽງຈັນ');
  const [isProvinceDropdownOpen, setIsProvinceDropdownOpen] = useState(false);
  const provinceDropdownRef = useRef<HTMLDivElement>(null);
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const districtDropdownRef = useRef<HTMLDivElement>(null);
  const [isVillageDropdownOpen, setIsVillageDropdownOpen] = useState(false);
  const villageDropdownRef = useRef<HTMLDivElement>(null);
  const [customerDistrict, setCustomerDistrict] = useState('');
  const [customerVillage, setCustomerVillage] = useState('');
  const [customerCustomVillage, setCustomerCustomVillage] = useState('');
  const [customerAddressDetail, setCustomerAddressDetail] = useState('');
  const whatsAppNumber = formatWhatsAppNumber(customerPhone);
  const canOpenWhatsApp = /^\d{8,15}$/.test(whatsAppNumber);
  const selectedProvince = LAO_PROVINCES.find(province => province.nameLo === customerProvince);
  const districtOptions = selectedProvince?.districts || [];
  const selectedDistrictName = customerDistrict || districtOptions[0]?.nameLo || '';
  const selectedDistrict = districtOptions.find(district => district.nameLo === selectedDistrictName);
  const villageOptions = selectedDistrict?.popularVillages || [];

  useEffect(() => {
    if (!isProvinceDropdownOpen && !isDistrictDropdownOpen && !isVillageDropdownOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !provinceDropdownRef.current?.contains(target) &&
        !districtDropdownRef.current?.contains(target) &&
        !villageDropdownRef.current?.contains(target)
      ) {
        setIsProvinceDropdownOpen(false);
        setIsDistrictDropdownOpen(false);
        setIsVillageDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProvinceDropdownOpen(false);
        setIsDistrictDropdownOpen(false);
        setIsVillageDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProvinceDropdownOpen, isDistrictDropdownOpen, isVillageDropdownOpen]);

  // Pricing & Discounts (USD Only)
  const [discountUSD, setDiscountUSD] = useState<number | ''>('');

  // Auto-apply Event / Promotion discount when selecting an Event/Promotion vehicle
  useEffect(() => {
    if (selectedVehicle?.promotionDiscountUSD && selectedVehicle.promotionDiscountUSD > 0) {
      setDiscountUSD(selectedVehicle.promotionDiscountUSD);
    } else {
      setDiscountUSD('');
    }
  }, [selectedVehicle?.vin]);

  const isAdmin = isAdminRole(currentUser);
  const handleDiscountChange = (val: number | '') => {
    if (!isAdmin) return;
    if (val === '' || isNaN(val) || val <= 0) {
      setDiscountUSD('');
      return;
    }
    setDiscountUSD(val);
  };

  // Payment Options - Zero pre-filled values
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'finance'>('transfer');
  const [bankName] = useState('ຊຳລະເງິນຜ່ານ QR ບໍລິສັດ');
  const [transferRef, setTransferRef] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
  // Finance Options
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(30);
  const [downPaymentUSDInput, setDownPaymentUSDInput] = useState<number | ''>('');
  const [tenureMonths, setTenureMonths] = useState<number>(48);

  // Handle prefilled customer incoming from CRM
  useEffect(() => {
    if (prefilledCustomer) {
      setCustomerName(prefilledCustomer.customerName || '');
      setCustomerPhone(prefilledCustomer.phone || '');
      setCustomerIDCard(prefilledCustomer.idCardNumber || '');
      if (prefilledCustomer.paymentType === 'installment' || prefilledCustomer.paymentType === 'finance') {
        setPaymentMethod('finance');
        if (prefilledCustomer.downPaymentPercent) setDownPaymentPercent(prefilledCustomer.downPaymentPercent);
        if (prefilledCustomer.downPaymentUSD) setDownPaymentUSDInput(prefilledCustomer.downPaymentUSD);
        if (prefilledCustomer.tenureMonths) setTenureMonths(prefilledCustomer.tenureMonths);
      }
      if (prefilledCustomer.interestedModel) {
        const matching = availableVehicles.find(v => v.model === prefilledCustomer.interestedModel);
        if (matching) {
          setSelectedVin(matching.vin);
          setSelectedModelCategory(matching.model);
        }
      }
      if (prefilledCustomer.province) {
        setCustomerProvince(prefilledCustomer.province);
      }
      setCustomerDistrict(prefilledCustomer.district || '');
      setCustomerVillage(prefilledCustomer.village || '');
      setCustomerCustomVillage('');
      setCustomerAddressDetail('');
      if (prefilledCustomer.assignedTo && prefilledCustomer.assignedTo !== 'Admin') {
        setSalesRepName(prefilledCustomer.assignedTo);
      }
    }
  }, [prefilledCustomer]);

  // Typed gift rows only; the form always renders one extra empty row after them.
  const [selectedGifts, setSelectedGifts] = useState<string[]>([]);
  const trimTrailingEmpty = (rows: string[]) => {
    const out = rows.slice();
    while (out.length && out[out.length - 1] === '') out.pop();
    return out;
  };
  const isSuperAdmin = isAdminRole(currentUser);

  // Company Official Banking & QR Code Settings
  const [companyBankInfo, setCompanyBankInfo] = useState<CompanyBankInfo>(() => getStoredCompanyBankInfo());
  const [isEnlargeQrOpen, setIsEnlargeQrOpen] = useState(false);

  // Admin: Upload custom company QR Code to Supabase Storage / Cloud
  const handleCompanyQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSuperAdmin) {
      triggerToast('ສະເພາະ Admin ຈຶ່ງສາມາດອັບໂຫລດຮູບ QR ບໍລິສັດໄດ້!', 'error');
      return;
    }
    const input = e.target;
    const file = input.files?.[0];
    if (!file || !currentUser) return;
    try {
      triggerToast('ກຳລັງອັບໂຫຼດຮູບ QR ບໍລິສັດ...', 'info');
      const downloadUrl = await uploadCompanyQrCodeToStorage(file, currentUser);
      const updated: CompanyBankInfo = {
        ...companyBankInfo,
        qrCodeUrl: downloadUrl,
        updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        updatedBy: currentUser.name || 'Admin',
      };
      setCompanyBankInfo(updated);
      saveStoredCompanyBankInfo(updated);
      triggerToast('ປ່ຽນຮູບ QR ບໍລິສັດສຳເລັດ. ທຸກບັນຊີຈະເຫັນຮູບນີ້');
    } catch (err) {
      // No local-only fallback: a QR that only this browser can see would mislead other staff.
      triggerToast(`ອັບໂຫຼດຮູບ QR ບໍ່ສຳເລັດ: ${err instanceof Error ? err.message : 'ກະລຸນາລອງໃໝ່'}`, 'error');
    } finally {
      input.value = ''; // allow choosing the same file again
    }
  };

  // Admin: Reset Company QR back to official default
  const handleResetCompanyQr = async () => {
    if (!isSuperAdmin || !currentUser) return;
    if (!confirm('ທ່ານຕ້ອງການລຶບຮູບ QR ບໍລິສັດອອກບໍ່? ທຸກບັນຊີຈະບໍ່ເຫັນ QR ນີ້ອີກ')) return;
    try {
      await resetCompanyQrCode(currentUser);
    } catch (err) {
      triggerToast(`ລຶບຮູບ QR ບໍ່ສຳເລັດ: ${err instanceof Error ? err.message : 'ກະລຸນາລອງໃໝ່'}`, 'error');
      return;
    }
    const updated: CompanyBankInfo = {
      ...companyBankInfo,
      qrCodeUrl: null,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedBy: currentUser.name || 'Admin',
    };
    setCompanyBankInfo(updated);
    saveStoredCompanyBankInfo(updated);
    triggerToast('ລຶບຮູບ QR ບໍລິສັດແລ້ວ');
  };

  const [saleNotes, setSaleNotes] = useState('');

  // Generated Bill for Instant View Modal
  const [createdBill, setCreatedBill] = useState<InvoiceBillRecord | null>(null);

  // Customer Document Suite Modal state
  const [selectedDocCustomer, setSelectedDocCustomer] = useState<Lead | null>(null);
  const [activeDocType, setActiveDocType] = useState<DocumentType>('booking');

  const getPOSCustomerLead = (targetBill?: InvoiceBillRecord): Lead => {
    if (targetBill) {
      return {
        id: targetBill.leadId || targetBill.id,
        customerName: targetBill.customerName || (lang === 'lo' ? 'ລູກຄ້າ AVATR' : 'AVATR Customer'),
        phone: targetBill.customerPhone || '20XXXXXXXX',
        idCardNumber: targetBill.customerIDCard || '',
        village: '',
        district: '',
        province: targetBill.customerProvince || 'ນະຄອນຫຼວງວຽງຈັນ',
        category: 'walk_in',
        source: 'POS Showroom',
        interestedModel: targetBill.model,
        status: 'delivered',
        priority: 'vip',
        notes: `ອອກເອກະສານຈາກບິນຂາຍ: ${targetBill.billNumber} | VIN: ${targetBill.vin}`,
        // Real vehicle and payment data from the bill, so documents never fall back to placeholders.
        vin: targetBill.vin,
        engineNumber: targetBill.engineNumber,
        color: targetBill.color,
        plateNumber: targetBill.plateNumber,
        listPriceUSD: targetBill.unitPriceUSD ?? targetBill.netTotalUSD,
        discountUSD: targetBill.discountUSD,
        paidAmountUSD: targetBill.amountUSD,
        paymentTypeConfirmed: targetBill.paymentMethod === 'finance' ? 'down_payment' : 'full',
        giftItems: (targetBill.freeGifts || []).filter(Boolean).map(name => ({ name, costUSD: 0 })),
        paymentType: (targetBill.paymentMethod as any) || 'cash',
        paymentDate: targetBill.date,
        paymentReceiptNo: targetBill.billNumber,
        downPaymentPercent: targetBill.downPaymentPercent,
        downPaymentUSD: targetBill.downPaymentUSD,
        tenureMonths: targetBill.tenureMonths,
        assignedTo: targetBill.recordedBy || currentUser?.name || 'Admin',
        createdAt: targetBill.date || new Date().toISOString(),
      };
    }

    const v = selectedVehicle;
    const typedGifts = selectedGifts.map(g => g.trim()).filter(Boolean);
    return {
      // Keep what the CRM already knows (deposit, booking date, gifts with cost...).
      ...(prefilledCustomer || {}),
      vin: v?.vin || prefilledCustomer?.vin,
      engineNumber: v?.engineNumber || prefilledCustomer?.engineNumber,
      color: v?.color || prefilledCustomer?.color,
      plateNumber: v?.plateNumber || prefilledCustomer?.plateNumber,
      listPriceUSD: v ? v.priceUSD : prefilledCustomer?.listPriceUSD,
      discountUSD: v ? (Number(discountUSD) || 0) : prefilledCustomer?.discountUSD,
      giftItems: typedGifts.length > 0 ? typedGifts.map(name => ({ name, costUSD: 0 })) : prefilledCustomer?.giftItems,
      id: prefilledCustomer?.id || 'pos-lead-temp',
      customerName: customerName.trim() || (lang === 'lo' ? 'ລູກຄ້າຊື້ລົດ AVATR (POS)' : 'AVATR POS Customer'),
      phone: customerPhone.trim() || '20XXXXXXXX',
      idCardNumber: customerIDCard.trim() || '',
      village: customerVillage || customerCustomVillage || '',
      district: customerDistrict || '',
      province: customerProvince || 'ນະຄອນຫຼວງວຽງຈັນ',
      category: prefilledCustomer?.category || 'walk_in',
      source: prefilledCustomer?.source || 'POS Showroom',
      interestedModel: v ? v.model : (prefilledCustomer?.interestedModel || ''),
      status: 'negotiation', // not sold yet: sale-stage documents stay locked
      paymentTypeConfirmed: undefined,
      installmentStatus: undefined,
      vehicleDeliveredAt: undefined,
      priority: prefilledCustomer?.priority || 'high',
      notes: v ? `VIN: ${v.vin} | ສີ: ${v.color || '-'} | ປ້າຍ: ${v.plateNumber || '-'}` : '',
      paymentType: paymentMethod,
      paymentReceiptNo: prefilledCustomer?.paymentReceiptNo || '',
      downPaymentPercent: downPaymentPercent,
      downPaymentUSD: typeof downPaymentUSDInput === 'number' ? downPaymentUSDInput : undefined,
      tenureMonths: tenureMonths,
      assignedTo: currentUser?.name || 'Admin',
      createdAt: new Date().toISOString(),
    };
  };

  const handleOpenDocument = (docType: DocumentType, targetBill?: InvoiceBillRecord) => {
    const lead = getPOSCustomerLead(targetBill);
    setSelectedDocCustomer(lead);
    setActiveDocType(docType);
  };

  const triggerToast = (msg: string, type: ToastType = 'success') => {
    showToast(msg, type);
  };

  // Calculations
  const basePriceUSD = selectedVehicle ? selectedVehicle.priceUSD : 0;
  const netPriceUSD = Math.max(0, basePriceUSD - (discountUSD || 0));
  const effectiveExchangeRate = selectedVehicle && selectedVehicle.priceUSD > 0 && selectedVehicle.priceLAK > 0
    ? Math.round(selectedVehicle.priceLAK / selectedVehicle.priceUSD)
    : resolveLakExchangeRate();
  const netPriceLAK = netPriceUSD * effectiveExchangeRate;

  // Effective Down Payment Amount in USD
  const downPaymentUSD = downPaymentUSDInput !== ''
    ? Number(downPaymentUSDInput)
    : Math.round(netPriceUSD * (downPaymentPercent / 100));
  const downPaymentLAK = downPaymentUSD * effectiveExchangeRate;

  // Remaining Balance in USD (ຍອດຄົງເຫຼືອ / ຍອດຈັດສິນເຊື່ອ)
  const remainingBalanceUSD = Math.max(0, netPriceUSD - downPaymentUSD);
  const loanPrincipalUSD = remainingBalanceUSD;

  // Estimated monthly calculation (approx 7.5% per annum for Lao banks)
  const monthlyPaymentUSD = tenureMonths > 0
    ? Math.round((loanPrincipalUSD * (1 + 0.075 * (tenureMonths / 12))) / tenureMonths)
    : 0;
  const monthlyPaymentLAK = monthlyPaymentUSD * effectiveExchangeRate;

  // 2-Way Sync Handlers for Down Payment % and USD Amount
  const handleDownPaymentPercentChange = (val: number | '') => {
    if (val === '') {
      setDownPaymentPercent(0);
      setDownPaymentUSDInput('');
      return;
    }
    const percent = Math.min(100, Math.max(0, val));
    setDownPaymentPercent(percent);
    if (netPriceUSD > 0) {
      const calculatedUSD = Math.round((netPriceUSD * percent) / 100);
      setDownPaymentUSDInput(calculatedUSD);
    }
  };

  const handleDownPaymentUSDChange = (val: number | '') => {
    if (val === '') {
      setDownPaymentUSDInput('');
      setDownPaymentPercent(0);
      return;
    }
    const usd = Math.min(netPriceUSD, Math.max(0, val));
    setDownPaymentUSDInput(usd);
    if (netPriceUSD > 0) {
      const calculatedPercent = Number(((usd / netPriceUSD) * 100).toFixed(1));
      setDownPaymentPercent(Math.min(100, calculatedPercent));
    }
  };

  // Keep down payment USD in sync when netPriceUSD changes
  useEffect(() => {
    if (netPriceUSD > 0) {
      if (downPaymentUSDInput === '') {
        const calculatedUSD = Math.round((netPriceUSD * downPaymentPercent) / 100);
        setDownPaymentUSDInput(calculatedUSD);
      } else {
        const calculatedPercent = Number(((Number(downPaymentUSDInput) / netPriceUSD) * 100).toFixed(1));
        setDownPaymentPercent(Math.min(100, calculatedPercent));
      }
    }
  }, [netPriceUSD]);

  // Unique vehicle models with stock counts and hero images
  const modelCategories = useMemo(() => {
    const modelMap = new Map<string, { name: string; image: string; count: number }>();

    // Seed from registered vehicle models
    vehicles.forEach(v => {
      modelMap.set(v.name, {
        name: v.name,
        image: v.heroImage || '/avatr-logo.png',
        count: 0,
      });
    });

    // Count available vehicles in stock
    availableVehicles.forEach(item => {
      const existing = modelMap.get(item.model);
      if (existing) {
        existing.count += 1;
        if ((!existing.image || existing.image.includes('avatr-logo')) && item.image) {
          existing.image = item.image;
        }
      } else {
        modelMap.set(item.model, {
          name: item.model,
          image: item.image || '/avatr-logo.png',
          count: 1,
        });
      }
    });

    return Array.from(modelMap.values());
  }, [vehicles, availableVehicles]);

  // Handle switching model category with automatic first vehicle selection
  const handleSelectModelCategory = (categoryName: string) => {
    setSelectedModelCategory(categoryName);
    const matchingCars = availableVehicles.filter(item =>
      categoryName === 'all' ? true : item.model === categoryName
    );
    if (matchingCars.length > 0) {
      const isCurrentInMatching = matchingCars.some(c => c.vin === selectedVin);
      if (!isCurrentInMatching) {
        setSelectedVin(matchingCars[0].vin);
      }
    }
  };

  // Filtered available vehicles list by category and search
  const filteredAvailableVehicles = availableVehicles.filter(item => {
    if (selectedModelCategory !== 'all' && item.model !== selectedModelCategory) {
      return false;
    }
    if (!vehicleSearch.trim()) return true;
    const q = vehicleSearch.toLowerCase();
    return (
      item.vin.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q) ||
      (item.plateNumber || '').toLowerCase().includes(q) ||
      (item.color || '').toLowerCase().includes(q) ||
      (item.trim || '').toLowerCase().includes(q)
    );
  });

  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const submitLockRef = useRef(false);

  // CONFIRM SALE & DEDUCT STOCK
  const handleProcessSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || isProcessingSale) return;

    if (!selectedVehicle) {
      triggerToast('ກະລຸນາເລືອກລົດຍົນທີ່ຕ້ອງການຂາຍກ່ອນ!', 'error');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      triggerToast('ກະລຸນາປ້ອນຊື່ ແລະ ເບີໂທລະສັບ ຂອງລູກຄ້າ!', 'error');
      return;
    }

    submitLockRef.current = true;
    setIsProcessingSale(true);

    let customerLead!: Lead;
    let newBill!: InvoiceBillRecord;
    let remainingQty = 0;
    let invoiceNum = '';
    let saleDateTime = '';

    try {
      if (!currentUser?.id) throw new Error('Sign in again before recording this sale.');

      const currentQty = selectedVehicle.stockQuantity;
      remainingQty = Math.max(0, currentQty - 1);
      invoiceNum = await generateNextBillNumber('INV');
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      saleDateTime = saleDate ? `${saleDate} ${new Date().toTimeString().slice(0, 5)}` : now;

      const effectiveVillage = customerVillage === '__custom__' ? customerCustomVillage.trim() : customerVillage;
      const fullAddress = [
        customerAddressDetail.trim(),
        effectiveVillage,
        customerDistrict,
        customerProvince
      ].filter(Boolean).join(', ');

      // 1. DEDUCT STOCK (ຕັດສະຕ໋ອກອອກ)

      const normalizedPhone = customerPhone.replace(/\D/g, '');
      const matchedLead = prefilledCustomer
        ? (leads.find(lead => lead.id === prefilledCustomer.id) || prefilledCustomer)
        : (normalizedPhone
          ? leads.find(lead => lead.phone.replace(/\D/g, '') === normalizedPhone)
          : undefined);

      const effectiveSalesRep = salesRepName.trim() || matchedLead?.assignedTo || currentUser?.name || 'Admin';
    if (matchedLead) {
      customerLead = {
        ...matchedLead,
        customerName: customerName.trim(),
        phone: customerPhone.trim(),
        idCardNumber: customerIDCard.trim() || matchedLead.idCardNumber,
        province: customerProvince || matchedLead.province,
        district: customerDistrict || matchedLead.district,
        village: effectiveVillage || matchedLead.village,
        interestedModel: selectedVehicle.model,
        assignedTo: effectiveSalesRep,
        vin: selectedVehicle.vin,
        engineNumber: selectedVehicle.engineNumber || matchedLead.engineNumber,
        plateNumber: selectedVehicle.plateNumber || matchedLead.plateNumber,
        color: selectedVehicle.color || matchedLead.color,
        status: 'delivered',
        lastFollowUp: saleDateTime,
      };
    } else {
      customerLead = {
        id: newRecordId(),
        customerName: customerName.trim(),
        phone: customerPhone.trim(),
        idCardNumber: customerIDCard.trim() || undefined,
        province: customerProvince || 'ນະຄອນຫຼວງວຽງຈັນ',
        district: customerDistrict || '',
        village: effectiveVillage || '',
        category: 'walk_in',
        source: 'POS Showroom Sale',
        interestedModel: selectedVehicle.model,
        vin: selectedVehicle.vin,
        engineNumber: selectedVehicle.engineNumber,
        plateNumber: selectedVehicle.plateNumber,
        color: selectedVehicle.color,
        status: 'delivered',
        priority: 'high',
        notes: `ຊື້ລົດຜ່ານ POS ໃບບິນ ${invoiceNum} | VIN: ${selectedVehicle.vin}`,
        assignedTo: effectiveSalesRep,
        createdAt: saleDateTime,
        lastFollowUp: saleDateTime,
      };
    }

    if (paymentMethod === 'finance') {
      customerLead.paymentType = 'installment';
      customerLead.downPaymentPercent = downPaymentPercent;
      customerLead.downPaymentUSD = downPaymentUSD;
      customerLead.tenureMonths = tenureMonths;
      customerLead.monthlyPaymentLAK = monthlyPaymentLAK;
      customerLead.installmentStatus = 'active_repaying';
      customerLead.paymentReceiptNo = invoiceNum;
      customerLead.paymentDate = saleDateTime;
      customerLead.paidAmountUSD = downPaymentUSD;
      customerLead.paidAmountLAK = downPaymentLAK;
      customerLead.paymentTypeConfirmed = 'down_payment';
      customerLead.paymentConfirmedBy = currentUser?.name || 'Admin';

      // Generate complete installment repayment schedule (12, 24, 36, 48, 60 months)
      const baseSchedule = generateInstallmentSchedule(
        { ...customerLead, status: 'contract_signed' as any },
        netPriceUSD,
        effectiveExchangeRate,
        0.075
      );
      customerLead.installmentRecords = baseSchedule.map(rec => {
        const isPast = new Date(rec.dueDate) < new Date();
        return {
          ...rec,
          status: isPast ? ('due' as const) : ('pending' as const),
          paidDate: undefined,
          paidAmountUSD: undefined,
          paidAmountLAK: undefined,
          receiptNo: undefined,
          transferRef: undefined,
        };
      });
    } else {
      customerLead.paymentType = paymentMethod as any;
      customerLead.paymentReceiptNo = invoiceNum;
      customerLead.paymentDate = saleDateTime;
      customerLead.paidAmountUSD = netPriceUSD;
      customerLead.paidAmountLAK = netPriceLAK;
      customerLead.paymentTypeConfirmed = 'full';
      customerLead.paymentConfirmedBy = currentUser?.name || 'Admin';
    }

    // 2. CREATE OFFICIAL INVOICE BILL RECORD
    newBill = {
      id: newRecordId(),
      billType: 'sale',
      billNumber: invoiceNum,
      date: saleDateTime,
      vin: selectedVehicle.vin,
      engineNumber: selectedVehicle.engineNumber,
      model: selectedVehicle.model,
      trim: selectedVehicle.trim,
      plateNumber: selectedVehicle.plateNumber,
      color: selectedVehicle.color,
      interiorColor: selectedVehicle.interiorColor,
      battery: selectedVehicle.battery,
      quantity: 1,
      unitPriceUSD: selectedVehicle.priceUSD,
      unitPriceLAK: selectedVehicle.priceLAK,
      discountUSD: Number(discountUSD) || 0,
      discountLAK: (Number(discountUSD) || 0) * effectiveExchangeRate,
      netTotalUSD: netPriceUSD,
      netTotalLAK: netPriceLAK,
      amountUSD: paymentMethod === 'finance' ? downPaymentUSD : netPriceUSD,
      amountLAK: paymentMethod === 'finance' ? downPaymentLAK : netPriceLAK,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      leadId: customerLead.id,
      customerIDCard: customerIDCard.trim(),
      customerAddress: fullAddress || customerAddress.trim(),
      customerProvince,
      paymentMethod,
      qrUsed: 'company_official_qr',
      bankName: paymentMethod === 'transfer' ? bankName : undefined,
      transferRef: paymentMethod === 'transfer' ? transferRef || 'QR-CONFIRMED' : undefined,
      downPaymentPercent: paymentMethod === 'finance' ? downPaymentPercent : undefined,
      downPaymentUSD: paymentMethod === 'finance' ? downPaymentUSD : undefined,
      tenureMonths: paymentMethod === 'finance' ? tenureMonths : undefined,
      monthlyPaymentLAK: paymentMethod === 'finance' ? monthlyPaymentLAK : undefined,
      installmentType: paymentMethod === 'finance' ? 'down_payment' : undefined,
      freeGifts: selectedGifts.map(gift => gift.trim()).filter(Boolean),
      warrantyTerms: 'ຮັບປະກັນແບັດເຕີຣີ CATL 8 ປີ / 160,000 km | ຕົວລົດ 5 ປີ / 120,000 km',
      salesRep: effectiveSalesRep,
      recordedBy: currentUser?.name || effectiveSalesRep,
      notes: saleNotes || 'ຂາຍອອກຜ່ານລະບົບ POS ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ ພ້ອມຕັດສະຕ໋ອກອັດຕະໂນມັດ',
    };

      if (paymentMethod === 'transfer' && slipFile) {
        try {
          const uploadedPath = await uploadPaymentSlip(slipFile, newBill.billNumber || selectedVehicle.vin);
          newBill.paymentSlipPath = uploadedPath;
        } catch (slipErr) {
          throw new Error(
            slipErr instanceof Error
              ? `ອັບໂຫຼດສະລິບໂອນເງິນບໍ່ສຳເລັດ: ${slipErr.message}`
              : 'ອັບໂຫຼດສະລິບໂອນເງິນບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່!'
          );
        }
      }
      await saveLead(customerLead, currentUser.id, newBill);
    } catch (error) {
      const msg = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Sale could not be saved.';
      if (msg.includes('already has a stock-out movement') || msg.includes('already sold') || msg.includes('not available')) {
        const soldVin = selectedVehicle.vin;
        setInventory(prev => prev.map(item => item.vin === soldVin ? { ...item, status: 'sold', stockQuantity: 0 } : item));
        const nextCar = availableVehicles.find(v => v.vin !== soldVin);
        setSelectedVin(nextCar?.vin || '');
      }
      const friendlyMsg = msg.includes('require Supabase')
        ? 'ບໍ່ສາມາດບັນທຶກການຂາຍໄດ້: ໂໝດ Offline ເປັນພຽງການທົດລອງ, ການຂາຍຕ້ອງເຊື່ອມຕໍ່ຖານຂໍ້ມູນ'
        : msg.includes('already has a stock-out movement') || msg.includes('already sold') || msg.includes('not available')
          ? 'ລົດຄັນນີ້ຖືກຂາຍ ຫຼື ຕັດສະຕ໋ອກໄປແລ້ວ ກະລຸນາເລືອກຄັນອື່ນ'
          : msg;
      triggerToast(friendlyMsg, 'error');
      return;
    } finally {
      submitLockRef.current = false;
      setIsProcessingSale(false);
    }
    // Mark sold vehicle as sold & stockQuantity = 0 in inventory
    const soldVin = selectedVehicle.vin;
    setInventory(prev => prev.map(item => item.vin === soldVin ? { ...item, status: 'sold', stockQuantity: 0 } : item));
    const nextCar = availableVehicles.find(v => v.vin !== soldVin);
    setSelectedVin(nextCar?.vin || '');
    setBills(prev => [newBill, ...prev]);

    if (setLeads) {
      setLeads(prev => {
        const idx = prev.findIndex(l => l.id === customerLead.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = customerLead;
          return updated;
        }
        return [customerLead, ...prev];
      });
    }

    // 3. RECORD STOCK-OUT TRANSACTION LOG
    const newStockLog: StockLogRecord = {
      id: `LOG-OUT-${Date.now().toString().slice(-6)}`,
      billId: newBill.id,
      leadId: customerLead.id,
      type: 'stock_out',
      vin: selectedVehicle.vin,
      model: selectedVehicle.model,
      plateNumber: selectedVehicle.plateNumber,
      color: selectedVehicle.color,
      quantity: 1,
      priceUSD: netPriceUSD,
      priceLAK: netPriceLAK,
      timestamp: saleDateTime,
      recordedBy: currentUser?.name || 'Admin',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      paymentMethod,
      remainingStock: remainingQty,
      notes: `ຂາຍອອກຜ່ານ POS ໃບບິນເລກທີ ${invoiceNum} (ເຫຼືອໃນສາງ: ${remainingQty} ຄັນ)`,
    };

    setStockLogs(prev => [newStockLog, ...prev]);

    // Trigger Success UI & Open Printable Bill
    setCreatedBill(newBill);
    if (paymentMethod === 'finance') {
      triggerToast(`ຂາຍອອກສຳເລັດ (ຜ່ອນຊຳລະ)! ເພີ່ມຂໍ້ມູນເຂົ້າໝວດຜ່ອນ & ດາວ ແລະ ຕັດສະຕ໋ອກລົດ ${selectedVehicle.model} ອອກແລ້ວ (ເຫຼືອ ${remainingQty} ຄັນ)`);
    } else {
      triggerToast(`ຂາຍອອກສຳເລັດ! ຕັດສະຕ໋ອກລົດ ${selectedVehicle.model} ອອກແລ້ວ (ເຫຼືອ ${remainingQty} ຄັນ)`);
    }

    // Reset Form Fields for next transaction
    setCustomerName('');
    setCustomerPhone('');
    setCustomerIDCard('');
    setCustomerAddress('');
    setTransferRef('');
    setSlipFile(null);
    setSlipPreviewUrl(null);
    setDiscountUSD(0);
    setSaleNotes('');
    onClearPrefilledCustomer?.();
  };

  const [isExportingPosPdf, setIsExportingPosPdf] = useState(false);

  const handleDownloadPosPdf = async () => {
    if (!createdBill) return;
    try {
      setIsExportingPosPdf(true);
      const cleanName = (createdBill.customerName || createdBill.billNumber).replace(/[^a-zA-Z0-9\u0E80-\u0EFF_-]/g, '_');
      const filename = `AVATR_Sales_Invoice_${createdBill.billNumber}_${cleanName}.pdf`;
      await exportElementToPdf('printable-pos-receipt', {
        filename,
        margin: [0, 0, 0, 0],
        orientation: 'portrait',
        singlePage: true,
      });
      logIssuedDocument({
        docType: 'pos_receipt',
        docTitle: 'ໃບບິນຮັບເງິນ / ໃບແຈ້ງໜີ້ຂາຍລົດ POS',
        docNumber: createdBill.billNumber,
        customerName: createdBill.customerName || 'ລູກຄ້າທົ່ວໄປ',
        customerPhone: createdBill.customerPhone,
        leadId: createdBill.leadId,
        billId: createdBill.id,
        vin: createdBill.vin,
        model: createdBill.model,
        action: 'export_pdf',
        formatLabel: 'PDF (A4)',
        issuedBy: createdBill.recordedBy || currentUser?.name || 'Admin',
        amountUSD: createdBill.netTotalUSD,
        amountLAK: createdBill.netTotalLAK,
        notes: `ດາວໂຫຼດ PDF ໃບບິນ POS ເລກທີ ${createdBill.billNumber}`,
      });
      showToast(`ບັນທຶກປະຫວັດການດາວໂຫຼດ PDF ${createdBill.billNumber} ສຳເລັດ`, 'success');
    } catch (err) {
      console.error('Error generating POS receipt PDF:', err);
      showToast('ບໍ່ສາມາດດາວໂຫຼດ PDF ໄດ້', 'error');
    } finally {
      setIsExportingPosPdf(false);
    }
  };



  const handlePrintPosReceipt = () => {
    if (!createdBill) return;
    logIssuedDocument({
      docType: 'pos_receipt',
      docTitle: 'ໃບບິນຮັບເງິນ / ໃບແຈ້ງໜີ້ຂາຍລົດ POS',
      docNumber: createdBill.billNumber,
      customerName: createdBill.customerName || 'ລູກຄ້າທົ່ວໄປ',
      customerPhone: createdBill.customerPhone,
      leadId: createdBill.leadId,
      billId: createdBill.id,
      vin: createdBill.vin,
      model: createdBill.model,
      action: 'print',
      formatLabel: 'Print / ພິມ',
      issuedBy: createdBill.recordedBy || currentUser?.name || 'Admin',
      amountUSD: createdBill.netTotalUSD,
      amountLAK: createdBill.netTotalLAK,
      notes: `ພິມໃບບິນ POS ເລກທີ ${createdBill.billNumber}`,
    });
    window.print();
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 pb-16">

      {/* WRAPPER FOR POS VIEWS - SUPPRESSED DURING PRINT WHEN BILL IS BEING PRINTED */}
      <div className={createdBill ? "print:hidden hide-on-print-pos space-y-6" : "space-y-6"}>
        {/* Top Banner */}
        <div className="theme-adaptive-dark-surface relative overflow-hidden bg-linear-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800 p-5 sm:p-7 rounded-3xl shadow-xl">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/4 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="min-w-0">

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {t.posHeader || t.posTitle}
              </h1>

            </div>

            <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
              <div className="officer-indicator pos-assigned-officer theme-adaptive-dark-surface flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs sm:flex-none">
                <span className="officer-indicator-avatar grid h-8 w-8 shrink-0 place-items-center rounded-lg border">
                  <User className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="officer-indicator-label block text-[10px]">{t.assignedOfficer || 'ຜູ້ຮັບຜິດຊອບ'}</span>
                  <span className="officer-indicator-name block truncate font-semibold">
                    {currentUser?.name || 'Admin'}
                    <span className="officer-indicator-role ml-1 font-mono text-[10px]">({currentUser?.roleTitleLo?.split(' ')[0] || 'Staff'})</span>
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={onNavigateToBills}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:border-zinc-500 hover:bg-zinc-800 sm:flex-none"
              >
                <Receipt className="w-4 h-4 text-zinc-300" />
                <span>{t.filterSaleBills} ({bills.filter(b => b.billType === 'sale').length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>



        {availableVehicles.length > 0 && blockedOnHandCount > 0 && (
          <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300">
            {lang === 'lo'
              ? `ສະແດງສະເພາະລົດທີ່ຂາຍໄດ້ທັນທີ. ອີກ ${blockedOnHandCount} ຄັນໃນສາງຍັງຂາຍບໍ່ໄດ້ (ກຳລັງ PDI, ຫາກໍນຳເຂົ້າ ຫຼື ຈອງແລ້ວ): ເບິ່ງໃນໜ້າສະຕ໋ອກ.`
              : `Only cars that can be sold now are listed. ${blockedOnHandCount} more on hand cannot be sold yet (PDI, just imported or reserved).`}
          </p>
        )}
        {availableVehicles.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-400 space-y-4">
            <AlertCircle className="w-12 h-12 text-zinc-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">
              {lang === 'lo' ? 'ບໍ່ມີລົດວ່າງພ້ອມຂາຍໃນສະຕ໋ອກ!' : lang === 'th' ? 'ไม่มีรถว่างพร้อมจำหน่ายในสต็อก!' : 'No available vehicles in stock!'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              {lang === 'lo'
                ? 'ບໍ່ມີລົດທີ່ຜ່ານ PDI ແລະ ພ້ອມຂາຍ. ລົດທີ່ຈອງໄວ້ໃຫ້ລູກຄ້າຄົນອື່ນ ຫຼື ຍັງບໍ່ຜ່ານ PDI ຈະບໍ່ສະແດງຢູ່ນີ້.'
                : lang === 'th'
                  ? 'ไม่มีรถที่ผ่าน PDI และพร้อมขาย รถที่จองให้ลูกค้าคนอื่นหรือยังไม่ผ่าน PDI จะไม่แสดงที่นี่'
                  : 'No PDI-passed vehicles ready for sale. Cars reserved for other customers or not yet through PDI are not shown here.'}
            </p>
            {blockedOnHandCount > 0 && (
              <p className="text-xs font-semibold text-amber-400">
                {lang === 'lo'
                  ? `ມີ ${blockedOnHandCount} ຄັນໃນສາງທີ່ຍັງຂາຍບໍ່ໄດ້ (ກຳລັງ PDI, ຫາກໍນຳເຂົ້າ ຫຼື ຈອງແລ້ວ). ກວດເບິ່ງໃນໜ້າສະຕ໋ອກ.`
                  : `${blockedOnHandCount} vehicle(s) on hand cannot be sold yet (PDI, just imported or reserved). Check the Stock page.`}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleProcessSale} className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
            {/* Vehicle selection */}
            <div className="space-y-5 lg:col-span-5">
              <div className="pos-step1-section theme-adaptive-dark-surface rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm sm:p-6 text-slate-900 dark:text-white">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-slate-800 dark:text-white" />
                    <span>1. {t.selectVehicleToSell} <span className="text-red-500 font-bold ml-1">*</span></span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {t.stockAvailable}: {availableVehicles.length} {t.unitCars}
                  </span>
                </div>

                {/* 1.1 Category Cards: All Models + Each Model */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                      <span>{lang === 'lo' ? 'ເລືອກໝວດລຸ້ນລົດ:' : lang === 'th' ? 'เลือกหมวดรุ่นรถ:' : 'Select Model Category:'}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {modelCategories.length} {lang === 'lo' ? 'ໝວດ' : 'Models'}
                    </span>
                  </div>

                  <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 scrollbar-thin">
                    {/* Category Card: ALL (ໝວດທັງໝົດ) */}
                    <button
                      type="button"
                      onClick={() => handleSelectModelCategory('all')}
                      className={`relative shrink-0 w-28 sm:w-32 rounded-2xl border text-left overflow-hidden transition-all group cursor-pointer ${selectedModelCategory === 'all'
                        ? 'border-white bg-zinc-900 shadow-lg ring-2 ring-white/20'
                        : 'border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                        }`}
                    >
                      <div className="relative h-16 w-full bg-zinc-900 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center pb-3"><Car className="w-7 h-7 text-zinc-700" /></div>
                        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
                        {selectedModelCategory === 'all' && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                            <Check className="w-2.5 h-2.5 stroke-3" />
                          </span>
                        )}
                        <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/80 text-white border border-zinc-700 always-white-text">
                          {availableVehicles.length} {t.unitCars}
                        </span>
                      </div>
                      <div className="p-2">
                        <strong className="block text-xs font-bold text-white truncate">
                          {lang === 'lo' ? 'ທັງໝົດ' : lang === 'th' ? 'ทั้งหมด' : 'All Models'}
                        </strong>
                        <span className="block text-[10px] text-zinc-400 font-mono truncate">
                          {lang === 'lo' ? 'ທຸກລຸ້ນໃນສະຕ໋ອກ' : 'All in Stock'}
                        </span>
                      </div>
                    </button>

                    {/* Category Cards: Each Registered Model */}
                    {modelCategories.map((cat) => {
                      const isSelected = selectedModelCategory === cat.name;
                      return (
                        <button
                          type="button"
                          key={cat.name}
                          onClick={() => handleSelectModelCategory(cat.name)}
                          className={`relative shrink-0 w-28 sm:w-32 rounded-2xl border text-left overflow-hidden transition-all group cursor-pointer ${isSelected
                            ? 'border-white bg-zinc-900 shadow-lg ring-2 ring-white/20'
                            : 'border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                            }`}
                        >
                          <div className="relative h-16 w-full bg-zinc-900 overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center pb-3"><Car className="w-7 h-7 text-zinc-700" /></div>
                            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
                            {isSelected && (
                              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                                <Check className="w-2.5 h-2.5 stroke-3" />
                              </span>
                            )}
                            <span className={`absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border always-white-text ${cat.count > 0
                              ? 'bg-black/80 text-white border-zinc-700'
                              : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                              }`}>
                              {cat.count > 0 ? `${cat.count} ${t.unitCars}` : (lang === 'lo' ? 'ໝົດ' : 'Out')}
                            </span>
                          </div>
                          <div className="p-2">
                            <strong className="block text-xs font-bold text-white truncate">
                              {cat.name}
                            </strong>
                            <span className="block text-[10px] text-zinc-400 font-mono truncate">
                              {cat.count} {lang === 'lo' ? 'ຄັນພ້ອມສົ່ງ' : 'available'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search Available Stock */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={lang === 'lo' ? 'ຄົ້ນຫາດ້ວຍ VIN, ລຸ້ນ, ສີ ຫຼື ປ້າຍທະບຽນ...' : t.searchPlaceholder}
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                  />
                </div>

                {/* Vehicle Options List: Visual Car Cards */}
                <div className="max-h-85 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                  {filteredAvailableVehicles.map((item) => {
                    const isSelected = selectedVin === item.vin;

                    return (
                      <button
                        type="button"
                        key={item.vin}
                        onClick={() => setSelectedVin(item.vin)}
                        aria-pressed={isSelected}
                        className={`p-2.5 rounded-2xl border cursor-pointer transition-all ${isSelected
                          ? 'bg-zinc-900 border-white shadow-md text-white ring-2 ring-white/20'
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:bg-zinc-900/70'
                          } w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white flex gap-3 items-center`}
                      >
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow shrink-0">
                              <Check className="w-3 h-3 stroke-3" aria-hidden="true" />
                            </span>
                          )}

                          {/* Car Thumbnail Image */}
                          <div className="relative w-16 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                            <div className="absolute inset-0 flex items-center justify-center"><Car className="w-6 h-6 text-zinc-600" /></div>
                          </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <strong className="text-white text-xs font-bold truncate">{item.model}</strong>
                            <span className="font-mono text-white text-xs font-bold shrink-0 ml-1">
                              ${item.priceUSD.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
                            <span className="truncate">VIN: {item.vin}</span>
                            {isSelected && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-current px-1.5 py-0.5 text-[10px] font-sans font-bold leading-none">
                                <Check className="h-3 w-3" aria-hidden="true" />
                                {lang === 'lo' ? 'ເລືອກແລ້ວ' : lang === 'th' ? 'เลือกแล้ว' : 'Selected'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                            <span className="flex items-center gap-1.5 truncate">
                              {item.colorHex && (
                                <span className="w-2 h-2 rounded-full border border-zinc-600 shrink-0" style={{ backgroundColor: item.colorHex }} />
                              )}
                              <span className="truncate">{item.color || '-'}</span>
                              {item.plateNumber && (
                                <span className="px-1 py-0.2 rounded bg-zinc-800 text-[9px] font-mono text-zinc-300">
                                  {item.plateNumber}
                                </span>
                              )}
                            </span>
                            <span className="text-zinc-300 font-mono shrink-0 ml-1">
                              {t.tableStock}: <strong>{item.stockQuantity}</strong>
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {filteredAvailableVehicles.length === 0 && (
                    <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center">
                      <Search className="mx-auto mb-2 h-5 w-5 text-zinc-500" />
                      <p className="text-xs font-medium text-zinc-300">
                        {lang === 'lo' ? 'ບໍ່ພົບລົດຕາມຄຳຄົ້ນຫາ' : lang === 'th' ? 'ไม่พบรถที่ตรงกับการค้นหา' : 'No matching vehicles found'}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {lang === 'lo' ? 'ລອງຄົ້ນຫາດ້ວຍລຸ້ນລົດ, VIN ຫຼື ສີ' : lang === 'th' ? 'ลองค้นหาด้วยรุ่นรถ VIN หรือสี' : 'Try searching by model, VIN, or color'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Selected Vehicle Visual Card */}
                {selectedVehicle && (
                  <div className="pt-4 border-t border-zinc-800 space-y-3">
                    <div className="relative h-36 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
                      <div className="absolute inset-0 flex items-center justify-center"><Car className="w-12 h-12 text-zinc-700 stroke-[1.5]" /></div>
                      <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/80 text-white border border-zinc-700 font-mono shadow-md backdrop-blur-md always-white-text">
                        <span className="text-white" style={{ color: '#ffffff' }}>{t.tableStock}: {selectedVehicle.stockQuantity} {t.unitCars}</span>
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/80 text-white border border-zinc-700 font-mono shadow-md backdrop-blur-md always-white-text">
                        <span className="text-white" style={{ color: '#ffffff' }}>{selectedVehicle.plateNumber}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-zinc-400">
                        <span>{t.tableStock}:</span>
                        <span className="text-white font-bold font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">{selectedVehicle.stockQuantity} {t.unitCars}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>{t.trimSpec}:</span>
                        <span className="text-white font-medium text-right truncate max-w-42.5">{selectedVehicle.trim}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>{lang === 'lo' ? 'ແບັດເຕີຣີ:' : lang === 'th' ? 'แบตเตอรี่:' : 'Battery:'}</span>
                        <span className="text-white font-medium">{selectedVehicle.battery}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>{t.bodyColor}:</span>
                        <span className="text-white font-medium">{selectedVehicle.color || '-'}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>{t.warehouseDest}:</span>
                        <span className="text-zinc-300 font-medium truncate max-w-42.5">{selectedVehicle.location}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Customer, payment and checkout */}
            <div className="space-y-5 lg:col-span-7">
              {/* Step 2: Customer Details */}
              <div className="pos-customer-section theme-adaptive-dark-surface rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800 text-white font-bold text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-white" />
                    <span>2. {t.buyerInfo}</span>
                  </div>
                  {prefilledCustomer ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                        <span>CRM: {prefilledCustomer.customerName}</span>
                      </span>
                      {onChooseCustomer && (
                        <button
                          type="button"
                          onClick={onChooseCustomer}
                          className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
                          title={lang === 'lo' ? 'ເລືອກລູກຄ້າຄົນອື່ນ' : lang === 'th' ? 'เลือกลูกค้าคนอื่น' : 'Choose another customer'}
                        >
                          <UserSearch className="w-3.5 h-3.5" />
                          <span>{lang === 'lo' ? 'ປ່ຽນລູກຄ້າ' : lang === 'th' ? 'เปลี่ยนลูกค้า' : 'Change'}</span>
                        </button>
                      )}
                    </div>
                  ) : onChooseCustomer && (
                    <button
                      type="button"
                      onClick={onChooseCustomer}
                      className="pos-choose-customer min-h-9 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserSearch className="w-3.5 h-3.5" />
                      <span>{lang === 'lo' ? 'ເລືອກລູກຄ້າຈາກ CRM' : lang === 'th' ? 'เลือกลูกค้าจาก CRM' : 'Choose CRM customer'}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 2xl:grid-cols-3">
                  <div className="min-w-0">
                    <label className="block text-zinc-400 mb-1 font-medium truncate">{t.buyerName} <span className="text-red-500 font-bold ml-1">*</span></label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={lang === 'lo' ? 'ຕົວຢ່າງ: ທ່ານ ບຸນມີ ໄຊຍະວົງ' : lang === 'th' ? 'ตัวอย่าง: คุณ สมชาย ใจดี' : 'e.g. Mr. Somxay Phomvihane'}
                      className="w-full min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20 transition-colors"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-zinc-400 mb-1 font-medium flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-white shrink-0" />
                      <span className="truncate">ວັນທີອອກບິນ (ວັນ/ເດືອນ/ປີ) <span className="text-red-500 font-bold ml-1">*</span></span>
                    </label>
                    <input
                      type="date"
                      required
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20 transition-colors"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-1.5 mb-1 min-w-0">
                      <label className="text-zinc-400 font-medium truncate">{t.buyerPhone} <span className="text-red-500 font-bold ml-1">*</span></label>
                      {canOpenWhatsApp && (
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/50 shrink-0 max-w-32.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                          <span className="truncate">WA: {formatWhatsAppDisplay(customerPhone)}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 min-w-0">
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="020 5xxxxxxx"
                        className="min-w-0 flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20 transition-colors"
                      />
                      <button
                        type="button"
                        disabled={!canOpenWhatsApp}
                        onClick={() => openWhatsApp(customerPhone, customerName, selectedVehicle?.model, lang)}
                        className={`pos-whatsapp-button inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all shadow-sm sm:px-3 ${canOpenWhatsApp
                          ? 'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 cursor-pointer'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                          }`}
                        aria-label={lang === 'lo' ? 'ເປີດ WhatsApp ຫາລູກຄ້າ' : lang === 'th' ? 'เปิด WhatsApp ถึงลูกค้า' : 'Open WhatsApp for customer'}
                        title={canOpenWhatsApp
                          ? 'ກົດເພື່ອເປີດ WhatsApp ຕາມເບີໂທທີ່ປ້ອນເຂົ້າໄປ'
                          : lang === 'lo' ? 'ປ້ອນເບີໂທທີ່ຖືກຕ້ອງກ່ອນ' : lang === 'th' ? 'กรอกหมายเลขโทรศัพท์ที่ถูกต้องก่อน' : 'Enter a valid phone number first'}
                      >
                        <WhatsAppIcon className="h-4 w-4 shrink-0" />
                        <span className="hidden sm:inline lg:hidden 2xl:inline">WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-zinc-400 mb-1 font-medium truncate">
                      {lang === 'lo' ? 'ເລກບັດປະຊາຊົນ / Passport' : lang === 'th' ? 'เลขบัตรประจำตัว / Passport' : 'ID Card / Passport'}
                    </label>
                    <input
                      type="text"
                      value={customerIDCard}
                      onChange={(e) => setCustomerIDCard(e.target.value)}
                      placeholder="ID-01-VTE-884920 / P0123456"
                      className="w-full min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20 transition-colors"
                    />
                  </div>

                  {/* Sales Consultant Attribution (ຊິງຄ໌ເຂົ້າ Top Sales Leaderboard) */}
                  <div className="min-w-0">
                    <label className="block text-amber-400 mb-1 font-semibold truncate">
                      {lang === 'lo' ? 'ທີ່ປຶກສາການຂາຍ (Top Sales)' : lang === 'th' ? 'ที่ปรึกษาการขาย (Top Sales)' : 'Sales Consultant'} <span className="text-red-500 font-bold ml-1">*</span>
                    </label>
                    <select
                      id="pos-sales-rep"
                      required
                      value={salesRepName}
                      disabled={!isAdmin}
                      onChange={(e) => {
                        if (isAdmin) setSalesRepName(e.target.value);
                      }}
                      className={`w-full min-w-0 bg-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/20 transition-colors ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <option value="" disabled>{lang === 'lo' ? 'ເລືອກທີ່ປຶກສາການຂາຍ...' : 'Choose a sales consultant...'}</option>
                      {salesRepSuggestions.map((rep) => (
                        <option key={rep} value={rep}>{rep}</option>
                      ))}
                      {/* Keep a consultant recorded on the customer even if the account is no longer active */}
                      {salesRepName && !salesRepSuggestions.includes(salesRepName) && (
                        <option value={salesRepName}>{salesRepName} {lang === 'lo' ? '(ຜູ້ຮັບຜິດຊອບລູກຄ້າ)' : '(customer owner)'}</option>
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-2 2xl:col-span-3 grid grid-cols-1 gap-4 sm:grid-cols-3 min-w-0">
                    {/* Province Selector */}
                    <div className="min-w-0">
                      <label className="block text-zinc-400 mb-1 font-medium truncate">
                        ແຂວງ / ນະຄອນຫຼວງ <span className="text-red-500 font-bold ml-1">*</span>
                      </label>
                      <div className="relative min-w-0" ref={provinceDropdownRef}>
                      <button
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={isProvinceDropdownOpen}
                        onClick={() => {
                          setIsProvinceDropdownOpen(open => !open);
                          setIsDistrictDropdownOpen(false);
                          setIsVillageDropdownOpen(false);
                        }}
                        className="pos-province-trigger flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-white transition-colors hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                      >
                        <span className="truncate">
                          {selectedProvince?.nameLo || customerProvince}
                        </span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isProvinceDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isProvinceDropdownOpen && (
                        <div
                          role="listbox"
                          aria-label="ເລືອກແຂວງ"
                          className="pos-province-options absolute left-0 top-full z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl"
                        >
                          {LAO_PROVINCES.map(province => (
                            <button
                              key={province.id}
                              type="button"
                              role="option"
                              aria-selected={customerProvince === province.nameLo}
                              onClick={() => {
                                setCustomerProvince(province.nameLo);
                                setCustomerDistrict(province.districts[0]?.nameLo || '');
                                setCustomerVillage(province.districts[0]?.popularVillages[0] || '');
                                setIsProvinceDropdownOpen(false);
                              }}
                              className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${customerProvince === province.nameLo
                                ? 'pos-province-option-selected bg-zinc-800 text-white'
                                : 'text-zinc-300 hover:bg-zinc-800'
                                }`}
                            >
                              <span>{province.nameLo}</span>
                              <span className="shrink-0 text-[10px] text-zinc-500">{province.nameEn}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      </div>
                    </div>

                    {/* District Selector */}
                    <div className="min-w-0">
                      <label className="block text-zinc-400 mb-1 font-medium truncate">
                        ເມືອງ <span className="text-red-500 font-bold ml-1">*</span>
                      </label>
                      <div className="relative min-w-0" ref={districtDropdownRef}>
                      <button
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={isDistrictDropdownOpen}
                        onClick={() => {
                          setIsDistrictDropdownOpen(open => !open);
                          setIsProvinceDropdownOpen(false);
                          setIsVillageDropdownOpen(false);
                        }}
                        className="pos-province-trigger flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-white transition-colors hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                      >
                        <span className="truncate">
                          {districtOptions.find(district => district.nameLo === selectedDistrictName)?.nameLo || selectedDistrictName}
                        </span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isDistrictDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isDistrictDropdownOpen && (
                        <div
                          role="listbox"
                          aria-label="ເລືອກເມືອງ"
                          className="pos-province-options absolute left-0 top-full z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl"
                        >
                          {districtOptions.map(district => (
                            <button
                              key={district.nameLo}
                              type="button"
                              role="option"
                              aria-selected={selectedDistrictName === district.nameLo}
                              onClick={() => {
                                setCustomerDistrict(district.nameLo);
                                setCustomerVillage(district.popularVillages[0] || '');
                                setIsDistrictDropdownOpen(false);
                              }}
                              className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${selectedDistrictName === district.nameLo
                                ? 'pos-province-option-selected bg-zinc-800 text-white'
                                : 'text-zinc-300 hover:bg-zinc-800'
                                }`}
                            >
                              <span>{district.nameLo}</span>
                              <span className="shrink-0 text-[10px] text-zinc-500">{district.nameEn}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      </div>
                    </div>

                    {/* Village Selector */}
                    <div className="min-w-0">
                      <label className="block text-zinc-400 mb-1 font-medium">
                        ບ້ານ <span className="text-red-500 font-bold ml-1">*</span>
                      </label>
                      <div className="relative" ref={villageDropdownRef}>
                      <button
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={isVillageDropdownOpen}
                        onClick={() => {
                          setIsVillageDropdownOpen(open => !open);
                          setIsProvinceDropdownOpen(false);
                          setIsDistrictDropdownOpen(false);
                        }}
                        className="pos-province-trigger flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-white transition-colors hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                      >
                        <span className="truncate">
                          {customerVillage === '__custom__'
                            ? '+ ບ້ານອື່ນ...'
                            : customerVillage || 'ເລືອກບ້ານ'}
                        </span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isVillageDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isVillageDropdownOpen && (
                        <div
                          role="listbox"
                          aria-label="ເລືອກບ້ານ"
                          className="pos-province-options absolute left-0 top-full z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl"
                        >
                          {villageOptions.map(village => (
                            <button
                              key={village}
                              type="button"
                              role="option"
                              aria-selected={customerVillage === village}
                              onClick={() => {
                                setCustomerVillage(village);
                                setIsVillageDropdownOpen(false);
                              }}
                              className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${customerVillage === village
                                ? 'pos-province-option-selected bg-zinc-800 text-white'
                                : 'text-zinc-300 hover:bg-zinc-800'
                                }`}
                            >
                              <span>{village}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            role="option"
                            aria-selected={customerVillage === '__custom__'}
                            onClick={() => {
                              setCustomerVillage('__custom__');
                              setIsVillageDropdownOpen(false);
                            }}
                            className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${customerVillage === '__custom__'
                              ? 'pos-province-option-selected bg-zinc-800 text-white'
                              : 'text-zinc-300 hover:bg-zinc-800'
                              }`}
                          >
                            <span>+ ບ້ານອື່ນ...</span>
                          </button>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>

                  {customerVillage === '__custom__' && (
                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">
                        ຊື່ບ້ານ *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerCustomVillage}
                        onChange={(e) => setCustomerCustomVillage(e.target.value)}
                        placeholder="ປ້ອນຊື່ບ້ານ..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                      />
                    </div>
                  )}

                  <div className="sm:col-span-2 2xl:col-span-3">
                    <label className="block text-zinc-400 mb-1 font-medium">
                      ເຮືອນເລກທີ / ຖະໜົນ / ຮ່ອມ
                    </label>
                    <input
                      type="text"
                      value={customerAddressDetail}
                      onChange={(e) => setCustomerAddressDetail(e.target.value)}
                      placeholder="ເຊັ່ນ 45, ຮ່ອມ 12"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Payment & Financial Terms */}
              <div className="pos-step3-section theme-adaptive-dark-surface rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm sm:p-6 space-y-4 text-slate-900 dark:text-white">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold text-sm">
                  <CreditCard className="w-4 h-4 text-slate-800 dark:text-white" />
                  <span>3. {t.paymentType}</span>
                </div>

                {/* Payment Method Selector */}
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    aria-pressed={paymentMethod === 'transfer'}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${paymentMethod === 'transfer'
                      ? 'bg-white text-black font-bold shadow-md border-white ring-2 ring-white/15'
                      : 'bg-slate-100 dark:bg-zinc-900/90 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 hover:border-slate-400 dark:hover:border-zinc-500 hover:text-slate-950 dark:hover:text-white'
                      } min-h-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                  >
                    <QrCode className={`w-5 h-5 mb-1 ${paymentMethod === 'transfer' ? 'text-black' : 'text-slate-700 dark:text-zinc-200'}`} />
                    <span>{t.paymentTransfer}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    aria-pressed={paymentMethod === 'cash'}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${paymentMethod === 'cash'
                      ? 'bg-white text-black font-bold shadow-md border-white ring-2 ring-white/15'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                      } min-h-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                  >
                    <Banknote className={`w-5 h-5 mb-1 ${paymentMethod === 'cash' ? 'text-black' : 'text-slate-700 dark:text-zinc-200'}`} />
                    <span>{t.paymentCash}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('finance')}
                    aria-pressed={paymentMethod === 'finance'}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${paymentMethod === 'finance'
                      ? 'bg-white text-black font-bold shadow-md border-white ring-2 ring-white/15'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                      } min-h-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                  >
                    <Building2 className={`w-5 h-5 mb-1 ${paymentMethod === 'finance' ? 'text-black' : 'text-slate-700 dark:text-zinc-200'}`} />
                    <span>{t.paymentInstallments}</span>
                  </button>
                </div>

                {/* Dealership Company QR Code Payment Details */}
                {paymentMethod === 'transfer' && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs space-y-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-zinc-800 text-zinc-200 rounded-lg border border-zinc-700">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">QR Code ຊຳລະເງິນທາງການຂອງບໍລິສັດ AVATR LAOS</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSuperAdmin ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1 shadow-sm">
                            <ShieldCheck className="w-3 h-3 text-zinc-200" /> Admin
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-zinc-200" /> OFFICIAL QR PAYMENT
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Admin Management Controls Toolbar */}
                    {isSuperAdmin && (
                      <div className="p-3.5 bg-zinc-950 border border-zinc-700 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-inner">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="p-1.5 bg-zinc-800 text-zinc-200 rounded-lg border border-zinc-700">
                            <ShieldCheck className="w-4 h-4" />
                          </span>
                          <div>
                            <span className="font-bold text-white text-xs block">ສິດ Admin: ຈັດການຮູບ QR ບໍລິສັດ</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Direct File Upload for Admin */}
                          <label className="cursor-pointer px-3.5 py-2 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all border border-zinc-300">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{companyBankInfo.qrCodeUrl ? 'ປ່ຽນຮູບ QR ບໍລິສັດ' : 'ອັບໂຫລດຮູບ QR ບໍລິສັດ'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleCompanyQrUpload}
                            />
                          </label>

                          {/* Reset Button if Custom QR exists */}
                          {companyBankInfo.qrCodeUrl && (
                            <button
                              type="button"
                              onClick={handleResetCompanyQr}
                              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs border border-zinc-700 transition-colors flex items-center gap-1.5"
                              title="ລຶບຮູບ QR ບໍລິສັດອອກ (ທຸກບັນຊີຈະບໍ່ເຫັນ)"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>ລຶບ QR</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Regular User Read-Only Indicator */}
                    {!isSuperAdmin && (
                      <div className="qr-user-indicator p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2.5 text-xs transition-colors shadow-sm bg-zinc-950/70 border-zinc-800 text-zinc-300">
                        <div className="flex items-center gap-2.5">
                          <span className="qr-user-icon-wrap p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-xs">
                            <Lock className="w-3.5 h-3.5 text-zinc-400" />
                          </span>
                          <span className="font-semibold text-[11px] text-zinc-200">
                            ຮູບ QR ບັນຊີທາງການຂອງບໍລິສັດ (ອັບໂຫລດ ແລະ ຄວບຄຸມໂດຍ Admin)
                          </span>
                        </div>
                        <span className="qr-user-badge text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800 shadow-sm">
                          User ທຳມະດາ: ສະແດງ QR ໃຫ້ລູກຄ້າສະແກນ
                        </span>
                      </div>
                    )}

                    {/* Centered Luxury Official QR Code Card */}
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className="w-full max-w-sm flex flex-col items-center justify-center p-5 sm:p-6 bg-white rounded-3xl shadow-2xl text-black space-y-3.5 border border-zinc-200">
                        <div className="w-full text-center border-b border-zinc-200 pb-2">
                          <span className="text-xs font-black tracking-wider text-black block truncate">
                            {companyBankInfo.accountName || DEFAULT_COMPANY_BANK_INFO.accountName}
                          </span>
                        </div>

                        {/* Display Custom Uploaded QR or Stylized Vector QR */}
                        <div className="relative p-2.5 bg-white rounded-2xl border-2 border-black flex items-center justify-center min-h-45 w-full max-w-52.5 overflow-hidden shadow-inner">
                          {companyBankInfo.qrCodeUrl ? (
                            <img
                              src={companyBankInfo.qrCodeUrl}
                              alt="Official Company QR Code"
                              className="w-44 h-44 object-contain rounded-xl shadow-sm"
                            />
                          ) : (
                            <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 text-center px-3" role="status">
                              <QrCode className="w-10 h-10 text-zinc-300" aria-hidden="true" />
                              <span className="text-xs font-bold text-black">ຍັງບໍ່ມີຮູບ QR ບໍລິສັດ</span>
                              <span className="text-[11px] text-zinc-500 leading-snug">ໃຫ້ Admin ອັບໂຫຼດຮູບ QR ກ່ອນ. ຫ້າມໃຫ້ລູກຄ້າໂອນຈົນກວ່າຈະມີ QR ທາງການ</span>
                            </div>
                          )}
                        </div>

                        <div className="w-full text-center pt-2 border-t border-zinc-200">
                          <span className="text-xs font-mono font-black text-black block">
                            ຍອດຊຳລະ: ${netPriceUSD.toLocaleString()} USD
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsEnlargeQrOpen(true)}
                          className="w-full py-2 px-3 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-white" />
                          <span>ຂະຫຍາຍເບິ່ງ QR</span>
                        </button>
                      </div>
                    </div>

                    {/* Transfer Reference & Payment Slip Upload Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                          {lang === 'lo' ? 'ເລກອ້າງອີງການໂອນ' : lang === 'th' ? 'เลขอ้างอิงการโอนเงิน' : 'Transfer Ref / Slip No.'}
                        </label>
                        <input
                          type="text"
                          value={transferRef}
                          onChange={(e) => setTransferRef(e.target.value)}
                          placeholder="e.g. TX-982341..."
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                          {lang === 'lo' ? 'ແນບສະລິບການໂອນເງິນ (ບໍ່ບັງຄັບ)' : lang === 'th' ? 'แนบสลิปการโอนเงิน (ไม่บังคับ)' : 'Payment Slip (Optional)'}
                        </label>
                        {!slipPreviewUrl ? (
                          <label className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-950 hover:bg-zinc-800 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl text-xs text-zinc-300 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 text-zinc-400" />
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    alert('File exceeds 10MB limit');
                                    return;
                                  }
                                  setSlipFile(file);
                                  if (file.type.startsWith('image/')) {
                                    setSlipPreviewUrl(URL.createObjectURL(file));
                                  } else {
                                    setSlipPreviewUrl('pdf');
                                  }
                                }
                              }}
                            />
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-1.5 bg-zinc-950 border border-zinc-700 rounded-xl">
                            <div className="flex items-center gap-2 overflow-hidden">
                              {slipPreviewUrl !== 'pdf' ? (
                                <img src={slipPreviewUrl} alt="Slip" className="w-8 h-8 object-cover rounded-lg border border-zinc-800" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-red-400">PDF</div>
                              )}
                              <span className="text-[11px] text-zinc-300 truncate max-w-30">{slipFile?.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSlipFile(null);
                                setSlipPreviewUrl(null);
                              }}
                              className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                              title="ລຶບຮູບສະລິບ"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <span className="text-[10px] text-zinc-500 mt-1 block">
                          {lang === 'lo' ? 'ລະບົບຈະບີບອັດ WebP <= 300KB ອັດຕະໂນມັດ' : 'ระบบบีบอัดเป็น WebP <= 300KB อัตโนมัติ'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financing Details */}
                {paymentMethod === 'finance' && (
                  <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800 space-y-3.5 text-xs">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-zinc-300" />
                        <span>{lang === 'lo' ? 'ລາຍລະອຽດການວາງດາວ & ຜ່ອນຊຳລະ' : lang === 'th' ? 'รายละเอียดเงินดาวน์ & การผ่อนชำระ' : 'Installment & Down Payment Details'}</span>
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {lang === 'lo' ? 'ລາຄາລົດສຸດທິ: ' : 'Net: '}<strong className="text-white">${netPriceUSD.toLocaleString()} USD</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* 1. Down Payment Percent (%) */}
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">
                          {lang === 'lo' ? 'ວາງເງິນດາວ (%)' : lang === 'th' ? 'เงินดาวน์ (%)' : 'Down Payment (%)'}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={downPaymentPercent === 0 && downPaymentUSDInput === '' ? '' : downPaymentPercent}
                            onChange={(e) => handleDownPaymentPercentChange(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="30"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs font-bold pointer-events-none">
                            %
                          </span>
                        </div>
                      </div>

                      {/* 2. Down Payment Amount ($ USD) */}
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">
                          {lang === 'lo' ? 'ຈຳນວນເງິນວາງດາວ ($ USD)' : lang === 'th' ? 'จำนวนเงินดาวน์ ($ USD)' : 'Down Payment Amount ($ USD)'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs font-bold pointer-events-none">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            max={netPriceUSD}
                            value={downPaymentUSDInput}
                            onChange={(e) => handleDownPaymentUSDChange(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="0"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                          />
                        </div>
                      </div>

                      {/* 3. Remaining Balance ($ USD) Auto Calculated */}
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">
                          {lang === 'lo' ? 'ຍອດຄົງເຫຼືອ / ຍອດຈັດສິນເຊື່ອ ($ USD)' : lang === 'th' ? 'ยอดคงเหลือจัดไฟแนนซ์ ($ USD)' : 'Remaining Balance ($ USD)'}
                        </label>
                        <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white font-mono flex items-center justify-between shadow-inner">
                          <span className="text-zinc-500 text-xs">$</span>
                          <span className="font-bold text-sm text-emerald-400 tracking-tight">
                            ${remainingBalanceUSD.toLocaleString()} USD
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
                          ({lang === 'lo' ? 'ລາຄາສຸດທິ' : 'Net'} ${netPriceUSD.toLocaleString()} - {lang === 'lo' ? 'ເງິນດາວ' : 'Down'} ${downPaymentUSD.toLocaleString()})
                        </span>
                      </div>

                      {/* 4. Tenure Months */}
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">
                          {lang === 'lo' ? 'ໄລຍະເວລາຜ່ອນ (ເດືອນ)' : lang === 'th' ? 'ระยะเวลาผ่อน (เดือน)' : 'Tenure (Months)'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={tenureMonths}
                          onChange={(e) => setTenureMonths(Number(e.target.value))}
                          placeholder="48"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                        />
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
                          {Math.floor(tenureMonths / 12)} {lang === 'lo' ? 'ປີ' : 'Years'}{tenureMonths % 12 ? ` ${tenureMonths % 12} ${lang === 'lo' ? 'ເດືອນ' : 'Months'}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Calculated Finance Summary */}
                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-400">
                        {lang === 'lo' ? 'ຄ່າງວດປະມານການຕໍ່ເດືອນ:' : lang === 'th' ? 'ค่างวดประมาณการต่อเดือน:' : 'Estimated Monthly Payment:'}
                      </span>
                      <div className="text-right">
                        <span className="text-white font-bold text-sm">
                          ${monthlyPaymentUSD.toLocaleString()} USD / {lang === 'lo' ? 'ເດືອນ' : 'month'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Discount Input (USD Only - Admin Controlled) */}
                <div className="text-xs pt-2">
                  <div className="max-w-md">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-zinc-400 font-medium">
                        ສ່ວນຫຼຸດພິເສດ ($ USD){!isAdmin ? (lang === 'lo' ? ' (ສຳລັບ Admin)' : ' (Admin Only)') : ''}
                      </label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs font-bold">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={discountUSD}
                        readOnly={!isAdmin}
                        disabled={!isAdmin}
                        onChange={(e) => handleDiscountChange(e.target.value === '' ? '' : Number(e.target.value))}
                        className={`w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-white font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Free Gifts & After-sales Services */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-zinc-300" />
                    <span>4. {lang === 'lo' ? 'ຂອງແຖມ ແລະ ບໍລິການຫຼັງການຂາຍ' : lang === 'th' ? 'ของแถมและบริการหลังการขาย' : 'Free Gifts & After-sales Services'}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* Always one empty row at the end; typing in it creates the next one (no add button). */}
                  {[...selectedGifts, ''].map((gift, index, rows) => (
                    <div key={index} className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`free-gift-${index}`}>
                        {lang === 'lo' ? `ລາຍການຂອງແຖມ ຫຼື ບໍລິການ ${index + 1}` : lang === 'th' ? `รายการของแถมหรือบริการ ${index + 1}` : `Gift or service ${index + 1}`}
                      </label>
                      <input
                        id={`free-gift-${index}`}
                        type="text"
                        value={gift}
                        onChange={(e) => {
                          const next = rows.slice();
                          next[index] = e.target.value;
                          setSelectedGifts(trimTrailingEmpty(next));
                        }}
                        placeholder={index === rows.length - 1
                          ? (lang === 'lo' ? 'ພິມຂອງແຖມ ຫຼື ບໍລິການ (ພິມແລ້ວແຖວໃໝ່ຈະຂຶ້ນເອງ)' : lang === 'th' ? 'พิมพ์ของแถมหรือบริการ (แถวใหม่จะขึ้นเอง)' : 'Type a gift or service (a new row appears automatically)')
                          : ''}
                        className="min-h-11 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                      />
                      {index < rows.length - 1 && (
                        <button
                          type="button"
                          onClick={() => setSelectedGifts(trimTrailingEmpty(selectedGifts.filter((_, itemIndex) => itemIndex !== index)))}
                          aria-label={lang === 'lo' ? `ລຶບລາຍການ ${index + 1}` : lang === 'th' ? `ลบรายการ ${index + 1}` : `Remove item ${index + 1}`}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 5: Customer Documents & Contracts Suite (ສ່ວນທີ 5: ອອກເອກະສານ & ໃບສັນຍາ) */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>5. {lang === 'lo' ? 'ອອກເອກະສານ & ໃບສັນຍາ (Customer Documents Suite)' : lang === 'th' ? 'ออกเอกสาร & สัญญาทางการ (Customer Documents Suite)' : 'Official Documents & Contracts Suite'}</span>
                  </div>
                </div>

                {/* Quick Document Action Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {/* 1. Credit Agreement (020/KM7) */}
                  <div
                    onClick={() => handleOpenDocument('credit_agreement')}
                    className="group p-3 rounded-2xl border border-zinc-800/90 bg-zinc-900/40 hover:bg-zinc-900 hover:border-amber-500/50 transition-all cursor-pointer space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                        <FileCheck className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                        020/KM7
                      </span>
                    </div>
                    <div>
                      <strong className="text-xs text-white group-hover:text-amber-300 transition-colors block">
                        ສັນຍາໜີ້ສິນ 3 ຝ່າຍ
                      </strong>
                      <span className="text-[10.5px] text-zinc-400 block line-clamp-1">
                        ສັນຍາໂຊຣູມ - ລູກຄ້າ - ທະນາຄານ
                      </span>
                    </div>
                  </div>

                  {/* 2. KM7 Complimentary Gifts Release */}
                  <div
                    onClick={() => handleOpenDocument('km7_release')}
                    className="group p-3 rounded-2xl border border-zinc-800/90 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-500 transition-all cursor-pointer space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-1.5 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 group-hover:scale-110 transition-transform">
                        <Car className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                        Free Gifts
                      </span>
                    </div>
                    <div>
                      <strong className="text-xs text-white group-hover:text-zinc-200 transition-colors block">
                        ໃບເບີກຂອງແຖມ
                      </strong>
                      <span className="text-[10.5px] text-zinc-400 block line-clamp-1">
                        ໃບເບີກຂອງແຖມ & ອຸປະກອນເສີມລົດ EV
                      </span>
                    </div>
                  </div>

                  {/* 3. Booking Agreement */}
                  <div
                    onClick={() => handleOpenDocument('booking')}
                    className="group p-3 rounded-2xl border border-zinc-800/90 bg-zinc-900/40 hover:bg-zinc-900 hover:border-purple-500/50 transition-all cursor-pointer space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                        <Receipt className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold">
                        Booking
                      </span>
                    </div>
                    <div>
                      <strong className="text-xs text-white group-hover:text-purple-300 transition-colors block">
                        ໃບສັນຍາສັ່ງຈອງລົດ
                      </strong>
                      <span className="text-[10.5px] text-zinc-400 block line-clamp-1">
                        ສັນຍາຈອງ & ວາງມັດຈຳລົດ AVATR
                      </span>
                    </div>
                  </div>

                  {/* 4. Deposit / Down Payment Receipt */}
                  <div
                    onClick={() => handleOpenDocument('receipt')}
                    className="group p-3 rounded-2xl border border-zinc-800/90 bg-zinc-900/40 hover:bg-zinc-900 hover:border-emerald-500/50 transition-all cursor-pointer space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                        <Banknote className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                        Receipt
                      </span>
                    </div>
                    <div>
                      <strong className="text-xs text-white group-hover:text-emerald-300 transition-colors block">
                        ໃບຮັບເງິນມັດຈຳ/ດາວ
                      </strong>
                      <span className="text-[10.5px] text-zinc-400 block line-clamp-1">
                        ໃບຮັບເງິນທາງການຂອງໂຊຣູມ
                      </span>
                    </div>
                  </div>

                  {/* 5. Handover & Delivery */}
                  <div
                    onClick={() => handleOpenDocument('handover')}
                    className="group p-3 rounded-2xl border border-zinc-800/90 bg-zinc-900/40 hover:bg-zinc-900 hover:border-blue-500/50 transition-all cursor-pointer space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-bold">
                        Delivery
                      </span>
                    </div>
                    <div>
                      <strong className="text-xs text-white group-hover:text-blue-300 transition-colors block">
                        ໃບມອບ-ຮັບລົດຍົນ
                      </strong>
                      <span className="text-[10.5px] text-zinc-400 block line-clamp-1">
                        ກວດເຊັກ 10 ລາຍການ & ສົ່ງມອບ
                      </span>
                    </div>
                  </div>

                  {/* 6. Installment Schedule */}
                  <div
                    onClick={() => handleOpenDocument('installment_schedule')}
                    className="group p-3 rounded-2xl border border-zinc-800/90 bg-zinc-900/40 hover:bg-zinc-900 hover:border-cyan-500/50 transition-all cursor-pointer space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                        <Calendar className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                        Schedule
                      </span>
                    </div>
                    <div>
                      <strong className="text-xs text-white group-hover:text-cyan-300 transition-colors block">
                        ຕາຕະລາງຜ່ອນຊຳລະ
                      </strong>
                      <span className="text-[10.5px] text-zinc-400 block line-clamp-1">
                        ແຜນຈ່າຍງວດ ({tenureMonths} ເດືອນ)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Master Open All Documents CTA */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenDocument('booking')}
                    className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.99] text-zinc-200 hover:text-white rounded-2xl border border-zinc-700/80 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'lo' ? 'ເປີດສູນອອກເອກະສານຄົບຊຸດ (Open All Documents Suite)' : 'Open All Documents Suite'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Step 6: Final Price Summary & Execute Sale Button */}
              <div className="theme-adaptive-dark-surface rounded-3xl border border-zinc-700 bg-linear-to-br from-zinc-900 to-zinc-950 p-5 shadow-xl sm:p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-white font-bold text-sm">
                  <Receipt className="w-4 h-4 text-white" />
                  <span>6. {lang === 'lo' ? 'ສະຫຼຸບຍອດເງິນ & ຢືນຢັນການຂາຍ' : lang === 'th' ? 'สรุปยอดเงิน & ยืนยันการขาย' : 'Final Price Summary & Execute Sale'}</span>
                </div>

                <div className="flex justify-between items-baseline pb-3 border-b border-zinc-800 font-mono">
                  <span className="text-zinc-400 text-xs">{t.sellingPrice}:</span>
                  <span className="text-white text-base">${basePriceUSD.toLocaleString()}</span>
                </div>

                {Number(discountUSD) > 0 && (
                  <div className="flex justify-between items-baseline text-zinc-400 font-mono text-xs">
                    <span>{t.discountAmount}:</span>
                    <span>-${Number(discountUSD).toLocaleString()}</span>
                  </div>
                )}

                {paymentMethod === 'finance' && (
                  <div className="p-3 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-zinc-300">
                      <span>{lang === 'lo' ? `ວາງເງິນດາວ (${downPaymentPercent}%):` : `Down Payment (${downPaymentPercent}%):`}</span>
                      <span className="font-bold text-white">${downPaymentUSD.toLocaleString()} USD</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>{lang === 'lo' ? 'ຍອດຄົງເຫຼືອ (ຍອດຈັດສິນເຊື່ອ):' : 'Remaining Balance:'}</span>
                      <span>${remainingBalanceUSD.toLocaleString()} USD</span>
                    </div>
                    <div className="flex justify-between text-zinc-400 text-[11px] pt-1 border-t border-zinc-800">
                      <span>{lang === 'lo' ? `ໄລຍະເວລາຜ່ອນ ${tenureMonths} ເດືອນ:` : `Tenure ${tenureMonths} mos:`}</span>
                      <span className="text-zinc-300">~${monthlyPaymentUSD.toLocaleString()} USD / {lang === 'lo' ? 'ເດືອນ' : 'mo'}</span>
                    </div>
                  </div>
                )}

                <div className="pos-net-total flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-white">
                  <div>
                    <span className="text-sm font-bold block">
                      {paymentMethod === 'finance'
                        ? (lang === 'lo' ? 'ຍອດເງິນດາວທີ່ຕ້ອງຊຳລະມື້ນີ້:' : 'Down Payment Due Today:')
                        : `${t.netPaymentTotal}:`}
                    </span>
                    {paymentMethod === 'finance' && (
                      <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
                        {lang === 'lo' ? 'ລາຄາລົດລວມ:' : 'Total Car Price:'} ${netPriceUSD.toLocaleString()} USD
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-3xl sm:text-4xl font-black font-mono text-white">
                      ${(paymentMethod === 'finance' ? downPaymentUSD : netPriceUSD).toLocaleString()} USD
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessingSale}
                    className="pos-confirm-sale-button w-full min-h-14 py-3.5 bg-white hover:bg-zinc-200 active:scale-[0.99] text-black font-extrabold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="bg-transparent border-0">{t.confirmSaleAndDeduct}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* FULLSCREEN ENLARGE COMPANY QR CODE MODAL FOR CUSTOMER SCANNING */}
        {isEnlargeQrOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white text-center space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-left">
                  <span className="p-1.5 bg-zinc-800 text-zinc-200 rounded-lg">
                    <QrCode className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-white">{companyBankInfo.accountName}</h3>
                    <p className="text-[10px] text-zinc-400">{companyBankInfo.bankName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEnlargeQrOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Big High-Res QR Card */}
              <div className="p-4 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center space-y-2 text-black">
                <div className="w-full text-center border-b border-zinc-200 pb-1">
                  <span className="text-xs font-black tracking-wider text-black block truncate">
                    {companyBankInfo.accountName || DEFAULT_COMPANY_BANK_INFO.accountName}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-700 block">
                    {t.scanQrToPay}
                  </span>
                </div>

                <div className="p-2 bg-white rounded-xl border-2 border-black flex items-center justify-center">
                  {companyBankInfo.qrCodeUrl ? (
                    <img
                      src={companyBankInfo.qrCodeUrl}
                      alt="Official Company QR"
                      className="w-56 h-56 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-center px-3" role="status">
                      <QrCode className="w-10 h-10 text-zinc-300" aria-hidden="true" />
                      <span className="text-xs font-bold text-black">ຍັງບໍ່ມີຮູບ QR ບໍລິສັດ</span>
                      <span className="text-[11px] text-zinc-500 leading-snug">ໃຫ້ Admin ອັບໂຫຼດຮູບ QR ກ່ອນ. ຫ້າມໃຫ້ລູກຄ້າໂອນຈົນກວ່າຈະມີ QR ທາງການ</span>
                    </div>
                  )}
                </div>

                <div className="w-full text-center pt-2 border-t border-zinc-200">
                  <span className="text-xs font-mono font-black text-black block">
                    {t.netPaymentTotal}: ${netPriceUSD.toLocaleString()} USD
                  </span>
                </div>
              </div>

              {/* Quick Bank Accounts List */}
              <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-xs font-mono space-y-1 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">USD:</span>
                  <span className="text-white font-bold">{companyBankInfo.usdAccount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">LAK:</span>
                  <span className="text-zinc-200 font-bold">{companyBankInfo.lakAccount}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEnlargeQrOpen(false)}
                className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* INSTANT PRINTABLE BILL MODAL UPON SALE COMPLETION */}
      {createdBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:w-full print:max-w-none print:shadow-none">
          <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-5 text-white space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:m-0 print:max-h-none print:max-w-none print:w-full print:overflow-visible print-modal-container">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 print:hidden">
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base text-white">{t.saleCompletedSuccess}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPosPdf}
                  disabled={isExportingPosPdf}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-black rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-zinc-300 disabled:opacity-60 cursor-pointer"
                  title="ບັນທຶກໃບບິນເປັນ PDF"
                >
                  {isExportingPosPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>ກຳລັງສ້າງ PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-black" />
                      <span>PDF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePrintPosReceipt}
                  className="px-3 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t.printInvoiceBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedBill(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bill Preview Card */}
            <div
              id="printable-pos-receipt"
              className="a4-document-canvas w-full max-w-198.5 mx-auto p-6 sm:p-8 official-dealer-document bg-white text-black rounded-lg space-y-3.5 text-[11px] font-sans shadow-xl print:m-0 print:p-0 print:border-none print:shadow-none"
              style={{ backgroundColor: '#ffffff', color: '#000000', border: 'none' }}
            >
              <div className="border-b-2 border-black pb-2.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="shrink-0 flex items-start justify-start">
                    <AvatrLogo variant="document" />
                  </div>
                  <div className="flex-1 text-center pt-1">
                    <p className="text-[10.5px] font-bold tracking-wide text-black">
                      ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
                    </p>
                    <p className="text-[10px] font-semibold text-black mb-1.5">
                      ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ
                    </p>
                    <span className="font-black tracking-widest text-base sm:text-lg text-black block leading-tight">
                      {companyBankInfo.accountName || DEFAULT_COMPANY_BANK_INFO.accountName}
                    </span>
                    <p className="text-[10.5px] text-black font-semibold">
                      ສູນຈຳໜ່າຍ ແລະ ບໍລິການລົດຍົນໄຟຟ້າ AVATR ຢ່າງເປັນທາງການ
                    </p>
                  </div>
                  <div className="hidden sm:block shrink-0 w-[3cm]" aria-hidden="true" />
                </div>

                {/* Row 1: Right-aligned Bill Number & Date */}
                <div className="flex justify-end items-center gap-6 mt-1 text-[11px] font-mono text-black border-t border-black/20 pt-1.5">
                  <span>ເລກທີບິນ / No: <strong className="font-bold">{createdBill.billNumber}</strong></span>
                  <span>ວັນທີ / Date: <strong className="font-bold">{createdBill.date}</strong></span>
                </div>

                {/* Row 2: 100% Centered Invoice Title */}
                <div className="text-center pt-2">
                  <h2 className="text-sm sm:text-base font-black text-black uppercase tracking-wide">
                    ໃບບິນຮັບເງິນ / ໃບຢັ້ງຢືນການຂາຍ ({t.printInvoiceBtn || 'OFFICIAL SALES INVOICE'})
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-zinc-700">
                <div>
                  <span className="text-zinc-600 font-mono text-[10px] uppercase block">{t.buyerInfo}:</span>
                  <strong className="text-black text-sm block">{createdBill.customerName}</strong>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-zinc-700 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-zinc-600" />
                      <span>{createdBill.customerPhone}</span>
                    </span>
                    {createdBill.customerPhone && (
                      <a
                        href={getWhatsAppUrl(createdBill.customerPhone, createdBill.customerName, createdBill.model, lang)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-sans font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-emerald-200"
                        title="ສົນທະນາ WhatsApp ກັບລູກຄ້າ"
                      >
                        <WhatsAppIcon className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                  <span className="text-zinc-700 block">{createdBill.customerAddress}, {createdBill.customerProvince}</span>
                </div>

                <div className="text-right">
                  <span className="text-zinc-600 font-mono text-[10px] uppercase block">{t.tableModel}:</span>
                  <strong className="text-black text-sm block">{createdBill.model}</strong>
                  <span className="text-zinc-700 font-mono block">VIN: {createdBill.vin}</span>
                  <span className="text-zinc-700 block">{createdBill.color || '-'} • {createdBill.plateNumber || '-'}</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-300 flex justify-between items-center font-mono text-black">
                <span>{t.netPaymentTotal}:</span>
                <span className="text-xl font-black text-black">${createdBill.netTotalUSD.toLocaleString()}</span>
              </div>

              {createdBill.paymentMethod === 'finance' && (
                <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-600/30 font-mono text-[10.5px] space-y-1 text-black">
                  <div className="flex justify-between font-bold">
                    <span>{lang === 'lo' ? `ວາງເງິນດາວ (${createdBill.downPaymentPercent || 0}%):` : `Down Payment (${createdBill.downPaymentPercent || 0}%):`}</span>
                    <span>${(createdBill.downPaymentUSD || 0).toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between font-bold text-black">
                    <span>{lang === 'lo' ? 'ຍອດຄົງເຫຼືອ / ຍອດຈັດສິນເຊື່ອ:' : 'Remaining Balance:'}</span>
                    <span>${Math.max(0, (createdBill.netTotalUSD || 0) - (createdBill.downPaymentUSD || 0)).toLocaleString()} USD</span>
                  </div>
                  {createdBill.tenureMonths && (
                    <div className="flex justify-between text-zinc-600 text-[10px]">
                      <span>{lang === 'lo' ? 'ໄລຍະເວລາຜ່ອນ:' : 'Tenure:'}</span>
                      <span>{createdBill.tenureMonths} {lang === 'lo' ? 'ເດືອນ' : 'Months'}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[11px] text-zinc-700">
                {t.paymentType}: <strong className="text-black uppercase">{createdBill.paymentMethod === 'finance' ? (lang === 'lo' ? 'ຜ່ອນຊຳລະ / ສິນເຊື່ອ (FINANCE)' : 'FINANCE / INSTALLMENT') : createdBill.paymentMethod}</strong> • {t.salesRepresentative}: {createdBill.recordedBy}
              </div>
            </div>

            {/* Related Official Documents Suite for this completed bill */}
            <div className="p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-2.5 print:hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'lo' ? 'ອອກເອກະສານສັນຍາ & ໃບມອບລົດສຳລັບບິນນີ້:' : 'Issue Official Documents for this Bill:'}</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {createdBill.billNumber}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {createdBill.paymentMethod === 'finance' && (
                  <button
                    type="button"
                    onClick={() => handleOpenDocument('credit_agreement', createdBill)}
                    className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>ສັນຍາ 3 ຝ່າຍ (020/KM7)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenDocument('km7_release', createdBill)}
                  className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <Car className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ໃບເບີກຂອງແຖມ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDocument('handover', createdBill)}
                  className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ໃບມອບ-ຮັບລົດ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDocument('receipt', createdBill)}
                  className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <Banknote className="w-3.5 h-3.5 text-amber-400" />
                  <span>ໃບຮັບເງິນ</span>
                </button>

                {createdBill.paymentMethod === 'finance' && (
                  <button
                    type="button"
                    onClick={() => handleOpenDocument('installment_schedule', createdBill)}
                    className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>ຕາຕະລາງຜ່ອນ</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenDocument('authorization', createdBill)}
                  className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ໃບມອບສິດ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDocument('booking', createdBill)}
                  className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <Receipt className="w-3.5 h-3.5 text-purple-400" />
                  <span>ສັນຍາຈອງ</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setCreatedBill(null);
                  onNavigateToBills();
                }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold border border-zinc-700 transition-colors"
              >
                {t.billsTitle}
              </button>
              <button
                onClick={() => setCreatedBill(null)}
                className="px-5 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold transition-colors"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Document Suite Modal for POS */}
      {selectedDocCustomer && (
        <CustomerDocumentsModal
          isOpen={!!selectedDocCustomer}
          onClose={() => setSelectedDocCustomer(null)}
          customer={selectedDocCustomer}
          vehicles={vehicles}
          currentUser={currentUser}
          lang={lang}
          initialDoc={activeDocType}
        />
      )}
    </div>
  );
}
