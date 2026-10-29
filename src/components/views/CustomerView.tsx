import { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Lead, 
  VehicleModel, 
  Language, 
  LeadStatus, 
  LeadPriority, 
  CustomerCategory, 
  SystemUser, 
  InstallmentPaymentRecord,
  InvoiceBillRecord,
  ServiceAppointment,
  ActiveMenu
} from '../../types';
import { translations } from '../../data/translations';
import { LAO_PROVINCES } from '../../data/laoProvinces';
import { showToast } from '../common';
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
  Check,
  Loader2,
  LayoutGrid,
  List,
  X,
  ShieldCheck,
  Wrench,
  Shield,
  Award,
  RotateCcw,
  Gauge,
  BatteryCharging,
  AlertTriangle,
  History
} from 'lucide-react';
import { 
  ConfirmDeleteModal, 
  CustomerDocumentsModal, 
  InstallmentLedgerModal, 
  PaymentConfirmModal,
  ServiceModal,
  CustomerAfterSalesModal,
  CustomerAfterSalesProfile
} from '../modals';
import WhatsAppIcon from '../common/WhatsAppIcon';
import { getWhatsAppUrl, formatWhatsAppDisplay, openWhatsApp } from '../../utils/whatsapp';
import { deleteLead, saveLead, updateLeadStatus, saveBillRecord, fetchLeadsByDateRange } from '../../backend/data';
import { newRecordId } from '../../backend/ids';
import InstallmentDashboardView from './InstallmentDashboardView';
import { IssuedDocumentRecord } from '../../types';
import { getIssuedDocumentLogs, fetchDocumentLogsFromCloud, DOCUMENT_LOG_EVENT } from '../../utils/documentLogger';

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
  onAddService?: (service: Omit<ServiceAppointment, 'id'>) => Promise<void> | void;
  initialClassificationTab?: 'new_leads' | 'existing_customers' | 'installment_customers';
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
  onAddService,
  initialClassificationTab,
}: CustomerViewProps) {
  const t = translations[lang] || translations.lo;

  // View Mode: Cards vs Table
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Primary Classification Tabs: 'new_leads' (ລູກຄ້າໃໝ່) vs 'existing_customers' (ລູກຄ້າທີ່ຊຳລະສຳເລັດແລ້ວ) vs 'installment_customers' (ລູກຄ້າຜ່ອນຊຳລະ)
  const [customerClassificationTab, setCustomerClassificationTab] = useState<'new_leads' | 'existing_customers' | 'installment_customers'>(initialClassificationTab || 'new_leads');

  // Sync tab if initialClassificationTab changes
  useEffect(() => {
    if (initialClassificationTab) {
      setCustomerClassificationTab(initialClassificationTab);
    }
  }, [initialClassificationTab]);

  // Existing Customers (Car Owners) Filters
  const [existingSearchQuery, setExistingSearchQuery] = useState('');
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
  const [searchQuery, setSearchQuery] = useState('');
  const [crmTimePreset, setCrmTimePreset] = useState<'all' | 'today' | '7d' | 'month' | 'year' | 'custom'>('all');
  const [crmDateFrom, setCrmDateFrom] = useState('');
  const [crmDateTo, setCrmDateTo] = useState('');
  const [isLoadingRangeLeads, setIsLoadingRangeLeads] = useState(false);

  const formatLocalYMD = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    const now = new Date();
    const todayStr = formatLocalYMD(now);
    let from: string | undefined;
    let to: string | undefined;
    if (crmTimePreset === 'today') {
      from = todayStr;
      to = todayStr;
    } else if (crmTimePreset === '7d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      from = formatLocalYMD(start);
      to = todayStr;
    } else if (crmTimePreset === 'month') {
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      to = todayStr;
    } else if (crmTimePreset === 'year') {
      from = `${now.getFullYear()}-01-01`;
      to = todayStr;
    } else if (crmTimePreset === 'custom') {
      from = crmDateFrom || undefined;
      to = crmDateTo || undefined;
    }

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
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingRangeLeads(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crmTimePreset, crmDateFrom, crmDateTo]);

  const matchesCrmTime = (dateStr?: string): boolean => {
    if (crmTimePreset === 'all' && !crmDateFrom && !crmDateTo) return true;
    const raw = (dateStr || '').slice(0, 10);
    if (!raw) return false;
    const now = new Date();
    const todayStr = formatLocalYMD(now);
    if (crmTimePreset === 'today') return raw === todayStr;
    if (crmTimePreset === '7d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return raw >= formatLocalYMD(start) && raw <= todayStr;
    }
    if (crmTimePreset === 'month') {
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return raw.startsWith(prefix);
    }
    if (crmTimePreset === 'year') {
      return raw.startsWith(`${now.getFullYear()}-`);
    }
    if (crmTimePreset === 'custom') {
      if (crmDateFrom && raw < crmDateFrom) return false;
      if (crmDateTo && raw > crmDateTo) return false;
    }
    return true;
  };

  // Toast notification feedback
  const triggerLocalToast = (msg: string) => {
    showToast(msg, 'success');
  };

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

  const getCustomerIssuedDocsCount = (customerName: string, phone?: string, vin?: string, leadId?: string) => {
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
    }).length;
  };

  // Helper to identify if a lead has already completed a purchase (delivered, in bills, or has active installment)
  const isLeadPurchased = (lead: Lead) => {
    if (lead.status === 'delivered') return true;
    if (lead.paymentTypeConfirmed === 'full' || lead.paymentTypeConfirmed === 'down_payment') return true;
    if (lead.installmentStatus === 'active_repaying' || lead.installmentStatus === 'completed') return true;
    const inBills = bills.some(b => 
      (b.billType === 'sale' || !b.billType) &&
      (b.leadId === lead.id || 
       (b.customerPhone && lead.phone && b.customerPhone.replace(/\D/g, '') === lead.phone.replace(/\D/g, '')))
    );
    if (inBills) return true;
    return false;
  };

  // 1. Prospective leads (Tab 1: ເກັບສະເພາະລູກຄ້າໃໝ່ທີ່ຍັງບໍ່ທັນຕົກລົງຊື້ຂາຍ/ອອກບິນ ຫຼື ຍັງບໍ່ທັນເຂົ້າສູ່ສັນຍາຜ່ອນຊຳລະຕົວຈິງ)
  const prospectiveLeads = useMemo(() => {
    return leads.filter(lead => {
      if (isLeadPurchased(lead)) return false;
      const isConfirmedInstallment =
        Boolean(lead.installmentRecords && lead.installmentRecords.length > 0) ||
        lead.installmentStatus === 'active_repaying' ||
        lead.installmentStatus === 'completed' ||
        lead.installmentStatus === 'approved' ||
        lead.installmentStatus === 'pending_approval';
      if (isConfirmedInstallment) return false;
      return matchesCrmTime(lead.createdAt || lead.paymentDate);
    });
  }, [leads, bills, crmTimePreset, crmDateFrom, crmDateTo]);

  // Separated Counts (calculated exclusively for prospective leads):
  // 1. Acquisition Channel counts
  const channelCounts = {
    all: prospectiveLeads.length,
    walk_in: prospectiveLeads.filter(l => l.category === 'walk_in').length,
    online: prospectiveLeads.filter(l => l.category === 'online').length,
    event: prospectiveLeads.filter(l => l.category === 'event').length,
  };



  // 3. Status / Lifecycle counts for active prospective pipeline
  const statusCounts = {
    all: prospectiveLeads.length,
    new: prospectiveLeads.filter(l => l.status === 'new').length,
    contacted: prospectiveLeads.filter(l => l.status === 'contacted').length,
    test_drive: prospectiveLeads.filter(l => l.status === 'test_drive').length,
    negotiation: prospectiveLeads.filter(l => l.status === 'negotiation').length,
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
      const isInst = updatedLead.paymentType === 'installment' || updatedLead.paymentType === 'finance';
      showToast(
        isInst
          ? `ຢືນຢັນການຊຳລະເງິນດາວ "${updatedLead.customerName}" ສຳເລັດແລ້ວ! ຍ້າຍໄປໜ້າ "ລູກຄ້າຜ່ອນ & ດາວ" ຮຽບຮ້ອຍ.`
          : `ຢືນຢັນການຊຳລະເງິນ "${updatedLead.customerName}" ສຳເລັດແລ້ວ! ຍ້າຍໄປໜ້າ "ລູກຄ້າເກົ່າ (100%)" ຮຽບຮ້ອຍ.`
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Payment confirmation could not be saved.');
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

        if (currentUser?.id) {
          await saveLead(updatedLead, currentUser.id);
        }
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

        if (currentUser?.id) {
          await saveBillRecord(updatedBill, currentUser.id);
        }
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
        if (currentUser?.id) {
          await saveLead(syntheticLead, currentUser.id);
        }
        setLeads(prev => [syntheticLead, ...prev.filter(l => l.id !== syntheticLead.id)]);
      }

      showToast(`ບັນທຶກຂໍ້ມູນຫຼັງການຂາຍ ແລະ ໄລຍະຮັບປະກັນຂອງ "${updatedData.customerName}" ສຳເລັດແລ້ວ!`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save after-sales data.');
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

    const isInstallmentBill = (b: InvoiceBillRecord) => {
      return b.paymentMethod === 'finance' || 
        b.billType === 'installment' || 
        Boolean(b.downPaymentPercent) || 
        Boolean(b.financeCompany);
    };

    const isUncompletedInstallmentLead = (l: Lead) => {
      // Completed / Payoff confirmed installment leads belong in Tab 2 (Completed Customers)
      if (l.installmentStatus === 'completed' || l.isPaymentCompleted) {
        return false;
      }
      return l.paymentType === 'installment' || 
        l.paymentType === 'finance' || 
        Boolean(l.downPaymentPercent) || 
        Boolean(l.financeCompany) || 
        Boolean(l.installmentRecords && l.installmentRecords.length > 0) ||
        l.installmentStatus === 'active_repaying' ||
        l.installmentStatus === 'approved' ||
        l.installmentStatus === 'pending_approval';
    };

    // Build O(1) indexed lookup maps for leads and services to eliminate O(N^2) bottlenecks
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
    const saleBills = bills.filter(b => (b.billType === 'sale' || (!b.billType && b.customerName)) && !isInstallmentBill(b));
    saleBills.forEach(bill => {
      const key = (bill.customerPhone || bill.customerName || bill.vin || bill.id).toLowerCase();
      seenKeys.add(key);

      const cleanPhone = (bill.customerPhone || '').replace(/\D/g, '');
      const cleanName = (bill.customerName || '').trim().toLowerCase();
      const matchedLead = (cleanPhone ? leadsByCleanPhone.get(cleanPhone) : undefined) ||
        (cleanName ? leadsByLowerName.get(cleanName) : undefined);

      if (matchedLead && isUncompletedInstallmentLead(matchedLead)) {
        return; // Exclude active installments
      }

      const matchedServices = getMatchedServices(bill.customerPhone, bill.customerName, bill.plateNumber);

      const purchaseDate = bill.date || matchedLead?.paymentDate || matchedLead?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
      const rawStart = matchedLead?.warrantyStartDate || bill.warrantyStartDate || purchaseDate;
      const rawExpiry = matchedLead?.warrantyExpiryDate || bill.warrantyExpiryDate;
      const rawYears = matchedLead?.warrantyYears || bill.warrantyYears || 8;
      const rawDistance = matchedLead?.warrantyDistanceKm || bill.warrantyDistanceKm || 160000;
      const currentMileageKm = matchedLead?.currentMileageKm ?? bill.currentMileageKm ?? (5000 + (matchedServices.length * 3500));
      const batteryHealthSOH = matchedLead?.batteryHealthSOH ?? bill.batteryHealthSOH ?? (99.8 - (matchedServices.length * 0.2));

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
        plateNumber: matchedLead?.plateNumber || bill.plateNumber || 'ກຳແພງນະຄອນ (ລໍຖ້າປ້າຍ)',
        vin: matchedLead?.vin || bill.vin || 'AVATR-LA-2026-EV',
        engineNumber: matchedLead?.engineNumber || bill.engineNumber,
        color: matchedLead?.color || bill.color || 'White / Black',
        purchaseDate,
        paymentType: bill.paymentMethod || matchedLead?.paymentType || 'cash',
        currentMileageKm,
        batteryHealthSOH: Math.round(batteryHealthSOH * 10) / 10,
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

    // 2. From Leads with delivered status that were not in bills (cash/transfer only)
    leads.filter(l => l.status === 'delivered' && !isUncompletedInstallmentLead(l)).forEach(lead => {
      const key = (lead.phone || lead.customerName || lead.id).toLowerCase();
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const matchedServices = getMatchedServices(lead.phone, lead.customerName, lead.plateNumber);

        const purchaseDate = lead.paymentDate || lead.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
        const rawStart = lead.warrantyStartDate || purchaseDate;
        const rawExpiry = lead.warrantyExpiryDate;
        const rawYears = lead.warrantyYears || 8;
        const rawDistance = lead.warrantyDistanceKm || 160000;
        const currentMileageKm = lead.currentMileageKm ?? (5000 + (matchedServices.length * 3500));
        const batteryHealthSOH = lead.batteryHealthSOH ?? (99.8 - (matchedServices.length * 0.2));

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
          plateNumber: lead.plateNumber || (lead.paymentReceiptNo ? `ກມ-${lead.paymentReceiptNo.slice(-4)}` : 'ກຳແພງນະຄອນ (ລໍຖ້າປ້າຍ)'),
          vin: lead.vin || `AVATR-VIN-${lead.id.slice(0, 8).toUpperCase()}`,
          engineNumber: lead.engineNumber,
          color: lead.color || 'Mystic Grey / Obsidian',
          purchaseDate,
          paymentType: lead.paymentType || 'cash',
          currentMileageKm,
          batteryHealthSOH: Math.round(batteryHealthSOH * 10) / 10,
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

    // 3. From Completed Installment Leads (ລູກຄ້າຜ່ອນທີ່ຊຳລະຄົບ 100% ແລະ ຢືນຢັນປິດສັນຍາແລ້ວ)
    leads.filter(l => (l.installmentStatus === 'completed' || l.isPaymentCompleted)).forEach(lead => {
      const key = (lead.phone || lead.customerName || lead.id).toLowerCase();
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const matchedServices = getMatchedServices(lead.phone, lead.customerName, lead.plateNumber);

        const purchaseDate = lead.paidDate || lead.paymentDate || lead.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
        const rawStart = lead.warrantyStartDate || purchaseDate;
        const rawExpiry = lead.warrantyExpiryDate;
        const rawYears = lead.warrantyYears || 8;
        const rawDistance = lead.warrantyDistanceKm || 160000;
        const currentMileageKm = lead.currentMileageKm ?? (8500 + (matchedServices.length * 4000));
        const batteryHealthSOH = lead.batteryHealthSOH ?? (99.2 - (matchedServices.length * 0.3));

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
          plateNumber: lead.plateNumber || (lead.paymentReceiptNo ? `ກມ-${lead.paymentReceiptNo.slice(-4)}` : 'ກຳແພງນະຄອນ (ລໍຖ້າປ້າຍ)'),
          vin: lead.vin || `AVATR-VIN-${lead.id.slice(0, 8).toUpperCase()}`,
          engineNumber: lead.engineNumber,
          color: lead.color || 'Mystic Grey / Obsidian',
          purchaseDate,
          paymentType: 'installment_completed',
          currentMileageKm,
          batteryHealthSOH: Math.round(batteryHealthSOH * 10) / 10,
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
  }, [bills, leads, services, crmTimePreset, crmDateFrom, crmDateTo]);

  // Filtered Existing Customers (Car Owners for After-Sales: Strictly 100% Cash/Transfer)
  const filteredExistingCustomers = useMemo(() => {
    return existingCustomers.filter(item => {
      if (!matchesCrmTime(item.purchaseDate)) return false;
      if (existingModelFilter !== 'all' && item.model !== existingModelFilter) return false;
      if (existingServiceFilter === 'has_service' && (item.services?.length ?? 0) === 0) return false;
      if (existingServiceFilter === 'no_service' && (item.services?.length ?? 0) > 0) return false;

      if (existingSearchQuery.trim()) {
        const q = existingSearchQuery.toLowerCase();
        return (
          item.customerName.toLowerCase().includes(q) ||
          item.phone.includes(q) ||
          (item.plateNumber && item.plateNumber.toLowerCase().includes(q)) ||
          (item.vin && item.vin.toLowerCase().includes(q)) ||
          (item.idCardNumber && item.idCardNumber.toLowerCase().includes(q)) ||
          item.model.toLowerCase().includes(q) ||
          (item.province && item.province.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [existingCustomers, existingModelFilter, existingServiceFilter, existingSearchQuery, crmTimePreset, crmDateFrom, crmDateTo]);

  // Dedicated Installment Customers (For Tab 3 - All Installment & Financing Customers)
  const installmentCustomers = useMemo(() => {
    const matchedLeads = leads.filter(l => {
      const isInstallment = l.paymentType === 'installment' || 
        l.paymentType === 'finance' || 
        Boolean(l.downPaymentPercent) || 
        Boolean(l.financeCompany) || 
        Boolean(l.installmentRecords && l.installmentRecords.length > 0) ||
        l.installmentStatus === 'active_repaying' ||
        l.installmentStatus === 'completed' ||
        l.installmentStatus === 'approved' ||
        l.installmentStatus === 'pending_approval';
      return isInstallment && matchesCrmTime(l.paymentDate || l.createdAt);
    });

    const seenPhones = new Set(matchedLeads.map(l => (l.phone || '').replace(/\D/g, '')).filter(Boolean));
    const extraBills = bills.filter(b => {
      const isInstBill = b.paymentMethod === 'finance' || 
        b.billType === 'installment' || 
        Boolean(b.downPaymentPercent);
      if (!isInstBill || !matchesCrmTime(b.date)) return false;
      const cleanPhone = (b.customerPhone || '').replace(/\D/g, '');
      if (cleanPhone && seenPhones.has(cleanPhone)) return false;
      if (matchedLeads.some(l => l.id === b.leadId)) return false;
      return true;
    });

    return [...matchedLeads, ...extraBills];
  }, [leads, bills, crmTimePreset, crmDateFrom, crmDateTo]);

  // Filtered Leads (For prospective Leads CRM - Strictly customers who have not yet purchased)
  const filteredLeads = useMemo(() => {
    return prospectiveLeads.filter(lead => {
      if (!matchesCrmTime(lead.createdAt || lead.paymentDate)) return false;

      // 1. Channel Filter (ໝວດຊ່ອງທາງລູກຄ້າ)
      if (channelFilter !== 'all' && lead.category !== channelFilter) return false;

      // 2. Status Filter (ສະຖານະລູກຄ້າ)
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
  }, [prospectiveLeads, channelFilter, selectedStatus, searchQuery, crmTimePreset, crmDateFrom, crmDateTo]);

  // Pagination for high scalability & Surface Pro friendly RAM usage
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [channelFilter, selectedStatus, searchQuery, crmTimePreset, crmDateFrom, crmDateTo]);

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
                <span className="rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black p-2 shadow-sm always-white-text">
                  <Users className="h-5 w-5 always-white-icon" />
                </span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-300">
                  CUSTOMER RELATIONSHIP MANAGEMENT
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {t.customerViewTitle}
              </h1>
              <p className="mt-1 max-w-2xl text-xs text-slate-600 dark:text-zinc-400 sm:text-sm">
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
                    {currentUser?.name || t.roleAdmin || 'Admin'}
                    <span className="officer-indicator-role ml-1 font-mono text-[10px]">({currentUser?.roleTitleLo?.split(' ')[0] || 'Staff'})</span>
                  </span>
                </span>
              </div>

          {/* Quick POS Sales Button */}
          {onSelectCustomerForPOS && (
            <button
              type="button"
              onClick={() => onSelectCustomerForPOS()}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all sm:flex-none cursor-pointer active:scale-95"
              title="ເປີດໜ້າຈໍ POS ຂາຍລົດຍົນ"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-white" />
              <span>{lang === 'lo' ? 'ຂາຍ POS' : lang === 'th' ? 'ขาย POS' : 'POS Sales'}</span>
            </button>
          )}

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

      {/* Primary Classification Tabs: 3 Separated Customer Categories */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 pr-1 font-semibold text-zinc-400">
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            <span>{lang === 'lo' ? 'ຊ່ວງວັນທີ:' : 'Date Range:'}</span>
          </span>
          {([
            { id: 'all', label: lang === 'lo' ? 'ທັງໝົດ' : 'All' },
            { id: 'today', label: lang === 'lo' ? 'ມື້ນີ້' : 'Today' },
            { id: '7d', label: lang === 'lo' ? '7 ວັນ' : '7 Days' },
            { id: 'month', label: lang === 'lo' ? 'ເດືອນນີ້' : 'This Month' },
            { id: 'year', label: lang === 'lo' ? 'ປີນີ້' : 'This Year' },
            { id: 'custom', label: lang === 'lo' ? 'ກຳນົດວັນທີ' : 'Custom' },
          ] as const).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setCrmTimePreset(preset.id);
                if (preset.id === 'all') {
                  setCrmDateFrom('');
                  setCrmDateTo('');
                }
              }}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                crmTimePreset === preset.id
                  ? 'bg-amber-400 text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
          {crmTimePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-1.5 pl-1">
              <input
                type="date"
                aria-label="Date from"
                value={crmDateFrom}
                onChange={(e) => setCrmDateFrom(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-mono text-white"
              />
              <span className="text-zinc-500">-</span>
              <input
                type="date"
                aria-label="Date to"
                value={crmDateTo}
                onChange={(e) => setCrmDateTo(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-mono text-white"
              />
            </div>
          )}
        </div>
        {isLoadingRangeLeads && (
          <span className="text-[11px] text-amber-400 font-semibold">ກຳລັງດຶງຂໍ້ມູນຕາມຊ່ວງເວລາ...</span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: ລູກຄ້າໃໝ່ (Leads) */}
          <button
            type="button"
            onClick={() => setCustomerClassificationTab('new_leads')}
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              customerClassificationTab === 'new_leads'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800'
            }`}
          >
            <UserPlus className={`w-4 h-4 ${customerClassificationTab === 'new_leads' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
            <span>ລູກຄ້າໃໝ່ (Leads)</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              customerClassificationTab === 'new_leads' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
            }`}>
              {prospectiveLeads.length}
            </span>
          </button>

          {/* Tab 2: ລູກຄ້າຊື້ສົດ/ໂອນ 100% */}
          <button
            type="button"
            onClick={() => setCustomerClassificationTab('existing_customers')}
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              customerClassificationTab === 'existing_customers'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${customerClassificationTab === 'existing_customers' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span>ລູກຄ້າທີ່ຊຳລະສຳເລັດແລ້ວ</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              customerClassificationTab === 'existing_customers' ? 'bg-blue-700 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
            }`}>
              {existingCustomers.length}
            </span>
          </button>

          {/* Tab 3: ລູກຄ້າຜ່ອນຊຳລະ */}
          <button
            type="button"
            onClick={() => setCustomerClassificationTab('installment_customers')}
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              customerClassificationTab === 'installment_customers'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800'
            }`}
          >
            <CreditCard className={`w-4 h-4 ${customerClassificationTab === 'installment_customers' ? 'text-white' : 'text-amber-500'}`} />
            <span>ລູກຄ້າຜ່ອນຊຳລະ</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              customerClassificationTab === 'installment_customers' ? 'bg-blue-700 text-white' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
            }`}>
              {installmentCustomers.length}
            </span>
          </button>
        </div>

        {/* Tab-Specific Primary Action Button */}
        <div>
          {customerClassificationTab === 'new_leads' && (
            <button
              type="button"
              onClick={onOpenNewLead}
              className="flex items-center gap-2 px-4 py-2.5 azure-gradient-btn rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ ເພີ່ມລູກຄ້າໃໝ່</span>
            </button>
          )}

          {customerClassificationTab === 'existing_customers' && (
            <button
              type="button"
              onClick={() => setServiceModalCustomer({ name: '', phone: '', model: vehicles[0]?.name || 'AVATR 12' })}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Wrench className="w-4 h-4" />
              <span>+ ນັດໝາຍເຂົ້າສູນບໍລິການ</span>
            </button>
          )}

          {customerClassificationTab === 'installment_customers' && (
            <div className="flex items-center gap-2">
              {onNavigateMenu && (
                <button
                  type="button"
                  onClick={() => onNavigateMenu('installment_dashboard')}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                  title="ເປີດໜ້າຈໍ Dashboard ຜ່ອນຊຳລະ"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Dashboard ຜ່ອນຊຳລະ</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectCustomerForPOS ? onSelectCustomerForPOS() : undefined}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ ສັນຍາຜ່ອນໃໝ່ (POS)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {customerClassificationTab === 'new_leads' ? (
        <>
      {/* 4 Focused KPI Metrics for New Leads Pipeline (Channels + Acquisition) */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: 'ລູກຄ້າໃໝ່ທັງໝົດ',
            value: statusCounts.all,
            caption: 'ຍັງບໍ່ທັນຕົກລົງຊື້ຂາຍ',
            icon: Users,
            tone: 'text-zinc-200',
          },
          {
            label: 'Walk-in (ໜ້າໂຊຣູມ)',
            value: channelCounts.walk_in,
            caption: 'ລູກຄ້າເຂົ້າມາຊົມລົດຕົວຈິງ',
            icon: Store,
            tone: 'text-emerald-400',
          },
          {
            label: 'Online (ສື່ສັງຄົມ)',
            value: channelCounts.online,
            caption: 'ສົນໃຈຜ່ານ Facebook/Web',
            icon: Globe,
            tone: 'text-blue-400',
          },
          {
            label: 'Event (ງານວາງສະແດງ)',
            value: channelCounts.event,
            caption: 'ຂໍ້ມູນຈາກບູດງານວາງສະແດງ',
            icon: Sparkles,
            tone: 'text-amber-400',
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-slate-500 dark:text-zinc-400">{metric.label}</p>
                  <p className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-white">{metric.value.toLocaleString()}</p>
                </div>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-zinc-900 ${metric.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-[10px] text-slate-500 dark:text-zinc-500">{metric.caption}</p>
            </div>
          );
        })}
      </div>

      {/* Main Full-Width Leads Workspace */}
      <div className="w-full space-y-4">
          
          {/* UNIFIED FILTER, SEARCH & VIEW MODE CONTROL PANEL */}
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-3.5 shadow-sm">
            {/* Row 1: Search Bar, Status Filter, Quick Shortcut & View Switcher */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ຄົ້ນຫາຊື່, ເບີໂທ, ເລກບັດ, ທີ່ຢູ່, ລຸ້ນລົດ, ເລກບິນ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status & Action Controls */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                {/* Status Dropdown Filter (Prospective stages) */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  aria-label={lang === 'lo' ? 'ກັ່ນຕອງຕາມສະຖານະ' : 'Filter by status'}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-white font-medium"
                >
                  <option value="all">{t.statusAll} ({statusCounts.all})</option>
                  <option value="new">{t.statusNew} ({statusCounts.new})</option>
                  <option value="contacted">{t.statusContacted} ({statusCounts.contacted})</option>
                  <option value="test_drive">{t.statusTestDrive} ({statusCounts.test_drive})</option>
                  <option value="negotiation">{t.statusNegotiation} ({statusCounts.negotiation})</option>
                </select>

                {/* View Mode Toggle: Cards vs Table */}
                <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                      viewMode === 'cards'
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="ມຸມມອງບັດຂໍ້ມູນ (Card View)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">ບັດ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="ມຸມມອງຕາຕະລາງ (Table View)"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">ຕາຕະລາງ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Customer Acquisition Channel Filter Pills */}
            <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Customer Channel Pills */}
                <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 font-bold px-1.5 uppercase">ຊ່ອງທາງ:</span>
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
                        onClick={() => setChannelFilter(tab.key)}
                        className={`px-2 py-1 rounded-lg text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-200 text-black font-bold shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`text-[10px] font-mono px-1 rounded-full ${isSelected ? 'bg-zinc-300 text-black' : 'text-zinc-500'}`}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clear Filters Button */}
              {(channelFilter !== 'all' || selectedStatus !== 'all' || searchQuery.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setChannelFilter('all');
                    setSelectedStatus('all');
                    setSearchQuery('');
                  }}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                  <span>{lang === 'lo' ? 'ລ້າງຕົວກອງ' : 'Clear filters'}</span>
                </button>
              )}
            </div>
          </div>

          {/* LIST HEADER & COUNT */}
          <div className="flex items-center justify-between px-1 text-xs">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'lo' ? 'ລາຍຊື່ລູກຄ້າທີ່ກຳລັງຕິດຕາມ (Leads)' : 'Prospective Leads'}
              </h2>
              <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
                ສະແດງ {filteredLeads.length.toLocaleString()} ຈາກທັງໝົດ {prospectiveLeads.length.toLocaleString()} ຄົນ
              </span>
            </div>
          </div>

          {/* CUSTOMER LIST: EMPTY STATE */}
          {filteredLeads.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shadow-inner">
                <Users className="w-6 h-6 text-zinc-500" />
              </div>
              <p className="text-sm font-semibold text-zinc-200">{t.noCustomersFound}</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {searchQuery || channelFilter !== 'all' || selectedStatus !== 'all'
                  ? 'ບໍ່ພົບຂໍ້ມູນລູກຄ້າທີ່ກົງກັບເງື່ອນໄຂການຄົ້ນຫາ ຫຼື ຕົວກອງຂອງທ່ານ'
                  : 'ຍັງບໍ່ມີຂໍ້ມູນລູກຄ້າໃນລະບົບ ທ່ານສາມາດກົດປຸ່ມ "+ ເພີ່ມລູກຄ້າໃໝ່" ເພື່ອເລີ່ມຕົ້ນບັນທຶກ'}
              </p>
              {filteredLeads.length === 0 && !searchQuery && channelFilter === 'all' && selectedStatus === 'all' && (
                <button
                  type="button"
                  onClick={onOpenNewLead}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-zinc-200 text-black shadow-lg transition-all cursor-pointer active:scale-95 mt-2"
                >
                  <Plus className="w-4 h-4 text-black" />
                  <span>{lang === 'lo' ? '+ ເພີ່ມລູກຄ້າໃໝ່' : '+ Add New Customer'}</span>
                </button>
              )}
              {(channelFilter !== 'all' || selectedStatus !== 'all' || searchQuery.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setChannelFilter('all');
                    setSelectedStatus('all');
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-all cursor-pointer active:scale-95 shadow-sm mt-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
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
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-white text-xs block">{lead.customerName}</strong>
                              {lead.priority === 'vip' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-400 text-black rounded font-bold">
                                  VIP
                                </span>
                              )}
                            </div>
                            {lead.idCardNumber && (
                              <span className="text-[10px] text-zinc-400 font-mono block">
                                ບັດ: {lead.idCardNumber}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-500 font-mono block">
                              {lead.category === 'walk_in' ? 'Walk-in' : lead.category === 'online' ? 'Online' : 'Event'} • {lead.createdAt?.slice(0, 10)}
                            </span>
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
                            <span className="text-[10px] text-zinc-300 font-sans block leading-tight max-w-[200px]" title={[lead.village, lead.district, lead.province].filter(Boolean).join(', ')}>
                              {[lead.village, lead.district, lead.province].filter(Boolean).join(', ') || '-'}
                            </span>
                            {lead.notes && (
                              <span className="text-[10px] text-amber-800 dark:text-amber-300 font-sans block italic truncate max-w-[200px]" title={lead.notes}>
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
                            <option value="delivered">{t.statusDelivered || 'ຈ່າຍແລ້ວ'}</option>
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
                            {/* POS Sale Button */}
                            {onSelectCustomerForPOS && (
                              <button
                                type="button"
                                onClick={() => onSelectCustomerForPOS(lead)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-sm active:scale-95"
                                title="ເປີດບິນຂາຍ POS ສຳລັບລູກຄ້ານີ້"
                              >
                                <ShoppingBag className="w-3 h-3" />
                                <span>{lang === 'lo' ? 'ຂາຍ POS' : lang === 'th' ? 'ขาย POS' : 'POS'}</span>
                              </button>
                            )}


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

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setLeadToDelete(lead)}
                              className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title="ລົບລູກຄ້າ"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
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
                              {lead.customerName}
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

                          {/* Contact Info, ID Card, and Registration Date Bar */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-zinc-400">
                            {/* Phone with WhatsApp Link */}
                            <button
                              type="button"
                              onClick={() => openWhatsApp(lead.phone, lead.customerName, lead.interestedModel, lang)}
                              className="font-bold text-white hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                              title="ສົນທະນາ WhatsApp"
                            >
                              <Phone className="w-3 h-3 text-zinc-400" />
                              <span>{lead.phone}</span>
                              <span className="text-[9px] bg-emerald-950/80 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/40 font-bold flex items-center gap-0.5">
                                <WhatsAppIcon className="w-2.5 h-2.5" />
                                <span>WA</span>
                              </span>
                            </button>

                            {lead.idCardNumber && (
                              <>
                                <span className="text-zinc-600 hidden sm:inline">•</span>
                                <span className="flex items-center gap-1 text-zinc-300">
                                  <span className="text-zinc-500 font-sans">ບັດ:</span>
                                  <span className="font-semibold text-white">{lead.idCardNumber}</span>
                                </span>
                              </>
                            )}

                            <span className="text-zinc-600 hidden sm:inline">•</span>
                            <span className="text-zinc-500 text-[11px]">
                              ID: {lead.id.slice(0, 8)} • ວັນທີສ້າງ: {lead.createdAt?.slice(0, 10)}
                            </span>
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
                        </select>

                        <button
                          type="button"
                          onClick={() => setLeadToDelete(lead)}
                          className="p-2 bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 rounded-xl border border-zinc-800 hover:border-red-800 transition-colors cursor-pointer shrink-0 active:scale-95"
                          title="ລົບລູກຄ້າ"
                          aria-label="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 2. Bento Stream Details: Vehicle, Complete Location & Complete Notes (Zero Truncation) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                      {/* Section A: Interested Vehicle & Dealership Source (4 cols) */}
                      <div className="md:col-span-4 space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
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
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
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
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span>ໝາຍເຫດ & ຄວາມຕ້ອງການ</span>
                        </span>
                        <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/80 min-h-[64px] flex items-center">
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
                      <div className="flex items-center gap-2">
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

                        {onSelectCustomerForPOS && (
                          <button
                            type="button"
                            onClick={() => onSelectCustomerForPOS(lead)}
                            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 text-xs"
                            title="ເປີດບິນຂາຍລົດ (POS) ແລະ ຕັດສະຕ໋ອກສຳລັບລູກຄ້ານີ້"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{lang === 'lo' ? 'ເປີດບິນຂາຍ POS' : lang === 'th' ? 'เปิดบิลขาย POS' : 'Sell POS'}</span>
                          </button>
                        )}
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
                caption: 'ຊຳລະຄົບຖ້ວນ & ມອບລົດແລ້ວ',
                icon: Car,
                tone: 'text-zinc-100',
              },
              {
                label: 'ໂອນຜ່ານບັນຊີ / QR',
                value: existingCustomers.filter(c => c.paymentType === 'transfer' || c.billRecord?.paymentMethod === 'transfer').length,
                caption: 'ຊຳລະຜ່ານ BCEL One / QR',
                icon: CheckCircle2,
                tone: 'text-emerald-400',
              },
              {
                label: 'ຊຳລະເງິນສົດ (Cash)',
                value: existingCustomers.filter(c => c.paymentType === 'cash' || c.billRecord?.paymentMethod === 'cash').length,
                caption: 'ຊຳລະເງິນສົດໜ້າໂຊຣູມ',
                icon: Banknote,
                tone: 'text-amber-400',
              },
              {
                label: 'ການຮັບປະກັນ EV ແບັດເຕີຣີ',
                value: '100%',
                caption: 'ຄຸ້ມຄອງ 8 ປີ / 160,000 km',
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
                      <p className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-white">{typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}</p>
                    </div>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-zinc-900 ${metric.tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-zinc-500">{metric.caption}</p>
                </div>
              );
            })}
          </div>

          {/* Filter & Action Toolbar for Existing Customers */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={existingSearchQuery}
                  onChange={(e) => setExistingSearchQuery(e.target.value)}
                  placeholder="ຄົ້ນຫາຊື່ລູກຄ້າ, ເບີໂທ, ທະບຽນລົດ, ເລກ VIN, ແຂວງ..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
                />
                {existingSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setExistingSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Model Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-400 font-medium">ລຸ້ນລົດ:</span>
                <select
                  value={existingModelFilter}
                  onChange={(e) => setExistingModelFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-medium"
                >
                  <option value="all">ທຸກລຸ້ນ ({existingCustomers.length})</option>
                  {vehicles.map((v) => (
                    <option key={v.id || v.name} value={v.name}>
                      {v.name} ({existingCustomers.filter(c => c.model === v.name).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-400 font-medium">ປະຫວັດສູນ:</span>
                <select
                  value={existingServiceFilter}
                  onChange={(e) => setExistingServiceFilter(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-medium"
                >
                  <option value="all">ທັງໝົດ ({existingCustomers.length})</option>
                  <option value="has_service">ມີປະຫວັດເຂົ້າສູນ ({existingCustomers.filter(c => (c.services?.length ?? 0) > 0).length})</option>
                  <option value="no_service">ຍັງບໍ່ເຄີຍເຂົ້າສູນ ({existingCustomers.filter(c => (c.services?.length ?? 0) === 0).length})</option>
                </select>
              </div>

              {/* Quick Book Service Button */}
              <button
                type="button"
                onClick={() => setServiceModalCustomer({ name: '', phone: '', model: vehicles[0]?.name || 'AVATR 12' })}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 ml-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ນັດໝາຍເຂົ້າສູນໃໝ່</span>
              </button>
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
                const leadData = owner.leadRecord;

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
                              {owner.plateNumber || 'ກຳແພງນະຄອນ (ລໍຖ້າປ້າຍ)'}
                            </span>
                            {owner.color && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-zinc-900/60 border border-zinc-800 text-zinc-400">
                                ສີ: {owner.color}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400 mt-1">
                            <span>VIN: <strong className="text-zinc-300 font-semibold">{owner.vin}</strong></span>
                            {owner.engineNumber && (
                              <span>• Motor: <strong className="text-zinc-300 font-semibold">{owner.engineNumber}</strong></span>
                            )}
                            <span className="text-zinc-500">• ມອບລົດ: {owner.purchaseDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Live Dynamic Warranty Status & Countdown Card */}
                      <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 min-w-[280px] sm:min-w-[320px] shadow-sm space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
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
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                owner.warrantyStatus === 'active' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                                owner.warrantyStatus === 'expiring' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
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
                          <p className="text-base font-extrabold text-white">{owner.customerName}</p>
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
                                {owner.currentMileageKm?.toLocaleString() || '5,000'} km
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 space-y-0.5">
                              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <BatteryCharging className="w-3 h-3 text-emerald-400" />
                                <span>ສຸຂະພາບແບັດ (SOH)</span>
                              </span>
                              <span className="font-mono font-bold text-emerald-400 text-sm block">
                                {owner.batteryHealthSOH || 99.5}%
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
                          
                          <div className="flex items-center gap-2">
                            {/* Live Service Visit Count Badge */}
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              ເຂົ້າສູນແລ້ວ {recentServices.length} ຄັ້ງ
                            </span>

                            {/* Quick Add Service Button prefilled */}
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
                              className="px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-[11px] font-bold text-zinc-200 border border-zinc-700 flex items-center gap-1 cursor-pointer transition-all"
                              title="ບັນທຶກປະຫວັດການເຂົ້າສູນໃໝ່ໃຫ້ລູກຄ້ານີ້"
                            >
                              <Plus className="w-3 h-3 text-emerald-400" />
                              <span>+ ເພີ່ມປະຫວັດ</span>
                            </button>
                          </div>
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

                                  <div>
                                    {svc.status === 'completed' && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                                        ສຳເລັດແລ້ວ
                                      </span>
                                    )}
                                    {svc.status === 'in_progress' && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/40">
                                        ກຳລັງກວດເຊັກ
                                      </span>
                                    )}
                                    {(svc.status === 'pending' || !svc.status) && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/40">
                                        ລໍຖ້າກວດເຊັກ
                                      </span>
                                    )}
                                    {svc.status === 'inspection_done' && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800/40">
                                        ກວດສອບແລ້ວ
                                      </span>
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
                          title="ເປີດຟອມນັດໝາຍເຂົ້າສູນບໍລິການ AVATR"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>ນັດໝາຍເຂົ້າສູນ (Book Service)</span>
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
                          const message = `ສະບາຍດີ ທ່ານ ${owner.customerName}, ຈາກສູນບໍລິການຫຼັງການຂາຍ AVATR Laos.\nພວກເຮົາຂໍຕິດຕາມການໃຊ້ງານລົດ ${owner.model} (ປ້າຍທະບຽນ: ${owner.plateNumber || 'ກຳແພງນະຄອນ'}). ທ່ານຕ້ອງການນັດໝາຍກວດເຊັກສະພາບລົດ ຫຼື ມີຂໍ້ສອບຖາມເພີ່ມເຕີມບໍ່?`;
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
          <InstallmentDashboardView
            leads={leads.filter(l => matchesCrmTime(l.paymentDate || l.createdAt))}
            setLeads={setLeads}
            bills={bills.filter(b => matchesCrmTime(b.date))}
            setBills={setBills}
            vehicles={vehicles}
            currentUser={currentUser}
            lang={lang}
            onNavigateMenu={onNavigateMenu || ((menu) => onSelectCustomerForPOS ? onSelectCustomerForPOS() : undefined)}
            onNavigateTab={(tab) => setCustomerClassificationTab(tab)}
          />
        </div>
      )}
    </div>

      {/* Customer Document Suite Modal (ໃບຮັບເງິນ, ໃບມອບສິດ, ໃບມອບລົດ, ຕາຕະລາງຜ່ອນ) */}
      {selectedCustomerForDocs && (
        <CustomerDocumentsModal
          isOpen={!!selectedCustomerForDocs}
          onClose={() => setSelectedCustomerForDocs(null)}
          customer={selectedCustomerForDocs}
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
            if (onAddService) {
              await onAddService(newService);
            }
            setServiceModalCustomer(null);
            showToast(`ບັນທຶກນັດໝາຍເຂົ້າສູນສຳເລັດສຳລັບ ${newService.customerName}`);
          }}
          lang={lang}
          initialCustomerName={serviceModalCustomer.name}
          initialPhone={serviceModalCustomer.phone}
          initialPlateNumber={serviceModalCustomer.plateNumber}
          initialModel={serviceModalCustomer.model}
          initialMileageKm={serviceModalCustomer.mileageKm}
          initialBatteryHealthPercent={serviceModalCustomer.batteryHealthPercent}
        />
      )}
    </div>
  );
}
