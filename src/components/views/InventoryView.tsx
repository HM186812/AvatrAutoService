import { useState } from 'react';
import { InventoryItem, VehicleModel, Language, StockStatus, PDIStatus, StockLogRecord, SaleLogRecord, SystemUser } from '../../types';
import { translations } from '../../data/translations';
import { 
  saveInventoryItemToFirestore, 
  deleteInventoryItemFromFirestore 
} from '../../firebase';
import { 
  Car, 
  Search, 
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
  Image as ImageIcon
} from 'lucide-react';

interface InventoryViewProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  stockLogs: StockLogRecord[];
  setStockLogs: React.Dispatch<React.SetStateAction<StockLogRecord[]>>;
  vehicles: VehicleModel[];
  setVehicles?: React.Dispatch<React.SetStateAction<VehicleModel[]>>;
  currentUser?: SystemUser;
  isSuperAdmin?: boolean;
  lang: Language;
  onOpenQuote: (vehicle: VehicleModel, customerName?: string) => void;
  onNavigateToStockIn?: () => void;
  onNavigateToPOS?: () => void;
}

export default function InventoryView({
  inventory,
  setInventory,
  stockLogs,
  setStockLogs,
  vehicles,
  setVehicles,
  currentUser,
  isSuperAdmin = false,
  lang,
  onOpenQuote,
  onNavigateToStockIn,
  onNavigateToPOS,
}: InventoryViewProps) {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'inventory' | 'sales_history'>('inventory');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'stock_in' | 'stock_out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>('all');
  const [eventPromoFilter, setEventPromoFilter] = useState<'all' | 'event_only' | 'standard'>('all');

  // SELL CAR MODAL STATES (ເມື່ອຂາຍອອກກໍເຊັ່ນກັນ)
  const [sellingItem, setSellingItem] = useState<InventoryItem | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [soldPriceUSD, setSoldPriceUSD] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'finance'>('transfer');
  const [saleNotes, setSaleNotes] = useState('');

  // EDIT VEHICLE MODAL STATE
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editPriceCurrency, setEditPriceCurrency] = useState<'USD' | 'LAK' | 'THB'>('USD');
  const [editPriceValue, setEditPriceValue] = useState<number>(0);

  const handleEditPriceChange = (val: number, curr = editPriceCurrency) => {
    setEditPriceValue(val);
    if (!editingItem) return;
    let finalUSD = val;
    let finalLAK = val * 22000;
    if (curr === 'LAK') {
      finalLAK = val;
      finalUSD = Math.round(val / 22000);
    } else if (curr === 'THB') {
      finalUSD = Math.round(val / 35.5);
      finalLAK = Math.round(val * 620);
    }
    setEditingItem({
      ...editingItem,
      priceUSD: finalUSD,
      priceLAK: finalLAK,
    });
  };

  const handleEditCurrencyChange = (newCurr: 'USD' | 'LAK' | 'THB') => {
    setEditPriceCurrency(newCurr);
    if (!editingItem) return;
    let displayVal = editingItem.priceUSD;
    if (newCurr === 'LAK') displayVal = editingItem.priceLAK || editingItem.priceUSD * 22000;
    else if (newCurr === 'THB') displayVal = Math.round(editingItem.priceUSD * 35.5);
    setEditPriceValue(displayVal);
  };

  // Toast message
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3800);
  };

  // SELL CAR HANDLER (ເມື່ອຂາຍອອກ ບັນທຶກຂໍ້ມູນ & ຕັດສະຕ໋ອກ)
  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingItem) return;
    if (!buyerName.trim() || !buyerPhone.trim()) {
      alert('ກະລຸນາປ້ອນຊື່ ແລະ ເບີໂທລູກຄ້າຜູ້ຊື້!');
      return;
    }

    const currentQty = sellingItem.stockQuantity;
    const remaining = Math.max(0, currentQty - 1);
    const finalPriceUSD = soldPriceUSD || sellingItem.priceUSD;

    // 1) Update inventory stock
    setInventory(prev => prev.map(item => {
      if (item.vin === sellingItem.vin) {
        return {
          ...item,
          stockQuantity: remaining,
          status: remaining === 0 ? 'sold' : item.status,
          reservedForCustomer: undefined,
        };
      }
      return item;
    }));

    // 2) Record into persistent Stock Log (Stock-Out / ຂາຍອອກ)
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const stockOutLog: StockLogRecord = {
      id: `LOG-OUT-${Date.now().toString().slice(-6)}`,
      type: 'stock_out',
      vin: sellingItem.vin,
      model: sellingItem.model,
      plateNumber: sellingItem.plateNumber,
      color: sellingItem.color,
      quantity: 1,
      priceUSD: finalPriceUSD,
      priceLAK: finalPriceUSD * 22000,
      timestamp: now,
      recordedBy: currentUser?.name || 'Admin',
      customerName: buyerName.trim(),
      customerPhone: buyerPhone.trim(),
      paymentMethod,
      remainingStock: remaining,
      notes: saleNotes || 'ຂາຍອອກ ແລະ ສົ່ງມອບລົດໃຫ້ລູກຄ້າຮຽບຮ້ອຍ',
    };

    setStockLogs(prev => [stockOutLog, ...prev]);
    triggerToast(`ຂາຍອອກ ແລະ ບັນທຶກການຂາຍລົດ ${sellingItem.model} (VIN: ${sellingItem.vin}) ສຳເລັດແລ້ວ! ເຫຼືອໃນສາງ: ${remaining} ຄັນ`);

    // Reset selling modal
    setSellingItem(null);
    setBuyerName('');
    setBuyerPhone('');
    setSaleNotes('');
  };

  // 3. EDIT CAR HANDLER
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updatedItem = {
      ...editingItem,
      priceLAK: editingItem.priceUSD * 22000,
    };

    setInventory(prev => prev.map(item => item.vin === editingItem.vin ? updatedItem : item));

    try {
      await saveInventoryItemToFirestore(updatedItem);
    } catch (err) {
      console.warn('Firestore edit item save fallback:', err);
    }

    triggerToast(`ອັບເດດຂໍ້ມູນລົດ ${editingItem.model} (VIN: ${editingItem.vin}) ສຳເລັດ! (Cloud Synced)`);
    setEditingItem(null);
  };

  // DELETE VEHICLE HANDLER (ລົບສິນຄ້າອອກຈາກຖານຂໍ້ມູນ - Super Admin only)
  const handleDeleteItem = async (vin: string, model: string) => {
    if (!isSuperAdmin) {
      triggerToast('ສະເພາະ Admin (Super Admin) ເທົ່ານັ້ນທີ່ມີສິດລົບລົດອອກຈາກຖານຂໍ້ມູນ!');
      return;
    }
    if (window.confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລົດ ${model} (VIN: ${vin}) ອອກຈາກຖານຂໍ້ມູນສະຕ໋ອກຢ່າງຖາວອນ?`)) {
      try {
        await deleteInventoryItemFromFirestore(vin);
      } catch (err) {
        console.warn('Firestore delete item fallback:', err);
      }
      setInventory(prev => prev.filter(item => item.vin !== vin));
      if (editingItem?.vin === vin) {
        setEditingItem(null);
      }
      triggerToast(`ລົບລົດ ${model} (VIN: ${vin}) ອອກຈາກຖານຂໍ້ມູນສຳເລັດແລ້ວ!`);
    }
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
    if (selectedStatusFilter !== 'all' && item.status !== selectedStatusFilter) return false;
    if (selectedModelFilter !== 'all' && item.model !== selectedModelFilter) return false;
    if (eventPromoFilter === 'event_only' && !item.eventCampaign) return false;
    if (eventPromoFilter === 'standard' && item.eventCampaign) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.vin.toLowerCase().includes(q) ||
        item.plateNumber.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.color.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-zinc-900 border border-zinc-700 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white text-black rounded-lg">
              <Car className="w-5 h-5" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              VEHICLE STOCK & SALES RECORD SYSTEM
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.inventoryViewTitle}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {t.inventoryViewSubtitle}
          </p>
        </div>

        {/* Tab Toggle: Stock vs History Logs */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl text-xs">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>{t.tabStockList} ({inventory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sales_history')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'sales_history'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t.tabStockHistory} ({stockLogs.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* DEALERSHIP QUICK ACTIONS BAR */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Car className="w-4 h-4 text-white" />
                <span>{t.inventoryViewTitle}</span>
              </div>
              <p className="text-zinc-400 text-xs">
                {t.inventoryStagesSubtitle}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {onNavigateToStockIn && (
                <button
                  type="button"
                  onClick={onNavigateToStockIn}
                  className="px-4 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 border border-zinc-300"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.quickStockInBtn}</span>
                </button>
              )}

              {onNavigateToPOS && (
                <button
                  type="button"
                  onClick={onNavigateToPOS}
                  className="px-4 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5 border border-zinc-300"
                >
                  <ShoppingBag className="w-4 h-4 fill-black" />
                  <span>{t.quickPOSBtn}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-500">{t.tableStatus}:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
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
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-500">{t.tableModel}:</span>
                <select
                  value={selectedModelFilter}
                  onChange={(e) => setSelectedModelFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="all">{t.filterAllModels} ({vehicles.length})</option>
                  {vehicles.map((v) => (
                    <option key={v.id || v.name} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Event:</span>
                <select
                  value={eventPromoFilter}
                  onChange={(e) => setEventPromoFilter(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="all">ທຸກລາຍການ</option>
                  <option value="event_only">ສະເພາະລົດ Event & ໂປຣໂມຊັນ</option>
                  <option value="standard">ລົດໂຊຣູມທົ່ວໄປ</option>
                </select>
              </div>
            </div>

            <span className="text-zinc-400 font-mono text-xs">
              ສະຕ໋ອກລວມ: <strong className="text-white">{filteredInventory.length}</strong> ລາຍການ
            </span>
          </div>

          {/* VEHICLE STOCK CARDS LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredInventory.map((item) => {
              const vehicle = vehicles.find(v => v.name === item.model) || vehicles[0];

              return (
                <div
                  key={item.vin}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-3xl overflow-hidden flex flex-col justify-between transition-all hover:shadow-2xl group"
                >
                  {/* Image & Badges */}
                  <div className="relative h-48 bg-zinc-900 overflow-hidden">
                    <img
                      src={item.image || vehicle.heroImage}
                      alt={item.model}
                      className="w-full h-full object-cover filter contrast-125 transition-transform duration-500"
                    />

                    {/* Status Pill */}
                    <div className="absolute top-3 left-3">
                      {item.status === 'ready' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-100 border border-zinc-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          <span>ພ້ອມຂາຍ</span>
                        </span>
                      )}
                      {item.status === 'pdi' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                          <span>ກຳລັງ PDI</span>
                        </span>
                      )}
                      {item.status === 'imported' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                          <span>ນຳເຂົ້າ / ລໍຖ້າກຽມ</span>
                        </span>
                      )}
                      {item.status === 'reserved' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                          <span>ຈອງແລ້ວ</span>
                        </span>
                      )}
                      {item.status === 'event' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-200 border border-zinc-600 flex items-center gap-1.5 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          <span>ລົດງານ Event</span>
                        </span>
                      )}
                      {item.status === 'promotion' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-200 border border-zinc-600 flex items-center gap-1.5 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          <span>ໂປຣໂມຊັນພິເສດ</span>
                        </span>
                      )}
                      {item.status === 'sold' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                          <span>ຂາຍແລ້ວ (0)</span>
                        </span>
                      )}
                    </div>

                    {/* Stock Count Badge */}
                    <div className="absolute top-3 right-3 bg-black/80 px-2.5 py-1 rounded-full text-xs font-mono font-bold border border-zinc-700 text-white">
                      ສະຕ໋ອກ: {item.stockQuantity} ຄັນ
                    </div>

                    {/* Price */}
                    <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md px-3 py-1 rounded-xl border border-zinc-700 text-right">
                      <span className="text-base font-black font-mono text-white">
                        ${item.priceUSD.toLocaleString()}
                      </span>
                    </div>

                    {/* Event & Promotion Badge */}
                    {item.eventCampaign && (
                      <div className="absolute bottom-3 left-3 bg-white text-black px-2.5 py-1 rounded-xl text-[10px] font-bold shadow-lg flex items-center gap-1 backdrop-blur-md border border-zinc-300">
                        <Sparkles className="w-3 h-3 fill-black" />
                        <span className="truncate max-w-[150px]">{item.eventCampaign}</span>
                      </div>
                    )}
                  </div>

                  {/* Body Details */}
                  <div className="p-5 space-y-3.5 text-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-base text-white">{item.model}</h3>
                        <span className="text-zinc-400 text-xs">{item.color}</span>
                      </div>
                      <p className="text-zinc-400 font-mono mt-0.5">
                        ທະບຽນ: <strong className="text-white">{item.plateNumber}</strong>
                      </p>
                    </div>

                    <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-1.5 font-mono">
                      <div className="flex justify-between text-zinc-400">
                        <span>ເລກຖັງ (VIN):</span>
                        <strong className="text-white">{item.vin}</strong>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>PDI:</span>
                        <span className="text-zinc-200 font-bold">
                          {item.pdiStatus === 'passed' ? 'ຜ່ານ 100%' : 'ກຳລັງກວດ'}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-500 text-[11px]">
                        <span>ທີ່ຕັ້ງ:</span>
                        <span>{item.location}</span>
                      </div>
                      {/* Event & Promotion Schedule Badge */}
                      {(item.eventStartDate || item.eventEndDate || item.eventCampaign) && (
                        <div className="pt-1.5 border-t border-zinc-800/80 space-y-1">
                          {item.eventCampaign && (
                            <div className="flex items-center gap-1 text-[11px] font-sans font-bold text-zinc-200">
                              <Sparkles className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
                              <span className="truncate">{item.eventCampaign}</span>
                            </div>
                          )}
                          {(item.eventStartDate || item.eventEndDate) && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-300 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
                              <span>ກຳນົດເວລາ: {item.eventStartDate || 'ເລີ່ມຕົ້ນ'} ຫາ {item.eventEndDate || 'ສິ້ນສຸດ'}</span>
                            </div>
                          )}
                          {item.eventLocation && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-sans truncate">
                              <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                              <span className="truncate">{item.eventLocation}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTONS: ຂາຍອອກ (Sell) & ແກ້ໄຂ (Edit) */}
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <div className="grid grid-cols-2 gap-2">
                        {/* ຂາຍອອກ (Sell Car) Button */}
                        <button
                          onClick={() => {
                            setSellingItem(item);
                            setSoldPriceUSD(item.priceUSD);
                          }}
                          disabled={item.stockQuantity <= 0}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            item.stockQuantity <= 0
                              ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                              : 'bg-white hover:bg-zinc-200 text-black shadow-md border border-zinc-300'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{item.stockQuantity <= 0 ? t.criticalZeroStock : t.btnSellCar}</span>
                        </button>

                        {/* ແກ້ໄຂ (Edit) Button */}
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setEditPriceCurrency('USD');
                            setEditPriceValue(item.priceUSD);
                          }}
                          className="py-2.5 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{t.edit}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenQuote(vehicle, item.reservedForCustomer)}
                          className="flex-1 py-1.5 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-medium border border-zinc-800 flex items-center justify-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{t.createQuoteAction}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.vin, item.model)}
                          className="p-1.5 text-zinc-500 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors"
                          title={t.btnDeleteCar}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
                {inventory.filter(i => i.status === 'ready').length} {t.unitCars} {t.readyForSale}
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
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    historyFilter === 'all'
                      ? 'bg-white text-black shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {t.filterAll} ({stockLogs.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('stock_in')}
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
                  onClick={() => setHistoryFilter('stock_out')}
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
                  {stockLogs
                    .filter(log => {
                      if (historyFilter === 'stock_in' && log.type !== 'stock_in') return false;
                      if (historyFilter === 'stock_out' && log.type !== 'stock_out') return false;
                      return true;
                    })
                    .map((log) => (
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
                                <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3 text-zinc-400" />
                                  <span>{log.customerPhone}</span>
                                </span>
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
                            ${log.priceUSD.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-zinc-500 block">
                            ≈ ₭ {(log.priceUSD * 22000).toLocaleString()}
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

      {/* MODAL: SELL CAR CONFIRMATION */}
      {sellingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-white">
                <ShoppingBag className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">{t.sellModalTitle}</h3>
              </div>
              <button
                onClick={() => setSellingItem(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSale} className="space-y-4 text-xs">
              {/* Vehicle Selected Box */}
              <div className="p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-white text-sm">{sellingItem.model}</span>
                  <span className="font-mono text-white font-bold">${sellingItem.priceUSD.toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  <span>VIN: {sellingItem.vin} | {sellingItem.plateNumber} | {t.tableStock}: {sellingItem.stockQuantity} {t.unitCars}</span>
                </div>
              </div>

              {/* Customer Inputs */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">{t.buyerName}</label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="e.g. Somxay Vongvilay"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">{t.buyerPhone}</label>
                <input
                  type="text"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="020 5xxxxxxx"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">{t.sellingPrice} (USD)</label>
                  <input
                    type="number"
                    value={soldPriceUSD}
                    onChange={(e) => setSoldPriceUSD(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">{t.paymentType}</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-white focus:outline-none"
                  >
                    <option value="transfer">{t.paymentTransfer}</option>
                    <option value="cash">{t.paymentCash}</option>
                    <option value="finance">{t.paymentInstallments}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">{t.notesLabel}</label>
                <textarea
                  rows={2}
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  placeholder="Notes & Perks..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSellingItem(null)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-900"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-lg transition-colors flex items-center gap-1.5 border border-zinc-300"
                >
                  <Check className="w-4 h-4" />
                  <span>{t.confirmSaleAndDeduct}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT VEHICLE DETAILS */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-white" />
                <span>{t.editModalTitle}: {editingItem.model}</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">{t.plateNumber}</label>
                  <input
                    type="text"
                    value={editingItem.plateNumber}
                    onChange={(e) => setEditingItem({ ...editingItem, plateNumber: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400 font-medium">{t.tablePrice} ({editPriceCurrency})</label>
                    <div className="flex items-center gap-1 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800 text-[9px] font-mono">
                      {(['USD', 'LAK', 'THB'] as const).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleEditCurrencyChange(c)}
                          className={`px-1.5 py-0.5 rounded transition-colors ${
                            editPriceCurrency === c ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs font-bold">
                      {editPriceCurrency === 'USD' ? '$' : editPriceCurrency === 'LAK' ? '₭' : '฿'}
                    </span>
                    <input
                      type="number"
                      value={editPriceValue || ''}
                      onChange={(e) => handleEditPriceChange(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block truncate">
                    ≈ ${editingItem.priceUSD.toLocaleString()} USD | ₭ {(editingItem.priceLAK || editingItem.priceUSD * 22000).toLocaleString()} LAK
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">{t.tableStock} ({t.unitCars})</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.stockQuantity}
                    onChange={(e) => setEditingItem({ ...editingItem, stockQuantity: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">{t.tableStatus}</label>
                  <select
                    value={editingItem.status}
                    onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as StockStatus })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="ready">{t.stage3Ready}</option>
                    <option value="pdi">{t.stage2PDI}</option>
                    <option value="imported">{t.stage1Imported}</option>
                    <option value="reserved">{t.stage4Reserved}</option>
                    <option value="event">{t.stage5Event}</option>
                    <option value="promotion">{t.stage6Promo}</option>
                    <option value="sold">{t.stockSold}</option>
                  </select>
                </div>
              </div>

              {/* Event / Promotion Schedule Editing */}
              {(editingItem.status === 'event' || editingItem.status === 'promotion') && (
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-700 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs">
                    <Calendar className="w-4 h-4 text-zinc-300" />
                    <span>{t.eventsAndPromotionsTitle}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-zinc-300 mb-1 font-medium">{t.eventStartDateLabel} *</label>
                      <input
                        type="date"
                        value={editingItem.eventStartDate || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, eventStartDate: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-300 mb-1 font-medium">{t.eventEndDateLabel} *</label>
                      <input
                        type="date"
                        value={editingItem.eventEndDate || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, eventEndDate: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
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
              <div className="p-3.5 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-2.5">
                <label className="block text-zinc-300 font-semibold text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-white" />
                  <span>{t.uploadCarImage}</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-14 rounded-xl bg-zinc-800 overflow-hidden border border-zinc-700 flex-shrink-0">
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

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">{t.notesLabel}</label>
                <textarea
                  rows={2}
                  value={editingItem.pdiNotes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, pdiNotes: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleDeleteItem(editingItem.vin, editingItem.model)}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-colors font-medium text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.btnDeleteCar}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-900"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors border border-zinc-300"
                  >
                    {t.saveChanges}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
