import React, { useState, useMemo, useEffect } from 'react';
import {
  Lead,
  VehicleModel,
  InvoiceBillRecord,
  Language,
  SystemUser,
  ActiveMenu,
  InstallmentPaymentRecord,
  IssuedDocumentRecord
} from '../../types';
import { translations } from '../../data/translations';
import { showToast } from '../common';
import {
  getIssuedDocumentLogs,
  getCustomerDocumentLogs,
  DOCUMENT_LOG_EVENT,
} from '../../utils/documentLogger';
import {
  Users,
  CheckCircle2,
  Clock,
  Search,
  Calendar,
  FileText,
  CreditCard,
  Coins,
  BadgePercent,
  AlertTriangle,
  Building2,
  Car,
  LayoutGrid,
  List,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Sparkles,
  Phone,
  MapPin,
  FileCheck,
  Lock
} from 'lucide-react';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl, openWhatsAppWithMessage } from '../../utils/whatsapp';
import {
  DEFAULT_EXCHANGE_RATE_LAK,
  generateInstallmentSchedule,
  calculateInstallmentSummary
} from '../../utils/installment';
import InstallmentLedgerModal from '../modals/InstallmentLedgerModal';
import CustomerDocumentsModal from '../modals/CustomerDocumentsModal';
import QuickInstallmentPaymentModal from '../modals/QuickInstallmentPaymentModal';
import ConfirmPayoffModal from '../modals/ConfirmPayoffModal';
import { saveLead, saveBillRecord } from '../../backend/data';
import { newRecordId } from '../../backend/ids';

interface InstallmentDashboardViewProps {
  leads: Lead[];
  setLeads?: React.Dispatch<React.SetStateAction<Lead[]>>;
  bills?: InvoiceBillRecord[];
  setBills?: React.Dispatch<React.SetStateAction<InvoiceBillRecord[]>>;
  vehicles: VehicleModel[];
  lang: Language;
  currentUser?: SystemUser | null;
  onNavigateMenu?: (menu: ActiveMenu) => void;
  onNavigateTab?: (tab: 'new_leads' | 'existing_customers' | 'installment_customers') => void;
}

export default function InstallmentDashboardView({
  leads = [],
  setLeads,
  bills = [],
  setBills,
  vehicles = [],
  lang,
  currentUser,
  onNavigateMenu,
  onNavigateTab,
}: InstallmentDashboardViewProps) {
  const t = translations[lang] || translations.lo;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'due' | 'completed'>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals
  const [selectedLeadForQuickPay, setSelectedLeadForQuickPay] = useState<Lead | null>(null);
  const [selectedLeadForLedger, setSelectedLeadForLedger] = useState<Lead | null>(null);
  const [selectedLeadForDocs, setSelectedLeadForDocs] = useState<Lead | null>(null);
  const [selectedLeadForPayoff, setSelectedLeadForPayoff] = useState<{
    lead: Lead;
    summary: any;
    contractNo: string;
  } | null>(null);
  const [issuedDocLogs, setIssuedDocLogs] = useState<IssuedDocumentRecord[]>(() => getIssuedDocumentLogs());

  useEffect(() => {
    const handleLogsUpdate = () => {
      setIssuedDocLogs(getIssuedDocumentLogs());
    };
    window.addEventListener(DOCUMENT_LOG_EVENT, handleLogsUpdate);
    return () => {
      window.removeEventListener(DOCUMENT_LOG_EVENT, handleLogsUpdate);
    };
  }, []);

  const getCustomerIssuedDocsCount = (lead: Lead) => {
    return getCustomerDocumentLogs({
      leadId: lead.id,
      customerName: lead.customerName,
      customerPhone: lead.phone,
      vin: lead.vin,
    }).length;
  };

  const triggerToast = (msg: string) => {
    showToast(msg, 'success');
  };

  // 1. Filter installment customers (leads with installment type, down payment, leasing, or from bills)
  const installmentLeads = useMemo(() => {
    const matchedLeads = leads.filter(l => {
      // If customer payment is fully completed & moved, exclude unless viewing 'completed' status
      if (l.isPaymentCompleted && statusFilter !== 'completed') return false;

      const isInstallment = l.paymentType === 'installment' ||
        l.paymentType === 'finance' ||
        Boolean(l.downPaymentPercent) ||
        Boolean(l.financeCompany) ||
        Boolean(l.installmentRecords && l.installmentRecords.length > 0) ||
        l.installmentStatus === 'active_repaying' ||
        l.installmentStatus === 'completed' ||
        l.installmentStatus === 'approved' ||
        l.installmentStatus === 'pending_approval';
      return isInstallment;
    });

    const seenPhones = new Set(matchedLeads.map(l => (l.phone || '').replace(/\D/g, '')).filter(Boolean));
    const extraFromBills: Lead[] = [];

    bills.filter(b => (b.paymentMethod === 'finance' || b.billType === 'installment' || Boolean(b.downPaymentPercent))).forEach(bill => {
      const cleanPhone = (bill.customerPhone || '').replace(/\D/g, '');
      if (cleanPhone && seenPhones.has(cleanPhone)) return;
      if (matchedLeads.some(l => l.id === bill.leadId)) return;
      if (leads.some(l => (l.id === bill.leadId || (cleanPhone && l.phone && l.phone.replace(/\D/g, '') === cleanPhone)) && l.isPaymentCompleted) && statusFilter !== 'completed') return;
      seenPhones.add(cleanPhone || bill.id);

      extraFromBills.push({
        id: bill.leadId || `inst-bill-${bill.id}`,
        customerName: bill.customerName || 'ລູກຄ້າຜ່ອນ',
        phone: bill.customerPhone || '',
        idCardNumber: bill.customerIDCard,
        province: bill.customerProvince || 'ນະຄອນຫຼວງວຽງຈັນ',
        category: 'walk_in',
        source: 'POS Installment',
        interestedModel: bill.model || 'AVATR 11',
        status: 'delivered',
        priority: 'high',
        notes: `ສັນຍາຜ່ອນຈາກບິນ ${bill.billNumber || bill.id}`,
        paymentType: 'installment',
        paymentTypeConfirmed: 'down_payment',
        installmentStatus: 'active_repaying',
        downPaymentPercent: bill.downPaymentPercent || 30,
        downPaymentUSD: bill.downPaymentUSD || 0,
        tenureMonths: bill.tenureMonths || 48,
        monthlyPaymentLAK: bill.monthlyPaymentLAK || 0,
        financeCompany: bill.financeCompany || 'AVATR Leasing',
        paymentReceiptNo: bill.billNumber || bill.id,
        paymentDate: bill.date,
        createdAt: bill.date || new Date().toISOString(),
        assignedTo: bill.salesRep || 'Admin',
      });
    });

    return [...matchedLeads, ...extraFromBills];
  }, [leads, bills]);

  // 2. Computed Summaries per Lead
  const leadsWithSummaries = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    return installmentLeads.map(lead => {
      const matchedVeh = vehicles.find(v => v.name === lead.interestedModel) || vehicles[0];
      const basePrice = matchedVeh?.priceStartingUSD || 50000;
      const records = generateInstallmentSchedule(lead, basePrice);
      const summary = calculateInstallmentSummary(lead, records, basePrice);

      // Next due record
      const nextUnpaid = records.find(r => r.status !== 'paid');
      const isDueSoon = nextUnpaid ? (new Date(nextUnpaid.dueDate).getTime() - today.getTime()) / (1000 * 3600 * 24) <= 7 : false;
      const isOverdue = nextUnpaid ? nextUnpaid.dueDate < todayStr : false;

      const contractNo = lead.paymentReceiptNo || `AVT-FIN-${lead.id.replace(/\D/g, '').slice(-4) || '001'}`;

      return {
        lead,
        matchedVeh,
        basePrice,
        records,
        summary,
        nextUnpaid,
        isDueSoon,
        isOverdue,
        contractNo,
      };
    });
  }, [installmentLeads, vehicles]);

  // 3. Filtered Customers
  const filteredCustomers = useMemo(() => {
    return leadsWithSummaries.filter(({ lead, summary, nextUnpaid, isDueSoon, isOverdue, contractNo }) => {
      // Model Filter
      if (modelFilter !== 'all' && lead.interestedModel !== modelFilter) return false;

      // Status filter
      if (statusFilter === 'active' && summary.isFullyPaid) return false;
      if (statusFilter === 'completed' && !summary.isFullyPaid) return false;
      if (statusFilter === 'due' && !isDueSoon && !isOverdue) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          lead.customerName.toLowerCase().includes(q) ||
          lead.phone.toLowerCase().includes(q) ||
          (lead.interestedModel && lead.interestedModel.toLowerCase().includes(q)) ||
          (lead.province && lead.province.toLowerCase().includes(q)) ||
          contractNo.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leadsWithSummaries, statusFilter, modelFilter, searchQuery]);

  // 4. Portfolio Overall KPI Metrics
  const portfolioMetrics = useMemo(() => {
    let totalPortfolioBalanceUSD = 0;
    let totalCollectedUSD = 0;
    let activeContractsCount = 0;
    let dueOrOverdueCount = 0;

    leadsWithSummaries.forEach(({ summary, isDueSoon, isOverdue }) => {
      totalPortfolioBalanceUSD += summary.remainingInstallmentsUSD;
      totalCollectedUSD += summary.totalPaidInstallmentsUSD + summary.downPaymentUSD;
      if (!summary.isFullyPaid) {
        activeContractsCount += 1;
      }
      if (isDueSoon || isOverdue) {
        dueOrOverdueCount += 1;
      }
    });

    return {
      totalPortfolioBalanceUSD,
      totalPortfolioBalanceLAK: totalPortfolioBalanceUSD * DEFAULT_EXCHANGE_RATE_LAK,
      totalCollectedUSD,
      totalCollectedLAK: totalCollectedUSD * DEFAULT_EXCHANGE_RATE_LAK,
      activeContractsCount,
      dueOrOverdueCount,
      totalContracts: leadsWithSummaries.length,
    };
  }, [leadsWithSummaries]);

  // Update customer records from ledger or quick payment
  const handleUpdateCustomerRecords = async (customerId: string, updatedRecords: InstallmentPaymentRecord[]) => {
    const targetLead = leads.find(l => l.id === customerId);
    if (!targetLead) throw new Error('Customer record not found.');

    const paidRecords = updatedRecords.filter(r => r.status === 'paid');
    const totalPaidLAK = paidRecords.reduce((sum, r) => sum + (r.paidAmountLAK || r.amountLAK), 0);
    const totalPaidUSD = paidRecords.reduce((sum, r) => sum + (r.paidAmountUSD || r.amountUSD), 0);
    const isCompleted = paidRecords.length === updatedRecords.length && updatedRecords.length > 0;

    const updatedCust: Lead = {
      ...targetLead,
      installmentRecords: updatedRecords,
      paidAmountLAK: totalPaidLAK,
      paidAmountUSD: totalPaidUSD,
      installmentStatus: isCompleted ? 'completed' : 'active_repaying',
      lastFollowUp: new Date().toISOString(),
    };

    if (!currentUser?.id) {
      throw new Error('Sign in again before saving installment ledger.');
    }

    await saveLead(updatedCust, currentUser.id);
    if (setLeads) {
      setLeads(prev => prev.map(l => l.id === customerId ? updatedCust : l));
    }

    // Synchronize newly paid installment receipts into bills collection
    if (setBills) {
      paidRecords.forEach(r => {
        const receiptNo = r.receiptNo || `REC-INS-${targetLead.id.replace(/\D/g, '').slice(-4) || '001'}-${String(r.period).padStart(2, '0')}`;
        const alreadyInBills = bills.some(b => b.billNumber === receiptNo || (b.leadId === targetLead.id && b.installmentPeriod === r.period));
        if (!alreadyInBills) {
          const matchedVeh = vehicles.find(v => v.name === targetLead.interestedModel);
          const payUSD = Number(r.paidAmountUSD || r.amountUSD) || 0;
          const payLAK = Number(r.paidAmountLAK || r.amountLAK) || Math.round(payUSD * DEFAULT_EXCHANGE_RATE_LAK);
          const newReceiptBill: InvoiceBillRecord = {
            id: newRecordId(),
            billType: 'installment',
            billNumber: receiptNo,
            date: r.paidDate || new Date().toISOString().slice(0, 10),
            model: targetLead.interestedModel || matchedVeh?.name || 'AVATR',
            vin: targetLead.vin || '',
            plateNumber: targetLead.plateNumber || '',
            color: targetLead.color || '',
            quantity: 1,
            unitPriceUSD: payUSD,
            unitPriceLAK: payLAK,
            discountUSD: 0,
            discountLAK: 0,
            netTotalUSD: payUSD,
            netTotalLAK: payLAK,
            amountUSD: payUSD,
            amountLAK: payLAK,
            customerName: targetLead.customerName,
            customerPhone: targetLead.phone,
            leadId: targetLead.id,
            customerIDCard: targetLead.idCardNumber,
            customerAddress: [targetLead.village, targetLead.district, targetLead.province].filter(Boolean).join(', '),
            customerProvince: targetLead.province,
            paymentMethod: (r.paymentMethod as any) || 'transfer',
            bankName: r.bankName,
            transferRef: r.transferRef,
            installmentPeriod: r.period,
            tenureMonths: targetLead.tenureMonths,
            monthlyPaymentLAK: payLAK,
            financeCompany: targetLead.financeCompany,
            salesRep: r.collectedBy || currentUser?.name || 'Admin',
            recordedBy: currentUser?.name || 'Admin',
            notes: r.notes || `ຮັບເງິນງວດທີ ${r.period} ລູກຄ້າ ${targetLead.customerName}`,
          };
          saveBillRecord(newReceiptBill, currentUser.id).catch(err => console.warn('Sync installment bill:', err));
          setBills(prev => [newReceiptBill, ...prev]);
        }
      });
    }

    showToast('ບັນທຶກຮັບເງິນງວດ ແລະ ອັບເດດຕາຕະລາງຜ່ອນສຳເລັດແລ້ວ!');
  };

  // Confirm Final Payoff and Move to Completed Customers Page
  const handleConfirmPayoff = async (customerId: string) => {
    const target = leadsWithSummaries.find(item => item.lead.id === customerId);
    if (!target) throw new Error('Customer record not found.');
    const { lead, summary, contractNo } = target;

    if (!summary.isFullyPaid) {
      throw new Error('ລູກຄ້າຕ້ອງຊຳລະຄົບທຸກງວດ (100%) ຈຶ່ງສາມາດຢືນຢັນການຊຳລະສຳເລັດໄດ້.');
    }

    const updatedCust: Lead = {
      ...lead,
      installmentStatus: 'completed',
      isPaymentCompleted: true,
      status: 'delivered',
      paymentTypeConfirmed: 'installment_completed',
      paidDate: new Date().toISOString().slice(0, 10),
      notes: (lead.notes ? lead.notes + '\n' : '') + `[${new Date().toLocaleDateString('lo-LA')}] ຢືນຢັນການຊຳລະຄົບຖ້ວນທຸກງວດ (ສັນຍາເລກທີ ${contractNo}) ໂດຍ ${currentUser?.name || 'Admin'}`,
      lastFollowUp: new Date().toISOString(),
    };

    if (!currentUser?.id) {
      throw new Error('Sign in again before confirming payoff.');
    }

    await saveLead(updatedCust, currentUser.id);
    if (setLeads) {
      setLeads(prev => prev.map(l => l.id === customerId ? updatedCust : l));
    }

    showToast(`ຢືນຢັນການຊຳລະສຳເລັດຄົບ 100% ແລ້ວ! ຂໍ້ມູນ "${updatedCust.customerName}" ໄດ້ຍ້າຍໄປໜ້າ "ລູກຄ້າທີ່ຊຳລະສຳເລັດແລ້ວ"`);

    // Switch view / navigate to Completed Customers tab immediately
    if (onNavigateTab) {
      onNavigateTab('existing_customers');
    } else if (onNavigateMenu) {
      onNavigateMenu('customers');
    }
  };

  // Handle WhatsApp Due Reminder
  const handleSendWhatsAppReminder = (lead: Lead, summary: any, contractNo: string, nextUnpaid?: InstallmentPaymentRecord) => {
    const nextPeriod = nextUnpaid?.period || (summary.paidCount + 1);
    const nextDueDate = nextUnpaid?.dueDate || '10 ຂອງເດືອນ';
    const monthlyLAK = nextUnpaid?.amountLAK || summary.monthlyPaymentLAK;
    const monthlyUSD = nextUnpaid?.amountUSD || summary.monthlyPaymentUSD;

    const message = `ສະບາຍດີ ທ່ານ ${lead.customerName}, ຈາກສູນລົດໄຟຟ້າ AVATR Laos.

ຂໍແຈ້ງເຕືອນຄ່າງວດລົດ ${lead.interestedModel} (ເລກສັນຍາ: ${contractNo}):
- ງວດທີ: ${nextPeriod} / ${summary.tenure} ງວດ
- ຈຳນວນເງິນທີ່ຕ້ອງຊຳລະ: ${monthlyLAK.toLocaleString()} ກີບ (~$${monthlyUSD.toLocaleString()} USD)
- ວັນຄົບກຳນົດ: ${nextDueDate}

ຊ່ອງທາງການຊຳລະ:
- ທະນາຄານການຄ້າຕ່າງປະເທດລາວ (BCEL): 010-12-00-08849201-001
- ຊື່ບັນຊີ: AVATR AUTO LAOS CO., LTD

ເມື່ອຊຳລະແລ້ວ ກະລຸນາສົ່ງສະລິບຢັ້ງຢືນມາຍັງ WhatsApp ນີ້. ຂໍຂອບໃຈ.`;

    openWhatsAppWithMessage(lead.phone, message);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">

      {/* 1. Header with Title & Action Suite */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-400 text-black rounded-2xl shadow-lg shadow-amber-400/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                <span>ລູກຄ້າຜ່ອນຊຳລະ & ສິນເຊື່ອລົດຍົນ</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-amber-700 dark:text-amber-300 font-mono border border-slate-200 dark:border-zinc-700 font-bold">
                  {filteredCustomers.length} ສັນຍາ
                </span>
              </h2>
            </div>
          </div>
        </div>

        {/* Action Controls & New Installment Button */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="ສະແດງແບບ Cards"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="ສະແດງແບບ Table"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {/* Add New Contract (Opens POS Sales) */}
          <button
            type="button"
            onClick={() => onNavigateMenu ? onNavigateMenu('pos_sales') : undefined}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
            title="ເປີດໜ້າ POS ເພື່ອສ້າງສັນຍາຜ່ອນ & ວາງດາວລົດຄັນໃໝ່"
          >
            <Plus className="w-4 h-4" />
            <span>ສັນຍາຜ່ອນໃໝ່ (POS)</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Focused Financial KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Outstanding Portfolio Balance */}
        <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">ຍອດສິນເຊື່ອຄົງເຫຼືອລວມ</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 text-amber-600 dark:text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white block">
              ${portfolioMetrics.totalPortfolioBalanceUSD.toLocaleString()} USD
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-500 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
            ຍອດເງິນກູ້ຄົງເຫຼືອຈາກ {portfolioMetrics.activeContractsCount} ສັນຍາທີ່ກຳລັງຜ່ອນ
          </p>
        </div>

        {/* Card 2: Total Active Contracts */}
        <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">ສັນຍາຜ່ອນທີ່ດຳເນີນການ</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-zinc-900 border border-blue-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white block">
              {portfolioMetrics.activeContractsCount} <span className="text-sm font-normal text-slate-500 dark:text-zinc-400 font-sans">ສັນຍາ</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-500 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
            ທັງໝົດໃນລະບົບ {portfolioMetrics.totalContracts} ສັນຍາ
          </p>
        </div>

        {/* Card 3: Total Collected Payments */}
        <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">ຍອດເກັບເງິນແລ້ວທັງໝົດ</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-zinc-900 border border-emerald-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 block">
              ${portfolioMetrics.totalCollectedUSD.toLocaleString()} USD
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-500 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
            ລວມເງິນດາວ & ເງິນງວດທີ່ຮັບແລ້ວຕົວຈິງ
          </p>
        </div>

        {/* Card 4: Due & Overdue Alerts */}
        <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">ຮອດກຳນົດຊຳລະ / ຄ້າງ</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white block">
              {portfolioMetrics.dueOrOverdueCount} <span className="text-sm font-normal text-slate-500 dark:text-zinc-400 font-sans">ລູກຄ້າ</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-500 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
            {portfolioMetrics.dueOrOverdueCount > 0 ? 'ແນະນຳສົ່ງ WhatsApp ແຈ້ງເຕືອນ' : 'ບໍ່ມີຍອດຄ້າງຊຳລະ'}
          </p>
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="theme-adaptive-dark-surface rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ຄົ້ນຫາຊື່ລູກຄ້າ, ເບີໂທ, ເລກສັນຍາ, ລຸ້ນລົດ, ແຂວງ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-medium"
          />
        </div>

        {/* Model Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-400 font-medium">ລຸ້ນລົດ:</span>
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white font-medium"
          >
            <option value="all">ທຸກລຸ້ນ</option>
            {vehicles.map(v => (
              <option key={v.id || v.name} value={v.name}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-400 font-medium">ສະຖານະ:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white font-medium"
          >
            <option value="all">ທຸກສະຖານະ ({leadsWithSummaries.length})</option>
            <option value="active">ກຳລັງຜ່ອນ ({leadsWithSummaries.filter(s => !s.summary.isFullyPaid).length})</option>
            <option value="due">ຮອດກຳນົດຊຳລະ ({leadsWithSummaries.filter(s => s.isDueSoon || s.isOverdue).length})</option>
            <option value="completed">ຜ່ອນຄົບ 100% ({leadsWithSummaries.filter(s => s.summary.isFullyPaid).length})</option>
          </select>
        </div>
      </div>

      {/* 4. Main Content: Cards View (Default) or Table View */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 p-12 text-center">
          <CreditCard className="mx-auto w-12 h-12 text-zinc-600 mb-3" />
          <p className="text-sm font-bold text-zinc-300">ບໍ່ພົບຂໍ້ມູນລູກຄ້າຜ່ອນ-ດາວທີ່ຕົງກັບເງື່ອນໄຂຄົ້ນຫາ</p>
          <p className="text-xs text-zinc-500 mt-1">
            ທ່ານສາມາດກົດປຸ່ມ <strong>+ ສັນຍາຜ່ອນໃໝ່ (POS)</strong> ດ້ານເທິງເພື່ອສ້າງລາຍການຂາຍຜ່ອນຊຳລະໃໝ່ໄດ້
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* ================= CARDS BENTO GRID VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCustomers.map(({ lead, basePrice, summary, nextUnpaid, isDueSoon, isOverdue, contractNo }) => {
            return (
              <div
                key={lead.id}
                className="group theme-adaptive-dark-surface rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 sm:p-6 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Bar: Customer Identity & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-zinc-800/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">{lead.customerName}</h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300">
                          {contractNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                        <span className="font-mono">{lead.phone}</span>
                        {(lead.province || lead.district) && (
                          <span className="flex items-center gap-0.5 text-zinc-500">
                            <MapPin className="w-3 h-3" />
                            <span>{[lead.district, lead.province].filter(Boolean).join(', ')}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {summary.isFullyPaid ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ຜ່ອນຄົບ 100%</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-800/50 flex items-center gap-1.5 shadow-sm animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          <span>ກາຍກຳນົດຊຳລະ</span>
                        </span>
                      ) : isDueSoon ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/50 flex items-center gap-1.5 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>ຮອດກຳນົດຊຳລະ</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/50 flex items-center gap-1.5 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          <span>ກຳລັງຜ່ອນ (Active)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vehicle & Finance Partner Info */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/70">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 grid place-items-center text-white shrink-0">
                        <Car className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-black text-sm text-white block">{lead.interestedModel}</span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          ລາຄາລົດ: ${basePrice.toLocaleString()} USD
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block">ໄຟແນນ / Leasing:</span>
                      <span className="text-xs font-bold text-amber-400 block">
                        {lead.financeCompany || 'AVATR Leasing'}
                      </span>
                    </div>
                  </div>

                  {/* Financial 4-Matrix Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 font-sans block">ເງິນດາວທີ່ຈ່າຍ:</span>
                      <strong className="text-white block mt-0.5">${summary.downPaymentUSD.toLocaleString()}</strong>
                      <span className="text-[10px] text-amber-400 font-sans">{summary.downPaymentPercent}%</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 font-sans block">ຍອດກູ້ & ດອກເບ້ຍ:</span>
                      <strong className="text-white block mt-0.5">${summary.principalFinancedUSD.toLocaleString()}</strong>
                      <span className="text-[10px] text-zinc-400 font-sans">{summary.tenure} ງວດ</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 font-sans block">ຄ່າງວດ/ເດືອນ:</span>
                      <strong className="text-white block mt-0.5">${summary.monthlyPaymentUSD.toLocaleString()}</strong>
                      <span className="text-[10px] text-zinc-400 font-sans">~{Math.round(summary.monthlyPaymentLAK / 1000000)}M ກີບ</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${isOverdue
                      ? 'bg-red-950/20 border-red-800/60 text-red-300'
                      : isDueSoon
                        ? 'bg-amber-950/20 border-amber-800/60 text-amber-300'
                        : 'bg-zinc-900/40 border-zinc-800/60'
                      }`}>
                      <span className="text-[10px] text-zinc-500 font-sans block">ວັນຄົບກຳນົດ:</span>
                      <strong className="block mt-0.5">{nextUnpaid ? nextUnpaid.dueDate : 'ຄົບແລ້ວ'}</strong>
                      <span className="text-[10px] font-sans">
                        {nextUnpaid ? `ງວດ ${nextUnpaid.period}/${summary.tenure}` : '100%'}
                      </span>
                    </div>
                  </div>

                  {/* Repayment Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                        <span>ຄວາມຄືບໜ້າການຜ່ອນ:</span>
                        <strong className="text-white font-mono">{summary.paidCount}/{summary.totalCount} ງວດ</strong>
                      </span>
                      <span className="font-mono font-bold text-amber-400">{summary.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${summary.isFullyPaid ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-300'
                          }`}
                        style={{ width: `${summary.progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                      <span>ຈ່າຍແລ້ວ: ${summary.totalPaidInstallmentsUSD.toLocaleString()} USD</span>
                      <span>ໜີ້ເຫຼືອ: ${summary.remainingInstallmentsUSD.toLocaleString()} USD</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Suite Buttons */}
                <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Primary Button: ບັນທຶກຮັບເງິນງວດ */}
                    {!summary.isFullyPaid && (
                      <button
                        type="button"
                        onClick={() => setSelectedLeadForQuickPay(lead)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        title="ເປີດໜ້າຕ່າງບັນທຶກຮັບເງິນງວດດ່ວນ & ອອກໃບບິນງວດ"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>ບັນທຶກຮັບເງິນງວດ</span>
                      </button>
                    )}

                    {/* Payoff Confirmation Button: Active when 100% fully paid, disabled with remaining periods when not */}
                    {summary.isFullyPaid ? (
                      <button
                        type="button"
                        onClick={() => setSelectedLeadForPayoff({ lead, summary, contractNo })}
                        className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95 animate-pulse"
                        title="ຢືນຢັນການຊຳລະສຳເລັດ ແລະ ຍ້າຍຂໍ້ມູນໄປໜ້າລູກຄ້າທີ່ຊຳລະສຳເລັດແລ້ວ"
                      >
                        <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                        <span>ຢືນຢັນການຊຳລະສຳເລັດ</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-2 bg-zinc-900/60 text-zinc-500 border border-zinc-800/80 font-medium rounded-xl text-xs flex items-center gap-1.5 cursor-not-allowed opacity-75"
                        title="ປຸ່ມຢືນຢັນຈະສາມາດກົດໄດ້ເມື່ອຊຳລະສຳເລັດຄົບທຸກງວດ (100%) ແລ້ວເທົ່ານັ້ນ"
                      >
                        <Lock className="w-3.5 h-3.5 text-zinc-600" />
                        <span>ຢືນຢັນການຊຳລະສຳເລັດ (ຍັງເຫຼືອ {summary.remainingPeriods} ງວດ)</span>
                      </button>
                    )}

                    {/* Button 2: ຕາຕະລາງຜ່ອນ */}
                    <button
                      type="button"
                      onClick={() => setSelectedLeadForLedger(lead)}
                      className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="ເບິ່ງຕາຕະລາງການຜ່ອນຊຳລະຄົບທຸກງວດ"
                    >
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>ຕາຕະລາງຜ່ອນ</span>
                    </button>

                    {/* Button 3: ເອກະສານ & ສັນຍາ */}
                    <button
                      type="button"
                      onClick={() => setSelectedLeadForDocs(lead)}
                      className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="ເບິ່ງສັນຍາຜ່ອນ, ໃບຮັບເງິນດາວ ແລະ ຕາຕະລາງ A4"
                    >
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      <span>ເອກະສານ & ສັນຍາ</span>
                      {(() => {
                        void issuedDocLogs;
                        const count = getCustomerIssuedDocsCount(lead);
                        return count > 0 ? (
                          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {count}
                          </span>
                        ) : null;
                      })()}
                    </button>
                  </div>

                  {/* Button 4: WhatsApp Due Reminder */}
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppReminder(lead, summary, contractNo, nextUnpaid)}
                    className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ml-auto"
                    title="ສົ່ງຂໍ້ຄວາມ WhatsApp ແຈ້ງເຕືອນຄ່າງວດຫາລູກຄ້າ"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    <span>ແຈ້ງເຕືອນງວດ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= HIGH-DENSITY TABLE VIEW ================= */
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-900 text-zinc-400 font-medium border-b border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4">ລູກຄ້າ & ເບີໂທ</th>
                  <th className="py-3.5 px-4">ລຸ້ນລົດ & ສັນຍາ</th>
                  <th className="py-3.5 px-4">ເງິນດາວ</th>
                  <th className="py-3.5 px-4">ຍອດກູ້ & ງວດ</th>
                  <th className="py-3.5 px-4">ຄ່າງວດ/ເດືອນ</th>
                  <th className="py-3.5 px-4">ວັນຄົບກຳນົດ</th>
                  <th className="py-3.5 px-4">ຄວາມຄືບໜ້າ</th>
                  <th className="py-3.5 px-4">ສະຖານະ</th>
                  <th className="py-3.5 px-4 text-center">ການດຳເນີນງານ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono">
                {filteredCustomers.map(({ lead, basePrice, summary, nextUnpaid, isDueSoon, isOverdue, contractNo }) => {
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
                      </td>

                      {/* Model & Contract */}
                      <td className="py-3.5 px-4 font-sans">
                        <strong className="text-white block">{lead.interestedModel}</strong>
                        <span className="text-zinc-500 text-[10px] font-mono">{contractNo}</span>
                      </td>

                      {/* Down Payment */}
                      <td className="py-3.5 px-4">
                        <strong className="text-amber-400 block">${summary.downPaymentUSD.toLocaleString()} USD</strong>
                        <span className="text-[11px] text-zinc-400 font-sans">ດາວ {summary.downPaymentPercent}%</span>
                      </td>

                      {/* Loan & Tenure */}
                      <td className="py-3.5 px-4">
                        <strong className="text-white block">${summary.principalFinancedUSD.toLocaleString()} USD</strong>
                        <span className="text-zinc-400 text-[11px] font-sans">{summary.tenure} ງວດ</span>
                      </td>

                      {/* Monthly Payment */}
                      <td className="py-3.5 px-4">
                        <strong className="text-white block">~{summary.monthlyPaymentLAK.toLocaleString()} LAK</strong>
                        <span className="text-[10px] text-zinc-500 font-mono">${summary.monthlyPaymentUSD.toLocaleString()} USD</span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4">
                        <span className={`block font-bold ${isOverdue ? 'text-red-400' : isDueSoon ? 'text-amber-400' : 'text-zinc-300'
                          }`}>
                          {nextUnpaid ? nextUnpaid.dueDate : 'ຄົບແລ້ວ'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-sans">
                          {nextUnpaid ? `ງວດ ${nextUnpaid.period}/${summary.tenure}` : '100%'}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-sans">
                          <span className="text-zinc-400">{summary.paidCount}/{summary.totalCount}</span>
                          <span className="text-amber-400 font-bold">{summary.progressPercent}%</span>
                        </div>
                        <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${summary.progressPercent}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 font-sans">
                        {summary.isFullyPaid ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>ຜ່ອນຄົບແລ້ວ</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 inline-flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span>ກາຍກຳນົດ</span>
                          </span>
                        ) : isDueSoon ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-300" />
                            <span>ຮອດກຳນົດ</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-400" />
                            <span>ກຳລັງຜ່ອນ</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          {summary.isFullyPaid ? (
                            <button
                              onClick={() => setSelectedLeadForPayoff({ lead, summary, contractNo })}
                              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm animate-pulse"
                              title="ຢືນຢັນການຊຳລະສຳເລັດ ແລະ ຍ້າຍຂໍ້ມູນໄປໜ້າລູກຄ້າທີ່ຊຳລະສຳເລັດແລ້ວ"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                              <span>ຢືນຢັນຊຳລະຄົບ</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setSelectedLeadForQuickPay(lead)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                title="ບັນທຶກຮັບເງິນງວດດ່ວນ"
                              >
                                <Coins className="w-3.5 h-3.5" />
                                <span>ຮັບເງິນ</span>
                              </button>
                              <button
                                disabled
                                className="px-2 py-1.5 bg-zinc-900 text-zinc-600 border border-zinc-800 rounded-xl text-[11px] font-medium transition-all flex items-center gap-1 cursor-not-allowed opacity-60"
                                title={`ຍັງເຫຼືອອີກ ${summary.remainingPeriods} ງວດ ຈຶ່ງຈະສາມາດຢືນຢັນຊຳລະຄົບໄດ້`}
                              >
                                <Lock className="w-3 h-3 text-zinc-600" />
                                <span>ຍັງເຫຼືອ {summary.remainingPeriods} ງວດ</span>
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setSelectedLeadForLedger(lead)}
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
                            title="ເປີດຕາຕະລາງຜ່ອນ & ບັນທຶກຮັບເງິນງວດ"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setSelectedLeadForDocs(lead)}
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="ເບິ່ງເອກະສານສັນຍາ & ຕາຕະລາງ A4"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {(() => {
                              void issuedDocLogs;
                              const count = getCustomerIssuedDocsCount(lead);
                              return count > 0 ? (
                                <span className="px-1 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  {count}
                                </span>
                              ) : null;
                            })()}
                          </button>

                          <button
                            onClick={() => handleSendWhatsAppReminder(lead, summary, contractNo, nextUnpaid)}
                            className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800/60 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
                            title="ສົ່ງ WhatsApp ແຈ້ງເຕືອນ"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: QUICK INSTALLMENT PAYMENT MODAL */}
      {selectedLeadForQuickPay && (
        <QuickInstallmentPaymentModal
          isOpen={Boolean(selectedLeadForQuickPay)}
          onClose={() => setSelectedLeadForQuickPay(null)}
          customer={selectedLeadForQuickPay}
          vehicles={vehicles}
          currentUser={currentUser || undefined}
          lang={lang}
          onPaymentSuccess={handleUpdateCustomerRecords}
        />
      )}

      {/* MODAL 2: INSTALLMENT LEDGER MODAL (FULL 48-MONTH AMORTIZATION) */}
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

      {/* MODAL 3: CUSTOMER DOCUMENTS MODAL (A4 PRINT / PDF CONTRACTS) */}
      {selectedLeadForDocs && (
        <CustomerDocumentsModal
          isOpen={Boolean(selectedLeadForDocs)}
          onClose={() => setSelectedLeadForDocs(null)}
          customer={selectedLeadForDocs}
          vehicles={vehicles}
          currentUser={currentUser || undefined}
          lang={lang}
          initialDoc="installment_schedule"
          customerGroup="installment_customers"
          onConfirmPayment={async (updatedCust) => {
            if (!currentUser?.id) {
              throw new Error('Sign in again before confirming payment.');
            }
            await saveLead(updatedCust, currentUser.id);
            if (setLeads) {
              setLeads(prev => prev.map(l => l.id === updatedCust.id ? updatedCust : l));
            }
          }}
        />
      )}

      {/* MODAL 4: CONFIRM PAYOFF AND MOVE TO COMPLETED VIEW */}
      {selectedLeadForPayoff && (
        <ConfirmPayoffModal
          isOpen={Boolean(selectedLeadForPayoff)}
          onClose={() => setSelectedLeadForPayoff(null)}
          customer={selectedLeadForPayoff.lead}
          summary={selectedLeadForPayoff.summary}
          contractNo={selectedLeadForPayoff.contractNo}
          onConfirm={handleConfirmPayoff}
        />
      )}
    </div>
  );
}
