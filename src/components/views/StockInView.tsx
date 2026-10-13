import { useState } from 'react';
import { InventoryItem, VehicleModel, Language, StockStatus, PDIStatus, InvoiceBillRecord, StockLogRecord } from '../../types';
import { translations } from '../../data/translations';
import { newRecordId } from '../../backend/ids';
import { 
  saveBillToSupabase, 
  saveVehicleModelToSupabase,
  deleteVehicleModelFromSupabase
} from '../../supabase';
import AvatrLogo from '../layout/AvatrLogo';
import { ConfirmDeleteModal } from '../modals';
import { 
  PackagePlus, 
  Truck, 
  Car, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  FileText, 
  DollarSign, 
  Calendar, 
  User, 
  Printer, 
  ArrowRight,
  Sparkles,
  X,
  Upload,
  Image as ImageIcon,
  Clock,
  Gift,
  BadgePercent,
  Flame,
  Plus,
  Lock,
  Trash2
} from 'lucide-react';

interface StockInViewProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  bills: InvoiceBillRecord[];
  setBills: React.Dispatch<React.SetStateAction<InvoiceBillRecord[]>>;
  stockLogs: StockLogRecord[];
  setStockLogs: React.Dispatch<React.SetStateAction<StockLogRecord[]>>;
  vehicles: VehicleModel[];
  setVehicles?: React.Dispatch<React.SetStateAction<VehicleModel[]>>;
  isSuperAdmin?: boolean;
  lang: Language;
  onNavigateToStock: () => void;
  onNavigateToBills: () => void;
}

export default function StockInView({
  inventory,
  setInventory,
  bills,
  setBills,
  stockLogs,
  setStockLogs,
  vehicles,
  setVehicles,
  isSuperAdmin = false,
  lang,
  onNavigateToStock,
  onNavigateToBills,
}: StockInViewProps) {
  const t = translations[lang] || translations.lo;
  
  // Form State - Empty by default
  const [model, setModel] = useState<string>('AVATR 12');
  const [vin, setVin] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [color, setColor] = useState('');
  const [interiorColor, setInteriorColor] = useState('');
  const [trim, setTrim] = useState('');
  const [battery, setBattery] = useState('');
  const [quantity] = useState<number>(1);
  const [priceValue, setPriceValue] = useState<number | ''>('');
  const [status, setStatus] = useState<StockStatus>('ready');
  const [customImage, setCustomImage] = useState<string>('');
  const [eventCampaign, setEventCampaign] = useState<string>('');
  // Schedule and Campaign fields for Event & Promotion
  const [eventStartDate, setEventStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [eventEndDate, setEventEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [eventLocation, setEventLocation] = useState<string>('');
  const [promotionDiscountUSD, setPromotionDiscountUSD] = useState<number>(0);
  const [promotionNotes, setPromotionNotes] = useState<string>('');

  // Quick preset days for event & promotion timeframe
  const handleSetQuickPresetDays = (days: number) => {
    const start = new Date(eventStartDate || new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    setEventEndDate(end.toISOString().slice(0, 10));
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomImage(event.target?.result as string);
        triggerToast('ອັບໂຫຼດຮູບລົດຈາກອຸປະກອນສຳເລັດ!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Customs & Logistics - Empty by default
  const [supplierName, setSupplierName] = useState('');
  const [importDate, setImportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customsDocNumber, setCustomsDocNumber] = useState('');
  const [importEntryPort, setImportEntryPort] = useState('');
  const [destinationWarehouse, setDestinationWarehouse] = useState('');
  
  // PDI Inspection - Empty by default
  const [pdiStatus, setPdiStatus] = useState<PDIStatus>('passed');
  const [pdiInspector, setPdiInspector] = useState('');
  const [pdiNotes, setPdiNotes] = useState('');

  const [recordedBy, setRecordedBy] = useState('');
  const [notes, setNotes] = useState('');

  // Created Bill for instant preview modal
  const [createdBill, setCreatedBill] = useState<InvoiceBillRecord | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Model selection without forcing auto-filled text onto blank form
  const handleModelChange = (selectedModel: string) => {
    setModel(selectedModel);
  };

  // Generate a random standard VIN
  const generateRandomVin = () => {
    const chars = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
    let randomSuffix = '';
    for (let i = 0; i < 6; i++) {
      randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const prefix = model.includes('12') ? 'LVV9C12E' : model.includes('11') ? 'LVV9C11E' : model.includes('07') ? 'LVV9C07E' : 'LVV9C88E';
    setVin(`${prefix}7RA${randomSuffix}`);
  };

  // Super Admin: Add New Vehicle Model State & Handlers
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelCategory, setNewModelCategory] = useState('Luxury SUV Coupé');
  const [newModelTagline, setNewModelTagline] = useState('');
  const [newModelPriceUSD, setNewModelPriceUSD] = useState<number>(45000);
  const [newModelBattery, setNewModelBattery] = useState('94.5 kWh CATL (700 km)');
  const [newModelPowertrain, setNewModelPowertrain] = useState('Dual-Motor AWD (578 hp)');
  const [newModelImage, setNewModelImage] = useState('');

  const handleAddNewVehicleModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      triggerToast('ສະເພາະ Admin ຈຶ່ງສາມາດເພີ່ມຕົວເລືອກລຸ້ນຍານຍົນໄດ້!');
      return;
    }
    if (!newModelName.trim()) {
      triggerToast('ກະລຸນາປ້ອນຊື່ລຸ້ນຍານຍົນ!');
      return;
    }
    const cleanName = newModelName.trim();
    if (vehicles.some(v => v.name.toLowerCase() === cleanName.toLowerCase())) {
      triggerToast('ລຸ້ນຍານຍົນນີ້ມີຢູ່ໃນລະບົບແລ້ວ!');
      return;
    }

    const modelId = `avatr-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    const newVehicle: VehicleModel = {
      id: modelId,
      name: cleanName,
      subTitle: newModelCategory || 'Next-Gen Intelligent EV',
      tagline: newModelTagline.trim() || 'ຍົນລະກຳອັດສະລິຍະພຣີມຽມ',
      category: newModelCategory,
      priceStartingUSD: Number(newModelPriceUSD) || 45000,
      priceStartingLAK: (Number(newModelPriceUSD) || 45000) * 22000,
      acceleration: '3.98s (0-100 km/h)',
      rangeCLTC: '700 km',
      batteryCapacity: newModelBattery || '94.5 kWh',
      batterySupplier: 'CATL High-Energy Density Battery',
      chargingSpeed: '800V Ultra-Fast Charging (10-80% in 15min)',
      smartDriving: 'Huawei Qiankun ADS 3.0',
      powertrain: newModelPowertrain || 'Dual-Motor AWD (578 ps)',
      colors: [
        { name: 'Onyx Black', hex: '#09090b', previewClass: 'bg-black border border-zinc-700' },
        { name: 'Pure White', hex: '#ffffff', previewClass: 'bg-white border border-zinc-400' },
        { name: 'Liquid Titanium', hex: '#71717a', previewClass: 'bg-zinc-600 border border-zinc-500' },
      ],
      description: `AVATR ${cleanName} ລຸ້ນຍານຍົນໃໝ່ເພີ່ມໂດຍ Admin.`,
      features: [
        'Huawei Qiankun ADS 3.0 Autonomous Driving',
        'HarmonyOS Intelligent Luxury Cockpit',
        'CATL Shenxing Ultra-Fast Charging Battery',
      ],
      stockCount: 0,
      heroImage: newModelImage.trim() || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
      ],
      isCustom: true,
    };

    try {
      await saveVehicleModelToSupabase(newVehicle);
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : 'Vehicle model could not be saved.');
      return;
    }
    if (setVehicles) {
      setVehicles(prev => {
        const filtered = prev.filter(v => v.id !== newVehicle.id && v.name.toLowerCase() !== cleanName.toLowerCase());
        return [...filtered, newVehicle];
      });
    }
    setModel(cleanName);
    setIsAddModelOpen(false);
    triggerToast(`Admin ໄດ້ເພີ່ມຕົວເລືອກລຸ້ນ ${cleanName} ເຂົ້າສູ່ລະບົບສຳເລັດແລ້ວ!`);
    setNewModelName('');
    setNewModelTagline('');
    setNewModelImage('');
  };

  // Delete vehicle model state for modern confirmation modal
  const [modelToDelete, setModelToDelete] = useState<VehicleModel | null>(null);
  const [isDeletingModel, setIsDeletingModel] = useState(false);

  const handleRequestDeleteModel = (e: React.MouseEvent, v: VehicleModel) => {
    e.stopPropagation();
    if (!isSuperAdmin) {
      triggerToast('ສະເພາະ Admin ຈຶ່ງສາມາດລົບລຸ້ນຍານຍົນໄດ້!');
      return;
    }
    if (vehicles.length <= 1) {
      triggerToast('ບໍ່ສາມາດລົບໄດ້ ເພາະຕ້ອງມີຢ່າງໜ້ອຍ 1 ລຸ້ນໃນລະບົບ!');
      return;
    }
    setModelToDelete(v);
  };

  const handleConfirmDeleteModel = async () => {
    if (!modelToDelete) return;
    setIsDeletingModel(true);

    const target = modelToDelete;
    const modelId = target.id || `avatr-${target.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    try {
      await deleteVehicleModelFromSupabase(modelId);
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Vehicle model could not be deleted.');
      setIsDeletingModel(false);
      return;
    }
    if (setVehicles) {
      setVehicles(prev => prev.filter(v => (v.id || v.name) !== (target.id || target.name)));
    }

    if (model === target.name) {
      const remaining = vehicles.filter(v => (v.id || v.name) !== (target.id || target.name));
      if (remaining.length > 0) {
        setModel(remaining[0].name);
      }
    }

    setIsDeletingModel(false);
    setModelToDelete(null);
    triggerToast(`ລົບລຸ້ນ "${target.name}" ອອກຈາກລະບົບສຳເລັດແລ້ວ!`);
  };

  // SUBMIT IMPORT & GENERATE INBOUND BILL
  const handleSubmitStockIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vin.trim()) {
      triggerToast('ກະລຸນາປ້ອນເລກຖັງ (VIN) ກ່ອນ!');
      return;
    }

    if (!supplierName.trim()) {
      triggerToast('ກະລຸນາປ້ອນ ແຫຼ່ງທີ່ມາ / ຊື່ຜູ້ສະໜອງ (Supplier)!');
      return;
    }

    // High quality official fallback images per model
    const matchedVehicle = vehicles.find(v => v.name === model || v.id === model);
    const heroFallback = matchedVehicle?.heroImage || (model === 'AVATR 12'
      ? 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80'
      : model === 'AVATR 11'
      ? 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80'
      : 'https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=800&q=80');

    const finalImage = customImage || heroFallback;
    const cleanVin = vin.toUpperCase().trim();
    const qty = 1;
    if (inventory.some(item => item.vin.toUpperCase() === vin.trim().toUpperCase())) {
      triggerToast('VIN ນີ້ມີໃນສາງແລ້ວ');
      return;
    }

    // Validate Event / Promotion Timeframe
    if (status === 'event' || status === 'promotion') {
      if (!eventStartDate || !eventEndDate) {
        triggerToast('ກະລຸນາກຳນົດວັນທີເລີ່ມຕົ້ນ ແລະ ວັນທີສິ້ນສຸດ ສຳລັບສິນຄ້າ Event / ໂປຣໂມຊັນ!');
        return;
      }
      if (eventEndDate < eventStartDate) {
        triggerToast('ວັນທີສິ້ນສຸດ ຕ້ອງເທົ່າກັບ ຫຼື ຫຼັງຈາກວັນທີເລີ່ມຕົ້ນ!');
        return;
      }
    }

    const rawVal = Number(priceValue) || (model === 'AVATR 12' ? 45000 : model === 'AVATR 11' ? 42000 : 38000);
    const finalPriceUSD = rawVal;
    const finalPriceLAK = Math.round(finalPriceUSD * 22000);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const importDateTime = importDate ? `${importDate} ${new Date().toTimeString().slice(0, 8)}` : now;
    const grnNumber = `GRN-AVATR-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const finalColor = color.trim() ? color.trim() : (lang === 'lo' ? 'ມາດຕະຖານ' : lang === 'th' ? 'มาตรฐาน' : 'Standard');

    const newItem: InventoryItem = {
      vin: cleanVin,
      engineNumber: engineNumber.trim() || undefined,
      model,
      trim,
      plateNumber: plateNumber.trim() ? plateNumber.trim() : undefined,
      color: finalColor,
      interiorColor,
      battery,
      priceUSD: finalPriceUSD,
      priceLAK: finalPriceLAK,
      status,
      stockQuantity: qty,
      pdiStatus,
      destinationWarehouse,
      arrivalDate: importDateTime,
      importDocNumber: customsDocNumber || undefined,
      image: finalImage,
      imageUrl: finalImage,
      notes: notes || 'ຮັບເຂົ້າສາງທາງການ ຜ່ານດ່ານສາກົນບໍ່ເຕັນ ກວດສອບສະພາບ 100%',
      pdiInspector,
      eventCampaign: (status === 'event' || status === 'promotion') ? eventCampaign : undefined,
      eventStartDate: (status === 'event' || status === 'promotion') ? eventStartDate : undefined,
      eventEndDate: (status === 'event' || status === 'promotion') ? eventEndDate : undefined,
      eventLocation: (status === 'event' || status === 'promotion') ? eventLocation : undefined,
    };

    // Create official inbound bill (goods receipt note).
    const newBill: InvoiceBillRecord = {
      id: newRecordId(),
      billType: 'import',
      billNumber: grnNumber,
      date: importDateTime,
      vin: cleanVin,
      engineNumber: engineNumber.trim() || undefined,
      model,
      trim,
      plateNumber: newItem.plateNumber,
      color: finalColor,
      interiorColor,
      battery,
      quantity: qty,
      unitPriceUSD: finalPriceUSD,
      unitPriceLAK: finalPriceLAK,
      discountUSD: 0,
      discountLAK: 0,
      netTotalUSD: finalPriceUSD * qty,
      netTotalLAK: finalPriceLAK * qty,
      amountUSD: finalPriceUSD * qty,
      amountLAK: finalPriceLAK * qty,
      supplierName,
      customsDocNumber,
      importEntryPort,
      destinationWarehouse,
      inspectorName: pdiInspector,
      pdiStatusInitial: pdiStatus,
      statusInitial: status,
      eventCampaign: (status === 'event' || status === 'promotion') ? eventCampaign : undefined,
      eventStartDate: (status === 'event' || status === 'promotion') ? eventStartDate : undefined,
      eventEndDate: (status === 'event' || status === 'promotion') ? eventEndDate : undefined,
      eventLocation: (status === 'event' || status === 'promotion') ? eventLocation : undefined,
      recordedBy,
      notes: notes || 'ຮັບເຂົ້າສາງທາງການ ຜ່ານດ່ານສາກົນບໍ່ເຕັນ ກວດສອບສະພາບ 100%',
    };

    try {
      await saveBillToSupabase(newBill, newItem);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Stock-in could not be saved.');
      return;
    }
    setInventory(prev => [newItem, ...prev]);
    setBills(prev => [newBill, ...prev]);

    // 3. RECORD TRANSACTION LOG
    const newStockLog: StockLogRecord = {
      id: `LOG-IN-${Date.now().toString().slice(-6)}`,
      type: 'stock_in',
      vin: cleanVin,
      model,
      plateNumber: newItem.plateNumber,
      color: finalColor,
      quantity: qty,
      priceUSD: finalPriceUSD,
      priceLAK: finalPriceLAK,
      timestamp: importDateTime,
      recordedBy,
      notes: `ນຳເຂົ້າລົດໃໝ່ ${qty} ຄັນ ໃບຮັບເລກທີ ${grnNumber} (ສາງ: ${destinationWarehouse})`,
      remainingStock: qty,
    };

    setStockLogs(prev => [newStockLog, ...prev]);

    // Open Instant Bill View & Dual-System Success Notification
    setCreatedBill(newBill);
    triggerToast(
      lang === 'lo'
        ? `ບັນທຶກສຳເລັດ 2 ລະບົບໃນຄລິກດຽວ: 1. ເພີ່ມເຂົ້າສະຕ໋ອກລົດ (${qty} ຄັນ) + 2. ອອກໃບຮັບໃນໜ້າບິນ & ໃບຮັບ (${grnNumber})`
        : lang === 'th'
        ? `บันทึกสำเร็จ 2 ระบบในคลิกเดียว: 1. เพิ่มเข้าสต็อกรถ (${qty} คัน) + 2. ออกใบรับในหน้าบิล & ใบรับ (${grnNumber})`
        : `1-Click Dual Save: Added ${qty} units to Inventory Stock + Issued Inbound Bill (${grnNumber})`
    );

    // Reset Form for next entry
    setVin('');
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-zinc-900 border border-zinc-700 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="theme-adaptive-dark-surface relative overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-br from-zinc-900 via-zinc-950 to-black p-5 shadow-xl sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/4 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-xl bg-white p-2 text-black shadow-sm">
                <PackagePlus className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-300">
                VEHICLE IMPORT & STOCK-IN
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {t.stockInHeader || t.stockInTitle}
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-zinc-400 sm:text-sm">
              {t.stockInHeaderSub || t.stockInSubtitle}
            </p>
          </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:w-auto">
          <button
            type="button"
            onClick={onNavigateToStock}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:border-zinc-500 hover:bg-zinc-800"
          >
            <Car className="w-4 h-4 text-zinc-400" />
            <span>{t.tabStockList} ({inventory.length} {t.unitCars})</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToBills}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:border-zinc-500 hover:bg-zinc-800"
          >
            <FileText className="w-4 h-4 text-zinc-400" />
            <span>{t.filterImportBills} ({bills.filter(b => b.billType === 'import').length})</span>
          </button>
        </div>
        </div>
      </div>

      {/* MAIN IMPORT FORM */}
      <form onSubmit={handleSubmitStockIn} className="space-y-5 sm:space-y-6">
        {/* Step 1: Vehicle Model & Identifiers */}
        <div className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 text-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-900 text-zinc-100 ring-1 ring-zinc-700">
              <Car className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                STEP 01
              </p>
              <h2 className="text-sm font-bold">{t.basicInfoSection}</h2>
            </div>
          </div>

          {/* Model Selection Tabs */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <label className="text-zinc-400 font-medium text-xs flex items-center gap-2">
                <span>ເລືອກລຸ້ນຍານຍົນ AVATR <span className="text-red-500">*</span></span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {vehicles.length} ລຸ້ນໃນລະບົບ
                </span>
              </label>

              {/* Admin ສາມາດເພີ່ມຕົວເລືອກລຸ້ນຍານຍົນຂຶ້ນມາໄດ້ */}
              {isSuperAdmin ? (
                <button
                  type="button"
                  onClick={() => setIsAddModelOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-md transition-all cursor-pointer border border-zinc-300"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>+ ເພີ່ມຕົວເລືອກລຸ້ນຍານຍົນ (Admin)</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px] font-mono">
                  <Lock className="w-3 h-3 text-zinc-500" />
                  <span>ລຸ້ນຍານຍົນມາດຕະຖານ</span>
                </span>
              )}
            </div>

            <div role="radiogroup" aria-label={lang === 'lo' ? 'ເລືອກລຸ້ນລົດ' : lang === 'th' ? 'เลือกรุ่นรถ' : 'Select vehicle model'} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((v) => {
                const isSelected = model === v.name;
                const isCustom = !['AVATR 12', 'AVATR 11', 'AVATR 07'].includes(v.name);
                const modelStock = inventory.filter(i => i.model === v.name).reduce((acc, curr) => acc + (curr.stockQuantity || 0), 0);
                return (
                  <div
                    key={v.id || v.name}
                    className={`relative rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-zinc-900 border-slate-950 dark:border-white text-white shadow-xl ring-2 ring-slate-950/40 dark:ring-white/50'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleModelChange(v.name)}
                      className="w-full rounded-[inherit] p-4 pr-12 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="block text-sm font-bold text-white">{v.name}</strong>
                        {isCustom && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                            Admin Custom
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 block truncate font-sans text-[11px] text-zinc-400">
                        {v.subTitle || v.category} {v.rangeCLTC ? `(${v.rangeCLTC})` : ''}
                      </span>
                      <span className="mt-2 flex items-center justify-between gap-2 border-t border-zinc-800/80 pt-1.5 font-mono text-[10px]">
                        <span className="font-semibold text-zinc-200">
                          ເລີ່ມຕົ້ນ ${v.priceStartingUSD?.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-bold text-zinc-300">
                          <Car className="h-3 w-3 text-zinc-400" />
                          <span>{t.tableStock}: {modelStock} {t.unitCars}</span>
                        </span>
                      </span>
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        title={lang === 'lo' ? `ລົບລຸ້ນ ${v.name}` : 'Delete Model'}
                        aria-label={lang === 'lo' ? `ລົບລຸ້ນ ${v.name}` : `Delete model ${v.name}`}
                        onClick={(e) => handleRequestDeleteModel(e, v)}
                        className="absolute right-2 top-2 rounded-lg border border-red-500/20 bg-red-500/10 p-1 text-red-400 opacity-80 transition-all hover:bg-red-500/20 hover:text-red-300 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {/* Stock Image: Choose or Upload from Device */}
            <div className="sm:col-span-2 lg:col-span-3 p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-zinc-300 font-semibold text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-white" />
                  <span>{t.uploadCarImage}</span>
                </label>
                {customImage && (
                  <button
                    type="button"
                    onClick={() => setCustomImage('')}
                    className="text-[10px] text-zinc-400 hover:text-white hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> {lang === 'lo' ? 'ລ້າງຮູບທີ່ອັບໂຫຼດ' : lang === 'th' ? 'ลบรูปภาพที่อัปโหลด' : 'Clear Uploaded Image'}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800">
                  <img
                    src={customImage || (model === 'AVATR 12' ? 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80' : model === 'AVATR 11' ? 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80' : 'https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=800&q=80')}
                    alt="Stock preview"
                    className="w-full h-full object-cover"
                  />
                  {customImage && (
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-white text-black text-[8px] font-bold rounded">
                      Device File
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl border border-zinc-700 font-semibold text-xs transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <span>{t.uploadCarImage}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    JPG, PNG, WEBP (HD Cloud Storage Ready)
                  </p>
                </div>
              </div>
            </div>

            {/* VIN - Manual Entry Only */}
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{t.vinNumber} <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="e.g. LVV9C12E7RA008812"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-white"
              />
            </div>

            {/* Engine / Motor Number */}
            <div>
              <label className="mb-1 block font-medium text-zinc-400">
                {lang === 'lo' ? 'ເລກຈັກ (Engine / Motor Number)' : lang === 'th' ? 'เลขเครื่องยนต์ / มอเตอร์ (Engine No.)' : 'Engine / Motor No.'}
                {' '}<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={engineNumber}
                onChange={(e) => setEngineNumber(e.target.value)}
                placeholder="e.g. TZ210XYA-098821"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-white"
              />
            </div>

            {/* Plate Number */}
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{t.plateNumber}</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="e.g. ກມ ປ້າຍແດງ, ລໍຖ້າປ້າຍ..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>

            {/* Color (Free text input - ບໍ່ບັງຄັບ / Optional) */}
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">
                {t.bodyColor}
                <span className="text-[11px] text-zinc-500 font-normal ml-1.5">
                  ({lang === 'lo' ? 'ບໍ່ບັງຄັບ' : lang === 'th' ? 'ไม่บังคับ' : 'Optional'})
                </span>
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder={lang === 'lo' ? 'e.g. ສີດຳ (Black), ສີຂາວ (White)... (ບໍ່ບັງຄັບ)' : lang === 'th' ? 'e.g. สีดำ (Black), สีขาว (White)... (ไม่บังคับ)' : 'e.g. Obsidian Black, Ceramic White... (Optional)'}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>

            {/* Interior */}
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{t.trimSpec}</label>
              <input
                type="text"
                value={interiorColor}
                onChange={(e) => setInteriorColor(e.target.value)}
                placeholder="e.g. Luxury Nappa Leather"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            {/* Powertrain / Trim */}
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{lang === 'lo' ? 'ລະບົບຂັບເຄື່ອນ (Trim / Motor)' : lang === 'th' ? 'ระบบขับเคลื่อน (Trim / Motor)' : 'Powertrain / Motor'}</label>
              <input
                type="text"
                value={trim}
                onChange={(e) => setTrim(e.target.value)}
                placeholder="e.g. Dual-Motor AWD Performance (578 hp)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            {/* Battery Spec */}
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{lang === 'lo' ? 'ສະເປັກແບັດເຕີຣີ CATL' : lang === 'th' ? 'สเปกแบตเตอรี่ CATL' : 'CATL Battery Spec'}</label>
              <input
                type="text"
                value={battery}
                onChange={(e) => setBattery(e.target.value)}
                placeholder="e.g. 94.5 kWh CATL Ternary Lithium (700 km)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
              />
            </div>

            {/* Event & Campaign Category */}
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{lang === 'lo' ? 'ໝວດສິນຄ້າ / Event Campaign' : lang === 'th' ? 'หมวดหมู่สินค้า / Event Campaign' : 'Vehicle Category / Campaign'}</label>
              <select
                value={eventCampaign}
                onChange={(e) => setEventCampaign(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
              >
                <option value="Standard Showroom">{lang === 'lo' ? 'ໂຊຣູມທົ່ວໄປ (Standard Showroom)' : lang === 'th' ? 'โชว์รูมทั่วไป (Standard Showroom)' : 'Standard Showroom'}</option>
                <option value="Motor Show 2026">{lang === 'lo' ? 'ງານ Motor Show 2026' : lang === 'th' ? 'งาน Motor Show 2026' : 'Motor Show 2026'}</option>
                <option value="ITECC EV Expo">{lang === 'lo' ? 'ງານ ITECC EV Expo' : lang === 'th' ? 'งาน ITECC EV Expo' : 'ITECC EV Expo'}</option>
                <option value="Special Promotion">{lang === 'lo' ? 'ໂປຣໂມຊັ່ນ Event ພິເສດ' : lang === 'th' ? 'โปรโมชั่น Event พิเศษ' : 'Special Promotion'}</option>
                <option value="VIP Test Drive Event">{lang === 'lo' ? 'ລົດທົດລອງຂັບ VIP Event' : lang === 'th' ? 'รถทดลองขับ VIP Event' : 'VIP Test Drive'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Logistics, Customs & Warehouse */}
        <div className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 text-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-900 text-zinc-100 ring-1 ring-zinc-700">
              <Truck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                STEP 02
              </p>
              <h2 className="text-sm font-bold">{t.customsSection}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{t.supplierName} <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. AVATR Technology Co., Ltd."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="mb-1 flex w-full items-center gap-1.5 font-medium text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-white" />
                <span>{lang === 'lo' ? 'ວັນທີນຳເຂົ້າສາງ (ວັນ/ເດືອນ/ປີ)' : lang === 'th' ? 'วันที่นำเข้าสต็อก (วัน/เดือน/ปี)' : 'Stock In Date'} <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                required
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{t.customsDocNo}</label>
              <input
                type="text"
                value={customsDocNumber}
                onChange={(e) => setCustomsDocNumber(e.target.value)}
                placeholder="e.g. B01-LAO-2026-90823"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{t.entryPort}</label>
              <input
                type="text"
                value={importEntryPort}
                onChange={(e) => setImportEntryPort(e.target.value)}
                placeholder="e.g. ດ່ານສາກົນບໍ່ເຕັນ (ລາວ-ຈີນ), ດ່ານຂົວມິດຕະພາບ 1..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{t.warehouseDest}</label>
              <input
                type="text"
                value={destinationWarehouse}
                onChange={(e) => setDestinationWarehouse(e.target.value)}
                placeholder="e.g. ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ, ສາງດົງໂດກ..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-400">
                {lang === 'lo' ? 'ສະຖານະສິນຄ້າເບື້ອງຕົ້ນ' : lang === 'th' ? 'สถานะสินค้าเริ่มต้น' : 'Initial Stock Status'} <span className="text-red-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
              >
                <option value="ready">{t.stage3Ready}</option>
                <option value="pdi">{t.stage2PDI}</option>
                <option value="imported">{t.stage1Imported}</option>
                <option value="event">{t.stage5Event}</option>
                <option value="promotion">{t.stage6Promo}</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{lang === 'lo' ? 'ຜູ້ບັນທຶກການນຳເຂົ້າ' : lang === 'th' ? 'ผู้บันทึกการนำเข้า' : 'Recorded By'}</label>
              <input
                type="text"
                value={recordedBy}
                placeholder={lang === 'lo' ? 'ຊື່ຜູ້ບັນທຶກ...' : 'Operator Name...'}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Schedule & Campaign Details (ສະເພາະສິນຄ້າປະເພດ Event & ໂປຣໂມຊັນ) */}
        {(status === 'event' || status === 'promotion') && (
          <div className="bg-zinc-900/60 border border-zinc-700 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl transition-all">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-white text-black rounded-xl">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                    <span>ຂໍ້ມູນກຳນົດເວລາ {status === 'event' ? 'ງານ Event' : 'ແຄມເປນໂປຣໂມຊັນ'} (Schedule & Campaign Details)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-black font-bold uppercase">
                      ບັງຄັບປ້ອນກຳນົດເວລາ
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    ກຳນົດວັນທີເລີ່ມຕົ້ນ, ວັນທີສິ້ນສຸດ ແລະ ລາຍລະອຽດງານເພື່ອຕິດຕາມໄລຍະເວລາຈັດສະແດງ
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Campaign Title */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block font-bold text-zinc-300">
                  ຊື່ງານ Event / ຊື່ໂປຣໂມຊັນ (Campaign Title) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventCampaign}
                  onChange={(e) => setEventCampaign(e.target.value)}
                  placeholder={status === 'event' ? 'e.g. ງານ Vientiane Motor Expo 2026' : 'e.g. ໂປຣໂມຊັນເປີດຕົວລົດໄຟຟ້າ Flagship'}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-white"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="mb-1.5 flex w-full items-center gap-1 font-bold text-zinc-300">
                  <Calendar className="w-3.5 h-3.5 text-zinc-300" />
                  <span>ວັນທີເລີ່ມຕົ້ນ (Start Date) <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="date"
                  required
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="mb-1.5 flex w-full items-center justify-between font-bold text-zinc-300">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-300" />
                    <span>ວັນທີສິ້ນສຸດ (End Date) <span className="text-red-500">*</span></span>
                  </span>
                  <div className="flex items-center gap-1">
                    {[7, 14, 30, 60].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => handleSetQuickPresetDays(days)}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-white hover:text-black text-zinc-300 transition-colors"
                      >
                        +{days}ວັນ
                      </button>
                    ))}
                  </div>
                </label>
                <input
                  type="date"
                  required
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Event Location */}
              <div>
                <label className="mb-1 flex w-full items-center gap-1 font-medium text-zinc-300">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ສະຖານທີ່ຈັດງານ / ພື້ນທີ່ໂຊຣູມ</span>
                </label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g. ສູນການຄ້າ ITECC Mall ບູດ A-04 ຫຼື ໂຊຣູມຫຼັກ 3"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-white"
                />
              </div>

              {/* Special Discount or Benefit */}
              <div>
                <label className="mb-1 flex w-full items-center gap-1 font-medium text-zinc-300">
                  <BadgePercent className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ມູນຄ່າສ່ວນຫຼຸດພິເສດ ($ USD)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={promotionDiscountUSD || ''}
                  onChange={(e) => setPromotionDiscountUSD(Number(e.target.value) || 0)}
                  placeholder="e.g. 2500"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>
            </div>

            {/* Campaign Notes & Conditions */}
            <div className="text-xs">
              <label className="mb-1 flex w-full items-center gap-1 font-medium text-zinc-300">
                <Gift className="w-3.5 h-3.5 text-zinc-400" />
                <span>ເງື່ອນໄຂໂປຣໂມຊັນ & ຂອງແຖມພິເສດໃນຊ່ວງເວລານີ້</span>
              </label>
              <input
                type="text"
                value={promotionNotes}
                onChange={(e) => setPromotionNotes(e.target.value)}
                placeholder="e.g. ດອກເບ້ຍ 0% ນານ 12 ເດືອນ + ຟຣີ Wallbox Charger 22kW + ປະກັນໄພຊັ້ນ 1 VIP"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>
        )}

        {/* Step 3: Valuation, Quantity & PDI */}
        <div className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 text-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-900 text-zinc-100 ring-1 ring-zinc-700">
              <DollarSign className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                STEP 03
              </p>
              <h2 className="text-sm font-bold">{t.pdiSection}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-400 font-medium">{t.importCostUSD} ($ USD) <span className="text-red-500">*</span></label>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 font-mono text-xs font-bold">
                  $
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="45,000"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-400 font-medium">{t.quantityUnits} <span className="text-red-500">*</span></label>
                <span className="text-[10px] text-zinc-400 font-mono">1 VIN = 1 vehicle</span>
              </div>
              <input
                type="number"
                min="1"
                value={quantity}
                readOnly
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{t.pdiStatusLabel}</label>
              <select
                value={pdiStatus}
                onChange={(e) => setPdiStatus(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
              >
                <option value="passed">{t.pdiPassedLabel}</option>
                <option value="in_progress">{lang === 'lo' ? 'ກຳລັງກວດລະບົບ (In Progress)' : lang === 'th' ? 'กำลังตรวจระบบ (In Progress)' : 'In Progress'}</option>
                <option value="pending">{t.pdiPendingLabel}</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">{t.pdiInspectorLabel}</label>
              <input
                type="text"
                value={pdiInspector}
                placeholder={lang === 'lo' ? 'ຊື່ຊ່າງກວດສອບ...' : 'Inspector Name...'}
                onChange={(e) => setPdiInspector(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-zinc-400 mb-1 font-medium">{t.pdiNotesLabel || t.notesGeneral}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="CATL Battery 100%, LiDAR, OTA Tested..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
            />
          </div>
        </div>

        {/* Submit Action Card */}
        {(() => {
          const qty = Number(quantity) || 0;
          const enteredUnitVal = Number(priceValue) || 0;
          const totalInUSD = enteredUnitVal * qty;

          return (
            <div className="theme-adaptive-dark-surface flex flex-col items-stretch justify-between gap-4 rounded-3xl border border-zinc-800 bg-linear-to-br from-zinc-950 to-zinc-900 p-5 shadow-lg sm:flex-row sm:items-center sm:p-6">
              <div className="space-y-1">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{lang === 'lo' ? 'ມູນຄ່ານຳເຂົ້າລວມ (Total Inbound Valuation):' : lang === 'th' ? 'มูลค่าการนำเข้ารวม (Total Inbound Valuation):' : 'Total Inbound Valuation:'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    USD ($)
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  ${totalInUSD.toLocaleString()} USD <span className="text-xs text-zinc-400 font-sans">({qty} {t.unitCars})</span>
                </div>
                <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-zinc-300" />
                  <span>
                    {lang === 'lo' 
                      ? 'ກົດປຸ່ມດຽວ ບັນທຶກພ້ອມກັນທັງ ສະຕ໋ອກລົດ (Inventory) ແລະ ໃບບິນ/ໃບຮັບ (Bills & Invoices)' 
                      : lang === 'th'
                      ? 'คลิกปุ่มเดียว บันทึกพร้อมกันทั้ง สต็อกรถ (Inventory) และ ใบบิล/ใบรับ (Bills & Invoices)'
                      : '1-Click Dual Save: Records to Inventory Stock & Bills/Invoices simultaneously'}
                  </span>
                </p>
              </div>

              <button
                type="submit"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-black shadow-xl transition-all hover:scale-[1.01] hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:w-auto sm:px-8"
              >
                <PackagePlus className="w-5 h-5" />
                <span>
                  {lang === 'lo' 
                    ? 'ບັນທຶກສະຕ໋ອກ & ອອກໃບຮັບ (Dual Save)' 
                    : lang === 'th' 
                    ? 'บันทึกสต็อก & ออกใบรับ (Dual Save)' 
                    : 'Save Stock & Issue Inbound Bill'}
                </span>
              </button>
            </div>
          );
        })()}
      </form>

      {/* POPUP MODAL: INSTANT VIEW OF GENERATED IMPORT BILL */}
      {createdBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 text-white space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-base text-white">
                    {lang === 'lo' ? 'ນຳເຂົ້າສຳເລັດ • ບັນທຶກທັງ 2 ລະບົບແລ້ວ' : lang === 'th' ? 'นำเข้าสำเร็จ • บันทึกทั้ง 2 ระบบแล้ว' : 'Stock-In Success • Dual Recorded'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {lang === 'lo' ? 'ຂໍ້ມູນຖືກເພີ່ມເຂົ້າ ສະຕ໋ອກລົດ (Inventory) ແລະ ໜ້າໃບບິນ/ໃບຮັບ (Bills) ພ້ອມກັນ' : 'Saved to Inventory Stock & Bills View'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreatedBill(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 receipt-paper bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3 text-xs font-mono shadow-md">
              <div className="flex justify-between items-start pb-3 border-b border-zinc-800">
                <div>
                  <span className="font-black text-white text-sm block">AVATR AUTO SERVICE</span>
                  <span className="text-[10px] text-zinc-400">{t.printStockInReceipt || 'GOODS RECEIPT NOTE'}</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-bold block">{createdBill.billNumber}</span>
                  <span className="text-zinc-500 text-[10px]">{createdBill.date}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-zinc-300">
                <div><span className="text-zinc-500 font-sans">{t.tableModel}:</span> <strong className="text-white">{createdBill.model}</strong> ({createdBill.trim})</div>
                <div><span className="text-zinc-500 font-sans">{t.vinNumber}:</span> <span className="text-white">{createdBill.vin}</span></div>
                <div><span className="text-zinc-500 font-sans">{t.quantityUnits}:</span> <strong className="text-white">{createdBill.quantity} {t.unitCars}</strong></div>
                <div><span className="text-zinc-500 font-sans">{t.tableColor}/{t.plateNumber}:</span> {createdBill.color || '-'} • {createdBill.plateNumber || '-'}</div>
                <div><span className="text-zinc-500 font-sans">{t.supplierName}:</span> {createdBill.supplierName}</div>
                <div><span className="text-zinc-500 font-sans">{t.warehouseDest}:</span> {createdBill.destinationWarehouse}</div>
                <div className="pt-2 flex justify-between text-sm font-bold text-white border-t border-zinc-800/80">
                  <span>{lang === 'lo' ? 'ມູນຄ່ານຳເຂົ້າ:' : lang === 'th' ? 'มูลค่านำเข้า:' : 'Valuation:'}</span>
                  <span className="text-white font-bold">${createdBill.netTotalUSD.toLocaleString()} USD</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setCreatedBill(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold border border-zinc-800 cursor-pointer"
              >
                {lang === 'lo' ? 'ປິດປ໋ອບອັບ' : 'Close'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCreatedBill(null);
                    onNavigateToBills();
                  }}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{lang === 'lo' ? 'ເບິ່ງໃນໜ້າ ບັນທຶກບິນ & ໃບຮັບ' : 'View in Bills & Invoices'}</span>
                </button>
                <button
                  onClick={() => {
                    setCreatedBill(null);
                    onNavigateToStock();
                  }}
                  className="px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Car className="w-3.5 h-3.5 text-black" />
                  <span>{lang === 'lo' ? 'ເບິ່ງໃນໜ້າ ສະຕ໋ອກລົດ' : 'View in Inventory Stock'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN ໃຫຍ່ ເພີ່ມຕົວເລືອກລຸ້ນຍານຍົນ (Super Admin Add Vehicle Model) */}
      {isSuperAdmin && isAddModelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 text-white space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-2xl bg-white text-black shadow-lg">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <span>ເພີ່ມຕົວເລືອກລຸ້ນຍານຍົນໃໝ່</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                      Admin (Super Admin)
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    ສ້າງ ແລະ ເພີ່ມລຸ້ນຍານຍົນ AVATR ເຂົ້າໃນລະບົບຕົວເລືອກ Stock-In, ສະຕ໋ອກລົດ, ໃບສະເໜີລາຄາ ແລະ POS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModelOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 p-3.5 bg-zinc-900/60 rounded-2xl border border-zinc-800/80">
              <label className="text-[11px] text-zinc-400 font-medium block">
                ກົດເລືອກຕົວຢ່າງລຸ້ນຍານຍົນແນະນຳດ່ວນ (Quick Presets):
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'AVATR 011 MMW Edition', cat: 'Ultra-Luxury Limited Edition', price: 95000, bat: '116.8 kWh (700 km)', pwr: 'Dual-Motor AWD (578 hp)' },
                  { name: 'AVATR 06 Gran Turismo', cat: 'Intelligent Sports Sedan', price: 39000, bat: '90 kWh CATL (650 km)', pwr: 'Dual-Motor AWD (510 hp)' },
                  { name: 'AVATR 15 Extended Range', cat: 'Smart SUV EREV (Extended Range)', price: 36000, bat: '45 kWh + Range Extender (1,150 km)', pwr: 'Dual-Motor AWD' },
                  { name: 'AVATR 07 Ultra Performance', cat: 'Urban Smart SUV', price: 43000, bat: '100 kWh (720 km)', pwr: 'Dual-Motor AWD (598 hp)' },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setNewModelName(preset.name);
                      setNewModelCategory(preset.cat);
                      setNewModelPriceUSD(preset.price);
                      setNewModelBattery(preset.bat);
                      setNewModelPowertrain(preset.pwr);
                    }}
                    className="text-[11px] px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-white hover:text-black text-zinc-300 border border-zinc-800 transition-all font-medium"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAddNewVehicleModel} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Model Name */}
                <div className="sm:col-span-2">
                  <label className="block text-zinc-300 font-bold mb-1">
                    ຊື່ລຸ້ນຍານຍົນ (Model Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="e.g. AVATR 011 MMW Edition ຫຼື AVATR 06"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-white"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    ປະເພດຍານຍົນ (Category / Subtitle)
                  </label>
                  <input
                    type="text"
                    value={newModelCategory}
                    onChange={(e) => setNewModelCategory(e.target.value)}
                    placeholder="e.g. Luxury Sports Coupé"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Price Starting USD */}
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    ລາຄາເລີ່ມຕົ້ນ ($ USD)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={newModelPriceUSD}
                    onChange={(e) => setNewModelPriceUSD(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Tagline */}
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 font-medium mb-1">
                    ຄຳຂວັນລຸ້ນ / Tagline
                  </label>
                  <input
                    type="text"
                    value={newModelTagline}
                    onChange={(e) => setNewModelTagline(e.target.value)}
                    placeholder="e.g. ຍົນລະກຳອັດສະລິຍະລະດັບ Masterpiece ຮ່ວມມືກັບ Matthew M. Williams"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Battery & Range */}
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    ຄວາມຈຸແບັດເຕີຣີ / ໄລຍະທາງ (Battery & Range)
                  </label>
                  <input
                    type="text"
                    value={newModelBattery}
                    onChange={(e) => setNewModelBattery(e.target.value)}
                    placeholder="e.g. 94.5 kWh CATL (700 km)"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Powertrain */}
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    ລະບົບຂັບເຄື່ອນ (Powertrain / Motor)
                  </label>
                  <input
                    type="text"
                    value={newModelPowertrain}
                    onChange={(e) => setNewModelPowertrain(e.target.value)}
                    placeholder="e.g. Dual-Motor AWD (578 hp)"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Image URL */}
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 font-medium mb-1">
                    ຮູບພາບລຸ້ນລົດ (Image URL ຫຼື ປ່ອຍວ່າງເພື່ອໃຊ້ຮູບມາດຕະຖານ)
                  </label>
                  <input
                    type="url"
                    value={newModelImage}
                    onChange={(e) => setNewModelImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModelOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-semibold"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-lg flex items-center gap-2 border border-zinc-300"
                >
                  <Plus className="w-4 h-4" />
                  <span>ບັນທຶກ ແລະ ເພີ່ມລຸ້ນເຂົ້າລະບົບຕົວເລືອກ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Popup Modal for Deleting Vehicle Model */}
      <ConfirmDeleteModal
        isOpen={!!modelToDelete}
        isLoading={isDeletingModel}
        onClose={() => setModelToDelete(null)}
        onConfirm={handleConfirmDeleteModel}
        itemName={modelToDelete ? `ລຸ້ນ: ${modelToDelete.name} (${modelToDelete.category || modelToDelete.subTitle || 'EV'})` : ''}
        itemType="VEHICLE MODEL"
        title={lang === 'lo' ? `ຢືນຢັນການລົບລຸ້ນ "${modelToDelete?.name}"` : `Confirm Delete Model`}
        description={lang === 'lo' 
          ? `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລຸ້ນຍານຍົນ "${modelToDelete?.name}" ອອກຈາກລະບົບ? ລຸ້ນນີ້ຈະຖືກລົບອອກຈາກຖານຂໍ້ມູນ Cloud Supabase ຢ່າງຖາວອນ ແລະ ຈະບໍ່ປາກົດໃນຕົວເລືອກອີກ.`
          : `Are you sure you want to delete vehicle model "${modelToDelete?.name}"? It will be permanently removed from Cloud Supabase and will no longer appear in options.`
        }
        confirmButtonText={lang === 'lo' ? 'ຢືນຢັນລົບລຸ້ນນີ້' : 'Delete Model'}
        cancelButtonText={lang === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
        lang={lang}
      />
    </div>
  );
}
