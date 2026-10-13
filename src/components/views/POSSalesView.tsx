import { useState, useEffect, useRef } from 'react';
import { InventoryItem, VehicleModel, Language, InvoiceBillRecord, StockLogRecord, SystemUser, Lead } from '../../types';
import { getStoredCompanyBankInfo, saveStoredCompanyBankInfo, CompanyBankInfo } from '../../data/companySettings';
import { translations } from '../../data/translations';
import { LAO_PROVINCES } from '../../data/laoProvinces';
import { 
  uploadCompanyQrCodeToStorage, 
  saveDealershipConfigToSupabase 
} from '../../supabase';
import { newRecordId } from '../../backend/ids';
import { saveBillRecord } from '../../backend/data';
import AvatrLogo from '../layout/AvatrLogo';
import { ConfirmDeleteModal } from '../modals';
import { 
  Receipt, 
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

interface POSSalesViewProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  bills: InvoiceBillRecord[];
  setBills: React.Dispatch<React.SetStateAction<InvoiceBillRecord[]>>;
  leads: Lead[];
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

  // Selected vehicle object
  const selectedVehicle = availableVehicles.find(v => v.vin === selectedVin) || availableVehicles[0];

  // Customer Details Form - Zero pre-filled values
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerIDCard, setCustomerIDCard] = useState('');
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
  
  // Finance Options
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(30);
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
        if (prefilledCustomer.tenureMonths) setTenureMonths(prefilledCustomer.tenureMonths);
      }
      if (prefilledCustomer.interestedModel) {
        const matching = availableVehicles.find(v => v.model === prefilledCustomer.interestedModel);
        if (matching) setSelectedVin(matching.vin);
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

  // Super Admin: Upload custom company QR Code to Supabase Storage / Cloud
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

  // Super Admin: Reset Company QR back to official default
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
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Calculations
  const basePriceUSD = selectedVehicle ? selectedVehicle.priceUSD : 0;
  const netPriceUSD = Math.max(0, basePriceUSD - (discountUSD || 0));
  const netPriceLAK = netPriceUSD * 22000;
  const downPaymentUSD = Math.round(netPriceUSD * (downPaymentPercent / 100));
  const downPaymentLAK = downPaymentUSD * 22000;
  const loanPrincipalUSD = netPriceUSD - downPaymentUSD;
  // Estimated monthly calculation (approx 7.5% per annum for Lao banks)
  const monthlyPaymentUSD = Math.round((loanPrincipalUSD * (1 + 0.075 * (tenureMonths / 12))) / tenureMonths);
  const monthlyPaymentLAK = monthlyPaymentUSD * 22000;

  // Filtered available vehicles list
  const filteredAvailableVehicles = availableVehicles.filter(item => {
    if (!vehicleSearch.trim()) return true;
    const q = vehicleSearch.toLowerCase();
    return (
      item.vin.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q) ||
      (item.plateNumber || '').toLowerCase().includes(q) ||
      (item.color || '').toLowerCase().includes(q)
    );
  });

  // CONFIRM SALE & DEDUCT STOCK
  const handleProcessSale = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const linkedLead = prefilledCustomer
      ? leads.find(lead => lead.id === prefilledCustomer.id) || prefilledCustomer
      : (() => {
          const normalizedPhone = customerPhone.replace(/\D/g, '');
          if (!normalizedPhone) return undefined;
          const matches = leads.filter(lead => lead.phone.replace(/\D/g, '') === normalizedPhone);
          return matches.length === 1 ? matches[0] : undefined;
        })();

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
      discountLAK: (Number(discountUSD) || 0) * 22000,
      netTotalUSD: netPriceUSD,
      netTotalLAK: netPriceLAK,
      amountUSD: netPriceUSD,
      amountLAK: netPriceLAK,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      leadId: linkedLead?.id,
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
      freeGifts: selectedGifts,
      warrantyTerms: 'ຮັບປະກັນແບັດເຕີຣີ CATL 8 ປີ / 160,000 km | ຕົວລົດ 5 ປີ / 120,000 km',
      salesRep: currentUser?.name || 'Admin',
      recordedBy: currentUser?.name || 'Admin',
      notes: saleNotes || 'ຂາຍອອກຜ່ານລະບົບ POS ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ ພ້ອມຕັດສະຕ໋ອກອັດຕະໂນມັດ',
    };

    try {
      if (!currentUser?.id) throw new Error('Sign in again before recording this sale.');
      await saveBillRecord(newBill, currentUser.id);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Sale could not be saved.');
      return;
    }
    setInventory(prev => prev.map(item => item.vin === selectedVehicle.vin ? updatedInventoryItem : item));
    setBills(prev => [newBill, ...prev]);

    // 3. RECORD STOCK-OUT TRANSACTION LOG
    const newStockLog: StockLogRecord = {
      id: `LOG-OUT-${Date.now().toString().slice(-6)}`,
      billId: newBill.id,
      leadId: linkedLead?.id,
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
    triggerToast(`ຂາຍອອກສຳເລັດ! ຕັດສະຕ໋ອກລົດ ${selectedVehicle.model} ອອກແລ້ວ (ເຫຼືອ ${remainingQty} ຄັນ)`);

    // Reset Form Fields for next transaction
    setCustomerName('');
    setCustomerPhone('');
    setCustomerIDCard('');
    setCustomerAddress('');
    setTransferRef('');
    setDiscountUSD(0);
    setSaleNotes('');
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
        margin: [4, 4, 4, 4],
        orientation: 'portrait',
        singlePage: true,
      });
    } catch (err) {
      console.error('Error generating POS receipt PDF:', err);
      alert('ບໍ່ສາມາດດາວໂຫຼດ PDF ໄດ້');
    } finally {
      setIsExportingPosPdf(false);
    }
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 pb-16">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-zinc-900 border border-zinc-700 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* WRAPPER FOR POS VIEWS - SUPPRESSED DURING PRINT WHEN BILL IS BEING PRINTED */}
      <div className={createdBill ? "print:hidden hide-on-print-pos space-y-6" : "space-y-6"}>
        {/* Top Banner */}
        <div className="theme-adaptive-dark-surface relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800 p-5 sm:p-7 rounded-3xl shadow-xl">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 bg-white text-black rounded-xl shadow-sm">
                  <ShoppingBag className="w-5 h-5 fill-current" />
                </span>
                <span className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.18em] text-zinc-300 font-bold">
                  SALES · POINT OF SALE
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {t.posHeader || t.posTitle}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
                {t.posHeaderSub || t.posSubtitle}
              </p>
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

        <nav aria-label="Sales workflow" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { number: '01', label: lang === 'lo' ? 'ເລືອກລົດ' : lang === 'th' ? 'เลือกรถ' : 'Vehicle' },
            { number: '02', label: lang === 'lo' ? 'ຂໍ້ມູນລູກຄ້າ' : lang === 'th' ? 'ข้อมูลลูกค้า' : 'Customer' },
            { number: '03', label: lang === 'lo' ? 'ການຊຳລະ' : lang === 'th' ? 'การชำระเงิน' : 'Payment' },
            { number: '04', label: lang === 'lo' ? 'ຂອງແຖມ' : lang === 'th' ? 'ของแถม' : 'Packages' },
            { number: '05', label: lang === 'lo' ? 'ກວດສອບ & ອອກບິນ' : lang === 'th' ? 'ตรวจสอบและออกบิล' : 'Review & bill' },
          ].map((step, index) => (
            <div key={step.number} className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
              index === 0
                ? 'border-white/20 bg-white/[0.08] text-white'
                : 'border-zinc-800 bg-zinc-950/70 text-zinc-400'
            }`}>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-[10px] font-bold ${
                index === 0 ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'
              }`}>{step.number}</span>
              <span className="truncate text-[11px] font-medium">{step.label}</span>
            </div>
          ))}
        </nav>

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
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <Car className="w-4 h-4 text-white" />
                  <span>1. {t.selectVehicleToSell} <span className="text-red-500">*</span></span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {t.stockAvailable}: {availableVehicles.length} {t.unitCars}
                </span>
              </div>

              {/* Search Available Stock */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                />
              </div>

              {/* Vehicle Options List */}
              <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                {filteredAvailableVehicles.map((item) => {
                  const isSelected = selectedVin === item.vin;
                  return (
                    <button
                      type="button"
                      key={item.vin}
                      onClick={() => setSelectedVin(item.vin)}
                      aria-pressed={isSelected}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-zinc-900 border-white/70 shadow-md text-white ring-1 ring-white/10'
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-600 text-zinc-400'
                      } w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-white text-xs font-bold">{item.model}</strong>
                        <span className="font-mono text-white text-xs font-bold">
                          ${item.priceUSD.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 truncate">
                        VIN: {item.vin}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                        <span>{item.color || '-'}</span>
                        <span className="text-zinc-400 font-mono">{t.tableStock}: {item.stockQuantity} {t.unitCars}</span>
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
                      src={selectedVehicle.image}
                      alt={selectedVehicle.model}
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
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-white font-bold text-sm">
                <User className="w-4 h-4 text-white" />
                <span>2. {t.buyerInfo}</span>
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 2xl:grid-cols-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">{t.buyerName} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={lang === 'lo' ? 'ຕົວຢ່າງ: ທ່ານ ບຸນມີ ໄຊຍະວົງ' : lang === 'th' ? 'ตัวอย่าง: คุณ สมชาย ใจดี' : 'e.g. John Doe'}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-white" />
                    <span>ວັນທີອອກບິນ (ວັນ/ເດືອນ/ປີ) <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400 font-medium">{t.buyerPhone} <span className="text-red-500">*</span></label>
                    {canOpenWhatsApp && (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>WA: {formatWhatsAppDisplay(customerPhone)}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="020 5xxxxxxx"
                      className="min-w-0 flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                    />
                    <button
                      type="button"
                      disabled={!canOpenWhatsApp}
                      onClick={() => openWhatsApp(customerPhone, customerName, selectedVehicle?.model, lang)}
                      className={`pos-whatsapp-button inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all shadow-sm sm:px-3 ${
                        canOpenWhatsApp
                          ? 'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                      }`}
                      aria-label={lang === 'lo' ? 'ເປີດ WhatsApp ຫາລູກຄ້າ' : lang === 'th' ? 'เปิด WhatsApp ถึงลูกค้า' : 'Open WhatsApp for customer'}
                      title={canOpenWhatsApp
                        ? 'ກົດເພື່ອເປີດ WhatsApp ຕາມເບີໂທທີ່ປ້ອນເຂົ້າໄປ'
                        : lang === 'lo' ? 'ປ້ອນເບີໂທທີ່ຖືກຕ້ອງກ່ອນ' : lang === 'th' ? 'กรอกหมายเลขโทรศัพท์ที่ถูกต้องก่อน' : 'Enter a valid phone number first'}
                    >
                      <WhatsAppIcon className="h-4 w-4 shrink-0" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    {lang === 'lo' ? 'ເລກບັດປະຊາຊົນ / Passport (ຈະໃສ່ ຫຼື ບໍ່ໃສ່ກໍໄດ້)' : lang === 'th' ? 'เลขบัตรประจำตัว / Passport (ใส่หรือไม่ใส่ก็ได้)' : 'ID Card / Passport (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={customerIDCard}
                    onChange={(e) => setCustomerIDCard(e.target.value)}
                    placeholder="ID-01-VTE-884920 / P0123456"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                  />
                </div>

                {/* Province Selector (All 18 Provinces) */}
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    ແຂວງ / ນະຄອນຫຼວງ (18 ແຂວງ) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={provinceDropdownRef}>
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
                            className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                              customerProvince === province.nameLo
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
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    ເມືອງ (District) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={districtDropdownRef}>
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
                            className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                              selectedDistrictName === district.nameLo
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
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    ບ້ານ (Village) <span className="text-red-500">*</span>
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
                            className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                              customerVillage === village
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
                          className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                            customerVillage === '__custom__'
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
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-white font-bold text-sm">
                <CreditCard className="w-4 h-4 text-white" />
                <span>3. {t.paymentType}</span>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  aria-pressed={paymentMethod === 'transfer'}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                    paymentMethod === 'transfer'
                      ? 'bg-white text-black font-bold shadow-md border-white ring-2 ring-white/15'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  } min-h-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                >
                  <QrCode className={`w-5 h-5 mb-1 ${paymentMethod === 'transfer' ? 'text-black' : 'text-zinc-400'}`} />
                  <span>{t.paymentTransfer}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  aria-pressed={paymentMethod === 'cash'}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-white text-black font-bold shadow-md border-white ring-2 ring-white/15'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  } min-h-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                >
                  <Banknote className={`w-5 h-5 mb-1 ${paymentMethod === 'cash' ? 'text-black' : 'text-zinc-400'}`} />
                  <span>{t.paymentCash}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('finance')}
                  aria-pressed={paymentMethod === 'finance'}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                    paymentMethod === 'finance'
                      ? 'bg-white text-black font-bold shadow-md border-white ring-2 ring-white/15'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  } min-h-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                >
                  <Building2 className={`w-5 h-5 mb-1 ${paymentMethod === 'finance' ? 'text-black' : 'text-zinc-400'}`} />
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

                  {/* Super Admin Management Controls Toolbar */}
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
                        {/* Direct File Upload for Super Admin */}
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
                </div>
              )}

              {/* Financing Details */}
              {paymentMethod === 'finance' && (
                <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">ວາງເງິນດາວ (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={downPaymentPercent}
                        onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                        placeholder="30"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">ໄລຍະເວລາຜ່ອນ (ເດືອນ)</label>
                      <input
                        type="number"
                        min="1"
                        value={tenureMonths}
                        onChange={(e) => setTenureMonths(Number(e.target.value))}
                        placeholder="48"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white/20"
                      />
                    </div>
                  </div>

                  {/* Calculated Finance Summary */}
                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex justify-between items-center text-xs font-mono">
                    <span className="text-zinc-400">ຄ່າງວດປະມານການຕໍ່ເດືອນ:</span>
                    <div className="text-right">
                      <span className="text-white font-bold text-sm">${monthlyPaymentUSD.toLocaleString()} USD / ເດືອນ</span>
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
                    <ShieldCheck className="w-3 h-3 text-zinc-200" /> {lang === 'lo' ? 'Admin: ຈັດການ & ເພີ່ມໝວດໄດ້' : lang === 'th' ? 'Admin: จัดการ & เพิ่มหมวดได้' : 'Super Admin Mode'}
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
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-zinc-900 border-white text-white'
                          : 'bg-zinc-900/30 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
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

            {/* Step 5: Final Price Summary & Execute Sale Button */}
            <div className="theme-adaptive-dark-surface rounded-3xl border border-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 shadow-xl sm:p-6 space-y-4">
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

              <div className="pos-net-total flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-white">
                <div>
                  <span className="text-sm font-bold block">{t.netPaymentTotal}:</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-white">
                    ${netPriceUSD.toLocaleString()} USD
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="pos-confirm-sale-button w-full min-h-14 py-3.5 bg-white hover:bg-zinc-200 active:scale-[0.99] text-black font-extrabold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                >
                  <ShoppingBag className="w-5 h-5 fill-black" />
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
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-white space-y-5 max-h-[95vh] overflow-y-auto shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:m-0 print:max-h-none print:max-w-none print:w-full print:overflow-visible print-modal-container">
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
                      <span>{lang === 'lo' ? 'ບັນທຶກເປັນ PDF' : 'Save PDF'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => window.print()}
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
              className="a4-document-canvas p-6 official-dealer-document bg-white text-black border border-black rounded-2xl space-y-4 text-xs font-sans shadow-md print:m-0 print:p-2 print:border-none print:shadow-none"
            >
              <div className="flex justify-between items-start pb-4 border-b border-zinc-800">
                <div>
                  <span className="font-black tracking-widest text-base text-black">AVATR AUTO SERVICE</span>
                  <p className="text-[10px] text-zinc-600 font-mono">{t.printInvoiceBtn || 'OFFICIAL SALES INVOICE'}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-black font-bold block">{createdBill.billNumber}</span>
                  <span className="text-zinc-600 text-[10px]">{createdBill.date}</span>
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

              <div className="text-[11px] text-zinc-700">
                {t.paymentType}: <strong className="text-black uppercase">{createdBill.paymentMethod}</strong> • {t.salesRepresentative}: {createdBill.recordedBy}
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
    </div>
  );
}
