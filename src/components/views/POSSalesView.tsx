import { useState } from 'react';
import { InventoryItem, VehicleModel, Language, InvoiceBillRecord, StockLogRecord, SystemUser } from '../../types';
import { getStoredCompanyBankInfo, saveStoredCompanyBankInfo, CompanyBankInfo } from '../../data/companySettings';
import { translations } from '../../data/translations';
import { 
  uploadCompanyQrCodeToStorage, 
  saveInventoryItemToFirestore, 
  saveBillToFirestore, 
  saveDealershipConfigToFirestore 
} from '../../firebase';
import AvatrLogo from '../layout/AvatrLogo';
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
  Copy
} from 'lucide-react';

interface POSSalesViewProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  bills: InvoiceBillRecord[];
  setBills: React.Dispatch<React.SetStateAction<InvoiceBillRecord[]>>;
  stockLogs: StockLogRecord[];
  setStockLogs: React.Dispatch<React.SetStateAction<StockLogRecord[]>>;
  vehicles: VehicleModel[];
  currentUser?: SystemUser;
  lang: Language;
  onNavigateToBills: () => void;
}

export default function POSSalesView({
  inventory,
  setInventory,
  bills,
  setBills,
  stockLogs,
  setStockLogs,
  vehicles,
  currentUser,
  lang,
  onNavigateToBills,
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
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerIDCard, setCustomerIDCard] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerProvince, setCustomerProvince] = useState('');

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
  const [slipImage, setSlipImage] = useState<string | null>(null);
  
  // Finance Options
  const [financeCompany, setFinanceCompany] = useState('');
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(30);
  const [tenureMonths, setTenureMonths] = useState<number>(36);

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

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Company Official Banking & QR Code Settings
  const [companyBankInfo, setCompanyBankInfo] = useState<CompanyBankInfo>(() => getStoredCompanyBankInfo());
  const [isEnlargeQrOpen, setIsEnlargeQrOpen] = useState(false);

  // Super Admin: Upload custom company QR Code to Firebase Storage / Cloud
  const handleCompanyQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSuperAdmin) {
      triggerToast('ສະເພາະ Admin ຈຶ່ງສາມາດອັບໂຫລດຮູບ QR ບໍລິສັດໄດ້!');
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      try {
        triggerToast('ກຳລັງອັບໂຫຼດຮູບ QR Code ໄປຍັງ Firebase Storage...');
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
      await saveDealershipConfigToFirestore({ companyQrImageUrl: null });
    } catch (e) {
      console.warn('Firestore reset QR fallback:', e);
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
      await saveDealershipConfigToFirestore({ campaignCategories: updated });
    } catch (e) {
      console.warn('Firestore save packages fallback:', e);
    }
    setNewPackageInput('');
    triggerToast(`ເພີ່ມໝວດແພັກເກດ "${trimmed}" ສຳເລັດແລ້ວ!`);
  };

  const handleDeletePackage = async (pkg: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSuperAdmin) {
      triggerToast('ສະເພາະ Admin ຈຶ່ງສາມາດລົບໝວດໄດ້!');
      return;
    }
    if (!confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບໝວດ "${pkg}" ອອກຈາກລາຍການ?`)) return;
    const updated = giftOptions.filter(g => g !== pkg);
    setGiftOptions(updated);
    setSelectedGifts(prev => prev.filter(g => g !== pkg));
    localStorage.setItem('avatr_dealership_packages_v2', JSON.stringify(updated));
    try {
      await saveDealershipConfigToFirestore({ campaignCategories: updated });
    } catch (e) {
      console.warn('Firestore delete package fallback:', e);
    }
    triggerToast(`ລົບໝວດ "${pkg}" ອອກຮຽບຮ້ອຍແລ້ວ!`);
  };

  const toggleGift = (gift: string) => {
    setSelectedGifts(prev => 
      prev.includes(gift) ? prev.filter(g => g !== gift) : [...prev, gift]
    );
  };

  // Sales Representative - defaults to current user name or empty
  const [salesRep, setSalesRep] = useState(currentUser?.name || '');
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
      item.plateNumber.toLowerCase().includes(q) ||
      item.color.toLowerCase().includes(q)
    );
  });

  // CONFIRM SALE & DEDUCT STOCK
  const handleProcessSale = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVehicle) {
      triggerToast('ກະລຸນາເລືອກລົດຍົນທີ່ຕ້ອງການຂາຍກ່ອນ!');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      triggerToast('ກະລຸນາປ້ອນຊື່ ແລະ ເບີໂທລະສັບລູກຄ້າ!');
      return;
    }

    const currentQty = selectedVehicle.stockQuantity;
    const remainingQty = Math.max(0, currentQty - 1);
    const invoiceNum = `INV-AVATR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    // 1. DEDUCT STOCK (ຕັດສະຕ໋ອກອອກ)
    const updatedInventoryItem: InventoryItem = {
      ...selectedVehicle,
      stockQuantity: remainingQty,
      status: remainingQty === 0 ? 'sold' : selectedVehicle.status,
      reservedForCustomer: undefined,
    };

    setInventory(prev => prev.map(item => {
      if (item.vin === selectedVehicle.vin) {
        return updatedInventoryItem;
      }
      return item;
    }));

    try {
      saveInventoryItemToFirestore(updatedInventoryItem);
    } catch (e) {
      console.warn('Firestore inventory deduction fallback:', e);
    }

    // 2. CREATE OFFICIAL INVOICE BILL RECORD
    const newBill: InvoiceBillRecord = {
      id: invoiceNum,
      billType: 'sale',
      billNumber: invoiceNum,
      date: now,
      vin: selectedVehicle.vin,
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
      customerIDCard: customerIDCard.trim(),
      customerAddress: customerAddress.trim(),
      customerProvince,
      paymentMethod,
      qrUsed: 'company_official_qr',
      bankName: paymentMethod === 'transfer' ? bankName : undefined,
      transferRef: paymentMethod === 'transfer' ? transferRef || 'QR-CONFIRMED' : undefined,
      financeCompany: paymentMethod === 'finance' ? financeCompany : undefined,
      downPaymentPercent: paymentMethod === 'finance' ? downPaymentPercent : undefined,
      downPaymentUSD: paymentMethod === 'finance' ? downPaymentUSD : undefined,
      tenureMonths: paymentMethod === 'finance' ? tenureMonths : undefined,
      monthlyPaymentLAK: paymentMethod === 'finance' ? monthlyPaymentLAK : undefined,
      freeGifts: selectedGifts,
      warrantyTerms: 'ຮັບປະກັນແບັດເຕີຣີ CATL 8 ປີ / 160,000 km | ຕົວລົດ 5 ປີ / 120,000 km',
      salesRep: salesRep,
      recordedBy: salesRep,
      notes: saleNotes || 'ຂາຍອອກຜ່ານລະບົບ POS ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ ພ້ອມຕັດສະຕ໋ອກອັດຕະໂນມັດ',
    };

    setBills(prev => [newBill, ...prev]);

    try {
      saveBillToFirestore(newBill);
    } catch (e) {
      console.warn('Firestore bill save fallback:', e);
    }

    // 3. RECORD STOCK-OUT TRANSACTION LOG
    const newStockLog: StockLogRecord = {
      id: `LOG-OUT-${Date.now().toString().slice(-6)}`,
      type: 'stock_out',
      vin: selectedVehicle.vin,
      model: selectedVehicle.model,
      plateNumber: selectedVehicle.plateNumber,
      color: selectedVehicle.color,
      quantity: 1,
      priceUSD: netPriceUSD,
      priceLAK: netPriceLAK,
      timestamp: now,
      recordedBy: salesRep,
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

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-zinc-900 border border-zinc-700 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-7 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-white text-black rounded-lg">
              <ShoppingBag className="w-5 h-5 fill-current" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-300 font-bold">
              AUTOMOTIVE POINT OF SALE (POS)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.posHeader || t.posTitle}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {t.posHeaderSub || t.posSubtitle}
          </p>
        </div>

        <button
          onClick={onNavigateToBills}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl border border-zinc-700 transition-colors"
        >
          <Receipt className="w-4 h-4 text-zinc-400" />
          <span>{t.filterSaleBills} ({bills.filter(b => b.billType === 'sale').length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
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
        <form onSubmit={handleProcessSale} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Vehicle Selection & Visual Preview (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <Car className="w-4 h-4 text-white" />
                  <span>1. {t.selectVehicleToSell} *</span>
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                />
              </div>

              {/* Vehicle Options List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredAvailableVehicles.map((item) => {
                  const isSelected = selectedVin === item.vin;
                  return (
                    <div
                      key={item.vin}
                      onClick={() => setSelectedVin(item.vin)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-zinc-900 border-white shadow-lg text-white'
                          : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                      }`}
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
                        <span>{item.color}</span>
                        <span className="text-zinc-400 font-mono">{t.tableStock}: {item.stockQuantity} {t.unitCars}</span>
                      </div>
                    </div>
                  );
                })}
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
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/80 text-white border border-zinc-700 font-mono">
                      {selectedVehicle.plateNumber}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
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
                      <span className="text-white font-medium">{selectedVehicle.color}</span>
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

          {/* RIGHT COLUMN: Detailed Customer, Financials & Sale Execution (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Step 2: Customer Details */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-white font-bold text-sm">
                <User className="w-4 h-4 text-white" />
                <span>2. {t.buyerInfo}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">{t.buyerName} *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={lang === 'lo' ? 'ຕົວຢ່າງ: ທ່ານ ບຸນມີ ໄຊຍະວົງ' : lang === 'th' ? 'ตัวอย่าง: คุณ สมชาย ใจดี' : 'e.g. John Doe'}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">{t.buyerPhone} *</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="020 5xxxxxxx"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">{t.buyerIDPassport}</label>
                  <input
                    type="text"
                    value={customerIDCard}
                    onChange={(e) => setCustomerIDCard(e.target.value)}
                    placeholder="ID-01-VTE-884920"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">{lang === 'lo' ? 'ແຂວງ / ນະຄອນຫຼວງ' : lang === 'th' ? 'แขวง / นครหลวง' : 'Province / City'}</label>
                  <select
                    value={customerProvince}
                    onChange={(e) => setCustomerProvince(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- {lang === 'lo' ? 'ເລືອກແຂວງ / ນະຄອນຫຼວງ' : lang === 'th' ? 'เลือกแขวง / นครหลวง' : 'Select Province'} --</option>
                    <option value="Vientiane Capital">{lang === 'lo' ? 'ນະຄອນຫຼວງວຽງຈັນ' : lang === 'th' ? 'นครหลวงเวียงจันทน์' : 'Vientiane Capital'}</option>
                    <option value="Luang Prabang">{lang === 'lo' ? 'ແຂວງ ຫຼວງພະບາງ' : lang === 'th' ? 'แขวงหลวงพระบาง' : 'Luang Prabang'}</option>
                    <option value="Champasak">{lang === 'lo' ? 'ແຂວງ ຈຳປາສັກ' : lang === 'th' ? 'แขวงจำปาสัก' : 'Champasak'}</option>
                    <option value="Savannakhet">{lang === 'lo' ? 'ແຂວງ ສະຫວັນນະເຂດ' : lang === 'th' ? 'แขวงสะหวันนะเขต' : 'Savannakhet'}</option>
                    <option value="Vientiane Province">{lang === 'lo' ? 'ແຂວງ ວຽງຈັນ' : lang === 'th' ? 'แขวงเวียงจันทน์' : 'Vientiane Province'}</option>
                    <option value="Other Provinces">{lang === 'lo' ? 'ແຂວງ ອື່ນໆ' : lang === 'th' ? 'แขวง / จังหวัดอื่นๆ' : 'Other'}</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 mb-1 font-medium">{t.buyerAddress}</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="e.g. Phonxay Village, Saysettha District"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Payment & Financial Terms */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-white font-bold text-sm">
                <CreditCard className="w-4 h-4 text-white" />
                <span>3. {t.paymentType}</span>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                    paymentMethod === 'transfer'
                      ? 'bg-white text-black font-bold shadow-lg border-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <QrCode className={`w-5 h-5 mb-1 ${paymentMethod === 'transfer' ? 'text-black' : 'text-zinc-400'}`} />
                  <span>{t.paymentTransfer}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-white text-black font-bold shadow-lg border-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Banknote className={`w-5 h-5 mb-1 ${paymentMethod === 'cash' ? 'text-black' : 'text-zinc-400'}`} />
                  <span>{t.paymentCash}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('finance')}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                    paymentMethod === 'finance'
                      ? 'bg-white text-black font-bold shadow-lg border-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Building2 className={`w-5 h-5 mb-1 ${paymentMethod === 'finance' ? 'text-black' : 'text-zinc-400'}`} />
                  <span>{t.paymentInstallments}</span>
                </button>
              </div>

              {/* Dealership Company QR Code Payment Details */}
              {paymentMethod === 'transfer' && (
                <div className="p-5 bg-zinc-900/80 rounded-3xl border border-zinc-800 space-y-4 text-xs">
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
                    <div className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>ຮູບ QR ບັນຊີທາງການຂອງບໍລິສັດ (ອັບໂຫລດ ແລະ ຄວບຄຸມໂດຍ Admin)</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                        User ທຳມະດາ: ສະແດງ QR ໃຫ້ລູກຄ້າສະແກນ
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                    {/* QR Code Graphic Card */}
                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-xl text-black space-y-2">
                      <div className="w-full text-center border-b border-zinc-200 pb-1.5">
                        <span className="text-[11px] font-black tracking-wider text-black block truncate">
                          {companyBankInfo.accountName}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-700 block truncate">
                          {companyBankInfo.bankName} LAO QR
                        </span>
                      </div>

                      {/* Display Custom Uploaded QR or Stylized Vector QR */}
                      <div className="relative p-2 bg-white rounded-xl border-2 border-black flex items-center justify-center min-h-[144px] w-full max-w-[170px] overflow-hidden">
                        {companyBankInfo.qrCodeUrl ? (
                          <img
                            src={companyBankInfo.qrCodeUrl}
                            alt="Official Company QR Code"
                            className="w-36 h-36 object-contain rounded-lg shadow-sm"
                          />
                        ) : (
                          <svg className="w-36 h-36" viewBox="0 0 140 140" fill="none">
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

                      <div className="w-full text-center pt-1 border-t border-zinc-200">
                        <span className="text-[10px] font-mono font-black text-black block">
                          ຍອດຊຳລະ: ${netPriceUSD.toLocaleString()} USD
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEnlargeQrOpen(true)}
                        className="w-full py-1.5 px-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Maximize2 className="w-3 h-3 text-white" />
                        <span>ຂະຫຍາຍເບິ່ງ QR ເຕັມຈໍ</span>
                      </button>
                    </div>

                    {/* Account Info & Slip Confirmation */}
                    <div className="sm:col-span-7 space-y-3.5">
                      <div className="p-3.5 bg-black/60 rounded-2xl border border-zinc-800 space-y-2 font-mono text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[10px] uppercase block">ຊື່ບັນຊີບໍລິສັດ (Account Name):</span>
                          {isSuperAdmin && (
                            <span className="text-[9px] text-zinc-300 font-sans font-semibold">Admin ຄວບຄຸມ</span>
                          )}
                        </div>
                        <strong className="text-white text-xs block truncate">{companyBankInfo.accountName}</strong>
                        <div className="pt-2 border-t border-zinc-800/80 space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">ເລກບັນຊີ USD:</span>
                            <span className="text-white font-bold">{companyBankInfo.usdAccount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">ເລກບັນຊີ LAK:</span>
                            <span className="text-zinc-300 font-bold">{companyBankInfo.lakAccount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">ຊ່ອງທາງ:</span>
                            <span className="text-zinc-300 truncate max-w-[180px]">ຊຳລະເງິນຜ່ານ QR</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500">Hotline:</span>
                            <span className="text-zinc-400">{companyBankInfo.hotline}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">ແນບຮູບສະລິບໂອນເງິນ (Upload Payment Slip)</label>
                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl border border-zinc-700 font-semibold text-xs flex items-center gap-1.5 transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>ເລືອກຮູບສະລິບຈາກອຸປະກອນ</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    setSlipImage(event.target?.result as string);
                                    triggerToast('ອັບໂຫຼດຮູບສະລິບໂອນສຳເລັດ!');
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>

                          {slipImage && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-zinc-200 font-mono flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> ແນບສະລິບແລ້ວ
                              </span>
                              <button
                                type="button"
                                onClick={() => setSlipImage(null)}
                                className="text-zinc-500 hover:text-white text-xs"
                              >
                                ລົບຮູບ
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Financing Details */}
              {paymentMethod === 'finance' && (
                <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">ສະຖາບັນການເງິນ / ໄຟແນນສ໌</label>
                      <select
                        value={financeCompany}
                        onChange={(e) => setFinanceCompany(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                      >
                        <option value="">-- ເລືອກສະຖາບັນການເງິນ / ໄຟແນນສ໌ --</option>
                        <option value="Lao-Viet Bank (LVB Auto Lease)">Lao-Viet Bank (LVB)</option>
                        <option value="BCEL Leasing">BCEL Leasing</option>
                        <option value="JDB Auto Finance">JDB Auto Finance</option>
                        <option value="GL Leasing Laos">GL Leasing Laos</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">ວາງເງິນດາວ (%)</label>
                      <select
                        value={downPaymentPercent}
                        onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                      >
                        <option value={20}>20% (${Math.round(netPriceUSD * 0.2).toLocaleString()})</option>
                        <option value={30}>30% (${Math.round(netPriceUSD * 0.3).toLocaleString()})</option>
                        <option value={40}>40% (${Math.round(netPriceUSD * 0.4).toLocaleString()})</option>
                        <option value={50}>50% (${Math.round(netPriceUSD * 0.5).toLocaleString()})</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">ໄລຍະເວລາຜ່ອນ (ເດືອນ)</label>
                      <select
                        value={tenureMonths}
                        onChange={(e) => setTenureMonths(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                      >
                        <option value={12}>12 ເດືອນ (1 ປີ)</option>
                        <option value={24}>24 ເດືອນ (2 ປີ)</option>
                        <option value={36}>36 ເດືອນ (3 ປີ)</option>
                        <option value={48}>48 ເດືອນ (4 ປີ)</option>
                        <option value={60}>60 ເດືອນ (5 ປີ)</option>
                      </select>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div>
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
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">ທີ່ປຶກສາການຂາຍ (Sales Rep)</label>
                  <input
                    type="text"
                    value={salesRep}
                    placeholder="ຊື່ທີ່ປຶກສາການຂາຍ..."
                    onChange={(e) => setSalesRep(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Free Gifts & Privileges Selection with Admin Management */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4">
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
                    <span className="text-[10px] text-zinc-500 font-mono">{t.firestoreLiveSync}</span>
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
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl">
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

              <div className="flex justify-between items-baseline text-white">
                <div>
                  <span className="text-sm font-bold block">{t.netPaymentTotal}:</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black font-mono text-white">
                    ${netPriceUSD.toLocaleString()} USD
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-white hover:bg-zinc-200 text-black font-extrabold text-sm rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01]"
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
                onClick={() => setIsEnlargeQrOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800"
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

      {/* INSTANT PRINTABLE BILL MODAL UPON SALE COMPLETION */}
      {createdBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-white space-y-5 max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base text-white">{t.saleCompletedSuccess}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t.printInvoiceBtn}</span>
                </button>
                <button
                  onClick={() => setCreatedBill(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bill Preview Card */}
            <div className="p-6 bg-black border border-zinc-800 rounded-2xl space-y-4 text-xs font-sans">
              <div className="flex justify-between items-start pb-4 border-b border-zinc-800">
                <div>
                  <span className="font-black tracking-widest text-base text-white">AVATR AUTO SERVICE</span>
                  <p className="text-[10px] text-zinc-400 font-mono">{t.printInvoiceBtn || 'OFFICIAL SALES INVOICE'}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-white font-bold block">{createdBill.billNumber}</span>
                  <span className="text-zinc-500 text-[10px]">{createdBill.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-zinc-300">
                <div>
                  <span className="text-zinc-500 font-mono text-[10px] uppercase block">{t.buyerInfo}:</span>
                  <strong className="text-white text-sm block">{createdBill.customerName}</strong>
                  <span className="font-mono text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    <span>{createdBill.customerPhone}</span>
                  </span>
                  <span className="text-zinc-400 block">{createdBill.customerAddress}, {createdBill.customerProvince}</span>
                </div>

                <div className="text-right">
                  <span className="text-zinc-500 font-mono text-[10px] uppercase block">{t.tableModel}:</span>
                  <strong className="text-white text-sm block">{createdBill.model}</strong>
                  <span className="text-zinc-400 font-mono block">VIN: {createdBill.vin}</span>
                  <span className="text-zinc-400 block">{createdBill.color} • {createdBill.plateNumber}</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 flex justify-between items-center font-mono">
                <span>{t.netPaymentTotal}:</span>
                <span className="text-xl font-black text-white">${createdBill.netTotalUSD.toLocaleString()}</span>
              </div>

              <div className="text-[11px] text-zinc-400">
                {t.paymentType}: <strong className="text-white uppercase">{createdBill.paymentMethod}</strong> • {t.salesRepresentative}: {createdBill.recordedBy}
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
    </div>
  );
}
