import { useState } from 'react';
import {
  Lead,
  ServiceAppointment,
  TestDriveBooking,
  VehicleModel,
  InventoryItem,
  InvoiceBillRecord,
  Language,
  ActiveMenu,
  KPITimeframe
} from '../../types';
import { translations } from '../../data/translations';
import { ACTIVE_PROMOTIONS, PromotionCampaign } from '../../data/promotions';
import {
  Users,
  Car,
  Calendar,
  Wrench,
  DollarSign,
  TrendingUp,
  Clock,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  Layers,
  Truck,
  Sparkles,
  UserCheck,
  Globe,
  Store,
  CalendarCheck,
  Zap,
  Check,
  FileText,
  Tag,
  Gift,
  BadgePercent,
  MapPin,
  ExternalLink,
  Flame
} from 'lucide-react';

interface DashboardViewProps {
  leads: Lead[];
  inventory: InventoryItem[];
  services: ServiceAppointment[];
  testDrives: TestDriveBooking[];
  vehicles: VehicleModel[];
  bills?: InvoiceBillRecord[];
  lang: Language;
  isAdmin?: boolean;
  onNavigateMenu: (menu: ActiveMenu) => void;
  onOpenNewLead: () => void;
  onOpenQuote: (vehicle: VehicleModel, customerName?: string) => void;
}

export default function DashboardView({
  leads,
  inventory,
  services,
  testDrives,
  vehicles,
  bills = [],
  lang,
  isAdmin = false,
  onNavigateMenu,
  onOpenNewLead,
  onOpenQuote,
}: DashboardViewProps) {
  const t = translations[lang];
  const [timeframe, setTimeframe] = useState<KPITimeframe>('month');

  // Customer Category Breakdown (Walk in, Online, Event)
  const walkInLeads = leads.filter(l => l.category === 'walk_in');
  const onlineLeads = leads.filter(l => l.category === 'online');
  const eventLeads = leads.filter(l => l.category === 'event');

  // Inventory Stage Breakdown
  const importedCars = inventory.filter(i => i.status === 'imported');
  const pdiCars = inventory.filter(i => i.status === 'pdi');
  const readyCars = inventory.filter(i => i.status === 'ready');
  const reservedCars = inventory.filter(i => i.status === 'reserved');
  const eventCars = inventory.filter(i => i.status === 'event');
  const promoCars = inventory.filter(i => i.status === 'promotion');
  const soldCars = inventory.filter(i => i.status === 'sold');

  // Calculate dynamic business metrics from real data
  const deliveredCount = leads.filter(l => l.status === 'delivered').length;
  const soldVehiclesCount = inventory.filter(i => i.status === 'sold').length;
  const saleBills = bills ? bills.filter(b => b.billType === 'sale') : [];
  const billsRevenueUSD = saleBills.reduce((sum, b) => sum + (b.netTotalUSD || b.amountUSD || 0), 0);
  const soldItemsRevenueUSD = inventory
    .filter(i => i.status === 'sold')
    .reduce((sum, item) => sum + (item.priceUSD || 0), 0);
  const totalRevenueUSD = billsRevenueUSD > 0 ? billsRevenueUSD : soldItemsRevenueUSD;

  const kpiData = {
    day: {
      leads: leads.length,
      revenueUSD: totalRevenueUSD,
      testDrives: testDrives.length,
      deliveries: deliveredCount || soldVehiclesCount,
      label: t.tfDay,
    },
    week: {
      leads: leads.length,
      revenueUSD: totalRevenueUSD,
      testDrives: testDrives.length,
      deliveries: deliveredCount || soldVehiclesCount,
      label: t.tfWeek,
    },
    month: {
      leads: leads.length,
      revenueUSD: totalRevenueUSD,
      testDrives: testDrives.length,
      deliveries: deliveredCount || soldVehiclesCount,
      label: t.tfMonth,
    },
    year: {
      leads: leads.length,
      revenueUSD: totalRevenueUSD,
      testDrives: testDrives.length,
      deliveries: deliveredCount || soldVehiclesCount,
      label: t.tfYear,
    },
  }[timeframe];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Bar with Timeframe Selector */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
            <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400">
              {t.consoleSubtitle}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.dashboardTitle}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {t.dashboardSubtitle}
          </p>
        </div>

        {/* Timeframe Selector (ມື້, ອາທິດ, ເດືອນ, ປີ) */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl">
          <span className="text-xs text-zinc-400 px-2 font-mono uppercase">{t.timeframeSelector}</span>
          {[
            { key: 'day' as KPITimeframe, label: t.tfDay },
            { key: 'week' as KPITimeframe, label: t.tfWeek },
            { key: 'month' as KPITimeframe, label: t.tfMonth },
            { key: 'year' as KPITimeframe, label: t.tfYear },
          ].map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${timeframe === tf.key
                ? 'bg-white text-black shadow-md font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Core KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Leads */}
        <div
          onClick={() => onNavigateMenu('customers')}
          className="bg-zinc-950 border border-zinc-800 hover:border-zinc-500 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">{t.kpiTotalLeads} ({kpiData.label})</span>
            <span className="p-2 bg-zinc-900 rounded-lg group-hover:bg-white group-hover:text-black transition-colors">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{kpiData.leads}</span>
            <span className="text-xs text-zinc-300 font-mono">+18% SLA</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 group-hover:text-white">
            <span>{t.manageCrmAction}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 2: Stock Units */}
        <div
          onClick={isAdmin ? () => onNavigateMenu('inventory') : undefined}
          className={`bg-zinc-950 border border-zinc-800 rounded-2xl p-5 transition-all ${isAdmin ? 'hover:border-zinc-500 cursor-pointer hover:shadow-xl group' : ''
            }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">{t.kpiTotalCars}</span>
            <span className={`p-2 bg-zinc-900 rounded-lg transition-colors ${isAdmin ? 'group-hover:bg-white group-hover:text-black' : ''}`}>
              <Car className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{inventory.length}</span>
            <span className="text-xs text-zinc-200 font-semibold bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-700">
              {readyCars.length} {t.readyForSale}
            </span>
          </div>
          <div className={`mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 ${isAdmin ? 'group-hover:text-white' : ''
            }`}>
            <span>{isAdmin ? t.checkStockAction : t.kpiTotalCars}</span>
            {isAdmin && <ArrowRight className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* KPI 3: Revenue (Linked to Bills Management) */}
        <div
          onClick={() => onNavigateMenu('bills')}
          className="bg-zinc-950 border border-zinc-800 hover:border-zinc-500 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl group"
          title="Bills & Invoices"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium text-white">{t.kpiRevenueTitle} ({kpiData.label})</span>
            <span className="p-2 bg-zinc-900 rounded-lg group-hover:bg-white group-hover:text-black transition-colors">
              <FileText className="w-4 h-4 text-zinc-300 group-hover:text-black" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              ${kpiData.revenueUSD.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400 font-mono font-bold">USD</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 group-hover:text-white">
            <span className="font-mono text-zinc-400 font-medium">${(kpiData.revenueUSD / 1000).toFixed(1)}K USD</span>
            <span className="flex items-center gap-1 text-white font-semibold group-hover:underline">
              <span>{t.viewBillsAction}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1 (MOVED TO TOP): ສະຖານະຄັງລົດໃນສາງ (ລວມລົດ Event & ໂປຣໂມຊັນ) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-white" />
              <span>{t.inventoryStagesTitle}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t.inventoryStagesSubtitle}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => onNavigateMenu('inventory')}
              className="text-xs text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 bg-zinc-900 px-3.5 py-1.5 rounded-xl border border-zinc-700 transition-colors"
            >
              <span>{t.manageAllStock}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stages Grid (6 Stages: Imported, PDI, Ready, Reserved, Event, Promotion) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* Stage 1: ນຳເຂົ້າ / ລໍຖ້າກຽມຂາຍ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700">
                {t.stage1Imported}
              </span>
              <span className="text-xl font-black font-mono text-white">{importedCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              {t.stage1Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {importedCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{c.location}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 2: ກຳລັງ PDI */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700">
                {t.stage2PDI}
              </span>
              <span className="text-xl font-black font-mono text-white">{pdiCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              {t.stage2Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {pdiCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{c.plateNumber}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 3: ພ້ອມຂາຍ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-black border border-zinc-300 font-bold">
                {t.stage3Ready}
              </span>
              <span className="text-xl font-black font-mono text-white">{readyCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              {t.stage3Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {readyCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{c.color}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 4: ຈອງແລ້ວ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                {t.stage4Reserved}
              </span>
              <span className="text-xl font-black font-mono text-white">{reservedCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              {t.stage4Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {reservedCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{c.reservedForCustomer || 'VIP Client'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 5: ລົດງານ Event */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-zinc-400" />
                <span>{t.stage5Event}</span>
              </span>
              <span className="text-xl font-black font-mono text-white">{eventCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              {t.stage5Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {eventCars.length > 0 ? eventCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{c.eventCampaign || 'Motor Show'}</div>
                </div>
              )) : (
                <div className="text-[10px] text-zinc-500 py-1 text-center">{t.noEventCarsNow}</div>
              )}
            </div>
          </div>

          {/* Stage 6: ລົດແຄມເປນໂປຣໂມຊັນ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1">
                <Flame className="w-3 h-3 text-zinc-400" />
                <span>{t.stage6Promo}</span>
              </span>
              <span className="text-xl font-black font-mono text-white">{promoCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              {t.stage6Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {promoCars.length > 0 ? promoCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{c.eventCampaign || 'Special Promo'}</div>
                </div>
              )) : (
                <div className="text-[10px] text-zinc-500 py-1 text-center">{t.noPromoCarsNow}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ບ່ອນສະແດງລູກຄ້າ 3 ໝວດ (Walk-in, Online, Event) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-white" />
              <span>{t.customerCategoryTitle}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t.customerCategorySubtitle}
            </p>
          </div>

          <button
            onClick={() => onNavigateMenu('customers')}
            className="text-xs text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 bg-zinc-900 px-3.5 py-1.5 rounded-xl border border-zinc-700 transition-colors"
          >
            <span>{t.viewAllDetails}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Category 1: Walk in */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-700">
                  <Store className="w-5 h-5 text-zinc-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{t.catWalkIn}</h3>
                  <p className="text-xs text-zinc-400">Showroom Lak 3</p>
                </div>
              </div>
              <span className="text-2xl font-black font-mono text-white">{walkInLeads.length}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span>{t.ratioLabel}</span>
                <span className="text-white font-semibold">
                  {Math.round((walkInLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full"
                  style={{ width: `${(walkInLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 space-y-1.5 text-xs">
              <span className="text-zinc-500 font-mono text-[11px] uppercase block">{t.latestCustomers}</span>
              {walkInLeads.slice(0, 2).map(l => (
                <div key={l.id} className="flex justify-between items-center text-zinc-300">
                  <span className="font-medium truncate">{l.customerName}</span>
                  <span className="text-[11px] font-mono text-zinc-500">{l.interestedModel}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category 2: Online */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-700">
                  <Globe className="w-5 h-5 text-zinc-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{t.catOnline}</h3>
                  <p className="text-xs text-zinc-400">Facebook / Web / WA</p>
                </div>
              </div>
              <span className="text-2xl font-black font-mono text-white">{onlineLeads.length}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span>{t.ratioLabel}</span>
                <span className="text-white font-semibold">
                  {Math.round((onlineLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-zinc-300 h-full rounded-full"
                  style={{ width: `${(onlineLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 space-y-1.5 text-xs">
              <span className="text-zinc-500 font-mono text-[11px] uppercase block">{t.latestCustomers}</span>
              {onlineLeads.slice(0, 2).map(l => (
                <div key={l.id} className="flex justify-between items-center text-zinc-300">
                  <span className="font-medium truncate">{l.customerName}</span>
                  <span className="text-[11px] font-mono text-zinc-500">{l.interestedModel}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category 3: Event */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-700">
                  <CalendarCheck className="w-5 h-5 text-zinc-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{t.catEvent}</h3>
                  <p className="text-xs text-zinc-400">Motor Expo / ITECC</p>
                </div>
              </div>
              <span className="text-2xl font-black font-mono text-white">{eventLeads.length}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span>{t.ratioLabel}</span>
                <span className="text-white font-semibold">
                  {Math.round((eventLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-zinc-400 h-full rounded-full"
                  style={{ width: `${(eventLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 space-y-1.5 text-xs">
              <span className="text-zinc-500 font-mono text-[11px] uppercase block">{t.latestCustomers}</span>
              {eventLeads.slice(0, 2).map(l => (
                <div key={l.id} className="flex justify-between items-center text-zinc-300">
                  <span className="font-medium truncate">{l.customerName}</span>
                  <span className="text-[11px] font-mono text-zinc-500">{l.interestedModel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: ການສະແດງສິນຄ້າ Event ແລະ ໂປຣໂມຊັນພິເສດ (Events & Active Promotions) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-black flex items-center gap-1">
                <Flame className="w-3 h-3 fill-black" />
                ACTIVE CAMPAIGNS & PROMOTIONS
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <span>{t.eventsAndPromotionsTitle}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t.eventsAndPromotionsSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => onNavigateMenu('inventory')}
                className="text-xs text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 bg-zinc-900 px-3.5 py-2 rounded-xl border border-zinc-700 transition-colors"
              >
                <Car className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t.viewEventStock}</span>
              </button>
            )}
            <button
              onClick={() => onNavigateMenu('pos')}
              className="text-xs text-black bg-white hover:bg-zinc-200 font-bold flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors shadow-md"
            >
              <BadgePercent className="w-3.5 h-3.5 fill-black" />
              <span>{t.openPosPromo}</span>
            </button>
          </div>
        </div>

        {/* Promotion Campaigns Grid */}
        {ACTIVE_PROMOTIONS.length === 0 ? (
          <div className="p-8 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center space-y-2">
            <Sparkles className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-zinc-400 text-sm font-medium">{t.noPromotionsTitle}</p>
            <p className="text-zinc-500 text-xs">{t.noPromotionsDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ACTIVE_PROMOTIONS.map((promo) => (
              <div
                key={promo.id}
                className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden flex flex-col justify-between transition-all hover:shadow-xl group"
              >
                <div>
                  {/* Image Banner with Badge */}
                  <div className="relative h-40 w-full overflow-hidden bg-zinc-950">
                    <img
                      src={promo.imageUrl}
                      alt={lang === 'lo' ? promo.titleLo : promo.titleEn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>

                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 always-white-text">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md bg-black/80 text-white border-zinc-700 shadow-md">
                        <span style={{ color: '#ffffff' }}>{promo.badge}</span>
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono always-white-text">
                      <span className="flex items-center gap-1 text-zinc-200" style={{ color: '#e4e4e7' }}>
                        <Clock className="w-3 h-3 text-zinc-300" />
                        <span>{promo.period}</span>
                      </span>
                    </div>
                  </div>

                  {/* Campaign Body */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-white group-hover:text-zinc-200 transition-colors line-clamp-2">
                        {lang === 'lo' ? promo.titleLo : promo.titleEn}
                      </h3>
                      {promo.eventLocation && (
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-1 truncate">
                          <MapPin className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                          <span>{promo.eventLocation}</span>
                        </p>
                      )}
                    </div>

                    {/* Highlight Benefit Box */}
                    <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-300 font-bold uppercase font-mono">
                        <Gift className="w-3 h-3" />
                        <span>Privilege</span>
                      </div>
                      <p className="text-zinc-200 font-medium text-[11px] leading-snug">
                        {promo.highlightBenefit}
                      </p>
                    </div>

                    {/* Free Gifts List */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase block">Perks:</span>
                      <ul className="text-[11px] text-zinc-300 space-y-0.5">
                        {promo.freeGifts.slice(0, 3).map((gift, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 truncate">
                            <Check className="w-3 h-3 text-white flex-shrink-0 mt-0.5" />
                            <span className="truncate">{gift}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="p-4 pt-0">
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onNavigateMenu('inventory')}
                        className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-750 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-zinc-700"
                      >
                        <Car className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{t.viewEventStock}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const targetVehicle = vehicles.find(v => promo.applicableModels.includes(v.name as any)) || vehicles[0];
                        if (targetVehicle) {
                          onOpenQuote(targetVehicle, `Customer ${promo.badge}`);
                        }
                      }}
                      className={`${isAdmin ? 'py-2 px-3' : 'w-full py-2.5 px-4'} bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm`}
                    >
                      <span>{t.createQuoteAction}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
