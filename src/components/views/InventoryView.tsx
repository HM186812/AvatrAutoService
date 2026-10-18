import { useState, useMemo } from 'react';
import { InventoryItem, VehicleModel, Language, StockStatus, PDIStatus, StockLogRecord, SaleLogRecord, SystemUser, InvoiceBillRecord } from '../../types';
import { translations } from '../../data/translations';
import { getModelStockSummaries, LOW_STOCK_THRESHOLD } from '../../data/stockSummary';
import { 
  saveInventoryItemToSupabase, 
  deleteInventoryItemFromSupabase 
} from '../../supabase';
import { ConfirmDeleteModal } from '../modals';
import { 
  Car, 
  Search, 
  Filter,
  Plus, 
  Edit3, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  FileText, 
  X, 
  DollarSign, 
  MapPin, 
  History,
  Check,
  ShoppingBag,
  UserCheck,
  Sparkles,
  Printer,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  PackagePlus,
  Trash2,
  Upload,
  Calendar,
  Lock,
  AlertTriangle,
  Image as ImageIcon,
  LayoutGrid,
  List
} from 'lucide-react';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl, formatWhatsAppDisplay, openWhatsApp } from '../../utils/whatsapp';
import { newRecordId } from '../../backend/ids';
import { saveBillRecord } from '../../backend/data';

interface InventoryViewProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setBills: React.Dispatch<React.SetStateAction<InvoiceBillRecord[]>>;
  stockLogs: StockLogRecord[];
  setStockLogs: React.Dispatch<React.SetStateAction<StockLogRecord[]>>;
  vehicles: VehicleModel[];
  setVehicles?: React.Dispatch<React.SetStateAction<VehicleModel[]>>;
  currentUser?: SystemUser;
  isSuperAdmin?: boolean;
  lang: Language;
  onOpenQuote: (vehicle: VehicleModel, customerName?: string) => void;
  onNavigateToStockIn?: () => void;
}

export default function InventoryView({
  inventory,
  setInventory,
  setBills,
  stockLogs,
  setStockLogs,
  vehicles,
  setVehicles,
  currentUser,
  isSuperAdmin = false,
  lang,
  onOpenQuote,
  onNavigateToStockIn,
}: InventoryViewProps) {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'inventory' | 'sales_history'>('inventory');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'stock_in' | 'stock_out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>('all');
  const [eventPromoFilter, setEventPromoFilter] = useState<'all' | 'event_only' | 'standard'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Model Stock Summaries (< 5 alert)
  const modelSummaries = useMemo(() => {
    return getModelStockSummaries(vehicles, inventory);
  }, [vehicles, inventory]);

  const lowStockModels = useMemo(() => {
    return modelSummaries.filter(m => m.isLowStock || m.isOutOfStock);
  }, [modelSummaries]);

  // EDIT VEHICLE MODAL STATE (USD Only)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<number>(0);

  const handleEditPriceChange = (val: number) => {
    setEditPriceValue(val);
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      priceUSD: val,
      priceLAK: Math.round(val * 22000),
    });
  };

  // Toast message
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3800);
  };

  // 3. EDIT CAR HANDLER
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const originalItem = inventory.find(i => i.vin === editingItem.vin);
    const updatedItem = {
      ...editingItem,
      stockQuantity: originalItem ? originalItem.stockQuantity : editingItem.stockQuantity,
      color: editingItem.color?.trim() || '-',
      priceLAK: editingItem.priceUSD * 22000,
    };

    try {
      await saveInventoryItemToSupabase(updatedItem);
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Vehicle could not be saved.');
      return;
    }
    setInventory(prev => prev.map(item => item.vin === editingItem.vin ? updatedItem : item));

    triggerToast(`ອັບເດດຂໍ້ມູນລົດ ${editingItem.model} (VIN: ${editingItem.vin}) ສຳເລັດ! (Cloud Synced)`);
    setEditingItem(null);
  };

  // DELETE VEHICLE HANDLER (ລົບສິນຄ້າອອກຈາກຖານຂໍ້ມູນ - Admin only with ConfirmDeleteModal)
  const [inventoryToDelete, setInventoryToDelete] = useState<InventoryItem | null>(null);
  const [isDeletingInventory, setIsDeletingInventory] = useState(false);

  const handleRequestDeleteItem = (item: InventoryItem) => {
    if (!isSuperAdmin) {
      triggerToast('ສະເພາະ Admin ເທົ່ານັ້ນທີ່ມີສິດລົບລົດອອກຈາກຖານຂໍ້ມູນ!');
      return;
    }
    if (item.status === 'sold') {
      triggerToast('ລົດຄັນນີ້ຂາຍອອກແລ້ວ! ກະລຸນາລົບບິນຂາຍໃນໜ້າຈັດການບິນກ່ອນ.');
      return;
    }
    setInventoryToDelete(item);
  };

  const handleConfirmDeleteInventory = async () => {
    if (!inventoryToDelete) return;
    setIsDeletingInventory(true);
    const target = inventoryToDelete;

    try {
      await deleteInventoryItemFromSupabase(target.vin);
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Vehicle could not be deleted.');
      setIsDeletingInventory(false);
      return;
    }
    setInventory(prev => prev.filter(item => item.vin !== target.vin));
    setBills(prev => prev.filter(bill => bill.vin !== target.vin));
    setStockLogs(prev => prev.filter(log => log.vin !== target.vin));
    if (editingItem?.vin === target.vin) {
      setEditingItem(null);
    }
    setIsDeletingInventory(false);
    setInventoryToDelete(null);
    triggerToast(`ລົບລົດ ${target.model} (VIN: ${target.vin}) ອອກຈາກຖານຂໍ້ມູນສຳເລັດແລ້ວ!`);
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingItem) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditingItem({
          ...editingItem,
          image: event.target?.result as string,
        });
        triggerToast('ອັບໂຫຼດຮູບລົດຈາກອຸປະກອນສຳເລັດ!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtered Inventory
  const filteredInventory = inventory.filter(item => {
    if (selectedStatusFilter === 'all') {
      if (item.status === 'sold' || item.stockQuantity === 0) return false;
    } else if (item.status !== selectedStatusFilter) {
      return false;
    }
    if (selectedModelFilter !== 'all' && item.model !== selectedModelFilter) return false;
    if (eventPromoFilter === 'event_only' && !item.eventCampaign) return false;
    if (eventPromoFilter === 'standard' && item.eventCampaign) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.vin.toLowerCase().includes(q) ||
        (item.plateNumber || '').toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        (item.color || '').toLowerCase().includes(q)
      );
    }
    return true;
  });
  const filteredStockLogs = stockLogs.filter(log => (
    historyFilter === 'all' || log.type === historyFilter
  ));
  const withoutStageNumber = (label: string) => label.replace(/^\d+\.\s*/, '');
  const inventoryStatusLabels: Record<StockStatus, string> = {
    ready: t.readyForSale,
    pdi: withoutStageNumber(t.stage2PDI),
    imported: withoutStageNumber(t.stage1Imported),
    reserved: withoutStageNumber(t.stage4Reserved),
    sold: lang === 'lo' ? 'ຂາຍແລ້ວ' : lang === 'th' ? 'ขายแล้ว' : 'Sold',
    event: withoutStageNumber(t.stage5Event),
    promotion: withoutStageNumber(t.stage6Promo),
  };
  const pdiStatusLabel = (status: PDIStatus) => {
    if (status === 'passed') return t.pdiPassedLabel;
    if (status === 'in_progress') return t.stage2PDI;
    return t.pdiPendingLabel;
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-zinc-900 border border-zinc-700 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="theme-adaptive-dark-surface relative overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-br from-zinc-900 via-zinc-950 to-black p-5 shadow-xl sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/4 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-xl bg-white p-2 text-black shadow-sm">
                <Car className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-300">
                VEHICLE INVENTORY MANAGEMENT
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {t.inventoryViewTitle}
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-zinc-400 sm:text-sm">
              {t.inventoryViewSubtitle}
            </p>
          </div>

        {/* Tab Toggle: Stock vs History Logs */}
        <div className="inventory-tabs grid w-full grid-cols-2 items-center gap-1 rounded-2xl border border-zinc-800 bg-black/30 p-1.5 text-xs xl:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            aria-pressed={activeTab === 'inventory'}
            className={`inventory-tab px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'inventory-tab-active bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>{t.tabStockList} ({inventory.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sales_history')}
            aria-pressed={activeTab === 'sales_history'}
            className={`inventory-tab px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'sales_history'
                ? 'inventory-tab-active bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t.tabStockHistory} ({stockLogs.length})</span>
          </button>
        </div>
        </div>
      </div>

      {activeTab === 'inventory' ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              {
                label: lang === 'lo' ? 'ລົດໃນສາງ' : lang === 'th' ? 'รถในคลัง' : 'Vehicles in stock',
                value: inventory.reduce((total, item) => total + item.stockQuantity, 0),
                caption: lang === 'lo' ? `${inventory.length} ລາຍການ VIN` : lang === 'th' ? `${inventory.length} รายการ VIN` : `${inventory.length} VIN records`,
                icon: Car,
                tone: 'text-zinc-200',
              },
              {
                label: lang === 'lo' ? 'ພ້ອມຂາຍ' : lang === 'th' ? 'พร้อมขาย' : 'Ready for sale',
                value: inventory.filter(item => item.status === 'ready').reduce((total, item) => total + item.stockQuantity, 0),
                caption: t.stage3Ready,
                icon: CheckCircle2,
                tone: 'text-emerald-300',
              },
              {
                label: lang === 'lo' ? 'ກຳລັງກຽມລົດ' : lang === 'th' ? 'กำลังเตรียมรถ' : 'In preparation',
                value: inventory.filter(item => item.status === 'pdi' || item.status === 'imported').reduce((total, item) => total + item.stockQuantity, 0),
                caption: `${t.stage2PDI} · ${t.stage1Imported}`,
                icon: Clock,
                tone: 'text-amber-300',
              },
              {
                label: lang === 'lo' ? 'ລົດ Event / ໂປຣໂມຊັນ' : lang === 'th' ? 'รถอีเวนต์ / โปรโมชัน' : 'Event / promotion',
                value: inventory.filter(item => item.status === 'event' || item.status === 'promotion' || Boolean(item.eventCampaign)).reduce((total, item) => total + item.stockQuantity, 0),
                caption: lang === 'lo' ? 'ລົດທີ່ກຳນົດແຄມເປນ' : lang === 'th' ? 'รถที่กำหนดแคมเปญ' : 'Campaign vehicles',
                icon: Sparkles,
                tone: 'text-blue-300',
              },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-zinc-400">{metric.label}</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-white">{metric.value.toLocaleString()}</p>
                    </div>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-900 ${metric.tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 truncate text-[10px] text-zinc-500">{metric.caption}</p>
                </div>
              );
            })}
          </div>

          {/* MODEL CATEGORY STOCK SUMMARY & LOW-STOCK (< 5) ALERT BANNER */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-black shadow-sm">
                  <Car className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">
                      {lang === 'lo' ? 'ຍອດລວມສະຕ໋ອກຕາມໝວດລຸ້ນລົດ' : lang === 'th' ? 'สรุปสต็อกตามหมวดรุ่นรถ' : 'Stock Summary by Model Category'}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                      ເກນເຕືອນ &lt; {LOW_STOCK_THRESHOLD} ຄັນ
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {lang === 'lo'
                      ? 'ລົດແຕ່ລະຄັນມີເລກຖັງ (VIN) ແລະ ເລກຈັກ 1:1 ສະເພາະຕົວ · ສະຫຼຸບຈຳນວນລວມທັງໝົດຕາມໝວດລຸ້ນລົດ'
                      : lang === 'th'
                      ? 'รถแต่ละคันมี VIN และเลขเครื่อง 1:1 เฉพาะตัว · รวมจำนวนทั้งหมดตามหมวดรุ่นรถ'
                      : 'Each car has a unique VIN and engine number · Aggregated by model'}
                  </p>
                </div>
              </div>

              {lowStockModels.length > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                  <span>
                    {lang === 'lo'
                      ? `ມີ ${lowStockModels.length} ລຸ້ນ ທີ່ສະຕ໋ອກຕ່ຳກວ່າ ${LOW_STOCK_THRESHOLD} ຄັນ!`
                      : lang === 'th'
                      ? `มี ${lowStockModels.length} รุ่น ที่สต็อกต่ำกว่า ${LOW_STOCK_THRESHOLD} คัน!`
                      : `${lowStockModels.length} models have low stock (< ${LOW_STOCK_THRESHOLD})`}
                  </span>
                </div>
              )}
            </div>

            {/* Models Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {modelSummaries.map((summary) => {
                const isSelected = selectedModelFilter === summary.modelName;
                return (
                  <button
                    key={summary.modelName}
                    type="button"
                    onClick={() => {
                      setSelectedModelFilter(isSelected ? 'all' : summary.modelName);
                    }}
                    className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                      isSelected
                        ? 'border-white bg-zinc-900 ring-2 ring-white/20'
                        : summary.isOutOfStock
                        ? 'border-red-500/30 bg-red-950/10 hover:border-red-500/60'
                        : summary.isLowStock
                        ? 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/60'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                      {/* Model Logo / Photo */}
                      <div className="w-14 h-11 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shrink-0 flex items-center justify-center shadow-inner">
                        {summary.model?.heroImage ? (
                          <img
                            src={summary.model.heroImage}
                            alt={summary.modelName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Car className="w-5 h-5 text-zinc-600" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block truncate">
                            {summary.category}
                          </span>
                          {summary.isOutOfStock ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                              ໝົດ (0)
                            </span>
                          ) : summary.isLowStock ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              &lt; 5
                            </span>
                          ) : (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ປົກກະຕິ
                            </span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-sm text-white truncate group-hover:text-zinc-200 mt-0.5">
                          {summary.modelName}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between mt-3">
                      <span className="text-xs text-zinc-400">
                        {lang === 'lo' ? 'ຍອດລວມພ້ອມຂາຍ:' : lang === 'th' ? 'พร้อมขาย:' : 'Available:'}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-mono font-black ${
                          summary.isOutOfStock ? 'text-red-400' : summary.isLowStock ? 'text-amber-300' : 'text-white'
                        }`}>
                          {summary.count}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">ຄັນ</span>
                      </div>
                    </div>

                    {/* Progress Gauge to 5 units */}
                    <div className="mt-2 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          summary.isOutOfStock ? 'bg-red-500' : summary.isLowStock ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, (summary.count / LOW_STOCK_THRESHOLD) * 100)}%` }}
                      />
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>ຂາຍແລ້ວ: {summary.soldCount} ຄັນ</span>
                      <span className={isSelected ? 'text-white font-bold' : 'text-zinc-400 group-hover:text-white'}>
                        {isSelected ? '✓ ກຳລັງກອງ' : 'ຄລິກເພື່ອກອງ →'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DEALERSHIP QUICK ACTIONS BAR */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Car className="w-4 h-4 text-white" />
                <span>{t.inventoryViewTitle}</span>
              </div>
              <p className="text-zinc-400 text-xs">
                {t.inventoryStagesSubtitle}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2.5">
              {onNavigateToStockIn && (
                <button
                  type="button"
                  onClick={onNavigateToStockIn}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-bold text-black shadow-md transition-all hover:bg-zinc-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.quickStockInBtn}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="inventory-filter-panel rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-xs shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
                  <Filter className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="inventory-filter-title text-sm font-semibold text-white">
                    {lang === 'lo' ? 'ຄົ້ນຫາ ແລະ ຕົວກອງ' : lang === 'th' ? 'ค้นหาและตัวกรอง' : 'Search & filters'}
                  </h2>
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    {lang === 'lo' ? 'ຄົ້ນຫາລົດຕາມຂໍ້ມູນ ແລະ ກຳນົດເງື່ອນໄຂ' : lang === 'th' ? 'ค้นหารถตามข้อมูลและเลือกเงื่อนไข' : 'Find vehicles by details and narrow results'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inventory-filter-count inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-[11px] text-zinc-400" aria-live="polite">
                  <strong className="text-white">{filteredInventory.length.toLocaleString()}</strong>
                  <span className="text-zinc-500">/ {inventory.length.toLocaleString()}</span>
                  <span>{lang === 'lo' ? 'ລາຍການ' : lang === 'th' ? 'รายการ' : 'vehicles'}</span>
                </span>
                {(searchQuery.trim() || selectedStatusFilter !== 'all' || selectedModelFilter !== 'all' || eventPromoFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedStatusFilter('all');
                      setSelectedModelFilter('all');
                      setEventPromoFilter('all');
                    }}
                    className="inventory-filter-reset inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  >
                    <X className="h-3.5 w-3.5" />
                    {lang === 'lo' ? 'ລ້າງຕົວກອງ' : lang === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <label className="inventory-filter-field min-w-0 sm:col-span-2 xl:col-span-2">
                <span className="inventory-filter-label mb-1.5 block text-[10px] font-semibold text-zinc-500">
                  {lang === 'lo' ? 'ຄົ້ນຫາລົດ' : lang === 'th' ? 'ค้นหารถ' : 'Search vehicles'}
                </span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label={lang === 'lo' ? 'ຄົ້ນຫາ VIN, ປ້າຍທະບຽນ, ລຸ້ນ ຫຼື ສີ' : lang === 'th' ? 'ค้นหา (VIN, ทะเบียน, รุ่น, สี)' : 'Search VIN, plate, model, or color'}
                    className={`min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      searchQuery ? 'pr-10' : 'pr-3'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label={lang === 'lo' ? 'ລ້າງຄຳຄົ້ນຫາ' : lang === 'th' ? 'ล้างคำค้นหา' : 'Clear search'}
                      className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </label>

              <label className="inventory-filter-field min-w-0">
                <span className="inventory-filter-label mb-1.5 block text-[10px] font-semibold text-zinc-500">{t.tableStatus}</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">{t.filterAllStatus}</option>
                  <option value="ready">{t.stage3Ready}</option>
                  <option value="pdi">{t.stage2PDI}</option>
                  <option value="imported">{t.stage1Imported}</option>
                  <option value="reserved">{t.stage4Reserved}</option>
                  <option value="event">{t.stage5Event}</option>
                  <option value="promotion">{t.stage6Promo}</option>
                  <option value="sold">{t.stockSold}</option>
                </select>
              </label>

              <label className="inventory-filter-field min-w-0">
                <span className="inventory-filter-label mb-1.5 block text-[10px] font-semibold text-zinc-500">{t.tableModel}</span>
                <select
                  value={selectedModelFilter}
                  onChange={(e) => setSelectedModelFilter(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">{t.filterAllModels} ({vehicles.length})</option>
                  {vehicles.map((v) => (
                    <option key={v.id || v.name} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </label>

              <label className="inventory-filter-field min-w-0 sm:col-span-2 xl:col-span-1">
                <span className="inventory-filter-label mb-1.5 block text-[10px] font-semibold text-zinc-500">
                  {lang === 'lo' ? 'ງານສະແດງ ແລະ ໂປຣໂມຊັນ' : lang === 'th' ? 'อีเวนต์ / โปรโมชัน' : 'Event / promotion'}
                </span>
                <select
                  value={eventPromoFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'all' || value === 'event_only' || value === 'standard') {
                      setEventPromoFilter(value);
                    }
                  }}
                  className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">{t.filterAllEventPromo}</option>
                  <option value="event_only">{t.filterEventOnly}</option>
                  <option value="standard">{t.filterStandardOnly}</option>
                </select>
              </label>
            </div>

          </div>

          {/* VEHICLE STOCK OVERVIEW & VIEW MODE TOGGLE */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400">
                {lang === 'lo'
                  ? `ລາຍການລົດທັງໝົດ: ${filteredInventory.length} ຄັນ`
                  : lang === 'th'
                  ? `รายการรถทั้งหมด: ${filteredInventory.length} คัน`
                  : `Showing ${filteredInventory.length} vehicles`}
              </span>
              {filteredInventory.length < inventory.length && (
                <span className="text-[11px] text-zinc-500 font-mono">
                  ({lang === 'lo' ? `ຈາກສາງ ${inventory.length} ຄັນ` : `of ${inventory.length}`})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={lang === 'lo' ? 'ມຸມມອງກາດກະທັດຮັດ (Compact Grid)' : 'Compact Grid View'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[11px]">{lang === 'lo' ? 'ກາດ' : 'Grid'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={lang === 'lo' ? 'ມຸມມອງຕາຕະລາງພາບລວມ (Table Overview)' : 'Table Overview'}
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[11px]">{lang === 'lo' ? 'ຕາຕະລາງ' : 'Table'}</span>
              </button>
            </div>
          </div>

          {/* VEHICLE STOCK CARDS LIST / TABLE */}
          {filteredInventory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 px-5 py-14 text-center">
              <Car className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
              <h3 className="text-sm font-semibold text-white">
                {t.noInventoryFound}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {lang === 'lo' ? 'ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ຕົວກອງ ແລ້ວຄົ້ນຫາອີກຄັ້ງ' : lang === 'th' ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง แล้วค้นหาอีกครั้ง' : 'Try changing your search or filters.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredInventory.map((item) => {
              const vehicle = vehicles.find(v => v.name === item.model) || vehicles[0];

              return (
                <div
                  key={item.vin}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden flex flex-col justify-between transition-all hover:shadow-xl group"
                >
                  {/* Compact Image & Badges */}
                  <div className="relative h-32 bg-zinc-900 overflow-hidden">
                    <img
                      src={item.image || vehicle?.heroImage || '/avatr-logo.png'}
                      alt={item.model}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        if (vehicle?.heroImage && target.src !== vehicle.heroImage) {
                          target.src = vehicle.heroImage;
                        } else {
                          target.src = '/avatr-logo.png';
                        }
                      }}
                      className="w-full h-full object-cover filter contrast-125 transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Status Badge */}
                    <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-950/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-md">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          item.status === 'ready' ? 'bg-emerald-400'
                            : item.status === 'pdi' ? 'bg-amber-400'
                            : item.status === 'sold' ? 'bg-zinc-400'
                            : item.status === 'reserved' ? 'bg-violet-400'
                            : 'bg-sky-400'
                        }`} />
                        {inventoryStatusLabels[item.status]}
                      </span>
                    </div>

                    {/* Stock Quantity Badge (Top Right) */}
                    <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-md font-mono ${
                      item.stockQuantity === 0
                        ? 'stock-badge-out bg-zinc-950/90 text-zinc-400 border border-zinc-800'
                        : item.stockQuantity < 5
                        ? 'stock-badge-low bg-amber-950/90 text-amber-300 border border-amber-500/80 shadow-amber-950/40'
                        : 'stock-badge-normal bg-black/85 text-white border border-zinc-700 always-white-text'
                    }`}>
                      {item.stockQuantity < 5 && item.stockQuantity > 0 ? (
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 animate-pulse stock-low-icon" />
                      ) : (
                        <Car className="w-3 h-3 text-zinc-300 shrink-0 stock-normal-icon" />
                      )}
                      <span>
                        {item.stockQuantity} {t.unitCars}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-zinc-700 text-right shadow-md always-white-text">
                      <span className="text-xs font-black font-mono text-white tracking-tight" style={{ color: '#ffffff' }}>
                        ${item.priceUSD.toLocaleString()}
                      </span>
                    </div>

                    {/* Event & Promotion Badge */}
                    {item.eventCampaign && (
                      <div className="absolute bottom-2 left-2 bg-white text-black px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-md flex items-center gap-1 backdrop-blur-md border border-zinc-300">
                        <Sparkles className="w-2.5 h-2.5 fill-black" />
                        <span className="truncate max-w-28">{item.eventCampaign}</span>
                      </div>
                    )}
                  </div>

                  {/* Body Details */}
                  <div className="flex flex-1 flex-col justify-between gap-2.5 p-3">
                    <div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold tracking-tight text-white truncate">{item.model}</h3>
                        <p className="text-[11px] truncate text-zinc-400">{item.color || '—'}{item.trim ? ` · ${item.trim}` : ''}</p>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <span>{lang === 'lo' ? 'ທະບຽນ' : lang === 'th' ? 'ทะเบียน' : 'Plate'}:</span>
                        <strong className="font-medium text-zinc-200">{item.plateNumber || '—'}</strong>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-zinc-850 bg-zinc-900/50 p-2 text-[10px]">
                      <div className="min-w-0">
                        <span className="block text-zinc-500 text-[9px]">{t.tableVin}</span>
                        <strong className="block truncate font-mono text-zinc-300" title={item.vin}>{item.vin}</strong>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-zinc-500 text-[9px]">PDI</span>
                        <strong className={`block truncate font-semibold ${item.pdiStatus === 'passed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {pdiStatusLabel(item.pdiStatus)}
                        </strong>
                      </div>
                      <div className="min-w-0 col-span-2">
                        <span className="block text-zinc-500 text-[9px]">{lang === 'lo' ? 'ທີ່ຕັ້ງ' : 'Location'}</span>
                        <strong className="block truncate text-zinc-400 font-normal" title={item.location || ''}>{item.location || '—'}</strong>
                      </div>
                    </div>

                    {/* ACTION BUTTONS: ແກ້ໄຂ (Edit) & ລົບ (Delete) */}
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-1.5">
                      {/* ແກ້ໄຂ (Edit) Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setEditPriceValue(item.priceUSD);
                        }}
                        className="flex min-h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-zinc-400" />
                        <span>{t.edit}</span>
                      </button>

                      {/* ລົບ (Delete) Button */}
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteItem(item)}
                        className="flex min-h-8 items-center justify-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
                        title={t.btnDeleteCar}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          ) : (
          /* TABLE OVERVIEW VIEW */
          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="border-b border-zinc-800 bg-zinc-900/90 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3">ພາບ</th>
                  <th className="py-2.5 px-3">ລຸ້ນ / Trim</th>
                  <th className="py-2.5 px-3 font-mono">VIN / ປ້າຍ</th>
                  <th className="py-2.5 px-3">ສີ</th>
                  <th className="py-2.5 px-3">ສະຖານະ</th>
                  <th className="py-2.5 px-3">PDI</th>
                  <th className="py-2.5 px-3 text-center">ຈຳນວນ</th>
                  <th className="py-2.5 px-3 text-right">ລາຄາ (USD)</th>
                  <th className="py-2.5 px-3 text-center">ຈັດການ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredInventory.map((item) => {
                  const vehicle = vehicles.find(v => v.name === item.model) || vehicles[0];
                  return (
                    <tr key={item.vin} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-2 px-3">
                        <img
                          src={item.image || vehicle?.heroImage || '/avatr-logo.png'}
                          alt={item.model}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = '/avatr-logo.png';
                          }}
                          className="w-12 h-8 rounded-lg object-cover border border-zinc-800 shrink-0"
                        />
                      </td>
                      <td className="py-2 px-3 font-semibold text-white">
                        <div className="font-bold">{item.model}</div>
                        <div className="text-[10px] text-zinc-400 font-normal">{item.trim || 'Standard'}</div>
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">
                        <div className="text-zinc-200">{item.vin}</div>
                        <div className="text-[10px] text-zinc-500">{item.plateNumber || '—'}</div>
                      </td>
                      <td className="py-2 px-3 text-zinc-300 text-xs">
                        {item.color || '—'}
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            item.status === 'ready' ? 'bg-emerald-400'
                              : item.status === 'pdi' ? 'bg-amber-400'
                              : item.status === 'sold' ? 'bg-zinc-400'
                              : item.status === 'reserved' ? 'bg-violet-400'
                              : 'bg-sky-400'
                          }`} />
                          {inventoryStatusLabels[item.status]}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] font-semibold ${item.pdiStatus === 'passed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {pdiStatusLabel(item.pdiStatus)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold">
                        <span className={item.stockQuantity < 5 && item.stockQuantity > 0 ? 'text-amber-400' : 'text-zinc-200'}>
                          {item.stockQuantity}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-white">
                        ${item.priceUSD.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setEditPriceValue(item.priceUSD);
                            }}
                            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
                            title={t.edit}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteItem(item)}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 border border-zinc-800 cursor-pointer"
                            title={t.btnDeleteCar}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
      ) : (
        /* STOCK-IN & STOCK-OUT TRANSACTION HISTORY TAB */
        <div className="space-y-4 text-xs">
          {/* Summary Cards for Stock Movement */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Stock In Summary */}
            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="font-semibold text-xs text-zinc-300 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>{t.historyStockIn}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">
                  INBOUND
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                {stockLogs.filter(l => l.type === 'stock_in').reduce((acc, curr) => acc + curr.quantity, 0)} <span className="text-xs text-zinc-400 font-sans">{t.unitCars}</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                {stockLogs.filter(l => l.type === 'stock_in').length} {t.unitBills}
              </p>
            </div>

            {/* Stock Out Summary */}
            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="font-semibold text-xs text-zinc-300 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-zinc-300" />
                  <span>{t.historyStockOut}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">
                  OUTBOUND
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                {stockLogs.filter(l => l.type === 'stock_out').length} <span className="text-xs text-zinc-400 font-sans">{t.unitCars}</span>
              </div>
              <div className="text-[11px] text-white font-mono font-bold mt-1">
                ${stockLogs.filter(l => l.type === 'stock_out').reduce((acc, curr) => acc + curr.priceUSD, 0).toLocaleString()}
              </div>
            </div>

            {/* In-Stock Balance Summary */}
            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="font-semibold text-xs text-zinc-300 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-zinc-300" />
                  <span>{t.stockAvailable}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">
                  BALANCE
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                {inventory.reduce((acc, curr) => acc + curr.stockQuantity, 0)} <span className="text-xs text-zinc-400 font-sans">{t.unitCars}</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                {inventory.filter(i => i.status === 'ready').reduce((acc, item) => acc + item.stockQuantity, 0)} {t.unitCars} {t.readyForSale}
              </p>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-base text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-white" />
                  <span>{t.tabStockHistory}</span>
                </h2>
                <p className="text-zinc-400 text-xs mt-0.5">
                  {t.billsSubtitle}
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setHistoryFilter('all')}
                  aria-pressed={historyFilter === 'all'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    historyFilter === 'all'
                      ? 'bg-white text-black shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {t.filterAll} ({stockLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('stock_in')}
                  aria-pressed={historyFilter === 'stock_in'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    historyFilter === 'stock_in'
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>{t.badgeImport}</span>
                  <span className="font-mono">({stockLogs.filter(l => l.type === 'stock_in').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('stock_out')}
                  aria-pressed={historyFilter === 'stock_out'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    historyFilter === 'stock_out'
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{t.badgeSale}</span>
                  <span className="font-mono">({stockLogs.filter(l => l.type === 'stock_out').length})</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-900 text-zinc-400 font-medium border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">{t.billType} / ID</th>
                    <th className="py-3 px-4">{t.billDate}</th>
                    <th className="py-3 px-4">{t.tableModel} & VIN</th>
                    <th className="py-3 px-4">{t.buyerInfo}</th>
                    <th className="py-3 px-4">{t.billAmount} (USD)</th>
                    <th className="py-3 px-4">{t.tableStock}</th>
                    <th className="py-3 px-4">{t.assignedOfficer}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 font-mono">
                  {filteredStockLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center">
                        <History className="mx-auto mb-3 h-9 w-9 text-zinc-600" />
                        <p className="text-sm font-semibold text-white">
                          {lang === 'lo' ? 'ຍັງບໍ່ມີປະຫວັດລາຍການ' : lang === 'th' ? 'ไม่พบประวัติรายการ' : 'No stock history found'}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {lang === 'lo' ? 'ລອງເລືອກຕົວກອງປະເພດອື່ນ' : lang === 'th' ? 'ลองเลือกตัวกรองประเภทอื่น' : 'Try selecting another transaction filter.'}
                        </p>
                      </td>
                    </tr>
                  ) : filteredStockLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="py-3 px-4">
                          {log.type === 'stock_in' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1 w-max">
                              <ArrowDownLeft className="w-3 h-3 text-zinc-300" />
                              <span>{t.historyStockIn}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1 w-max">
                              <ArrowUpRight className="w-3 h-3 text-zinc-300" />
                              <span>{t.historyStockOut}</span>
                            </span>
                          )}
                          <span className="text-zinc-500 text-[10px] block mt-1">{log.id}</span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 text-[11px] font-sans">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-4">
                          <strong className="text-white font-sans block text-xs">{log.model}</strong>
                          <span className="text-zinc-400 text-[11px] block">{log.vin}</span>
                          {log.plateNumber && (
                            <span className="text-[10px] text-zinc-500 font-sans">{log.plateNumber}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans text-xs">
                          {log.type === 'stock_out' ? (
                            <div>
                              <span className="text-white font-semibold block">{log.customerName || 'Customer'}</span>
                              {log.customerPhone && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-zinc-400" />
                                    <span>{log.customerPhone}</span>
                                  </span>
                                  <a
                                    href={getWhatsAppUrl(log.customerPhone, log.customerName, log.model, lang)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-1.5 py-0.5 rounded font-sans font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-emerald-600/30"
                                    title="ສົນທະນາ WhatsApp ກັບລູກຄ້າ"
                                  >
                                    <WhatsAppIcon className="w-2.5 h-2.5" />
                                    <span>WA</span>
                                  </a>
                                </div>
                              )}
                              {log.paymentMethod && (
                                <span className="text-[10px] text-zinc-300 uppercase block font-mono">
                                  {log.paymentMethod}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="text-zinc-300 text-xs block">{log.notes || t.stockInSubtitle}</span>
                              <span className="text-[10px] text-zinc-300 font-mono">OK</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-white">
                            ${log.priceUSD.toLocaleString()} USD
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {log.type === 'stock_in' ? (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-bold border border-zinc-700">
                              +{log.quantity} {t.unitCars}
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.remainingStock === 0
                                ? 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                                : 'bg-zinc-900 text-zinc-300 border border-zinc-700'
                            }`}>
                              {log.remainingStock ?? 0} {t.unitCars}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans text-zinc-300 text-[11px]">
                          {log.recordedBy}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT VEHICLE DETAILS */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="vehicle-edit-modal theme-adaptive-dark-surface relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200">
                  <Car className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    {lang === 'lo' ? 'ຂໍ້ມູນລົດໃນສະຕ໋ອກ' : lang === 'th' ? 'ข้อมูลรถในสต็อก' : 'Inventory vehicle details'}
                  </p>
                  <h3 className="truncate text-base font-bold text-white sm:text-lg">
                    {t.editModalTitle}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-zinc-200">{editingItem.model}</span>
                    <span className="font-mono text-[10px] text-zinc-500">VIN: {editingItem.vin}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                aria-label={lang === 'lo' ? 'ປິດ' : lang === 'th' ? 'ปิด' : 'Close'}
                className="shrink-0 rounded-xl border border-zinc-800 p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="vehicle-edit-form min-h-0 space-y-5 overflow-y-auto px-5 py-5 text-sm sm:px-7">
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Car className="h-4 w-4 text-zinc-400" />
                  <h4 className="text-xs font-bold text-zinc-200">
                    {lang === 'lo' ? 'ລາຍລະອຽດລົດ' : lang === 'th' ? 'รายละเอียดรถ' : 'Vehicle details'}
                  </h4>
                </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">{t.plateNumber}</label>
                  <input
                    type="text"
                    value={editingItem.plateNumber || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, plateNumber: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 mb-1 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-white" />
                    <span>ວັນທີນຳເຂົ້າສາງ (ວັນ/ເດືອນ/ປີ)</span>
                  </label>
                  <input
                    type="date"
                    value={(editingItem.arrivalDate || '').slice(0, 10)}
                    onChange={(e) => setEditingItem({ ...editingItem, arrivalDate: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    {t.bodyColor}
                    <span className="text-[11px] text-zinc-500 font-normal ml-1.5">
                      ({lang === 'lo' ? 'ບໍ່ບັງຄັບ' : lang === 'th' ? 'ไม่บังคับ' : 'Optional'})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.color || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
                    placeholder={lang === 'lo' ? 'e.g. ສີດຳ, ສີຂາວ (ບໍ່ບັງຄັບ)' : 'e.g. Obsidian Black (Optional)'}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>
              </section>

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="vehicle-edit-price-card rounded-2xl border border-blue-900/40 bg-blue-950/20 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-900/40 text-blue-300">
                      <DollarSign className="h-4 w-4" />
                    </span>
                    <div>
                      <label htmlFor="vehicle-edit-price" className="block font-semibold text-zinc-200">{t.tablePrice}</label>
                      <span className="text-[10px] text-zinc-500">{lang === 'lo' ? 'ລາຄາຂາຍເປັນໂດລາ' : lang === 'th' ? 'ราคาขายเป็นดอลลาร์' : 'Sale price in USD'}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-zinc-500">
                      $
                    </span>
                    <input
                      id="vehicle-edit-price"
                      type="number"
                      min="0"
                      step="1"
                      required
                      inputMode="decimal"
                      value={editPriceValue}
                      onChange={(e) => handleEditPriceChange(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 pl-8 pr-3 font-mono text-base font-bold text-white focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/25"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-400">
                    {lang === 'lo' ? 'ປະມານ' : lang === 'th' ? 'ประมาณ' : 'Approx.'}{' '}
                    <strong className="font-mono text-zinc-200">{(Number(editPriceValue) * 22000).toLocaleString()} LAK</strong>
                  </p>
                </div>

                <div className="vehicle-edit-stock-card rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1.5 font-medium text-zinc-300">
                      <Lock className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{t.tableStock} ({t.unitCars})</span>
                    </label>
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                      {lang === 'lo' ? 'ລັອກ (ບໍ່ສາມາດແກ້ໄຂ)' : lang === 'th' ? 'ล็อค (ไม่สามารถแก้ไข)' : 'Locked'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      readOnly
                      disabled
                      value={editingItem.stockQuantity}
                      className="w-full cursor-not-allowed select-none rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 pl-3 pr-12 font-mono text-zinc-400 opacity-80 focus:outline-none"
                      title={lang === 'lo' ? 'ຈຳນວນສະຕ໋ອກບໍ່ສາມາດແກ້ໄຂໄດ້ໂດຍກົງ (ຄວບຄຸມຜ່ານການຮັບເຂົ້າສາງ ຫຼື POS ເທົ່ານັ້ນ)' : 'Stock quantity cannot be edited directly'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-500 font-medium select-none">
                      {t.unitCars}
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                    {lang === 'lo' 
                      ? '* ຄວບຄຸມອັດຕະໂນມັດຜ່ານການຮັບລົດເຂົ້າສາງ (Stock In) ຫຼື ການຂາຍ (POS)' 
                      : lang === 'th' 
                      ? '* ควบคุมอัตโนมัติผ่านการรับรถเข้าสต็อกหรือการขาย' 
                      : '* Controlled via Stock In or POS sales only'}
                  </p>
                </div>
              </section>

              <section>
                <label className="mb-1 block font-medium text-zinc-300">{t.tableStatus}</label>
                <select
                  value={editingItem.status}
                  onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as StockStatus })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white focus:outline-none"
                >
                  <option value="ready">{t.stage3Ready}</option>
                  <option value="pdi">{t.stage2PDI}</option>
                  <option value="imported">{t.stage1Imported}</option>
                  <option value="reserved">{t.stage4Reserved}</option>
                  <option value="event">{t.stage5Event}</option>
                  <option value="promotion">{t.stage6Promo}</option>
                  <option value="sold">{t.stockSold}</option>
                </select>
              </section>

              {/* Event / Promotion Schedule Editing */}
              {(editingItem.status === 'event' || editingItem.status === 'promotion') && (
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-700 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs">
                    <Calendar className="w-4 h-4 text-zinc-300" />
                    <span>{t.eventsAndPromotionsTitle}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <label className="block text-zinc-300 mb-1 font-medium">{t.eventStartDateLabel} <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={editingItem.eventStartDate || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, eventStartDate: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 mb-1 font-medium">{t.eventEndDateLabel} <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={editingItem.eventEndDate || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, eventEndDate: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">{t.eventCampaignName}</label>
                      <input
                        type="text"
                        value={editingItem.eventCampaign || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, eventCampaign: e.target.value })}
                        placeholder="e.g. Vientiane Motor Expo 2026"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">{t.eventLocationLabel}</label>
                      <input
                        type="text"
                        value={editingItem.eventLocation || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, eventLocation: e.target.value })}
                        placeholder="e.g. ITECC Mall"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vehicle Image Upload from Device */}
              <div className="vehicle-edit-image-panel p-3.5 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-2.5">
                <label className="text-zinc-300 font-semibold text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-white" />
                  <span>{t.uploadCarImage}</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-14 rounded-xl bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0">
                    <img
                      src={editingItem.image}
                      alt={editingItem.model}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl border border-zinc-700 font-semibold text-xs transition-colors">
                      <Upload className="w-3.5 h-3.5 text-white" />
                      <span>{t.uploadCarImage}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      (JPG, PNG, WEBP)
                    </p>
                  </div>
                </div>
              </div>

              <div className="vehicle-edit-notes">
                <label className="block text-zinc-400 mb-1 font-medium">{t.notesLabel}</label>
                <textarea
                  rows={2}
                  value={editingItem.pdiNotes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, pdiNotes: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none resize-none"
                />
              </div>

              <div className="vehicle-edit-actions sticky bottom-0 -mx-5 -mb-5 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:-mb-5 sm:px-7">
                <button
                  type="button"
                  onClick={() => handleRequestDeleteItem(editingItem)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.btnDeleteCar}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="min-h-10 rounded-xl border border-zinc-800 px-4 py-2 text-zinc-300 hover:bg-zinc-900"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-2 font-bold text-black transition-colors hover:bg-zinc-200"
                  >
                    <Check className="h-4 w-4" />
                    {t.saveChanges}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Confirmation Popup Modal for Deleting Inventory Item */}
      <ConfirmDeleteModal
        isOpen={!!inventoryToDelete}
        isLoading={isDeletingInventory}
        onClose={() => setInventoryToDelete(null)}
        onConfirm={handleConfirmDeleteInventory}
        itemName={inventoryToDelete ? `${inventoryToDelete.model} (VIN: ${inventoryToDelete.vin}) | ສີ: ${inventoryToDelete.color}` : ''}
        itemType="INVENTORY VEHICLE"
        title={lang === 'lo' ? `ຢືນຢັນການລົບລົດ ${inventoryToDelete?.model}` : 'Confirm Delete Inventory Item'}
        description={lang === 'lo'
          ? `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລົດ ${inventoryToDelete?.model} (VIN: ${inventoryToDelete?.vin}) ອອກຈາກສະຕ໋ອກ ແລະ ຖານຂໍ້ມູນ Cloud Supabase ຢ່າງຖາວອນ?`
          : `Are you sure you want to permanently delete ${inventoryToDelete?.model} (VIN: ${inventoryToDelete?.vin}) from inventory and Cloud Supabase?`
        }
        confirmButtonText={lang === 'lo' ? 'ຢືນຢັນລົບລົດຄັນນີ້' : 'Delete Vehicle'}
        cancelButtonText={lang === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
        lang={lang}
      />
    </div>
  );
}
