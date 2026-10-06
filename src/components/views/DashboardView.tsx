import { useState } from 'react';
import { 
  Lead, 
  ServiceAppointment, 
  TestDriveBooking, 
  VehicleModel, 
  InventoryItem,
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
  lang: Language;
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
  lang,
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

  // Timeframe-adjusted KPI multiplier
  const kpiData = {
    day: {
      leads: Math.max(2, Math.round(leads.length * 0.3)),
      revenueUSD: 46800,
      testDrives: 1,
      deliveries: 1,
      label: 'ມື້ນີ້ (Today)',
    },
    week: {
      leads: Math.max(5, Math.round(leads.length * 0.7)),
      revenueUSD: 137500,
      testDrives: 3,
      deliveries: 2,
      label: 'ອາທິດນີ້ (This Week)',
    },
    month: {
      leads: leads.length,
      revenueUSD: 218700,
      testDrives: testDrives.length,
      deliveries: 5,
      label: 'ເດືອນນີ້ (This Month)',
    },
    year: {
      leads: leads.length * 8,
      revenueUSD: 1450000,
      testDrives: testDrives.length * 9,
      deliveries: 38,
      label: 'ປີນີ້ (Annual)',
    },
  }[timeframe];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Bar with Timeframe Selector */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400">
              AVATR AUTO SERVICE MANAGEMENT CONSOLE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dashboard ພາບລວມທຸລະກິດ
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            ຕິດຕາມລູກຄ້າ Walk-in / Online / Event ແລະ ສະຖານະຄັງລົດໃນສາງທຸກຂັ້ນຕອນ
          </p>
        </div>

        {/* Timeframe Selector (ມື້, ອາທິດ, ເດືອນ, ປີ) */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl">
          <span className="text-xs text-zinc-400 px-2 font-mono uppercase">ຊ່ວງເວລາ:</span>
          {[
            { key: 'day' as KPITimeframe, labelLo: 'ມື້ (Day)', labelEn: 'Day' },
            { key: 'week' as KPITimeframe, labelLo: 'ອາທິດ (Week)', labelEn: 'Week' },
            { key: 'month' as KPITimeframe, labelLo: 'ເດືອນ (Month)', labelEn: 'Month' },
            { key: 'year' as KPITimeframe, labelLo: 'ປີ (Year)', labelEn: 'Year' },
          ].map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                timeframe === tf.key
                  ? 'bg-white text-black shadow-md font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tf.labelLo}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Main Summary KPI Cards (Timeframe Dynamic) */}
      {/* 3 Core KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Leads */}
        <div 
          onClick={() => onNavigateMenu('customers')}
          className="bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">ລູກຄ້າທັງໝົດ ({kpiData.label})</span>
            <span className="p-2 bg-zinc-900 rounded-lg group-hover:bg-white group-hover:text-black transition-colors">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{kpiData.leads}</span>
            <span className="text-xs text-emerald-400 font-mono">+18% vs ກ່ອນໜ້າ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 group-hover:text-white">
            <span>ຈັດການຂໍ້ມູນລູກຄ້າ CRM</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 2: Stock Units */}
        <div 
          onClick={() => onNavigateMenu('inventory')}
          className="bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">ລົດໃນສາງທັງໝົດ</span>
            <span className="p-2 bg-zinc-900 rounded-lg group-hover:bg-white group-hover:text-black transition-colors">
              <Car className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{inventory.length}</span>
            <span className="text-xs text-emerald-300 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
              {readyCars.length} ພ້ອມຂາຍ
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 group-hover:text-white">
            <span>ກວດເຊັກສະຕ໋ອກລົດ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 3: Revenue (Linked to Bills Management) */}
        <div 
          onClick={() => onNavigateMenu('bills')}
          className="bg-zinc-950 border border-zinc-800 hover:border-emerald-500/80 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl group"
          title="ຄລິກເພື່ອເບິ່ງລາຍການບັນທຶກບິນທັງໝົດ"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium text-emerald-400">ຍອດມູນຄ່າຂາຍ ({kpiData.label})</span>
            <span className="p-2 bg-zinc-900 rounded-lg group-hover:bg-emerald-500 group-hover:text-black transition-colors">
              <FileText className="w-4 h-4 text-emerald-400 group-hover:text-black" />
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono text-white">
              ${(kpiData.revenueUSD / 1000).toFixed(1)}K
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 group-hover:text-white">
            <span className="font-mono text-zinc-400">≈ ₭ {((kpiData.revenueUSD * 22000) / 1000000000).toFixed(2)} ຕື້ (LAK)</span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold group-hover:underline">
              <span>ບັນທຶກບິນ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: ບ່ອນສະແດງລູກຄ້າ 3 ໝວດ (Walk-in, Online, Event) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-white" />
              <span>ສະແດງລູກຄ້າແບ່ງຕາມໝວດ (Walk in, Online, Event)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              ແຍກຊ່ອງທາງທີ່ລູກຄ້າຕິດຕໍ່ເຂົ້າມາ ເພື່ອຕິດຕາມການຂາຍໃຫ້ຖືກຕ້ອງ
            </p>
          </div>

          <button
            onClick={() => onNavigateMenu('customers')}
            className="text-xs text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 bg-zinc-900 px-3.5 py-1.5 rounded-xl border border-zinc-700"
          >
            <span>ເບິ່ງລາຍລະອຽດທັງໝົດ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Category 1: Walk in */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-700">
                  <Store className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">ລູກຄ້າ Walk-in</h3>
                  <p className="text-xs text-zinc-400">ມາໜ້າໂຊຣູມ ຫຼັກ 3</p>
                </div>
              </div>
              <span className="text-2xl font-black font-mono text-white">{walkInLeads.length}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span>ສັດສ່ວນ:</span>
                <span className="text-white font-semibold">
                  {Math.round((walkInLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-400 h-full rounded-full"
                  style={{ width: `${(walkInLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 space-y-1.5 text-xs">
              <span className="text-zinc-500 font-mono text-[11px] uppercase block">ລູກຄ້າຫຼ້າສຸດ:</span>
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
                  <Globe className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">ລູກຄ້າ Online</h3>
                  <p className="text-xs text-zinc-400">Facebook / Web / WA</p>
                </div>
              </div>
              <span className="text-2xl font-black font-mono text-white">{onlineLeads.length}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span>ສັດສ່ວນ:</span>
                <span className="text-white font-semibold">
                  {Math.round((onlineLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full"
                  style={{ width: `${(onlineLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 space-y-1.5 text-xs">
              <span className="text-zinc-500 font-mono text-[11px] uppercase block">ລູກຄ້າຫຼ້າສຸດ:</span>
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
                  <CalendarCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">ລູກຄ້າ Event</h3>
                  <p className="text-xs text-zinc-400">Motor Expo / ITECC</p>
                </div>
              </div>
              <span className="text-2xl font-black font-mono text-white">{eventLeads.length}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span>ສັດສ່ວນ:</span>
                <span className="text-white font-semibold">
                  {Math.round((eventLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: `${(eventLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 space-y-1.5 text-xs">
              <span className="text-zinc-500 font-mono text-[11px] uppercase block">ລູກຄ້າຫຼ້າສຸດ:</span>
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

      {/* SECTION: ການສະແດງສິນຄ້າ Event ແລະ ໂປຣໂມຊັນພິເສດ (Events & Active Promotions) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-black flex items-center gap-1">
                <Flame className="w-3 h-3 fill-black" />
                ACTIVE CAMPAIGNS & PROMOTIONS
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>ສິນຄ້າ Event ແລະ ໂປຣໂມຊັນພິເສດ (Promotions & Events)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              ລົດທີ່ນຳໄປຈັດສະແດງໃນງານ Event, ງານ Roadshow ແລະ ແຄມເປນຂອງແຖມພິເສດຫຼ້າສຸດ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateMenu('inventory')}
              className="text-xs text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 bg-zinc-900 px-3.5 py-2 rounded-xl border border-zinc-700 transition-colors"
            >
              <Car className="w-3.5 h-3.5 text-zinc-400" />
              <span>ເບິ່ງສະຕ໋ອກລົດ Event</span>
            </button>
            <button
              onClick={() => onNavigateMenu('pos')}
              className="text-xs text-black bg-emerald-400 hover:bg-emerald-300 font-bold flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors shadow-md"
            >
              <BadgePercent className="w-3.5 h-3.5 fill-black" />
              <span>ເປີດບິນຂາຍ POS ໂປຣໂມຊັນ</span>
            </button>
          </div>
        </div>

        {/* Promotion Campaigns Grid */}
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
                    alt={promo.titleLo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>
                  
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md ${promo.badgeColor}`}>
                      {promo.badge}
                    </span>
                  </div>

                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-zinc-300 font-mono">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{promo.period}</span>
                    </span>
                  </div>
                </div>

                {/* Campaign Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                      {promo.titleLo}
                    </h3>
                    {promo.eventLocation && (
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                        <span>{promo.eventLocation}</span>
                      </p>
                    )}
                  </div>

                  {/* Highlight Benefit Box */}
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase font-mono">
                      <Gift className="w-3 h-3" />
                      <span>ສິດທິປະໂຫຍດຫຼັກ (Key Privilege)</span>
                    </div>
                    <p className="text-zinc-200 font-medium text-[11px] leading-snug">
                      {promo.highlightBenefit}
                    </p>
                  </div>

                  {/* Free Gifts List */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase block">ຂອງແຖມ & ບໍລິການ:</span>
                    <ul className="text-[11px] text-zinc-300 space-y-0.5">
                      {promo.freeGifts.slice(0, 3).map((gift, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 truncate">
                          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
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
                  <button
                    type="button"
                    onClick={() => onNavigateMenu('inventory')}
                    className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-750 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-zinc-700"
                  >
                    <Car className="w-3.5 h-3.5 text-zinc-400" />
                    <span>ເບິ່ງລົດໃນງານ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetVehicle = vehicles.find(v => promo.applicableModels.includes(v.name as any)) || vehicles[0];
                      if (targetVehicle) {
                        onOpenQuote(targetVehicle, `ລູກຄ້າ ${promo.badge}`);
                      }
                    }}
                    className="py-2 px-3 bg-amber-400 hover:bg-amber-300 text-black rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                    <span>ໃບສະເໜີ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: ບ່ອນສະແດງ ຄັງລົດໃນສາງ 4 ຂັ້ນຕອນ */}
      {/* (ນຳເຂົ້າ/ລໍຖ້າກຽມຂາຍ, ກຳລັງ PDI, ພ້ອມຂາຍ, ຈອງແລ້ວ) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-white" />
              <span>ສະຖານະຄັງລົດໃນສາງ (ລວມລົດ Event & ໂປຣໂມຊັນ)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              ຕິດຕາມລົດທຸກຄັນ ຕັ້ງແຕ່ນຳເຂົ້າ, PDI, ຈັດສະແດງໃນງານ Event ຈົນເຖິງສົ່ງມອບ
            </p>
          </div>

          <button
            onClick={() => onNavigateMenu('inventory')}
            className="text-xs text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 bg-zinc-900 px-3.5 py-1.5 rounded-xl border border-zinc-700"
          >
            <span>ຈັດການຄັງສິນຄ້າທັງໝົດ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stages Grid (Now including Event & Promotion) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* Stage 1: ນຳເຂົ້າ / ລໍຖ້າກຽມຂາຍ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                1. ນຳເຂົ້າ
              </span>
              <span className="text-xl font-black font-mono text-white">{importedCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              ມາຮອດດ່ານບໍ່ເຕັນ / ສາງດົງໂດກ ລໍຖ້າກຽມກວດ
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {importedCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-black/40 rounded-lg border border-zinc-900">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{c.location}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 2: ກຳລັງ PDI */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                2. ກຳລັງ PDI
              </span>
              <span className="text-xl font-black font-mono text-white">{pdiCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              ກວດສອບ 68 ຈຸດ: ແບັດ CATL, LiDAR, OTA
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {pdiCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-black/40 rounded-lg border border-zinc-900">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-amber-400 truncate">{c.plateNumber}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 3: ພ້ອມຂາຍ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                3. ພ້ອມຂາຍ
              </span>
              <span className="text-xl font-black font-mono text-white">{readyCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              PDI ຜ່ານ 100%, ຈອດຢູ່ໂຊຣູມໃຫຍ່
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {readyCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-black/40 rounded-lg border border-zinc-900">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-emerald-400 truncate">{c.color}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 4: ຈອງແລ້ວ */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-950 text-purple-300 border border-purple-800">
                4. ຈອງແລ້ວ
              </span>
              <span className="text-xl font-black font-mono text-white">{reservedCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              ລູກຄ້າວາງມັດຈຳ/ເຊັນສັນຍາແລ້ວ
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {reservedCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-black/40 rounded-lg border border-zinc-900">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-purple-300 truncate">{c.reservedForCustomer || 'ລູກຄ້າ VIP'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 5: ລົດງານ Event */}
          <div className="bg-zinc-900/60 border border-amber-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>5. ງານ Event</span>
              </span>
              <span className="text-xl font-black font-mono text-amber-400">{eventCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              ຈັດສະແດງໃນງານ Motor Expo & Roadshow
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {eventCars.length > 0 ? eventCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-black/40 rounded-lg border border-amber-900/50">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-amber-300 truncate">{c.eventCampaign || 'Motor Show'}</div>
                </div>
              )) : (
                <div className="text-[10px] text-zinc-500 py-1 text-center">ບໍ່ມີລົດໃນງານຕອນນີ້</div>
              )}
            </div>
          </div>

          {/* Stage 6: ລົດແຄມເປນໂປຣໂມຊັນ */}
          <div className="bg-zinc-900/60 border border-rose-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-600 flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>6. ໂປຣໂມຊັນ</span>
              </span>
              <span className="text-xl font-black font-mono text-rose-400">{promoCars.length}</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              ລົດແຄມເປນພິເສດ ດອກເບ້ຍ 0% & ຂອງແຖມ
            </p>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
              {promoCars.length > 0 ? promoCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-black/40 rounded-lg border border-rose-900/50">
                  <div className="font-bold text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-rose-300 truncate">{c.eventCampaign || 'Special Promo'}</div>
                </div>
              )) : (
                <div className="text-[10px] text-zinc-500 py-1 text-center">ບໍ່ມີລົດໂປຣຕອນນີ້</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
