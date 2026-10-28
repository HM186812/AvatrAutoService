import { useState, useEffect, useRef, useMemo } from 'react';
import { InventoryItem, VehicleModel, Language, InvoiceBillRecord, StockLogRecord, SystemUser, Lead } from '../../types';
import { getStoredCompanyBankInfo, saveStoredCompanyBankInfo, CompanyBankInfo } from '../../data/companySettings';
import { translations } from '../../data/translations';
import { LAO_PROVINCES } from '../../data/laoProvinces';
import {
  uploadCompanyQrCodeToStorage,
  saveDealershipConfigToSupabase
} from '../../supabase';
import { newRecordId } from '../../backend/ids';
import { saveLead, uploadPaymentSlip } from '../../backend/data';
import { generateInstallmentSchedule } from '../../utils/installment';
import AvatrLogo from '../layout/AvatrLogo';
import { ConfirmDeleteModal } from '../modals';
import CustomerDocumentsModal, { DocumentType } from '../modals/CustomerDocumentsModal';
import { showToast, ToastType } from '../common';
import {
  Receipt,
  FileText,
  ShoppingBag,
  CheckCircle2,
  Car,
  Search,
  CreditCard,
  DollarSign,
  User,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  ShieldCheck,
  Printer,
  ArrowRight,
  AlertCircle,
  FileCheck,
  Plus,
  Trash2,
  Banknote,
  Smartphone,
  Building2,
  X,
  QrCode,
  Upload,
  Image as ImageIcon,
  Check,
  Maximize2,
  RefreshCw,
  Edit3,
  Lock,
  Copy,
  Download,
  Loader2,
  ChevronDown
} from 'lucide-react';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl, formatWhatsAppDisplay, formatWhatsAppNumber, openWhatsApp } from '../../utils/whatsapp';
import { exportElementToPdf } from '../../utils/pdfExport';
import { logIssuedDocument } from '../../utils/documentLogger';

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
  lang: Language;
  onNavigateToBills: () => void;
  prefilledCustomer?: Lead | null;
  onClearPrefilledCustomer?: () => void;
}

export default function POSSalesView({
  inventory,
  setInventory,
  bills,
  setBills,
  leads,
  setLeads,
  stockLogs,
  setStockLogs,
  vehicles,
  currentUser,
  lang,
  onNavigateToBills,
  prefilledCustomer,
  onClearPrefilledCustomer,
}: POSSalesViewProps) {
  const t = translations[lang] || translations.lo;
  // Available vehicles for sale (not sold and stock > 0)
  const availableVehicles = inventory.filter(i => i.status !== 'sold' && i.stockQuantity > 0);

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
    () => prefilledCustomer?.assignedTo || (currentUser?.role === 'sales' ? currentUser.name : 'ທ້າວ ແສງອຸໄທ ສັນຕິສີໄວ')
  );

  const salesRepSuggestions = useMemo(() => {
    const names = new Set<string>([
      'ທ້າວ ແສງອຸໄທ ສັນຕິສີໄວ',
      'ທ້າວ ສົມພອນ ໄຊຍະສິດ',
      'ນາງ ມາລີ ວົງພະຈັນ',
    ]);
    if (currentUser?.name) names.add(currentUser.name);
    leads.forEach(l => {
      if (l.assignedTo && l.assignedTo.trim() && l.assignedTo.trim() !== 'Admin') {
        names.add(l.assignedTo.trim());
      }
    });
    bills.forEach(b => {
      if (b.salesRep && b.salesRep.trim() && b.salesRep.trim() !== 'Admin') {
        names.add(b.salesRep.trim());
      }
    });
    return Array.from(names);
  }, [leads, bills, currentUser?.name]);
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

  // Package delete popup modal state
  const [packageToDelete, setPackageToDelete] = useState<string | null>(null);

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

  const handleDiscountChange = (val: number | '') => {
    if (val === '' || isNaN(val) || val <= 0) {
      setDiscountUSD('');
      return;
    }
    setDiscountUSD(val);
  };

  // Payment Options - Zero pre-filled values
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'finance'>('transfer');
  const [bankName, setBankName] = useState('ຊຳລະເງິນຜ່ານ QR ບໍລິສັດ');
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
      if (prefilledCustomer.district) {
        setCustomerDistrict(prefilledCustomer.district);
      }
      if (prefilledCustomer.village) {
        setCustomerVillage(prefilledCustomer.village);
      }
      if (prefilledCustomer.assignedTo && prefilledCustomer.assignedTo !== 'Admin') {
        setSalesRepName(prefilledCustomer.assignedTo);
      }
    }
  }, [prefilledCustomer]);

  // Free Gifts & Privileges Packages (Dynamic List with LocalStorage & Admin Edit/Delete)
  const DEFAULT_PACKAGES = [
    'ຕູ້ສາກໄວ Home Charger 7kW ພ້ອມຕິດຕັ້ງມາດຕະຖານ CATL',
    'ປະກັນໄພຊັ້ນ 1 (First Class Insurance) 1 ປີເຕັມ',
    'ຟີມກັນຄວາມຮ້ອນ Ceramic 3M ຮອບຄັນ',
    'ປ້າຍທະບຽນ VIP ກຳແພງນະຄອນ (ຈຳນວນຈຳກັດ)',
    'ຊຸດຢາງປູພື້ນ Luxury Nappa Leather ຕົງລຸ້ນ AVATR',
    'ສາຍສາກພົກພາສຸກເສີນ Portable EV Charger 3.5kW',
    'ຊຸດອຸປະກອນສຸກເສີນ ແລະ ປ້ຳລົມໄຟຟ້າ AVATR'
  ];

  const [giftOptions, setGiftOptions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('avatr_dealership_packages_v2');
      return saved ? JSON.parse(saved) : DEFAULT_PACKAGES;
    } catch {
      return DEFAULT_PACKAGES;
    }
  });

  // Empty selected gifts by default (ຄ່າເລີ່ມຕົ້ນບໍ່ມີການຕິກເລືອກໄວ້ກ່ອນ)
  const [selectedGifts, setSelectedGifts] = useState<string[]>([]);
  const [newPackageInput, setNewPackageInput] = useState('');

  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  // Company Official Banking & QR Code Settings
  const [companyBankInfo, setCompanyBankInfo] = useState<CompanyBankInfo>(() => getStoredCompanyBankInfo());
  const [isEnlargeQrOpen, setIsEnlargeQrOpen] = useState(false);

  // Admin: Upload custom company QR Code to Supabase Storage / Cloud
  const handleCompanyQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSuperAdmin) {
      triggerToast('ສະເພາະ Admin ຈຶ່ງສາມາດອັບໂຫລດຮູບ QR ບໍລິສັດໄດ້!');
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      try {
        triggerToast('ກຳລັງອັບໂຫຼດຮູບ QR Code ໄປຍັງ Supabase Storage...');
        const downloadUrl = await uploadCompanyQrCodeToStorage(file, currentUser);
        const updated: CompanyBankInfo = {
          ...companyBankInfo,
          qrCodeUrl: downloadUrl,
          updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          updatedBy: currentUser?.name || 'Admin',
        };
        setCompanyBankInfo(updated);
        saveStoredCompanyBankInfo(updated);
        triggerToast('ອັບໂຫຼດຮູບ QR Code ບໍລິສັດສຳເລັດແລ້ວ! (Real-time Cloud Synced)');
      } catch (err: any) {
        console.error('Company QR upload error:', err);
        // Fallback local reader
        const reader = new FileReader();
        reader.onload = (event) => {
          const qrData = event.target?.result as string;
          const updated: CompanyBankInfo = {
            ...companyBankInfo,
            qrCodeUrl: qrData,
            updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            updatedBy: currentUser?.name || 'Admin',
          };
          setCompanyBankInfo(updated);
          saveStoredCompanyBankInfo(updated);
          triggerToast('ອັບໂຫຼດຮູບ QR Code ບໍລິສັດສຳເລັດແລ້ວ!');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Admin: Reset Company QR back to official default
  const handleResetCompanyQr = async () => {
    if (!isSuperAdmin) return;
    if (!confirm('ທ່ານຕ້ອງການຣີເຊັດຮູບ QR ບໍລິສັດກັບຄືນເປັນຄ່າມາດຕະຖານບໍ່?')) return;
    const updated: CompanyBankInfo = {
      ...companyBankInfo,
      qrCodeUrl: null,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedBy: currentUser?.name || 'Admin',
    };
    try {
      await saveDealershipConfigToSupabase({ companyQrImageUrl: null });
    } catch (e) {
      console.warn('Supabase reset QR fallback:', e);
    }
    setCompanyBankInfo(updated);
    saveStoredCompanyBankInfo(updated);
    triggerToast('ຣີເຊັດຮູບ QR ບໍລິສັດເປັນຄ່າມາດຕະຖານຮຽບຮ້ອຍແລ້ວ!');
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      triggerToast('ສະເພາະ Admin ຈຶ່ງສາມາດເພີ່ມໝວດໄດ້!');
      return;
    }
    if (!newPackageInput.trim()) return;
    const trimmed = newPackageInput.trim();
    if (giftOptions.includes(trimmed)) {
      triggerToast('ໝວດ/ແພັກເກດນີ້ມີຢູ່ໃນລາຍການແລ້ວ!');
      return;
    }
    const updated = [...giftOptions, trimmed];
    setGiftOptions(updated);
    localStorage.setItem('avatr_dealership_packages_v2', JSON.stringify(updated));
    try {
      await saveDealershipConfigToSupabase({ campaignCategories: updated });
    } catch (e) {
      console.warn('Supabase save packages fallback:', e);
    }
    setNewPackageInput('');
    triggerToast(`ເພີ່ມໝວດແພັກເກດ "${trimmed}" ສຳເລັດແລ້ວ!`);
  };

  const handleDeletePackage = (pkg: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSuperAdmin) {
      triggerToast('ສະເພາະ Admin ຈຶ່ງສາມາດລົບໝວດໄດ້!');
      return;
    }
    setPackageToDelete(pkg);
  };

  const toggleGift = (gift: string) => {
    setSelectedGifts(prev =>
      prev.includes(gift) ? prev.filter(g => g !== gift) : [...prev, gift]
    );
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
    return {
      id: prefilledCustomer?.id || 'pos-lead-temp',
      customerName: customerName.trim() || (lang === 'lo' ? 'ລູກຄ້າຊື້ລົດ AVATR (POS)' : 'AVATR POS Customer'),
      phone: customerPhone.trim() || '20XXXXXXXX',
      idCardNumber: customerIDCard.trim() || '',
      village: customerVillage || customerCustomVillage || '',
      district: customerDistrict || '',
      province: customerProvince || 'ນະຄອນຫຼວງວຽງຈັນ',
      category: 'walk_in',
      source: 'POS Showroom',
      interestedModel: v ? v.model : 'AVATR 11',
      status: 'negotiation',
      priority: 'high',
      notes: v ? `VIN: ${v.vin} | ສີ: ${v.color || '-'} | ປ້າຍ: ${v.plateNumber || '-'}` : '',
      paymentType: paymentMethod,
      paymentReceiptNo: v?.vin || '',
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
    : 22000;
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

  // CONFIRM SALE & DEDUCT STOCK
  const handleProcessSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingSale) return;

    if (!selectedVehicle) {
      triggerToast('ກະລຸນາເລືອກລົດຍົນທີ່ຕ້ອງການຂາຍກ່ອນ!');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      triggerToast('ກະລຸນາປ້ອນຊື່ ແລະ ເບີໂທລະສັບ ຂອງລູກຄ້າ!');
      return;
    }

    const currentQty = selectedVehicle.stockQuantity;
    const remainingQty = Math.max(0, currentQty - 1);
    const invoiceNum = `INV-AVATR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const saleDateTime = saleDate ? `${saleDate} ${new Date().toTimeString().slice(0, 5)}` : now;

    const effectiveVillage = customerVillage === '__custom__' ? customerCustomVillage.trim() : customerVillage;
    const fullAddress = [
      customerAddressDetail.trim(),
      effectiveVillage,
      customerDistrict,
      customerProvince
    ].filter(Boolean).join(', ');

    // 1. DEDUCT STOCK (ຕັດສະຕ໋ອກອອກ)
    const updatedInventoryItem: InventoryItem = {
      ...selectedVehicle,
      stockQuantity: remainingQty,
      status: remainingQty === 0 ? 'sold' : selectedVehicle.status,
      reservedForCustomer: undefined,
    };

    const normalizedPhone = customerPhone.replace(/\D/g, '');
    const matchedLead = prefilledCustomer
      ? (leads.find(lead => lead.id === prefilledCustomer.id) || prefilledCustomer)
      : (normalizedPhone
        ? leads.find(lead => lead.phone.replace(/\D/g, '') === normalizedPhone)
        : undefined);

    const effectiveSalesRep = salesRepName.trim() || matchedLead?.assignedTo || currentUser?.name || 'Admin';

    let customerLead: Lead;
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
    const newBill: InvoiceBillRecord = {
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
      freeGifts: selectedGifts,
      warrantyTerms: 'ຮັບປະກັນແບັດເຕີຣີ CATL 8 ປີ / 160,000 km | ຕົວລົດ 5 ປີ / 120,000 km',
      salesRep: effectiveSalesRep,
      recordedBy: currentUser?.name || effectiveSalesRep,
      notes: saleNotes || 'ຂາຍອອກຜ່ານລະບົບ POS ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ ພ້ອມຕັດສະຕ໋ອກອັດຕະໂນມັດ',
    };

    setIsProcessingSale(true);
    try {
      if (!currentUser?.id) throw new Error('Sign in again before recording this sale.');

      if (paymentMethod === 'transfer' && slipFile) {
        try {
          const uploadedPath = await uploadPaymentSlip(slipFile, newBill.billNumber || selectedVehicle.vin);
          newBill.paymentSlipPath = uploadedPath;
        } catch (slipErr) {
          console.warn('Payment slip upload warning:', slipErr);
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
      triggerToast(msg);
      return;
    } finally {
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
        <div className="theme-adaptive-dark-surface relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800 p-5 sm:p-7 rounded-3xl shadow-xl">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl pointer-events-none" />
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



        {availableVehicles.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-400 space-y-4">
            <AlertCircle className="w-12 h-12 text-zinc-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">
              {lang === 'lo' ? 'ບໍ່ມີລົດວ່າງພ້ອມຂາຍໃນສະຕ໋ອກ!' : lang === 'th' ? 'ไม่มีรถว่างพร้อมจำหน่ายในสต็อก!' : 'No available vehicles in stock!'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              {lang === 'lo'
                ? 'ລົດໃນສາງທັງໝົດຖືກຂາຍ ຫຼື ຈອງໝົດແລ້ວ. ກະລຸນາໄປທີ່ເມນູ "ນຳເຂົ້າລົດຍົນ" ເພື່ອເພີ່ມລົດໃໝ່ເຂົ້າສາງກ່ອນ.'
                : lang === 'th'
                  ? 'รถในคลังทั้งหมดถูกจำหน่ายหรือจองหมดแล้ว กรุณาไปที่เมนู "นำเข้ารถยนต์" เพื่อเพิ่มรถใหม่เข้าสต็อกก่อน'
                  : 'All vehicles in stock have been sold or reserved. Please go to "Stock-In" to import new vehicles.'}
            </p>
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

                {/* 1.1 Category Cards: All Models + Each Model with Photo */}
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
                      className={`relative flex-shrink-0 w-28 sm:w-32 rounded-2xl border text-left overflow-hidden transition-all group cursor-pointer ${selectedModelCategory === 'all'
                        ? 'border-white bg-zinc-900 shadow-lg ring-2 ring-white/20'
                        : 'border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                        }`}
                    >
                      <div className="relative h-16 w-full bg-zinc-900 overflow-hidden">
                        <img
                          src="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=400&q=80"
                          alt="All Models"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 opacity-85"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        {selectedModelCategory === 'all' && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
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

                    {/* Category Cards: Each Registered Model with Photo */}
                    {modelCategories.map((cat) => {
                      const isSelected = selectedModelCategory === cat.name;
                      return (
                        <button
                          type="button"
                          key={cat.name}
                          onClick={() => handleSelectModelCategory(cat.name)}
                          className={`relative flex-shrink-0 w-28 sm:w-32 rounded-2xl border text-left overflow-hidden transition-all group cursor-pointer ${isSelected
                            ? 'border-white bg-zinc-900 shadow-lg ring-2 ring-white/20'
                            : 'border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                            }`}
                        >
                          <div className="relative h-16 w-full bg-zinc-900 overflow-hidden">
                            <img
                              src={cat.image}
                              alt={cat.name}
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.onerror = null;
                                target.src = '/avatr-logo.png';
                              }}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                            {isSelected && (
                              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
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
                <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                  {filteredAvailableVehicles.map((item) => {
                    const isSelected = selectedVin === item.vin;
                    const vehicleDef = vehicles.find(v => v.name === item.model);
                    const displayImage = item.image || vehicleDef?.heroImage || '/avatr-logo.png';

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
                        {/* Car Thumbnail Image */}
                        <div className="relative w-16 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 flex-shrink-0">
                          <img
                            src={displayImage}
                            alt={item.model}
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = '/avatr-logo.png';
                            }}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <strong className="text-white text-xs font-bold truncate">{item.model}</strong>
                            <span className="font-mono text-white text-xs font-bold shrink-0 ml-1">
                              ${item.priceUSD.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                            <span className="truncate">VIN: {item.vin}</span>
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
                      <img
                        src={selectedVehicle.image || selectedVehicle.imageUrl || vehicles.find(v => v.name === selectedVehicle.model)?.heroImage || '/avatr-logo.png'}
                        alt={selectedVehicle.model}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = '/avatr-logo.png';
                        }}
                        className="w-full h-full object-cover filter contrast-125"
                      />
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
                        <span className="text-white font-medium text-right truncate max-w-[170px]">{selectedVehicle.trim}</span>
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
                        <span className="text-zinc-300 font-medium truncate max-w-[170px]">{selectedVehicle.location}</span>
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
                  {prefilledCustomer && (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                        <span>CRM: {prefilledCustomer.customerName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClearPrefilledCustomer?.();
                          setCustomerName('');
                          setCustomerPhone('');
                          setCustomerIDCard('');
                          setCustomerAddress('');
                          setCustomerDistrict('');
                          setCustomerVillage('');
                          setCustomerCustomVillage('');
                          setCustomerAddressDetail('');
                        }}
                        className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
                        title={lang === 'lo' ? 'ຍົກເລີກການດຶງຂໍ້ມູນລູກຄ້າ CRM' : 'Clear prefilled customer'}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{lang === 'lo' ? 'ລຶບອອກ' : 'Clear'}</span>
                      </button>
                    </div>
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
                    <label className="block text-zinc-400 mb-1 font-medium flex items-center gap-1.5 truncate">
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
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/50 shrink-0 max-w-[130px] truncate">
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
                    <input
                      type="text"
                      list="pos-sales-rep-list"
                      required
                      value={salesRepName}
                      onChange={(e) => setSalesRepName(e.target.value)}
                      placeholder="ເລືອກ ຫຼື ພິມຊື່ພະນັກງານຂາຍ..."
                      className="w-full min-w-0 bg-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/20 transition-colors"
                    />
                    <datalist id="pos-sales-rep-list">
                      {salesRepSuggestions.map((rep) => (
                        <option key={rep} value={rep} />
                      ))}
                    </datalist>
                  </div>

                  {/* Province Selector (All 18 Provinces) */}
                  <div className="min-w-0">
                    <label className="block text-zinc-400 mb-1 font-medium truncate">
                      ແຂວງ / ນະຄອນຫຼວງ (18 ແຂວງ) <span className="text-red-500 font-bold ml-1">*</span>
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
                          {selectedProvince?.nameEn && (
                            <span className="ml-1 text-zinc-400">
                              ({selectedProvince.nameEn})
                            </span>
                          )}
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
                      ເມືອງ (District) <span className="text-red-500 font-bold ml-1">*</span>
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
                          {selectedDistrict?.nameEn && <span className="ml-1 text-zinc-400">({selectedDistrict.nameEn})</span>}
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
                      ບ້ານ (Village) <span className="text-red-500 font-bold ml-1">*</span>
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
                            ? '+ ລະບຸບ້ານອື່ນໆ...'
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
                            <span>+ ລະບຸບ້ານອື່ນໆ...</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {customerVillage === '__custom__' && (
                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">
                        ລະບຸຊື່ບ້ານ (Custom Village) *
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

                  {/* House No. / Street Details */}
                  <div className="sm:col-span-2">
                    <label className="block text-zinc-400 mb-1 font-medium">
                      ເຮືອນເລກທີ / ຖະໜົນ / ຮ່ອມ (Street / House Details)
                    </label>
                    <input
                      type="text"
                      value={customerAddressDetail}
                      onChange={(e) => setCustomerAddressDetail(e.target.value)}
                      placeholder="ຕົວຢ່າງ: ເຮືອນເລກທີ 45, ຮ່ອມ 12, ຖະໜົນ ໄກສອນ ພົມວິຫານ"
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
                          <p className="text-[10px] text-zinc-400 font-mono">ສະແກນຊຳລະເງິນຜ່ານ QR Code (Official Payment QR)</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSuperAdmin ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1 shadow-sm">
                            <ShieldCheck className="w-3 h-3 text-zinc-200" /> Admin: ຈັດການ & ອັບໂຫລດ QR ບໍລິສັດໄດ້
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
                            <span className="text-[10px] text-zinc-400">
                              {companyBankInfo.qrCodeUrl ? 'ກຳລັງໃຊ້ຮູບ QR ທີ່ Admin ອັບໂຫລດເອງ' : 'ກຳລັງໃຊ້ QR ມາດຕະຖານໂຮງງານ AVATR'}
                            </span>
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
                              title="ຣີເຊັດເປັນ QR ເລີ່ມຕົ້ນ"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>ຣີເຊັດ QR</span>
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
                            {companyBankInfo.accountName || 'AVATR AUTO SERVICE SOLE CO., LTD'}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-600 block truncate">
                            {companyBankInfo.bankName || 'LAO QR'} • OFFICIAL PAYMENT QR
                          </span>
                        </div>

                        {/* Display Custom Uploaded QR or Stylized Vector QR */}
                        <div className="relative p-2.5 bg-white rounded-2xl border-2 border-black flex items-center justify-center min-h-[180px] w-full max-w-[210px] overflow-hidden shadow-inner">
                          {companyBankInfo.qrCodeUrl ? (
                            <img
                              src={companyBankInfo.qrCodeUrl}
                              alt="Official Company QR Code"
                              className="w-44 h-44 object-contain rounded-xl shadow-sm"
                            />
                          ) : (
                            <svg className="w-44 h-44" viewBox="0 0 140 140" fill="none">
                              {/* Corner Markers */}
                              <rect x="5" y="5" width="35" height="35" rx="6" fill="black" />
                              <rect x="10" y="10" width="25" height="25" rx="3" fill="white" />
                              <rect x="15" y="15" width="15" height="15" rx="2" fill="black" />

                              <rect x="100" y="5" width="35" height="35" rx="6" fill="black" />
                              <rect x="105" y="10" width="25" height="25" rx="3" fill="white" />
                              <rect x="110" y="15" width="15" height="15" rx="2" fill="black" />

                              <rect x="5" y="100" width="35" height="35" rx="6" fill="black" />
                              <rect x="10" y="105" width="25" height="25" rx="3" fill="white" />
                              <rect x="15" y="110" width="15" height="15" rx="2" fill="black" />

                              {/* Data Pattern Modules */}
                              <rect x="45" y="10" width="6" height="6" fill="black" />
                              <rect x="55" y="10" width="6" height="12" fill="black" />
                              <rect x="65" y="10" width="6" height="6" fill="black" />
                              <rect x="75" y="10" width="6" height="18" fill="black" />
                              <rect x="85" y="10" width="6" height="6" fill="black" />

                              <rect x="45" y="25" width="18" height="6" fill="black" />
                              <rect x="70" y="25" width="6" height="6" fill="black" />
                              <rect x="85" y="25" width="8" height="6" fill="black" />

                              <rect x="10" y="45" width="12" height="6" fill="black" />
                              <rect x="28" y="45" width="6" height="12" fill="black" />
                              <rect x="40" y="45" width="12" height="6" fill="black" />
                              <rect x="60" y="45" width="6" height="18" fill="black" />
                              <rect x="75" y="45" width="18" height="6" fill="black" />
                              <rect x="105" y="45" width="6" height="12" fill="black" />
                              <rect x="120" y="45" width="12" height="6" fill="black" />

                              <rect x="10" y="60" width="6" height="18" fill="black" />
                              <rect x="25" y="60" width="12" height="6" fill="black" />
                              <rect x="45" y="60" width="6" height="6" fill="black" />
                              <rect x="90" y="60" width="6" height="12" fill="black" />
                              <rect x="110" y="60" width="18" height="6" fill="black" />

                              <rect x="10" y="85" width="18" height="6" fill="black" />
                              <rect x="35" y="85" width="6" height="6" fill="black" />
                              <rect x="50" y="85" width="12" height="12" fill="black" />
                              <rect x="70" y="85" width="6" height="6" fill="black" />
                              <rect x="85" y="85" width="18" height="6" fill="black" />
                              <rect x="115" y="85" width="15" height="12" fill="black" />

                              <rect x="45" y="105" width="6" height="12" fill="black" />
                              <rect x="60" y="105" width="18" height="6" fill="black" />
                              <rect x="85" y="105" width="6" height="6" fill="black" />
                              <rect x="100" y="105" width="12" height="18" fill="black" />
                              <rect x="120" y="105" width="10" height="6" fill="black" />

                              <rect x="45" y="125" width="18" height="6" fill="black" />
                              <rect x="70" y="125" width="6" height="6" fill="black" />
                              <rect x="85" y="120" width="12" height="12" fill="black" />
                              <rect x="115" y="125" width="15" height="6" fill="black" />

                              {/* Center AVATR Badge */}
                              <rect x="52" y="52" width="36" height="36" rx="6" fill="white" stroke="black" strokeWidth="2" />
                              <polygon points="70,57 82,70 70,83 58,70" fill="black" />
                              <polygon points="70,62 77,70 70,78 63,70" fill="white" />
                            </svg>
                          )}
                        </div>

                        <div className="w-full text-center pt-2 border-t border-zinc-200">
                          <span className="text-xs font-mono font-black text-black block">
                            ຍອດຊຳລະ: ${netPriceUSD.toLocaleString()} USD
                          </span>
                          <span className="text-[10px] font-mono text-zinc-600 block mt-0.5">
                            ≈ {netPriceLAK.toLocaleString()} LAK
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsEnlargeQrOpen(true)}
                          className="w-full py-2 px-3 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-white" />
                          <span>ຂະຫຍາຍເບິ່ງ QR ເຕັມຈໍ</span>
                        </button>
                      </div>
                    </div>

                    {/* Transfer Reference & Payment Slip Upload Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                          {lang === 'lo' ? 'ເລກອ້າງອີງການໂອນ (BCEL Ref / Slip No.)' : lang === 'th' ? 'เลขอ้างอิงการโอนเงิน (BCEL Ref / Slip No.)' : 'Transfer Ref / Slip No.'}
                        </label>
                        <input
                          type="text"
                          value={transferRef}
                          onChange={(e) => setTransferRef(e.target.value)}
                          placeholder="e.g. TX-982341..."
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition-colors"
                        />
                        <span className="text-[10px] text-zinc-500 mt-1 block">
                          {lang === 'lo' ? 'ໃສ່ເລກອ້າງອີງຈາກໃບບິນໂອນເງິນ ຫຼື ປ່ອຍວ່າງ' : 'ใส่เลขอ้างอิงจากสลิปหรือปล่อยว่าง'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                          {lang === 'lo' ? 'ແນບສະລິບການໂອນເງິນ (ບໍ່ບັງຄັບ)' : lang === 'th' ? 'แนบสลิปการโอนเงิน (ไม่บังคับ)' : 'Payment Slip (Optional)'}
                        </label>
                        {!slipPreviewUrl ? (
                          <label className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-950 hover:bg-zinc-800 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl text-xs text-zinc-300 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{lang === 'lo' ? 'ເລືອກຮູບສະລິບ (WebP <= 300KB)' : 'เลือกรูปสลิป (WebP <= 300KB)'}</span>
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
                              <span className="text-[11px] text-zinc-300 truncate max-w-[120px]">{slipFile?.name}</span>
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

                {/* Discount Input (USD Only) */}
                <div className="text-xs pt-2">
                  <div className="max-w-md">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-zinc-400 font-medium">ສ່ວນຫຼຸດພິເສດ ($ USD)</label>
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
                        onChange={(e) => handleDiscountChange(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-white font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Free Gifts & Privileges Selection with Admin Management */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-zinc-300" />
                    <span>4. {lang === 'lo' ? 'ເລືອກຊຸດຂອງແຖມ & ບໍລິການຫຼັງການຂາຍ' : lang === 'th' ? 'เลือกชุดของแถม & บริการหลังการขาย' : 'Dealership Packages & Privileges'}</span>
                  </div>
                  {isSuperAdmin ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3 h-3 text-zinc-200" /> {lang === 'lo' ? 'Admin: ຈັດການ & ເພີ່ມໝວດໄດ້' : lang === 'th' ? 'Admin: จัดการ & เพิ่มหมวดได้' : 'Admin Mode'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 flex items-center gap-1 font-mono">
                      <Lock className="w-3 h-3 text-zinc-500" /> {lang === 'lo' ? 'ລາຍການມາດຕະຖານໂຊຣູມ' : lang === 'th' ? 'รายการมาตรฐานโชว์รูม' : 'Standard Showroom Packages'}
                    </span>
                  )}
                </div>

                {/* Admin: Add New Package Category Form */}
                {isSuperAdmin && (
                  <div className="p-3.5 bg-zinc-900/80 rounded-2xl border border-zinc-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-300 uppercase flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{lang === 'lo' ? 'ສິດ Admin: ເພີ່ມໝວດ / ແພັກເກດຂອງແຖມໃໝ່' : lang === 'th' ? 'สิทธิ์ Admin: เพิ่มหมวด / แพ็กเกจของแถมใหม่' : 'Add New Dealership Package'}</span>
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">{t.supabaseLiveSync}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newPackageInput}
                        onChange={(e) => setNewPackageInput(e.target.value)}
                        placeholder={lang === 'lo' ? 'ປ້ອນຊື່ໝວດຂອງແຖມ ຫຼື ບໍລິການໃໝ່...' : lang === 'th' ? 'กรอกชื่อหมวดของแถม หรือบริการใหม่...' : 'Enter package name...'}
                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPackage(e);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddPackage}
                        className="px-3.5 py-2 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors flex-shrink-0 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.save}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Packages Selection Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {giftOptions.map((gift, idx) => {
                    const isChecked = selectedGifts.includes(gift);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleGift(gift)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${isChecked
                          ? 'bg-zinc-900 border-white text-white'
                          : 'bg-zinc-900/30 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }}
                            className="rounded border-zinc-700 text-black focus:ring-0"
                          />
                          <span className="truncate">{gift}</span>
                        </div>

                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={(e) => handleDeletePackage(gift, e)}
                            className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center gap-2 text-[11px] text-zinc-300 font-mono">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 text-white" />
                  <span>{lang === 'lo' ? 'ມອບການຮັບປະກັນແບັດເຕີຣີ CATL 8 ປີ / 160,000 km ມາດຕະຖານໂຮງງານ AVATR' : lang === 'th' ? 'รับประกันแบตเตอรี่ CATL 8 ปี / 160,000 กม. มาตรฐานโรงงาน AVATR' : 'CATL Battery 8 Years / 160,000 km Warranty'}</span>
                </div>
              </div>

              {/* Step 5: Customer Documents & Contracts Suite (ສ່ວນທີ 5: ອອກເອກະສານ & ໃບສັນຍາ) */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>5. {lang === 'lo' ? 'ອອກເອກະສານ & ໃບສັນຍາ (Customer Documents Suite)' : lang === 'th' ? 'ออกเอกสาร & สัญญาทางการ (Customer Documents Suite)' : 'Official Documents & Contracts Suite'}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-mono">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>7 {lang === 'lo' ? 'ຮູບແບບເອກະສານ' : 'Document Templates'}</span>
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {lang === 'lo'
                    ? `ສາມາດກົດອອກ, ພິມ ຫຼື ດາວໂຫຼດ (PDF) ເອກະສານສັນຍາ, ໃບເບີກລົດ ແລະ ໃບຮັບເງິນ ໂດຍດຶງຂໍ້ມູນລົດ (${selectedVehicle?.model || 'AVATR'}) ແລະ ຂໍ້ມູນລູກຄ້າທີ່ປ້ອນຂ້າງເທິງມາອັດຕະໂນມັດ.`
                    : 'Issue, print or export (PDF) vehicle sales agreements, warehouse releases and official receipts pre-populated with active customer and vehicle data.'}
                </p>

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
              <div className="theme-adaptive-dark-surface rounded-3xl border border-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 shadow-xl sm:p-6 space-y-4">
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
                    className="pos-confirm-sale-button w-full min-h-14 py-3.5 bg-white hover:bg-zinc-200 active:scale-[0.99] text-black font-extrabold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isProcessingSale ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <ShoppingBag className="w-5 h-5 fill-black" />}
                    <span>{t.confirmSaleAndDeduct}</span>
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
                    AVATR AUTO SERVICE LAOS
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
                    <svg className="w-56 h-56" viewBox="0 0 140 140" fill="none">
                      <rect x="5" y="5" width="35" height="35" rx="6" fill="black" />
                      <rect x="10" y="10" width="25" height="25" rx="3" fill="white" />
                      <rect x="15" y="15" width="15" height="15" rx="2" fill="black" />
                      <rect x="100" y="5" width="35" height="35" rx="6" fill="black" />
                      <rect x="105" y="10" width="25" height="25" rx="3" fill="white" />
                      <rect x="110" y="15" width="15" height="15" rx="2" fill="black" />
                      <rect x="5" y="100" width="35" height="35" rx="6" fill="black" />
                      <rect x="10" y="105" width="25" height="25" rx="3" fill="white" />
                      <rect x="15" y="110" width="15" height="15" rx="2" fill="black" />
                      <rect x="45" y="10" width="6" height="6" fill="black" />
                      <rect x="55" y="10" width="6" height="12" fill="black" />
                      <rect x="65" y="10" width="6" height="6" fill="black" />
                      <rect x="75" y="10" width="6" height="18" fill="black" />
                      <rect x="85" y="10" width="6" height="6" fill="black" />
                      <rect x="45" y="25" width="18" height="6" fill="black" />
                      <rect x="70" y="25" width="6" height="6" fill="black" />
                      <rect x="85" y="25" width="8" height="6" fill="black" />
                      <rect x="10" y="45" width="12" height="6" fill="black" />
                      <rect x="28" y="45" width="6" height="12" fill="black" />
                      <rect x="40" y="45" width="12" height="6" fill="black" />
                      <rect x="60" y="45" width="6" height="18" fill="black" />
                      <rect x="75" y="45" width="18" height="6" fill="black" />
                      <rect x="105" y="45" width="6" height="12" fill="black" />
                      <rect x="120" y="45" width="12" height="6" fill="black" />
                      <rect x="10" y="60" width="6" height="18" fill="black" />
                      <rect x="25" y="60" width="12" height="6" fill="black" />
                      <rect x="45" y="60" width="6" height="6" fill="black" />
                      <rect x="90" y="60" width="6" height="12" fill="black" />
                      <rect x="110" y="60" width="18" height="6" fill="black" />
                      <rect x="10" y="85" width="18" height="6" fill="black" />
                      <rect x="35" y="85" width="6" height="6" fill="black" />
                      <rect x="50" y="85" width="12" height="12" fill="black" />
                      <rect x="70" y="85" width="6" height="6" fill="black" />
                      <rect x="85" y="85" width="18" height="6" fill="black" />
                      <rect x="115" y="85" width="15" height="12" fill="black" />
                      <rect x="45" y="105" width="6" height="12" fill="black" />
                      <rect x="60" y="105" width="18" height="6" fill="black" />
                      <rect x="85" y="105" width="6" height="6" fill="black" />
                      <rect x="100" y="105" width="12" height="18" fill="black" />
                      <rect x="120" y="105" width="10" height="6" fill="black" />
                      <rect x="45" y="125" width="18" height="6" fill="black" />
                      <rect x="70" y="125" width="6" height="6" fill="black" />
                      <rect x="85" y="120" width="12" height="12" fill="black" />
                      <rect x="115" y="125" width="15" height="6" fill="black" />
                      <rect x="52" y="52" width="36" height="36" rx="6" fill="white" stroke="black" strokeWidth="2" />
                      <polygon points="70,57 82,70 70,83 58,70" fill="black" />
                      <polygon points="70,62 77,70 70,78 63,70" fill="white" />
                    </svg>
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
              className="a4-document-canvas w-full max-w-[794px] mx-auto p-6 sm:p-8 official-dealer-document bg-white text-black rounded-lg space-y-3.5 text-[11px] font-sans shadow-xl print:m-0 print:p-0 print:border-none print:shadow-none"
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
                      AVATR AUTO SERVICE SOLE CO., LTD
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

      {/* Modern Confirmation Popup Modal for Deleting Package / Privilege */}
      <ConfirmDeleteModal
        isOpen={!!packageToDelete}
        onClose={() => setPackageToDelete(null)}
        onConfirm={async () => {
          if (!packageToDelete) return;
          const pkg = packageToDelete;
          const updated = giftOptions.filter(g => g !== pkg);
          setGiftOptions(updated);
          setSelectedGifts(prev => prev.filter(g => g !== pkg));
          localStorage.setItem('avatr_dealership_packages_v2', JSON.stringify(updated));
          try {
            await saveDealershipConfigToSupabase({ campaignCategories: updated });
          } catch (e) {
            console.warn('Supabase delete package fallback:', e);
          }
          triggerToast(`ລົບໝວດ "${pkg}" ອອກຮຽບຮ້ອຍແລ້ວ!`);
          setPackageToDelete(null);
        }}
        itemName={packageToDelete || ''}
        itemType="PACKAGE / PRIVILEGE"
        title={lang === 'lo' ? 'ຢືນຢັນການລົບຊຸດຂອງແຖມ / ບໍລິການ' : 'Confirm Delete Package'}
        description={lang === 'lo'
          ? `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບ "${packageToDelete}" ອອກຈາກລາຍການຂອງແຖມ?`
          : `Are you sure you want to delete package "${packageToDelete}"?`
        }
        confirmButtonText={lang === 'lo' ? 'ຢືນຢັນລົບ' : 'Delete'}
        cancelButtonText={lang === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
        lang={lang}
      />

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
