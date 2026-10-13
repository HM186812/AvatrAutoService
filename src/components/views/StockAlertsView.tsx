import React, { useState } from 'react';
import { InventoryItem, VehicleModel, Language, PDIStatus, StockStatus } from '../../types';
import { translations } from '../../data/translations';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Car, 
  MapPin, 
  PackagePlus, 
  Search, 
  ArrowRight, 
  Sparkles, 
  Check, 
  X, 
  Calendar, 
  Clock, 
  Gift, 
  Tag 
} from 'lucide-react';

interface StockAlertsViewProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  vehicles: VehicleModel[];
  lang: Language;
  onNavigateToStock: () => void;
}

export default function StockAlertsView({
  inventory,
  setInventory,
  vehicles,
  lang,
  onNavigateToStock,
}: StockAlertsViewProps) {
  const t = translations[lang] || translations.lo;

  const [filterType, setFilterType] = useState<'all' | 'out_of_stock' | 'low_stock'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // RESTOCK MODAL STATE
  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItem | null>(null);
  const [restockDate, setRestockDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [restockQty, setRestockQty] = useState<number>(1);
  const [restockWarehouse, setRestockWarehouse] = useState<string>('ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ (Main Showroom)');
  const [restockDocNo, setRestockDocNo] = useState<string>('');
  const [restockSupplier, setRestockSupplier] = useState<string>('AVATR Technology Co., Ltd. (Chongqing Intelligent Plant)');
  const [restockStatus, setRestockStatus] = useState<StockStatus>('ready');
  const [restockPdiStatus, setRestockPdiStatus] = useState<PDIStatus>('passed');
  const [restockOfficer, setRestockOfficer] = useState<string>('ພະນັກງານຄຸ້ມຄອງສາງ & PDI');
  const [restockNotes, setRestockNotes] = useState<string>('');

  // Event & Promotion Timeframe State
  const [restockEventCampaign, setRestockEventCampaign] = useState<string>('');
  const [restockEventStartDate, setRestockEventStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [restockEventEndDate, setRestockEventEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [restockEventLocation, setRestockEventLocation] = useState<string>('');
  const [restockPromoDiscountUSD, setRestockPromoDiscountUSD] = useState<number>(0);
  const [restockPromoNotes, setRestockPromoNotes] = useState<string>('');

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3800);
  };

  // Quick preset days for event timeframe
  const handleSetQuickPresetDays = (days: number) => {
    const start = new Date(restockEventStartDate || new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    setRestockEventEndDate(end.toISOString().slice(0, 10));
  };

  // Open the detailed restock modal with auto-populated document numbers
  const handleOpenRestockModal = (item: InventoryItem, initialQty = 1) => {
    setSelectedRestockItem(item);
    setRestockDate(new Date().toISOString().slice(0, 10));
    setRestockQty(initialQty);
    setRestockWarehouse(item.location || 'ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ (Main Showroom)');
    setRestockDocNo(`GRN-RESTOCK-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setRestockSupplier('AVATR Technology Co., Ltd. (Chongqing Intelligent Plant)');
    setRestockStatus(item.status === 'event' || item.status === 'promotion' ? item.status : 'ready');
    setRestockPdiStatus(item.pdiStatus || 'passed');
    setRestockOfficer(lang === 'lo' ? 'ພະນັກງານຄຸ້ມຄອງສາງ & PDI' : lang === 'th' ? 'เจ้าหน้าที่ฝ่ายคลังสินค้า & PDI' : 'Warehouse & PDI Officer');
    setRestockNotes(lang === 'lo' ? `ຕອບສະໜອງຄວາມຕ້ອງການດ່ວນ (ລຸ້ນ ${item.model})` : lang === 'th' ? `ตอบสนองความต้องการด่วน (รุ่น ${item.model})` : `Urgent restocking for ${item.model}`);

    // Pre-fill event/promo details if existing
    setRestockEventCampaign(item.eventCampaign || (item.status === 'event' ? (lang === 'lo' ? 'ງານ Vientiane Motor Expo 2026' : lang === 'th' ? 'งาน Vientiane Motor Expo 2026' : 'Motor Expo 2026') : (lang === 'lo' ? 'ແຄມເປນໂປຣໂມຊັນພິເສດ' : lang === 'th' ? 'แคมเปญโปรโมชั่นพิเศษ' : 'Special Promotion')));
    setRestockEventStartDate(item.eventStartDate || new Date().toISOString().slice(0, 10));
    if (item.eventEndDate) {
      setRestockEventEndDate(item.eventEndDate);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setRestockEventEndDate(d.toISOString().slice(0, 10));
    }
    setRestockEventLocation(item.eventLocation || (lang === 'lo' ? 'ສູນການຄ້າ ITECC Mall' : lang === 'th' ? 'ศูนย์การค้า ITECC Mall' : 'ITECC Mall'));
    setRestockPromoDiscountUSD(item.promotionDiscountUSD || 2000);
    setRestockPromoNotes(item.promotionNotes || (lang === 'lo' ? 'ແຖມປະກັນໄພຊັ້ນ 1 + Home Charger 7kW' : lang === 'th' ? 'แถมประกันภัยชั้น 1 + Home Charger 7kW' : 'Free 1st Class Insurance + 7kW Home Charger'));
  };

  // Submit the restock with validated inputs
  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestockItem) return;
    if (restockQty <= 0) {
      triggerToast(lang === 'lo' ? 'ກະລຸນາປ້ອນຈຳນວນລົດທີ່ຫຼາຍກວ່າ 0!' : lang === 'th' ? 'กรุณาระบุจำนวนรถที่มากกว่า 0!' : 'Please enter a quantity greater than 0!');
      return;
    }

    // Validate Event / Promotion Timeframe
    if (restockStatus === 'event' || restockStatus === 'promotion') {
      if (!restockEventStartDate || !restockEventEndDate) {
        triggerToast(lang === 'lo' ? 'ກະລຸນາກຳນົດວັນທີເລີ່ມຕົ້ນ ແລະ ວັນທີສິ້ນສຸດ ສຳລັບສິນຄ້າ Event / ໂປຣໂມຊັນ!' : lang === 'th' ? 'กรุณาระบุวันที่เริ่มต้นและวันที่สิ้นสุดสำหรับสินค้า Event / โปรโมชั่น!' : 'Please set start and end dates for Event / Promotion!');
        return;
      }
      if (restockEventEndDate < restockEventStartDate) {
        triggerToast(lang === 'lo' ? 'ວັນທີສິ້ນສຸດ ຕ້ອງເທົ່າກັບ ຫຼື ຫຼັງຈາກວັນທີເລີ່ມຕົ້ນ!' : lang === 'th' ? 'วันที่สิ้นสุดต้องเท่ากับหรือหลังวันที่เริ่มต้น!' : 'End date must be equal to or after start date!');
        return;
      }
    }

    setInventory(prev => prev.map(item => {
      if (item.vin === selectedRestockItem.vin) {
        const updatedQty = item.stockQuantity + restockQty;
        return {
          ...item,
          stockQuantity: updatedQty,
          location: restockWarehouse,
          pdiStatus: restockPdiStatus,
          status: restockStatus,
          arrivalDate: restockDate ? `${restockDate} ${new Date().toTimeString().slice(0, 8)}` : item.arrivalDate,
          pdiNotes: restockNotes ? `[${restockDocNo}] ${restockNotes}` : item.pdiNotes,
          pdiInspector: restockOfficer || item.pdiInspector,
          eventCampaign: (restockStatus === 'event' || restockStatus === 'promotion')
            ? (restockEventCampaign.trim() || (restockStatus === 'event' ? (lang === 'lo' ? 'ງານ Event ພິເສດ' : 'งาน Event พิเศษ') : (lang === 'lo' ? 'ໂປຣໂມຊັນພິເສດ' : 'โปรโมชั่นพิเศษ')))
            : item.eventCampaign,
          eventStartDate: (restockStatus === 'event' || restockStatus === 'promotion') ? restockEventStartDate : undefined,
          eventEndDate: (restockStatus === 'event' || restockStatus === 'promotion') ? restockEventEndDate : undefined,
          eventLocation: (restockStatus === 'event' || restockStatus === 'promotion') ? restockEventLocation : undefined,
          promotionDiscountUSD: (restockStatus === 'event' || restockStatus === 'promotion') ? restockPromoDiscountUSD : undefined,
          promotionNotes: (restockStatus === 'event' || restockStatus === 'promotion') ? restockPromoNotes : undefined,
        };
      }
      return item;
    }));

    triggerToast(
      lang === 'lo'
        ? `ເພີ່ມສະຕ໋ອກ ${selectedRestockItem.model} (+${restockQty} ຄັນ) ສຳເລັດແລ້ວ!`
        : lang === 'th'
        ? `เพิ่มสต็อก ${selectedRestockItem.model} (+${restockQty} คัน) สำเร็จแล้ว!`
        : `Restocked ${selectedRestockItem.model} (+${restockQty} units) successfully!`
    );
    setSelectedRestockItem(null);
  };

  // Filter out of stock (0) & low stock (< 5 units) items
  const outOfStockItems = inventory.filter(i => i.stockQuantity === 0);
  const lowStockItems = inventory.filter(i => i.stockQuantity > 0 && i.stockQuantity < 5);
  const totalAlertItems = [...outOfStockItems, ...lowStockItems];

  const displayedItems = totalAlertItems.filter(item => {
    if (filterType === 'out_of_stock' && item.stockQuantity !== 0) return false;
    if (filterType === 'low_stock' && (item.stockQuantity <= 0 || item.stockQuantity >= 5)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchModel = item.model.toLowerCase().includes(q);
      const matchVin = item.vin.toLowerCase().includes(q);
      const matchPlate = (item.plateNumber || '').toLowerCase().includes(q);
      const matchColor = (item.color || '').toLowerCase().includes(q);
      return matchModel || matchVin || matchPlate || matchColor;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {toastMsg && (
        <div role="status" className="fixed top-20 right-6 z-50 bg-zinc-900 border border-zinc-700 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <header className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-amber-400/5 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              {lang === 'lo' ? 'ສູນຕິດຕາມສະຕ໋ອກ' : lang === 'th' ? 'ศูนย์ติดตามสต็อก' : 'Inventory overview'}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {lang === 'lo' ? 'ແຈ້ງເຕືອນສະຕ໋ອກ' : lang === 'th' ? 'แจ้งเตือนสต็อก' : 'Stock alerts'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {lang === 'lo' ? 'ຕິດຕາມລົດທີ່ໃກ້ໝົດ ຫຼື ໝົດສະຕ໋ອກ ແລະວາງແຜນເຕີມສະຕ໋ອກໄດ້ທັນເວລາ' : lang === 'th' ? 'ติดตามรถที่ใกล้หมดหรือหมดสต็อก และวางแผนเติมสินค้าได้ทันเวลา' : 'Track low and depleted inventory, then plan replenishment before it affects sales.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToStock}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Car className="h-4 w-4 text-zinc-300" />
            <span>{lang === 'lo' ? 'ເບິ່ງສະຕ໋ອກລົດ' : lang === 'th' ? 'ดูสต็อกรถยนต์' : 'View vehicle stock'}</span>
            <ArrowRight className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
      </header>

      <section aria-label={lang === 'lo' ? 'ສະຫຼຸບສະຕ໋ອກ' : lang === 'th' ? 'สรุปสต็อก' : 'Stock summary'} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={filterType === 'out_of_stock'}
          onClick={() => setFilterType(filterType === 'out_of_stock' ? 'all' : 'out_of_stock')}
          className={`group rounded-2xl border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
            filterType === 'out_of_stock'
              ? 'border-rose-500/50 bg-rose-500/10 shadow-lg shadow-rose-950/20'
              : 'border-zinc-800 bg-zinc-950 hover:border-rose-500/40 hover:bg-zinc-900/80'
          }`}
        >
          <span className="flex items-start justify-between gap-4">
            <span className="flex items-center gap-3">
              <span className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-2.5 text-rose-600">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">
                  {lang === 'lo' ? 'ສິນຄ້າໝົດແລ້ວ' : lang === 'th' ? 'สินค้าหมดสต็อก' : 'Out of stock'}
                </span>
                <span className="mt-1 block text-xs text-zinc-400">
                  {lang === 'lo' ? 'ຕ້ອງເຕີມສະຕ໋ອກດ່ວນ · ຈຳນວນ 0' : lang === 'th' ? 'ควรเติมสต็อกด่วน · คงเหลือ 0' : 'Replenish urgently · quantity is 0'}
                </span>
              </span>
            </span>
            <span className="text-3xl font-bold tabular-nums text-rose-600">{outOfStockItems.length}</span>
          </span>
          <span className="mt-5 flex items-center justify-between border-t border-rose-400/10 pt-3 text-xs text-zinc-400">
            <span>{lang === 'lo' ? 'ລາຍການໝົດສະຕ໋ອກ' : lang === 'th' ? 'รายการที่หมดสต็อก' : 'depleted items'}</span>
            <span className="inline-flex items-center gap-1 text-rose-600 group-hover:text-rose-700">
              {filterType === 'out_of_stock'
                ? (lang === 'lo' ? 'ກຳລັງກັ່ນຕອງ' : lang === 'th' ? 'กำลังกรอง' : 'Filtered')
                : (lang === 'lo' ? 'ກັ່ນຕອງ' : lang === 'th' ? 'กรองรายการ' : 'Filter')}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </span>
        </button>

        <button
          type="button"
          aria-pressed={filterType === 'low_stock'}
          onClick={() => setFilterType(filterType === 'low_stock' ? 'all' : 'low_stock')}
          className={`group rounded-2xl border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            filterType === 'low_stock'
              ? 'border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-950/20'
              : 'border-zinc-800 bg-zinc-950 hover:border-amber-500/40 hover:bg-zinc-900/80'
          }`}
        >
          <span className="flex items-start justify-between gap-4">
            <span className="flex items-center gap-3">
              <span className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2.5 text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">
                  {lang === 'lo' ? 'ສິນຄ້າໃກ້ໝົດ' : lang === 'th' ? 'สินค้าใกล้หมด' : 'Low stock'}
                </span>
                <span className="mt-1 block text-xs text-zinc-400">
                  {lang === 'lo' ? 'ເຫຼືອຕ່ຳກວ່າ 5 ຄັນ · ຄວນວາງແຜນເຕີມ' : lang === 'th' ? 'เหลือน้อยกว่า 5 คัน · ควรวางแผนเติม' : 'Fewer than 5 units · plan a restock'}
                </span>
              </span>
            </span>
            <span className="text-3xl font-bold tabular-nums text-amber-300">{lowStockItems.length}</span>
          </span>
          <span className="mt-5 flex items-center justify-between border-t border-amber-400/10 pt-3 text-xs text-zinc-400">
            <span>{lang === 'lo' ? 'ລາຍການໃກ້ໝົດ' : lang === 'th' ? 'รายการใกล้หมด' : 'low stock items'}</span>
            <span className="inline-flex items-center gap-1 text-amber-300 group-hover:text-amber-200">
              {filterType === 'low_stock'
                ? (lang === 'lo' ? 'ກຳລັງກັ່ນຕອງ' : lang === 'th' ? 'กำลังกรอง' : 'Filtered')
                : (lang === 'lo' ? 'ກັ່ນຕອງ' : lang === 'th' ? 'กรองรายการ' : 'Filter')}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </span>
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="flex flex-col gap-4 border-b border-zinc-800 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              {lang === 'lo' ? 'ລາຍການທີ່ຕ້ອງຕິດຕາມ' : lang === 'th' ? 'รายการที่ต้องติดตาม' : 'Items to review'}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              {lang === 'lo' ? `ພົບ ${displayedItems.length} ລາຍການຈາກ ${totalAlertItems.length} ລາຍການ` : lang === 'th' ? `พบ ${displayedItems.length} รายการ จากทั้งหมด ${totalAlertItems.length} รายการ` : `Showing ${displayedItems.length} of ${totalAlertItems.length} alert items`}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={lang === 'lo' ? 'ກັ່ນຕອງລາຍການ' : lang === 'th' ? 'กรองรายการ' : 'Filter items'}>
              {(['all', 'out_of_stock', 'low_stock'] as const).map((filter) => {
                const isActive = filterType === filter;
                const label = filter === 'all'
                  ? (lang === 'lo' ? 'ທັງໝົດ' : lang === 'th' ? 'ทั้งหมด' : 'All')
                  : filter === 'out_of_stock'
                    ? (lang === 'lo' ? 'ໝົດສະຕ໋ອກ' : lang === 'th' ? 'หมดสต็อก' : 'Out of stock')
                    : (lang === 'lo' ? 'ໃກ້ໝົດ' : lang === 'th' ? 'ใกล้หมด' : 'Low stock');
                const count = filter === 'all' ? totalAlertItems.length : filter === 'out_of_stock' ? outOfStockItems.length : lowStockItems.length;

                return (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setFilterType(filter)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                      isActive
                        ? 'border-zinc-500 bg-zinc-800 text-white'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {label} <span className={isActive ? 'text-white' : 'text-zinc-500'}>({count})</span>
                  </button>
                );
              })}
            </div>
            <label className="relative block sm:min-w-64">
              <span className="sr-only">{lang === 'lo' ? 'ຄົ້ນຫາສິນຄ້າ' : lang === 'th' ? 'ค้นหาสินค้า' : 'Search inventory alerts'}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                placeholder={lang === 'lo' ? 'ຄົ້ນຫາລຸ້ນ, VIN, ທະບຽນ, ສີ...' : lang === 'th' ? 'ค้นหารุ่น, VIN, ทะเบียน, สี...' : 'Search model, VIN, plate, color...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 sm:w-64"
              />
            </label>
          </div>
        </div>

      {displayedItems.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-white">
            {lang === 'lo' ? (searchQuery ? 'ບໍ່ພົບຜົນການຄົ້ນຫາ' : 'ບໍ່ມີລາຍການແຈ້ງເຕືອນ') : lang === 'th' ? (searchQuery ? 'ไม่พบผลการค้นหา' : 'ไม่มีรายการแจ้งเตือน') : (searchQuery ? 'No matching items' : 'No stock alerts')}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-400">
            {lang === 'lo' ? (searchQuery ? 'ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ກັ່ນຕອງລາຍການໃໝ່' : 'ສະຕ໋ອກທຸກລາຍການຢູ່ໃນລະດັບປົກກະຕິ') : lang === 'th' ? (searchQuery ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง' : 'สต็อกทุกรายการอยู่ในระดับปกติ') : (searchQuery ? 'Try a different search term or filter.' : 'All inventory is at a healthy level.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
          {displayedItems.map((item) => (
            <div
              key={item.vin}
              className="flex min-w-0 flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    item.stockQuantity === 0
                              ? 'border-rose-400/20 bg-rose-400/10 text-rose-600'
                      : 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                  }`}>
                    {item.stockQuantity === 0 ? <ShieldAlert className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {item.stockQuantity === 0
                      ? (lang === 'lo' ? 'ໝົດສະຕ໋ອກ' : lang === 'th' ? 'หมดสต็อก' : 'Out of stock')
                      : (lang === 'lo' ? 'ໃກ້ໝົດ' : lang === 'th' ? 'ใกล้หมด' : 'Low stock')}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-200">${item.priceUSD.toLocaleString()}</span>
                </div>

                <div className="mt-4 flex min-w-0 items-center gap-3">
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800">
                    <img
                      src={item.imageUrl || item.image || '/avatr-logo.png'}
                      alt={item.model}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">{item.model}</h3>
                    <p className="mt-0.5 truncate text-xs text-zinc-400">{item.color}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {lang === 'lo' ? 'ທະບຽນ' : lang === 'th' ? 'ทะเบียน' : 'Plate'}: <span className="text-zinc-300">{item.plateNumber || '—'}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-zinc-400">{lang === 'lo' ? 'ສະຕ໋ອກຄົງເຫຼືອ' : lang === 'th' ? 'คงเหลือในสต็อก' : 'Current stock'}</p>
                      <p className={`mt-1 text-xl font-bold tabular-nums ${item.stockQuantity === 0 ? 'text-rose-600' : 'text-amber-300'}`}>
                        {item.stockQuantity} <span className="text-xs font-medium text-zinc-400">{t.unitCars}</span>
                      </p>
                    </div>
                    <span className="max-w-[55%] truncate text-right text-xs text-zinc-400" title={item.location || undefined}>
                      {item.location || (lang === 'lo' ? 'ບໍ່ລະບຸສາງ' : lang === 'th' ? 'ไม่ระบุคลัง' : 'No warehouse set')}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800 pt-2.5 text-xs">
                    <span className="shrink-0 text-zinc-500">{lang === 'lo' ? 'VIN' : lang === 'th' ? 'เลขตัวถัง' : 'VIN'}</span>
                    <span className="truncate font-mono text-zinc-300" title={item.vin}>{item.vin}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => handleOpenRestockModal(item, 1)}
                  className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <PackagePlus className="h-4 w-4" />
                  <span>{lang === 'lo' ? 'ເພີ່ມສະຕ໋ອກ' : lang === 'th' ? 'เติมสต็อก' : 'Restock item'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </section>

      {/* DETAILED RESTOCK MODAL */}
      {selectedRestockItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-zinc-900 text-white rounded-xl border border-zinc-700">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {lang === 'lo' ? 'ຟອມບັນທຶກເພີ່ມສະຕ໋ອກລົດ (Inbound Restock)' : lang === 'th' ? 'ฟอร์มบันทึกเพิ่มสต็อกรถยนต์ (Inbound Restock)' : 'Inbound Restock Form'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {lang === 'lo' ? 'ກຳນົດຈຳນວນ, ສາງປາຍທາງ ແລະ ຂໍ້ມູນກວດສອບ PDI ຢ່າງຖືກຕ້ອງ' : lang === 'th' ? 'กำหนดจำนวน, คลังปลายทาง และข้อมูลการตรวจ PDI อย่างถูกต้อง' : 'Specify quantity, warehouse destination and PDI inspection status'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRestockItem(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Car Summary Banner */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-700">
                <img
                  src={selectedRestockItem.image}
                  alt={selectedRestockItem.model}
                  className="w-full h-full object-cover filter grayscale"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">{selectedRestockItem.model}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                    {lang === 'lo' ? `ສະຕ໋ອກປັດຈຸບັນ: ${selectedRestockItem.stockQuantity} ຄັນ` : lang === 'th' ? `สต็อกปัจจุบัน: ${selectedRestockItem.stockQuantity} คัน` : `Current Stock: ${selectedRestockItem.stockQuantity} units`}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{selectedRestockItem.color} • {selectedRestockItem.trim || 'Standard'}</p>
                <p className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                  VIN: <strong className="text-zinc-300">{selectedRestockItem.vin}</strong> | {lang === 'lo' ? 'ທະບຽນ:' : lang === 'th' ? 'ทะเบียน:' : 'Plate:'} {selectedRestockItem.plateNumber}
                </p>
              </div>
            </div>

            {/* Restock Input Form */}
            <form onSubmit={handleConfirmRestock} className="space-y-4 text-xs">
              {/* Quantity to Add */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  {lang === 'lo' ? 'ຈຳນວນຄັນທີ່ນຳເຂົ້າເພີ່ມ (Units to Restock) *' : lang === 'th' ? 'จำนวนคันที่นำเข้าเพิ่ม (Units to Restock) *' : 'Units to Restock *'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={restockQty}
                    onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-32 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-mono text-base font-bold text-center focus:outline-none focus:border-white"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 5, 10, 20].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRestockQty(n)}
                        className={`px-3 py-2 rounded-xl font-mono text-xs border transition-colors ${
                          restockQty === n
                            ? 'bg-white text-black border-white font-bold'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        +{n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date, Warehouse & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{lang === 'lo' ? 'ວັນທີເຕີມສະຕ໋ອກ *' : lang === 'th' ? 'วันที่เติมสต็อก *' : 'Restock Date *'}</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={restockDate}
                    onChange={(e) => setRestockDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    {lang === 'lo' ? 'ສາງເກັບຮັກສາ / ໂຊຣູມປາຍທາງ *' : lang === 'th' ? 'คลังจัดเก็บ / โชว์รูมปลายทาง *' : 'Warehouse Destination *'}
                  </label>
                  <select
                    value={restockWarehouse}
                    onChange={(e) => setRestockWarehouse(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  >
                    <option value="ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ (Main Showroom)">
                      {lang === 'lo' ? 'ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ (Main Showroom)' : lang === 'th' ? 'โชว์รูมใหญ่ หลัก 3 ท่าเดื่อ (Main Showroom)' : 'Main Showroom (Lak 3)'}
                    </option>
                    <option value="ສາງໃຫຍ່ດົງໂດກ (Dongdok Central Depot)">
                      {lang === 'lo' ? 'ສາງໃຫຍ່ດົງໂດກ (Central Depot)' : lang === 'th' ? 'คลังใหญ่ดงโดก (Central Depot)' : 'Dongdok Central Depot'}
                    </option>
                    <option value="ສູນກວດສະພາບ PDI ຫຼັກ 8">
                      {lang === 'lo' ? 'ສູນກວດສະພາບ PDI ຫຼັກ 8' : lang === 'th' ? 'ศูนย์ตรวจสภาพ PDI หลัก 8' : 'Lak 8 PDI Center'}
                    </option>
                    <option value="ສາງພັກລົດດ່ານສາກົນບໍ່ເຕັນ">
                      {lang === 'lo' ? 'ສາງພັກລົດດ່ານສາກົນບໍ່ເຕັນ (ລາວ-ຈີນ)' : lang === 'th' ? 'คลังพักรถด่านสากลบ่อเต็น' : 'Boten Border Depot'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    {lang === 'lo' ? 'ເລກທີໃບຮັບສິນຄ້າ (GRN / PO Ref) *' : lang === 'th' ? 'เลขที่ใบรับสินค้า (GRN / PO Ref) *' : 'GRN / PO Ref *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={restockDocNo}
                    onChange={(e) => setRestockDocNo(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Supplier & PDI Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    {lang === 'lo' ? 'ແຫຼ່ງຜະລິດ / ຜູ້ສະໜອງ (Supplier / Origin)' : lang === 'th' ? 'แหล่งผลิต / ผู้จัดจำหน่าย (Supplier / Origin)' : 'Supplier / Origin'}
                  </label>
                  <input
                    type="text"
                    value={restockSupplier}
                    onChange={(e) => setRestockSupplier(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    {lang === 'lo' ? 'ສະຖານະກວດກາ PDI ຫຼັງນຳເຂົ້າ' : lang === 'th' ? 'สถานะตรวจ PDI หลังนำเข้า' : 'PDI Inspection Status'}
                  </label>
                  <select
                    value={restockPdiStatus}
                    onChange={(e) => setRestockPdiStatus(e.target.value as PDIStatus)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  >
                    <option value="passed">{lang === 'lo' ? 'ຜ່ານການກວດ PDI 100% ພ້ອມຂາຍທັນທີ (Ready)' : lang === 'th' ? 'ผ่านการตรวจ PDI 100% พร้อมจำหน่ายทันที (Ready)' : 'PDI Passed 100% (Ready to Sell)'}</option>
                    <option value="in_progress">{lang === 'lo' ? 'ກຳລັງກວດສອບ PDI 68 ຈຸດ (In Progress PDI)' : lang === 'th' ? 'กำลังตรวจสอบ PDI 68 จุด (In Progress PDI)' : 'In Progress PDI 68 Points'}</option>
                    <option value="pending">{lang === 'lo' ? 'ລໍຖ້າກວດສອບ PDI (Pending PDI)' : lang === 'th' ? 'รอตรวจสอบ PDI (Pending PDI)' : 'Pending PDI Inspection'}</option>
                  </select>
                </div>
              </div>

              {/* Stock Status Selection */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{lang === 'lo' ? 'ສະຖານະສະຕ໋ອກລົດ (Stock Status) *' : lang === 'th' ? 'สถานะสต็อกรถยนต์ (Stock Status) *' : 'Stock Status *'}</span>
                  </span>
                  {(restockStatus === 'event' || restockStatus === 'promotion') && (
                    <span className="text-[10px] text-zinc-300 font-mono font-bold bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                      {lang === 'lo' ? 'ຕ້ອງກຳນົດເວລາ' : lang === 'th' ? 'ต้องกำหนดระยะเวลา' : 'Timeframe Required'}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockStatus('ready')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      restockStatus === 'ready'
                        ? 'bg-white text-black border-white shadow-md font-bold'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">{lang === 'lo' ? 'ພ້ອມຂາຍທັນທີ' : lang === 'th' ? 'พร้อมจำหน่ายทันที' : 'Ready to Sell'}</span>
                    <span className="text-[10px] opacity-75">Ready to Sell</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockStatus('pdi')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      restockStatus === 'pdi'
                        ? 'bg-white text-black border-white shadow-md font-bold'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">{lang === 'lo' ? 'ກຳລັງ PDI' : lang === 'th' ? 'กำลัง PDI' : 'Inspection'}</span>
                    <span className="text-[10px] opacity-75">Inspection</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockStatus('event')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      restockStatus === 'event'
                        ? 'bg-white text-black border-white shadow-md font-bold'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{lang === 'lo' ? 'ງານ Event' : lang === 'th' ? 'งาน Event' : 'Event'}</span>
                    </span>
                    <span className="text-[10px] opacity-75">Motor Show/Expo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockStatus('promotion')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      restockStatus === 'promotion'
                        ? 'bg-white text-black border-white shadow-md font-bold'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold flex items-center justify-center gap-1">
                      <Gift className="w-3.5 h-3.5" />
                      <span>{lang === 'lo' ? 'ໂປຣໂມຊັນ' : lang === 'th' ? 'โปรโมชั่น' : 'Promotion'}</span>
                    </span>
                    <span className="text-[10px] opacity-75">Special Promo</span>
                  </button>
                </div>
              </div>

              {/* TIMEFRAME & SCHEDULE */}
              {(restockStatus === 'event' || restockStatus === 'promotion') && (
                <div className="bg-zinc-900/90 border border-zinc-700 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-white text-black rounded-lg">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-extrabold text-white text-xs sm:text-sm">
                          {lang === 'lo'
                            ? `ກຳນົດເວລາສິນຄ້າ ${restockStatus === 'event' ? 'ງານ Event' : 'ໂປຣໂມຊັນ'} (Schedule & Timeframe)`
                            : lang === 'th'
                            ? `กำหนดระยะเวลาสินค้า ${restockStatus === 'event' ? 'งาน Event' : 'โปรโมชั่น'} (Schedule & Timeframe)`
                            : `Schedule & Timeframe for ${restockStatus === 'event' ? 'Event' : 'Promotion'}`}
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          {lang === 'lo' ? 'ກຳນົດໄລຍະເວລາຈັດງານ ຫຼື ຊ່ວງແຄມເປນໂປຣໂມຊັນໃຫ້ຊັດເຈນ' : lang === 'th' ? 'กำหนดระยะเวลาจัดงาน หรือช่วงแคมเปญโปรโมชั่นให้ชัดเจน' : 'Define campaign period clearly'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white text-black font-bold uppercase">
                      {lang === 'lo' ? 'ບັງຄັບກຳນົດເວລາ' : lang === 'th' ? 'ระบุระยะเวลา' : 'Required'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Campaign Title */}
                    <div className="sm:col-span-2">
                      <label className="block text-zinc-300 mb-1 font-bold">
                        {lang === 'lo' ? 'ຊື່ງານ Event / ຊື່ແຄມເປນໂປຣໂມຊັນ (Campaign Title) *' : lang === 'th' ? 'ชื่องาน Event / ชื่อแคมเปญโปรโมชั่น (Campaign Title) *' : 'Campaign Title *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={restockEventCampaign}
                        onChange={(e) => setRestockEventCampaign(e.target.value)}
                        placeholder={restockStatus === 'event' ? 'e.g. Vientiane Motor Expo 2026' : 'e.g. Mid-Year EV Special'}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-white"
                      />
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-zinc-300 mb-1 font-bold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{lang === 'lo' ? 'ວັນທີເລີ່ມຕົ້ນ (Start Date) *' : lang === 'th' ? 'วันที่เริ่มต้น (Start Date) *' : 'Start Date *'}</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={restockEventStartDate}
                        onChange={(e) => setRestockEventStartDate(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="block text-zinc-300 mb-1 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{lang === 'lo' ? 'ວັນທີສິ້ນສຸດ (End Date) *' : lang === 'th' ? 'วันที่สิ้นสุด (End Date) *' : 'End Date *'}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {[7, 14, 30].map(days => (
                            <button
                              key={days}
                              type="button"
                              onClick={() => handleSetQuickPresetDays(days)}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-white hover:text-black text-zinc-300 transition-colors"
                            >
                              +{days}{lang === 'lo' ? 'ວັນ' : lang === 'th' ? 'วัน' : 'd'}
                            </button>
                          ))}
                        </div>
                      </label>
                      <input
                        type="date"
                        required
                        value={restockEventEndDate}
                        onChange={(e) => setRestockEventEndDate(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>

                    {/* Event Location */}
                    <div>
                      <label className="block text-zinc-300 mb-1 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{lang === 'lo' ? 'ສະຖານທີ່ຈັດງານ / ພື້ນທີ່ໂຊຣູມ' : lang === 'th' ? 'สถานที่จัดงาน / พื้นที่โชว์รูม' : 'Event Location'}</span>
                      </label>
                      <input
                        type="text"
                        value={restockEventLocation}
                        onChange={(e) => setRestockEventLocation(e.target.value)}
                        placeholder="e.g. ITECC Mall A-04"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                      />
                    </div>

                    {/* Promotion Discount */}
                    <div>
                      <label className="block text-zinc-300 mb-1 font-medium flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{lang === 'lo' ? 'ສ່ວນຫຼຸດພິເສດ ($ USD)' : lang === 'th' ? 'ส่วนลดพิเศษ ($ USD)' : 'Discount ($ USD)'}</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={restockPromoDiscountUSD}
                        onChange={(e) => setRestockPromoDiscountUSD(Number(e.target.value) || 0)}
                        placeholder="e.g. 2000"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>

                    {/* Promotion / Gift notes */}
                    <div className="sm:col-span-2">
                      <label className="block text-zinc-300 mb-1 font-medium">
                        {lang === 'lo' ? 'ຂອງແຖມ & ເງື່ອນໄຂພິເສດໃນຊ່ວງເວລານີ້' : lang === 'th' ? 'ของแถม & สิทธิพิเศษในช่วงเวลานี้' : 'Privileges & Free Gifts'}
                      </label>
                      <input
                        type="text"
                        value={restockPromoNotes}
                        onChange={(e) => setRestockPromoNotes(e.target.value)}
                        placeholder={lang === 'lo' ? 'e.g. ແຖມປະກັນໄພຊັ້ນ 1 + Home Charger 7kW' : lang === 'th' ? 'e.g. แถมประกันภัยชั้น 1 + Home Charger 7kW' : 'Free Insurance + Home Charger'}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Officer & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    {lang === 'lo' ? 'ຜູ້ຮັບຜິດຊອບບັນທຶກ (Officer Name)' : lang === 'th' ? 'ผู้รับผิดชอบบันทึก (Officer Name)' : 'Officer Name'}
                  </label>
                  <input
                    type="text"
                    value={restockOfficer}
                    onChange={(e) => setRestockOfficer(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    {lang === 'lo' ? 'ໝາຍເຫດເພີ່ມເຕີມ (Restock Notes)' : lang === 'th' ? 'หมายเหตุเพิ่มเติม (Restock Notes)' : 'Restock Notes'}
                  </label>
                  <input
                    type="text"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                    placeholder={lang === 'lo' ? 'e.g. ລົດນຳເຂົ້າເພີ່ມເຕີມ...' : lang === 'th' ? 'e.g. รถนำเข้าเพิ่มเติม...' : 'Notes...'}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Result Preview Notice */}
              <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-300 text-[11px] flex items-center justify-between">
                <span>
                  {lang === 'lo' ? `ສະຕ໋ອກລົດຈະເພີ່ມຈາກ ${selectedRestockItem.stockQuantity} ຄັນ ເປັນ:` : lang === 'th' ? `สต็อกรถยนต์จะเพิ่มจาก ${selectedRestockItem.stockQuantity} คัน เป็น:` : `Stock will increase from ${selectedRestockItem.stockQuantity} to:`}
                </span>
                <strong className="font-mono text-sm font-black text-white">
                  {selectedRestockItem.stockQuantity + restockQty} {lang === 'lo' ? 'ຄັນ' : lang === 'th' ? 'คัน' : 'units'}
                </strong>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedRestockItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-semibold"
                >
                  {lang === 'lo' ? 'ຍົກເລີກ' : lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-extrabold transition-all shadow-md flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {lang === 'lo' ? `ຢືນຢັນການເພີ່ມສະຕ໋ອກ (+${restockQty} ຄັນ)` : lang === 'th' ? `ยืนยันการเพิ่มสต็อก (+${restockQty} คัน)` : `Confirm Restock (+${restockQty})`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
