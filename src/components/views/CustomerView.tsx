import { useEffect, useRef, useState } from 'react';
import { Lead, VehicleModel, Language, LeadStatus, LeadPriority, CustomerCategory, SystemUser, InstallmentPaymentRecord } from '../../types';
import { translations } from '../../data/translations';
import { LAO_PROVINCES } from '../../data/laoProvinces';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  MessageSquare, 
  Car, 
  Filter, 
  Star, 
  Store,
  Globe, 
  CalendarCheck, 
  Calendar,
  FileText, 
  UserPlus, 
  CheckCircle2, 
  Sparkles, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ShoppingBag, 
  CreditCard,
  Download,
  Printer,
  MapPin,
  FileCheck,
  User as UserIcon,
  Banknote,
  Clock,
  AlertCircle,
  Check
} from 'lucide-react';
import { 
  ConfirmDeleteModal, 
  CustomerDocumentsModal, 
  InstallmentLedgerModal, 
  PaymentConfirmModal 
} from '../modals';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl, formatWhatsAppDisplay, openWhatsApp } from '../../utils/whatsapp';
import { deleteLead, saveLead, updateLeadStatus } from '../../backend/data';
import { newRecordId } from '../../backend/ids';

interface CustomerViewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  vehicles: VehicleModel[];
  currentUser?: SystemUser;
  lang: Language;
  onOpenNewLead: () => void;
  onOpenQuote: (vehicle: VehicleModel, customerName?: string) => void;
  onSelectCustomerForPOS?: (lead: Lead) => void;
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
}: CustomerViewProps) {
  const t = translations[lang] || translations.lo;

  // Separated Category Filters as requested:
  // 1. Channel Filter (ໝວດຊ່ອງທາງລູກຄ້າ: ທັງໝົດ, Walk-in, Online, Event)
  const [channelFilter, setChannelFilter] = useState<'all' | CustomerCategory>('all');
  // 2. Payment Method Filter (ໝວດຮູບແບບການຊຳລະ: ທັງໝົດ, ສົດ/ໂອນ, ຜ່ອນ/ດາວ)
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash_transfer' | 'installment'>('all');
  // 3. Status Filter (ສະຖານະລູກຄ້າ / ຊ່ອງຈ່າຍແລ້ວ)
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast notification feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modal states
  const [selectedCustomerForDocs, setSelectedCustomerForDocs] = useState<Lead | null>(null);
  const [selectedCustomerForInstallments, setSelectedCustomerForInstallments] = useState<Lead | null>(null);
  const [customerToConfirmPayment, setCustomerToConfirmPayment] = useState<Lead | null>(null);

  // Left Input Form States - Zero pre-filled defaults
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formIdCard, setFormIdCard] = useState('');
  const [formCategory, setFormCategory] = useState<CustomerCategory>('walk_in');
  const [formModel, setFormModel] = useState<string>(() => vehicles[0]?.name || 'AVATR 12');
  const [formPriority, setFormPriority] = useState<LeadPriority>('high');
  const [formPaymentType, setFormPaymentType] = useState<'cash' | 'transfer' | 'installment'>('cash');
  const [formDownPaymentPercent, setFormDownPaymentPercent] = useState<number>(30);
  const [formTenureMonths, setFormTenureMonths] = useState<number>(48);
  const [formNotes, setFormNotes] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [isFormExpandedMobile, setIsFormExpandedMobile] = useState(false);

  // Province, District, Village Selector for Left Form
  const [formProvince, setFormProvince] = useState('ນະຄອນຫຼວງວຽງຈັນ');
  const [formDistrict, setFormDistrict] = useState('ເມືອງ ຈັນທະບູລີ');
  const [formVillage, setFormVillage] = useState('ບ້ານ ສີຫອມ');
  const [formCustomVillage, setFormCustomVillage] = useState('');
  const [openLocationDropdown, setOpenLocationDropdown] = useState<'province' | 'district' | 'village' | null>(null);
  const provinceDropdownRef = useRef<HTMLDivElement>(null);
  const districtDropdownRef = useRef<HTMLDivElement>(null);
  const villageDropdownRef = useRef<HTMLDivElement>(null);
  const selectedProvince = LAO_PROVINCES.find(province => province.nameLo === formProvince);
  const districtOptions = selectedProvince?.districts || [];
  const selectedDistrict = districtOptions.find(district => district.nameLo === formDistrict) || districtOptions[0];
  const villageOptions = selectedDistrict?.popularVillages || [];

  useEffect(() => {
    if (!openLocationDropdown) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !provinceDropdownRef.current?.contains(target) &&
        !districtDropdownRef.current?.contains(target) &&
        !villageDropdownRef.current?.contains(target)
      ) {
        setOpenLocationDropdown(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenLocationDropdown(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openLocationDropdown]);

  // Selected vehicle pricing for real-time down payment calculation
  const selectedVehicleObj = vehicles.find(v => v.name === formModel) || vehicles[0];
  const vehiclePriceUSD = selectedVehicleObj?.priceStartingUSD || 45000;
  const vehiclePriceLAK = vehiclePriceUSD * 22000;

  // Calculated down payment amount based on vehicle price and %
  const calculatedDownUSD = Math.round(vehiclePriceUSD * (formDownPaymentPercent / 100));
  const calculatedDownLAK = calculatedDownUSD * 22000;
  const calculatedRemainingUSD = Math.max(0, vehiclePriceUSD - calculatedDownUSD);
  const calculatedRemainingLAK = calculatedRemainingUSD * 22000;
  const calculatedMonthlyLAK = Math.round(((calculatedRemainingUSD * (1 + 0.075 * (formTenureMonths / 12))) / formTenureMonths) * 22000);

  // Separated Counts:
  // 1. Acquisition Channel counts
  const channelCounts = {
    all: leads.length,
    walk_in: leads.filter(l => l.category === 'walk_in').length,
    online: leads.filter(l => l.category === 'online').length,
    event: leads.filter(l => l.category === 'event').length,
  };

  // 2. Payment Mode counts (Separated group)
  const paymentCounts = {
    all: leads.length,
    cash_transfer: leads.filter(l => l.paymentType === 'cash' || l.paymentType === 'transfer' || !l.paymentType).length,
    installment: leads.filter(l => l.paymentType === 'installment' || l.paymentType === 'finance').length,
  };

  // 3. Status / Lifecycle counts (including dedicated "ຈ່າຍແລ້ວ" count)
  const statusCounts = {
    all: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    test_drive: leads.filter(l => l.status === 'test_drive').length,
    negotiation: leads.filter(l => l.status === 'negotiation').length,
    delivered: leads.filter(l => l.status === 'delivered').length, // ຊ່ອງ "ຈ່າຍແລ້ວ"
  };

  const handleCreateCustomerFromLeftForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const selectedCar = formModel || vehicles[0]?.name || 'AVATR 12';
    const effectiveVillage = formVillage === '__custom__' ? formCustomVillage.trim() : formVillage;

    const newLead: Lead = {
      id: newRecordId(),
      customerName: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      idCardNumber: formIdCard.trim() || undefined, // Optional
      province: formProvince,
      district: formDistrict,
      village: effectiveVillage,
      category: formCategory,
      source: formCategory === 'walk_in' ? 'Walk-in ໜ້າໂຊຣູມ' : formCategory === 'online' ? 'Online Social/Web' : 'Event Motor Expo',
      interestedModel: selectedCar,
      status: 'new',
      priority: formPriority,
      notes: formNotes || '',
      paymentType: formPaymentType,
      downPaymentPercent: formPaymentType === 'installment' ? Number(formDownPaymentPercent) || 0 : undefined,
      downPaymentUSD: formPaymentType === 'installment' ? calculatedDownUSD : undefined,
      tenureMonths: formPaymentType === 'installment' ? Number(formTenureMonths) || 0 : undefined,
      monthlyPaymentLAK: formPaymentType === 'installment' ? calculatedMonthlyLAK : undefined,
      installmentStatus: formPaymentType === 'installment' ? 'pending_approval' : undefined,
      // Responsible officer: ALWAYS from active logged-in user account!
      assignedTo: currentUser?.name || 'Admin',
      createdAt: formDate ? `${formDate}T${new Date().toTimeString().slice(0, 8)}` : new Date().toISOString(),
    };

    try {
      if (!currentUser?.id) throw new Error('Sign in again before saving a customer.');
      await saveLead(newLead, currentUser.id);
      setLeads(prev => [newLead, ...prev]);
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 4000);

      // Reset Form
      setFormName('');
      setFormPhone('');
      setFormEmail('');
      setFormIdCard('');
      setFormNotes('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Customer could not be saved.');
    }
  };

  // Modal delete state for modern confirmation popup
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const handleConfirmDeleteCustomer = async () => {
    if (!leadToDelete) return;
    try {
      await deleteLead(leadToDelete.id);
      setLeads(prev => prev.filter(l => l.id !== leadToDelete.id));
      setLeadToDelete(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Customer could not be deleted.');
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      setLeads(prev => prev.map(l => l.id === leadId ? {
        ...l,
        status: newStatus,
        lastFollowUp: new Date().toISOString()
      } : l));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Customer status could not be updated.');
    }
  };

  const handleUpdateInstallmentStatus = async (leadId: string, newStatus: any) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) throw new Error('Customer record not found.');
    const updatedLead: Lead = {
      ...targetLead,
      installmentStatus: newStatus,
      lastFollowUp: new Date().toISOString(),
    };
    try {
      if (!currentUser?.id) throw new Error('Sign in again before updating installment status.');
      await saveLead(updatedLead, currentUser.id);
      setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
      showToast('ອັບເດດສະຖານະການຜ່ອນຊຳລະສຳເລັດແລ້ວ');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Installment status could not be updated.');
      throw error;
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
      showToast(error instanceof Error ? error.message : 'Installment ledger could not be saved.');
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
      showToast(`ຢືນຢັນການຊຳລະເງິນ "${updatedLead.customerName}" ສຳເລັດແລ້ວ! ຍ້າຍໄປຊ່ອງ "ຈ່າຍແລ້ວ" ຮຽບຮ້ອຍ.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Payment confirmation could not be saved.');
      throw error;
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter(lead => {
    // 1. Channel Filter (ໝວດຊ່ອງທາງລູກຄ້າ)
    if (channelFilter !== 'all' && lead.category !== channelFilter) return false;

    // 2. Payment Method Filter (ໝວດຮູບແບບການຊຳລະ - ແຍກເປັນອີກໝວດຕ່າງຫາກ)
    if (paymentFilter === 'cash_transfer') {
      if (lead.paymentType === 'installment' || lead.paymentType === 'finance') return false;
    } else if (paymentFilter === 'installment') {
      if (lead.paymentType !== 'installment' && lead.paymentType !== 'finance') return false;
    }

    // 3. Status Filter (ສະຖານະລູກຄ້າ / ຊ່ອງຈ່າຍແລ້ວ)
    if (selectedStatus !== 'all' && lead.status !== selectedStatus) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        lead.customerName.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        (lead.idCardNumber && lead.idCardNumber.toLowerCase().includes(q)) ||
        (lead.province && lead.province.toLowerCase().includes(q)) ||
        (lead.district && lead.district.toLowerCase().includes(q)) ||
        (lead.village && lead.village.toLowerCase().includes(q)) ||
        (lead.assignedTo && lead.assignedTo.toLowerCase().includes(q)) ||
        (lead.paymentReceiptNo && lead.paymentReceiptNo.toLowerCase().includes(q)) ||
        lead.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Export Customer CRM to CSV File (ນຳອອກ)
  const handleExportCSV = () => {
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

    const rows = filteredLeads.map(lead => [
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
    link.setAttribute('download', `avatr_crm_customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 pb-12">
      {/* WRAPPER FOR CRM VIEWS - SUPPRESSED DURING PRINT WHEN A CUSTOMER DOCUMENT IS OPEN */}
      <div className={selectedCustomerForDocs ? "print:hidden hide-on-print-doc space-y-6" : "space-y-6"}>
        {/* Top Header */}
        <div className="theme-adaptive-dark-surface relative overflow-hidden rounded-3xl border border-zinc-800 bg-linear-to-br from-zinc-900 via-zinc-950 to-black p-5 shadow-xl sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/4 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-xl bg-white p-2 text-black shadow-sm">
                  <Users className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-300">
                  CUSTOMER RELATIONSHIP MANAGEMENT
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {t.customerViewTitle}
              </h1>
              <p className="mt-1 max-w-2xl text-xs text-zinc-400 sm:text-sm">
                {lang === 'lo'
                  ? 'ຈັດການລາຍຊື່, ຕິດຕາມສະຖານະ ແລະບັນທຶກການຕິດຕໍ່ລູກຄ້າໄວ້ໃນຈຸດດຽວ'
                  : lang === 'th'
                    ? 'จัดการรายชื่อลูกค้า ติดตามสถานะ และบันทึกการติดต่อได้ในที่เดียว'
                    : 'Manage customer records, follow-up status, and contact history in one place.'}
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          {/* Officer in charge indicator according to active logged-in user */}
              <div className="officer-indicator flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs sm:flex-none">
                <span className="officer-indicator-avatar grid h-8 w-8 shrink-0 place-items-center rounded-lg border">
                  <UserIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="officer-indicator-label block text-[10px]">{t.assignedOfficer || 'ຜູ້ຮັບຜິດຊອບ'}</span>
                  <span className="officer-indicator-name block truncate font-semibold">
                    {currentUser?.name || t.roleSuperAdmin}
                    <span className="officer-indicator-role ml-1 font-mono text-[10px]">({currentUser?.roleTitleLo?.split(' ')[0] || 'Staff'})</span>
                  </span>
                </span>
              </div>

          {/* Export CSV Button (ນຳອອກ) */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:border-zinc-500 hover:bg-zinc-800 sm:flex-none"
            title="ດາວໂຫລດຖານຂໍ້ມູນລູກຄ້າ CRM ເປັນຟາຍ CSV/Excel"
          >
            <Download className="w-3.5 h-3.5 text-zinc-300" />
            <span>ນຳອອກ (Export CSV)</span>
          </button>

          {/* Print Summary Report */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:border-zinc-500 hover:bg-zinc-800 sm:flex-none"
            title="ພິມລາຍງານລູກຄ້າ CRM"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-300" />
            <span>ພິມລາຍງານ</span>
          </button>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: lang === 'lo' ? 'ລູກຄ້າທັງໝົດ' : lang === 'th' ? 'ลูกค้าทั้งหมด' : 'Total customers',
            value: statusCounts.all,
            caption: lang === 'lo' ? 'ທຸກສະຖານະ' : lang === 'th' ? 'ทุกสถานะ' : 'All statuses',
            icon: Users,
            tone: 'text-zinc-200',
          },
          {
            label: lang === 'lo' ? 'ລໍຖ້າຕິດຕໍ່' : lang === 'th' ? 'รอติดต่อลูกค้า' : 'Needs follow-up',
            value: statusCounts.new + statusCounts.contacted,
            caption: lang === 'lo' ? 'ໃໝ່ ແລະ ຕິດຕໍ່ແລ້ວ' : lang === 'th' ? 'ใหม่และติดต่อแล้ว' : 'New and contacted',
            icon: Clock,
            tone: 'text-amber-300',
          },
          {
            label: lang === 'lo' ? 'ລູກຄ້າແບບຜ່ອນ' : lang === 'th' ? 'ลูกค้าแบบผ่อน' : 'Installment customers',
            value: paymentCounts.installment,
            caption: lang === 'lo' ? `ສົດ/ໂອນ: ${paymentCounts.cash_transfer}` : lang === 'th' ? `สด/โอน: ${paymentCounts.cash_transfer}` : `Cash / transfer: ${paymentCounts.cash_transfer}`,
            icon: CreditCard,
            tone: 'text-blue-300',
          },
          {
            label: lang === 'lo' ? 'ຊຳລະແລ້ວ' : lang === 'th' ? 'ชำระแล้ว' : 'Completed',
            value: statusCounts.delivered,
            caption: lang === 'lo' ? 'ຢືນຢັນແລ້ວ' : lang === 'th' ? 'ยืนยันแล้ว' : 'Payment confirmed',
            icon: CheckCircle2,
            tone: 'text-emerald-300',
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-zinc-400">{metric.label}</p>
                  <p className="mt-1 text-2xl font-bold font-mono text-white">{metric.value.toLocaleString()}</p>
                </div>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-900 ${metric.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-[10px] text-zinc-500">{metric.caption}</p>
            </div>
          );
        })}
      </div>

      {/* Main Two-Column Layout: Left Input Panel + Right Main Content */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12 xl:gap-6">
        {/* LEFT COLUMN (4 cols): INPUT FORM FOR SALES STAFF (HIDDEN IN PRINT) */}
        <div className="relative z-0 space-y-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm print:hidden sm:p-6 xl:col-span-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 select-none">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-white shrink-0" />
              <h2 className="font-bold text-base text-white">{t.inputFormHeader}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded">
                INPUT CRM
              </span>
              <button
                type="button"
                onClick={() => setIsFormExpandedMobile(prev => !prev)}
                className="lg:hidden p-1 text-zinc-400 hover:text-white rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center transition-colors"
                aria-label={isFormExpandedMobile ? 'Collapse customer form' : 'Expand customer form'}
                aria-expanded={isFormExpandedMobile}
              >
                {isFormExpandedMobile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {formSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{t.savedCustomerSuccess}</span>
            </div>
          )}

          <form 
            onSubmit={handleCreateCustomerFromLeftForm} 
            className={`space-y-3.5 text-xs ${isFormExpandedMobile ? 'block' : 'hidden lg:block'}`}
          >
            {/* 3 Categories Radio / Selector */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1.5">
                {t.customerTypeLabel}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormCategory('walk_in')}
                  className={`py-2 px-1 rounded-xl text-center font-medium border transition-all flex flex-col items-center gap-1 ${
                    formCategory === 'walk_in'
                      ? 'bg-white text-black border-white font-bold shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span className="text-[11px] truncate w-full px-0.5">Walk-in</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormCategory('online')}
                  className={`py-2 px-1 rounded-xl text-center font-medium border transition-all flex flex-col items-center gap-1 ${
                    formCategory === 'online'
                      ? 'bg-white text-black border-white font-bold shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-[11px] truncate w-full px-0.5">Online</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormCategory('event')}
                  className={`py-2 px-1 rounded-xl text-center font-medium border transition-all flex flex-col items-center gap-1 ${
                    formCategory === 'event'
                      ? 'bg-white text-black border-white font-bold shadow-md'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span className="text-[11px] truncate w-full px-0.5">Event</span>
                </button>
              </div>
            </div>

            {/* Customer Name & Registration Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="block text-zinc-400 font-medium mb-1">
                  {t.customerNameLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. ທ່ານ ສົມສັກ ວົງວິໄລ"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="flex w-full items-center gap-1 mb-1 font-medium text-zinc-400">
                  <Calendar className="w-3.5 h-3.5 text-white" />
                  <span>ວັນເດືອນປີ <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-white transition-colors text-xs"
                />
              </div>
            </div>

            {/* Phone & ID Card (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-400 font-medium">
                    {t.customerPhoneLabel} *
                  </label>
                  {formPhone && (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>WA: {formatWhatsAppDisplay(formPhone)}</span>
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="020 5xxxxxxx"
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => openWhatsApp(formPhone, formName, formModel, lang)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      formPhone.trim()
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                    }`}
                    title="ກົດເພື່ອເປີດ WhatsApp ຕາມເບີໂທທີ່ປ້ອນເຂົ້າໄປ"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  {lang === 'lo' ? 'ເລກບັດປະຊາຊົນ / Passport (ຈະໃສ່ ຫຼື ບໍ່ໃສ່ກໍໄດ້)' : 'ID Card / Passport (Optional)'}
                </label>
                <input
                  type="text"
                  value={formIdCard}
                  onChange={(e) => setFormIdCard(e.target.value)}
                  placeholder="ID-01-VTE-xxxx / Pxxxxxx"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
                />
              </div>
            </div>

            {/* Location Selector (18 Provinces, Districts & Villages) */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
              <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>ທີ່ຢູ່ລູກຄ້າ (ແຂວງ, ເມືອງ, ບ້ານ)</span>
              </span>

              {/* Province */}
              <div>
                <label className="block text-zinc-400 mb-0.5 text-[10px]">ແຂວງ / ນະຄອນຫຼວງ</label>
                <div className="relative" ref={provinceDropdownRef}>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={openLocationDropdown === 'province'}
                    onClick={() => setOpenLocationDropdown(current => current === 'province' ? null : 'province')}
                    className="pos-province-trigger flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-white transition-colors hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                  >
                    <span className="truncate">
                      {selectedProvince?.nameLo || formProvince}
                      {selectedProvince?.nameEn && <span className="ml-1 text-zinc-400">({selectedProvince.nameEn})</span>}
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${openLocationDropdown === 'province' ? 'rotate-180' : ''}`} />
                  </button>
                  {openLocationDropdown === 'province' && (
                    <div role="listbox" aria-label="ເລືອກແຂວງ" className="pos-province-options absolute left-0 top-full z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl">
                      {LAO_PROVINCES.map(province => (
                        <button
                          key={province.id}
                          type="button"
                          role="option"
                          aria-selected={formProvince === province.nameLo}
                          onClick={() => {
                            setFormProvince(province.nameLo);
                            setFormDistrict(province.districts[0]?.nameLo || '');
                            setFormVillage(province.districts[0]?.popularVillages[0] || '');
                            setOpenLocationDropdown(null);
                          }}
                          className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                            formProvince === province.nameLo
                              ? 'pos-province-option-selected bg-zinc-800 text-white'
                              : 'text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <span>{province.nameLo}</span>
                          <span className="shrink-0 text-[10px] text-zinc-500">{province.nameEn}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* District & Village */}
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-0.5 text-[10px]">ເມືອງ (District)</label>
                  <div className="relative" ref={districtDropdownRef}>
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={openLocationDropdown === 'district'}
                      onClick={() => setOpenLocationDropdown(current => current === 'district' ? null : 'district')}
                      className="pos-province-trigger flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-white transition-colors hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                    >
                      <span className="truncate">
                        {selectedDistrict?.nameLo || formDistrict}
                        {selectedDistrict?.nameEn && <span className="ml-1 text-zinc-400">({selectedDistrict.nameEn})</span>}
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${openLocationDropdown === 'district' ? 'rotate-180' : ''}`} />
                    </button>
                    {openLocationDropdown === 'district' && (
                      <div role="listbox" aria-label="ເລືອກເມືອງ" className="pos-province-options absolute left-0 top-full z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl">
                        {districtOptions.map(district => (
                          <button
                            key={district.nameLo}
                            type="button"
                            role="option"
                            aria-selected={formDistrict === district.nameLo}
                            onClick={() => {
                              setFormDistrict(district.nameLo);
                              setFormVillage(district.popularVillages[0] || '');
                              setOpenLocationDropdown(null);
                            }}
                            className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                              formDistrict === district.nameLo
                                ? 'pos-province-option-selected bg-zinc-800 text-white'
                                : 'text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            <span>{district.nameLo}</span>
                            <span className="shrink-0 text-[10px] text-zinc-500">{district.nameEn}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-0.5 text-[10px]">ບ້ານ (Village)</label>
                  <div className="relative" ref={villageDropdownRef}>
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={openLocationDropdown === 'village'}
                      onClick={() => setOpenLocationDropdown(current => current === 'village' ? null : 'village')}
                      className="pos-province-trigger flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-white transition-colors hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                    >
                      <span className="truncate">
                        {formVillage === '__custom__' ? '+ ລະບຸບ້ານອື່ນໆ...' : formVillage || 'ເລືອກບ້ານ'}
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${openLocationDropdown === 'village' ? 'rotate-180' : ''}`} />
                    </button>
                    {openLocationDropdown === 'village' && (
                      <div role="listbox" aria-label="ເລືອກບ້ານ" className="pos-province-options absolute left-0 top-full z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl">
                        {villageOptions.map(village => (
                          <button
                            key={village}
                            type="button"
                            role="option"
                            aria-selected={formVillage === village}
                            onClick={() => {
                              setFormVillage(village);
                              setOpenLocationDropdown(null);
                            }}
                            className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                              formVillage === village
                                ? 'pos-province-option-selected bg-zinc-800 text-white'
                                : 'text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            <span>{village}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          role="option"
                          aria-selected={formVillage === '__custom__'}
                          onClick={() => {
                            setFormVillage('__custom__');
                            setOpenLocationDropdown(null);
                          }}
                          className={`pos-province-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                            formVillage === '__custom__'
                              ? 'pos-province-option-selected bg-zinc-800 text-white'
                              : 'text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <span>+ ລະບຸບ້ານອື່ນໆ...</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {formVillage === '__custom__' && (
                <div>
                  <input
                    type="text"
                    value={formCustomVillage}
                    onChange={(e) => setFormCustomVillage(e.target.value)}
                    placeholder="ປ້ອນຊື່ບ້ານຕົວຈິງ..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>
              )}
            </div>

            {/* Interested Model & Priority */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  {t.interestedModelLabel}
                </label>
                <select
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-white"
                >
                  {vehicles && vehicles.length > 0 ? (
                    vehicles.map((v) => (
                      <option key={v.id || v.name} value={v.name}>{v.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="AVATR 12">AVATR 12</option>
                      <option value="AVATR 11">AVATR 11</option>
                      <option value="AVATR 07">AVATR 07</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  {t.priorityLabel}
                </label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-white"
                >
                  <option value="vip">VIP</option>
                  <option value="high">{t.priorityHigh}</option>
                  <option value="normal">{t.priorityMedium}</option>
                </select>
              </div>
            </div>

            {/* Payment & Installment Configuration with Live Auto Calculation */}
            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-zinc-300 font-medium text-[11px] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ຮູບແບບການຊຳລະ / ສິນເຊື່ອ</span>
                </label>
                <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setFormPaymentType('cash')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                      formPaymentType === 'cash' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    ສົດ / ໂອນ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormPaymentType('installment')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                      formPaymentType === 'installment' ? 'bg-white text-black font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    ຜ່ອນ / ດາວ
                  </button>
                </div>
              </div>

              {formPaymentType === 'installment' && (
                <div className="space-y-2.5 pt-2 border-t border-zinc-800 animate-fadeIn text-xs">
                  {/* Car Price Info */}
                  <div className="flex justify-between items-center text-[11px] bg-zinc-950 p-2 rounded-lg font-mono">
                    <span className="text-zinc-400">ມູນຄ່າລົດ ({formModel}):</span>
                    <strong className="text-white">${vehiclePriceUSD.toLocaleString()} USD</strong>
                  </div>

                  {/* Down Payment % Selection */}
                  <div>
                    <div className="flex justify-between items-center mb-1 text-[11px]">
                      <span className="text-zinc-400">ອັດຕາວາງດາວ (%):</span>
                      <strong className="text-white font-mono">{formDownPaymentPercent}%</strong>
                    </div>
                    <div className="grid grid-cols-5 gap-1 mb-2">
                      {[15, 20, 30, 40, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setFormDownPaymentPercent(pct)}
                          className={`py-1 rounded text-[10px] font-mono font-bold transition-all ${
                            formDownPaymentPercent === pct
                              ? 'bg-white text-black'
                              : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculated Breakdown Display */}
                  <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between text-zinc-300">
                      <span>• ຈຳນວນເງິນວາງດາວ:</span>
                      <strong className="text-white">${calculatedDownUSD.toLocaleString()} USD</strong>
                    </div>
                    <div className="flex justify-between text-zinc-400 text-[10px]">
                      <span>• ທຽບເທົ່າເງິນກີບ:</span>
                      <span>{calculatedDownLAK.toLocaleString()} LAK</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>• ຍອດເຫຼືອກູ້ຢືມ:</span>
                      <span>${calculatedRemainingUSD.toLocaleString()} USD</span>
                    </div>
                    <div className="flex justify-between text-zinc-300 pt-1 border-t border-zinc-900 font-sans">
                      <span>• ຄ່າງວດປະມານການ:</span>
                      <strong className="text-emerald-400 font-mono">~{calculatedMonthlyLAK.toLocaleString()} LAK/ເດືອນ</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-zinc-400 mb-0.5 text-[10px]">
                        ໄລຍະຜ່ອນ (ເດືອນ)
                      </label>
                      <select
                        value={formTenureMonths}
                        onChange={(e) => setFormTenureMonths(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-white"
                      >
                        <option value={12}>12 ເດືອນ (1 ປີ)</option>
                        <option value={24}>24 ເດືອນ (2 ປີ)</option>
                        <option value={36}>36 ເດືອນ (3 ປີ)</option>
                        <option value={48}>48 ເດືອນ (4 ປີ)</option>
                        <option value={60}>60 ເດືອນ (5 ປີ)</option>
                        <option value={72}>72 ເດືອນ (6 ປີ)</option>
                        <option value={84}>84 ເດືອນ (7 ປີ)</option>
                      </select>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1">
                {t.notesLabel}
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="ສີດຳ, ນັດທົດລອງຂັບ, ຂໍ້ສະເໜີດອກເບ້ຍ..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition-colors shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.saveCustomerBtn}</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN (8 cols): SEPARATED PAYMENT FILTER, CHANNEL FILTER & CUSTOMER LIST */}
        <div className="min-w-0 space-y-4 xl:col-span-8">
          
          {/* 1. SEPARATE PAYMENT MODE CATEGORY FILTER (ໝວດຮູບແບບການຊຳລະ: ສົດ/ໂອນ ແລະ ຜ່ອນ/ດາວ) */}
          <div className="bg-zinc-950 border border-zinc-800 p-3 sm:p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wide">
                <CreditCard className="w-3.5 h-3.5 text-zinc-300" />
                <span>ໝວດຮູບແບບການຊຳລະ (Payment Mode Filter)</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                ແຍກຕາມຮູບແບບຊຳລະເງິນ
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'all' as const, label: 'ທັງໝົດ (All)', count: paymentCounts.all, icon: Users },
                { key: 'cash_transfer' as const, label: 'ສົດ / ໂອນ', count: paymentCounts.cash_transfer, icon: Banknote },
                { key: 'installment' as const, label: 'ຜ່ອນ / ດາວ', count: paymentCounts.installment, icon: CreditCard },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = paymentFilter === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setPaymentFilter(tab.key)}
                    aria-pressed={isSelected}
                    className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-1 min-w-0 cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black border-white shadow-lg font-bold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-semibold truncate">{tab.label}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                      isSelected ? 'bg-zinc-200 text-black' : 'bg-zinc-950 text-zinc-300 border border-zinc-800'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. CUSTOMER CHANNEL CATEGORY FILTER (ໝວດຊ່ອງທາງລູກຄ້າ: Walk-in, Online, Event) */}
          <div className="bg-zinc-950 border border-zinc-800 p-3 sm:p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Store className="w-3.5 h-3.5 text-zinc-300" />
                <span>ໝວດຊ່ອງທາງລູກຄ້າ (Channel Filter)</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                ແຍກຕາມແຫຼ່ງທີ່ມາຂອງລູກຄ້າ
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'all' as const, label: 'ທຸກຊ່ອງທາງ', count: channelCounts.all, icon: Users },
                { key: 'walk_in' as const, label: 'Walk-in ໜ້າໂຊຣູມ', count: channelCounts.walk_in, icon: Store },
                { key: 'online' as const, label: 'Online ໂຊຊຽວ', count: channelCounts.online, icon: Globe },
                { key: 'event' as const, label: 'Event ມໍເຕີໂຊ', count: channelCounts.event, icon: CalendarCheck },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = channelFilter === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setChannelFilter(tab.key)}
                    aria-pressed={isSelected}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between gap-1 min-w-0 cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-200 text-black border-white shadow font-bold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-medium truncate">{tab.label}</span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                      isSelected ? 'bg-zinc-300 text-black' : 'bg-zinc-950 text-zinc-400'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. SEARCH & LIFECYCLE STATUS (Including dedicated "ຊ່ອງຈ່າຍແລ້ວ" shortcut!) */}
          <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs shadow-sm">
            <div className="relative min-w-45 flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="ຄົ້ນຫາຊື່, ເບີໂທ, ເລກບັດ, ທີ່ຢູ່, ລຸ້ນລົດ, ເລກບິນ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/10"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Shortcut Button to jump straight to "ຊ່ອງຈ່າຍແລ້ວ" */}
              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === 'delivered' ? 'all' : 'delivered')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedStatus === 'delivered'
                    ? 'bg-emerald-500 text-black shadow-lg font-black'
                    : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/50'
                }`}
                title="ກົດເພື່ອເບິ່ງລູກຄ້າທີ່ຊຳລະເງິນແລ້ວທັງໝົດ"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ຊ່ອງຈ່າຍແລ້ວ</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  selectedStatus === 'delivered' ? 'bg-black text-emerald-400' : 'bg-emerald-900 text-emerald-200'
                }`}>
                  {statusCounts.delivered}
                </span>
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  aria-label={lang === 'lo' ? 'ກັ່ນຕອງຕາມສະຖານະ' : lang === 'th' ? 'กรองตามสถานะ' : 'Filter by status'}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-white focus:ring-2 focus:ring-white/10 w-full sm:w-auto"
                >
                  <option value="all">{t.statusAll} ({statusCounts.all})</option>
                  <option value="new">{t.statusNew} ({statusCounts.new})</option>
                  <option value="contacted">{t.statusContacted} ({statusCounts.contacted})</option>
                  <option value="test_drive">{t.statusTestDrive} ({statusCounts.test_drive})</option>
                  <option value="negotiation">{t.statusNegotiation} ({statusCounts.negotiation})</option>
                  <option value="delivered">{t.statusDelivered || 'ຈ່າຍແລ້ວ / ສົ່ງມອບສຳເລັດ'} ({statusCounts.delivered})</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-bold text-white">
                {lang === 'lo' ? 'ລາຍຊື່ລູກຄ້າ' : lang === 'th' ? 'รายชื่อลูกค้า' : 'Customer list'}
              </h2>
              <span className="text-xs font-mono text-zinc-400">
                {filteredLeads.length.toLocaleString()} / {leads.length.toLocaleString()}
              </span>
            </div>
            {(paymentFilter !== 'all' || channelFilter !== 'all' || selectedStatus !== 'all' || searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setPaymentFilter('all');
                  setChannelFilter('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                }}
                className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                {lang === 'lo' ? 'ລ້າງຕົວກອງ' : lang === 'th' ? 'ล้างตัวกรอง' : 'Clear filters'}
              </button>
            )}
          </div>

          {/* Customer Cards List */}
          <div className="space-y-3.5">
            {filteredLeads.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
                <Users className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs">{t.noCustomersFound}</p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const vehicle = vehicles.find(v => v.name === lead.interestedModel) || vehicles[0];
                const isInstallmentLead = lead.paymentType === 'installment' || lead.paymentType === 'finance';
                const isPaidCustomer = lead.status === 'delivered';

                return (
                  <div
                    key={lead.id}
                    className={`border rounded-2xl p-4 sm:p-5 space-y-3 transition-all hover:shadow-lg ${
                      isPaidCustomer
                        ? 'bg-zinc-950/90 border-emerald-900/60 hover:border-emerald-700/80'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base text-white truncate max-w-full">{lead.customerName}</h3>
                          
                          {/* Payment Mode Badge */}
                          {isInstallmentLead ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-white border border-zinc-700 rounded-full font-bold flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-zinc-300" />
                              <span>ຜ່ອນ & ດາວ ({lead.downPaymentPercent || 30}%)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-full font-medium flex items-center gap-1">
                              <Banknote className="w-3 h-3 text-zinc-400" />
                              <span>ສົດ / ໂອນ</span>
                            </span>
                          )}

                          {/* "ຈ່າຍແລ້ວ" Verified Badge */}
                          {isPaidCustomer && (
                            <span className="text-[10px] font-mono px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full font-bold flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>ຈ່າຍແລ້ວ</span>
                              {lead.paidAmountUSD ? ` ($${lead.paidAmountUSD.toLocaleString()})` : ''}
                            </span>
                          )}

                          {lead.category === 'walk_in' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-full">
                              Walk-in
                            </span>
                          )}
                          {lead.category === 'online' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-full">
                              Online
                            </span>
                          )}
                          {lead.category === 'event' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-full">
                              Event
                            </span>
                          )}
                          {lead.priority === 'vip' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-white text-black border border-zinc-300 rounded-full font-bold flex items-center gap-1 shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-black text-black" />
                              <span>VIP</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 font-mono">
                          <button
                            type="button"
                            onClick={() => openWhatsApp(lead.phone, lead.customerName, lead.interestedModel, lang)}
                            className="flex items-center gap-1 hover:text-emerald-400 transition-colors cursor-pointer group"
                            title={`ກົດເພື່ອເປີດ WhatsApp ສົນທະນາ: ${formatWhatsAppDisplay(lead.phone)}`}
                          >
                            <Phone className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 shrink-0" />
                            <span>{lead.phone}</span>
                            <span className="text-[9px] bg-emerald-950/60 text-emerald-400 px-1 py-0.5 rounded border border-emerald-800/40 ml-0.5 font-bold flex items-center gap-0.5">
                              <WhatsAppIcon className="w-2.5 h-2.5" />
                              <span>WA</span>
                            </span>
                          </button>

                          {lead.idCardNumber && (
                            <span className="text-zinc-300">
                              • ບັດ/Passport: <strong className="text-white">{lead.idCardNumber}</strong>
                            </span>
                          )}

                          <span>• {lead.interestedModel}</span>

                          {/* Location Badge */}
                          {(lead.province || lead.district || lead.village) && (
                            <span className="text-zinc-400 flex items-center gap-1 font-sans">
                              <MapPin className="w-3 h-3 text-zinc-500" />
                              <span>{[lead.village, lead.district, lead.province].filter(Boolean).join(', ')}</span>
                            </span>
                          )}
                        </div>

                        {/* Responsible officer & Payment reference info */}
                        <div className="text-[11px] text-zinc-400 font-sans pt-0.5 flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1">
                            <span>ຜູ້ຮັບຜິດຊອບ:</span>
                            <strong className="text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                              {lead.assignedTo || currentUser?.name || 'Admin'}
                            </strong>
                          </span>
                          {lead.paymentReceiptNo && (
                            <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                              ໃບຮັບເງິນ: {lead.paymentReceiptNo}
                            </span>
                          )}
                          {lead.paymentDate && (
                            <span className="text-zinc-400 font-mono text-[10px]">
                              ວັນທີຊຳລະ: {lead.paymentDate}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status switcher */}
                      <div className="shrink-0 self-start sm:self-auto">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value as LeadStatus)}
                          className={`text-xs rounded-xl px-2.5 py-1.5 focus:outline-none ${
                            isPaidCustomer
                              ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold'
                              : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
                          }`}
                        >
                          <option value="new">{t.statusNew}</option>
                          <option value="contacted">{t.statusContacted}</option>
                          <option value="test_drive">{t.statusTestDrive}</option>
                          <option value="negotiation">{t.statusNegotiation}</option>
                          <option value="delivered">{t.statusDelivered || 'ຈ່າຍແລ້ວ / ສົ່ງມອບສຳເລັດ'}</option>
                        </select>
                      </div>
                    </div>

                    {/* Dedicated Installment / Financing Details Box */}
                    {isInstallmentLead && (
                      <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-zinc-300" />
                            <span>ແຜນຜ່ອນຊຳລະ & ດາວ (Installment Financing Plan)</span>
                          </span>

                          <div className="flex items-center gap-2">
                            {/* ປຸ່ມເປີດຕາຕະລາງຕິດຕາມການເກັບເງິນງວດ */}
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerForInstallments(lead)}
                              className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-black font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                              title="ເປີດຕາຕະລາງຕິດຕາມການເກັບເງິນງວດລະອຽດ"
                            >
                              <Calendar className="w-3 h-3 text-black" />
                              <span>ຕາຕະລາງເກັບເງິນງວດ</span>
                            </button>

                            {/* Installment Credit Approval Status Switcher */}
                            <select
                              value={lead.installmentStatus || 'pending_approval'}
                              onChange={(e) => handleUpdateInstallmentStatus(lead.id, e.target.value)}
                              className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none"
                            >
                              <option value="pending_approval">ລໍຖ້າອະນຸມັດສິນເຊື່ອ</option>
                              <option value="approved">ອະນຸມັດແລ້ວ</option>
                              <option value="contract_signed">ເຊັນສັນຍາແລ້ວ</option>
                              <option value="completed">ຈ່າຍຄົບແລ້ວ</option>
                              <option value="rejected">ປະຕິເສດ</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-zinc-400 pt-1.5 border-t border-zinc-800">
                          <div>
                            <span className="block text-zinc-500 text-[10px] font-sans">ເງິນວາງດາວ ({lead.downPaymentPercent || 30}%)</span>
                            <span className="text-white font-bold">
                              ${(lead.downPaymentUSD || Math.round(vehiclePriceUSD * ((lead.downPaymentPercent || 30) / 100))).toLocaleString()} USD
                            </span>
                          </div>
                          <div>
                            <span className="block text-zinc-500 text-[10px] font-sans">ໄລຍະຜ່ອນ</span>
                            <span className="text-zinc-200 font-bold">{lead.tenureMonths || 48} ເດືອນ</span>
                          </div>
                          <div>
                            <span className="block text-zinc-500 text-[10px] font-sans">ຄ່າງວດປະມານການ</span>
                            <span className="text-emerald-400 font-bold">
                              ~{((lead.monthlyPaymentLAK || calculatedMonthlyLAK)).toLocaleString()} LAK
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {lead.notes && (
                      <p className="text-xs text-zinc-300 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800 leading-relaxed wrap-break-word">
                        {lead.notes}
                      </p>
                    )}

                    <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 font-mono text-[11px] truncate">
                        {lead.source || lead.category} | {lead.createdAt.slice(0, 10)}
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                        {/* Confirm Payment button: Moves customer to Paid */}
                        {!isPaidCustomer ? (
                          <button
                            type="button"
                            onClick={() => setCustomerToConfirmPayment(lead)}
                            className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold rounded-xl border border-emerald-600/40 hover:border-emerald-500 flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-98"
                            title="ຢືນຢັນການຊຳລະເງິນ ແລະ ຍ້າຍລູກຄ້າໄປຊ່ອງ 'ຈ່າຍແລ້ວ'"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ຢືນຢັນການຊຳລະ</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCustomerToConfirmPayment(lead)}
                            className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 font-bold rounded-xl border border-emerald-800/60 flex items-center justify-center gap-1 text-[11px] transition-colors cursor-pointer"
                            title="ແກ້ໄຂ ຫຼື ກວດສອບຂໍ້ມູນການຊຳລະ"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ຈ່າຍແລ້ວ ({lead.paymentReceiptNo || 'REC'})</span>
                          </button>
                        )}

                        {/* Documents & Printing suite */}
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerForDocs(lead)}
                          className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
                          title="ອອກໃບຮັບເງິນ, ໃບມອບສິດ, ໃບຂອງ/ມອບ-ຮັບລົດ, ຕາຕະລາງຜ່ອນ ແລະ ການພິມບິນ"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>ອອກເອກະສານ & ພິມບິນ</span>
                        </button>

                        {/* ຂາຍລົດ (POS) */}
                        <button
                          type="button"
                          onClick={() => onSelectCustomerForPOS?.(lead)}
                          className="flex-1 sm:flex-initial px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-semibold rounded-xl border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="ນຳຂໍ້ມູນລູກຄ້ານີ້ໄປອອກໃບບິນຂາຍລົດ (POS)"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>ຂາຍລົດ (POS)</span>
                        </button>

                        <a
                          href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                          className="flex-1 sm:flex-initial px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl border border-zinc-700 font-medium flex items-center justify-center gap-1 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{t.callNow}</span>
                        </a>

                        <a
                          href={getWhatsAppUrl(lead.phone, lead.customerName, lead.interestedModel, lang)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl border border-emerald-600/30 hover:border-emerald-500 font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          title={`ເປີດ WhatsApp ສົນທະນາກັບ ${lead.customerName} (${formatWhatsAppDisplay(lead.phone)})`}
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => setLeadToDelete(lead)}
                          className="p-1.5 bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 rounded-xl border border-zinc-700 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                          title="ລົບລູກຄ້າ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-60 bg-white text-black px-4 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-zinc-300 animate-slideUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Customer Document Suite Modal (ໃບຮັບເງິນ, ໃບມອບສິດ, ໃບມອບລົດ, ຕາຕະລາງຜ່ອນ) */}
      {selectedCustomerForDocs && (
        <CustomerDocumentsModal
          isOpen={!!selectedCustomerForDocs}
          onClose={() => setSelectedCustomerForDocs(null)}
          customer={selectedCustomerForDocs}
          vehicles={vehicles}
          currentUser={currentUser}
          lang={lang}
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
    </div>
  );
}
