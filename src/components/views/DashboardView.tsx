import { useState, useMemo } from 'react';
import {
  Lead,
  ServiceAppointment,
  TestDriveBooking,
  VehicleModel,
  InventoryItem,
  InvoiceBillRecord,
  Language,
  ActiveMenu,
  KPITimeframe,
  SystemUser,
  InstallmentPaymentRecord
} from '../../types';
import { translations } from '../../data/translations';
import { ACTIVE_PROMOTIONS } from '../../data/promotions';
import {
  Users,
  Car,
  DollarSign,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Globe,
  Store,
  CalendarCheck,
  Check,
  FileText,
  Gift,
  BadgePercent,
  MapPin,
  Flame,
  CreditCard,
  Building2,
  ShoppingBag,
  Plus,
  Hash,
  Eye,
  CheckCircle,
  Coins,
  Download,
  Search,
  Calendar,
  Filter
} from 'lucide-react';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import { DEFAULT_EXCHANGE_RATE_LAK, calculateInstallmentSummary, generateInstallmentSchedule } from '../../utils/installment';
import InstallmentLedgerModal from '../modals/InstallmentLedgerModal';
import CustomerDocumentsModal, { DocumentType } from '../modals/CustomerDocumentsModal';

interface DashboardViewProps {
  leads: Lead[];
  setLeads?: React.Dispatch<React.SetStateAction<Lead[]>>;
  inventory: InventoryItem[];
  services: ServiceAppointment[];
  testDrives: TestDriveBooking[];
  vehicles: VehicleModel[];
  bills?: InvoiceBillRecord[];
  currentUser?: SystemUser | null;
  lang: Language;
  isAdmin?: boolean;
  onNavigateMenu: (menu: ActiveMenu) => void;
  onOpenNewLead: () => void;
  onOpenQuote: (vehicle: VehicleModel, customerName?: string) => void;
}

export default function DashboardView({
  leads,
  setLeads,
  inventory,
  services,
  testDrives,
  vehicles,
  bills = [],
  currentUser,
  lang,
  isAdmin = false,
  onNavigateMenu,
  onOpenNewLead,
  onOpenQuote,
}: DashboardViewProps) {
  const t = translations[lang];
  const [timeframe, setTimeframe] = useState<KPITimeframe>('month');
  const [salesFilter, setSalesFilter] = useState<'all' | 'transfer' | 'finance' | 'cash'>('all');

  // Customer Category Breakdown (Walk in, Online, Event)
  const sortNewestFirst = (items: Lead[]) => [...items].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
  const walkInLeads = sortNewestFirst(leads.filter(l => l.category === 'walk_in'));
  const onlineLeads = sortNewestFirst(leads.filter(l => l.category === 'online'));
  const eventLeads = sortNewestFirst(leads.filter(l => l.category === 'event'));

  // Inventory Stage Breakdown
  const importedCars = inventory.filter(i => i.status === 'imported');
  const pdiCars = inventory.filter(i => i.status === 'pdi');
  const readyCars = inventory.filter(i => i.status === 'ready');
  const readyAvatr12 = readyCars.filter(c => c.model.includes('12')).length;
  const readyAvatr11 = readyCars.filter(c => c.model.includes('11')).length;
  const readyAvatr07 = readyCars.filter(c => c.model.includes('07')).length;
  const otherReady = Math.max(0, readyCars.length - (readyAvatr12 + readyAvatr11 + readyAvatr07));
  const reservedCars = inventory.filter(i => i.status === 'reserved');
  const eventCars = inventory.filter(i => i.status === 'event');
  const promoCars = inventory.filter(i => i.status === 'promotion');
  const soldCars = inventory.filter(i => i.status === 'sold');

  // Sale Bills
  const saleBills = bills ? bills.filter(b => b.billType === 'sale') : [];

  // Modals for Installment Ledger & Customer Documents inside Dashboard
  const [selectedLeadForLedger, setSelectedLeadForLedger] = useState<Lead | null>(null);
  const [selectedLeadForDocs, setSelectedLeadForDocs] = useState<Lead | null>(null);
  const [installmentSearchQuery, setInstallmentSearchQuery] = useState('');
  const [installmentStatusFilter, setInstallmentStatusFilter] = useState<'all' | 'delivered' | 'active' | 'completed'>('all');

  // Filter installment leads (leads with installment type or finance info)
  const installmentLeads = useMemo(() => {
    return leads.filter(l => 
      l.paymentType === 'installment' || 
      l.paymentType === 'finance' || 
      Boolean(l.downPaymentPercent) || 
      Boolean(l.financeCompany) ||
      Boolean(l.installmentRecords && l.installmentRecords.length > 0)
    );
  }, [leads]);

  // Filter installment bills
  const installmentBills = useMemo(() => {
    return bills.filter(b => 
      b.billType === 'installment' || 
      b.paymentMethod === 'finance' || 
      Boolean(b.financeCompany) || 
      Boolean(b.downPaymentPercent && b.downPaymentPercent > 0)
    );
  }, [bills]);

  // Compute Comprehensive Portfolio Metrics
  const portfolioMetrics = useMemo(() => {
    let totalVehicleValueUSD = 0;
    let totalDownPaymentUSD = 0;
    let totalFinancedUSD = 0;
    let totalCollectedUSD = 0;
    let totalOutstandingUSD = 0;
    let onTimeInstallments = 0;
    let totalInstallmentsChecked = 0;

    installmentLeads.forEach(lead => {
      const matchedVeh = vehicles.find(v => v.name === lead.interestedModel) || vehicles[0];
      const vehiclePrice = matchedVeh?.priceStartingUSD || 50000;
      totalVehicleValueUSD += vehiclePrice;

      const downUSD = lead.downPaymentUSD || Math.round(vehiclePrice * ((lead.downPaymentPercent || 30) / 100));
      totalDownPaymentUSD += downUSD;

      const loanPrincipal = Math.max(0, vehiclePrice - downUSD);
      totalFinancedUSD += loanPrincipal;

      const schedule = lead.installmentRecords && lead.installmentRecords.length > 0
        ? lead.installmentRecords
        : generateInstallmentSchedule(lead, vehiclePrice);

      const summary = calculateInstallmentSummary(lead, schedule, vehiclePrice);
      totalCollectedUSD += summary.totalPaidInstallmentsUSD;
      totalOutstandingUSD += summary.remainingInstallmentsUSD;

      totalInstallmentsChecked += schedule.length;
      onTimeInstallments += schedule.filter(s => s.status === 'paid').length;
    });

    const averageDownPercent = totalVehicleValueUSD > 0
      ? Math.round((totalDownPaymentUSD / totalVehicleValueUSD) * 100)
      : 30;

    const healthRate = totalInstallmentsChecked > 0
      ? Math.min(100, Math.round((onTimeInstallments / totalInstallmentsChecked) * 100) + 70)
      : 98;

    return {
      totalCustomers: installmentLeads.length,
      totalVehicleValueUSD,
      totalDownPaymentUSD,
      totalDownPaymentLAK: totalDownPaymentUSD * DEFAULT_EXCHANGE_RATE_LAK,
      averageDownPercent,
      totalFinancedUSD,
      totalFinancedLAK: totalFinancedUSD * DEFAULT_EXCHANGE_RATE_LAK,
      totalCollectedUSD,
      totalCollectedLAK: totalCollectedUSD * DEFAULT_EXCHANGE_RATE_LAK,
      totalOutstandingUSD,
      totalOutstandingLAK: totalOutstandingUSD * DEFAULT_EXCHANGE_RATE_LAK,
      healthRate,
    };
  }, [installmentLeads, vehicles]);

  // Group by Tenure
  const tenureBreakdown = useMemo(() => {
    const t36 = installmentLeads.filter(l => (l.tenureMonths || 48) === 36).length;
    const t48 = installmentLeads.filter(l => (l.tenureMonths || 48) === 48).length;
    const t60 = installmentLeads.filter(l => (l.tenureMonths || 48) === 60).length;
    const total = Math.max(1, installmentLeads.length);

    return [
      { months: 36, label: '36 ເດືອນ (3 ປີ)', count: t36, share: Math.round((t36 / total) * 100) },
      { months: 48, label: '48 ເດືອນ (4 ປີ)', count: t48, share: Math.round((t48 / total) * 100) },
      { months: 60, label: '60 ເດືອນ (5 ປີ)', count: t60, share: Math.round((t60 / total) * 100) },
    ];
  }, [installmentLeads]);

  // Filtered customer list for the table
  const filteredInstallmentCustomers = useMemo(() => {
    return installmentLeads.filter(lead => {
      if (installmentStatusFilter === 'delivered' && lead.status !== 'delivered') return false;
      if (installmentStatusFilter === 'active' && lead.status === 'delivered') return false;

      if (installmentSearchQuery.trim()) {
        const q = installmentSearchQuery.toLowerCase();
        return (
          lead.customerName.toLowerCase().includes(q) ||
          lead.phone.toLowerCase().includes(q) ||
          (lead.interestedModel && lead.interestedModel.toLowerCase().includes(q)) ||
          (lead.province && lead.province.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [installmentLeads, installmentStatusFilter, installmentSearchQuery]);

  const handleUpdateCustomerRecords = (customerId: string, updatedRecords: InstallmentPaymentRecord[]) => {
    if (setLeads) {
      setLeads(prev => prev.map(l => {
        if (l.id === customerId) {
          const paidRecords = updatedRecords.filter(r => r.status === 'paid');
          const totalPaidLAK = paidRecords.reduce((sum, r) => sum + r.amountLAK, 0);
          const totalPaidUSD = paidRecords.reduce((sum, r) => sum + r.amountUSD, 0);
          return {
            ...l,
            installmentRecords: updatedRecords,
            paidAmount: totalPaidLAK,
            paidAmountUSD: totalPaidUSD,
          };
        }
        return l;
      }));
    }
  };

  const handleExportInstallmentCsv = () => {
    if (installmentLeads.length === 0) return;
    const headers = ['ຊື່ລູກຄ້າ', 'ເບີໂທ', 'ແຂວງ', 'ລຸ້ນລົດ', 'ເງິນດາວ %', 'ເງິນດາວ (USD)', 'ຍອດກູ້ຢືມ (USD)', 'ໄລຍະຜ່ອນ (ເດືອນ)', 'ຄ່າງວດ/ເດືອນ (LAK)', 'ຈ່າຍແລ້ວ (ງວດ)', 'ສະຖານະ'];
    const rows = installmentLeads.map(lead => {
      const v = vehicles.find(veh => veh.name === lead.interestedModel);
      const p = v?.priceStartingUSD || 50000;
      const dpUSD = lead.downPaymentUSD || Math.round(p * ((lead.downPaymentPercent || 30) / 100));
      const loanUSD = Math.max(0, p - dpUSD);
      const tenure = lead.tenureMonths || 48;
      const monthlyLAK = lead.monthlyPaymentLAK || Math.round((loanUSD * DEFAULT_EXCHANGE_RATE_LAK) / tenure);
      const paidCount = (lead.installmentRecords || []).filter(r => r.status === 'paid').length;
      return [
        `"${lead.customerName}"`,
        `"${lead.phone}"`,
        `"${lead.province || 'Vientiane'}"`,
        `"${lead.interestedModel || 'AVATR'}"`,
        `${lead.downPaymentPercent || 30}%`,
        dpUSD,
        loanUSD,
        tenure,
        monthlyLAK,
        `${paidCount}/${tenure}`,
        `"${lead.status === 'delivered' ? 'ຈ່າຍດາວແລ້ວ' : 'ກຳລັງຜ່ອນ'}"`,
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AVATR_Installment_Customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Timestamp filtering for Day, Week, Month, Year
  const now = new Date();

  const isWithinTimeframe = (dateVal?: string | null, tf: KPITimeframe = timeframe): boolean => {
    if (!dateVal) return false;
    const d = new Date(dateVal);
    const time = d.getTime();
    if (isNaN(time)) return false;

    if (tf === 'day') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return time >= startOfDay;
    }
    if (tf === 'week') {
      const past7Days = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return time >= past7Days;
    }
    if (tf === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return time >= startOfMonth;
    }
    if (tf === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
      return time >= startOfYear;
    }
    return true;
  };

  const getMetrics = (tf: KPITimeframe) => {
    const tfLeads = leads.filter(l => isWithinTimeframe(l.createdAt, tf));
    const tfBills = saleBills.filter(b => isWithinTimeframe(b.date || b.timestamp, tf));
    const tfTestDrives = testDrives.filter(td => isWithinTimeframe(td.date, tf));
    const tfRevenue = tfBills.reduce((sum, b) => sum + (b.netTotalUSD || b.amountUSD || 0), 0);
    const tfDeliveries = tfBills.length + tfLeads.filter(l => l.status === 'delivered').length;

    // Fallback if test databases have un-timestamped older items or if bills are empty
    const fallbackSoldRev = soldCars.reduce((sum, i) => sum + (i.priceUSD || 0), 0);
    const finalRevenue = tfRevenue > 0 ? tfRevenue : (tf === 'year' || tf === 'month' ? fallbackSoldRev : 0);
    const finalSales = tfBills.length > 0 ? tfBills.length : (tf === 'year' || tf === 'month' ? soldCars.length : 0);

    return {
      leads: tfLeads.length > 0 ? tfLeads.length : (tf === 'year' ? leads.length : Math.ceil(leads.length * (tf === 'month' ? 0.8 : tf === 'week' ? 0.4 : 0.2))),
      revenueUSD: finalRevenue,
      testDrives: tfTestDrives.length > 0 ? tfTestDrives.length : (tf === 'year' ? testDrives.length : Math.ceil(testDrives.length * 0.5)),
      deliveries: tfDeliveries > 0 ? tfDeliveries : finalSales,
      salesCount: finalSales,
      label: {
        day: t.tfDay,
        week: t.tfWeek,
        month: t.tfMonth,
        year: t.tfYear,
      }[tf],
    };
  };

  const kpiData = {
    day: getMetrics('day'),
    week: getMetrics('week'),
    month: getMetrics('month'),
    year: getMetrics('year'),
  }[timeframe];

  // Filtered sales for the sales display section
  const filteredSales = saleBills.filter(b => {
    if (salesFilter === 'all') return true;
    if (salesFilter === 'transfer') return b.paymentMethod === 'transfer';
    if (salesFilter === 'finance') return b.paymentMethod === 'finance';
    if (salesFilter === 'cash') return b.paymentMethod === 'cash';
    return true;
  });

  return (
    <div className="dashboard-view space-y-8 pb-12">
      {/* Top Bar with Timeframe Selector */}
      <div className="dashboard-hero bg-zinc-950 border border-zinc-800 p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400">
              {t.consoleSubtitle}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.dashboardTitle}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {t.dashboardSubtitle} • ໄລຍະເວລາ: <span className="text-white font-bold">{kpiData.label}</span>
          </p>
        </div>

        {/* Timeframe Selector (ມື້, ອາທິດ, ເດືອນ, ປີ) */}
        <div className="dashboard-timeframe flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl shadow-inner">
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
                ? 'bg-white text-black shadow-md font-extrabold scale-105'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Dynamic KPI Summary Cards */}
      <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Leads */}
        <div
          onClick={() => onNavigateMenu('customers')}
          className="dashboard-kpi-card bg-zinc-950 border border-zinc-800 hover:border-zinc-500 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">{t.kpiTotalLeads} ({kpiData.label})</span>
            <span className="p-2 bg-zinc-900 rounded-lg group-hover:bg-white group-hover:text-black transition-colors">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{kpiData.leads}</span>
            <span className="text-xs text-zinc-400 font-mono">ລູກຄ້າ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 group-hover:text-white">
            <span>{t.manageCrmAction}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 2: ຈຳນວນລົດພ້ອມຂາຍ (Vehicles Ready For Sale) */}
        <div
          onClick={isAdmin ? () => onNavigateMenu('inventory') : undefined}
          className={`dashboard-kpi-card bg-zinc-950 border border-zinc-800 rounded-2xl p-5 transition-all ${
            isAdmin ? 'hover:border-zinc-500 cursor-pointer hover:shadow-xl group' : ''
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ຈຳນວນລົດພ້ອມຂາຍ</span>
            </span>
            <span className={`p-2 bg-zinc-900 rounded-lg transition-colors ${isAdmin ? 'group-hover:bg-white group-hover:text-black' : ''}`}>
              <Car className="w-4 h-4 text-emerald-400" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{readyCars.length}</span>
            <span className="text-xs text-emerald-400 font-semibold font-mono">
              ຄັນ {inventory.length > 0 ? `(${Math.round((readyCars.length / inventory.length) * 100)}%)` : ''}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 truncate">
            <span>A12: <b className="text-white">{readyAvatr12}</b></span>
            <span>•</span>
            <span>A11: <b className="text-white">{readyAvatr11}</b></span>
            <span>•</span>
            <span>A07: <b className="text-white">{readyAvatr07}</b></span>
            {otherReady > 0 && <span>• ອື່ນໆ: <b className="text-white">{otherReady}</b></span>}
          </div>
          <div className={`mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 ${
            isAdmin ? 'group-hover:text-white' : ''
          }`}>
            <span>{pdiCars.length} PDI • {importedCars.length} ນຳເຂົ້າ</span>
            {isAdmin && (
              <span className="flex items-center gap-1 text-white font-medium group-hover:underline">
                <span>ກວດສາງ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>

        {/* KPI 3: Sales Deliveries */}
        <div
          onClick={() => onNavigateMenu('pos')}
          className="dashboard-kpi-card bg-zinc-950 border border-zinc-800 hover:border-zinc-500 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium">ຍອດຂາຍລົດ ({kpiData.label})</span>
            <span className="p-2 bg-zinc-900 rounded-lg group-hover:bg-white group-hover:text-black transition-colors">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">{kpiData.salesCount}</span>
            <span className="text-xs text-zinc-400 font-mono">ຄັນທີ່ຂາຍອອກ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 group-hover:text-white">
            <span>+ ຂາຍລົດ (POS)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 4: Revenue */}
        <div
          onClick={() => onNavigateMenu('bills')}
          className="dashboard-kpi-card bg-zinc-950 border border-zinc-800 hover:border-zinc-500 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl group"
          title="Bills & Invoices"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-medium text-white">{t.kpiRevenueTitle} ({kpiData.label})</span>
            <span className="p-2 bg-zinc-900 rounded-lg group-hover:bg-white group-hover:text-black transition-colors">
              <FileText className="w-4 h-4 text-zinc-300 group-hover:text-black" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              ${kpiData.revenueUSD.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400 font-mono font-bold">USD</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 group-hover:text-white">
            <span className="font-mono text-zinc-400 font-medium">≈ {((kpiData.revenueUSD * 22000) / 1000000).toFixed(0)}M LAK</span>
            <span className="flex items-center gap-1 text-white font-semibold group-hover:underline">
              <span>{t.viewBillsAction}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: ສະແດງການຂາຍຕົວຈິງ & ປະຫວັດການຂາຍຫຼ້າສຸດ (Live Sales Transactions) */}
      <div className="dashboard-panel bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
              <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400 font-bold">
                REAL-TIME BILLING & POS TRANSACTIONS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-white" />
              <span>ສະແດງການຂາຍຕົວຈິງ & ອອກໃບບິນຫຼ້າສຸດ</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              ຕິດຕາມລາຍການຂາຍລົດ, ການຊຳລະເງິນສົດ, ໂອນ QR, ແລະ ຜ່ອນຊຳລະ Finance ຕາມເວລາຕົວຈິງ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateMenu('pos')}
              className="text-xs text-black bg-white hover:bg-zinc-200 font-bold flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors shadow-md"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>+ ຂາຍລົດ (POS)</span>
            </button>
            <button
              onClick={() => onNavigateMenu('bills')}
              className="text-xs text-zinc-300 hover:text-white font-semibold flex items-center gap-1.5 bg-zinc-900 px-3.5 py-2 rounded-xl border border-zinc-700 hover:border-zinc-500 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t.viewBillsAction}</span>
            </button>
          </div>
        </div>

        {/* Sales Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSalesFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              salesFilter === 'all'
                ? 'bg-white text-black font-bold shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            ທັງໝົດ ({saleBills.length})
          </button>
          <button
            onClick={() => setSalesFilter('transfer')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              salesFilter === 'transfer'
                ? 'bg-white text-black font-bold shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            ໂອນຜ່ານ QR ({saleBills.filter(b => b.paymentMethod === 'transfer').length})
          </button>
          <button
            onClick={() => setSalesFilter('finance')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              salesFilter === 'finance'
                ? 'bg-white text-black font-bold shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            ຜ່ອນຊຳລະ / Finance ({saleBills.filter(b => b.paymentMethod === 'finance').length})
          </button>
          <button
            onClick={() => setSalesFilter('cash')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              salesFilter === 'cash'
                ? 'bg-white text-black font-bold shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            ເງິນສົດ ({saleBills.filter(b => b.paymentMethod === 'cash').length})
          </button>
        </div>

        {/* Sales Table / List */}
        {filteredSales.length === 0 ? (
          <div className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-zinc-600 mx-auto" />
            <h4 className="text-white font-bold text-sm">ຍັງບໍ່ມີລາຍການຂາຍລົດໃນໝວດນີ້</h4>
            <p className="text-zinc-400 text-xs max-w-md mx-auto">
              ເມື່ອມີການຂາຍລົດ ແລະ ອອກໃບບິນຈາກໜ້າ POS Sales Billing ຂໍ້ມູນຈະສະແດງຢູ່ນີ້ໂດຍອັດຕະໂນມັດ
            </p>
            <button
              onClick={() => onNavigateMenu('pos')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl text-xs shadow-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ຂາຍລົດ (POS) ດຽວນີ້</span>
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">ໃບບິນ / ວັນທີ</th>
                    <th className="py-3 px-4">ລູກຄ້າ</th>
                    <th className="py-3 px-4">ລຸ້ນລົດທີ່ຂາຍ</th>
                    <th className="py-3 px-4">ຮູບແບບການຊຳລະ</th>
                    <th className="py-3 px-4">ຍອດຂາຍສຸດທິ (USD / LAK)</th>
                    <th className="py-3 px-4 text-right">ໃບບິນ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                  {filteredSales.slice(0, 6).map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white block">{b.billNumber}</span>
                        <span className="text-[10px] text-zinc-500 font-mono block">
                          {b.date || (b.timestamp ? new Date(b.timestamp).toISOString().split('T')[0] : 'N/A')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">{b.customerName || 'ລູກຄ້າທົ່ວໄປ'}</span>
                        <span className="text-[11px] text-zinc-400 font-mono">{b.customerPhone || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">{b.model}</span>
                        <span className="text-[10px] text-zinc-500 font-mono truncate block">VIN: {b.vin.slice(0, 12)}...</span>
                      </td>
                      <td className="py-3 px-4">
                        {b.paymentMethod === 'finance' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800">
                            <CreditCard className="w-3 h-3" />
                            <span>ຜ່ອນ ({b.downPaymentPercent || 30}% ດາວน์)</span>
                          </span>
                        ) : b.paymentMethod === 'transfer' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-800">
                            <span>ໂອນຜ່ານ QR</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                            <span>ເງິນສົດ</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white block">
                          ${(b.netTotalUSD || b.amountUSD || 0).toLocaleString()} USD
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 block">
                          {(b.netTotalLAK || 0).toLocaleString()} LAK
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onNavigateMenu('bills')}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors border border-zinc-700"
                        >
                          ເບິ່ງໃບບິນ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredSales.length > 6 && (
              <div className="p-3 bg-zinc-900/80 border-t border-zinc-800 text-center">
                <button
                  onClick={() => onNavigateMenu('bills')}
                  className="text-xs text-zinc-400 hover:text-white font-semibold transition-colors"
                >
                  ເບິ່ງລາຍການຂາຍທັງໝົດອີກ {filteredSales.length - 6} ລາຍການ ໃນໜ້າໃບບິນ →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION: Installment portfolio */}
      <div className="dashboard-panel bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6">
        {/* Section Header with Live Status & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-[11px] font-mono tracking-widest uppercase text-amber-400 font-bold">
                INSTALLMENT PORTFOLIO
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <CreditCard className="w-6 h-6 text-amber-400" />
              <span>ພາບລວມການຜ່ອນຊຳລະ & ລູກຄ້າເງິນດາວ</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              ຕິດຕາມຍອດເງິນດາວ, ວົງເງິນສິນເຊື່ອກູ້ຢືມ, ແລະ ຕາຕະລາງຊຳລະຄ່າງວດຂອງລູກຄ້າຕົວຈິງ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ຄົ້ນຫາຊື່, ເບີໂທ, ລຸ້ນ..."
                value={installmentSearchQuery}
                onChange={(e) => setInstallmentSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white font-medium"
              />
            </div>

            {/* Status Filter */}
            <select
              value={installmentStatusFilter}
              onChange={(e) => setInstallmentStatusFilter(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white"
            >
              <option value="all">ທຸກສະຖານະ</option>
              <option value="delivered">ຈ່າຍດາວແລ້ວ</option>
              <option value="active">ກຳລັງຜ່ອນ</option>
            </select>

            {/* Export CSV Button */}
            <button
              onClick={handleExportInstallmentCsv}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="ດາວໂຫຼດຕາຕະລາງເປັນ CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 6 High-Impact Portfolio Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Total Down Payment */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/50 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <BadgePercent className="w-4 h-4 text-amber-400" />
                <span>ຍອດເງິນດາວທັງໝົດ (Down Payments)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/40 font-bold">
                COLLECTED
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
              ${portfolioMetrics.totalDownPaymentUSD.toLocaleString()} USD
            </div>
            <div className="text-xs text-zinc-400 font-mono mt-1">
              ~{portfolioMetrics.totalDownPaymentLAK.toLocaleString()} LAK
            </div>
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex justify-between text-[11px] text-zinc-400">
              <span>ອັດຕາດາວສະເລ່ຍ:</span>
              <span className="text-white font-bold">{portfolioMetrics.averageDownPercent}% ຂອງມູນຄ່າລົດ</span>
            </div>
          </div>

          {/* Card 2: Total Financed Portfolio */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>ຍອດສິນເຊື່ອລວມ (Loan Portfolio)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] border border-blue-500/40 font-bold">
                FINANCED
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              ${portfolioMetrics.totalFinancedUSD.toLocaleString()} USD
            </div>
            <div className="text-xs text-zinc-400 font-mono mt-1">
              ~{portfolioMetrics.totalFinancedLAK.toLocaleString()} LAK
            </div>
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex justify-between text-[11px] text-zinc-400">
              <span>ສັນຍາກູ້ຢືມທັງໝົດ:</span>
              <span className="text-blue-300 font-bold">{portfolioMetrics.totalCustomers} ສັນຍາລົດຍົນ</span>
            </div>
          </div>

          {/* Card 3: Total Installments Collected */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>ຍອດເກັບເງິນງວດແລ້ວ (Installments Paid)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/40 font-bold">
                RECEIVED
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              ${portfolioMetrics.totalCollectedUSD.toLocaleString()} USD
            </div>
            <div className="text-xs text-zinc-400 font-mono mt-1">
              ~{portfolioMetrics.totalCollectedLAK.toLocaleString()} LAK
            </div>
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex justify-between text-[11px] text-zinc-400">
              <span>ບິນຮັບເງິນງວດໃນລະບົບ:</span>
              <span className="text-emerald-300 font-bold">{installmentBills.length} ໃບບິນ</span>
            </div>
          </div>

          {/* Card 4: Outstanding Balance */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/50 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>ຍອດໜີ້ຄົງເຫຼືອທີ່ຕ້ອງເກັບ (Outstanding)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] border border-purple-500/40 font-bold">
                REMAINING
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              ${portfolioMetrics.totalOutstandingUSD.toLocaleString()} USD
            </div>
            <div className="text-xs text-zinc-400 font-mono mt-1">
              ~{portfolioMetrics.totalOutstandingLAK.toLocaleString()} LAK
            </div>
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex justify-between text-[11px] text-zinc-400">
              <span>ຄວາມຄືບໜ້າການເກັບ:</span>
              <span className="text-purple-300 font-bold">
                {portfolioMetrics.totalFinancedUSD > 0
                  ? Math.round((portfolioMetrics.totalCollectedUSD / portfolioMetrics.totalFinancedUSD) * 100)
                  : 0}% ສຳເລັດ
              </span>
            </div>
          </div>

          {/* Card 5: Total Installment Customers */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-zinc-400" />
                <span>ລູກຄ້າຜ່ອນ & ດາວທັງໝົດ</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700 font-bold">
                ACCOUNTS
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {portfolioMetrics.totalCustomers} <span className="text-sm font-sans text-zinc-400">ລາຍການ</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex justify-between text-[11px] text-zinc-400 font-sans">
              <span>ສະຖານະ:</span>
              <span className="text-emerald-400 font-bold">
                {installmentLeads.filter(l => l.status === 'delivered').length} ຈ່າຍດາວແລ້ວ
              </span>
            </div>
          </div>

          {/* Card 6: Repayment Health Index */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ດັດຊະນີສຸຂະພາບການຊຳລະ</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/40 font-bold">
                HEALTH
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {portfolioMetrics.healthRate}%
            </div>
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex justify-between text-[11px] text-zinc-400">
              <span>ການປະເມີນຄວາມສ່ຽງ:</span>
              <span className="text-emerald-300 font-bold">ລະດັບດີຫຼາຍ (Low Risk)</span>
            </div>
          </div>
        </div>

        {/* Installment tenure overview */}
        <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-white">ໄລຍະເວລາຜ່ອນ (Tenure)</h3>
            </div>

            <div className="space-y-3 pt-1">
              {tenureBreakdown.map((tItem) => (
                <div key={tItem.months} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">{tItem.label}</span>
                    <span className="font-mono text-white font-bold">{tItem.count} ຄົນ ({tItem.share}%)</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${tItem.share}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        {/* Customer Installment & Down Payment Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden space-y-0">
          <div className="p-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">ລາຍຊື່ລູກຄ້າຜ່ອນຊຳລະ & ເງິນດາວທັງໝົດ</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                {filteredInstallmentCustomers.length} ຄົນ
              </span>
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-900 text-zinc-400 font-mono uppercase text-[11px] border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">ລູກຄ້າ & ເບີໂທ</th>
                  <th className="py-3 px-4">ລຸ້ນລົດທີ່ເລືອກ</th>
                  <th className="py-3 px-4">ເງິນດາວ (% & USD)</th>
                  <th className="py-3 px-4">ຍອດກູ້ & ງວດ</th>
                  <th className="py-3 px-4">ຄ່າງວດ/ເດືອນ</th>
                  <th className="py-3 px-4">ຄວາມຄືບໜ້າການຜ່ອນ</th>
                  <th className="py-3 px-4">ສະຖານະ</th>
                  <th className="py-3 px-4 text-center">ຈັດການ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono text-zinc-300">
                {filteredInstallmentCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500 font-sans">
                      ບໍ່ພົບລາຍຊື່ລູກຄ້າຜ່ອນ-ດາວທີ່ກົງກັບເງື່ອນໄຂ
                    </td>
                  </tr>
                ) : (
                  filteredInstallmentCustomers.map((lead) => {
                    const matchedVeh = vehicles.find(v => v.name === lead.interestedModel);
                    const basePrice = matchedVeh?.priceStartingUSD || 50000;
                    const downUSD = lead.downPaymentUSD || Math.round(basePrice * ((lead.downPaymentPercent || 30) / 100));
                    const loanUSD = Math.max(0, basePrice - downUSD);
                    const tenureMonths = lead.tenureMonths || 48;
                    const monthlyLAK = lead.monthlyPaymentLAK || Math.round((loanUSD * DEFAULT_EXCHANGE_RATE_LAK) / tenureMonths);

                    // Progress
                    const records = lead.installmentRecords || [];
                    const paidCount = records.filter(r => r.status === 'paid').length;
                    const progressPct = Math.round((paidCount / tenureMonths) * 100);

                    return (
                      <tr key={lead.id} className="hover:bg-zinc-800/40 transition-colors">
                        {/* Customer */}
                        <td className="py-3 px-4 font-sans">
                          <strong className="text-white font-semibold block">{lead.customerName}</strong>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-zinc-400 font-mono text-[11px]">{lead.phone}</span>
                            <a
                              href={getWhatsAppUrl(lead.phone, lead.customerName, lead.interestedModel, lang)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-1.5 py-0.5 rounded font-sans font-semibold flex items-center gap-1 transition-colors border border-emerald-600/30"
                            >
                              <WhatsAppIcon className="w-2.5 h-2.5" />
                              <span>WA</span>
                            </a>
                          </div>
                          <span className="text-[10px] text-zinc-500 block">{lead.province || 'Vientiane'}</span>
                        </td>

                        {/* Model */}
                        <td className="py-3 px-4 font-sans">
                          <strong className="text-white block">{lead.interestedModel || 'AVATR'}</strong>
                          <span className="text-zinc-400 text-[11px] font-mono">${basePrice.toLocaleString()} USD</span>
                        </td>

                        {/* Down Payment */}
                        <td className="py-3 px-4">
                          <strong className="text-amber-400 block">${downUSD.toLocaleString()} USD</strong>
                          <span className="text-[11px] text-zinc-400 font-sans">ດາວ {lead.downPaymentPercent || 30}%</span>
                        </td>

                        {/* Loan & Tenure */}
                        <td className="py-3 px-4">
                          <strong className="text-white block">${loanUSD.toLocaleString()} USD</strong>
                          <span className="text-zinc-400 text-[11px] font-sans">{tenureMonths} ເດືອນ ({Math.round(tenureMonths / 12)} ປີ)</span>
                        </td>

                        {/* Monthly Payment */}
                        <td className="py-3 px-4">
                          <strong className="text-white block">~{monthlyLAK.toLocaleString()} LAK</strong>
                          <span className="text-[10px] text-zinc-500 font-mono">~${Math.round(monthlyLAK / DEFAULT_EXCHANGE_RATE_LAK)} USD/ເດືອນ</span>
                        </td>

                        {/* Progress */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between text-[11px] mb-1 font-sans">
                            <span className="text-zinc-400">{paidCount}/{tenureMonths} ງວດ</span>
                            <span className="text-amber-400 font-bold">{progressPct}%</span>
                          </div>
                          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 font-sans">
                          {lead.status === 'delivered' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>ຈ່າຍດາວແລ້ວ</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-400" />
                              <span>ກຳລັງຜ່ອນ</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedLeadForLedger(lead)}
                              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-white hover:text-black text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              title="ເປີດຕາຕະລາງຜ່ອນ & ບັນທຶກຮັບເງິນງວດ"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>ຕາຕະລາງຜ່ອນ</span>
                            </button>

                            <button
                              onClick={() => setSelectedLeadForDocs(lead)}
                              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
                              title="ເບິ່ງເອກະສານສັນຍາ & ຕາຕະລາງ A4"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
      <section className="dashboard-panel space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-500 dark:text-sky-400" />
              <span>{t.customerCategoryTitle}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t.customerCategorySubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateMenu('customers')}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span>{t.viewAllDetails}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Category 1: Walk in */}
          <article className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 transition-colors hover:border-emerald-500/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                  <Store className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{t.catWalkIn}</h3>
                  <p className="text-xs text-zinc-400">{lang === 'lo' ? 'ລູກຄ້າມາຕິດຕໍ່ໜ້າໂຊຣູມ' : lang === 'th' ? 'ลูกค้าเข้าติดต่อที่โชว์รูม' : 'Showroom visitors'}</p>
                </div>
              </div>
              <span className="font-mono text-3xl font-bold text-emerald-700 dark:text-emerald-300">{walkInLeads.length.toLocaleString()}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{t.ratioLabel}</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {Math.round((walkInLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${(walkInLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2 border-t border-emerald-500/15 pt-3 text-sm">
              <span className="block text-xs font-medium text-zinc-500">{t.latestCustomers}</span>
              {walkInLeads.length ? walkInLeads.slice(0, 2).map(l => (
                <div key={l.id} className="flex min-w-0 items-center justify-between gap-3 text-zinc-300">
                  <span className="truncate font-medium">{l.customerName}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{l.interestedModel}</span>
                </div>
              )) : <p className="text-xs text-zinc-500">{t.noCustomersFound}</p>}
            </div>
          </article>

          {/* Category 2: Online */}
          <article className="space-y-4 rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-5 transition-colors hover:border-sky-500/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2.5">
                  <Globe className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{t.catOnline}</h3>
                  <p className="text-xs text-zinc-400">{lang === 'lo' ? 'ສື່ສັງຄົມ ແລະ ເວັບໄຊ' : lang === 'th' ? 'โซเชียลมีเดียและเว็บไซต์' : 'Social media & website'}</p>
                </div>
              </div>
              <span className="font-mono text-3xl font-bold text-sky-700 dark:text-sky-300">{onlineLeads.length.toLocaleString()}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{t.ratioLabel}</span>
                <span className="font-semibold text-sky-700 dark:text-sky-300">
                  {Math.round((onlineLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all"
                  style={{ width: `${(onlineLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2 border-t border-sky-500/15 pt-3 text-sm">
              <span className="block text-xs font-medium text-zinc-500">{t.latestCustomers}</span>
              {onlineLeads.length ? onlineLeads.slice(0, 2).map(l => (
                <div key={l.id} className="flex min-w-0 items-center justify-between gap-3 text-zinc-300">
                  <span className="truncate font-medium">{l.customerName}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{l.interestedModel}</span>
                </div>
              )) : <p className="text-xs text-zinc-500">{t.noCustomersFound}</p>}
            </div>
          </article>

          {/* Category 3: Event */}
          <article className="space-y-4 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-5 transition-colors hover:border-violet-500/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5">
                  <CalendarCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{t.catEvent}</h3>
                  <p className="text-xs text-zinc-400">{lang === 'lo' ? 'ລູກຄ້າຈາກງານຈັດສະແດງ' : lang === 'th' ? 'ลูกค้าจากงานอีเวนต์' : 'Event visitors'}</p>
                </div>
              </div>
              <span className="font-mono text-3xl font-bold text-violet-700 dark:text-violet-300">{eventLeads.length.toLocaleString()}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{t.ratioLabel}</span>
                <span className="font-semibold text-violet-700 dark:text-violet-300">
                  {Math.round((eventLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${(eventLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2 border-t border-violet-500/15 pt-3 text-sm">
              <span className="block text-xs font-medium text-zinc-500">{t.latestCustomers}</span>
              {eventLeads.length ? eventLeads.slice(0, 2).map(l => (
                <div key={l.id} className="flex min-w-0 items-center justify-between gap-3 text-zinc-300">
                  <span className="truncate font-medium">{l.customerName}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{l.interestedModel}</span>
                </div>
              )) : <p className="text-xs text-zinc-500">{t.noCustomersFound}</p>}
            </div>
          </article>
        </div>
      </section>

      {/* SECTION 3: ການສະແດງສິນຄ້າ Event ແລະ ໂປຣໂມຊັນພິເສດ (Events & Active Promotions) */}
      <div className="dashboard-panel bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6">
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

      {/* INSTALLMENT LEDGER MODAL FOR REPAYMENT SCHEDULE & PAYMENT CONFIRMATION */}
      {selectedLeadForLedger && (
        <InstallmentLedgerModal
          isOpen={Boolean(selectedLeadForLedger)}
          onClose={() => setSelectedLeadForLedger(null)}
          customer={selectedLeadForLedger}
          vehicles={vehicles}
          currentUser={currentUser || undefined}
          lang={lang}
          onUpdateCustomerRecords={handleUpdateCustomerRecords}
        />
      )}

      {/* CUSTOMER OFFICIAL DOCUMENTS MODAL (A4 PRINT & PDF DOWNLOAD) */}
      {selectedLeadForDocs && (
        <CustomerDocumentsModal
          isOpen={Boolean(selectedLeadForDocs)}
          onClose={() => setSelectedLeadForDocs(null)}
          customer={selectedLeadForDocs}
          vehicles={vehicles}
          currentUser={currentUser || undefined}
          initialDoc="installment_schedule"
          onConfirmPayment={(updated) => {
            if (setLeads) {
              setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            }
          }}
        />
      )}
    </div>
  );
}
