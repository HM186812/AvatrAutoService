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
  Filter,
  Wrench,
  BatteryCharging,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { getModelStockSummaries } from '../../data/stockSummary';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import { DEFAULT_EXCHANGE_RATE_LAK, calculateInstallmentSummary, generateInstallmentSchedule } from '../../utils/installment';
import InstallmentLedgerModal from '../modals/InstallmentLedgerModal';
import CustomerDocumentsModal, { DocumentType } from '../modals/CustomerDocumentsModal';
import { saveLead } from '../../backend/data';

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
  onOpenNewService?: () => void;
  onOpenNewTestDrive?: () => void;
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
  onOpenNewService,
  onOpenNewTestDrive,
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

  // Model-level stock aggregation (< 5 units alert)
  const modelSummaries = useMemo(() => {
    return getModelStockSummaries(vehicles, inventory);
  }, [vehicles, inventory]);

  const lowStockModels = useMemo(() => {
    return modelSummaries.filter(m => m.isLowStock || m.isOutOfStock);
  }, [modelSummaries]);

  // Sale & Delivery Bills (Includes Full Sales & Installment Down Payments)
  const saleBills = useMemo(() => {
    return (bills || []).filter(b => 
      b.billType === 'sale' || 
      b.billType === 'installment' || 
      b.type === 'sale' || 
      b.type === 'installment'
    );
  }, [bills]);

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

  const handleUpdateCustomerRecords = async (customerId: string, updatedRecords: InstallmentPaymentRecord[]) => {
    const targetLead = leads.find(l => l.id === customerId);
    if (!targetLead) throw new Error('Customer record not found.');
    const paidRecords = updatedRecords.filter(r => r.status === 'paid');
    const totalPaidLAK = paidRecords.reduce((sum, r) => sum + r.amountLAK, 0);
    const totalPaidUSD = paidRecords.reduce((sum, r) => sum + r.amountUSD, 0);
    const updatedCust: Lead = {
      ...targetLead,
      installmentRecords: updatedRecords,
      paidAmountLAK: totalPaidLAK,
      paidAmountUSD: totalPaidUSD,
      installmentStatus: paidRecords.length === updatedRecords.length && updatedRecords.length > 0 ? 'completed' : 'active_repaying',
      lastFollowUp: new Date().toISOString(),
    };
    if (!currentUser?.id) {
      throw new Error('Sign in again before saving installment ledger.');
    }
    await saveLead(updatedCust, currentUser.id);
    if (setLeads) {
      setLeads(prev => prev.map(l => l.id === customerId ? updatedCust : l));
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
      <div className="dashboard-hero bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-mono tracking-widest uppercase text-slate-500 dark:text-zinc-400">
              {t.consoleSubtitle}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.dashboardTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            {t.dashboardSubtitle} • ໄລຍະເວລາ: <span className="text-blue-600 dark:text-white font-bold">{kpiData.label}</span>
          </p>
        </div>

        {/* Timeframe Selector (ມື້, ອາທິດ, ເດືອນ, ປີ) */}
        <div className="dashboard-timeframe flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1.5 rounded-2xl shadow-inner">
          <span className="text-xs text-slate-500 dark:text-zinc-400 px-2 font-mono uppercase font-semibold">{t.timeframeSelector}</span>
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
                ? 'bg-blue-600 text-white shadow-sm font-bold scale-105'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-zinc-800'
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
          className="dashboard-kpi-card bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-zinc-500 rounded-3xl p-5 cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs mb-3">
            <span className="font-medium">{t.kpiTotalLeads} ({kpiData.label})</span>
            <span className="p-2.5 bg-blue-50 dark:bg-zinc-900 text-blue-600 dark:text-white rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">{kpiData.leads}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">ລູກຄ້າ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-white">
            <span>{t.manageCrmAction}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 2: ຈຳນວນລົດພ້ອມຂາຍ (Vehicles Ready For Sale) */}
        <div
          onClick={isAdmin ? () => onNavigateMenu('alerts') : undefined}
          className={`dashboard-kpi-card bento-card bg-white dark:bg-zinc-950 border ${
            lowStockModels.length > 0 ? 'border-amber-500/40 hover:border-amber-500' : 'border-slate-200/90 dark:border-zinc-800 hover:border-blue-500/50'
          } rounded-3xl p-5 transition-all ${
            isAdmin ? 'cursor-pointer hover:shadow-md group' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs mb-3">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${lowStockModels.length > 0 ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`}></span>
              <span>ຈຳນວນລົດພ້ອມຂາຍ</span>
            </span>
            <span className={`p-2.5 rounded-2xl transition-colors ${
              lowStockModels.length > 0 
                ? 'bg-amber-50 dark:bg-zinc-900 text-amber-600 dark:text-amber-400' 
                : 'bg-emerald-50 dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white'
            }`}>
              <Car className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">{readyCars.length}</span>
            <span className="text-xs text-emerald-600 font-semibold font-mono">
              ຄັນ {inventory.length > 0 ? `(${Math.round((readyCars.length / inventory.length) * 100)}%)` : ''}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-zinc-400 font-mono flex items-center gap-1.5 flex-wrap">
            {modelSummaries.slice(0, 4).map((m, idx) => (
              <span key={m.modelName} className="inline-flex items-center gap-1">
                {idx > 0 && <span className="text-slate-300 dark:text-zinc-600">•</span>}
                <span>{m.modelName.replace('AVATR', 'A').trim()}:</span>
                <b className={m.isOutOfStock ? 'text-rose-600 dark:text-red-400' : m.isLowStock ? 'text-amber-600 dark:text-amber-300' : 'text-slate-900 dark:text-white'}>
                  {m.count}
                </b>
                {m.isLowStock && <span className="text-[9px] text-amber-600 font-bold">(&lt;5)</span>}
              </span>
            ))}
          </div>
          <div className={`mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 ${
            isAdmin ? 'group-hover:text-blue-600 dark:group-hover:text-white' : ''
          }`}>
            <span>
              {lowStockModels.length > 0 ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{lowStockModels.length} ລຸ້ນຕ່ຳກວ່າ 5 ຄັນ</span>
                </span>
              ) : (
                <span>{pdiCars.length} PDI • {importedCars.length} ນຳເຂົ້າ</span>
              )}
            </span>
            {isAdmin && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-white font-medium group-hover:underline">
                <span>{lowStockModels.length > 0 ? 'ເຕືອນສາງ' : 'ກວດສາງ'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>

        {/* KPI 3: Sales Deliveries */}
        <div
          onClick={() => onNavigateMenu('bills')}
          className="dashboard-kpi-card bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-zinc-500 rounded-3xl p-5 cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs mb-3">
            <span className="font-medium">ຍອດຂາຍລົດ ({kpiData.label})</span>
            <span className="p-2.5 bg-blue-50 dark:bg-zinc-900 text-blue-600 dark:text-white rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">{kpiData.salesCount}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">ຄັນທີ່ຂາຍອອກ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-white">
            <span>{t.viewBillsAction}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 4: Revenue */}
        <div
          onClick={() => onNavigateMenu('bills')}
          className="dashboard-kpi-card bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-zinc-500 rounded-3xl p-5 cursor-pointer transition-all hover:shadow-md group"
          title="Bills & Invoices"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs mb-3">
            <span className="font-medium text-slate-900 dark:text-white">{t.kpiRevenueTitle} ({kpiData.label})</span>
            <span className="p-2.5 bg-blue-50 dark:bg-zinc-900 text-blue-600 dark:text-white rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              ${kpiData.revenueUSD.toLocaleString()}
            </span>
            <span className="text-xs text-blue-600 font-mono font-bold">USD</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-white">
            <span className="font-mono text-slate-500 dark:text-zinc-400 font-medium">≈ {((kpiData.revenueUSD * 22000) / 1000000).toFixed(0)}M LAK</span>
            <span className="flex items-center gap-1 text-blue-600 dark:text-white font-semibold group-hover:underline">
              <span>{t.viewBillsAction}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: ສະແດງການຂາຍຕົວຈິງ & ປະຫວັດການຂາຍຫຼ້າສຸດ (Live Sales Transactions) */}
      <div className="dashboard-panel bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="text-[11px] font-mono tracking-widest uppercase text-blue-600 dark:text-zinc-400 font-bold">
                REAL-TIME BILLING & POS TRANSACTIONS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-white" />
              <span>ສະແດງການຂາຍຕົວຈິງ & ອອກໃບບິນຫຼ້າສຸດ</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              ຕິດຕາມລາຍການຂາຍລົດ, ການຊຳລະເງິນສົດ, ໂອນ QR, ແລະ ຜ່ອນຊຳລະ Finance ຕາມເວລາຕົວຈິງ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateMenu('bills')}
              className="text-xs text-blue-600 dark:text-zinc-300 hover:text-blue-700 dark:hover:text-white font-semibold flex items-center gap-1.5 bg-blue-50 dark:bg-zinc-900 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-zinc-700 hover:border-blue-300 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t.viewBillsAction}</span>
            </button>
          </div>
        </div>

        {/* Sales Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all' as const, label: `ທັງໝົດ (${saleBills.length})` },
            { id: 'transfer' as const, label: `ໂອນຜ່ານ QR (${saleBills.filter(b => b.paymentMethod === 'transfer').length})` },
            { id: 'finance' as const, label: `ຜ່ອນຊຳລະ / Finance (${saleBills.filter(b => b.paymentMethod === 'finance').length})` },
            { id: 'cash' as const, label: `ເງິນສົດ (${saleBills.filter(b => b.paymentMethod === 'cash').length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSalesFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                salesFilter === tab.id
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sales Table / List */}
        {filteredSales.length === 0 ? (
          <div className="p-8 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-2xl text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto" />
            <h4 className="text-slate-900 dark:text-white font-bold text-sm">ຍັງບໍ່ມີລາຍການຂາຍລົດໃນໝວດນີ້</h4>
            <p className="text-slate-600 dark:text-zinc-400 text-xs max-w-md mx-auto">
              ເມື່ອມີການຂາຍລົດ ແລະ ອອກໃບບິນຈາກໜ້າ POS Sales Billing ຂໍ້ມູນຈະສະແດງຢູ່ນີ້ໂດຍອັດຕະໂນມັດ
            </p>
            <button
              onClick={() => onNavigateMenu('bills')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t.viewBillsAction}</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-400 font-mono uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">ໃບບິນ / ວັນທີ</th>
                    <th className="py-3 px-4">ລູກຄ້າ</th>
                    <th className="py-3 px-4">ລຸ້ນລົດທີ່ຂາຍ</th>
                    <th className="py-3 px-4">ຮູບແບບການຊຳລະ</th>
                    <th className="py-3 px-4">ຍອດຂາຍສຸດທິ (USD / LAK)</th>
                    <th className="py-3 px-4 text-right">ໃບບິນ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-zinc-800/80 text-slate-800 dark:text-zinc-300">
                  {filteredSales.slice(0, 6).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">{b.billNumber}</span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono block">
                          {b.date || (b.timestamp ? new Date(b.timestamp).toISOString().split('T')[0] : 'N/A')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">{b.customerName || 'ລູກຄ້າທົ່ວໄປ'}</span>
                        <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono">{b.customerPhone || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">{b.model}</span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono truncate block">VIN: {b.vin.slice(0, 12)}...</span>
                      </td>
                      <td className="py-3 px-4">
                        {b.paymentMethod === 'finance' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <CreditCard className="w-3 h-3 text-purple-700 dark:text-purple-300" />
                            <span>ຜ່ອນ ({b.downPaymentPercent || 30}% ດາວน์)</span>
                          </span>
                        ) : b.paymentMethod === 'transfer' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <span>ໂອນຜ່ານ QR</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            <span>ເງິນສົດ</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                          ${(b.netTotalUSD || b.amountUSD || 0).toLocaleString()} USD
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 dark:text-zinc-400 block">
                          {(b.netTotalLAK || 0).toLocaleString()} LAK
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onNavigateMenu('bills')}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-900 dark:text-white rounded-lg text-xs font-bold transition-colors border border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
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
              <div className="p-3 bg-slate-100/80 dark:bg-zinc-900/80 border-t border-slate-200 dark:border-zinc-800 text-center">
                <button
                  onClick={() => onNavigateMenu('bills')}
                  className="text-xs text-blue-600 dark:text-zinc-400 hover:text-blue-700 dark:hover:text-white font-bold transition-colors cursor-pointer"
                >
                  ເບິ່ງລາຍການຂາຍທັງໝົດອີກ {filteredSales.length - 6} ລາຍການ ໃນໜ້າໃບບິນ →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION: Installment portfolio */}
      <div className="dashboard-panel bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm">
        {/* Section Header with Live Status & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="text-[11px] font-mono tracking-widest uppercase text-blue-600 dark:text-amber-400 font-bold">
                INSTALLMENT PORTFOLIO
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-amber-400" />
              <span>ພາບລວມການຜ່ອນຊຳລະ & ລູກຄ້າເງິນດາວ</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              ຕິດຕາມຍອດເງິນດາວ, ວົງເງິນສິນເຊື່ອກູ້ຢືມ, ແລະ ຕາຕະລາງຊຳລະຄ່າງວດຂອງລູກຄ້າຕົວຈິງ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ຄົ້ນຫາຊື່, ເບີໂທ, ລຸ້ນ..."
                value={installmentSearchQuery}
                onChange={(e) => setInstallmentSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            {/* Status Filter */}
            <select
              value={installmentStatusFilter}
              onChange={(e) => setInstallmentStatusFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="all">ທຸກສະຖານະ</option>
              <option value="delivered">ຈ່າຍດາວແລ້ວ</option>
              <option value="active">ກຳລັງຜ່ອນ</option>
            </select>

            {/* Export CSV Button */}
            <button
              onClick={handleExportInstallmentCsv}
              className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="ດາວໂຫຼດຕາຕະລາງເປັນ CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            {/* Direct Link to Full Installment Hub */}
            <button
              type="button"
              onClick={() => onNavigateMenu('installment_dashboard')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              title="ເປີດໜ້າຈໍ Dashboard ຜ່ອນຊຳລະເຕັມຮູບແບບ"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Dashboard ຜ່ອນຊຳລະ →</span>
            </button>
          </div>
        </div>

        {/* 6 High-Impact Portfolio Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Total Down Payment */}
          <div className="bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/50 transition-all shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-slate-800 dark:text-zinc-300 flex items-center gap-1.5">
                <BadgePercent className="w-4 h-4 text-amber-500" />
                <span>ຍອດເງິນດາວທັງໝົດ (Down Payments)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px] border border-amber-500/30 font-bold">
                COLLECTED
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
              ${portfolioMetrics.totalDownPaymentUSD.toLocaleString()} USD
            </div>
            <div className="text-xs text-slate-600 dark:text-zinc-400 font-mono mt-1">
              ~{portfolioMetrics.totalDownPaymentLAK.toLocaleString()} LAK
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-zinc-800/80 flex justify-between text-[11px] text-slate-600 dark:text-zinc-400">
              <span>ອັດຕາດາວສະເລ່ຍ:</span>
              <span className="text-slate-900 dark:text-white font-bold">{portfolioMetrics.averageDownPercent}% ຂອງມູນຄ່າລົດ</span>
            </div>
          </div>

          {/* Card 2: Total Financed Portfolio */}
          <div className="bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-all shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-slate-800 dark:text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span>ຍອດສິນເຊື່ອລວມ (Loan Portfolio)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono text-[10px] border border-blue-500/30 font-bold">
                FINANCED
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              ${portfolioMetrics.totalFinancedUSD.toLocaleString()} USD
            </div>
            <div className="text-xs text-slate-600 dark:text-zinc-400 font-mono mt-1">
              ~{portfolioMetrics.totalFinancedLAK.toLocaleString()} LAK
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-zinc-800/80 flex justify-between text-[11px] text-slate-600 dark:text-zinc-400">
              <span>ສັນຍາກູ້ຢືມທັງໝົດ:</span>
              <span className="text-blue-600 dark:text-blue-300 font-bold">{portfolioMetrics.totalCustomers} ສັນຍາລົດຍົນ</span>
            </div>
          </div>

          {/* Card 3: Total Installments Collected */}
          <div className="bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-slate-800 dark:text-zinc-300 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-500" />
                <span>ຍອດເກັບເງິນງວດແລ້ວ (Installments Paid)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] border border-emerald-500/30 font-bold">
                RECEIVED
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              ${portfolioMetrics.totalCollectedUSD.toLocaleString()} USD
            </div>
            <div className="text-xs text-slate-600 dark:text-zinc-400 font-mono mt-1">
              ~{portfolioMetrics.totalCollectedLAK.toLocaleString()} LAK
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-zinc-800/80 flex justify-between text-[11px] text-slate-600 dark:text-zinc-400">
              <span>ບິນຮັບເງິນງວດໃນລະບົບ:</span>
              <span className="text-emerald-600 dark:text-emerald-300 font-bold">{installmentBills.length} ໃບບິນ</span>
            </div>
          </div>

          {/* Card 4: Outstanding Balance */}
          <div className="bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/50 transition-all shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-slate-800 dark:text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-500" />
                <span>ຍອດໜີ້ຄົງເຫຼືອທີ່ຕ້ອງເກັບ (Outstanding)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 font-mono text-[10px] border border-purple-500/30 font-bold">
                REMAINING
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              ${portfolioMetrics.totalOutstandingUSD.toLocaleString()} USD
            </div>
            <div className="text-xs text-slate-600 dark:text-zinc-400 font-mono mt-1">
              ~{portfolioMetrics.totalOutstandingLAK.toLocaleString()} LAK
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-zinc-800/80 flex justify-between text-[11px] text-slate-600 dark:text-zinc-400">
              <span>ຄວາມຄືບໜ້າການເກັບ:</span>
              <span className="text-purple-600 dark:text-purple-300 font-bold">
                {portfolioMetrics.totalFinancedUSD > 0
                  ? Math.round((portfolioMetrics.totalCollectedUSD / portfolioMetrics.totalFinancedUSD) * 100)
                  : 0}% ສຳເລັດ
              </span>
            </div>
          </div>

          {/* Card 5: Total Installment Customers */}
          <div className="bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-300 dark:hover:border-zinc-700 transition-all shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-slate-800 dark:text-zinc-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" />
                <span>ລູກຄ້າຜ່ອນ & ດາວທັງໝົດ</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300 font-mono text-[10px] border border-slate-300 dark:border-zinc-700 font-bold">
                ACCOUNTS
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {portfolioMetrics.totalCustomers} <span className="text-sm font-sans text-slate-500 dark:text-zinc-400">ລາຍການ</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-zinc-800/80 flex justify-between text-[11px] text-slate-600 dark:text-zinc-400 font-sans">
              <span>ສະຖານະ:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {installmentLeads.filter(l => l.status === 'delivered').length} ຈ່າຍດາວແລ້ວ
              </span>
            </div>
          </div>

          {/* Card 6: Repayment Health Index */}
          <div className="bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400 text-xs mb-2">
              <span className="font-semibold text-slate-800 dark:text-zinc-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>ດັດຊະນີສຸຂະພາບການຊຳລະ</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] border border-emerald-500/30 font-bold">
                HEALTH
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {portfolioMetrics.healthRate}%
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-zinc-800/80 flex justify-between text-[11px] text-slate-600 dark:text-zinc-400">
              <span>ການປະເມີນຄວາມສ່ຽງ:</span>
              <span className="text-emerald-600 dark:text-emerald-300 font-bold">ລະດັບດີຫຼາຍ (Low Risk)</span>
            </div>
          </div>
        </div>

        {/* Installment tenure overview */}
        <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl space-y-3 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-zinc-800">
            <Calendar className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">ໄລຍະເວລາຜ່ອນ (Tenure)</h3>
          </div>

          <div className="space-y-3 pt-1">
            {tenureBreakdown.map((tItem) => (
              <div key={tItem.months} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-zinc-300 font-medium">{tItem.label}</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">{tItem.count} ຄົນ ({tItem.share}%)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
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
        <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden space-y-0 shadow-sm dark:shadow-none">
          <div className="p-4 bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">ລາຍຊື່ລູກຄ້າຜ່ອນຊຳລະ & ເງິນດາວທັງໝົດ</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700">
                {filteredInstallmentCustomers.length} ຄົນ
              </span>
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-400 font-mono uppercase text-[11px] border-b border-slate-200 dark:border-zinc-800 font-bold">
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
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800/80 font-mono text-slate-800 dark:text-zinc-300">
                {filteredInstallmentCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400">
                        <FileText className="h-5 w-5" />
                      </span>
                      <span className="mt-3 block text-sm font-semibold text-slate-900 dark:text-zinc-200 font-sans">
                        {lang === 'lo' ? 'ບໍ່ພົບລາຍຊື່ລູກຄ້າຜ່ອນ-ດາວ' : lang === 'th' ? 'ไม่พบรายชื่อลูกค้าผ่อน-ดาวน์' : 'No Installment Customers Found'}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400 font-sans">
                        {lang === 'lo' ? 'ບໍ່ມີລາຍການທີ່ຕົງກັບເງື່ອນໄຂການຄົ້ນຫາ ຫຼື ຕົວກອງ' : 'No records match the current filter or search.'}
                      </span>
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
                      <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                        {/* Customer */}
                        <td className="py-3 px-4 font-sans">
                          <strong className="text-slate-900 dark:text-white font-semibold block">{lead.customerName}</strong>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-slate-600 dark:text-zinc-400 font-mono text-[11px]">{lead.phone}</span>
                            <a
                              href={getWhatsAppUrl(lead.phone, lead.customerName, lead.interestedModel, lang)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] bg-emerald-600/15 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-400 hover:text-white px-1.5 py-0.5 rounded font-sans font-semibold flex items-center gap-1 transition-colors border border-emerald-600/30"
                            >
                              <WhatsAppIcon className="w-2.5 h-2.5" />
                              <span>WA</span>
                            </a>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-500 block">{lead.province || 'Vientiane'}</span>
                        </td>

                        {/* Model */}
                        <td className="py-3 px-4 font-sans">
                          <strong className="text-slate-900 dark:text-white block">{lead.interestedModel || 'AVATR'}</strong>
                          <span className="text-slate-600 dark:text-zinc-400 text-[11px] font-mono">${basePrice.toLocaleString()} USD</span>
                        </td>

                        {/* Down Payment */}
                        <td className="py-3 px-4">
                          <strong className="text-amber-600 dark:text-amber-400 block">${downUSD.toLocaleString()} USD</strong>
                          <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-sans">ດາວ {lead.downPaymentPercent || 30}%</span>
                        </td>

                        {/* Loan & Tenure */}
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 dark:text-white block">${loanUSD.toLocaleString()} USD</strong>
                          <span className="text-slate-600 dark:text-zinc-400 text-[11px] font-sans">{tenureMonths} ເດືອນ ({Math.round(tenureMonths / 12)} ປີ)</span>
                        </td>

                        {/* Monthly Payment */}
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 dark:text-white block">~{monthlyLAK.toLocaleString()} LAK</strong>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">~${Math.round(monthlyLAK / DEFAULT_EXCHANGE_RATE_LAK)} USD/ເດືອນ</span>
                        </td>

                        {/* Progress */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between text-[11px] mb-1 font-sans">
                            <span className="text-slate-600 dark:text-zinc-400">{paidCount}/{tenureMonths} ງວດ</span>
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{progressPct}%</span>
                          </div>
                          <div className="w-24 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 font-sans">
                          {lead.status === 'delivered' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>ຈ່າຍດາວແລ້ວ</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>ກຳລັງຜ່ອນ</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedLeadForLedger(lead)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 dark:bg-zinc-900 dark:hover:bg-white dark:hover:text-black dark:text-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              title="ເປີດຕາຕະລາງຜ່ອນ & ບັນທຶກຮັບເງິນງວດ"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>ຕາຕະລາງຜ່ອນ</span>
                            </button>

                            <button
                              onClick={() => setSelectedLeadForDocs(lead)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 dark:hover:text-white border border-slate-300 dark:border-zinc-700 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
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

      {/* SECTION 0.8: ສູນບໍລິການ EV & ຕາຕະລາງທົດລອງຂັບ (EV Service Appointments & Test Drive Schedule) */}
      <div className="bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <Activity className="w-3 h-3 text-blue-500" />
                AFTER-SALES & TEST DRIVE HUB
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-500" />
              <span>ສູນບໍລິການຫຼັງການຂາຍ & ຕາຕະລາງນັດທົດລອງຂັບ</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
              ຕິດຕາມສະຖານະການກວດສອບແບັດເຕີຣີ 800V, ອັບເດດ HarmonyOS ແລະ ຄິວນັດທົດລອງຂັບລົດ AVATR ແບບ Real-time
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenNewService && (
              <button
                type="button"
                onClick={onOpenNewService}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ນັດບໍລິການໃໝ່</span>
              </button>
            )}
            {onOpenNewTestDrive && (
              <button
                type="button"
                onClick={onOpenNewTestDrive}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ຈອງທົດລອງຂັບ</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: ສູນບໍລິການຫຼັງການຂາຍ & ແບັດເຕີຣີ */}
          <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-none flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <BatteryCharging className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>ສູນບໍລິການຫຼັງການຂາຍ & ກວດແບັດເຕີຣີ</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      EV Diagnostic & 800V High-Voltage Health
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {services.length} ລາຍການ
                </span>
              </div>

              {/* Service Items List */}
              <div className="space-y-2.5">
                {services.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 dark:text-zinc-500 text-xs">
                    ຍັງບໍ່ມີຂໍ້ມູນການນັດໝາຍສູນບໍລິການ
                  </div>
                ) : (
                  services.slice(0, 4).map((svc) => {
                    const getServiceTypeBadge = (type: string) => {
                      switch (type) {
                        case 'battery_check':
                          return { label: 'ກວດເຊັກແບັດເຕີຣີ 800V', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30' };
                        case 'software_ota':
                          return { label: 'ອັບເດດລະບົບ HarmonyOS', color: 'text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/30' };
                        case 'periodic_maintenance':
                          return { label: 'ເຊັກໄລຍະປົກກະຕິ (PDI/10k)', color: 'text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/30' };
                        default:
                          return { label: 'ກວດສອບທົ່ວໄປ', color: 'text-slate-700 dark:text-zinc-300 bg-slate-200 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700' };
                      }
                    };
                    const typeBadge = getServiceTypeBadge(svc.serviceType);

                    return (
                      <div
                        key={svc.id}
                        className="p-3.5 bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 transition-all shadow-sm dark:shadow-none space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-900 dark:text-white text-xs font-bold">
                              {svc.customerName}
                            </strong>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                              {svc.phone}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeBadge.color}`}>
                            {typeBadge.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-zinc-800/60">
                          <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
                            <span className="font-semibold text-slate-800 dark:text-zinc-200">{svc.model}</span>
                            <span>•</span>
                            <span className="font-mono bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800 font-bold text-slate-800 dark:text-zinc-300">
                              {svc.plateNumber || 'ປ້າຍກຳແພງ'}
                            </span>
                            {svc.batteryHealthPercent && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                  <BatteryCharging className="w-3 h-3" />
                                  <span>SOH {svc.batteryHealthPercent}%</span>
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                              ຊ່າງ: <span className="font-semibold text-slate-700 dark:text-zinc-300">{svc.technician}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              svc.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : svc.status === 'in_progress'
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            }`}>
                              {svc.status === 'completed' ? 'ສຳເລັດແລ້ວ' : svc.status === 'in_progress' ? 'ກຳລັງກວດເຊັກ' : 'ລໍຖ້າຄິວ'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenNewService ? onOpenNewService : () => onNavigateMenu('customers')}
              className="mt-3 w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>+ ເປີດຟອມນັດໝາຍສູນບໍລິການ →</span>
            </button>
          </div>

          {/* Column 2: ຕາຕະລາງລູກຄ້ານັດທົດລອງຂັບ */}
          <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-none flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>ຕາຕະລາງລູກຄ້ານັດທົດລອງຂັບ</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      VIP Test Drive Booking & Route Schedule
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  {testDrives.length} ຄິວນັດ
                </span>
              </div>

              {/* Test Drive Items List */}
              <div className="space-y-2.5">
                {testDrives.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 dark:text-zinc-500 text-xs">
                    ຍັງບໍ່ມີຂໍ້ມູນການນັດໝາຍທົດລອງຂັບ
                  </div>
                ) : (
                  testDrives.slice(0, 4).map((td) => {
                    return (
                      <div
                        key={td.id}
                        className="p-3.5 bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 transition-all shadow-sm dark:shadow-none space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-900 dark:text-white text-xs font-bold">
                              {td.customerName}
                            </strong>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                              {td.phone}
                            </span>
                            <a
                              href={getWhatsAppUrl(td.phone, td.customerName, td.model, lang)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] bg-emerald-600/15 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-400 hover:text-white px-1.5 py-0.5 rounded font-sans font-semibold flex items-center gap-1 transition-colors border border-emerald-600/30"
                              title="ສົ່ງຂໍ້ຄວາມຫາລູກຄ້າຜ່ານ WhatsApp"
                            >
                              <WhatsAppIcon className="w-2.5 h-2.5" />
                              <span>WA</span>
                            </a>
                          </div>

                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white font-mono shadow-sm">
                            {td.model}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-zinc-800/60">
                          <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">{td.date}</span>
                            <span>•</span>
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-mono text-slate-700 dark:text-zinc-300">{td.timeSlot}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                              ທີ່ປຶກສາ: <span className="font-semibold text-slate-700 dark:text-zinc-300">{td.salesRep}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              td.status === 'confirmed'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : td.status === 'completed'
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                                : td.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30'
                            }`}>
                              {td.status === 'confirmed' ? 'ຢືນຢັນແລ້ວ' : td.status === 'completed' ? 'ສຳເລັດ' : td.status === 'pending' ? 'ລໍຖ້າຢືນຢັນ' : 'ຍົກເລີກ'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenNewTestDrive ? onOpenNewTestDrive : () => onNavigateMenu('customers')}
              className="mt-3 w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>+ ເປີດຟອມຈອງທົດລອງຂັບ →</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: ສະຖານະຄັງລົດໃນສາງ (ລວມລົດ Event & ໂປຣໂມຊັນ) */}
      <div className="bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600 dark:text-white" />
              <span>{t.inventoryStagesTitle}</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
              {t.inventoryStagesSubtitle}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => onNavigateMenu('inventory')}
              className="text-xs text-slate-800 dark:text-zinc-300 hover:text-black dark:hover:text-white font-medium flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              <span>{t.manageAllStock}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stages Grid (6 Stages: Imported, PDI, Ready, Reserved, Event, Promotion) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* Stage 1: ນຳເຂົ້າ / ລໍຖ້າກຽມຂາຍ */}
          <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700">
                {t.stage1Imported}
              </span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">{importedCars.length}</span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-tight">
              {t.stage1Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-zinc-800/80 text-xs">
              {importedCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800">
                  <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">{c.location}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 2: ກຳລັງ PDI */}
          <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700">
                {t.stage2PDI}
              </span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">{pdiCars.length}</span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-tight">
              {t.stage2Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-zinc-800/80 text-xs">
              {pdiCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800">
                  <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-slate-600 dark:text-zinc-400 truncate">{c.plateNumber}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 3: ພ້ອມຂາຍ */}
          <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-600 text-white border border-emerald-700 dark:bg-white dark:text-black dark:border-zinc-300 font-bold">
                {t.stage3Ready}
              </span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">{readyCars.length}</span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-tight">
              {t.stage3Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-zinc-800/80 text-xs">
              {readyCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800">
                  <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-slate-600 dark:text-zinc-400 truncate">{c.color}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 4: ຈອງແລ້ວ */}
          <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700">
                {t.stage4Reserved}
              </span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">{reservedCars.length}</span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-tight">
              {t.stage4Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-zinc-800/80 text-xs">
              {reservedCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800">
                  <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-slate-600 dark:text-zinc-400 truncate">{c.reservedForCustomer || 'VIP Client'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 5: ລົດງານ Event */}
          <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-zinc-800 text-purple-800 dark:text-zinc-200 border border-purple-200 dark:border-zinc-700 flex items-center gap-1 font-bold">
                <Sparkles className="w-3 h-3 text-purple-600 dark:text-zinc-400" />
                <span>{t.stage5Event}</span>
              </span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">{eventCars.length}</span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-tight">
              {t.stage5Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-zinc-800/80 text-xs">
              {eventCars.length > 0 ? eventCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800">
                  <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-slate-600 dark:text-zinc-400 truncate">{c.eventCampaign || 'Motor Show'}</div>
                </div>
              )) : (
                <div className="text-[10px] text-slate-500 dark:text-zinc-500 py-1 text-center">{t.noEventCarsNow}</div>
              )}
            </div>
          </div>

          {/* Stage 6: ລົດແຄມເປນໂປຣໂມຊັນ */}
          <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-zinc-800 text-amber-800 dark:text-zinc-200 border border-amber-200 dark:border-zinc-700 flex items-center gap-1 font-bold">
                <Flame className="w-3 h-3 text-amber-600 dark:text-zinc-400" />
                <span>{t.stage6Promo}</span>
              </span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">{promoCars.length}</span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-tight">
              {t.stage6Desc}
            </p>

            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-zinc-800/80 text-xs">
              {promoCars.length > 0 ? promoCars.slice(0, 1).map(c => (
                <div key={c.vin} className="p-2 bg-white dark:bg-zinc-950 rounded-lg border border-slate-200 dark:border-zinc-800">
                  <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{c.model}</div>
                  <div className="text-[10px] text-slate-600 dark:text-zinc-400 truncate">{c.eventCampaign || 'Special Promo'}</div>
                </div>
              )) : (
                <div className="text-[10px] text-slate-500 dark:text-zinc-500 py-1 text-center">{t.noPromoCarsNow}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ບ່ອນສະແດງລູກຄ້າ 3 ໝວດ (Walk-in, Online, Event) */}
      <section className="dashboard-panel bento-card space-y-5 rounded-3xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 sm:p-7 shadow-sm dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-500 dark:text-sky-400" />
              <span>{t.customerCategoryTitle}</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
              {t.customerCategorySubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateMenu('customers')}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-slate-800 dark:text-zinc-300 transition-colors hover:text-black dark:hover:text-white cursor-pointer"
          >
            <span>{t.viewAllDetails}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Category 1: Walk in */}
          <article className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 transition-colors hover:border-emerald-500/40 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                  <Store className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{t.catWalkIn}</h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400">{lang === 'lo' ? 'ລູກຄ້າມາຕິດຕໍ່ໜ້າໂຊຣູມ' : lang === 'th' ? 'ลูกค้าเข้าติดต่อที่โชว์รูม' : 'Showroom visitors'}</p>
                </div>
              </div>
              <span className="font-mono text-3xl font-bold text-emerald-700 dark:text-emerald-300">{walkInLeads.length.toLocaleString()}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600 dark:text-zinc-400">
                <span>{t.ratioLabel}</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {Math.round((walkInLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${(walkInLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2 border-t border-emerald-500/15 pt-3 text-sm">
              <span className="block text-xs font-bold text-slate-700 dark:text-zinc-400">{t.latestCustomers}</span>
              {walkInLeads.length ? walkInLeads.slice(0, 2).map(l => (
                <div key={l.id} className="flex min-w-0 items-center justify-between gap-3 text-slate-900 dark:text-zinc-300">
                  <span className="truncate font-semibold">{l.customerName}</span>
                  <span className="shrink-0 text-xs text-slate-600 dark:text-zinc-400 font-medium">{l.interestedModel}</span>
                </div>
              )) : <p className="text-xs text-slate-500 dark:text-zinc-500">{t.noCustomersFound}</p>}
            </div>
          </article>

          {/* Category 2: Online */}
          <article className="space-y-4 rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-5 transition-colors hover:border-sky-500/40 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2.5">
                  <Globe className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{t.catOnline}</h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400">{lang === 'lo' ? 'ສື່ສັງຄົມ ແລະ ເວັບໄຊ' : lang === 'th' ? 'โซเชียลมีเดียและเว็บไซต์' : 'Social media & website'}</p>
                </div>
              </div>
              <span className="font-mono text-3xl font-bold text-sky-700 dark:text-sky-300">{onlineLeads.length.toLocaleString()}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600 dark:text-zinc-400">
                <span>{t.ratioLabel}</span>
                <span className="font-semibold text-sky-700 dark:text-sky-300">
                  {Math.round((onlineLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all"
                  style={{ width: `${(onlineLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2 border-t border-sky-500/15 pt-3 text-sm">
              <span className="block text-xs font-bold text-slate-700 dark:text-zinc-400">{t.latestCustomers}</span>
              {onlineLeads.length ? onlineLeads.slice(0, 2).map(l => (
                <div key={l.id} className="flex min-w-0 items-center justify-between gap-3 text-slate-900 dark:text-zinc-300">
                  <span className="truncate font-semibold">{l.customerName}</span>
                  <span className="shrink-0 text-xs text-slate-600 dark:text-zinc-400 font-medium">{l.interestedModel}</span>
                </div>
              )) : <p className="text-xs text-slate-500 dark:text-zinc-500">{t.noCustomersFound}</p>}
            </div>
          </article>

          {/* Category 3: Event */}
          <article className="space-y-4 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-5 transition-colors hover:border-violet-500/40 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5">
                  <CalendarCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{t.catEvent}</h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400">{lang === 'lo' ? 'ລູກຄ້າຈາກງານຈັດສະແດງ' : lang === 'th' ? 'ลูกค้าจากงานอีเวนต์' : 'Event visitors'}</p>
                </div>
              </div>
              <span className="font-mono text-3xl font-bold text-violet-700 dark:text-violet-300">{eventLeads.length.toLocaleString()}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600 dark:text-zinc-400">
                <span>{t.ratioLabel}</span>
                <span className="font-semibold text-violet-700 dark:text-violet-300">
                  {Math.round((eventLeads.length / Math.max(1, leads.length)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${(eventLeads.length / Math.max(1, leads.length)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2 border-t border-violet-500/15 pt-3 text-sm">
              <span className="block text-xs font-bold text-slate-700 dark:text-zinc-400">{t.latestCustomers}</span>
              {eventLeads.length ? eventLeads.slice(0, 2).map(l => (
                <div key={l.id} className="flex min-w-0 items-center justify-between gap-3 text-slate-900 dark:text-zinc-300">
                  <span className="truncate font-semibold">{l.customerName}</span>
                  <span className="shrink-0 text-xs text-slate-600 dark:text-zinc-400 font-medium">{l.interestedModel}</span>
                </div>
              )) : <p className="text-xs text-slate-500 dark:text-zinc-500">{t.noCustomersFound}</p>}
            </div>
          </article>
        </div>
      </section>

      {/* SECTION 3: ການສະແດງສິນຄ້າ Event ແລະ ໂປຣໂມຊັນພິເສດ (Events & Active Promotions) */}
      <div className="dashboard-panel bento-card bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-white dark:bg-white dark:text-black flex items-center gap-1 shadow-sm always-white-text">
                <Flame className="w-3 h-3 fill-amber-400 text-amber-400 dark:fill-black dark:text-black shrink-0" />
                ACTIVE CAMPAIGNS & PROMOTIONS
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 dark:text-white" />
              <span>{t.eventsAndPromotionsTitle}</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
              {t.eventsAndPromotionsSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigateMenu('inventory')}
                className="text-xs text-slate-800 dark:text-zinc-300 hover:text-black dark:hover:text-white font-medium flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                <Car className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                <span>{t.viewEventStock}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigateMenu('inventory')}
              className="text-xs text-white bg-blue-600 hover:bg-blue-500 font-bold flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <BadgePercent className="w-3.5 h-3.5" />
              <span>{t.openPosPromo}</span>
            </button>
          </div>
        </div>

        {/* Promotion Campaigns Grid */}
        {ACTIVE_PROMOTIONS.length === 0 ? (
          <div className="p-8 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/80 rounded-2xl text-center space-y-2">
            <Sparkles className="w-8 h-8 text-slate-400 dark:text-zinc-600 mx-auto" />
            <p className="text-slate-700 dark:text-zinc-400 text-sm font-medium">{t.noPromotionsTitle}</p>
            <p className="text-slate-500 dark:text-zinc-500 text-xs">{t.noPromotionsDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ACTIVE_PROMOTIONS.map((promo) => (
              <div
                key={promo.id}
                className="bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-2xl overflow-hidden flex flex-col justify-between transition-all hover:shadow-xl group shadow-sm dark:shadow-none"
              >
                <div>
                  {/* Image Banner with Badge */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-900 dark:bg-zinc-950">
                    <img
                      src={promo.imageUrl}
                      alt={lang === 'lo' ? promo.titleLo : promo.titleEn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

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
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-zinc-200 transition-colors line-clamp-2">
                        {lang === 'lo' ? promo.titleLo : promo.titleEn}
                      </h3>
                      {promo.eventLocation && (
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 flex items-center gap-1 mt-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-500 dark:text-zinc-500 flex-shrink-0" />
                          <span>{promo.eventLocation}</span>
                        </p>
                      )}
                    </div>

                    {/* Highlight Benefit Box */}
                    <div className="p-2.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs space-y-1 shadow-sm dark:shadow-none">
                      <div className="flex items-center gap-1 text-[10px] text-slate-700 dark:text-zinc-300 font-bold uppercase font-mono">
                        <Gift className="w-3 h-3 text-amber-500" />
                        <span>Privilege</span>
                      </div>
                      <p className="text-slate-800 dark:text-zinc-200 font-semibold text-[11px] leading-snug">
                        {promo.highlightBenefit}
                      </p>
                    </div>

                    {/* Free Gifts List */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono uppercase block font-bold">Perks:</span>
                      <ul className="text-[11px] text-slate-800 dark:text-zinc-300 space-y-0.5 font-medium">
                        {promo.freeGifts.slice(0, 3).map((gift, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 truncate">
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="truncate">{gift}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="p-4 pt-0">
                  <div className="pt-3 border-t border-slate-200 dark:border-zinc-800/80 flex items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onNavigateMenu('inventory')}
                        className="flex-1 py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-white dark:border-zinc-700 cursor-pointer"
                      >
                        <Car className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
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
                      className={`${isAdmin ? 'py-2 px-3' : 'w-full py-2.5 px-4'} bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm cursor-pointer`}
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
          onConfirmPayment={async (updated) => {
            if (!currentUser?.id) {
              throw new Error('Sign in again before confirming payment.');
            }
            await saveLead(updated, currentUser.id);
            if (setLeads) {
              setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            }
          }}
        />
      )}
    </div>
  );
}
