import { useState } from 'react';
import { InventoryItem, VehicleModel, Language, PDIStatus, StockStatus } from '../../types';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Plus, 
  CheckCircle2, 
  Car, 
  MapPin, 
  RefreshCw, 
  PackagePlus, 
  Search, 
  Truck,
  ArrowRight,
  Sparkles,
  Check,
  X,
  Building,
  FileText,
  ShieldCheck,
  ClipboardList,
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
  const [filterType, setFilterType] = useState<'all' | 'out_of_stock' | 'low_stock'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // RESTOCK MODAL STATE (ການເພີ່ມ Stock ພ້ອມຂໍ້ມູນຄົບຖ້ວນຢ່າງເໝາະສົມ)
  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(1);
  const [restockWarehouse, setRestockWarehouse] = useState<string>('ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ (Main Showroom)');
  const [restockDocNo, setRestockDocNo] = useState<string>('');
  const [restockSupplier, setRestockSupplier] = useState<string>('AVATR Technology Co., Ltd. (Chongqing Intelligent Plant)');
  const [restockStatus, setRestockStatus] = useState<StockStatus>('ready');
  const [restockPdiStatus, setRestockPdiStatus] = useState<PDIStatus>('passed');
  const [restockOfficer, setRestockOfficer] = useState<string>('ພະນັກງານຄຸ້ມຄອງສາງ & PDI');
  const [restockNotes, setRestockNotes] = useState<string>('');

  // Event & Promotion Timeframe State
  const [restockEventCampaign, setRestockEventCampaign] = useState<string>('ງານ Vientiane Motor Expo 2026');
  const [restockEventStartDate, setRestockEventStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [restockEventEndDate, setRestockEventEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [restockEventLocation, setRestockEventLocation] = useState<string>('ສູນການຄ້າ ITECC Mall');
  const [restockPromoDiscountUSD, setRestockPromoDiscountUSD] = useState<number>(2000);
  const [restockPromoNotes, setRestockPromoNotes] = useState<string>('ແຖມປະກັນໄພຊັ້ນ 1 + Home Charger 7kW');

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
    setRestockQty(initialQty);
    setRestockWarehouse(item.location || 'ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ (Main Showroom)');
    setRestockDocNo(`GRN-RESTOCK-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setRestockSupplier('AVATR Technology Co., Ltd. (Chongqing Intelligent Plant)');
    setRestockStatus(item.status === 'event' || item.status === 'promotion' ? item.status : 'ready');
    setRestockPdiStatus(item.pdiStatus || 'passed');
    setRestockOfficer('ພະນັກງານຄຸ້ມຄອງສາງ & PDI');
    setRestockNotes(`ຕອບສະໜອງຄວາມຕ້ອງການດ່ວນ (ລຸ້ນ ${item.model})`);

    // Pre-fill event/promo details if existing
    setRestockEventCampaign(item.eventCampaign || (item.status === 'event' ? 'ງານ Vientiane Motor Expo 2026' : 'ແຄມເປນໂປຣໂມຊັນພິເສດ'));
    setRestockEventStartDate(item.eventStartDate || new Date().toISOString().slice(0, 10));
    if (item.eventEndDate) {
      setRestockEventEndDate(item.eventEndDate);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setRestockEventEndDate(d.toISOString().slice(0, 10));
    }
    setRestockEventLocation(item.eventLocation || 'ສູນການຄ້າ ITECC Mall');
    setRestockPromoDiscountUSD(item.promotionDiscountUSD || 2000);
    setRestockPromoNotes(item.promotionNotes || 'ແຖມປະກັນໄພຊັ້ນ 1 + Home Charger 7kW');
  };

  // Submit the restock with validated inputs
  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestockItem) return;
    if (restockQty <= 0) {
      triggerToast('ກະລຸນາປ້ອນຈຳນວນລົດທີ່ຫຼາຍກວ່າ 0!');
      return;
    }

    // Validate Event / Promotion Timeframe
    if (restockStatus === 'event' || restockStatus === 'promotion') {
      if (!restockEventStartDate || !restockEventEndDate) {
        triggerToast('ກະລຸນາກຳນົດວັນທີເລີ່ມຕົ້ນ ແລະ ວັນທີສິ້ນສຸດ ສຳລັບສິນຄ້າ Event / ໂປຣໂມຊັນ!');
        return;
      }
      if (restockEventEndDate < restockEventStartDate) {
        triggerToast('ວັນທີສິ້ນສຸດ ຕ້ອງເທົ່າກັບ ຫຼື ຫຼັງຈາກວັນທີເລີ່ມຕົ້ນ!');
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
          pdiNotes: restockNotes ? `[${restockDocNo}] ${restockNotes}` : item.pdiNotes,
          pdiInspector: restockOfficer || item.pdiInspector,
          eventCampaign: (restockStatus === 'event' || restockStatus === 'promotion')
            ? (restockEventCampaign.trim() || (restockStatus === 'event' ? 'ງານ Event ພິເສດ' : 'ໂປຣໂມຊັນພິເສດ'))
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

    const statusLabel = restockStatus === 'event' ? ' (ໝວດງານ Event)' : restockStatus === 'promotion' ? ' (ໝວດໂປຣໂມຊັນ)' : '';
    triggerToast(`ເພີ່ມສະຕ໋ອກລົດ ${selectedRestockItem.model} +${restockQty} ຄັນ${statusLabel} ເຂົ້າສາງ ${restockWarehouse} ສຳເລັດແລ້ວ!`);
    setSelectedRestockItem(null);
  };

  const outOfStockItems = inventory.filter(i => i.stockQuantity === 0);
  const lowStockItems = inventory.filter(i => i.stockQuantity === 1 && i.status !== 'sold');
  const totalAlertItems = [...outOfStockItems, ...lowStockItems];

  // Filtered Alert Items
  const displayedItems = totalAlertItems.filter(item => {
    if (filterType === 'out_of_stock' && item.stockQuantity !== 0) return false;
    if (filterType === 'low_stock' && item.stockQuantity !== 1) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.vin.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.plateNumber.toLowerCase().includes(q) ||
        item.color.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-950 border border-emerald-600 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-7 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-amber-400 text-black rounded-lg">
              <AlertTriangle className="w-5 h-5 fill-black" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
              DEDICATED STOCK DEPLETION MONITOR
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ແຈ້ງເຕືອນສະຕ໋ອກ (ສິນຄ້າໃກ້ໝົດ & ໝົດແລ້ວ)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            ເມນູສະເພາະຕິດຕາມສິນຄ້າທີ່ຕ້ອງສັ່ງນຳເຂົ້າດ່ວນ ເພື່ອບໍ່ໃຫ້ຂາດຕອນໃນການຂາຍ
          </p>
        </div>

        <button
          onClick={onNavigateToStock}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl border border-zinc-700 transition-colors"
        >
          <Car className="w-4 h-4 text-zinc-400" />
          <span>ໄປທີ່ໜ້າສະຕ໋ອກລົດຍົນ</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2 Main Counter Badges: ໝົດແລ້ວ vs ໃກ້ໝົດ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Out of Stock Card */}
        <div 
          onClick={() => setFilterType(filterType === 'out_of_stock' ? 'all' : 'out_of_stock')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer ${
            filterType === 'out_of_stock'
              ? 'bg-red-950/40 border-red-600 shadow-xl'
              : 'bg-zinc-950 border-zinc-800 hover:border-red-900/60'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
              <div className="p-2 bg-red-950/80 rounded-xl border border-red-800">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-base">ສິນຄ້າໝົດແລ້ວ (Out of Stock)</span>
                <span className="text-xs text-zinc-400 font-normal">ສະຕ໋ອກ = 0 ຄັນ (ຕ້ອງນຳເຂົ້າດ່ວນ)</span>
              </div>
            </div>
            <span className="text-3xl font-black font-mono text-red-400">
              {outOfStockItems.length}
            </span>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              {filterType === 'out_of_stock' && <Check className="w-3.5 h-3.5 text-red-400" />}
              <span>{filterType === 'out_of_stock' ? 'ກຳລັງສະແດງ' : 'ຄລິກເພື່ອກັ່ນຕອງເບິ່ງສະເພາະສິນຄ້າໝົດ'}</span>
            </span>
            <span className="font-mono text-red-400 font-bold">CRITICAL</span>
          </div>
        </div>

        {/* Low Stock Card */}
        <div 
          onClick={() => setFilterType(filterType === 'low_stock' ? 'all' : 'low_stock')}
          className={`p-6 rounded-3xl border transition-all cursor-pointer ${
            filterType === 'low_stock'
              ? 'bg-amber-950/40 border-amber-600 shadow-xl'
              : 'bg-zinc-950 border-zinc-800 hover:border-amber-900/60'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
              <div className="p-2 bg-amber-950/80 rounded-xl border border-amber-800">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-base">ສິນຄ້າໃກ້ຈະໝົດ (Low Stock Alert)</span>
                <span className="text-xs text-zinc-400 font-normal">ສະຕ໋ອກ = 1 ຄັນ (ແນະນຳໃຫ້ສັ່ງເພີ່ມ)</span>
              </div>
            </div>
            <span className="text-3xl font-black font-mono text-amber-400">
              {lowStockItems.length}
            </span>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              {filterType === 'low_stock' && <Check className="w-3.5 h-3.5 text-amber-400" />}
              <span>{filterType === 'low_stock' ? 'ກຳລັງສະແດງ' : 'ຄລິກເພື່ອກັ່ນຕອງເບິ່ງສະເພາະສິນຄ້າໃກ້ໝົດ'}</span>
            </span>
            <span className="font-mono text-amber-400 font-bold">WARNING</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterType === 'all'
                ? 'bg-white text-black'
                : 'text-zinc-400 hover:text-white bg-zinc-900'
            }`}
          >
            ທັງໝົດ ({totalAlertItems.length})
          </button>
          <button
            onClick={() => setFilterType('out_of_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterType === 'out_of_stock'
                ? 'bg-red-500 text-white'
                : 'text-red-400 hover:text-white bg-zinc-900'
            }`}
          >
            ໝົດສະຕ໋ອກ ({outOfStockItems.length})
          </button>
          <button
            onClick={() => setFilterType('low_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterType === 'low_stock'
                ? 'bg-amber-400 text-black'
                : 'text-amber-400 hover:text-white bg-zinc-900'
            }`}
          >
            ໃກ້ຈະໝົດ ({lowStockItems.length})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="ຄົ້ນຫາລຸ້ນ, VIN, ທະບຽນ, ສີ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Grid of Alert Cars */}
      {displayedItems.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-12 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">ບໍ່ມີລາຍການແຈ້ງເຕືອນໃນໝວດນີ້</h3>
          <p className="text-xs text-zinc-400">ສະຕ໋ອກລົດຢູ່ໃນລະດັບປົກກະຕິ ຫຼື ບໍ່ພົບຜົນການຄົ້ນຫາ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedItems.map((item) => (
            <div
              key={item.vin}
              className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                item.stockQuantity === 0
                  ? 'bg-zinc-950 border-red-900/80 hover:border-red-600'
                  : 'bg-zinc-950 border-amber-900/80 hover:border-amber-500'
              }`}
            >
              {/* Header: Status badge & Stock count */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {item.stockQuantity === 0 ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-800 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      ໝົດສະຕ໋ອກ (0 ຄັນ)
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      ໃກ້ຈະໝົດ (ເຫຼືອ 1 ຄັນ)
                    </span>
                  )}

                  <span className="font-mono text-zinc-400 text-xs">
                    ${item.priceUSD.toLocaleString()}
                  </span>
                </div>

                {/* Car Details */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 overflow-hidden flex-shrink-0 border border-zinc-800">
                    <img
                      src={item.image}
                      alt={item.model}
                      className="w-full h-full object-cover filter grayscale"
                    />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">{item.model}</h3>
                    <p className="text-xs text-zinc-400">{item.color}</p>
                    <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                      ທະບຽນ: <strong className="text-zinc-300">{item.plateNumber}</strong>
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800/80 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>ເລກຖັງ (VIN):</span>
                    <strong className="text-white">{item.vin}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>ທີ່ຕັ້ງສາງ:</span>
                    <span className="text-zinc-300">{item.location}</span>
                  </div>
                </div>
              </div>

              {/* Action Button: Opens Detailed Restock Form */}
              <div className="pt-4 border-t border-zinc-800/80 mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => handleOpenRestockModal(item, 1)}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <PackagePlus className="w-4 h-4 fill-black" />
                  <span>ຟອມເພີ່ມສະຕ໋ອກລົດ (Restock)</span>
                </button>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono px-1">
                  <span>ປ້ອນຈຳນວນ & ຂໍ້ມູນສາງຢ່າງລະອຽດ</span>
                  <span className="text-emerald-400 font-semibold">Verified Entry</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILED RESTOCK MODAL (ປ້ອນຈຳນວນ ແລະ ຂໍ້ມູນນຳເຂົ້າຢ່າງເໝາະສົມ) */}
      {selectedRestockItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    ຟອມບັນທຶກເພີ່ມສະຕ໋ອກລົດ (Inbound Restock)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    ກຳນົດຈຳນວນ, ສາງປາຍທາງ ແລະ ຂໍ້ມູນກວດສອບ PDI ຢ່າງຖືກຕ້ອງ
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
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">{selectedRestockItem.model}</h4>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    selectedRestockItem.stockQuantity === 0 ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    ສະຕ໋ອກປັດຈຸບັນ: {selectedRestockItem.stockQuantity} ຄັນ
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{selectedRestockItem.color} • {selectedRestockItem.trim || 'Standard'}</p>
                <p className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                  VIN: <strong className="text-zinc-300">{selectedRestockItem.vin}</strong> | ທະບຽນ: {selectedRestockItem.plateNumber}
                </p>
              </div>
            </div>

            {/* Restock Input Form */}
            <form onSubmit={handleConfirmRestock} className="space-y-4 text-xs">
              {/* Quantity to Add */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  ຈຳນວນຄັນທີ່ນຳເຂົ້າເພີ່ມ (Units to Restock) *
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
                            ? 'bg-emerald-500 text-black border-emerald-400 font-bold'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        +{n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Warehouse & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    ສາງເກັບຮັກສາ / ໂຊຣູມປາຍທາງ *
                  </label>
                  <select
                    value={restockWarehouse}
                    onChange={(e) => setRestockWarehouse(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ (Main Showroom)">ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ (Main Showroom)</option>
                    <option value="ສາງໃຫຍ່ດົງໂດກ (Dongdok Central Depot)">ສາງໃຫຍ່ດົງໂດກ (Central Depot)</option>
                    <option value="ສູນກວດສະພາບ PDI ຫຼັກ 8">ສູນກວດສະພາບ PDI ຫຼັກ 8</option>
                    <option value="ສາງພັກລົດດ່ານສາກົນບໍ່ເຕັນ">ສາງພັກລົດດ່ານສາກົນບໍ່ເຕັນ (ລາວ-ຈີນ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    ເລກທີໃບຮັບສິນຄ້າ (GRN / PO Ref) *
                  </label>
                  <input
                    type="text"
                    required
                    value={restockDocNo}
                    onChange={(e) => setRestockDocNo(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Supplier & PDI Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    ແຫຼ່ງຜະລິດ / ຜູ້ສະໜອງ (Supplier / Origin)
                  </label>
                  <input
                    type="text"
                    value={restockSupplier}
                    onChange={(e) => setRestockSupplier(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    ສະຖານະກວດກາ PDI ຫຼັງນຳເຂົ້າ
                  </label>
                  <select
                    value={restockPdiStatus}
                    onChange={(e) => setRestockPdiStatus(e.target.value as PDIStatus)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="passed">ຜ່ານການກວດ PDI 100% ພ້ອມຂາຍທັນທີ (Ready)</option>
                    <option value="in_progress">ກຳລັງກວດສອບ PDI 68 ຈຸດ (In Progress PDI)</option>
                    <option value="pending">ລໍຖ້າກວດສອບ PDI (Pending PDI)</option>
                  </select>
                </div>
              </div>

              {/* Stock Status Selection (ເພີ່ມສະຖານະ Event ແລະ ໂປຣໂມຊັນ) */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    <span>ສະຖານະສະຕ໋ອກລົດ (Stock Status) *</span>
                  </span>
                  {(restockStatus === 'event' || restockStatus === 'promotion') && (
                    <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded-full">
                      ຕ້ອງກຳນົດເວລາ
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockStatus('ready')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      restockStatus === 'ready'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">ພ້ອມຂາຍທັນທີ</span>
                    <span className="text-[10px] opacity-75">Ready to Sell</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockStatus('pdi')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      restockStatus === 'pdi'
                        ? 'bg-blue-950/80 border-blue-500 text-blue-300 shadow-sm'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold">ກຳລັງ PDI</span>
                    <span className="text-[10px] opacity-75">Inspection</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockStatus('event')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      restockStatus === 'event'
                        ? 'bg-amber-950/90 border-amber-400 text-amber-300 ring-2 ring-amber-500/30 font-bold shadow-lg'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-amber-300'
                    }`}
                  >
                    <span className="block font-bold flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>ງານ Event</span>
                    </span>
                    <span className="text-[10px] opacity-75">Motor Show/Expo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockStatus('promotion')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      restockStatus === 'promotion'
                        ? 'bg-purple-950/90 border-purple-400 text-purple-300 ring-2 ring-purple-500/30 font-bold shadow-lg'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-purple-300'
                    }`}
                  >
                    <span className="block font-bold flex items-center justify-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-purple-400" />
                      <span>ໂປຣໂມຊັນ</span>
                    </span>
                    <span className="text-[10px] opacity-75">Special Promo</span>
                  </button>
                </div>
              </div>

              {/* TIMEFRAME & SCHEDULE (ເມື່ອເລືອກສະຖານະ Event ຫຼື ໂປຣໂມຊັນ) */}
              {(restockStatus === 'event' || restockStatus === 'promotion') && (
                <div className="bg-gradient-to-b from-amber-950/40 via-zinc-950 to-zinc-950 border-2 border-amber-500/70 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-amber-400 text-black rounded-lg">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-extrabold text-white text-xs sm:text-sm">
                          ກຳນົດເວລາສິນຄ້າ {restockStatus === 'event' ? 'ງານ Event' : 'ໂປຣໂມຊັນ'} (Schedule & Timeframe)
                        </h4>
                        <p className="text-[11px] text-amber-300/80">
                          ກຳນົດໄລຍະເວລາຈັດງານ ຫຼື ຊ່ວງແຄມເປນໂປຣໂມຊັນໃຫ້ຊັດເຈນ
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-400 text-black font-bold uppercase">
                      ບັງຄັບກຳນົດເວລາ
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Campaign Title */}
                    <div className="sm:col-span-2">
                      <label className="block text-amber-200 mb-1 font-bold">
                        ຊື່ງານ Event / ຊື່ແຄມເປນໂປຣໂມຊັນ (Campaign Title) *
                      </label>
                      <input
                        type="text"
                        required
                        value={restockEventCampaign}
                        onChange={(e) => setRestockEventCampaign(e.target.value)}
                        placeholder={restockStatus === 'event' ? 'e.g. ງານ Vientiane Motor Expo 2026' : 'e.g. ໂປຣໂມຊັນພິເສດ Mid-Year EV Special'}
                        className="w-full bg-zinc-900 border border-amber-500/50 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-amber-200 mb-1 font-bold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>ວັນທີເລີ່ມຕົ້ນ (Start Date) *</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={restockEventStartDate}
                        onChange={(e) => setRestockEventStartDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-amber-500/50 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="block text-amber-200 mb-1 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>ວັນທີສິ້ນສຸດ (End Date) *</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {[7, 14, 30].map(days => (
                            <button
                              key={days}
                              type="button"
                              onClick={() => handleSetQuickPresetDays(days)}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-amber-400 hover:text-black text-zinc-300 transition-colors"
                            >
                              +{days}ວັນ
                            </button>
                          ))}
                        </div>
                      </label>
                      <input
                        type="date"
                        required
                        value={restockEventEndDate}
                        onChange={(e) => setRestockEventEndDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-amber-500/50 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Event Location */}
                    <div>
                      <label className="block text-zinc-300 mb-1 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        <span>ສະຖານທີ່ຈັດງານ / ພື້ນທີ່ໂຊຣູມ</span>
                      </label>
                      <input
                        type="text"
                        value={restockEventLocation}
                        onChange={(e) => setRestockEventLocation(e.target.value)}
                        placeholder="e.g. ສູນການຄ້າ ITECC Mall ບູດ A-04"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                      />
                    </div>

                    {/* Promotion Discount */}
                    <div>
                      <label className="block text-zinc-300 mb-1 font-medium flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-zinc-400" />
                        <span>ສ່ວນຫຼຸດພິເສດ ($ USD)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={restockPromoDiscountUSD}
                        onChange={(e) => setRestockPromoDiscountUSD(Number(e.target.value) || 0)}
                        placeholder="e.g. 2000"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>

                    {/* Promotion / Gift notes */}
                    <div className="sm:col-span-2">
                      <label className="block text-zinc-300 mb-1 font-medium">
                        ຂອງແຖມ & ເງື່ອນໄຂພິເສດໃນຊ່ວງເວລານີ້
                      </label>
                      <input
                        type="text"
                        value={restockPromoNotes}
                        onChange={(e) => setRestockPromoNotes(e.target.value)}
                        placeholder="e.g. ແຖມປະກັນໄພຊັ້ນ 1 + Home Charger 7kW + ຄ່າບຳລຸງຮັກສາຟຣີ 5 ປີ"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Officer & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    ຜູ້ຮັບຜິດຊອບບັນທຶກ (Officer Name)
                  </label>
                  <input
                    type="text"
                    value={restockOfficer}
                    onChange={(e) => setRestockOfficer(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    ໝາຍເຫດເພີ່ມເຕີມ (Restock Notes)
                  </label>
                  <input
                    type="text"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                    placeholder="e.g. ລົດນຳເຂົ້າເພີ່ມເຕີມຕອບສະໜອງຄວາມຕ້ອງການ..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Result Preview Notice */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-emerald-300 text-[11px] flex items-center justify-between">
                <span>ສະຕ໋ອກລົດຈະເພີ່ມຈາກ {selectedRestockItem.stockQuantity} ຄັນ ເປັນ:</span>
                <strong className="font-mono text-sm font-black text-white">
                  {selectedRestockItem.stockQuantity + restockQty} ຄັນ
                </strong>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedRestockItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-semibold"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>ຢືນຢັນການເພີ່ມສະຕ໋ອກ (+{restockQty} ຄັນ)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
