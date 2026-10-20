import { useState, useMemo } from 'react';
import { 
  InvoiceBillRecord, 
  Language, 
  BillType, 
  Lead, 
  VehicleModel, 
  SystemUser, 
  InstallmentPaymentRecord 
} from '../../types';
import { getStoredCompanyBankInfo } from '../../data/companySettings';
import { translations } from '../../data/translations';
import AvatrLogo from '../layout/AvatrLogo';
import { showToast } from '../common';
import { 
  FileText, 
  Search, 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  Car, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  Truck, 
  Building2, 
  Phone, 
  User, 
  Sparkles,
  ArrowUpRight,
  Filter,
  Receipt,
  PackagePlus,
  QrCode,
  Trash2,
  Loader2,
  Coins,
  BadgePercent,
  Plus,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Clock,
  FileCheck
} from 'lucide-react';
import { exportElementToPdf } from '../../utils/pdfExport';
import { exportElementToDocx } from '../../utils/docxExport';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import { saveBillToSupabase } from '../../supabase';
import { DEFAULT_EXCHANGE_RATE_LAK } from '../../utils/installment';
import CustomerDocumentsModal, { DocumentType } from '../modals/CustomerDocumentsModal';
import InstallmentLedgerModal from '../modals/InstallmentLedgerModal';
import { saveLead, deleteBill } from '../../backend/data';

interface BillsManagementViewProps {
  bills: InvoiceBillRecord[];
  setBills?: React.Dispatch<React.SetStateAction<InvoiceBillRecord[]>>;
  leads?: Lead[];
  setLeads?: React.Dispatch<React.SetStateAction<Lead[]>>;
  vehicles?: VehicleModel[];
  currentUser?: SystemUser | null;
  lang: Language;
  isSuperAdmin?: boolean;
  onDeleteBill?: (billId: string) => void;
  onOpenNewSale?: () => void;
  onOpenNewImport?: () => void;
}

export default function BillsManagementView({
  bills,
  setBills,
  leads = [],
  setLeads,
  vehicles = [],
  currentUser,
  lang,
  isSuperAdmin = false,
  onDeleteBill,
  onOpenNewSale,
  onOpenNewImport,
}: BillsManagementViewProps) {
  const t = translations[lang] || translations.lo;
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'installment' | 'import'>('all');
  const [installmentSubTab, setInstallmentSubTab] = useState<'bills' | 'contracts'>('bills');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected bill for print / view
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<InvoiceBillRecord | null>(null);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [isExportingBillPdf, setIsExportingBillPdf] = useState(false);
  const [isExportingBillDocx, setIsExportingBillDocx] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Modal states for Installment Ledger & Documents
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<Lead | null>(null);
  const [selectedCustomerForDocs, setSelectedCustomerForDocs] = useState<{ customer: Lead; docType?: DocumentType } | null>(null);

  // Helper: Detect if a bill belongs to the installment & down payment category
  const isInstallmentBill = (bill: InvoiceBillRecord) => {
    return (
      bill.billType === 'installment' ||
      bill.type === 'installment' ||
      bill.paymentMethod === 'finance' ||
      Boolean(bill.financeCompany) ||
      Boolean(bill.downPaymentPercent && bill.downPaymentPercent > 0) ||
      Boolean(bill.installmentPeriod !== undefined)
    );
  };

  const saleBills = bills.filter(b => b.billType === 'sale' && !isInstallmentBill(b));
  const importBills = bills.filter(b => b.billType === 'import');
  const installmentBills = bills.filter(isInstallmentBill);

  // Leads matching installment & down payment category
  const installmentLeads = useMemo(() => {
    return leads.filter(lead => 
      lead.paymentType === 'installment' || 
      lead.paymentType === 'finance' || 
      Boolean(lead.downPaymentPercent) || 
      Boolean(lead.financeCompany) ||
      Boolean(lead.installmentRecords && lead.installmentRecords.length > 0)
    );
  }, [leads]);

  const findLeadForBill = (bill: InvoiceBillRecord) => {
    const leadById = bill.leadId ? leads.find(lead => lead.id === bill.leadId) : undefined;
    if (leadById) return leadById;

    const normalizedPhone = (bill.customerPhone || '').replace(/\D/g, '');
    if (!normalizedPhone) return undefined;
    const phoneMatches = leads.filter(lead => lead.phone.replace(/\D/g, '') === normalizedPhone);
    return phoneMatches.length === 1 ? phoneMatches[0] : undefined;
  };

  // Financial aggregates
  const totalSalesRevenueUSD = saleBills.reduce((acc, curr) => acc + curr.netTotalUSD, 0);
  const totalImportValuationUSD = importBills.reduce((acc, curr) => acc + curr.netTotalUSD, 0);
  
  // Total collected from down payments & installment receipts
  const totalInstallmentCollectionsUSD = installmentBills.reduce((acc, curr) => {
    return acc + (curr.amountUSD || curr.downPaymentUSD || curr.netTotalUSD || 0);
  }, 0);

  // Total financed portfolio across installment bills and leads
  const totalFinancedLoanUSD = useMemo(() => {
    return installmentBills.reduce((acc, curr) => {
      const fullPrice = curr.netTotalUSD || curr.unitPriceUSD || 0;
      const downUSD = curr.downPaymentUSD || Math.round(fullPrice * ((curr.downPaymentPercent || 30) / 100));
      return acc + Math.max(0, fullPrice - downUSD);
    }, 0);
  }, [installmentBills]);

  // Filter bills based on search and selected filterType
  const filteredBills = bills.filter(bill => {
    if (filterType === 'sale' && (bill.billType !== 'sale' || isInstallmentBill(bill))) return false;
    if (filterType === 'installment' && !isInstallmentBill(bill)) return false;
    if (filterType === 'import' && bill.billType !== 'import') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        bill.billNumber.toLowerCase().includes(q) ||
        bill.vin.toLowerCase().includes(q) ||
        bill.model.toLowerCase().includes(q) ||
        (bill.customerName && bill.customerName.toLowerCase().includes(q)) ||
        (bill.supplierName && bill.supplierName.toLowerCase().includes(q)) ||
        (bill.plateNumber && bill.plateNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtered installment customer contracts
  const filteredInstallmentContracts = installmentLeads.filter(lead => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        lead.customerName.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        (lead.interestedModel && lead.interestedModel.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const toggleSelectBill = (billId: string) => {
    setSelectedBillIds(prev =>
      prev.includes(billId) ? prev.filter(id => id !== billId) : [...prev, billId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBillIds.length === filteredBills.length && filteredBills.length > 0) {
      setSelectedBillIds([]);
    } else {
      setSelectedBillIds(filteredBills.map(b => b.id));
    }
  };

  // Batch delete selected bills
  const handleDeleteSelectedBills = async () => {
    if (selectedBillIds.length === 0) return;
    const count = selectedBillIds.length;
    const confirmText = lang === 'lo'
      ? `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບ ${count} ໃບບິນທີ່ເລືອກໄວ້? ຂໍ້ມູນຈະຖືກລົບອອກຈາກລະບົບ.`
      : lang === 'th'
      ? `คุณแน่ใจหรือไม่ว่าต้องการลบ ${count} ใบบิลที่เลือกไว้?`
      : `Are you sure you want to delete ${count} selected bill(s)?`;

    if (!window.confirm(confirmText)) return;

    setIsDeletingBatch(true);
    try {
      const idsToDelete = [...selectedBillIds];
      for (const billId of idsToDelete) {
        if (onDeleteBill) {
          await onDeleteBill(billId);
        } else {
          await deleteBill(billId);
        }
      }
      if (setBills) {
        setBills(prev => prev.filter(b => !idsToDelete.includes(b.id)));
      }
      setSelectedBillIds([]);
    } catch (err) {
      console.error('Error batch deleting bills:', err);
      showToast(err instanceof Error ? err.message : 'Could not delete selected bills.', 'error');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDirectPrintBill = (bill: InvoiceBillRecord) => {
    setSelectedBillForPrint(bill);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDirectDownloadBill = (bill: InvoiceBillRecord) => {
    setSelectedBillForPrint(bill);
    setTimeout(async () => {
      try {
        setIsExportingBillPdf(true);
        const cleanName = (bill.customerName || bill.billNumber).replace(/[^a-zA-Z0-9\u0E80-\u0EFF_-]/g, '_');
        const filename = `AVATR_Bill_${bill.billNumber}_${cleanName}.pdf`;
        await exportElementToPdf('printable-official-bill', {
          filename,
          margin: [4, 4, 4, 4],
          orientation: 'portrait',
          singlePage: true,
        });
      } catch (err) {
        console.error('Error generating bill PDF:', err);
      } finally {
        setIsExportingBillPdf(false);
      }
    }, 150);
  };

  const handleDownloadBillPdf = async () => {
    if (!selectedBillForPrint) return;
    try {
      setIsExportingBillPdf(true);
      const cleanName = (selectedBillForPrint.customerName || selectedBillForPrint.billNumber).replace(/[^a-zA-Z0-9\u0E80-\u0EFF_-]/g, '_');
      const filename = `AVATR_Bill_${selectedBillForPrint.billNumber}_${cleanName}.pdf`;
      await exportElementToPdf('printable-official-bill', {
        filename,
        margin: [4, 4, 4, 4],
        orientation: 'portrait',
        singlePage: true,
      });
    } catch (err) {
      console.error('Error generating bill PDF:', err);
      showToast('ບໍ່ສາມາດດາວໂຫຼດ PDF ໄດ້. ກະລຸນາລອງໃໝ່ ຫຼື ໃຊ້ປຸ່ມພິມບິນ', 'error');
    } finally {
      setIsExportingBillPdf(false);
    }
  };

  const handleDirectDownloadBillDocx = (bill: InvoiceBillRecord) => {
    setSelectedBillForPrint(bill);
    setTimeout(async () => {
      try {
        setIsExportingBillDocx(true);
        const cleanName = (bill.customerName || bill.billNumber).replace(/[^a-zA-Z0-9\u0E80-\u0EFF_-]/g, '_');
        const filename = `AVATR_Bill_${bill.billNumber}_${cleanName}.docx`;
        await exportElementToDocx('printable-official-bill', {
          filename,
          title: `AVATR Official Bill ${bill.billNumber}`,
        });
      } catch (err) {
        console.error('Error generating bill DOCX:', err);
      } finally {
        setIsExportingBillDocx(false);
      }
    }, 150);
  };

  const handleDownloadBillDocx = async () => {
    if (!selectedBillForPrint) return;
    try {
      setIsExportingBillDocx(true);
      const cleanName = (selectedBillForPrint.customerName || selectedBillForPrint.billNumber).replace(/[^a-zA-Z0-9\u0E80-\u0EFF_-]/g, '_');
      const filename = `AVATR_Bill_${selectedBillForPrint.billNumber}_${cleanName}.docx`;
      await exportElementToDocx('printable-official-bill', {
        filename,
        title: `AVATR Official Bill ${selectedBillForPrint.billNumber}`,
      });
    } catch (err) {
      console.error('Error generating bill DOCX:', err);
      showToast('ບໍ່ສາມາດດາວໂຫຼດ DOCX ໄດ້. ກະລຸນາລອງໃໝ່', 'error');
    } finally {
      setIsExportingBillDocx(false);
    }
  };

  // Helper: Open ledger for an installment bill or lead
  const handleOpenLedgerForBill = (bill: InvoiceBillRecord) => {
    const matchedLead = findLeadForBill(bill);

    if (matchedLead) {
      setSelectedCustomerForLedger(matchedLead);
    } else {
      // Dynamic lead fallback so ledger works for every installment record
      const syntheticLead: Lead = {
        id: bill.leadId || `SYN-${bill.id}`,
        customerName: bill.customerName || 'ລູກຄ້າຜ່ອນຊຳລະ',
        phone: bill.customerPhone || '020-00000000',
        interestedModel: bill.model || 'AVATR 11',
        paymentType: 'installment',
        downPaymentPercent: bill.downPaymentPercent || 30,
        downPaymentUSD: bill.downPaymentUSD || Math.round((bill.netTotalUSD || 50000) * 0.3),
        tenureMonths: bill.tenureMonths || 48,
        monthlyPaymentLAK: bill.monthlyPaymentLAK || 21500000,
        status: 'delivered',
        priority: 'normal',
        notes: '',
        assignedTo: 'Admin',
        province: bill.customerProvince || 'ນະຄອນຫຼວງວຽງຈັນ',
        category: 'walk_in',
        source: 'Showroom Bills',
        createdAt: bill.date,
      };
      setSelectedCustomerForLedger(syntheticLead);
    }
  };

  // Helper: Open official signed documents for an installment bill or lead
  const handleOpenDocumentsForBill = (bill: InvoiceBillRecord, docType: DocumentType = 'installment_schedule') => {
    const matchedLead = findLeadForBill(bill);

    if (matchedLead) {
      setSelectedCustomerForDocs({ customer: matchedLead, docType });
    } else {
      const syntheticLead: Lead = {
        id: bill.leadId || `SYN-${bill.id}`,
        customerName: bill.customerName || 'ລູກຄ້າຜ່ອນຊຳລະ',
        phone: bill.customerPhone || '020-00000000',
        interestedModel: bill.model || 'AVATR 11',
        paymentType: 'installment',
        downPaymentPercent: bill.downPaymentPercent || 30,
        downPaymentUSD: bill.downPaymentUSD || Math.round((bill.netTotalUSD || 50000) * 0.3),
        tenureMonths: bill.tenureMonths || 48,
        monthlyPaymentLAK: bill.monthlyPaymentLAK || 21500000,
        status: 'delivered',
        priority: 'normal',
        notes: '',
        assignedTo: 'Admin',
        province: bill.customerProvince || 'ນະຄອນຫຼວງວຽງຈັນ',
        category: 'walk_in',
        source: 'Showroom Bills',
        createdAt: bill.date,
      };
      setSelectedCustomerForDocs({ customer: syntheticLead, docType });
    }
  };



  // Callback to update customer records from InstallmentLedgerModal
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
    if (selectedCustomerForLedger?.id === customerId) {
      setSelectedCustomerForLedger(updatedCust);
    }
  };

  // Export installment bills or contracts to CSV
  const handleExportInstallmentCsv = () => {
    const headers = [
      'BillNumber',
      'Type',
      'Date',
      'CustomerName',
      'Phone',
      'Model',
      'VIN',
      'UnitPriceUSD',
      'DownPaymentUSD',
      'TenureMonths',
      'MonthlyPaymentLAK',
      'BillAmountUSD',
      'BillAmountLAK',
      'RecordedBy'
    ];

    const rows = installmentBills.map(b => [
      b.billNumber,
      b.installmentType || 'installment',
      b.date,
      `"${b.customerName || ''}"`,
      b.customerPhone || '',
      b.model,
      b.vin,
      b.unitPriceUSD,
      b.downPaymentUSD || '',
      b.tenureMonths || '',
      b.monthlyPaymentLAK || '',
      b.amountUSD || '',
      b.amountLAK || '',
      `"${b.recordedBy || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AVATR_Installment_Bills_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* WRAPPER FOR MAIN VIEWS - SUPPRESSED DURING PRINT WHEN A BILL IS BEING PRINTED */}
      <div className={selectedBillForPrint ? "print:hidden hide-on-print-bill space-y-6" : "space-y-6"}>
        {/* Top Header */}
        <header className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-amber-400/5 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                <span>{lang === 'lo' ? 'ສູນລວມເອກະສານການເງິນ' : lang === 'th' ? 'ศูนย์รวมเอกสารการเงิน' : 'Financial records'}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {t.billsHeader || t.billsTitle}
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
              {lang === 'lo' 
                ? 'ລວມປະຫວັດໃບຂາຍລົດ, ໃບຮັບເງິນດາວ & ຜ່ອນຊຳລະ ແລະ ໃບນຳເຂົ້າລົດສາງ' 
                : t.billsHeaderSub || t.billsSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">


              {onOpenNewSale && (
                <button
                  type="button"
                  onClick={onOpenNewSale}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t.quickPOSBtn}</span>
                </button>
              )}

              {onOpenNewImport && isSuperAdmin && (
                <button
                  type="button"
                  onClick={onOpenNewImport}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t.quickStockInBtn}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* KPI Overview Cards */}
        <section aria-label={lang === 'lo' ? 'ສະຫຼຸບບິນ ແລະ ໃບຮັບ' : lang === 'th' ? 'สรุปบิลและใบเสร็จ' : 'Bills and invoices summary'} className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {/* Sales Invoices Metric */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <span className="rounded-lg border border-sky-400/20 bg-sky-400/10 p-2 text-sky-500">
                  <Receipt className="h-4 w-4" />
                </span>
                <span>{t.billTotalSalesRevenue}</span>
              </span>
            </div>
            <div className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
              ${totalSalesRevenueUSD.toLocaleString()}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
              <span>{t.filterSaleBills}:</span>
              <span className="font-semibold text-zinc-200">{saleBills.length} {t.unitBills}</span>
            </div>
          </div>

          {/* Installment & Down Payments Metric (NEW) */}
          <div className="rounded-2xl border border-amber-500/30 bg-zinc-950 p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-2 text-amber-500">
                  <CreditCard className="h-4 w-4" />
                </span>
                <span>ຍອດເກັບເງິນຜ່ອນ & ດາວ</span>
              </span>
            </div>
            <div className="text-2xl font-bold tabular-nums text-amber-500 sm:text-3xl">
              ${totalInstallmentCollectionsUSD.toLocaleString()}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
              <span>ບິນຜ່ອນ & ສັນຍາ:</span>
              <span className="font-semibold text-amber-500">
                {installmentBills.length} ບິນ • {installmentLeads.length} ສັນຍາ
              </span>
            </div>
          </div>

          {/* Import Bills Metric */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <span className="rounded-lg border border-violet-400/20 bg-violet-400/10 p-2 text-violet-500">
                  <PackagePlus className="h-4 w-4" />
                </span>
                <span>{t.billTotalImportValuation}</span>
              </span>
            </div>
            <div className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
              ${totalImportValuationUSD.toLocaleString()}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
              <span>{t.filterImportBills}:</span>
              <span className="font-semibold text-zinc-200">{importBills.length} {t.unitBills}</span>
            </div>
          </div>

          {/* Total Documents Metric */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-600">
                  <FileText className="h-4 w-4" />
                </span>
                <span>{lang === 'lo' ? 'ເອກະສານບິນທັງໝົດ' : lang === 'th' ? 'เอกสารบิลทั้งหมด' : 'Total Documents'}</span>
              </span>
            </div>
            <div className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {bills.length} <span className="text-sm font-sans font-medium text-zinc-400">{t.unitBills}</span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
              <span>{t.tableStatus}:</span>
              <span className="font-semibold text-zinc-200">{t.supabaseLiveSync}</span>
            </div>
          </div>
        </section>

        {/* Filter and Search Bar with Category Separation */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {lang === 'lo' ? 'ຄົ້ນຫາ ແລະ ກັ່ນຕອງເອກະສານ' : lang === 'th' ? 'ค้นหาและกรองเอกสาร' : 'Find a document'}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {lang === 'lo' ? 'ຄົ້ນຫາຕາມເລກບິນ, ລູກຄ້າ ຫຼື ລຸ້ນລົດ' : lang === 'th' ? 'ค้นหาจากเลขที่บิล ลูกค้า หรือรุ่นรถ' : 'Search by bill number, customer, or vehicle model'}
                </p>
              </div>
              <span className="text-xs text-zinc-400">
                {lang === 'lo' ? 'ສະແດງ' : lang === 'th' ? 'แสดง' : 'Showing'} <strong className="text-zinc-100">{filteredBills.length}</strong> {lang === 'lo' ? 'ຈາກ' : lang === 'th' ? 'จาก' : 'of'} {bills.length} {t.unitBills}
              </span>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-sm">
                <label className="sr-only" htmlFor="bills-search">{t.searchPlaceholder}</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="bills-search"
                  type="search"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-sm font-medium text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                />
              </div>

            {/* Main Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-1" role="group" aria-label={lang === 'lo' ? 'ກັ່ນຕອງປະເພດເອກະສານ' : lang === 'th' ? 'กรองประเภทเอกสาร' : 'Filter by document type'}>
              <button
                type="button"
                aria-pressed={filterType === 'all'}
                onClick={() => setFilterType('all')}
                className={`min-h-9 rounded-lg px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  filterType === 'all'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {t.filterAllBills} ({bills.length})
              </button>

              <button
                type="button"
                aria-pressed={filterType === 'sale'}
                onClick={() => setFilterType('sale')}
                className={`min-h-9 rounded-lg px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  filterType === 'sale'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{t.filterSaleBills}</span>
                <span className="font-mono">({saleBills.length})</span>
              </button>

              {/* Installment & Down Payment Bills Filter Tab */}
              <button
                type="button"
                aria-pressed={filterType === 'installment'}
                onClick={() => setFilterType('installment')}
                className={`min-h-9 rounded-lg px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  filterType === 'installment'
                    ? 'bg-amber-400 text-black font-bold shadow-sm'
                    : 'text-amber-500 hover:bg-zinc-800 hover:text-amber-400'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{t.filterInstallmentBills || 'ບິນຜ່ອນ & ເງິນດາວ (Financing)'}</span>
                <span className="font-mono font-bold">({installmentBills.length})</span>
              </button>

              <button
                type="button"
                aria-pressed={filterType === 'import'}
                onClick={() => setFilterType('import')}
                className={`min-h-9 rounded-lg px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  filterType === 'import'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>{t.filterImportBills}</span>
                <span className="font-mono">({importBills.length})</span>
              </button>
            </div>
          </div>
          </div>
        </section>

        {/* DEDICATED INSTALLMENT MANAGEMENT HUB (When filterType === 'installment') */}
        {filterType === 'installment' && (
          <section className="space-y-4 rounded-2xl border border-amber-500/30 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-amber-500 text-black rounded-2xl shadow-lg">
                  <CreditCard className="w-6 h-6" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span>ສູນຈັດການບິນຜ່ອນຊຳລະ & ເງິນດາວ</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-400 text-black font-bold">
                      INSTALLMENT HUB
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    ຈັດການໃບບິນຮັບເງິນດາວ, ໃບບິນຮັບຄ່າງວດ, ຕາຕະລາງຜ່ອນ ແລະ ຕິດຕາມສັນຍາຜ່ອນຊຳລະ
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Sub Tab Switcher */}
                <div className="flex items-center bg-zinc-950 border border-zinc-800 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setInstallmentSubTab('bills')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      installmentSubTab === 'bills'
                        ? 'bg-amber-400 text-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    ໃບບິນຮັບເງິນດາວ & ງວດ ({installmentBills.length})
                  </button>

                  <button
                    onClick={() => setInstallmentSubTab('contracts')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      installmentSubTab === 'contracts'
                        ? 'bg-amber-400 text-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    ລາຍຊື່ສັນຍາລູກຄ້າຜ່ອນ ({installmentLeads.length})
                  </button>
                </div>

                <button
                  onClick={handleExportInstallmentCsv}
                  className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Quick KPI stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/80 text-xs">
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-0.5">ຍອດເງິນດາວ & ງວດທີ່ເກັບແລ້ວ:</span>
                <strong className="text-sm font-mono text-amber-400 block">${totalInstallmentCollectionsUSD.toLocaleString()} USD</strong>
              </div>

              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-0.5">ຍອດກູ້ຢືມສິນເຊື່ອລວມ (Loan):</span>
                <strong className="text-sm font-mono text-white block">${totalFinancedLoanUSD.toLocaleString()} USD</strong>
              </div>

              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-0.5">ຈຳນວນໃບບິນຜ່ອນທັງໝົດ:</span>
                <strong className="text-sm font-mono text-white block">{installmentBills.length} ໃບບິນ</strong>
              </div>

              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block mb-0.5">ລູກຄ້າຜ່ອນ-ດາວໃນລະບົບ:</span>
                <strong className="text-sm font-mono text-amber-400 block">{installmentLeads.length} ຄົນ</strong>
              </div>
            </div>
          </section>
        )}

        {/* Selected Bills Action Toolbar */}
        {selectedBillIds.length > 0 && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-xs shadow-sm sm:p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-sky-400/20 bg-sky-400/10 p-1.5 text-sky-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-zinc-100">
                {lang === 'lo' ? `ເລືອກແລ້ວ: ${selectedBillIds.length} ບິນ` : `Selected: ${selectedBillIds.length} bills`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedBillIds.length === 0) return;
                  const target = bills.find(b => b.id === selectedBillIds[0]);
                  if (target) handleDirectPrintBill(target);
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-zinc-800 px-3.5 py-1.5 font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{lang === 'lo' ? 'ພິມບິນທີ່ເລືອກ' : 'Print Selected'}</span>
              </button>

              <button
                onClick={() => {
                  if (selectedBillIds.length === 0) return;
                  const target = bills.find(b => b.id === selectedBillIds[0]);
                  if (target) handleDirectDownloadBill(target);
                }}
                disabled={isExportingBillPdf}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isExportingBillPdf ? 'ກຳລັງສ້າງ PDF...' : (lang === 'lo' ? 'ບັນທຶກເປັນ PDF' : 'Save PDF')}</span>
              </button>

              {/* Batch Delete Selected Bills Button */}
              <button
                type="button"
                onClick={handleDeleteSelectedBills}
                disabled={isDeletingBatch}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white px-3.5 py-1.5 font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-sm"
                title="ລົບທຸກໃບບິນທີ່ເລືອກ"
              >
                {isDeletingBatch ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {isDeletingBatch 
                    ? (lang === 'lo' ? 'ກຳລັງລົບ...' : 'Deleting...') 
                    : (lang === 'lo' ? `ລົບບິນທີ່ເລືອກ (${selectedBillIds.length})` : `Delete Selected (${selectedBillIds.length})`)}
                </span>
              </button>

              <button
                onClick={() => setSelectedBillIds([])}
                className="min-h-9 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
              >
                {lang === 'lo' ? 'ຍົກເລີກການເລືອກ' : 'Clear'}
              </button>
            </div>
          </div>
        )}

        {/* VIEW 1: CONTRACTS VIEW (Only when in Installment tab and Contracts sub-tab) */}
        {filterType === 'installment' && installmentSubTab === 'contracts' ? (
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/60 p-4">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>ລາຍຊື່ສັນຍາລູກຄ້າປະເພດຜ່ອນ & ດາວ ({filteredInstallmentContracts.length})</span>
              </span>
              <span className="text-zinc-400 text-xs font-mono">
                ຄລິກເພື່ອອອກໃບບິນ, ເບິ່ງຕາຕະລາງຜ່ອນ ຫຼື ເອກະສານສັນຍາ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-900 text-[11px] font-semibold text-zinc-400">
                  <tr>
                    <th className="whitespace-nowrap px-2.5 py-2.5">ລູກຄ້າ & ເບີໂທ</th>
                    <th className="whitespace-nowrap px-2.5 py-2.5">ລຸ້ນລົດທີ່ເລືອກ</th>
                    <th className="whitespace-nowrap px-2.5 py-2.5">ອັດຕາດາວ & ຍອດດາວ</th>
                    <th className="whitespace-nowrap px-2.5 py-2.5">ໄລຍະເວລາຜ່ອນ</th>
                    <th className="whitespace-nowrap px-2.5 py-2.5">ຄ່າງວດ/ເດືອນ</th>
                    <th className="whitespace-nowrap px-2.5 py-2.5">ສະຖານະສັນຍາ</th>
                    <th className="whitespace-nowrap px-2.5 py-2.5 text-center">ການຈັດການບິນ & ຕາຕະລາງ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredInstallmentContracts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-zinc-400">
                          <FileText className="h-5 w-5" />
                        </span>
                        <span className="mt-3 block text-sm font-semibold text-zinc-200">
                          {lang === 'lo' ? 'ບໍ່ພົບລາຍຊື່ສັນຍາລູກຄ້າຜ່ອນ-ດາວ' : lang === 'th' ? 'ไม่พบสัญญาผ่อน-ดาวน์' : 'No Installment Contracts Found'}
                        </span>
                        <span className="mt-1 block text-xs text-zinc-400">
                          {lang === 'lo' ? 'ຍັງບໍ່ມີສັນຍາທີ່ກົງກັບເງື່ອນໄຂ ຫຼື ລອງປ່ຽນຄຳຄົ້ນຫາ' : 'No contracts match your criteria or try another filter.'}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredInstallmentContracts.map((lead) => {
                      const matchedVeh = vehicles.find(v => v.name === lead.interestedModel);
                      const basePrice = matchedVeh?.priceStartingUSD || 50000;
                      const downUSD = lead.downPaymentUSD || Math.round(basePrice * ((lead.downPaymentPercent || 30) / 100));

                      return (
                        <tr key={lead.id} className="transition-colors hover:bg-zinc-900/50">
                          {/* Customer */}
                          <td className="py-2.5 px-2.5 font-sans">
                            <strong className="text-white font-semibold block text-xs">{lead.customerName}</strong>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-zinc-400 font-mono text-[10px]">{lead.phone}</span>
                              <a
                                href={getWhatsAppUrl(lead.phone, lead.customerName, lead.interestedModel, lang)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-1.5 py-0.2 rounded font-sans font-semibold flex items-center gap-1 transition-colors border border-emerald-600/30"
                              >
                                <WhatsAppIcon className="w-2.5 h-2.5" />
                                <span>WA</span>
                              </a>
                            </div>
                            <span className="text-[10px] text-zinc-500 block">{lead.province}</span>
                          </td>

                          {/* Model */}
                          <td className="py-2.5 px-2.5 font-sans">
                            <strong className="text-white block text-xs">{lead.interestedModel}</strong>
                            <span className="text-zinc-400 text-[10px] font-mono">${basePrice.toLocaleString()} USD</span>
                          </td>

                          {/* Down payment */}
                          <td className="py-2.5 px-2.5">
                            <strong className="text-amber-400 block text-xs">${downUSD.toLocaleString()} USD</strong>
                            <span className="text-[10px] text-zinc-400 font-sans">ດາວ {lead.downPaymentPercent || 30}%</span>
                          </td>

                          {/* Tenure */}
                          <td className="py-2.5 px-2.5 font-sans">
                            <span className="text-white font-bold text-xs">{lead.tenureMonths || 48} ເດືອນ</span>
                            <span className="text-zinc-500 text-[10px] block font-mono">({Math.round((lead.tenureMonths || 48) / 12)} ປີ)</span>
                          </td>

                          {/* Monthly */}
                          <td className="py-2.5 px-2.5">
                            <strong className="text-white block text-xs">
                              ~{(lead.monthlyPaymentLAK || Math.round(((basePrice - downUSD) * DEFAULT_EXCHANGE_RATE_LAK) / (lead.tenureMonths || 48))).toLocaleString()} LAK
                            </strong>
                            <span className="text-[10px] text-zinc-400 font-mono">/ເດືອນ</span>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-2.5 font-sans">
                            {lead.status === 'delivered' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>ຈ່າຍດາວ & ສົ່ງມອບແລ້ວ</span>
                              </span>
                            ) : lead.installmentStatus === 'active_repaying' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-400" />
                                <span>ກຳລັງຜ່ອນຊຳລະ</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>ລໍຖ້າອະນຸມັດສິນເຊື່ອ</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-2.5 text-center font-sans">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Open Installment Ledger */}
                              <button
                                onClick={() => setSelectedCustomerForLedger(lead)}
                                className="px-2.5 py-1.5 bg-zinc-900 hover:bg-white hover:text-black text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                title="ເບິ່ງຕາຕະລາງຜ່ອນ & ບັນທຶກຮັບເງິນງວດ"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>ຕາຕະລາງຜ່ອນ</span>
                              </button>

                              {/* Open Official Documents */}
                              <button
                                onClick={() => setSelectedCustomerForDocs({ customer: lead, docType: 'installment_schedule' })}
                                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
                                title="ເບິ່ງສັນຍາຜ່ອນ & ເອກະສານທາງການ A4"
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
        ) : (
          /* VIEW 2: BILLS TABLE (Default for all, sale, import, and installment bills sub-tab) */
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-300">
                  <Receipt className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {lang === 'lo' ? 'ລາຍການໃບບິນ ແລະ ໃບຮັບ' : lang === 'th' ? 'รายการบิลและใบเสร็จ' : 'Bills and receipts'}
                  </h2>
                  <p className="text-xs text-zinc-400">{filteredBills.length} {t.unitBills}</p>
                </div>
              </div>
              <span className="text-xs text-zinc-400">
                {lang === 'lo' ? 'ເລືອກບິນເພື່ອພິມ ຫຼື ບັນທຶກ PDF' : lang === 'th' ? 'เลือกบิลเพื่อพิมพ์หรือบันทึก PDF' : 'Select a bill to print or save as PDF'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-zinc-800 bg-zinc-900 text-[11px] font-semibold text-zinc-400">
                  <tr>
                    <th className="w-8 py-2.5 pl-3 pr-1 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedBillIds.length === filteredBills.length && filteredBills.length > 0}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded cursor-pointer accent-white"
                        title="ເລືອກທັງໝົດ"
                      />
                    </th>
                    <th className="px-2 py-2.5 whitespace-nowrap">{t.billType}</th>
                    <th className="px-2.5 py-2.5 whitespace-nowrap">{t.billNumber} & {t.billDate}</th>
                    <th className="px-2.5 py-2.5">{t.tableModel} & {t.vinNumber}</th>
                    <th className="px-2.5 py-2.5">{t.buyerInfo} / {t.supplierName}</th>
                    <th className="px-2.5 py-2.5 whitespace-nowrap">{t.billAmount}</th>
                    <th className="px-2 py-2.5 text-center whitespace-nowrap">{t.paymentType}</th>
                    <th className="px-2 py-2.5 text-center whitespace-nowrap">{lang === 'lo' ? 'ຜູ້ອອກບິນ' : lang === 'th' ? 'ผู้ออกบิล' : 'Issued By'}</th>
                    <th className="px-2 py-2.5 text-center whitespace-nowrap">{t.tableActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-14 text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-zinc-400">
                          <FileText className="h-6 w-6" />
                        </span>
                        <span className="mt-4 block font-semibold text-zinc-200">{t.noBillsFound}</span>
                        <span className="mt-1 block text-xs text-zinc-400">
                          {searchQuery
                            ? (lang === 'lo' ? 'ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ເລືອກປະເພດບິນອື່ນ' : lang === 'th' ? 'ลองเปลี่ยนคำค้นหาหรือเลือกประเภทบิลอื่น' : 'Try another search term or document type.')
                            : (lang === 'lo' ? 'ລາຍການໃໝ່ຈະສະແດງຢູ່ທີ່ນີ້' : lang === 'th' ? 'รายการใหม่จะแสดงที่นี่' : 'New records will appear here.')}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill) => {
                      const isInstallment = isInstallmentBill(bill);

                      return (
                        <tr 
                          key={bill.id} 
                          className={`hover:bg-zinc-900/50 transition-colors ${
                            selectedBillIds.includes(bill.id) ? 'bg-zinc-900/40' : ''
                          } ${isInstallment ? 'bg-amber-500/[0.02]' : ''}`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-2.5 pl-3 pr-1 text-center">
                            <input
                              type="checkbox"
                              checked={selectedBillIds.includes(bill.id)}
                              onChange={() => toggleSelectBill(bill.id)}
                              className="w-3.5 h-3.5 rounded cursor-pointer accent-white"
                            />
                          </td>

                          {/* Bill Type Badge */}
                          <td className="py-2.5 px-2 whitespace-nowrap">
                            {isInstallment ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                                <CreditCard className="w-3 h-3 text-amber-400" />
                                <span>
                                  {bill.installmentType === 'monthly_installment' 
                                    ? `ຄ່າງວດ (${bill.installmentPeriod || 1}/${bill.installmentTotalPeriods || 48})` 
                                    : `ດາວ (${bill.downPaymentPercent || 30}%)`}
                                </span>
                              </span>
                            ) : bill.billType === 'sale' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 inline-flex items-center gap-1">
                                <Receipt className="w-3 h-3 text-zinc-300" />
                                <span>{t.filterSaleBills}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 inline-flex items-center gap-1">
                                <PackagePlus className="w-3 h-3 text-zinc-300" />
                                <span>{t.filterImportBills}</span>
                              </span>
                            )}
                          </td>

                          {/* Bill No & Date */}
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span className="text-white font-bold text-xs block">{bill.billNumber}</span>
                            <span className="text-[10px] text-zinc-500 font-sans block">{bill.date}</span>
                          </td>

                          {/* Vehicle Details */}
                          <td className="py-2.5 px-2.5">
                            <strong className="text-white font-sans text-xs block truncate max-w-[150px]">{bill.model}</strong>
                            <span className="text-zinc-400 text-[10px] font-mono block truncate max-w-[150px]">{bill.vin}</span>
                            <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-sans">
                              <span>{bill.color || '-'}</span>
                              {bill.plateNumber && <span>• {bill.plateNumber}</span>}
                            </div>
                          </td>

                          {/* Customer or Supplier */}
                          <td className="py-2.5 px-2.5 font-sans">
                            {bill.billType === 'sale' || isInstallment ? (
                              <div className="max-w-[160px]">
                                <span className="text-white font-semibold text-xs block truncate">{bill.customerName || 'VIP Customer'}</span>
                                {bill.customerPhone && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-0.5 truncate">
                                      <Phone className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                                      <span>{bill.customerPhone}</span>
                                    </span>
                                    <a
                                      href={getWhatsAppUrl(bill.customerPhone, bill.customerName, bill.model, lang)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[9px] bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-1 py-0.2 rounded font-semibold shrink-0 transition-colors cursor-pointer border border-emerald-600/30"
                                      title="WhatsApp"
                                    >
                                      WA
                                    </a>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="max-w-[160px]">
                                <span className="text-zinc-200 font-medium text-xs block truncate">
                                  {bill.supplierName || 'AVATR Technology'}
                                </span>
                                {bill.customsDocNumber && (
                                  <span className="text-[10px] text-zinc-400 font-mono block truncate">B01: {bill.customsDocNumber}</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Net Amount */}
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            {isInstallment ? (
                              <div>
                                <span className="text-xs font-bold block text-amber-400 font-mono">
                                  ${(bill.amountUSD || bill.downPaymentUSD || bill.netTotalUSD).toLocaleString()} USD
                                </span>
                                {bill.amountLAK && (
                                  <span className="text-[10px] text-zinc-400 block font-mono">
                                    ~{bill.amountLAK.toLocaleString()} LAK
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-bold block text-white font-mono">
                                ${bill.netTotalUSD.toLocaleString()} USD
                              </span>
                            )}
                          </td>

                          {/* Payment / Destination */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            {isInstallment ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                {bill.installmentType === 'monthly_installment' ? 'ຄ່າງວດ' : 'ເງິນດາວ'} • {bill.tenureMonths || 48}M
                              </span>
                            ) : bill.billType === 'sale' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                                {bill.paymentMethod === 'transfer' ? t.paymentTransfer : t.paymentCash}
                              </span>
                            ) : (
                              <span className="text-zinc-400 font-sans text-[10px] truncate max-w-[110px] block">
                                {bill.destinationWarehouse || 'Showroom Depot'}
                              </span>
                            )}
                          </td>

                          {/* Recorder */}
                          <td className="py-2.5 px-2 text-center text-zinc-400 text-[11px] whitespace-nowrap">
                            {bill.recordedBy || 'Admin'}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {/* Print Official Dealership Bill */}
                              <button
                                onClick={() => setSelectedBillForPrint(bill)}
                                className="px-2 py-1 bg-zinc-900 hover:bg-white hover:text-black border border-zinc-700 rounded-lg text-[11px] font-semibold text-zinc-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                title="ເບິ່ງ & ພິມບິນ"
                              >
                                <Printer className="w-3 h-3" />
                                <span>{t.printBillBtn}</span>
                              </button>

                              {/* Installment-Specific Action Buttons */}
                              {isInstallment && (
                                <>
                                  <button
                                    onClick={() => handleOpenLedgerForBill(bill)}
                                    className="p-1 bg-zinc-900 hover:bg-amber-400 hover:text-black text-amber-400 border border-amber-500/40 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                                    title="ຕາຕະລາງເກັບເງິນງວດ"
                                  >
                                    <Calendar className="w-3 h-3" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenDocumentsForBill(bill, 'installment_schedule')}
                                    className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                                    title="ເອກະສານສັນຍາ A4"
                                  >
                                    <FileText className="w-3 h-3" />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => handleDirectDownloadBill(bill)}
                                disabled={isExportingBillPdf}
                                className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                                title="ບັນທຶກ PDF"
                              >
                                <Download className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => handleDirectDownloadBillDocx(bill)}
                                disabled={isExportingBillDocx}
                                className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                                title="ບັນທຶກ Word DOCX"
                              >
                                <FileCheck className="w-3 h-3" />
                              </button>

                              {isSuperAdmin && onDeleteBill && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`${t.confirmDeleteBill} (${bill.billNumber})?`)) {
                                      onDeleteBill(bill.id);
                                    }
                                  }}
                                  className="p-1 bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Bill"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
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
        )}
      </div>

      {/* FULL LUXURY PRINTABLE / VIEWABLE OFFICIAL BILL MODAL */}
      {selectedBillForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:w-full print:max-w-none print:shadow-none">
          <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 text-white space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:m-0 print:max-h-none print:max-w-none print:w-full print:overflow-visible print-modal-container">
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 print:hidden">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-white text-black rounded-lg">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="font-bold text-xs text-white">
                  {isInstallmentBill(selectedBillForPrint)
                    ? 'ໃບບິນຮັບເງິນດາວ & ຜ່ອນຊຳລະທາງການ'
                    : selectedBillForPrint.billType === 'sale' 
                      ? 'ໃບບິນຂາຍລົດຍົນທາງການ' 
                      : 'ໃບບິນຮັບເຂົ້າສາງທາງການ'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadBillPdf}
                  disabled={isExportingBillPdf}
                  className="px-2.5 py-1 bg-zinc-100 hover:bg-white text-black rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-zinc-300 disabled:opacity-60 cursor-pointer"
                  title="ບັນທຶກໃບບິນເປັນ PDF"
                >
                  {isExportingBillPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-black" />
                      <span>PDF (A4)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadBillDocx}
                  disabled={isExportingBillDocx}
                  className="px-2.5 py-1 bg-zinc-100 hover:bg-white text-black rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-zinc-300 disabled:opacity-60 cursor-pointer"
                  title="ບັນທຶກໃບບິນເປັນ Word DOCX"
                >
                  {isExportingBillDocx ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Word...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5 text-black" />
                      <span>DOCX</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePrint}
                  className="px-2.5 py-1 bg-white text-black hover:bg-zinc-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>ພິມບິນ</span>
                </button>

                <button
                  onClick={() => setSelectedBillForPrint(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PRINTABLE BILL CANVAS (Standard Compact Dealership Layout) */}
            <div 
              id="printable-official-bill"
              className="official-dealer-document a4-document-canvas w-full max-w-[580px] mx-auto p-4 sm:p-5 bg-white text-black font-sans text-[11px] leading-normal border border-black rounded-lg shadow-xl flex flex-col justify-between print:m-0 print:p-1 print:border-none print:shadow-none print:w-full print:max-w-none print:min-h-0 print:h-auto print:max-h-[278mm] print:break-inside-avoid print:page-break-inside-avoid print:page-break-after-avoid print:overflow-hidden"
              style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
            >
              {/* Top Section: National Motto & Header */}
              <div>
                {/* National Motto Header */}
                <div className="text-center space-y-0.5 mb-1">
                  <p className="font-bold text-[11px] tracking-wide text-black leading-tight">ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</p>
                  <p className="font-semibold text-[10px] text-black leading-tight">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ</p>
                </div>

                {/* Bill Brand & Document Title Header */}
                <div className="flex items-center justify-between gap-2.5 pb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 flex items-center justify-center border border-black p-0.5 bg-white shrink-0">
                      <AvatrLogo className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-black leading-tight">ບໍລິສັດ ລາວທານີ ກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ.</h2>
                      <p className="text-[10px] font-mono tracking-wider uppercase text-black font-bold">LAOTHANI TRACTOR SOLE CO., LTD</p>
                      <p className="text-[9px] text-black leading-tight">
                        Kaysone Phomvihane Road, Ban Sivilay, Vientiane | Tel: (856-20) 58181999
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] border border-black inline-block bg-zinc-100 text-black">
                      {isInstallmentBill(selectedBillForPrint)
                        ? (selectedBillForPrint.installmentType === 'monthly_installment'
                            ? `ໃບບິນຮັບຄ່າງວດ (ງວດທີ ${selectedBillForPrint.installmentPeriod || 1}/${selectedBillForPrint.installmentTotalPeriods || 48})`
                            : `ໃບບິນຮັບເງິນດາວ (${selectedBillForPrint.downPaymentPercent || 30}%)`)
                        : selectedBillForPrint.billType === 'sale'
                          ? 'ໃບບິນຂາຍລົດ (SALES INVOICE)'
                          : 'ໃບຮັບເຂົ້າສິນຄ້າ (GOODS RECEIPT)'}
                    </span>
                    <div className="font-mono text-[11px] font-black text-black">
                      ເລກທີ: {selectedBillForPrint.billNumber}
                    </div>
                    <div className="text-[10px] text-black font-mono">
                      ວັນທີ: {selectedBillForPrint.date}
                    </div>
                  </div>
                </div>

                {/* Official Divider Line */}
                <div className="border-t-2 border-b border-black h-1 my-1"></div>
              </div>

              {/* Middle Section: Bill Content Details */}
              <div className="flex-1 flex flex-col justify-between py-1.5 print:py-0.5 space-y-2 print:space-y-1">
                {/* Counterparty Details: Customer (Sale & Installment) vs Supplier (Import) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-zinc-50 rounded border border-black text-[10.5px]">
                  {selectedBillForPrint.billType === 'sale' || isInstallmentBill(selectedBillForPrint) ? (
                    <>
                      <div className="space-y-0.5">
                        <span className="text-[9.5px] font-mono text-black uppercase font-bold block">ຂໍ້ມູນລູກຄ້າຜູ້ຊື້ (Customer):</span>
                        <strong className="text-black text-xs block">{selectedBillForPrint.customerName || 'ລູກຄ້າ VIP'}</strong>
                        <div className="text-black font-mono flex items-center gap-1 text-[10px]">
                          <Phone className="w-3 h-3 text-black" />
                          <span>{selectedBillForPrint.customerPhone}</span>
                        </div>
                        {selectedBillForPrint.customerIDCard && (
                          <div className="text-black text-[10px]">ເລກບັດ/ສຳມະໂນ: {selectedBillForPrint.customerIDCard}</div>
                        )}
                        {selectedBillForPrint.customerAddress && (
                          <div className="text-black text-[10px]">{selectedBillForPrint.customerAddress}, {selectedBillForPrint.customerProvince}</div>
                        )}
                      </div>

                      <div className="space-y-0.5 sm:text-right">
                        <span className="text-[9.5px] font-mono text-black uppercase font-bold block">ການຊຳລະເງິນ (Payment):</span>
                        <div className="font-bold text-black uppercase text-[11px]">
                          {isInstallmentBill(selectedBillForPrint)
                            ? 'ຜ່ອນຊຳລະລົດຍົນ (Vehicle Installment Plan)'
                            : selectedBillForPrint.paymentMethod === 'cash' 
                              ? 'ເງິນສົດ (Cash)' 
                              : 'ຊຳລະເງິນຜ່ານ QR (QR Payment)'}
                        </div>
                        {selectedBillForPrint.transferRef && (
                          <div className="text-black font-mono text-[10px]">Ref: {selectedBillForPrint.transferRef}</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-0.5">
                        <span className="text-[9.5px] font-mono text-black uppercase font-bold block">ແຫຼ່ງທີ່ມານຳເຂົ້າ (Supplier / Origin):</span>
                        <strong className="text-black text-xs block">{selectedBillForPrint.supplierName}</strong>
                        <div className="text-black text-[10px]">ດ່ານນຳເຂົ້າ: {selectedBillForPrint.importEntryPort}</div>
                        {selectedBillForPrint.customsDocNumber && (
                          <div className="text-black font-mono text-[10px]">ໃບແຈ້ງພາສີ B01: {selectedBillForPrint.customsDocNumber}</div>
                        )}
                      </div>

                      <div className="space-y-0.5 sm:text-right">
                        <span className="text-[9.5px] font-mono text-black uppercase font-bold block">ສາງເກັບຮັກສາ (Destination Warehouse):</span>
                        <div className="font-bold text-black text-[11px]">{selectedBillForPrint.destinationWarehouse}</div>
                        <div className="text-black text-[10px]">ຜູ້ກວດຮັບ PDI: {selectedBillForPrint.inspectorName || 'Master EV Tech'}</div>
                        <div className="text-black font-mono text-[10px]">ມາດຕະຖານ: ຜ່ານການກວດເຊັກ 100%</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Vehicle Specifications Table */}
                <div className="border border-black rounded overflow-hidden">
                  <table className="w-full text-left font-sans text-[10.5px]">
                    <thead className="bg-zinc-100 text-black border-b border-black font-bold">
                      <tr>
                        <th className="py-1.5 px-2 border-r border-black">ລາຍການ / ລຸ້ນລົດ</th>
                        <th className="py-1.5 px-2 border-r border-black">ເລກຖັງ (VIN) / ປ້າຍ</th>
                        <th className="py-1.5 px-2 text-center border-r border-black w-12">ຈຳນວນ</th>
                        <th className="py-1.5 px-2 text-right border-r border-black w-24">ລາຄາຕໍ່ຄັນ</th>
                        <th className="py-1.5 px-2 text-right w-24">ລວມມູນຄ່າ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      <tr>
                        <td className="py-1.5 px-2 border-r border-black">
                          <strong className="text-black font-sans text-[11px] block">{selectedBillForPrint.model}</strong>
                          <span className="text-black text-[10px] block">{selectedBillForPrint.trim}</span>
                          <span className="text-black text-[10px] block">ສີ: {selectedBillForPrint.color || '-'}</span>
                        </td>
                        <td className="py-1.5 px-2 border-r border-black font-mono text-[10px]">
                          <span className="text-black block font-bold">{selectedBillForPrint.vin}</span>
                          <span className="text-black text-[10px] block">
                            {selectedBillForPrint.plateNumber || 'ປ້າຍແດງ'}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-center text-black font-bold font-mono border-r border-black text-[11px]">
                          {selectedBillForPrint.quantity}
                        </td>
                        <td className="py-1.5 px-2 text-right text-black font-mono border-r border-black text-[11px]">
                          ${selectedBillForPrint.unitPriceUSD.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-right text-black font-bold font-mono text-[11px]">
                          ${(selectedBillForPrint.unitPriceUSD * selectedBillForPrint.quantity).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Free Gifts & Warranty Terms for Sales */}
                {selectedBillForPrint.freeGifts && selectedBillForPrint.freeGifts.length > 0 && (
                  <div className="p-2 bg-zinc-50 rounded border border-black space-y-0.5 text-[10px]">
                    <span className="font-bold text-black uppercase block flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-black" />
                      <span>ຊຸດຂອງແຖມ & ສິດທິພິເສດ (Dealership Privileges):</span>
                    </span>
                    <p className="text-black leading-relaxed">
                      {selectedBillForPrint.freeGifts.join(' • ')}
                    </p>
                    {selectedBillForPrint.warrantyTerms && (
                      <div className="pt-0.5 border-t border-black/40 text-black text-[10px] flex items-center gap-1 font-semibold">
                        <ShieldCheck className="w-3 h-3 text-black" />
                        <span>{selectedBillForPrint.warrantyTerms}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Details & Official QR + Financial Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  {/* Left: Official Company Bank Accounts & QR */}
                  {selectedBillForPrint.billType !== 'import' ? (
                    <div className="p-2 bg-zinc-50 rounded border border-black flex items-center justify-between gap-2">
                      <div className="space-y-0.5 text-[10px]">
                        <span className="font-bold text-black uppercase block">ຊ່ອງທາງຊຳລະເງິນ:</span>
                        <p className="text-black font-mono">USD: <strong>{getStoredCompanyBankInfo().usdAccount}</strong></p>
                        <p className="text-black font-mono">LAK: <strong>{getStoredCompanyBankInfo().lakAccount}</strong></p>
                        <p className="text-[9px] text-black">LAO THANI TRACTOR SOLE CO., LTD</p>
                      </div>

                      <div className="w-12 h-12 bg-white p-0.5 rounded border border-black flex items-center justify-center flex-shrink-0">
                        {getStoredCompanyBankInfo().qrCodeUrl ? (
                          <img src={getStoredCompanyBankInfo().qrCodeUrl!} alt="QR" className="w-full h-full object-contain" />
                        ) : (
                          <QrCode className="w-8 h-8 text-black" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-zinc-50 rounded border border-black text-[10px] space-y-0.5">
                      <span className="font-bold text-black uppercase block">ການຢັ້ງຢືນຮັບສາງ:</span>
                      <p className="text-black">ສາງ: {selectedBillForPrint.destinationWarehouse}</p>
                      <p className="text-black font-semibold">ມາດຕະຖານການກວດຮັບ PDI 100%</p>
                    </div>
                  )}

                  {/* Right: Financial Calculation Summary */}
                  <div className="flex flex-col justify-center space-y-0.5 text-[10.5px] font-mono border border-black rounded p-2 bg-zinc-50">
                    <div className="flex justify-between text-black">
                      <span>ຍອດລວມກ່ອນຫຼຸດ:</span>
                      <span>${(selectedBillForPrint.unitPriceUSD * selectedBillForPrint.quantity).toLocaleString()}</span>
                    </div>
                    {selectedBillForPrint.discountUSD > 0 && (
                      <div className="flex justify-between text-black">
                        <span>ສ່ວນຫຼຸດພິເສດ:</span>
                        <span>-${selectedBillForPrint.discountUSD.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-0.5 border-t border-black text-black font-black text-[11px]">
                      <span>ລາຄາລົດສຸດທິ (Net Price):</span>
                      <span>${selectedBillForPrint.netTotalUSD.toLocaleString()} USD</span>
                    </div>

                    {/* Dedicated Installment / Financing Breakdown */}
                    {isInstallmentBill(selectedBillForPrint) && (
                      <div className="pt-0.5 mt-0.5 border-t border-black/60 text-[10px] font-sans space-y-0.5 bg-amber-500/10 p-1.5 rounded border border-amber-500/30">
                        <div className="flex justify-between font-mono font-bold text-black">
                          <span>ເງິນດາວ ({selectedBillForPrint.downPaymentPercent || 30}%):</span>
                          <span>${(selectedBillForPrint.downPaymentUSD || Math.round(selectedBillForPrint.netTotalUSD * ((selectedBillForPrint.downPaymentPercent || 30) / 100))).toLocaleString()} USD</span>
                        </div>
                        <div className="flex justify-between font-mono text-black">
                          <span>ຍອດກູ້ຢືມສິນເຊື່ອ:</span>
                          <span>${(selectedBillForPrint.netTotalUSD - (selectedBillForPrint.downPaymentUSD || Math.round(selectedBillForPrint.netTotalUSD * ((selectedBillForPrint.downPaymentPercent || 30) / 100)))).toLocaleString()} USD</span>
                        </div>
                        <div className="flex justify-between font-mono text-black">
                          <span>ໄລຍະເວລາຜ່ອນ:</span>
                          <span>{selectedBillForPrint.tenureMonths || 48} ເດືອນ</span>
                        </div>
                        {selectedBillForPrint.monthlyPaymentLAK && (
                          <div className="flex justify-between font-mono text-black">
                            <span>ຄ່າງວດຕໍ່ເດືອນ:</span>
                            <span>~{selectedBillForPrint.monthlyPaymentLAK.toLocaleString()} LAK/ເດືອນ</span>
                          </div>
                        )}
                        <div className="pt-0.5 mt-0.5 border-t border-black/30 flex justify-between font-mono font-black text-black">
                          <span>
                            {selectedBillForPrint.installmentType === 'monthly_installment' 
                              ? `ຊຳລະຄ່າງວດ (ງວດທີ ${selectedBillForPrint.installmentPeriod}):` 
                              : 'ຊຳລະເງິນດາວໃນໃບບິນນີ້:'}
                          </span>
                          <span className="text-black font-extrabold">
                            ${(selectedBillForPrint.amountUSD || selectedBillForPrint.downPaymentUSD || selectedBillForPrint.netTotalUSD).toLocaleString()} USD
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Section: Signatures & Seal Section */}
              <div className="pt-2 print:pt-1.5 border-t border-black grid grid-cols-2 gap-6 text-center text-[10.5px]">
                <div>
                  <span className="font-bold block mb-7 print:mb-4">
                    {isInstallmentBill(selectedBillForPrint)
                      ? 'ລາຍເຊັນລູກຄ້າຜູ້ຊື້ / ຜູ້ກູ້ຢືມ (Borrower)'
                      : selectedBillForPrint.billType === 'sale' 
                        ? 'ລາຍເຊັນລູກຄ້າຜູ້ຊື້ (Customer)' 
                        : 'ລາຍເຊັນຜູ້ຈັດສົ່ງ (Supplier)'}
                  </span>
                  <div className="border-b border-dashed border-black w-36 mx-auto mb-1"></div>
                  <div className="text-black font-semibold text-[10px]">
                    {selectedBillForPrint.customerName || selectedBillForPrint.supplierName || 'ລູກຄ້າ'}
                  </div>
                </div>

                <div>
                  <span className="font-bold block mb-7 print:mb-4">
                    {isInstallmentBill(selectedBillForPrint)
                      ? 'ພະນັກງານສິນເຊື່ອ & ການເງິນ / ຕາປະທັບ'
                      : 'ຜູ້ຮັບຜິດຊອບອອກບິນ / ຕາປະທັບບໍລິສັດ'}
                  </span>
                  <div className="border-b border-dashed border-black w-36 mx-auto mb-1"></div>
                  <div className="text-black font-bold text-[10px]">
                    {selectedBillForPrint.recordedBy || selectedBillForPrint.salesRep || 'Laothani Authorized'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* MODAL 2: INSTALLMENT LEDGER MODAL */}
      {selectedCustomerForLedger && (
        <InstallmentLedgerModal
          isOpen={Boolean(selectedCustomerForLedger)}
          onClose={() => setSelectedCustomerForLedger(null)}
          customer={selectedCustomerForLedger}
          vehicles={vehicles}
          currentUser={currentUser || undefined}
          lang={lang}
          onUpdateCustomerRecords={handleUpdateCustomerRecords}
        />
      )}

      {/* MODAL 3: CUSTOMER DOCUMENTS MODAL */}
      {selectedCustomerForDocs && (
        <CustomerDocumentsModal
          isOpen={Boolean(selectedCustomerForDocs)}
          onClose={() => setSelectedCustomerForDocs(null)}
          customer={selectedCustomerForDocs.customer}
          vehicles={vehicles}
          currentUser={currentUser || undefined}
          lang={lang}
          initialDoc={selectedCustomerForDocs.docType || 'installment_schedule'}
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
    </div>
  );
}
