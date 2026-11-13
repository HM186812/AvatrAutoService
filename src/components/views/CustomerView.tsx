import { withVehicleFromBills } from '../../utils/documentCustomer';
import { isAdminRole } from '../../utils/roles';
import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import {
  Lead,
  VehicleModel,
  Language,
  LeadStatus,
  CustomerCategory,
  SystemUser,
  InstallmentPaymentRecord,
  InvoiceBillRecord,
  ServiceAppointment,
  ActiveMenu
} from '../../types';
import { translations } from '../../data/translations';
import { showToast } from '../common';
import {
  Users,
  Plus,
  Upload,
  Phone,
  Car,
  Star,
  Store,
  Globe,
  Calendar,
  FileText,
  UserPlus,
  CheckCircle2,
  Sparkles,
  Trash2,
  ChevronDown,
  ShoppingBag,
  CreditCard,
  Download,
  Printer,
  MapPin,
  User as UserIcon,
  Banknote,
  Clock,
  Loader2,
  LayoutGrid,
  List,
  X,
  Search,
  ShieldCheck,
  Wrench,
  RotateCcw,
  Gauge,
  BatteryCharging,
  AlertTriangle,
  Pencil,
  CalendarClock,
} from 'lucide-react';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';
import type { CustomerAfterSalesProfile } from '../modals/CustomerAfterSalesModal';
import type { DocumentType } from '../modals/CustomerDocumentsModal';

const CustomerDocumentsModal = lazy(() => import('../modals/CustomerDocumentsModal'));
const CustomerDetailView = lazy(() => import('./CustomerDetailView'));
const InstallmentLedgerModal = lazy(() => import('../modals/InstallmentLedgerModal'));
const PaymentConfirmModal = lazy(() => import('../modals/PaymentConfirmModal'));
const ServiceModal = lazy(() => import('../modals/ServiceModal'));
const CustomerAfterSalesModal = lazy(() => import('../modals/CustomerAfterSalesModal'));
const ContactLogModal = lazy(() => import('../modals/ContactLogModal'));
const PipelineActionModal = lazy(() => import('../modals/PipelineActionModal'));
const ImportBookingCsvModal = lazy(() => import('../modals/ImportBookingCsvModal'));
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl, formatWhatsAppDisplay, openWhatsApp } from '../../utils/whatsapp';
import { deleteLead, saveLead, updateLeadStatus, saveBillRecord, fetchLeadsByDateRange, updateServiceAppointment } from '../../backend/data';
import { newRecordId } from '../../backend/ids';
import { PIPELINE_LABELS, PIPELINE_STAGE_KEYS, getPipelineCurrentIndex, getPipelineDone } from '../../utils/pipeline';
import { getFollowUpState, makeContactEntry, formatDateKey } from '../../utils/followUp';
import InstallmentDashboardView from './InstallmentDashboardView';
import { IssuedDocumentRecord } from '../../types';
import { getIssuedDocumentLogs, fetchDocumentLogsFromCloud, DOCUMENT_LOG_EVENT } from '../../utils/documentLogger';
import { matchesSearch, localDateKey } from '../../utils/search';

interface CustomerViewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  vehicles: VehicleModel[];
  currentUser?: SystemUser;
  lang: Language;
  onOpenNewLead: () => void;
  onOpenQuote: (vehicle: VehicleModel, customerName?: string) => void;
  onSelectCustomerForPOS?: (lead?: Lead) => void;
  onNavigateMenu?: (menu: ActiveMenu) => void;
  bills?: InvoiceBillRecord[];
  setBills?: React.Dispatch<React.SetStateAction<InvoiceBillRecord[]>>;
  services?: ServiceAppointment[];
  setServices?: React.Dispatch<React.SetStateAction<ServiceAppointment[]>>;
  onAddService?: (service: Omit<ServiceAppointment, 'id'>) => Promise<void> | void;
  onUpdateServiceStatus?: (id: string, status: ServiceAppointment['status']) => Promise<void> | void;
  initialClassificationTab?: 'new_leads' | 'existing_customers' | 'installment_customers';
  onEditLead?: (lead: Lead) => void;
}

export default function CustomerView({
  leads,
  setLeads,
  vehicles,
  currentUser,
  lang,
  onOpenNewLead,
  onOpenQuote,
  onSelectCustomerForPOS,
  onNavigateMenu,
  bills = [],
  setBills,
  services = [],
  setServices,
  onAddService,
  onUpdateServiceStatus,
  initialClassificationTab,
  onEditLead,
}: CustomerViewProps) {
  const t = translations[lang] || translations.lo;
  // Deleting customer records is restricted to administrators
  const isAdminUser = isAdminRole(currentUser);

  // View Mode: Cards vs Table
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showBookingImport, setShowBookingImport] = useState(false);

  // Primary Classification Tabs: 'new_leads' (ລູກຄ້າໃໝ່) vs 'existing_customers' (ລູກຄ້າທີ່ຊຳລະສຳເລັດແລ້ວ) vs 'installment_customers' (ລູກຄ້າຜ່ອນຊຳລະ)
  const [customerClassificationTab, setCustomerClassificationTab] = useState<'new_leads' | 'existing_customers' | 'installment_customers'>(initialClassificationTab || 'new_leads');

  // Sync tab if initialClassificationTab changes
  useEffect(() => {
    if (initialClassificationTab) {
      setCustomerClassificationTab(initialClassificationTab);
    }
  }, [initialClassificationTab]);

  // Existing Customers (Car Owners) Filters
  const [existingModelFilter, setExistingModelFilter] = useState('all');
  const [existingServiceFilter, setExistingServiceFilter] = useState<'all' | 'has_service' | 'no_service'>('all');

  // After-Sales Customer Profile Editor Modal State
  const [selectedOwnerForAfterSales, setSelectedOwnerForAfterSales] = useState<CustomerAfterSalesProfile | null>(null);
  const [isAfterSalesModalOpen, setIsAfterSalesModalOpen] = useState(false);

  // Service Modal for booking after-sales service
  const [serviceModalCustomer, setServiceModalCustomer] = useState<{
    name: string;
    phone: string;
    model: string;
    plateNumber?: string;
    mileageKm?: number;
    batteryHealthPercent?: number;
  } | null>(null);

  // Separated Category Filters as requested:
  // 1. Channel Filter (ໝວດຊ່ອງທາງລູກຄ້າ: ທັງໝົດ, Walk-in, Online, Event)
  const [channelFilter, setChannelFilter] = useState<'all' | CustomerCategory>('all');
  // 2. Status Filter (ສະຖານະລູກຄ້າ / ຊ່ອງຈ່າຍແລ້ວ)
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  // Customer search: free text (name, phone, VIN, ID card, plate) plus date (year, then month, then day; '' = any)
  const [crmSearch, setCrmSearch] = useState('');
  const leadMatchesSearch = (lead: Lead) => matchesSearch(crmSearch, {
    texts: [lead.customerName, lead.vin, lead.idCardNumber, lead.plateNumber, lead.engineNumber, lead.interestedModel, lead.paymentReceiptNo],
    phones: [lead.phone],
  });
  const billMatchesSearch = (bill: InvoiceBillRecord) => matchesSearch(crmSearch, {
    texts: [bill.customerName, bill.vin, bill.customerIDCard, bill.plateNumber, bill.billNumber, bill.model],
    phones: [bill.customerPhone],
  });
  const [crmYear, setCrmYear] = useState('');
  const [crmMonth, setCrmMonth] = useState('');
  const [crmDay, setCrmDay] = useState('');
  const isDateSearchActive = Boolean(crmYear);
  const clearDateSearch = () => { setCrmYear(''); setCrmMonth(''); setCrmDay(''); };
  const currentDate = new Date();
  const crmYearIsValid = /^\d{4}$/.test(crmYear) && Number(crmYear) >= 1000;
  const crmMonthIsValid = !crmMonth || (/^\d{1,2}$/.test(crmMonth) && Number(crmMonth) >= 1 && Number(crmMonth) <= 12);
  const validationYear = crmYearIsValid ? Number(crmYear) : currentDate.getFullYear();
  const validationMonth = crmMonthIsValid && crmMonth ? Number(crmMonth) : currentDate.getMonth() + 1;
  const daysInSelectedMonth = new Date(validationYear, validationMonth, 0).getDate();
  const crmDayIsValid = !crmDay || (/^\d{1,2}$/.test(crmDay) && Number(crmDay) >= 1 && Number(crmDay) <= daysInSelectedMonth);
  const crmDateIsValid = crmYearIsValid && crmMonthIsValid && crmDayIsValid;
  // Selected range as YYYY-MM-DD bounds (undefined = no date search)
  const crmDateFrom = isDateSearchActive && crmDateIsValid
    ? `${crmYear}-${(crmMonth || '01').padStart(2, '0')}-${(crmDay || '01').padStart(2, '0')}`
    : '';
  const crmDateTo = isDateSearchActive && crmDateIsValid
    ? `${crmYear}-${(crmMonth || '12').padStart(2, '0')}-${(crmDay || String(crmMonth ? daysInSelectedMonth : 31)).padStart(2, '0')}`
    : '';
  const [isLoadingRangeLeads, setIsLoadingRangeLeads] = useState(false);

  const formatLocalYMD = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    const from = crmDateFrom || undefined;
    const to = crmDateTo || undefined;

    let cancelled = false;
    setIsLoadingRangeLeads(true);
    fetchLeadsByDateRange({ dateFrom: from, dateTo: to })
      .then((fetched) => {
        if (!cancelled && fetched.length > 0) {
          setLeads((prev) => {
            const map = new Map<string, Lead>();
            prev.forEach((l) => map.set(l.id, l));
            fetched.forEach((l) => map.set(l.id, l));
            return Array.from(map.values());
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : 'Could not load customer range.', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRangeLeads(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crmDateFrom, crmDateTo]);

  const matchesCrmTime = (dateStr?: string): boolean => {
    if (!crmDateFrom) return true;
    // Local calendar day: stored timestamps are UTC, Laos is UTC+7
    const day = localDateKey(dateStr);
    if (!day) return false;
    return day >= crmDateFrom && day <= crmDateTo;
  };

  // Toast notification feedback

  // Modal states
  const [selectedCustomerForDocs, setSelectedCustomerForDocs] = useState<Lead | null>(null);
  const [selectedCustomerForInstallments, setSelectedCustomerForInstallments] = useState<Lead | null>(null);
  const [customerToConfirmPayment, setCustomerToConfirmPayment] = useState<Lead | null>(null);
  const [issuedDocLogs, setIssuedDocLogs] = useState<IssuedDocumentRecord[]>(() => getIssuedDocumentLogs());

  useEffect(() => {
    fetchDocumentLogsFromCloud().then(l => { if (l && l.length) setIssuedDocLogs(l); });
    const handleLogsUpdate = () => {
      setIssuedDocLogs(getIssuedDocumentLogs());
    };
    window.addEventListener(DOCUMENT_LOG_EVENT, handleLogsUpdate);
    return () => {
      window.removeEventListener(DOCUMENT_LOG_EVENT, handleLogsUpdate);
    };
  }, []);

  const getCustomerIssuedDocsCount = (customerName: string, phone?: string, vin?: string, leadId?: string) =>
    getCustomerIssuedDocs(customerName, phone, vin, leadId).length;

  const getCustomerIssuedDocs = (customerName: string, phone?: string, vin?: string, leadId?: string) => {
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const cleanName = customerName.trim().toLowerCase();
    const cleanVin = vin ? vin.trim().toLowerCase() : '';
    const cleanLeadId = leadId ? leadId.trim().toLowerCase() : '';

    return issuedDocLogs.filter(log => {
      if (cleanLeadId && log.leadId && log.leadId.trim().toLowerCase() === cleanLeadId) return true;
      if (cleanVin && log.vin && log.vin.trim().toLowerCase() === cleanVin) return true;
      if (cleanPhone.length >= 6 && log.customerPhone && log.customerPhone.replace(/\D/g, '') === cleanPhone) return true;
      if (cleanName && log.customerName && log.customerName.trim().toLowerCase() === cleanName) return true;
      return false;
    });
  };

  // ===== Customer classification (one rule for all three tabs) =====
  const digitsOf = (v?: string) => (v || '').replace(/\D/g, '');
  const isInstallmentBill = (b: InvoiceBillRecord) =>
    b.paymentMethod === 'finance' || b.billType === 'installment' || Boolean(b.downPaymentPercent) || Boolean(b.financeCompany);
  /** A bill belongs to a customer by phone, or by leadId when the bill's phone does not contradict it. */
  const billBelongsTo = (b: InvoiceBillRecord, lead: Lead) => {
    const phone = digitsOf(lead.phone);
    const billPhone = digitsOf(b.customerPhone);
    if (phone.length >= 6 && billPhone === phone) return true;
    return b.leadId === lead.id && (!billPhone || !phone || billPhone === phone);
  };
  const billsForLead = (lead: Lead) => bills.filter(b => b.billType !== 'import' && b.status !== 'voided' && billBelongsTo(b, lead)); // voided bills never make a customer a buyer
  /** Installment contract paid off (belongs to "paid in full"). */
  const isInstallmentCompleted = (lead: Lead) => lead.installmentStatus === 'completed' || Boolean(lead.isPaymentCompleted);

  // Helper to identify if a lead has already completed a purchase (delivered, sale/installment bill, confirmed payment)
  const isLeadPurchased = (lead: Lead) => {
    if (lead.status === 'delivered') return true;
    if (lead.paymentTypeConfirmed === 'full' || lead.paymentTypeConfirmed === 'down_payment') return true;
    if (lead.installmentStatus === 'active_repaying' || lead.installmentStatus === 'completed') return true;
    return billsForLead(lead).length > 0;
  };

  /** Running installment contract (or an installment application in progress): the installment tab. */
  const isActiveInstallmentLead = (lead: Lead) => {
    if (isInstallmentCompleted(lead)) return false;
    if (lead.installmentRecords && lead.installmentRecords.length > 0) return true;
    if (lead.installmentStatus === 'active_repaying' || lead.installmentStatus === 'approved' ||
      lead.installmentStatus === 'pending_approval' || lead.installmentStatus === 'contract_signed') return true;
    if (lead.paymentTypeConfirmed === 'down_payment' || lead.paymentTypeConfirmed === 'installment') return true;
    if (billsForLead(lead).some(isInstallmentBill)) return true;
    const installmentPlan = lead.paymentType === 'installment' || lead.paymentType === 'finance' ||
      Boolean(lead.financeCompany) || Boolean(lead.downPaymentPercent);
    return installmentPlan && isLeadPurchased(lead);
  };

  /** Which tab a customer belongs to. */
  const getCustomerTab = (lead: Lead): 'new_leads' | 'existing_customers' | 'installment_customers' => {
    if (isActiveInstallmentLead(lead)) return 'installment_customers';
    if (isInstallmentCompleted(lead) || isLeadPurchased(lead)) return 'existing_customers';
    return 'new_leads';
  };

  // 1. Prospective leads (Tab 1: ເກັບສະເພາະລູກຄ້າໃໝ່ທີ່ຍັງບໍ່ທັນຕົກລົງຊື້ຂາຍ/ອອກບິນ ຫຼື ຍັງບໍ່ທັນເຂົ້າສູ່ສັນຍາຜ່ອນຊຳລະຕົວຈິງ)
  const prospectiveLeads = useMemo(() => {
    return leads.filter(lead => getCustomerTab(lead) === 'new_leads' && matchesCrmTime(lead.createdAt || lead.paymentDate));
  }, [leads, bills, crmDateFrom, crmDateTo]);

  // Separated Counts (calculated exclusively for prospective leads):
  // 1. Acquisition Channel counts
  const followUpCounts = {
    today: prospectiveLeads.filter(l => getFollowUpState(l) === 'today').length,
    overdue: prospectiveLeads.filter(l => getFollowUpState(l) === 'overdue').length,
  };

  const channelCounts = {
    all: prospectiveLeads.length,
    walk_in: prospectiveLeads.filter(l => l.category === 'walk_in').length,
    online: prospectiveLeads.filter(l => l.category === 'online').length,
    event: prospectiveLeads.filter(l => l.category === 'event').length,
  };



  // 3. Status / Lifecycle counts for active prospective pipeline
  const statusCounts = {
    all: prospectiveLeads.filter(l => l.status !== 'lost').length,
    lost: prospectiveLeads.filter(l => l.status === 'lost').length,
    new: prospectiveLeads.filter(l => l.status === 'new').length,
    contacted: prospectiveLeads.filter(l => l.status === 'contacted').length,
    test_drive: prospectiveLeads.filter(l => l.status === 'test_drive').length,
    negotiation: prospectiveLeads.filter(l => l.status === 'negotiation').length,
  };



  // Modal delete state for modern confirmation popup
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  // Contact log / follow-up
  const [contactLead, setContactLead] = useState<Lead | null>(null);
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'today' | 'overdue'>('all');
  // Customer detail page (one place for info, next step, documents and timeline)
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [detailFallbackLead, setDetailFallbackLead] = useState<Lead | null>(null);
  const detailLead = detailLeadId
    ? leads.find(l => l.id === detailLeadId) || (detailFallbackLead?.id === detailLeadId ? detailFallbackLead : null)
    : null;
  const openCustomerDetail = (lead: Lead) => {
    setDetailFallbackLead(lead);
    setDetailLeadId(lead.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Installment customer (running or paid off) — drives the detail page's installment card
  const isLeadInstallment = (lead: Lead) =>
    isActiveInstallmentLead(lead) ||
    (isInstallmentCompleted(lead) && (lead.paymentType === 'installment' || lead.paymentType === 'finance' ||
      Boolean(lead.installmentRecords && lead.installmentRecords.length > 0) || lead.installmentStatus === 'completed'));
  const getLeadBills = (lead: Lead) => {
    const phone = lead.phone ? lead.phone.replace(/\D/g, '') : '';
    return bills.filter(b =>
      b.billType !== 'import' &&
      (b.leadId === lead.id || (phone.length >= 6 && b.customerPhone && b.customerPhone.replace(/\D/g, '') === phone))
    );
  };

  // ===== Sales pipeline: one clear "next step" per customer =====
  const PIPELINE_STAGES = PIPELINE_STAGE_KEYS.map(key => ({
    key,
    label: lang === 'en' ? PIPELINE_LABELS[key].en : lang === 'th' ? PIPELINE_LABELS[key].th : PIPELINE_LABELS[key].lo,
  }));

  // Booking (deposit) and delivery actions, then open the matching document
  const [pipelineAction, setPipelineAction] = useState<{ mode: 'booking' | 'delivery'; leadId: string } | null>(null);
  const [docsInitialDoc, setDocsInitialDoc] = useState<DocumentType | undefined>(undefined);
  const openDocuments = (lead: Lead, initialDoc?: DocumentType) => {
    setDocsInitialDoc(initialDoc);
    setSelectedCustomerForDocs(lead);
  };
  const handlePipelineSave = async (updated: Lead, message: string) => {
    const mode = pipelineAction?.mode;
    await handleSaveContactLog(updated, message); // saves, updates state, toasts; throws on failure
    setPipelineAction(null);
    openDocuments(updated, mode === 'booking' ? 'booking' : 'handover');
  };

  const handleIssueQuote = (lead: Lead) => {
    const vehicle = vehicles.find(v => v.name === lead.interestedModel) || vehicles[0];
    if (!vehicle) {
      showToast('ບໍ່ພົບຂໍ້ມູນລຸ້ນລົດ ສຳລັບອອກໃບສະເໜີລາຄາ', 'error');
      return;
    }
    onOpenQuote(vehicle, lead.customerName);
    // Issuing a quotation moves the customer into the negotiation stage
    if (lead.status === 'new' || lead.status === 'contacted' || lead.status === 'test_drive') {
      void handleUpdateStatus(lead.id, 'negotiation');
    }
  };

  const renderPipelineStepper = (lead: Lead) => {
    if (lead.status === 'lost') {
      return (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-full font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">{t.statusLost}</span>
          <span className="text-zinc-500">{lang === 'lo' ? 'ເຄສນີ້ປິດແລ້ວ — ເປີດຄືນໄດ້ຖ້າລູກຄ້າກັບມາ' : 'This lead is closed — reopen it if the customer returns'}</span>
        </div>
      );
    }
    const done = getPipelineDone(lead, isLeadPurchased(lead));
    const current = getPipelineCurrentIndex(done);
    return (
      <ol className="flex items-center gap-1 text-[10px] font-semibold" aria-label={lang === 'lo' ? 'ຂັ້ນຕອນການຂາຍ' : 'Sales stage'}>
        {PIPELINE_STAGES.map((st, i) => {
          const isDone = done[i];
          const active = i === current;
          return (
            <li key={st.key} className="flex items-center gap-1 shrink-0" aria-current={active ? 'step' : undefined}>
              <span className={`whitespace-nowrap px-2 py-0.5 rounded-full border ${active
                ? 'bg-blue-600 text-white border-blue-600'
                : isDone
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                  : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                {isDone ? '✓ ' : ''}{st.label}
              </span>
              {i < PIPELINE_STAGES.length - 1 && <span className="text-zinc-600" aria-hidden="true">›</span>}
            </li>
          );
        })}
      </ol>
    );
  };

  /** Primary "next step" button (+ one secondary option) for a prospective lead */
  const renderNextStep = (lead: Lead, size: 'sm' | 'md') => {
    const primaryCls = size === 'md'
      ? 'px-4 py-2 rounded-xl text-xs'
      : 'px-2.5 py-1 rounded-lg text-[10px]';
    const secondaryCls = size === 'md'
      ? 'px-3 py-2 rounded-xl text-xs'
      : 'px-2 py-1 rounded-lg text-[10px]';
    const iconCls = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';
    const primaryBase = `${primaryCls} whitespace-nowrap font-bold text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer`;
    const secondaryBase = `${secondaryCls} whitespace-nowrap font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 flex items-center gap-1 transition-colors cursor-pointer`;

    if (lead.status === 'lost') {
      return (
        <button type="button" onClick={() => handleUpdateStatus(lead.id, 'contacted')} className={`${primaryBase} bg-zinc-700 hover:bg-zinc-600`}
          title={lang === 'lo' ? 'ເປີດເຄສຄືນ ແລະ ກັບໄປຕິດຕາມລູກຄ້າ' : 'Reopen lead'}>
          <RotateCcw className={iconCls} />
          <span>{lang === 'lo' ? 'ເປີດເຄສຄືນ' : lang === 'th' ? 'เปิดเคสใหม่' : 'Reopen'}</span>
        </button>
      );
    }

    const sellButton = (primary: boolean) => onSelectCustomerForPOS && (
      <button type="button" onClick={() => onSelectCustomerForPOS(lead)}
        className={primary ? `${primaryBase} bg-emerald-600 hover:bg-emerald-500` : secondaryBase}
        title={lang === 'lo' ? 'ເປີດບິນຂາຍ POS ພ້ອມຂໍ້ມູນລູກຄ້າຄົນນີ້' : 'Open POS with this customer'}>
        <ShoppingBag className={iconCls} />
        <span>{primary
          ? (lang === 'lo' ? 'ອອກບິນຂາຍ (POS)' : lang === 'th' ? 'ออกบิลขาย (POS)' : 'Create Invoice (POS)')
          : (lang === 'lo' ? 'ຂາຍເລີຍ' : lang === 'th' ? 'ขายเลย' : 'Sell now')}</span>
      </button>
    );
    const quoteButton = (primary: boolean) => (
      <button type="button" onClick={() => handleIssueQuote(lead)}
        className={primary ? `${primaryBase} bg-blue-600 hover:bg-blue-500` : secondaryBase}
        title={lang === 'lo' ? 'ອອກໃບສະເໜີລາຄາໃຫ້ລູກຄ້າຄົນນີ້' : 'Issue a quotation'}>
        <FileText className={iconCls} />
        <span>{primary
          ? (lang === 'lo' ? 'ອອກໃບສະເໜີລາຄາ' : lang === 'th' ? 'ออกใบเสนอราคา' : 'Issue Quotation')
          : (lang === 'lo' ? 'ສະເໜີລາຄາໃໝ່' : lang === 'th' ? 'เสนอราคาใหม่' : 'New quote')}</span>
      </button>
    );

    const depositButton = (
      <button type="button" onClick={() => setPipelineAction({ mode: 'booking', leadId: lead.id })}
        className={`${primaryBase} bg-blue-600 hover:bg-blue-500`}
        title={lang === 'lo' ? 'ຮັບເງິນມັດຈຳ ແລະ ອອກໃບສັນຍາສັ່ງຈອງ' : 'Take a deposit and issue the booking contract'}>
        <CreditCard className={iconCls} />
        <span>{lang === 'lo' ? 'ຮັບມັດຈຳ' : lang === 'th' ? 'รับมัดจำ' : 'Take Deposit'}</span>
      </button>
    );
    const bookingDocButton = (
      <button type="button" onClick={() => openDocuments(lead, 'booking')} className={secondaryBase}
        title={lang === 'lo' ? 'ເປີດໃບສັນຍາສັ່ງຈອງ' : 'Open booking contract'}>
        <FileText className={iconCls} />
        <span>{lang === 'lo' ? 'ໃບຈອງ' : lang === 'th' ? 'ใบจอง' : 'Booking'}</span>
      </button>
    );

    // booked -> invoice in POS; negotiation -> take deposit; earlier -> quotation
    if (lead.bookingDate) return <>{bookingDocButton}{sellButton(true)}</>;
    if (lead.status === 'negotiation') return <>{sellButton(false)}{depositButton}</>;
    return <>{sellButton(false)}{quoteButton(true)}</>;
  };

  const handleSaveContactLog = async (updated: Lead, message: string, removedContactIds?: string[]) => {
    try {
      if (!currentUser?.id) throw new Error('Sign in again before saving the contact log.');
      // The saved copy also carries entries other accounts added meanwhile
      const saved = await saveLead(updated, currentUser.id, undefined, { removedContactIds });
      setLeads(prev => prev.map(l => (l.id === updated.id ? saved : l)));
      if (contactLead?.id === updated.id) setContactLead(saved);
      showToast(message, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Contact log could not be saved.', 'error');
      throw error;
    }
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!leadToDelete) return;
    if (!isAdminUser) {
      showToast('ສະເພາະ Admin ເທົ່ານັ້ນທີ່ລົບຂໍ້ມູນລູກຄ້າໄດ້!', 'error');
      setLeadToDelete(null);
      return;
    }
    try {
      await deleteLead(leadToDelete.id);
      setLeads(prev => prev.filter(l => l.id !== leadToDelete.id));
      showToast(`ລົບຂໍ້ມູນລູກຄ້າ ${leadToDelete.customerName} ສຳເລັດ`, 'success');
      setLeadToDelete(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Customer could not be deleted.', 'error');
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      const statusText: Record<string, string> = {
        new: t.statusNew, contacted: t.statusContacted, test_drive: t.statusTestDrive,
        negotiation: t.statusNegotiation, delivered: t.statusDelivered || 'ຈ່າຍແລ້ວ', lost: t.statusLost,
      };
      const target = leads.find(l => l.id === leadId);
      const name = target?.customerName || '';
      if (target) {
        // Automatic contact-history entry for every status change
        const updatedLead: Lead = {
          ...target,
          status: newStatus,
          lastFollowUp: new Date().toISOString(),
          contactHistory: [
            ...(target.contactHistory || []),
            makeContactEntry('status', `${statusText[target.status] || target.status} → ${statusText[newStatus] || newStatus}`, currentUser?.name),
          ],
        };
        setLeads(prev => prev.map(l => (l.id === leadId ? updatedLead : l)));
        // Persist the history entry (surface error instead of silently swallowing)
        if (currentUser?.id) {
          await saveLead(updatedLead, currentUser.id);
        }
      }
      showToast(`ອັບເດດສະຖານະ ${name}: ${statusText[newStatus] || newStatus}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Customer status could not be updated.', 'error');
    }
  };

  const [updatingServiceId, setUpdatingServiceId] = useState<string | null>(null);

  const handleUpdateSingleServiceStatus = async (serviceId: string, newStatus: ServiceAppointment['status']) => {
    setUpdatingServiceId(serviceId);
    try {
      if (onUpdateServiceStatus) {
        // Parent handler shows its own success/error toast.
        await onUpdateServiceStatus(serviceId, newStatus);
      } else {
        const target = services.find(s => s.id === serviceId);
        if (target) {
          const updated: ServiceAppointment = { ...target, status: newStatus };
          await updateServiceAppointment(updated);
          if (setServices) {
            setServices(prev => prev.map(s => s.id === serviceId ? updated : s));
          }
        }
        showToast(lang === 'lo' ? 'ອັບເດດສະຖານະການບໍລິການສຳເລັດ!' : 'Service status updated successfully!');
      }
    } catch (error) {
      if (!onUpdateServiceStatus) {
        showToast(error instanceof Error ? error.message : 'Could not update service status.', 'error');
      }
    } finally {
      setUpdatingServiceId(null);
    }
  };


  const handleUpdateCustomerRecords = async (customerId: string, newRecords: InstallmentPaymentRecord[]) => {
    const targetLead = leads.find(l => l.id === customerId);
    if (!targetLead) throw new Error('Customer record not found.');
    const updatedLead: Lead = {
      ...targetLead,
      installmentRecords: newRecords,
      lastFollowUp: new Date().toISOString(),
    };
    try {
      if (!currentUser?.id) throw new Error('Sign in again before saving installment ledger.');
      await saveLead(updatedLead, currentUser.id);
      setLeads(prev => prev.map(l => l.id === customerId ? updatedLead : l));
      if (selectedCustomerForInstallments?.id === customerId) {
        setSelectedCustomerForInstallments(updatedLead);
      }
      showToast('ບັນທຶກ ແລະ ອັບເດດຕາຕະລາງເກັບເງິນງວດຮຽບຮ້ອຍແລ້ວ');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Installment ledger could not be saved.', 'error');
      throw error;
    }
  };

  const handleConfirmCustomerPayment = async (updatedLead: Lead) => {
    try {
      if (!currentUser?.id) throw new Error('Sign in again before confirming payment.');
      await saveLead(updatedLead, currentUser.id);
      setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
      if (selectedCustomerForDocs?.id === updatedLead.id) {
        setSelectedCustomerForDocs(updatedLead);
      }
      if (selectedCustomerForInstallments?.id === updatedLead.id) {
        setSelectedCustomerForInstallments(updatedLead);
      }
      const isInst = updatedLead.paymentType === 'installment' || updatedLead.paymentType === 'finance';
      showToast(
        isInst
          ? `ຢືນຢັນການຊຳລະເງິນດາວ "${updatedLead.customerName}" ສຳເລັດແລ້ວ! ຍ້າຍໄປແທັບ "ລູກຄ້າຜ່ອນຊຳລະ" ແລ້ວ.`
          : `ຢືນຢັນການຊຳລະເງິນ "${updatedLead.customerName}" ສຳເລັດແລ້ວ! ຍ້າຍໄປແທັບ "ລູກຄ້າຊຳລະຄົບແລ້ວ" ແລ້ວ.`
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Payment confirmation could not be saved.', 'error');
      throw error;
    }
  };

  // Save / Update After-Sales & Warranty Profile for each car owner
  const handleSaveAfterSalesProfile = async (updatedData: {
    customerName: string;
    phone: string;
    idCardNumber?: string;
    province?: string;
    district?: string;
    village?: string;
    model: string;
    plateNumber: string;
    vin: string;
    engineNumber?: string;
    color?: string;
    purchaseDate?: string;
    currentMileageKm?: number;
    batteryHealthSOH?: number;
    warrantyStartDate: string;
    warrantyExpiryDate: string;
    warrantyYears: number;
    warrantyDistanceKm: number;
    warrantyTerms: string;
    afterSalesNotes?: string;
  }) => {
    try {
      if (!selectedOwnerForAfterSales) return;
      if (!currentUser?.id) throw new Error('Sign in again before saving after-sales data.');

      // 1. If customer has a leadRecord, update and save lead
      if (selectedOwnerForAfterSales.leadRecord) {
        const targetLead = selectedOwnerForAfterSales.leadRecord;
        const updatedLead: Lead = {
          ...targetLead,
          customerName: updatedData.customerName,
          phone: updatedData.phone,
          idCardNumber: updatedData.idCardNumber,
          province: updatedData.province,
          district: updatedData.district,
          village: updatedData.village,
          interestedModel: updatedData.model,
          plateNumber: updatedData.plateNumber,
          vin: updatedData.vin,
          engineNumber: updatedData.engineNumber,
          color: updatedData.color,
          currentMileageKm: updatedData.currentMileageKm,
          batteryHealthSOH: updatedData.batteryHealthSOH,
          warrantyStartDate: updatedData.warrantyStartDate,
          warrantyExpiryDate: updatedData.warrantyExpiryDate,
          warrantyYears: updatedData.warrantyYears,
          warrantyDistanceKm: updatedData.warrantyDistanceKm,
          warrantyTerms: updatedData.warrantyTerms,
          afterSalesNotes: updatedData.afterSalesNotes,
        };

        await saveLead(updatedLead, currentUser.id);
        setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
      }

      // 2. If customer has a billRecord, update and save bill
      if (selectedOwnerForAfterSales.billRecord) {
        const targetBill = selectedOwnerForAfterSales.billRecord;
        const updatedBill: InvoiceBillRecord = {
          ...targetBill,
          customerName: updatedData.customerName,
          customerPhone: updatedData.phone,
          customerIDCard: updatedData.idCardNumber,
          customerProvince: updatedData.province,
          model: updatedData.model,
          plateNumber: updatedData.plateNumber,
          vin: updatedData.vin,
          engineNumber: updatedData.engineNumber,
          color: updatedData.color,
          currentMileageKm: updatedData.currentMileageKm,
          batteryHealthSOH: updatedData.batteryHealthSOH,
          warrantyStartDate: updatedData.warrantyStartDate,
          warrantyExpiryDate: updatedData.warrantyExpiryDate,
          warrantyYears: updatedData.warrantyYears,
          warrantyDistanceKm: updatedData.warrantyDistanceKm,
          warrantyTerms: updatedData.warrantyTerms,
          afterSalesNotes: updatedData.afterSalesNotes,
          notes: updatedData.afterSalesNotes || targetBill.notes,
        };

        await saveBillRecord(updatedBill, currentUser.id);
        if (setBills) {
          setBills(prev => prev.map(b => b.id === updatedBill.id ? updatedBill : b));
        }
      }

      // 3. If there was no leadRecord (e.g. only bill), synthesize and persist leadRecord so it's fully indexed
      if (!selectedOwnerForAfterSales.leadRecord) {
        const syntheticLead: Lead = {
          id: selectedOwnerForAfterSales.id.replace(/^owner-(?:bill|inst-completed)-/, '') || newRecordId(),
          customerName: updatedData.customerName,
          phone: updatedData.phone,
          idCardNumber: updatedData.idCardNumber,
          province: updatedData.province || 'ນະຄອນຫຼວງວຽງຈັນ',
          district: updatedData.district,
          village: updatedData.village,
          category: 'walk_in',
          source: 'Showroom Delivery',
          interestedModel: updatedData.model,
          status: 'delivered',
          priority: 'vip',
          notes: updatedData.afterSalesNotes || `ລົດສົ່ງມອບແລ້ວ: ${updatedData.model} VIN: ${updatedData.vin}`,
          paymentType: 'cash',
          paymentDate: updatedData.purchaseDate,
          paymentReceiptNo: updatedData.plateNumber || updatedData.vin,
          assignedTo: currentUser?.name || 'Admin',
          createdAt: updatedData.purchaseDate || new Date().toISOString(),
          plateNumber: updatedData.plateNumber,
          vin: updatedData.vin,
          engineNumber: updatedData.engineNumber,
          color: updatedData.color,
          currentMileageKm: updatedData.currentMileageKm,
          batteryHealthSOH: updatedData.batteryHealthSOH,
          warrantyStartDate: updatedData.warrantyStartDate,
          warrantyExpiryDate: updatedData.warrantyExpiryDate,
          warrantyYears: updatedData.warrantyYears,
          warrantyDistanceKm: updatedData.warrantyDistanceKm,
          warrantyTerms: updatedData.warrantyTerms,
          afterSalesNotes: updatedData.afterSalesNotes,
        };
        await saveLead(syntheticLead, currentUser.id);
        setLeads(prev => [syntheticLead, ...prev.filter(l => l.id !== syntheticLead.id)]);
      }

      showToast(`ບັນທຶກຂໍ້ມູນຫຼັງການຂາຍ ແລະ ໄລຍະຮັບປະກັນຂອງ "${updatedData.customerName}" ສຳເລັດແລ້ວ!`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save after-sales data.', 'error');
      throw error;
    }
  };

  // Helper to compute live warranty metrics, duration, and expiration status
  const computeWarrantyMetrics = (
    startDateStr: string,
    expiryDateStr?: string,
    yearsVal?: number,
    distanceKmVal?: number,
    currentMileage?: number
  ) => {
    const years = yearsVal || 8;
    const distance = distanceKmVal || 160000;
    const startDate = new Date(startDateStr);
    let expiryDate: Date;
    if (expiryDateStr && !isNaN(new Date(expiryDateStr).getTime())) {
      expiryDate = new Date(expiryDateStr);
    } else {
      expiryDate = new Date(startDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + years);
    }
    const expiryFormatted = expiryDate.toISOString().slice(0, 10);
    const startFormatted = startDate.toISOString().slice(0, 10);

    const now = new Date();
    const totalDays = Math.max(1, Math.round((expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const remainingPct = Math.min(100, Math.max(0, Math.round((remainingDays / totalDays) * 100)));

    let warrantyStatus: 'active' | 'expiring' | 'expired' = 'active';
    let remainingText = '';

    if (remainingDays <= 0) {
      warrantyStatus = 'expired';
      remainingText = `ໝົດອາຍຸແລ້ວ (${Math.abs(remainingDays)} ວັນ)`;
    } else if (remainingDays <= 180) {
      warrantyStatus = 'expiring';
      const m = Math.floor(remainingDays / 30.4);
      remainingText = `ໃກ້ໝົດ: ເຫຼືອ ${m > 0 ? m + ' ເດືອນ ' : ''}${remainingDays % 30} ວັນ`;
    } else {
      warrantyStatus = 'active';
      const y = Math.floor(remainingDays / 365.25);
      const m = Math.floor((remainingDays % 365.25) / 30.4);
      remainingText = `ເຫຼືອ ${y > 0 ? y + ' ປີ ' : ''}${m > 0 ? m + ' ເດືອນ' : ''}`;
    }

    const remainingDistanceKm = currentMileage != null ? Math.max(0, distance - currentMileage) : distance;

    return {
      warrantyYears: years,
      warrantyDistanceKm: distance,
      warrantyStartDate: startFormatted,
      warrantyExpiryDate: expiryFormatted,
      warrantyStatus,
      remainingDays,
      remainingPct,
      remainingText,
      remainingDistanceKm,
    };
  };

  // Existing Customers (Car Owners who bought via 100% Cash / Bank Transfer)
  const existingCustomers = useMemo(() => {
    const list: Array<CustomerAfterSalesProfile & {
      remainingDays: number;
      remainingPct: number;
      remainingText: string;
      remainingDistanceKm: number;
      warrantyStatus: 'active' | 'expiring' | 'expired';
      paymentType?: string;
    }> = [];

    const seenKeys = new Set<string>();

    const ownerKey = (phone?: string, name?: string, fallback?: string) =>
      digitsOf(phone) || (name || '').trim().toLowerCase() || (fallback || '').toLowerCase();

    // Build O(1) indexed lookup maps for leads and services to eliminate O(N^2) bottlenecks
    const leadsById = new Map<string, Lead>(leads.map(l => [l.id, l]));
    const leadsByCleanPhone = new Map<string, Lead>();
    const leadsByLowerName = new Map<string, Lead>();
    leads.forEach(l => {
      const p = (l.phone || '').replace(/\D/g, '');
      if (p) leadsByCleanPhone.set(p, l);
      const n = (l.customerName || '').trim().toLowerCase();
      if (n) leadsByLowerName.set(n, l);
    });

    const servicesByPhone = new Map<string, ServiceAppointment[]>();
    const servicesByName = new Map<string, ServiceAppointment[]>();
    const servicesByPlate = new Map<string, ServiceAppointment[]>();
    services.forEach(s => {
      const p = (s.phone || '').replace(/\D/g, '');
      if (p) {
        const arr = servicesByPhone.get(p) || [];
        arr.push(s);
        servicesByPhone.set(p, arr);
      }
      const n = (s.customerName || '').trim().toLowerCase();
      if (n) {
        const arr = servicesByName.get(n) || [];
        arr.push(s);
        servicesByName.set(n, arr);
      }
      const pl = (s.plateNumber || '').trim().toLowerCase();
      if (pl) {
        const arr = servicesByPlate.get(pl) || [];
        arr.push(s);
        servicesByPlate.set(pl, arr);
      }
    });

    const getMatchedServices = (phone?: string, name?: string, plate?: string) => {
      const p = (phone || '').replace(/\D/g, '');
      const n = (name || '').trim().toLowerCase();
      const pl = (plate || '').trim().toLowerCase();
      const set = new Set<ServiceAppointment>();
      if (p && servicesByPhone.has(p)) servicesByPhone.get(p)!.forEach(item => set.add(item));
      if (n && servicesByName.has(n)) servicesByName.get(n)!.forEach(item => set.add(item));
      if (pl && servicesByPlate.has(pl)) servicesByPlate.get(pl)!.forEach(item => set.add(item));
      return Array.from(set);
    };

    // 1. From completed Sales Bills (STRICTLY full cash / transfer only)
    const saleBills = bills.filter(b => b.status !== 'voided' && (b.billType === 'sale' || (!b.billType && b.customerName)) && !isInstallmentBill(b));
    saleBills.forEach(bill => {
      const cleanPhone = digitsOf(bill.customerPhone);
      const cleanName = (bill.customerName || '').trim().toLowerCase();
      const byId = bill.leadId ? leadsById.get(bill.leadId) : undefined;
      // Strong match = same lead id or same phone. A name-only match is just a hint for
      // filling profile fields; it must never hide a paid bill (two people can share a name).
      const strongLead = (byId && billBelongsTo(bill, byId) ? byId : undefined) ||
        (cleanPhone.length >= 6 ? leadsByCleanPhone.get(cleanPhone) : undefined);
      const nameLead = !strongLead && cleanName ? leadsByLowerName.get(cleanName) : undefined;
      const matchedLead = strongLead ||
        (nameLead && getCustomerTab(nameLead) === 'existing_customers' ? nameLead : undefined);

      if (strongLead && getCustomerTab(strongLead) !== 'existing_customers') {
        return; // Running installment: shown in its own tab
      }
      seenKeys.add(ownerKey(bill.customerPhone, bill.customerName, bill.vin || bill.id));

      const matchedServices = getMatchedServices(bill.customerPhone, bill.customerName, bill.plateNumber);

      const purchaseDate = bill.date || matchedLead?.paymentDate || matchedLead?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
      const rawStart = matchedLead?.warrantyStartDate || bill.warrantyStartDate || purchaseDate;
      const rawExpiry = matchedLead?.warrantyExpiryDate || bill.warrantyExpiryDate;
      const rawYears = matchedLead?.warrantyYears || bill.warrantyYears || 8;
      const rawDistance = matchedLead?.warrantyDistanceKm || bill.warrantyDistanceKm || 160000;
      const currentMileageKm = matchedLead?.currentMileageKm ?? bill.currentMileageKm;
      const batteryHealthSOH = matchedLead?.batteryHealthSOH ?? bill.batteryHealthSOH;

      const warrantyMetrics = computeWarrantyMetrics(rawStart, rawExpiry, rawYears, rawDistance, currentMileageKm);

      list.push({
        id: `owner-bill-${bill.id}`,
        customerName: bill.customerName || matchedLead?.customerName || 'ລູກຄ້າ AVATR',
        phone: bill.customerPhone || matchedLead?.phone || '',
        idCardNumber: bill.customerIDCard || matchedLead?.idCardNumber,
        province: bill.customerProvince || matchedLead?.province || 'ນະຄອນຫຼວງວຽງຈັນ',
        district: matchedLead?.district,
        village: matchedLead?.village,
        model: bill.model || matchedLead?.interestedModel || 'AVATR 12',
        plateNumber: matchedLead?.plateNumber || bill.plateNumber || '',
        vin: matchedLead?.vin || bill.vin || '',
        engineNumber: matchedLead?.engineNumber || bill.engineNumber,
        color: matchedLead?.color || bill.color,
        purchaseDate,
        paymentType: bill.paymentMethod || matchedLead?.paymentType || 'cash',
        currentMileageKm,
        batteryHealthSOH: batteryHealthSOH != null ? Math.round(batteryHealthSOH * 10) / 10 : undefined,
        warrantyStartDate: warrantyMetrics.warrantyStartDate,
        warrantyExpiryDate: warrantyMetrics.warrantyExpiryDate,
        warrantyYears: warrantyMetrics.warrantyYears,
        warrantyDistanceKm: warrantyMetrics.warrantyDistanceKm,
        warrantyStatus: warrantyMetrics.warrantyStatus,
        remainingDays: warrantyMetrics.remainingDays,
        remainingPct: warrantyMetrics.remainingPct,
        remainingText: warrantyMetrics.remainingText,
        remainingDistanceKm: warrantyMetrics.remainingDistanceKm,
        warrantyTerms: matchedLead?.warrantyTerms || bill.warrantyTerms || 'ຮັບປະກັນແບັດເຕີຣີ EV CATL 8 ປີ / 160,000 km',
        afterSalesNotes: matchedLead?.afterSalesNotes || bill.afterSalesNotes || bill.notes,
        billRecord: bill,
        leadRecord: matchedLead,
        services: matchedServices,
      });
    });

    // 2. Completed installment customers (paid off and contract closed)
    leads.filter(l => isInstallmentCompleted(l)).forEach(lead => {
      const key = ownerKey(lead.phone, lead.customerName, lead.id);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const matchedServices = getMatchedServices(lead.phone, lead.customerName, lead.plateNumber);

        const purchaseDate = lead.paidDate || lead.paymentDate || lead.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
        const rawStart = lead.warrantyStartDate || purchaseDate;
        const rawExpiry = lead.warrantyExpiryDate;
        const rawYears = lead.warrantyYears || 8;
        const rawDistance = lead.warrantyDistanceKm || 160000;
        const currentMileageKm = lead.currentMileageKm;
        const batteryHealthSOH = lead.batteryHealthSOH;

        const warrantyMetrics = computeWarrantyMetrics(rawStart, rawExpiry, rawYears, rawDistance, currentMileageKm);

        list.push({
          id: `owner-inst-completed-${lead.id}`,
          customerName: lead.customerName,
          phone: lead.phone,
          idCardNumber: lead.idCardNumber,
          province: lead.province || 'ນະຄອນຫຼວງວຽງຈັນ',
          district: lead.district,
          village: lead.village,
          model: lead.interestedModel || 'AVATR 11',
          plateNumber: lead.plateNumber || '',
          vin: lead.vin || '',
          engineNumber: lead.engineNumber,
          color: lead.color,
          purchaseDate,
          paymentType: 'installment_completed',
          currentMileageKm,
          batteryHealthSOH: batteryHealthSOH != null ? Math.round(batteryHealthSOH * 10) / 10 : undefined,
          warrantyStartDate: warrantyMetrics.warrantyStartDate,
          warrantyExpiryDate: warrantyMetrics.warrantyExpiryDate,
          warrantyYears: warrantyMetrics.warrantyYears,
          warrantyDistanceKm: warrantyMetrics.warrantyDistanceKm,
          warrantyStatus: warrantyMetrics.warrantyStatus,
          remainingDays: warrantyMetrics.remainingDays,
          remainingPct: warrantyMetrics.remainingPct,
          remainingText: warrantyMetrics.remainingText,
          remainingDistanceKm: warrantyMetrics.remainingDistanceKm,
          warrantyTerms: lead.warrantyTerms || 'ຮັບປະກັນແບັດເຕີຣີ EV CATL 8 ປີ / 160,000 km',
          afterSalesNotes: lead.afterSalesNotes || lead.notes,
          leadRecord: lead,
          services: matchedServices,
        });
      }
    });

    // 3. Every other purchased customer not listed from a bill (cash / transfer / confirmed payment)
    leads.filter(l => getCustomerTab(l) === 'existing_customers' && !isInstallmentCompleted(l)).forEach(lead => {
      const key = ownerKey(lead.phone, lead.customerName, lead.id);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const matchedServices = getMatchedServices(lead.phone, lead.customerName, lead.plateNumber);

        const purchaseDate = lead.paymentDate || lead.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
        const rawStart = lead.warrantyStartDate || purchaseDate;
        const rawExpiry = lead.warrantyExpiryDate;
        const rawYears = lead.warrantyYears || 8;
        const rawDistance = lead.warrantyDistanceKm || 160000;
        const currentMileageKm = lead.currentMileageKm;
        const batteryHealthSOH = lead.batteryHealthSOH;

        const warrantyMetrics = computeWarrantyMetrics(rawStart, rawExpiry, rawYears, rawDistance, currentMileageKm);

        list.push({
          id: `owner-lead-${lead.id}`,
          customerName: lead.customerName,
          phone: lead.phone,
          idCardNumber: lead.idCardNumber,
          province: lead.province || 'ນະຄອນຫຼວງວຽງຈັນ',
          district: lead.district,
          village: lead.village,
          model: lead.interestedModel || 'AVATR 11',
          plateNumber: lead.plateNumber || '',
          vin: lead.vin || '',
          engineNumber: lead.engineNumber,
          color: lead.color,
          purchaseDate,
          paymentType: lead.paymentType || 'cash',
          currentMileageKm,
          batteryHealthSOH: batteryHealthSOH != null ? Math.round(batteryHealthSOH * 10) / 10 : undefined,
          warrantyStartDate: warrantyMetrics.warrantyStartDate,
          warrantyExpiryDate: warrantyMetrics.warrantyExpiryDate,
          warrantyYears: warrantyMetrics.warrantyYears,
          warrantyDistanceKm: warrantyMetrics.warrantyDistanceKm,
          warrantyStatus: warrantyMetrics.warrantyStatus,
          remainingDays: warrantyMetrics.remainingDays,
          remainingPct: warrantyMetrics.remainingPct,
          remainingText: warrantyMetrics.remainingText,
          remainingDistanceKm: warrantyMetrics.remainingDistanceKm,
          warrantyTerms: lead.warrantyTerms || 'ຮັບປະກັນແບັດເຕີຣີ EV CATL 8 ປີ / 160,000 km',
          afterSalesNotes: lead.afterSalesNotes || lead.notes,
          leadRecord: lead,
          services: matchedServices,
        });
      }
    });

    return list.filter(item => matchesCrmTime(item.purchaseDate));
  }, [bills, leads, services, crmDateFrom, crmDateTo]);

  // Filtered Existing Customers (Car Owners for After-Sales: Strictly 100% Cash/Transfer)
  const filteredExistingCustomers = useMemo(() => {
    return existingCustomers.filter(item => {
      if (!matchesCrmTime(item.purchaseDate)) return false;
      if (crmSearch.trim() && !matchesSearch(crmSearch, {
        texts: [item.customerName, item.vin, item.idCardNumber, item.plateNumber, item.engineNumber, item.model, item.billRecord?.billNumber, item.leadRecord?.paymentReceiptNo],
        phones: [item.phone],
      })) return false;
      if (existingModelFilter !== 'all' && item.model !== existingModelFilter) return false;
      if (existingServiceFilter === 'has_service' && (item.services?.length ?? 0) === 0) return false;
      if (existingServiceFilter === 'no_service' && (item.services?.length ?? 0) > 0) return false;

      return true;
    });
  }, [existingCustomers, existingModelFilter, existingServiceFilter, crmDateFrom, crmDateTo, crmSearch]);

  // Dedicated Installment Customers (For Tab 3 - All Installment & Financing Customers)
  const installmentCustomers = useMemo(() => {
    const matchedLeads = leads.filter(l => isActiveInstallmentLead(l) && matchesCrmTime(l.paymentDate || l.createdAt) && leadMatchesSearch(l));

    // Installment bills with no CRM customer at all (bill-only contracts)
    const extraBills = bills.filter(b => b.status !== 'voided' && isInstallmentBill(b) && matchesCrmTime(b.date) && billMatchesSearch(b) && !leads.some(l => billBelongsTo(b, l)));

    return [...matchedLeads, ...extraBills];
  }, [leads, bills, crmDateFrom, crmDateTo, crmSearch]);

  // Filtered Leads (For prospective Leads CRM - Strictly customers who have not yet purchased)
  const filteredLeads = useMemo(() => {
    return prospectiveLeads.filter(lead => {
      if (!matchesCrmTime(lead.createdAt || lead.paymentDate)) return false;
      if (!leadMatchesSearch(lead)) return false;

      // 1. Channel Filter (ໝວດຊ່ອງທາງລູກຄ້າ)
      if (channelFilter !== 'all' && lead.category !== channelFilter) return false;

      // 2. Status Filter (ສະຖານະລູກຄ້າ)
      if (selectedStatus !== 'all' && lead.status !== selectedStatus) return false;
      // Lost / cancelled leads are hidden unless explicitly filtered
      if (selectedStatus === 'all' && lead.status === 'lost') return false;

      // 3. Follow-up reminder filter
      if (followUpFilter !== 'all' && getFollowUpState(lead) !== followUpFilter) return false;

      return true;
    });
  }, [prospectiveLeads, channelFilter, selectedStatus, followUpFilter, crmDateFrom, crmDateTo, crmSearch]);

  // Pagination for high scalability & Surface Pro friendly RAM usage
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [channelFilter, selectedStatus, followUpFilter, crmDateFrom, crmDateTo, crmSearch]);

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, currentPage]);

  // Export Customer CRM to CSV File (ນຳອອກ)
  const handleExportCSV = () => {
    const csvCell = (val: unknown): string => {
      const str = String(val ?? '').replace(/\r?\n/g, ' ');
      return `"${str.replace(/"/g, '""')}"`;
    };

    if (customerClassificationTab === 'existing_customers') {
      const eHeaders = [
        'Customer Name', 'Phone', 'ID Card / Passport', 'Province', 'Model', 'Plate Number', 'VIN',
        'Purchase Date', 'Payment Type', 'Mileage (km)', 'Battery SOH (%)', 'Warranty Expiry', 'Warranty Status', 'Service Count', 'Notes'
      ];
      const eRows = filteredExistingCustomers.map(item => [
        csvCell(item.customerName), csvCell(item.phone), csvCell(item.idCardNumber), csvCell(item.province),
        csvCell(item.model), csvCell(item.plateNumber), csvCell(item.vin), csvCell(item.purchaseDate),
        csvCell(item.paymentType), item.currentMileageKm ?? '', item.batteryHealthSOH ?? '',
        csvCell(item.warrantyExpiryDate), csvCell(item.warrantyStatus), item.services?.length ?? 0, csvCell(item.afterSalesNotes)
      ]);
      const eContent = '\uFEFF' + [eHeaders.join(','), ...eRows.map(r => r.join(','))].join('\n');
      const blob = new Blob([eContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `avatr_crm_existing_owners_${formatLocalYMD(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const exportTargetLeads = customerClassificationTab === 'installment_customers'
      ? leads.filter(l => {
        const isInst = l.paymentType === 'installment' || l.paymentType === 'finance' || Boolean(l.downPaymentPercent) ||
          Boolean(l.financeCompany) || Boolean(l.installmentRecords && l.installmentRecords.length > 0) ||
          l.installmentStatus === 'active_repaying' || l.installmentStatus === 'completed' ||
          l.installmentStatus === 'approved' || l.installmentStatus === 'pending_approval';
        return isInst && matchesCrmTime(l.paymentDate || l.createdAt);
      })
      : filteredLeads;
    const headers = [
      'Customer ID',
      'Customer Name',
      'Phone',
      'ID Card / Passport',
      'Province',
      'District',
      'Village',
      'Category',
      'Interested Model',
      'Payment Type',
      'Down Payment %',
      'Down Payment USD',
      'Tenure Months',
      'Credit Status',
      'CRM Status',
      'Priority',
      'Assigned Officer',
      'Created Date',
      'Notes'
    ];

    const rows = exportTargetLeads.map(lead => [
      lead.id,
      `"${(lead.customerName || '').replace(/"/g, '""')}"`,
      `"${lead.phone || ''}"`,
      `"${lead.idCardNumber || ''}"`,
      `"${lead.province || ''}"`,
      `"${lead.district || ''}"`,
      `"${lead.village || ''}"`,
      lead.category || '',
      `"${lead.interestedModel || ''}"`,
      lead.paymentType || 'cash',
      lead.downPaymentPercent || '',
      lead.downPaymentUSD || '',
      lead.tenureMonths || '',
      lead.installmentStatus || '',
      lead.status || '',
      lead.priority || '',
      `"${lead.assignedTo || ''}"`,
      lead.createdAt || '',
      `"${(lead.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `avatr_crm_${customerClassificationTab}_${formatLocalYMD(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Customer search panel: free text + date (day / month / year).
  const renderDateSearch = () => {
    const now = new Date();
    const thisYear = String(now.getFullYear());
    const thisMonth = String(now.getMonth() + 1).padStart(2, '0');
    const inputCls = 'crm-date-input min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 transition-colors placeholder:font-normal placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500';
    const dateLabels = lang === 'lo'
      ? ['ວັນ', 'ເດືອນ', 'ປີ']
      : lang === 'th'
        ? ['วัน', 'เดือน', 'ปี']
        : ['Day', 'Month', 'Year'];
    const anyLabels = lang === 'lo'
      ? ['ທຸກວັນ', 'ທຸກເດືອນ', 'ທຸກປີ']
      : lang === 'th'
        ? ['ทุกวัน', 'ทุกเดือน', 'ทุกปี']
        : ['Any day', 'Any month', 'Any year'];
    const invalidDayMessage = lang === 'lo'
      ? `ກະລຸນາໃສ່ວັນທີ 1-${daysInSelectedMonth}`
      : lang === 'th'
        ? `กรุณากรอกวันที่ 1-${daysInSelectedMonth}`
        : `Enter a day from 1 to ${daysInSelectedMonth}`;
    const invalidMonthMessage = lang === 'lo'
      ? 'ກະລຸນາໃສ່ເດືອນ 1-12'
      : lang === 'th'
        ? 'กรุณากรอกเดือน 1-12'
        : 'Enter a month from 1 to 12';
    const invalidYearMessage = lang === 'lo'
      ? 'ກະລຸນາໃສ່ປີ 4 ຕົວເລກ'
      : lang === 'th'
        ? 'กรุณากรอกปี 4 หลัก'
        : 'Enter a 4-digit year';
    return (
      <div className="crm-date-search space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5" role="search" aria-label={lang === 'lo' ? 'ຄົ້ນຫາລູກຄ້າຕາມວັນທີ' : lang === 'th' ? 'ค้นหาลูกค้าตามวันที่' : 'Find customers by date'}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-zinc-200">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Calendar className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{lang === 'lo' ? 'ຄົ້ນຫາລູກຄ້າ' : lang === 'th' ? 'ค้นหาลูกค้า' : 'Find customers'}</span>
          </span>
          {isDateSearchActive && (
            <button type="button" onClick={clearDateSearch}
              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white">
              <X className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'lo' ? 'ລ້າງວັນທີ' : lang === 'th' ? 'ล้างวันที่' : 'Clear date'}</span>
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={crmSearch}
            onChange={(e) => setCrmSearch(e.target.value)}
            aria-label={lang === 'lo' ? 'ຄົ້ນຫາລູກຄ້າ' : lang === 'th' ? 'ค้นหาลูกค้า' : 'Search customers'}
            placeholder={lang === 'lo' ? 'ຄົ້ນຫາ: ຊື່, ເບີໂທ, VIN, ເລກບັດ, ປ້າຍທະບຽນ...' : lang === 'th' ? 'ค้นหา: ชื่อ, เบอร์โทร, VIN, เลขบัตร, ทะเบียน...' : 'Search: name, phone, VIN, ID card, plate...'}
            className={`${inputCls} pl-9 pr-9`}
          />
          {crmSearch && (
            <button type="button" onClick={() => setCrmSearch('')} aria-label={lang === 'lo' ? 'ລ້າງຄຳຄົ້ນຫາ' : 'Clear search'}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
          <label className="block min-w-0 space-y-1">
            <span className="block text-xs font-medium text-slate-600 dark:text-zinc-400">{dateLabels[0]}</span>
            <input aria-label={dateLabels[0]} inputMode="numeric" autoComplete="off" maxLength={2}
              placeholder={anyLabels[0]} value={crmDay} className={`${inputCls}${crmDay && !crmDayIsValid ? ' border-rose-500 dark:border-rose-500' : ''}`}
              aria-invalid={Boolean(crmDay) && !crmDayIsValid}
              aria-describedby={crmDay && !crmDayIsValid ? 'crm-date-day-error' : undefined}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '').slice(0, 2);
                setCrmDay(d);
                if (d && !crmMonth) setCrmMonth(thisMonth);
                if (d && !crmYear) setCrmYear(thisYear);
              }} />
            {crmDay && !crmDayIsValid && <span id="crm-date-day-error" className="block text-xs text-rose-700 dark:text-rose-400">{invalidDayMessage}</span>}
          </label>
          <label className="block min-w-0 space-y-1">
            <span className="block text-xs font-medium text-slate-600 dark:text-zinc-400">{dateLabels[1]}</span>
            <input aria-label={dateLabels[1]} inputMode="numeric" autoComplete="off" maxLength={2}
              placeholder={anyLabels[1]} value={crmMonth} className={`${inputCls}${crmMonth && !crmMonthIsValid ? ' border-rose-500 dark:border-rose-500' : ''}`}
              aria-invalid={Boolean(crmMonth) && !crmMonthIsValid}
              aria-describedby={crmMonth && !crmMonthIsValid ? 'crm-date-month-error' : undefined}
              onChange={(e) => {
                const m = e.target.value.replace(/\D/g, '').slice(0, 2);
                setCrmMonth(m);
                if (m && !crmYear) setCrmYear(thisYear);
                if (!m) setCrmDay('');
              }} />
            {crmMonth && !crmMonthIsValid && <span id="crm-date-month-error" className="block text-xs text-rose-700 dark:text-rose-400">{invalidMonthMessage}</span>}
          </label>
          <label className="block min-w-0 space-y-1">
            <span className="block text-xs font-medium text-slate-600 dark:text-zinc-400">{dateLabels[2]}</span>
            <input aria-label={dateLabels[2]} inputMode="numeric" autoComplete="off" maxLength={4}
              placeholder={anyLabels[2]} value={crmYear} className={`${inputCls}${crmYear && !crmYearIsValid ? ' border-rose-500 dark:border-rose-500' : ''}`}
              aria-invalid={Boolean(crmYear) && !crmYearIsValid}
              aria-describedby={crmYear && !crmYearIsValid ? 'crm-date-year-error' : undefined}
              onChange={(e) => {
                const y = e.target.value.replace(/\D/g, '').slice(0, 4);
                setCrmYear(y);
                if (!y) { setCrmMonth(''); setCrmDay(''); }
              }} />
            {crmYear && !crmYearIsValid && <span id="crm-date-year-error" className="block text-xs text-rose-700 dark:text-rose-400">{invalidYearMessage}</span>}
          </label>
        </div>
        {isDateSearchActive && !crmDateIsValid && (
          <span role="status" className="block text-xs font-medium text-amber-700 dark:text-amber-400">
            {lang === 'lo' ? 'ຍັງບໍ່ໄດ້ກອງຕາມວັນທີ: ກະລຸນາໃສ່ວັນທີໃຫ້ຖືກຕ້ອງກ່ອນ (ລາຍການຂ້າງລຸ່ມແມ່ນທັງໝົດ)' : 'Date filter not applied yet: complete the date first (showing all)'}
          </span>
        )}
        {isLoadingRangeLeads && (
          <span role="status" aria-live="polite" className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
            {lang === 'lo' ? 'ກຳລັງໂຫຼດລາຍຊື່...' : lang === 'th' ? 'กำลังโหลดรายการ...' : 'Loading customers...'}
          </span>
        )}
      </div>
    );
  };

  const hasActiveLeadFilters = isDateSearchActive || crmSearch.trim() !== '' ||
    channelFilter !== 'all' ||
    followUpFilter !== 'all' ||
    selectedStatus !== 'all';

  return (
    <div className="mx-auto max-w-screen-2xl space-y-5 pb-12">
      {/* WRAPPER FOR CRM VIEWS - SUPPRESSED DURING PRINT WHEN A CUSTOMER DOCUMENT IS OPEN */}
      {detailLead && (
        <Suspense fallback={
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }>
          <div className={selectedCustomerForDocs ? 'print:hidden hide-on-print-doc' : ''}>
            <CustomerDetailView
              lead={detailLead}
              lang={lang}
              vehicles={vehicles}
              bills={getLeadBills(detailLead)}
              issuedDocs={getCustomerIssuedDocs(detailLead.customerName, detailLead.phone, detailLead.vin, detailLead.id)}
              isPurchased={isLeadPurchased(detailLead) || isLeadInstallment(detailLead)}
              isInstallment={isLeadInstallment(detailLead)}
              staffName={currentUser?.name}
              onBack={() => setDetailLeadId(null)}
              onEdit={onEditLead ? () => onEditLead(detailLead) : undefined}
              onIssueQuote={() => handleIssueQuote(detailLead)}
              onSell={onSelectCustomerForPOS ? () => onSelectCustomerForPOS(detailLead) : undefined}
              onReopen={() => handleUpdateStatus(detailLead.id, 'contacted')}
              onOpenDocuments={(doc) => openDocuments(detailLead, doc)}
              onOpenInstallments={() => setSelectedCustomerForInstallments(detailLead)}
              onRecordBooking={() => setPipelineAction({ mode: 'booking', leadId: detailLead.id })}
              onRecordDelivery={() => setPipelineAction({ mode: 'delivery', leadId: detailLead.id })}
              onSaveContact={handleSaveContactLog}
            />
          </div>
        </Suspense>
      )}
      <div className={`${selectedCustomerForDocs ? "print:hidden hide-on-print-doc space-y-6" : "space-y-6"}${detailLead ? ' hidden' : ''}`}>
        <header className="theme-adaptive-dark-surface rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              {t.customerViewTitle}
            </h1>

            <div className="grid w-full grid-cols-2 gap-2 xl:w-auto xl:flex xl:items-center">
              <div className="officer-indicator col-span-2 flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs xl:col-span-1">
                <span className="officer-indicator-avatar grid h-8 w-8 shrink-0 place-items-center rounded-lg border">
                  <UserIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="officer-indicator-label block text-[10px]">{t.assignedOfficer || 'ຜູ້ຮັບຜິດຊອບ'}</span>
                  <span className="officer-indicator-name block truncate font-semibold">
                    {currentUser?.name || t.roleAdmin || 'Admin'}
                  </span>
                </span>
              </div>

              {onSelectCustomerForPOS && (
                <button
                  type="button"
                  onClick={() => onSelectCustomerForPOS()}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-600 px-3 text-xs font-bold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  title="ເປີດໜ້າຈໍ POS ຂາຍລົດຍົນ"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>{lang === 'lo' ? 'ຂາຍ POS' : lang === 'th' ? 'ขาย POS' : 'POS Sales'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                title="ສົ່ງອອກຂໍ້ມູນເປັນ CSV"
              >
                <Download className="h-4 w-4" />
                <span>{lang === 'lo' ? 'ສົ່ງອອກ CSV' : lang === 'th' ? 'ส่งออก CSV' : 'Export CSV'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                title="ພິມລາຍງານລູກຄ້າ"
              >
                <Printer className="h-4 w-4" />
                <span>{lang === 'lo' ? 'ພິມ' : lang === 'th' ? 'พิมพ์' : 'Print'}</span>
              </button>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label={lang === 'lo' ? 'ປະເພດລູກຄ້າ' : 'Customer categories'} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {/* Tab 1: ລູກຄ້າໃໝ່ (Leads) */}
            <button
              type="button"
              aria-pressed={customerClassificationTab === 'new_leads'}
              onClick={() => setCustomerClassificationTab('new_leads')}
              className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:text-sm ${customerClassificationTab === 'new_leads'
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'
                }`}
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">ລູກຄ້າໃໝ່</span>
              <span className={`min-w-7 rounded-full px-2 py-0.5 text-center text-[11px] font-bold tabular-nums ${customerClassificationTab === 'new_leads' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-zinc-950' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                {prospectiveLeads.length}
              </span>
            </button>

            {/* Tab 2: ລູກຄ້າຊື້ສົດ/ໂອນ 100% */}
            <button
              type="button"
              aria-pressed={customerClassificationTab === 'existing_customers'}
              onClick={() => setCustomerClassificationTab('existing_customers')}
              className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:text-sm ${customerClassificationTab === 'existing_customers'
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'
                }`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">ລູກຄ້າຊຳລະຄົບແລ້ວ</span>
              <span className={`min-w-7 rounded-full px-2 py-0.5 text-center text-[11px] font-bold tabular-nums ${customerClassificationTab === 'existing_customers' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-zinc-950' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                {existingCustomers.length}
              </span>
            </button>

            {/* Tab 3: ລູກຄ້າຜ່ອນຊຳລະ */}
            <button
              type="button"
              aria-pressed={customerClassificationTab === 'installment_customers'}
              onClick={() => setCustomerClassificationTab('installment_customers')}
              className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:text-sm ${customerClassificationTab === 'installment_customers'
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'
                }`}
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">ລູກຄ້າຜ່ອນຊຳລະ</span>
              <span className={`min-w-7 rounded-full px-2 py-0.5 text-center text-[11px] font-bold tabular-nums ${customerClassificationTab === 'installment_customers' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-zinc-950' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                {installmentCustomers.length}
              </span>
            </button>
          </div>

          {/* Tab-Specific Primary Action Button */}
          <div className="w-full lg:w-auto">
            {customerClassificationTab === 'new_leads' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setShowBookingImport(true)}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-zinc-100 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:w-auto"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{lang === 'en' ? 'Import CSV' : lang === 'th' ? 'นำเข้า CSV' : 'ນຳເຂົ້າ CSV'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenNewLead}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>ເພີ່ມລູກຄ້າ</span>
                </button>
              </div>
            )}
            {showBookingImport && currentUser && (
              <ErrorBoundary>
                <Suspense
                  fallback={
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs text-white text-sm font-medium">
                      ກຳລັງໂຫຼດ...
                    </div>
                  }
                >
                  <ImportBookingCsvModal
                    vehicles={vehicles}
                    leads={leads}
                    bills={bills}
                    currentUserId={currentUser.id}
                    lang={lang}
                    onClose={() => setShowBookingImport(false)}
                    onImported={(imported) => {
                      const ids = new Set(imported.map(l => l.id));
                      setLeads(prev => [...imported, ...prev.filter(p => !ids.has(p.id))]);
                      showToast(lang === 'en' ? `Imported ${imported.length} customers` : `ນຳເຂົ້າລູກຄ້າ ${imported.length} ລາຍ ສຳເລັດ`, 'success');
                    }}
                  />
                </Suspense>
              </ErrorBoundary>
            )}

            {customerClassificationTab === 'installment_customers' && (
              <div className="flex items-center gap-2">
                {onNavigateMenu && (
                  <button
                    type="button"
                    onClick={() => onNavigateMenu('installment_dashboard')}
                    className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:w-auto"
                    title="ເປີດໜ້າຈໍ Dashboard ຜ່ອນຊຳລະ"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Dashboard ຜ່ອນຊຳລະ</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {customerClassificationTab === 'new_leads' ? (
          <>
            {/* Main Full-Width Leads Workspace */}
            <div className="w-full space-y-4">

              {/* UNIFIED FILTER, SEARCH & VIEW MODE CONTROL PANEL */}
              <div className="theme-adaptive-dark-surface rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-4">
                <div className="space-y-3">
                  <div className="border-b border-slate-200 pb-3 dark:border-zinc-800">
                    {renderDateSearch()}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(13rem,1.1fr)_auto_minmax(18rem,1.7fr)_minmax(17rem,1.5fr)] xl:items-end">
                    <div className="min-w-0 space-y-1.5">
                      <label htmlFor="lead-status-filter" className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        {lang === 'lo' ? 'ສະຖານະ' : lang === 'th' ? 'สถานะ' : 'Status'}
                      </label>
                      <select
                        id="lead-status-filter"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        aria-label={lang === 'lo' ? 'ກັ່ນຕອງຕາມສະຖານະ' : 'Filter by status'}
                        className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                      >
                        <option value="all">{t.statusAll} ({statusCounts.all})</option>
                        <option value="new">{t.statusNew} ({statusCounts.new})</option>
                        <option value="contacted">{t.statusContacted} ({statusCounts.contacted})</option>
                        <option value="test_drive">{t.statusTestDrive} ({statusCounts.test_drive})</option>
                        <option value="negotiation">{t.statusNegotiation} ({statusCounts.negotiation})</option>
                        <option value="lost">{t.statusLost} ({statusCounts.lost})</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        {lang === 'lo' ? 'ມຸມມອງ' : lang === 'th' ? 'มุมมอง' : 'View'}
                      </span>
                      <div role="group" aria-label={lang === 'lo' ? 'ຮູບແບບລາຍການ' : 'List view'} className="flex h-11 w-fit items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
                        <button
                          type="button"
                          aria-pressed={viewMode === 'cards'}
                          onClick={() => setViewMode('cards')}
                          className={`flex min-h-9 items-center justify-center gap-1 rounded-lg px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${viewMode === 'cards'
                            ? 'bg-white font-bold text-black shadow-sm dark:bg-zinc-700 dark:text-white'
                            : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                            }`}
                          title="ມຸມມອງບັດ"
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                          <span className="text-xs">ບັດ</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={viewMode === 'table'}
                          onClick={() => setViewMode('table')}
                          className={`flex min-h-9 items-center justify-center gap-1 rounded-lg px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${viewMode === 'table'
                            ? 'bg-white font-bold text-black shadow-sm dark:bg-zinc-700 dark:text-white'
                            : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                            }`}
                          title="ມຸມມອງຕາຕະລາງ"
                        >
                          <List className="h-3.5 w-3.5" />
                          <span className="text-xs">ຕາຕະລາງ</span>
                        </button>
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <span className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400">ຊ່ອງທາງ</span>
                      <div role="group" aria-label={lang === 'lo' ? 'ກັ່ນຕອງຊ່ອງທາງ' : 'Filter by channel'} className="flex min-h-11 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
                        {[
                          { key: 'all' as const, label: 'ທັງໝົດ', count: channelCounts.all },
                          { key: 'walk_in' as const, label: 'Walk-in', count: channelCounts.walk_in },
                          { key: 'online' as const, label: 'Online', count: channelCounts.online },
                          { key: 'event' as const, label: 'Event', count: channelCounts.event },
                        ].map((tab) => {
                          const isSelected = channelFilter === tab.key;
                          return (
                            <button
                              key={tab.key}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => setChannelFilter(tab.key)}
                              className={`flex min-h-9 items-center justify-center gap-1 rounded-lg px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${isSelected
                                ? 'bg-zinc-800 font-semibold text-white dark:bg-zinc-700'
                                : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
                                }`}
                            >
                              <span>{tab.label}</span>
                              <span className={`min-w-5 rounded-full px-1 text-center text-[10px] tabular-nums ${isSelected ? 'bg-white/15 text-white' : 'text-slate-500 dark:text-zinc-500'}`}>
                                {tab.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {lang === 'lo' ? 'ການຕິດຕາມ' : lang === 'th' ? 'ติดตาม' : 'Follow-up'}
                      </span>
                      <div role="group" aria-label={lang === 'lo' ? 'ກັ່ນຕອງການຕິດຕາມ' : 'Filter by follow-up'} className="flex min-h-11 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
                        {([
                          { key: 'today' as const, label: 'ຕ້ອງຕິດຕາມມື້ນີ້', count: followUpCounts.today, tone: 'bg-amber-400 text-black' },
                          { key: 'overdue' as const, label: 'ເລີຍກຳນົດ', count: followUpCounts.overdue, tone: 'bg-rose-600 text-white' },
                        ]).map((tab) => {
                          const isSelected = followUpFilter === tab.key;
                          return (
                            <button
                              key={tab.key}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => setFollowUpFilter(isSelected ? 'all' : tab.key)}
                              className={`flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${isSelected
                                ? 'bg-zinc-800 font-semibold text-white dark:bg-zinc-700'
                                : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
                                }`}
                            >
                              <span>{tab.label}</span>
                              <span className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${tab.count > 0 ? tab.tone : (isSelected ? 'bg-zinc-300 text-black' : 'text-zinc-500')}`}>
                                {tab.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {hasActiveLeadFilters && (
                    <div className="flex justify-end border-t border-slate-200 pt-2 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => {
                          setChannelFilter('all');
                          setFollowUpFilter('all');
                          setSelectedStatus('all');
                          clearDateSearch();
                          setCrmSearch('');
                        }}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{lang === 'lo' ? 'ລ້າງຕົວກອງ' : 'Clear filters'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* LIST HEADER & COUNT */}
              <div className="flex items-center justify-between px-1 text-xs">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'lo' ? 'ລາຍຊື່ລູກຄ້າທີ່ກຳລັງຕິດຕາມ (Leads)' : 'Prospective Leads'}
                  </h2>
                </div>
              </div>

              {/* CUSTOMER LIST: EMPTY STATE */}
              {filteredLeads.length === 0 ? (
                <div className="theme-adaptive-dark-surface space-y-3 rounded-2xl border border-slate-200 bg-white p-7 text-center text-slate-500 dark:border-zinc-800 dark:bg-zinc-950 sm:p-10">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{t.noCustomersFound}</p>
                  <p className="mx-auto max-w-sm text-xs text-slate-500 dark:text-zinc-400">
                    {hasActiveLeadFilters
                      ? 'ລອງປ່ຽນວັນທີ ຫຼື ລ້າງຕົວກອງ'
                      : 'ເພີ່ມລູກຄ້າເພື່ອເລີ່ມຕິດຕາມ'}
                  </p>
                  {!hasActiveLeadFilters && (
                    <button
                      type="button"
                      onClick={onOpenNewLead}
                      className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{lang === 'lo' ? 'ເພີ່ມລູກຄ້າ' : 'Add customer'}</span>
                    </button>
                  )}
                  {hasActiveLeadFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setChannelFilter('all');
                        setFollowUpFilter('all');
                        setSelectedStatus('all');
                        clearDateSearch();
                        setCrmSearch('');
                      }}
                      className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" />
                      <span>{lang === 'lo' ? 'ລ້າງຕົວກອງທັງໝົດ' : lang === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Reset all filters'}</span>
                    </button>
                  )}
                </div>
              ) : viewMode === 'table' ? (
                /* VIEW MODE 1: MODERN STRUCTURED TABLE VIEW */
                <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 font-mono uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-3.5">ລູກຄ້າ & ຕົວຕົນ</th>
                        <th className="py-3 px-3.5">ຕິດຕໍ່ & ທີ່ຢູ່</th>
                        <th className="py-3 px-3.5">ລຸ້ນລົດທີ່ສົນໃຈ</th>
                        <th className="py-3 px-3.5">ຊ່ອງທາງ (Channel)</th>
                        <th className="py-3 px-3.5">ສະຖານະ CRM</th>
                        <th className="py-3 px-3.5">ຜູ້ຮັບຜິດຊອບ</th>
                        <th className="py-3 px-3.5 text-right">ຈັດການ & ເອກະສານ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {paginatedLeads.map((lead) => {
                        return (
                          <tr
                            key={lead.id}
                            className="transition-colors hover:bg-zinc-900/60"
                          >
                            {/* Customer & Identity */}
                            <td className="py-3 px-3.5 align-top">
                              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-zinc-900/50 hover:border-slate-300 dark:hover:border-zinc-700/80 transition-all shadow-xs min-w-42.5 max-w-55">
                                {/* Customer Name & VIP Badge */}
                                <div className="flex items-center justify-between gap-1.5">
                                  <button type="button" onClick={() => openCustomerDetail(lead)} className="text-xs font-bold text-slate-900 dark:text-white truncate block text-left hover:underline cursor-pointer" title={lead.customerName}>
                                    {lead.customerName}
                                  </button>
                                  {lead.priority === 'vip' && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-400 text-black rounded-md font-extrabold shrink-0 shadow-xs">
                                      VIP
                                    </span>
                                  )}
                                </div>

                                {/* ID Card Number Badge */}
                                {lead.idCardNumber && (
                                  <div className="flex items-center gap-1 text-[10px] font-mono bg-white dark:bg-zinc-950/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-800/70 w-fit">
                                    <span className="text-slate-400 dark:text-zinc-500">ບັດ:</span>
                                    <span className="text-slate-700 dark:text-zinc-300 font-semibold">{lead.idCardNumber}</span>
                                  </div>
                                )}

                                {/* Category & Created Date */}
                                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/80 dark:border-zinc-800/50 text-[9.5px] font-mono">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 font-medium">
                                    {lead.category === 'walk_in' ? 'Walk-in' : lead.category === 'online' ? 'Online' : 'Event'}
                                  </span>
                                  {lead.createdAt && (
                                    <span className="text-slate-400 dark:text-zinc-500">
                                      {lead.createdAt.slice(0, 10)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Contact & Location & Notes */}
                            <td className="py-3 px-3.5 align-top">
                              <div className="space-y-1 font-mono">
                                <button
                                  type="button"
                                  onClick={() => openWhatsApp(lead.phone, lead.customerName, lead.interestedModel, lang)}
                                  className="text-white hover:text-emerald-400 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                                >
                                  <span>{lead.phone}</span>
                                  <WhatsAppIcon className="w-3 h-3 text-emerald-400" />
                                </button>
                                <span className="text-[10px] text-zinc-300 font-sans block leading-tight max-w-50" title={[lead.village, lead.district, lead.province].filter(Boolean).join(', ')}>
                                  {[lead.village, lead.district, lead.province].filter(Boolean).join(', ') || '-'}
                                </span>
                                {lead.notes && (
                                  <span className="text-[10px] text-amber-800 dark:text-amber-300 font-sans block italic truncate max-w-50" title={lead.notes}>
                                    "{lead.notes}"
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Interested Model */}
                            <td className="py-3 px-3.5 align-top">
                              <div className="flex items-center gap-1.5 text-zinc-200 font-bold">
                                <Car className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>{lead.interestedModel || 'AVATR'}</span>
                              </div>
                            </td>

                            {/* Channel & Source */}
                            <td className="py-3 px-3.5 align-top">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-full inline-block">
                                  {lead.category === 'walk_in' ? 'Walk-in (ໜ້າໂຊຣູມ)' : lead.category === 'online' ? 'Online (ສື່ສັງຄົມ)' : 'Event (ງານວາງສະແດງ)'}
                                </span>
                                {lead.source && (
                                  <span className="text-[10px] text-zinc-500 block">
                                    {lead.source}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status Dropdown */}
                            <td className="py-3 px-3.5 align-top">
                              <select
                                value={lead.status}
                                onChange={(e) => handleUpdateStatus(lead.id, e.target.value as LeadStatus)}
                                className="text-[11px] rounded-lg px-2 py-1 font-semibold focus:outline-none cursor-pointer bg-zinc-900 border border-zinc-700 text-zinc-300"
                              >
                                <option value="new">{t.statusNew}</option>
                                <option value="contacted">{t.statusContacted}</option>
                                <option value="test_drive">{t.statusTestDrive}</option>
                                <option value="negotiation">{t.statusNegotiation}</option>
                                <option value="lost">{t.statusLost}</option>
                              </select>
                            </td>

                            {/* Staff */}
                            <td className="py-3 px-3.5 align-top">
                              <span className="text-[11px] text-zinc-300 font-medium">
                                {lead.assignedTo || currentUser?.name || 'Admin'}
                              </span>
                            </td>

                            {/* Table Actions */}
                            <td className="py-3 px-3.5 align-top text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Next step (pipeline) */}
                                {renderNextStep(lead, 'sm')}


                                {/* Customer Documents Suite & Audit History Button */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedCustomerForDocs(lead)}
                                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                                  title="ເບິ່ງ/ອອກເອກະສານລູກຄ້າ (ໃບຮັບເງິນ, ໃບສັນຍາ, ໃບມອບສິດ)"
                                >
                                  <FileText className="w-3 h-3 text-amber-400" />
                                  <span>ເອກະສານ</span>
                                  {(() => {
                                    const count = getCustomerIssuedDocsCount(lead.customerName, lead.phone, lead.vin, lead.id);
                                    return count > 0 ? (
                                      <span className="ml-0.5 px-1 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                        {count}
                                      </span>
                                    ) : null;
                                  })()}
                                </button>

                                {/* WhatsApp link */}
                                <a
                                  href={getWhatsAppUrl(lead.phone, lead.customerName, lead.interestedModel, lang)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 bg-emerald-950/60 text-emerald-400 hover:text-white hover:bg-emerald-700 rounded-lg border border-emerald-800/40 transition-colors"
                                  title="ສົນທະນາ WhatsApp"
                                >
                                  <WhatsAppIcon className="w-3 h-3" />
                                </a>

                                {/* Contact log / follow-up */}
                                {(() => {
                              const fu = getFollowUpState(lead);
                              const tone = fu === 'overdue'
                                ? 'bg-rose-950/50 border-rose-800 text-rose-300 hover:bg-rose-900/60'
                                : fu === 'today'
                                  ? 'bg-amber-950/40 border-amber-700 text-amber-300 hover:bg-amber-900/50'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600';
                              return (
                                <button
                                  type="button"
                                  onClick={() => setContactLead(lead)}
                                  className={`p-1 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 font-semibold ${tone}`}
                                  title={lead.nextFollowUpAt ? `ນັດຕິດຕາມ: ${formatDateKey(lead.nextFollowUpAt)}` : 'ບັນທຶກການຕິດຕໍ່ / ນັດຕິດຕາມ'}
                                  aria-label="Contact Log"
                                >
                                  <CalendarClock className="w-3.5 h-3.5" />
                                  {lead.nextFollowUpAt && <span className="text-[10px] font-mono">{formatDateKey(lead.nextFollowUpAt).slice(0, 5)}</span>}
                                </button>
                              );
                            })()}

                                {/* Edit Button */}
                                {onEditLead && (
                                  <button
                                    type="button"
                                    onClick={() => onEditLead(lead)}
                                    className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                    title="ແກ້ໄຂຂໍ້ມູນລູກຄ້າ"
                                    aria-label="Edit Lead"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}

                                {/* Delete Button (admin only) */}
                                {isAdminUser && (
                                  <button
                                    type="button"
                                    onClick={() => setLeadToDelete(lead)}
                                    className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="ລົບລູກຄ້າ"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* VIEW MODE 2: MODERN HIGH-AESTHETIC BENTO STREAMLINE CARD VIEW */
                <div className="space-y-4">
                  {paginatedLeads.map((lead) => {
                    return (
                      <div
                        key={lead.id}
                        className="theme-adaptive-dark-surface rounded-2xl border p-4 sm:p-5 space-y-4 transition-all shadow-sm bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                      >
                        {/* 1. Header: Customer Identity, Contact Badges, Status Switcher & Delete */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            {/* Customer Initials Avatar */}
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-white border-slate-300 dark:border-zinc-700 shadow-xs">
                              {lead.customerName ? lead.customerName.slice(0, 2).toUpperCase() : 'CU'}
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                  <button type="button" onClick={() => openCustomerDetail(lead)} className="text-left hover:underline underline-offset-2 cursor-pointer" title="ເປີດລາຍລະອຽດລູກຄ້າ">
                                    {lead.customerName}
                                  </button>
                                </h3>

                                {/* VIP Priority Badge */}
                                {lead.priority === 'vip' && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-400 text-black rounded-full font-bold flex items-center gap-1 shadow-sm">
                                    <Star className="w-2.5 h-2.5 fill-black text-black" />
                                    <span>VIP</span>
                                  </span>
                                )}

                                {/* Acquisition Channel Badge */}
                                <span className="text-[10px] font-mono px-2.5 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-full flex items-center gap-1">
                                  {lead.category === 'walk_in' ? <Store className="w-2.5 h-2.5 text-emerald-400" /> : lead.category === 'online' ? <Globe className="w-2.5 h-2.5 text-blue-400" /> : <Sparkles className="w-2.5 h-2.5 text-amber-400" />}
                                  <span>{lead.category === 'walk_in' ? 'Walk-in' : lead.category === 'online' ? 'Online' : 'Event'}</span>
                                </span>
                                {lead.category === 'event' && lead.source && (
                                  <span className="text-[10px] font-mono px-2.5 py-0.5 bg-amber-950/60 text-amber-300 border border-amber-800/60 rounded-full flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                    <span>{lead.source}</span>
                                  </span>
                                )}
                              </div>

                              {/* Contact Info, Framed ID Card, and Registration Date */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                                {/* Phone with WhatsApp Link */}
                                <button
                                  type="button"
                                  onClick={() => openWhatsApp(lead.phone, lead.customerName, lead.interestedModel, lang)}
                                  className="font-bold text-slate-900 dark:text-white hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 cursor-pointer shadow-xs"
                                  title="ສົນທະນາ WhatsApp"
                                >
                                  <Phone className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
                                  <span>{lead.phone}</span>
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20 font-bold flex items-center gap-0.5">
                                    <WhatsAppIcon className="w-2.5 h-2.5" />
                                    <span>WA</span>
                                  </span>
                                </button>

                                {/* Framed Vertical ID Card Box */}
                                {lead.idCardNumber && (
                                  <div className="inline-flex flex-col justify-center px-2.5 py-0.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                                    <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-sans leading-tight">ເລກບັດປະຈຳຕົວ:</span>
                                    <span className="font-bold font-mono text-slate-900 dark:text-white text-xs leading-tight">{lead.idCardNumber}</span>
                                  </div>
                                )}

                                {/* Registration Date Badge */}
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 text-[11px] text-slate-500 dark:text-zinc-400 shadow-xs">
                                  <span>ID: {lead.id.slice(0, 8)}</span>
                                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                                  <span>ວັນທີ: {lead.createdAt?.slice(0, 10)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Status Switcher & Delete Action */}
                          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                            <select
                              value={lead.status}
                              onChange={(e) => handleUpdateStatus(lead.id, e.target.value as LeadStatus)}
                              className="bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-zinc-500 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-white/20 font-semibold cursor-pointer transition-colors shadow-sm"
                            >
                              <option value="new">{t.statusNew}</option>
                              <option value="contacted">{t.statusContacted}</option>
                              <option value="test_drive">{t.statusTestDrive}</option>
                              <option value="negotiation">{t.statusNegotiation}</option>
                              <option value="lost">{t.statusLost}</option>
                            </select>

                            {(() => {
                              const fu = getFollowUpState(lead);
                              const tone = fu === 'overdue'
                                ? 'bg-rose-950/50 border-rose-800 text-rose-300 hover:bg-rose-900/60'
                                : fu === 'today'
                                  ? 'bg-amber-950/40 border-amber-700 text-amber-300 hover:bg-amber-900/50'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600';
                              return (
                                <button
                                  type="button"
                                  onClick={() => setContactLead(lead)}
                                  className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 font-semibold ${tone}`}
                                  title={lead.nextFollowUpAt ? `ນັດຕິດຕາມ: ${formatDateKey(lead.nextFollowUpAt)}` : 'ບັນທຶກການຕິດຕໍ່ / ນັດຕິດຕາມ'}
                                  aria-label="Contact Log"
                                >
                                  <CalendarClock className="w-3.5 h-3.5" />
                                  {lead.nextFollowUpAt && <span className="text-[10px] font-mono">{formatDateKey(lead.nextFollowUpAt).slice(0, 5)}</span>}
                                </button>
                              );
                            })()}

                            {onEditLead && (
                              <button
                                type="button"
                                onClick={() => onEditLead(lead)}
                                className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer"
                                title="ແກ້ໄຂຂໍ້ມູນລູກຄ້າ"
                                aria-label="Edit Lead"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isAdminUser && <button
                              type="button"
                              onClick={() => setLeadToDelete(lead)}
                              className="p-2 bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 rounded-xl border border-zinc-800 hover:border-red-800 transition-colors cursor-pointer shrink-0 active:scale-95"
                              title="ລົບລູກຄ້າ"
                              aria-label="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>}
                          </div>
                        </div>

                        {/* 2. Bento Stream Details: Vehicle, Complete Location & Complete Notes (Zero Truncation) */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                          {/* Section A: Interested Vehicle & Dealership Source (4 cols) */}
                          <div className="md:col-span-4 space-y-1.5">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5 text-emerald-400" />
                              <span>ລຸ້ນລົດທີ່ສົນໃຈ</span>
                            </span>
                            <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80 space-y-1">
                              <div className="font-bold text-sm text-white flex items-center gap-1.5">
                                <span>{lead.interestedModel || 'AVATR'}</span>
                              </div>
                              <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-0.5">
                                <span>ແຫຼ່ງທີ່ມາ:</span>
                                <span className="text-zinc-200 font-medium">{lead.source || (lead.category === 'walk_in' ? 'ມາຊົມລົດຕົວຈິງ' : 'ສື່ສັງຄົມອອນລາຍ')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Section B: Complete Customer Address & Staff (4 cols) */}
                          <div className="md:col-span-4 space-y-1.5">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-blue-400" />
                              <span>ທີ່ຢູ່ລູກຄ້າ (ເຫັນຄົບຖ້ວນ)</span>
                            </span>
                            <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80 space-y-1">
                              <p className="text-zinc-200 font-medium leading-relaxed">
                                {[lead.village, lead.district, lead.province].filter(Boolean).join(', ') || 'ບໍ່ໄດ້ລະບຸທີ່ຢູ່'}
                              </p>
                              <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-0.5">
                                <span>ຜູ້ຮັບຜິດຊອບ:</span>
                                <span className="text-zinc-200 font-semibold bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                                  {lead.assignedTo || currentUser?.name || 'Admin'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Section C: Complete Customer Notes (4 cols) */}
                          <div className="md:col-span-4 space-y-1.5">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-amber-400" />
                              <span>ໝາຍເຫດ & ຄວາມຕ້ອງການ</span>
                            </span>
                            <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80 min-h-16 flex items-center">
                              {lead.notes ? (
                                <p className="text-zinc-200 italic leading-relaxed text-[11px]">
                                  "{lead.notes}"
                                </p>
                              ) : (
                                <p className="text-zinc-500 italic text-[11px]">ບໍ່ມີໝາຍເຫດເພີ່ມເຕີມ</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Sales pipeline stage */}
                        <div className="overflow-x-auto pt-1">{renderPipelineStepper(lead)}</div>

                        {/* 3. Card Bottom Actions Toolbar */}
                        <div className="pt-2.5 border-t border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
                          {/* Left: Quick Direct Contact */}
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl border border-zinc-800 font-medium flex items-center gap-1.5 transition-colors text-xs active:scale-95"
                            >
                              <Phone className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{t.callNow}</span>
                            </a>

                            <a
                              href={getWhatsAppUrl(lead.phone, lead.customerName, lead.interestedModel, lang)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-800 text-emerald-400 hover:text-white rounded-xl border border-emerald-800/50 font-semibold flex items-center gap-1.5 transition-all text-xs cursor-pointer active:scale-95"
                              title={`ເປີດ WhatsApp: ${formatWhatsAppDisplay(lead.phone)}`}
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {/* Customer Documents Suite & Audit History Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerForDocs(lead)}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                              title="ເບິ່ງ/ອອກເອກະສານລູກຄ້າ (ໃບຮັບເງິນ, ໃບສັນຍາ, ໃບມອບສິດ)"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-400" />
                              <span>ເອກະສານ</span>
                              {(() => {
                                const count = getCustomerIssuedDocsCount(lead.customerName, lead.phone, lead.vin, lead.id);
                                return count > 0 ? (
                                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    {count}
                                  </span>
                                ) : null;
                              })()}
                            </button>

                            {renderNextStep(lead, 'md')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredLeads.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-zinc-800 text-xs text-zinc-400 bg-zinc-950">
                  <span>
                    {lang === 'th' ? `แสดง ${((currentPage - 1) * PAGE_SIZE) + 1} - ${Math.min(currentPage * PAGE_SIZE, filteredLeads.length)} จาก ${filteredLeads.length} รายการ`
                      : lang === 'lo' ? `ສະແດງ ${((currentPage - 1) * PAGE_SIZE) + 1} - ${Math.min(currentPage * PAGE_SIZE, filteredLeads.length)} ຈາກ ${filteredLeads.length} ລາຍການ`
                        : `Showing ${((currentPage - 1) * PAGE_SIZE) + 1} - ${Math.min(currentPage * PAGE_SIZE, filteredLeads.length)} of ${filteredLeads.length}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {lang === 'th' ? 'ก่อนหน้า' : lang === 'lo' ? 'ກ່ອນໜ້າ' : 'Previous'}
                    </button>
                    <span className="font-mono text-zinc-300">{currentPage} / {totalPages}</span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {lang === 'th' ? 'ถัดไป' : lang === 'lo' ? 'ຖັດໄປ' : 'Next'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : customerClassificationTab === 'existing_customers' ? (
          /* EXISTING CUSTOMERS & AFTER-SALES MANAGEMENT VIEW (100% PAID) */
          <div className="space-y-6">
            {/* 4 Metric Cards for 100% Cash/Transfer Owners & After-Sales */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                {
                  label: 'ລູກຄ້າຊື້ສົດ/ໂອນ 100%',
                  value: existingCustomers.length,
                  icon: Car,
                  tone: 'text-zinc-100',
                },
                {
                  label: 'ໂອນຜ່ານບັນຊີ / QR',
                  value: existingCustomers.filter(c => c.paymentType === 'transfer' || c.billRecord?.paymentMethod === 'transfer').length,
                  icon: CheckCircle2,
                  tone: 'text-emerald-400',
                },
                {
                  label: 'ຊຳລະເງິນສົດ (Cash)',
                  value: existingCustomers.filter(c => c.paymentType === 'cash' || c.billRecord?.paymentMethod === 'cash').length,
                  icon: Banknote,
                  tone: 'text-amber-400',
                },
                {
                  label: 'ການຮັບປະກັນ EV ແບັດເຕີຣີ',
                  value: '100%',
                  icon: ShieldCheck,
                  tone: 'text-purple-400',
                },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-slate-500 dark:text-zinc-400">{metric.label}</p>
                        <p className="mt-1 text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white">{typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}</p>
                      </div>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-zinc-900 ${metric.tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    {'caption' in metric && Boolean((metric as { caption?: string }).caption) && (
                      <p className="mt-2 text-[10px] text-slate-500 dark:text-zinc-500">{(metric as { caption?: string }).caption}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Filter & Action Toolbar for Existing Customers */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
              <div className="space-y-4">
                {renderDateSearch()}
                <div className="grid gap-3 border-t border-slate-200 pt-4 dark:border-zinc-800 sm:grid-cols-2">
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="existing-customer-model-filter" className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                      ລຸ້ນລົດ
                    </label>
                    <select
                      id="existing-customer-model-filter"
                      value={existingModelFilter}
                      onChange={(e) => setExistingModelFilter(e.target.value)}
                      className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    >
                      <option value="all">ທຸກລຸ້ນ ({existingCustomers.length})</option>
                      {vehicles.map((v) => (
                        <option key={v.id || v.name} value={v.name}>
                          {v.name} ({existingCustomers.filter(c => c.model === v.name).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="existing-customer-service-filter" className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                      ປະຫວັດເຂົ້າສູນ
                    </label>
                    <select
                      id="existing-customer-service-filter"
                      value={existingServiceFilter}
                      onChange={(e) => setExistingServiceFilter(e.target.value as any)}
                      className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    >
                      <option value="all">ທັງໝົດ ({existingCustomers.length})</option>
                      <option value="has_service">ມີປະຫວັດເຂົ້າສູນ ({existingCustomers.filter(c => (c.services?.length ?? 0) > 0).length})</option>
                      <option value="no_service">ຍັງບໍ່ເຄີຍເຂົ້າສູນ ({existingCustomers.filter(c => (c.services?.length ?? 0) === 0).length})</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* List of Existing Customers / Car Owners */}
            {filteredExistingCustomers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 p-12 text-center">
                <Car className="mx-auto w-12 h-12 text-zinc-600 mb-3" />
                <p className="text-sm font-bold text-zinc-300">ບໍ່ພົບຂໍ້ມູນລູກຄ້າເກົ່າທີ່ຕົງກັບເງື່ອນໄຂຄົ້ນຫາ</p>
                <p className="text-xs text-zinc-500 mt-1">ລູກຄ້າທີ່ອອກບິນຂາຍ ຫຼື ສົ່ງມອບລົດແລ້ວ ຈະຖືກບັນທຶກໄວ້ໃນໜ້ານີ້ໂດຍອັດຕະໂນມັດ ເພື່ອໃຫ້ບໍລິການຫຼັງການຂາຍ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {filteredExistingCustomers.map((owner) => {
                  const recentServices = owner.services || [];

                  return (
                    <div
                      key={owner.id}
                      className="group rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-sm space-y-4 hover:border-zinc-700 transition-all"
                    >
                      {/* Header Row: Vehicle Banner & Live Warranty Duration Countdown */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                            <Car className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-white tracking-tight">{owner.model}</h3>
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-zinc-900 border border-zinc-700 text-zinc-200">
                                {owner.plateNumber || (lang === 'lo' ? 'ລໍຖ້າປ້າຍທະບຽນ' : lang === 'th' ? 'รอป้ายทะเบียน' : 'Plate pending')}
                              </span>
                              {owner.color && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-zinc-900/60 border border-zinc-800 text-zinc-400">
                                  ສີ: {owner.color}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400 mt-1">
                              <span>VIN: <strong className="text-zinc-300 font-semibold">{owner.vin || (lang === 'lo' ? 'ຍັງບໍ່ໄດ້ບັນທຶກ' : lang === 'th' ? 'ยังไม่ได้บันทึก' : 'Not recorded')}</strong></span>
                              {owner.engineNumber && (
                                <span>• Motor: <strong className="text-zinc-300 font-semibold">{owner.engineNumber}</strong></span>
                              )}
                              <span className="text-zinc-500">• ມອບລົດ: {owner.purchaseDate}</span>
                            </div>
                          </div>
                        </div>

                        {/* Live Dynamic Warranty Status & Countdown Card */}
                        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 w-full min-w-0 sm:w-auto sm:min-w-[320px] shadow-sm space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-zinc-200">
                              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                              <span className="truncate">{owner.warrantyTerms || 'ການຮັບປະກັນ EV CATL'}</span>
                            </span>

                            {/* Warranty Status Badge */}
                            {owner.warrantyStatus === 'active' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>ຍັງຢູ່ໃນປະກັນ</span>
                              </span>
                            )}
                            {owner.warrantyStatus === 'expiring' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
                                <Clock className="w-3 h-3" />
                                <span>ໃກ້ໝົດປະກັນ</span>
                              </span>
                            )}
                            {owner.warrantyStatus === 'expired' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0">
                                <AlertTriangle className="w-3 h-3" />
                                <span>ໝົດອາຍຸແລ້ວ</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline justify-between text-xs pt-1">
                            <div>
                              <span className="text-[11px] text-zinc-400">ແພັກເກັດ: </span>
                              <span className="font-bold text-white font-mono">{owner.warrantyYears} ປີ / {owner.warrantyDistanceKm?.toLocaleString()} km</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-zinc-400">ໝົດອາຍຸ: </span>
                              <span className="font-bold text-emerald-400 font-mono">{owner.warrantyExpiryDate}</span>
                            </div>
                          </div>

                          {/* Visual Progress Bar of Remaining Time */}
                          <div className="space-y-1 pt-0.5">
                            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${owner.warrantyStatus === 'active' ? 'bg-linear-to-r from-emerald-500 to-teal-400' :
                                  owner.warrantyStatus === 'expiring' ? 'bg-linear-to-r from-amber-500 to-yellow-400' :
                                    'bg-rose-500'
                                  }`}
                                style={{ width: `${owner.remainingPct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                              <span>ເລີ່ມ: {owner.warrantyStartDate}</span>
                              <span className="text-emerald-400 font-bold">{owner.remainingText} ({owner.remainingPct}%)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Middle Section: Customer Details & After-Sales Service History */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Left: Customer Info & Vehicle Telemetry (5 cols) */}
                        <div className="lg:col-span-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/70 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                              <span>ຂໍ້ມູນເຈົ້າຂອງລົດ</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOwnerForAfterSales(owner);
                                  setIsAfterSalesModalOpen(true);
                                }}
                                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                                title="ແກ້ໄຂຂໍ້ມູນເຈົ້າຂອງລົດ & ຫຼັງການຂາຍ"
                              >
                                <span>ແກ້ໄຂ</span>
                              </button>
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>{owner.paymentType === 'installment_completed' ? 'ຜ່ອນຄົບ 100%' : 'ຊຳລະສົດ/ໂອນ 100%'}</span>
                              </span>
                            </div>
                          </div>

                          <div>
                            {owner.leadRecord ? (
                              <button type="button" onClick={() => owner.leadRecord && openCustomerDetail(owner.leadRecord)} className="text-base font-extrabold text-white text-left hover:underline underline-offset-2 cursor-pointer" title="ເປີດລາຍລະອຽດລູກຄ້າ">{owner.customerName}</button>
                            ) : (
                              <p className="text-base font-extrabold text-white">{owner.customerName}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="w-3.5 h-3.5 text-zinc-400" />
                              <a
                                href={`tel:${owner.phone}`}
                                className="text-xs font-mono font-bold text-white hover:underline"
                              >
                                {owner.phone}
                              </a>
                              <button
                                type="button"
                                onClick={() => openWhatsApp(owner.phone, owner.customerName, owner.model, lang)}
                                className="p-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800/60 transition-all cursor-pointer active:scale-95 ml-1"
                                title="ເປີດ WhatsApp"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-800/60 space-y-1.5 text-xs">
                            {(owner.province || owner.district || owner.village) && (
                              <div className="flex items-start gap-1.5 text-zinc-400">
                                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                                <span className="truncate">
                                  {[owner.village, owner.district, owner.province].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            )}

                            {owner.idCardNumber && (
                              <div className="flex items-center gap-1.5 text-zinc-400">
                                <CreditCard className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                <span>ບັດປະຈຳຕົວ: <strong className="font-mono text-zinc-300">{owner.idCardNumber}</strong></span>
                              </div>
                            )}
                          </div>

                          {/* Telemetry & Health Box */}
                          <div className="pt-2 border-t border-zinc-800/60 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">ສະຖານະຕົວລົດປັດຈຸບັນ</span>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 space-y-0.5">
                                <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                  <Gauge className="w-3 h-3 text-zinc-400" />
                                  <span>ເລກໄມປັດຈຸບັນ</span>
                                </span>
                                <span className="font-mono font-bold text-white text-sm block">
                                  {owner.currentMileageKm != null ? `${owner.currentMileageKm.toLocaleString()} km` : (lang === 'lo' ? 'ຍັງບໍ່ໄດ້ບັນທຶກ' : lang === 'th' ? 'ยังไม่ได้บันทึก' : 'Not recorded')}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 space-y-0.5">
                                <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                  <BatteryCharging className="w-3 h-3 text-emerald-400" />
                                  <span>ສຸຂະພາບແບັດ (SOH)</span>
                                </span>
                                <span className="font-mono font-bold text-emerald-400 text-sm block">
                                  {owner.batteryHealthSOH != null ? `${owner.batteryHealthSOH}%` : (lang === 'lo' ? 'ຍັງບໍ່ໄດ້ບັນທຶກ' : lang === 'th' ? 'ยังไม่ได้บันทึก' : 'Not recorded')}
                                </span>
                              </div>
                            </div>

                            {owner.afterSalesNotes && (
                              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/70 text-[11px] text-zinc-400 flex items-start gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <p className="line-clamp-2 italic">{owner.afterSalesNotes}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: After-Sales Service Suite & History (7 cols) */}
                        <div className="lg:col-span-7 rounded-2xl bg-zinc-900/50 border border-zinc-800/70 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Wrench className="w-4 h-4 text-amber-400" />
                              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
                                ປະຫວັດການເຂົ້າສູນ & ບໍລິການຫຼັງການຂາຍ
                              </span>
                            </div>

                            {/* Live Service Visit Count Badge */}
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              ເຂົ້າສູນແລ້ວ {recentServices.length} ຄັ້ງ
                            </span>
                          </div>

                          {recentServices.length > 0 ? (
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                              {recentServices.map((svc) => {
                                const serviceTypeLabels: Record<string, string> = {
                                  periodic_maintenance: 'ບຳລຸງຮັກສາຕາມໄລຍະ (Periodic)',
                                  battery_check: 'ກວດເຊັກສຸຂະພາບແບັດເຕີຣີ (Battery HV)',
                                  software_ota: 'ອັບເດດ Software OTA / HarmonyOS',
                                  brake_suspension: 'ກວດລະບົບເບກ & ຊ່ວງລ່າງ',
                                  body_paint: 'ສ້ອມແປງສີ & ຕົວຖັງ',
                                  emergency_repair: 'ສ້ອມແປງດ່ວນ / Emergency',
                                };

                                return (
                                  <div
                                    key={svc.id}
                                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs hover:border-zinc-700 transition-colors"
                                  >
                                    <div className="min-w-0 space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-white truncate">
                                          {serviceTypeLabels[svc.serviceType] || svc.serviceType}
                                        </span>
                                        {svc.batteryHealthPercent && (
                                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                                            SOH: {svc.batteryHealthPercent}%
                                          </span>
                                        )}
                                        {svc.mileageKm && (
                                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
                                            {svc.mileageKm.toLocaleString()} km
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                                          <span>{svc.scheduledDate} {svc.scheduledTime}</span>
                                        </span>
                                        {svc.technician && <span>• ຊ່າງ: {svc.technician}</span>}
                                      </p>
                                      {svc.notes && (
                                        <p className="text-[10px] text-zinc-500 italic truncate max-w-md">{svc.notes}</p>
                                      )}
                                    </div>

                                    <div className="relative shrink-0">
                                      <select
                                        value={svc.status || 'pending'}
                                        disabled={updatingServiceId === svc.id}
                                        onChange={(e) => handleUpdateSingleServiceStatus(svc.id, e.target.value as ServiceAppointment['status'])}
                                        className={`text-[10.5px] font-bold px-2.5 py-1 pr-6 rounded-lg border appearance-none cursor-pointer focus:outline-none transition-all shadow-xs ${svc.status === 'completed'
                                          ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60 hover:border-emerald-500'
                                          : svc.status === 'in_progress'
                                            ? 'bg-blue-950/90 text-blue-300 border-blue-700/60 hover:border-blue-500'
                                            : svc.status === 'inspection_done'
                                              ? 'bg-purple-950/90 text-purple-300 border-purple-700/60 hover:border-purple-500'
                                              : 'bg-amber-950/90 text-amber-300 border-amber-700/60 hover:border-amber-500'
                                          } disabled:opacity-50`}
                                        title="ກົດເພື່ອປ່ຽນສະຖານະການບໍລິການ"
                                      >
                                        <option value="pending" className="bg-zinc-900 text-amber-300">ລໍຖ້າກວດເຊັກ</option>
                                        <option value="in_progress" className="bg-zinc-900 text-blue-300">ກຳລັງກວດເຊັກ</option>
                                        <option value="inspection_done" className="bg-zinc-900 text-purple-300">ກວດສອບແລ້ວ</option>
                                        <option value="completed" className="bg-zinc-900 text-emerald-300">ສຳເລັດແລ້ວ</option>
                                      </select>
                                      {updatingServiceId === svc.id ? (
                                        <Loader2 className="w-3 h-3 text-zinc-400 animate-spin absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-dashed border-zinc-800 text-center space-y-1">
                              <p className="text-xs font-semibold text-zinc-300">
                                ຍັງບໍ່ທັນມີປະຫວັດການເຂົ້າສູນບໍລິການ
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                ລົດໃໝ່ແນະນຳເພື່ອນັດໝາຍກວດເຊັກ 5,000 km ທຳອິດ ຫຼື 3 ເດືອນເພື່ອຮັກສາເງື່ອນໄຂການຮັບປະກັນແບັດເຕີຣີ.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Buttons Suite */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-zinc-800/80">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* 1. Edit After-Sales & Warranty Profile Button (PRIMARY) */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOwnerForAfterSales(owner);
                              setIsAfterSalesModalOpen(true);
                            }}
                            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white font-bold rounded-xl text-xs border border-zinc-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                            title="ປ້ອນ ແລະ ແກ້ໄຂຂໍ້ມູນລູກຄ້າຫຼັງການຂາຍ, ເລກ VIN, ເລກໄມ ແລະ ໄລຍະຮັບປະກັນ"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>ແກ້ໄຂຂໍ້ມູນຫຼັງການຂາຍ & ຮັບປະກັນ</span>
                          </button>

                          {/* 2. Book Service Button */}
                          <button
                            type="button"
                            onClick={() => setServiceModalCustomer({
                              name: owner.customerName,
                              phone: owner.phone,
                              model: owner.model,
                              plateNumber: owner.plateNumber,
                              mileageKm: owner.currentMileageKm,
                              batteryHealthPercent: owner.batteryHealthSOH
                            })}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            title="ນັດໝາຍເຂົ້າສູນ ຫຼື ບັນທຶກປະຫວັດການເຂົ້າສູນໃຫ້ລູກຄ້ານີ້"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>ນັດໝາຍເຂົ້າສູນ</span>
                          </button>

                          {/* 3. Customer Documents & Delivery Handover */}
                          <button
                            type="button"
                            onClick={() => {
                              if (owner.leadRecord) {
                                setSelectedCustomerForDocs(owner.leadRecord);
                              } else {
                                // Synthetic lead object from bill
                                setSelectedCustomerForDocs({
                                  id: owner.id,
                                  customerName: owner.customerName,
                                  phone: owner.phone,
                                  idCardNumber: owner.idCardNumber,
                                  province: owner.province || 'ນະຄອນຫຼວງວຽງຈັນ',
                                  district: owner.district,
                                  village: owner.village,
                                  category: 'walk_in',
                                  source: 'Showroom Delivery',
                                  interestedModel: owner.model,
                                  status: 'delivered',
                                  priority: 'vip',
                                  notes: `ລົດສົ່ງມອບແລ້ວ: ${owner.model} VIN: ${owner.vin}`,
                                  paymentType: owner.paymentType as any || 'cash',
                                  paymentDate: owner.purchaseDate,
                                  paymentReceiptNo: owner.billRecord?.billNumber || owner.vin,
                                  assignedTo: owner.billRecord?.salesRep || currentUser?.name || 'Admin',
                                  createdAt: owner.purchaseDate || new Date().toISOString(),
                                });
                              }
                            }}
                            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            title="ເບິ່ງເອກະສານມອບລົດ, ໃບຮັບເງິນ ແລະ ໃບຮັບປະກັນ"
                          >
                            <FileText className="w-3.5 h-3.5 text-zinc-400" />
                            <span>ເອກະສານ & ໃບມອບລົດ</span>
                            {(() => {
                              const count = getCustomerIssuedDocsCount(owner.customerName, owner.phone, owner.vin, owner.leadRecord?.id || owner.id);
                              return count > 0 ? (
                                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  {count}
                                </span>
                              ) : null;
                            })()}
                          </button>

                        </div>

                        {/* 4. After-Sales Polite WhatsApp Contact */}
                        <button
                          type="button"
                          onClick={() => {
                            const message = `ສະບາຍດີ ທ່ານ ${owner.customerName}, ຈາກສູນບໍລິການຫຼັງການຂາຍ AVATR Laos.\nພວກເຮົາຂໍຕິດຕາມການໃຊ້ງານລົດ ${owner.model} ${owner.plateNumber ? ` (ປ້າຍທະບຽນ: ${owner.plateNumber})` : ''}. ທ່ານຕ້ອງການນັດໝາຍກວດເຊັກສະພາບລົດ ຫຼື ມີຂໍ້ສອບຖາມເພີ່ມເຕີມບໍ່?`;
                            openWhatsApp(owner.phone, message);
                          }}
                          className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="ສົ່ງຂໍ້ຄວາມ WhatsApp ບໍລິການຫຼັງການຂາຍ"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                          <span>WhatsApp ຫຼັງການຂາຍ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* DEDICATED TAB 3: INSTALLMENT & FINANCE CUSTOMERS VIEW */
          <div className="space-y-6">
            {renderDateSearch()}
            <InstallmentDashboardView
              hideTextSearch
              leads={leads.filter(l => (isActiveInstallmentLead(l) || (isInstallmentCompleted(l) && isLeadInstallment(l))) && matchesCrmTime(l.paymentDate || l.createdAt) && leadMatchesSearch(l))}
              setLeads={setLeads}
              bills={bills}
              setBills={setBills}
              vehicles={vehicles}
              currentUser={currentUser}
              lang={lang}
              onNavigateMenu={onNavigateMenu || (() => onSelectCustomerForPOS ? onSelectCustomerForPOS() : undefined)}
              onNavigateTab={(tab) => setCustomerClassificationTab(tab)}
              onOpenCustomer={openCustomerDetail}
            />
          </div>
        )}
      </div>

      {/* Customer Document Suite Modal (ໃບຮັບເງິນ, ໃບມອບສິດ, ໃບມອບລົດ, ຕາຕະລາງຜ່ອນ) */}
      <ErrorBoundary>
        <Suspense
          fallback={
            selectedCustomerForDocs || selectedCustomerForInstallments || customerToConfirmPayment || pipelineAction || contactLead ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs text-white text-sm font-medium">
                ກຳລັງໂຫຼດ...
              </div>
            ) : null
          }
        >
        {selectedCustomerForDocs && (
          <CustomerDocumentsModal
            isOpen={!!selectedCustomerForDocs}
            onClose={() => { setSelectedCustomerForDocs(null); setDocsInitialDoc(undefined); }}
            customer={withVehicleFromBills(selectedCustomerForDocs, bills)}
            initialDoc={docsInitialDoc}
            vehicles={vehicles}
            currentUser={currentUser}
            lang={lang}
            customerGroup={customerClassificationTab}
            onConfirmPayment={handleConfirmCustomerPayment}
          />
        )}

        {/* Installment Payment Tracking Modal (ຕາຕະລາງຕິດຕາມການເກັບເງິນງວດ) */}
        {selectedCustomerForInstallments && (
          <InstallmentLedgerModal
            isOpen={!!selectedCustomerForInstallments}
            onClose={() => setSelectedCustomerForInstallments(null)}
            customer={selectedCustomerForInstallments}
            vehicles={vehicles}
            currentUser={currentUser}
            lang={lang}
            onUpdateCustomerRecords={handleUpdateCustomerRecords}
          />
        )}

        {/* Payment Confirmation Modal (ຢືນຢັນການຊຳລະ & ຍ້າຍໄປຊ່ອງ "ຈ່າຍແລ້ວ") */}
        {customerToConfirmPayment && (
          <PaymentConfirmModal
            isOpen={!!customerToConfirmPayment}
            onClose={() => setCustomerToConfirmPayment(null)}
            customer={customerToConfirmPayment}
            vehicles={vehicles}
            currentUser={currentUser}
            lang={lang}
            onConfirmPayment={handleConfirmCustomerPayment}
          />
        )}

        {/* Booking deposit / vehicle delivery */}
        {pipelineAction && (() => {
          const target = leads.find(l => l.id === pipelineAction.leadId);
          return target ? (
            <PipelineActionModal
              mode={pipelineAction.mode}
              lead={target}
              staffName={currentUser?.name}
              staffOptions={Array.from(new Set(leads.map(l => l.assignedTo).filter((n): n is string => Boolean(n))))}
              lang={lang}
              onClose={() => setPipelineAction(null)}
              onSave={handlePipelineSave}
            />
          ) : null;
        })()}

        {/* Contact Log & Follow-up Modal */}
        {contactLead && (
          <ContactLogModal
            lead={leads.find(l => l.id === contactLead.id) || contactLead}
            staffName={currentUser?.name}
            isAdmin={isAdminUser}
            lang={lang}
            onClose={() => setContactLead(null)}
            onSave={handleSaveContactLog}
          />
        )}
        </Suspense>
      </ErrorBoundary>

      {/* Confirmation Popup Modal for Deleting Customer */}
      <ConfirmDeleteModal
        isOpen={!!leadToDelete}
        onClose={() => setLeadToDelete(null)}
        onConfirm={handleConfirmDeleteCustomer}
        itemName={leadToDelete ? `${leadToDelete.customerName} (${leadToDelete.phone}) - ${leadToDelete.interestedModel}` : ''}
        itemType="CRM CUSTOMER"
        title={lang === 'lo' ? `ຢືນຢັນການລົບລູກຄ້າ "${leadToDelete?.customerName}"` : 'Confirm Delete Customer'}
        description={lang === 'lo'
          ? `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລູກຄ້າ "${leadToDelete?.customerName}" ອອກຈາກລະບົບ CRM? ຂໍ້ມູນປະຫວັດການຕິດຕໍ່ທັງໝົດຈະຖືກລົບອອກ.`
          : `Are you sure you want to delete customer "${leadToDelete?.customerName}" from CRM? All contact history will be removed.`
        }
        confirmButtonText={lang === 'lo' ? 'ຢືນຢັນລົບລູກຄ້າ' : 'Delete Customer'}
        cancelButtonText={lang === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
        lang={lang}
      />

      <ErrorBoundary>
        <Suspense
          fallback={
            selectedOwnerForAfterSales || serviceModalCustomer ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs text-white text-sm font-medium">
                ກຳລັງໂຫຼດ...
              </div>
            ) : null
          }
        >
        {/* Customer After-Sales & Warranty Profile Editor Modal */}
        {selectedOwnerForAfterSales && (
          <CustomerAfterSalesModal
            isOpen={isAfterSalesModalOpen}
            onClose={() => {
              setIsAfterSalesModalOpen(false);
              setSelectedOwnerForAfterSales(null);
            }}
            customer={selectedOwnerForAfterSales}
            vehicles={vehicles}
            lang={lang}
            onSave={handleSaveAfterSalesProfile}
          />
        )}

        {/* Service Appointment Booking Modal for After-Sales */}
        {serviceModalCustomer && (
          <ServiceModal
            isOpen={!!serviceModalCustomer}
            onClose={() => setServiceModalCustomer(null)}
            onAddService={async (newService) => {
              // Parent handler saves, toasts success/error, and throws on failure
              // so the modal stays open with the user's input.
              if (onAddService) await onAddService(newService);
            }}
            lang={lang}
            modelOptions={vehicles.map(v => v.name)}
            initialCustomerName={serviceModalCustomer.name}
            initialPhone={serviceModalCustomer.phone}
            initialPlateNumber={serviceModalCustomer.plateNumber}
            initialModel={serviceModalCustomer.model}
            initialMileageKm={serviceModalCustomer.mileageKm}
            initialBatteryHealthPercent={serviceModalCustomer.batteryHealthPercent}
          />
        )}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
