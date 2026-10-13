import { useState, useMemo } from 'react';
import { 
  Lead, 
  VehicleModel, 
  InvoiceBillRecord, 
  Language, 
  SystemUser, 
  ActiveMenu, 
  InstallmentPaymentRecord 
} from '../../types';
import { translations } from '../../data/translations';
import { 
  CreditCard, 
  Building2, 
  Coins, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Download, 
  Calendar, 
  FileText, 
  Phone, 
  Car, 
  BadgePercent, 
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  CheckCircle,
  Filter,
} from 'lucide-react';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import { DEFAULT_EXCHANGE_RATE_LAK, generateInstallmentSchedule, calculateInstallmentSummary } from '../../utils/installment';
import InstallmentLedgerModal from '../modals/InstallmentLedgerModal';
import CustomerDocumentsModal, { DocumentType } from '../modals/CustomerDocumentsModal';

interface InstallmentDashboardViewProps {
  leads: Lead[];
  setLeads?: React.Dispatch<React.SetStateAction<Lead[]>>;
  bills?: InvoiceBillRecord[];
  vehicles: VehicleModel[];
  lang: Language;
  currentUser?: SystemUser | null;
  onNavigateMenu?: (menu: ActiveMenu) => void;
}

export default function InstallmentDashboardView({
  leads = [],
  setLeads,
  bills = [],
  vehicles = [],
  lang,
  currentUser,
  onNavigateMenu,
}: InstallmentDashboardViewProps) {
  const t = translations[lang] || translations.lo;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered' | 'completed'>('all');
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'year'>('all');

  // Modals
  const [selectedLeadForLedger, setSelectedLeadForLedger] = useState<Lead | null>(null);
  const [selectedLeadForDocs, setSelectedLeadForDocs] = useState<Lead | null>(null);

  // 1. Filter installment customers (leads with installment type or finance info)
  const installmentLeads = useMemo(() => {
    return leads.filter(l => 
      l.paymentType === 'installment' || 
      l.paymentType === 'finance' || 
      Boolean(l.downPaymentPercent) || 
      Boolean(l.financeCompany) ||
      Boolean(l.installmentRecords && l.installmentRecords.length > 0)
    );
  }, [leads]);

  // 2. Filter installment bills (bills from finance/down payment)
  const installmentBills = useMemo(() => {
    return bills.filter(b => 
      b.billType === 'installment' || 
      b.paymentMethod === 'finance' || 
      Boolean(b.financeCompany) || 
      Boolean(b.downPaymentPercent && b.downPaymentPercent > 0)
    );
  }, [bills]);

  // 3. Compute Portfolio Metrics
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

      // Calculate schedule summary
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
      ? Math.min(100, Math.round((onTimeInstallments / totalInstallmentsChecked) * 100) + 70) // Weighted positive health index
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

  // 5. Tenure breakdown (36, 48, 60 months)
  const tenureBreakdown = useMemo(() => {
    const t36 = installmentLeads.filter(l => (l.tenureMonths || 48) <= 36);
    const t48 = installmentLeads.filter(l => (l.tenureMonths || 48) === 48);
    const t60 = installmentLeads.filter(l => (l.tenureMonths || 48) >= 60);
    const total = installmentLeads.length || 1;

    return [
      { label: '36 ເດືອນ (3 ປີ)', count: t36.length, percent: Math.round((t36.length / total) * 100) },
      { label: '48 ເດືອນ (4 ປີ - ນິຍົມສູງສຸດ)', count: t48.length, percent: Math.round((t48.length / total) * 100) },
      { label: '60 ເດືອນ (5 ປີ)', count: t60.length, percent: Math.round((t60.length / total) * 100) },
    ];
  }, [installmentLeads]);

  // 6. Filtered Customer Table List
  const filteredCustomers = useMemo(() => {
    return installmentLeads.filter(lead => {
      // Status filter
      if (statusFilter === 'delivered' && lead.status !== 'delivered') return false;
      if (statusFilter === 'active' && lead.installmentStatus !== 'active_repaying' && lead.status === 'delivered') return false;
      if (statusFilter === 'completed' && lead.installmentStatus !== 'completed') return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          lead.customerName.toLowerCase().includes(q) ||
          lead.phone.toLowerCase().includes(q) ||
          (lead.interestedModel && lead.interestedModel.toLowerCase().includes(q)) ||
          (lead.province && lead.province.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [installmentLeads, statusFilter, searchQuery]);

  // Handle export CSV
  const handleExportCsv = () => {
    const headers = [
      'CustomerName',
      'Phone',
      'Model',
      'PriceUSD',
      'DownPercent',
      'DownPaymentUSD',
      'LoanUSD',
      'TenureMonths',
      'MonthlyLAK',
      'Status'
    ];

    const rows = filteredCustomers.map(lead => {
      const v = vehicles.find(veh => veh.name === lead.interestedModel);
      const price = v?.priceStartingUSD || 50000;
      const downUSD = lead.downPaymentUSD || Math.round(price * ((lead.downPaymentPercent || 30) / 100));
      const loanUSD = Math.max(0, price - downUSD);

      return [
        `"${lead.customerName}"`,
        lead.phone,
        lead.interestedModel,
        price,
        lead.downPaymentPercent || 30,
        downUSD,
        loanUSD,
        lead.tenureMonths || 48,
        lead.monthlyPaymentLAK || 21500000,
        lead.status === 'delivered' ? 'ຈ່າຍແລ້ວ/ສົ່ງມອບ' : 'ກຳລັງດຳເນີນງານ'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AVATR_Installment_Dashboard_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Update customer records from ledger
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
            paidAmountLAK: totalPaidLAK,
            paidAmountUSD: totalPaidUSD,
            installmentStatus: paidRecords.length === updatedRecords.length && updatedRecords.length > 0 ? 'completed' : 'active_repaying',
          };
        }
        return l;
      }));
    }
  };

  return (
    <div className="space-y-7 pb-16 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-950 border border-amber-500/30 p-6 sm:p-7 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-amber-400 text-black rounded-lg font-bold">
              <CreditCard className="w-5 h-5 text-black" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-amber-300 font-bold">
              INSTALLMENT ANALYTICS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dashboard ຕິດຕາມການຜ່ອນຊຳລະ & ເງິນດາວ
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            ລວມສະຖິຕິການເງິນ, ຍອດເງິນດາວ, ຍອດກູ້ຢືມສິນເຊື່ອ, ການເກັບເງິນງວດ ແລະ ຄວາມຄືບໜ້າການຊຳລະຂອງລູກຄ້າທຸກຄົນ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${timeframe === 'all' ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              ທັງໝົດ
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${timeframe === 'month' ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              ເດືອນນີ້
            </button>
            <button
              onClick={() => setTimeframe('year')}
              className={`px-3 py-1.5 rounded-lg transition-all ${timeframe === 'year' ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              ປີນີ້
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {onNavigateMenu && (
            <button
              onClick={() => onNavigateMenu('bills')}
              className="px-4 py-2 bg-white text-black hover:bg-zinc-200 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ໄປໜ້າບັນທຶກບິນ</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 High-Impact Portfolio KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Total Down Payment */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden group hover:border-amber-500/50 transition-all">
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
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
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
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
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
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden group hover:border-purple-500/50 transition-all">
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
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden group hover:border-zinc-700 transition-all">
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
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
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
      <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-white">
                ໄລຍະເວລາຜ່ອນທີ່ນິຍົມ (Tenure)
              </h3>
            </div>
            <span className="text-xs text-zinc-500 font-mono">Tenure %</span>
          </div>

          <div className="space-y-4 pt-1">
            {tenureBreakdown.map(tenure => (
              <div key={tenure.label} className="p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-semibold">{tenure.label}</span>
                  <span className="font-mono font-bold text-blue-400">{tenure.percent}% ({tenure.count} ຄົນ)</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${tenure.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-zinc-400 pt-2 border-t border-zinc-800/80 leading-relaxed">
            ລູກຄ້າສ່ວນໃຫຍ່ເລືອກແຜນຜ່ອນ 48 ເດືອນ (4 ປີ) ເພື່ອຮັບຄ່າງວດທີ່ເໝາະສົມ (~18-22 ລ້ານກີບ/ເດືອນ).
          </div>
        </div>

      {/* INSTALLMENT CUSTOMER REPAYMENT TRACKER TABLE */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>ລາຍຊື່ລູກຄ້າຜ່ອນ-ດາວ & ຕາຕະລາງຕິດຕາມການຊຳລະ</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                {filteredCustomers.length} ລູກຄ້າ
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              ກວດສອບສະຖານະ, ເງິນດາວ, ຍອດກູ້ຢືມ, ຄ່າງວດ ແລະ ເປີດຕາຕະລາງບັນທຶກຮັບເງິນງວດໄດ້ໂດຍກົງ
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ຄົ້ນຫາຊື່, ເບີໂທ, ລຸ້ນລົດ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white font-medium"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white"
            >
              <option value="all">ທຸກສະຖານະ</option>
              <option value="delivered">ຈ່າຍດາວແລ້ວ</option>
              <option value="active">ກຳລັງຜ່ອນ</option>
              <option value="completed">ຜ່ອນຄົບແລ້ວ</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-zinc-900 text-zinc-400 font-medium border-b border-zinc-800">
              <tr>
                <th className="py-3.5 px-4">ລູກຄ້າ & ເບີໂທ</th>
                <th className="py-3.5 px-4">ລຸ້ນລົດທີ່ເລືອກ</th>
                <th className="py-3.5 px-4">ເງິນດາວ (% & USD)</th>
                <th className="py-3.5 px-4">ຍອດກູ້ & ງວດ</th>
                <th className="py-3.5 px-4">ຄ່າງວດ/ເດືອນ</th>
                <th className="py-3.5 px-4">ຄວາມຄືບໜ້າການຜ່ອນ</th>
                <th className="py-3.5 px-4">ສະຖານະ</th>
                <th className="py-3.5 px-4 text-center">ການດຳເນີນງານ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 font-mono">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 font-sans">
                    ບໍ່ພົບລາຍຊື່ລູກຄ້າຜ່ອນ-ດາວທີ່ກົງກັບເງື່ອນໄຂ
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(lead => {
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
                    <tr key={lead.id} className="hover:bg-zinc-900/50 transition-colors">
                      {/* Customer */}
                      <td className="py-3.5 px-4 font-sans">
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
                        <span className="text-[10px] text-zinc-500 block">{lead.province}</span>
                      </td>

                      {/* Model */}
                      <td className="py-3.5 px-4 font-sans">
                        <strong className="text-white block">{lead.interestedModel}</strong>
                        <span className="text-zinc-400 text-[11px] font-mono">${basePrice.toLocaleString()} USD</span>
                      </td>

                      {/* Down Payment */}
                      <td className="py-3.5 px-4">
                        <strong className="text-amber-400 block">${downUSD.toLocaleString()} USD</strong>
                        <span className="text-[11px] text-zinc-400 font-sans">ດາວ {lead.downPaymentPercent || 30}%</span>
                      </td>

                      {/* Loan & Tenure */}
                      <td className="py-3.5 px-4">
                        <strong className="text-white block">${loanUSD.toLocaleString()} USD</strong>
                        <span className="text-zinc-400 text-[11px] font-sans">{tenureMonths} ເດືອນ ({Math.round(tenureMonths / 12)} ປີ)</span>
                      </td>

                      {/* Monthly Payment */}
                      <td className="py-3.5 px-4">
                        <strong className="text-white block">~{monthlyLAK.toLocaleString()} LAK</strong>
                        <span className="text-[10px] text-zinc-500 font-mono">~${Math.round(monthlyLAK / DEFAULT_EXCHANGE_RATE_LAK)} USD/ເດືອນ</span>
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4 font-sans">
                        {lead.status === 'delivered' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>ຈ່າຍດາວແລ້ວ</span>
                          </span>
                        ) : lead.installmentStatus === 'active_repaying' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-400" />
                            <span>ກຳລັງຜ່ອນ</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-300" />
                            <span>ລໍຖ້າອະນຸມັດ</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center font-sans">
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

      {/* MODAL 1: INSTALLMENT LEDGER MODAL */}
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

      {/* MODAL 2: CUSTOMER DOCUMENTS MODAL (A4 PRINT / PDF) */}
      {selectedLeadForDocs && (
        <CustomerDocumentsModal
          isOpen={Boolean(selectedLeadForDocs)}
          onClose={() => setSelectedLeadForDocs(null)}
          customer={selectedLeadForDocs}
          vehicles={vehicles}
          currentUser={currentUser || undefined}
          lang={lang}
          initialDoc="installment_schedule"
          onConfirmPayment={(updatedCust) => {
            if (setLeads) {
              setLeads(prev => prev.map(l => l.id === updatedCust.id ? updatedCust : l));
            }
          }}
        />
      )}
    </div>
  );
}
