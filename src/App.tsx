import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { 
  Lead, 
  ServiceAppointment, 
  TestDriveBooking, 
  VehicleModel, 
  InventoryItem, 
  SystemUser, 
  StockLogRecord, 
  InvoiceBillRecord, 
  Language, 
  ActiveMenu,
  KPITimeframe
} from './types';
import { translations } from './data/translations';
import { getModelStockSummaries, isListedInStock } from './data/stockSummary';
import { isOfflineDemoEnabled, isSupabaseConfigured, supabase } from './backend/client';
import {
  clearStaffCache,
  deleteBill,
  getSignedInStaff,
  loadBackendData,
  saveLead,
  saveServiceAppointment,
  saveTestDriveBooking,
  updateServiceAppointment,
} from './backend/data';
import { DEFAULT_OFFLINE_USERS } from './backend/offlineStore';
import { getDueFollowUps, makeContactEntry } from './utils/followUp';
import { isAdminRole, canAccessMenu, normalizeRole, ROLE_LABELS } from './utils/roles';
import { isMonthlyInstallmentBill } from './utils/installment';
import { newRecordId } from './backend/ids';
// Categorized Components & Views
import { Sidebar } from './components/layout';
import AvatrLogo from './components/layout/AvatrLogo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CompanyBankInfo, getStoredCompanyBankInfo, saveStoredCompanyBankInfo } from './data/companySettings';
import { ToastContainer, showToast, ToastType, ViewSkeleton } from './components/common';
import { LoginView } from './components/auth';

const DashboardView = lazy(() => import('./components/views/DashboardView'));
const CustomerView = lazy(() => import('./components/views/CustomerView'));
const InventoryView = lazy(() => import('./components/views/InventoryView'));
const StockInView = lazy(() => import('./components/views/StockInView'));
const POSSalesView = lazy(() => import('./components/views/POSSalesView'));
const BillsManagementView = lazy(() => import('./components/views/BillsManagementView'));
const StockAlertsView = lazy(() => import('./components/views/StockAlertsView'));
const UserManagementView = lazy(() => import('./components/views/UserManagementView'));
const ProfileView = lazy(() => import('./components/views/ProfileView'));
const InstallmentDashboardView = lazy(() => import('./components/views/InstallmentDashboardView'));
const SalesLeaderboardView = lazy(() => import('./components/views/SalesLeaderboardView'));

// Lazy load heavy modals to shrink main bundle size
const NewLeadModal = lazy(() => import('./components/modals/NewLeadModal'));
const QuotationModal = lazy(() => import('./components/modals/QuotationModal'));
const ServiceModal = lazy(() => import('./components/modals/ServiceModal'));
const TestDriveModal = lazy(() => import('./components/modals/TestDriveModal'));
const CustomerPickerModal = lazy(() => import('./components/modals/CustomerPickerModal'));
import { 
  Menu, 
  LayoutDashboard, 
  Users, 
  Car, 
  PackagePlus, 
  FileText, 
  CreditCard,
  ShoppingBag,
  Trophy,
  AlertTriangle, 
  Key, 
  User as UserIcon, 
  Sun,
  Moon,
  Languages,
  RefreshCw
} from 'lucide-react';
import { fetchDocumentLogsFromCloud } from './utils/documentLogger';

export default function App() {
  const [currentMenu, setCurrentMenu] = useState<ActiveMenu>('dashboard');
  const [sharedTimeframe, setSharedTimeframe] = useState<KPITimeframe>('month');
  const [customerViewInitialTab, setCustomerViewInitialTab] = useState<'new_leads' | 'existing_customers' | 'installment_customers'>('new_leads');
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('avatr_app_lang');
      if (saved === 'lo' || saved === 'en' || saved === 'th') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'lo';
  });

  const t = translations[lang] || translations.lo;

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const isDefaultLightSet = localStorage.getItem('avatr_theme_default_light_v1');
      if (!isDefaultLightSet) {
        localStorage.setItem('avatr_theme_default_light_v1', 'true');
        localStorage.setItem('avatr_app_theme', 'light');
        return 'light';
      }
      const saved = localStorage.getItem('avatr_app_theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('avatr_app_theme', nextTheme);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  // Header language menu (opens below the language icon button)
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const langButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isLangMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isLangMenuOpen]);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem('avatr_app_lang', newLang);
      document.documentElement.lang = newLang;
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const FALLBACK_EMPTY_USER: SystemUser = {
    id: '',
    name: '',
    email: '',
    phone: '',
    role: 'sales',
    roleTitleLo: '',
    department: '',
    status: 'suspended',
    avatarInitials: '',
    createdAt: '',
  };


  const [users, setUsers] = useState<SystemUser[]>([]);
  const [currentUser, setCurrentUser] = useState<SystemUser>(FALLBACK_EMPTY_USER);
  const [leads, setLeads] = useState<Lead[]>([]);

  // Keep the signed-in user in sync when an admin edits their own account
  // from User Management (role, name, phone, department).
  useEffect(() => {
    const me = users.find(u => u.id === currentUser.id);
    if (!me) return;
    const changed =
      me.role !== currentUser.role ||
      me.roleTitleLo !== currentUser.roleTitleLo ||
      me.name !== currentUser.name ||
      me.phone !== currentUser.phone ||
      me.department !== currentUser.department;
    if (!changed) return;
    setCurrentUser(prev => ({
      ...prev,
      role: me.role,
      roleTitleLo: me.roleTitleLo,
      name: me.name,
      phone: me.phone,
      department: me.department,
      avatarInitials: me.avatarInitials || prev.avatarInitials,
    }));
  }, [users, currentUser]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [services, setServices] = useState<ServiceAppointment[]>([]);
  const [testDrives, setTestDrives] = useState<TestDriveBooking[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLogRecord[]>([]);
  const [bills, setBills] = useState<InvoiceBillRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleModel[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  const refreshBackendData = useCallback(async () => {
    // The document history is shared too: reload it with everything else
    void fetchDocumentLogsFromCloud();
    // Fast Progressive Loading: update critical catalog & leads as soon as Tier 1 completes
    const data = await loadBackendData((tier1) => {
      if (tier1.users) setUsers(tier1.users);
      if (tier1.leads) setLeads(tier1.leads);
      if (tier1.inventory) setInventory(tier1.inventory);
      if (tier1.vehicles) setVehicles(tier1.vehicles);
    });

    setUsers(data.users);
    setLeads(data.leads);
    setInventory(data.inventory);
    setServices(data.services);
    setTestDrives(data.testDrives);
    setStockLogs(data.stockLogs);
    setBills(data.bills);
    setVehicles(data.vehicles);
    if (isOfflineDemoEnabled) {
      try {
        localStorage.setItem('avatr_cached_backend_data', JSON.stringify({
          users: data.users,
          leads: data.leads,
          inventory: data.inventory,
          services: data.services,
          testDrives: data.testDrives,
          stockLogs: data.stockLogs,
          bills: data.bills,
          vehicles: data.vehicles,
        }));
      } catch {
        // ignore quota or private mode errors
      }
    } else {
      try {
        localStorage.removeItem('avatr_cached_backend_data');
      } catch {}
    }
    if (data.settings && typeof data.settings === 'object') {
      const settings = data.settings as Record<string, unknown>;
      // The company QR lives in the shared dealership settings (set by Admin only).
      // Every account takes it from there, so a stale copy in this browser never wins.
      try {
        const stored = getStoredCompanyBankInfo();
        const fromDb = (settings.companyBankInfo && typeof settings.companyBankInfo === 'object')
          ? settings.companyBankInfo as Partial<CompanyBankInfo>
          : {};
        const qr = typeof settings.companyQrImageUrl === 'string' && settings.companyQrImageUrl
          ? settings.companyQrImageUrl
          : null;
        saveStoredCompanyBankInfo({
          ...stored,
          ...fromDb,
          qrCodeUrl: qr,
          updatedAt: typeof settings.companyQrUpdatedAt === 'string' ? settings.companyQrUpdatedAt : stored.updatedAt,
          updatedBy: typeof settings.companyQrUpdatedBy === 'string' ? settings.companyQrUpdatedBy : stored.updatedBy,
        });
      } catch {
        // ignore quota or private mode errors
      }
      if (Array.isArray(settings.currencies)) {
        try {
          localStorage.setItem('avatr_custom_currencies_v1', JSON.stringify(settings.currencies));
        } catch {
          // ignore
        }
      }
    }
    // Offline demo warnings are informational, not database errors
    setBackendError(isSupabaseConfigured && data.warnings.length ? data.warnings.join(' ') : null);
  }, []);

  useEffect(() => {
    // Automatically clean any legacy "Super Admin" strings from localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('avatr_') || key.startsWith('offline_'))) {
          const val = localStorage.getItem(key);
          if (val && /Super\s*Admin/gi.test(val)) {
            localStorage.setItem(key, val.replace(/Super\s*Admin/gi, 'Admin'));
          }
        }
      }
    } catch {}

    if (!isOfflineDemoEnabled) {
      try {
        localStorage.removeItem('avatr_cached_backend_data');
        const offlineKeysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('avatr_offline_') || key.startsWith('offline_'))) {
            offlineKeysToRemove.push(key);
          }
        }
        for (const key of offlineKeysToRemove) {
          localStorage.removeItem(key);
        }
      } catch {}
    }

    if (!supabase || !isSupabaseConfigured) {
      setBackendError(null);
      if (!isOfflineDemoEnabled) {
        setIsLoggedIn(false);
        setCurrentUser(FALLBACK_EMPTY_USER);
        setIsAuthLoading(false);
        return;
      }
      void refreshBackendData();
      const savedOfflineUser = localStorage.getItem('avatr_offline_active_user');
      if (savedOfflineUser) {
        try {
          const user = JSON.parse(savedOfflineUser);
          const savedRole = user ? normalizeRole(user.role) : null;
          if (user && user.id && savedRole && user.id !== 'user-tech-01' && !user.name?.includes('ຊ່າງເຕັກນິກ')) {
            const { permissions: _legacyPermissions, ...rest } = user;
            const cleanUser: SystemUser = {
              ...rest,
              name: (user.name || '').replace(/Super\s*Admin/gi, 'Admin').trim(),
              role: savedRole,
              roleTitleLo: ROLE_LABELS[savedRole],
            };
            setCurrentUser(cleanUser);
            setIsLoggedIn(true);
          } else {
            setCurrentUser(DEFAULT_OFFLINE_USERS[0]);
            setIsLoggedIn(true);
          }
        } catch {
          setCurrentUser(DEFAULT_OFFLINE_USERS[0]);
          setIsLoggedIn(true);
        }
      } else {
        // Auto sign-in as Admin on Localhost for immediate seamless testing
        setCurrentUser(DEFAULT_OFFLINE_USERS[0]);
        setIsLoggedIn(true);
        try {
          localStorage.setItem('avatr_offline_active_user', JSON.stringify(DEFAULT_OFFLINE_USERS[0]));
        } catch {}
      }
      setIsAuthLoading(false);
      return;
    }

    let active = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        clearStaffCache();
        setIsLoggedIn(false);
        setCurrentUser(FALLBACK_EMPTY_USER);
        setUsers([]);
        setLeads([]);
        setInventory([]);
        setServices([]);
        setTestDrives([]);
        setStockLogs([]);
        setBills([]);
        setVehicles([]);
        try { localStorage.removeItem('avatr_cached_backend_data'); } catch {}
        setIsAuthLoading(false);
        return;
      }

      // Defer async calls out of the synchronous onAuthStateChange notification loop
      setTimeout(async () => {
        if (!active) return;
        try {
          const user = await getSignedInStaff(session.user.id);
          if (!active) return;
          setCurrentUser(user);
          setIsLoggedIn(true);
          setBackendError(null);
          setIsAuthLoading(false);
          // Progressive refresh in background
          void refreshBackendData();
        } catch (error: unknown) {
          if (!active) return;
          setBackendError(error instanceof Error ? error.message : 'Could not load Supabase session.');
          void supabase?.auth.signOut();
        } finally {
          if (active) setIsAuthLoading(false);
        }
      }, 0);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [refreshBackendData]);

  // Keep every account in step with the shared database: reload when the tab becomes visible again
  // and every minute while it is open (not while hidden), so changes made by other accounts show up.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshAt = useRef(0);
  const runRefresh = useCallback(async (force = false) => {
    if (!force && Date.now() - lastRefreshAt.current < 15_000) return;
    lastRefreshAt.current = Date.now();
    setIsRefreshing(true);
    try {
      await refreshBackendData();
    } catch (error) {
      console.warn('Background refresh failed:', error);
      if (force) showToast('ໂຫຼດຂໍ້ມູນໃໝ່ບໍ່ສຳເລັດ: ' + (error instanceof Error ? error.message : ''), 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshBackendData]);

  useEffect(() => {
    if (!isLoggedIn) return;
    lastRefreshAt.current = Date.now(); // the login itself just loaded everything
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void runRefresh();
    };
    const timer = window.setInterval(refreshIfVisible, 60_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [isLoggedIn, runRefresh]);

  // Alert counts: Grouped by vehicle model (ໝວດ/ລຸ້ນລົດ). If available units in stock < 5, trigger low stock alert!
  const modelStockSummaries = useMemo(() => getModelStockSummaries(vehicles, inventory), [vehicles, inventory]);
  const lowStockCount = modelStockSummaries.filter(m => m.isLowStock).length;
  const outOfStockCount = modelStockSummaries.filter(m => m.isOutOfStock).length;

  // Modal States
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const followUpDueCount = useMemo(() => getDueFollowUps(leads).length, [leads]);
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isTestDriveOpen, setIsTestDriveOpen] = useState(false);
  const [testDriveInitialModel, setTestDriveInitialModel] = useState('AVATR 12');

  const [quoteVehicle, setQuoteVehicle] = useState<VehicleModel | null>(null);
  const [quoteCustomerName, setQuoteCustomerName] = useState<string | undefined>(undefined);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);

  const [prefilledCustomerForPOS, setPrefilledCustomerForPOS] = useState<Lead | null>(null);

  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);

  // Every sale starts from a customer: without one, ask for it first (search CRM or quick-create a walk-in)
  const handleSelectCustomerForPOS = (lead?: Lead | null) => {
    if (!lead) {
      setIsCustomerPickerOpen(true);
      return;
    }
    setPrefilledCustomerForPOS(lead);
    setIsCustomerPickerOpen(false);
    setCurrentMenu('pos_sales');
  };

  // Views navigate with plain menu ids; route 'pos_sales' through the customer picker
  const navigateMenu = (menu: ActiveMenu) => {
    if (menu === 'pos_sales') handleSelectCustomerForPOS(null);
    else setCurrentMenu(menu);
  };

  // Role & Admin Check
  const isAdmin = isAdminRole(currentUser);

  // Guard admin-only sections (Inventory, Stock-In, Stock Alerts, User Management)
  useEffect(() => {
    if (!canAccessMenu(currentUser, currentMenu)) {
      setCurrentMenu('dashboard');
    }
  }, [currentUser.role, currentMenu, isAdmin]);


  const handleLogout = useCallback(async () => {
    setIsLoggedIn(false);
    setCurrentUser(FALLBACK_EMPTY_USER);
    try {
      localStorage.removeItem('avatr_offline_active_user');
      localStorage.removeItem('avatr_cached_backend_data');
    } catch {}
    try {
      await supabase?.auth.signOut();
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Sign-out failed.');
    }
    triggerToast('ທ່ານໄດ້ອອກຈາກລະບົບຮຽບຮ້ອຍແລ້ວ');
  }, []);

  // 30-minute idle session auto-logout guard for showroom workstation security
  useEffect(() => {
    if (!isLoggedIn) return;

    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void handleLogout();
        triggerToast('ເຊສຊັນໝົດອາຍຸເນື່ອງຈາກບໍ່ມີການເຄື່ອນໄຫວເກີນ 30 ນາທີ');
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [isLoggedIn, handleLogout]);

  // Delete Bill Handler (Admin only - synced to Supabase)
  /** Void a bill (Admin only). Returns true when it was voided, so batch actions can report results. */
  const handleDeleteBill = async (billId: string, options: { reason: string; silent?: boolean; bill?: InvoiceBillRecord }): Promise<boolean> => {
    if (!isAdminRole(currentUser)) {
      triggerToast('ສະເພາະ Admin ເທົ່ານັ້ນທີ່ມີສິດຍົກເລີກບິນ!', 'error');
      return false;
    }
    // Older bills loaded by the bills page date filter are not in `bills`: use the copy passed along
    const targetBill = bills.find(b => b.id === billId) || options.bill;
    if (targetBill?.status === 'voided') {
      // Voiding twice would return the same car to stock twice
      if (!options.silent) triggerToast(`ບິນ ${targetBill.billNumber} ຖືກຍົກເລີກແລ້ວ`, 'error');
      return false;
    }
    try {
      const voidInfo = await deleteBill(billId, options.reason, currentUser.name);
      setBills(prev => prev.some(b => b.id === billId)
        ? prev.map(b => b.id === billId ? { ...b, status: 'voided', ...voidInfo } : b)
        : (targetBill ? [{ ...targetBill, status: 'voided', ...voidInfo }, ...prev] : prev));
      if (targetBill?.vin) {
        const billType = targetBill.billType || targetBill.type;
        if (isMonthlyInstallmentBill(targetBill)) {
          // A monthly receipt never moved stock: leave inventory and stock logs untouched.
        } else if (billType === 'sale' || billType === 'installment') {
          setInventory(prev => {
            const exists = prev.some(item => item.vin === targetBill.vin);
            if (exists) {
              return prev.map(item =>
                item.vin === targetBill.vin ? { ...item, status: 'pdi', pdiStatus: 'pending', reservedForCustomer: undefined, stockQuantity: 1 } : item
              );
            }
            return [
              {
                vin: targetBill.vin,
                engineNumber: targetBill.engineNumber || '',
                model: targetBill.model,
                trim: targetBill.trim || '',
                plateNumber: targetBill.plateNumber || 'ລໍຖ້າຂຶ້ນທະບຽນ',
                color: targetBill.color || '-',
                colorHex: '#18181b',
                interiorColor: targetBill.interiorColor || '',
                battery: targetBill.battery || '',
                priceUSD: targetBill.unitPriceUSD || targetBill.netTotalUSD || 0,
                priceLAK: targetBill.unitPriceLAK || targetBill.netTotalLAK || 0,
                stockQuantity: 1,
                // A car coming back from a customer is checked again before it can be sold
                status: 'pdi',
                pdiStatus: 'pending',
                arrivalDate: (targetBill.date || new Date().toISOString()).slice(0, 10),
                mileageKm: 0,
              },
              ...prev,
            ];
          });
        } else if (billType === 'import') {
          const hasOtherBills = bills.some(b => b.id !== billId && b.vin === targetBill.vin && b.status !== 'voided');
          if (!hasOtherBills) {
            setInventory(prev => prev.filter(item => item.vin !== targetBill.vin));
          }
        }
        if (!isMonthlyInstallmentBill(targetBill) && (billType === 'sale' || billType === 'installment' || billType === 'import')) {
          // Same as the database: the original movement stays (marked voided) and a reversing movement is added
          const originalType = billType === 'import' ? 'stock_in' : 'stock_out';
          const reversal: StockLogRecord = {
            id: `LOG-VOID-${billId}`,
            billId,
            type: billType === 'import' ? 'import_void' : 'stock_return',
            vin: targetBill.vin,
            model: targetBill.model || '',
            plateNumber: targetBill.plateNumber || '',
            color: targetBill.color || '',
            quantity: 1,
            priceUSD: targetBill.unitPriceUSD || targetBill.netTotalUSD || 0,
            priceLAK: targetBill.unitPriceLAK || targetBill.netTotalLAK || 0,
            timestamp: voidInfo.voidedAt,
            recordedBy: voidInfo.voidedBy || currentUser.name,
            customerName: targetBill.customerName,
            customerPhone: targetBill.customerPhone,
            notes: `ຍົກເລີກບິນ ${targetBill.billNumber}: ${voidInfo.voidReason}`,
            billVoided: true,
          };
          setStockLogs(prev => [
            reversal,
            ...prev.map(log => (log.billId === billId || (log.vin === targetBill.vin && log.type === originalType && !log.billVoided))
              ? { ...log, billVoided: true }
              : log),
          ]);
        }
      }
      // A voided sale / down-payment bill means the deal is off: the customer goes back to negotiating.
      let customerNote = '';
      const billType = targetBill ? (targetBill.billType || targetBill.type) : undefined;
      if (targetBill && (billType === 'sale' || billType === 'installment') && !isMonthlyInstallmentBill(targetBill)) {
        const phone = (targetBill.customerPhone || '').replace(/\D/g, '');
        const lead = leads.find(l => l.id === targetBill.leadId) ||
          (phone.length >= 6 ? leads.find(l => (l.phone || '').replace(/\D/g, '') === phone) : undefined);
        if (lead) {
          const reverted: Lead = {
            ...lead,
            status: 'negotiation',
            paymentTypeConfirmed: undefined,
            installmentStatus: undefined,
            installmentRecords: undefined,
            isPaymentCompleted: false,
            paidAmountUSD: undefined,
            paidAmountLAK: undefined,
            paymentReceiptNo: undefined,
            vehicleDeliveredAt: undefined,
            vehicleDeliveredBy: undefined,
            vin: lead.vin === targetBill.vin ? undefined : lead.vin,
            engineNumber: lead.vin === targetBill.vin ? undefined : lead.engineNumber,
            contactHistory: [
              ...(lead.contactHistory || []),
              makeContactEntry('status', `ບິນ ${targetBill.billNumber} ຖືກຍົກເລີກ (ເຫດຜົນ: ${voidInfo.voidReason}): ກັບໄປເປັນລູກຄ້າກຳລັງຕໍ່ລອງ`, currentUser.name),
            ],
          };
          try {
            await saveLead(reverted, currentUser.id);
            setLeads(prev => prev.map(l => l.id === lead.id ? reverted : l));
            customerNote = ` ລູກຄ້າ ${lead.customerName} ກັບໄປເປັນ "ກຳລັງຕໍ່ລອງ".`;
          } catch (err) {
            customerNote = ` ແຕ່ອັບເດດລູກຄ້າບໍ່ສຳເລັດ: ${err instanceof Error ? err.message : ''}`;
          }
        }
      }
      if (!options.silent) {
        triggerToast(`ຍົກເລີກບິນ ${targetBill?.billNumber || ''} ແລ້ວ.${customerNote}`);
      }
      return true;
    } catch (error) {
      triggerToast(`ຍົກເລີກບິນ ${targetBill?.billNumber || ''} ບໍ່ສຳເລັດ: ${error instanceof Error ? error.message : 'ກະລຸນາລອງໃໝ່'}`, 'error');
      return false;
    }
  };

  const triggerToast = (msg: string, type: ToastType = 'success') => {
    showToast(msg, type);
  };

  // Handlers
  const handleAddLead = async (leadData: Omit<Lead, 'id' | 'createdAt'> & { createdAt?: string }): Promise<Lead> => {
    const newLead: Lead = { ...leadData, id: newRecordId(), createdAt: leadData.createdAt || new Date().toISOString() };
    try {
      await saveLead(newLead, currentUser.id);
      setLeads(prev => [newLead, ...prev]);
      triggerToast(`ເພີ່ມຂໍ້ມູນລູກຄ້າ ${newLead.customerName} ສຳເລັດ`);
      return newLead;
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Customer could not be saved.', 'error');
      throw error; // keep the form open with the entered data
    }
  };

  const handleUpdateLead = async (updatedLead: Lead) => {
    try {
      await saveLead(updatedLead, currentUser.id);
      setLeads(prev => prev.map(l => (l.id === updatedLead.id ? updatedLead : l)));
      triggerToast(`ແກ້ໄຂຂໍ້ມູນລູກຄ້າ ${updatedLead.customerName} ສຳເລັດ`);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Customer could not be updated.', 'error');
      throw error;
    }
  };

  const handleAddService = async (serviceData: Omit<ServiceAppointment, 'id'>) => {
    const newService: ServiceAppointment = { ...serviceData, id: newRecordId() };
    try {
      await saveServiceAppointment(newService, currentUser.id);
      setServices(prev => [newService, ...prev]);
      triggerToast(`ນັດບໍລິການ ${newService.model} ບັນທຶກແລ້ວ`);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Appointment could not be saved.', 'error');
      throw error;
    }
  };

  const handleUpdateServiceStatus = async (id: string, newStatus: ServiceAppointment['status']) => {
    const existing = services.find(s => s.id === id);
    if (!existing) return;
    const updated: ServiceAppointment = { ...existing, status: newStatus };
    try {
      await updateServiceAppointment(updated);
      setServices(prev => prev.map(s => s.id === id ? updated : s));
      triggerToast(lang === 'lo' ? 'ອັບເດດສະຖານະການບໍລິການສຳເລັດ' : 'Service status updated');
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Could not update service status', 'error');
      throw error;
    }
  };

  const handleAddTestDrive = async (tdData: Omit<TestDriveBooking, 'id'>) => {
    const newTd: TestDriveBooking = { ...tdData, id: newRecordId() };
    try {
      await saveTestDriveBooking(newTd, currentUser.id);
      setTestDrives(prev => [newTd, ...prev]);
      triggerToast(`ຈອງທົດລອງຂັບ ${tdData.model} ສຳເລັດ`);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Test drive could not be saved.');
    }
  };

  const handleOpenQuoteForVehicle = (vehicle: VehicleModel, customerName?: string) => {
    setQuoteVehicle(vehicle);
    setQuoteCustomerName(customerName);
    setIsQuoteOpen(true);
  };



  if (isAuthLoading) {
    return (
      <div className="min-h-dvh w-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
        <div className="absolute w-96 h-96 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-3 shadow-2xl backdrop-blur-md animate-pulse">
            <AvatrLogo className="w-full h-full" />
          </div>
          
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-widest uppercase font-sans text-white">
              AVATR AUTO SERVICE
            </h1>
            <p className="text-xs text-slate-400 font-mono tracking-wider">
              {lang === 'lo' ? 'ກຳລັງໂຫລດລະບົບ...' : lang === 'th' ? 'กำลังโหลดระบบ...' : 'Initializing showroom system...'}
            </p>
          </div>

          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-2">
            <div className="w-1/2 h-full bg-linear-to-r from-blue-500 to-emerald-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // If user is logged out, show LoginView
  if (!isLoggedIn) {
    return (
      <LoginView
        users={users}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLoggedIn(true);
          setBackendError(null);
          void refreshBackendData();
        }}
        lang={lang}
        setLang={handleSetLang}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="app-shell min-h-dvh bg-black text-white flex flex-col lg:flex-row font-sans selection:bg-white selection:text-black">
      {/* Modern High-Agency Luxury Toast Container */}
      <ToastContainer />

      {/* LEFT SIDEBAR */}
      <Sidebar
        currentMenu={currentMenu}
        setCurrentMenu={setCurrentMenu}
        lang={lang}
        leadCount={leads.length}
        followUpDueCount={followUpDueCount}
        stockCount={inventory.filter(isListedInStock).length}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        billsCount={bills.length}
        currentUser={currentUser}
        allUsers={users}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        onLogout={handleLogout}
      />

      {/* MAIN CONTENT CANVAS */}
      <div className="lg:pl-20 flex-1 flex flex-col min-w-0 min-h-dvh">
        {/* Top Header Strip inside Main Area */}
        <header className="app-header sticky top-0 z-30 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-slate-200/90 dark:border-zinc-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current Active Section Heading */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-zinc-900 border border-blue-200 dark:border-zinc-800 text-blue-600 dark:text-white shrink-0 shadow-2xs">
                {currentMenu === 'dashboard' && <LayoutDashboard className="w-4 h-4" />}
                {currentMenu === 'sales_leaderboard' && <Trophy className="w-4 h-4 text-amber-500" />}
                {currentMenu === 'pos_sales' && <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-emerald-400" />}
                {currentMenu === 'customers' && <Users className="w-4 h-4" />}
                {currentMenu === 'inventory' && <Car className="w-4 h-4" />}
                {currentMenu === 'stock_in' && <PackagePlus className="w-4 h-4" />}
                {currentMenu === 'bills' && <FileText className="w-4 h-4" />}
                {currentMenu === 'installment_dashboard' && <CreditCard className="w-4 h-4 text-blue-600 dark:text-amber-400" />}
                {currentMenu === 'alerts' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                {currentMenu === 'users' && <Key className="w-4 h-4" />}
                {currentMenu === 'profile' && <UserIcon className="w-4 h-4" />}
              </span>

              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {currentMenu === 'dashboard' && t.headerDashboard}
                  {currentMenu === 'sales_leaderboard' && (t.headerLeaderboard || 'ຈັດອັນດັບພະນັກງານຂາຍ Top Sales • Leaderboard')}
                  {currentMenu === 'pos_sales' && (t.headerPOS || 'POS ຂາຍລົດຍົນ • ອອກໃບບິນ & ຕັດສະຕ໋ອກ')}
                  {currentMenu === 'customers' && t.headerCustomers}
                  {currentMenu === 'inventory' && t.headerInventory}
                  {currentMenu === 'stock_in' && t.headerStockIn}
                  {currentMenu === 'bills' && t.headerBills}
                  {currentMenu === 'installment_dashboard' && t.headerInstallmentDashboard}
                  {currentMenu === 'alerts' && t.headerAlerts}
                  {currentMenu === 'users' && t.headerUsers}
                  {currentMenu === 'profile' && t.headerProfile}
                </h2>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Database Connection Status Indicator */}
            <div 
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-mono text-[11px]"
              title={backendError || (isSupabaseConfigured ? 'Supabase configured' : 'ໂໝດ Localhost Offline (ຕັດການເຊື່ອມຕໍ່ຖານຂໍ້ມູນແລ້ວ)')}
            >
              <span className={`w-2 h-2 rounded-full ${backendError ? 'bg-rose-500' : isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-slate-600 dark:text-zinc-300 font-medium">
                {backendError ? 'DB Error' : isSupabaseConfigured ? 'Supabase Cloud' : 'Localhost (Offline)'}
              </span>
            </div>

            {/* Theme Toggle (icon button, same style as the sidebar menu icons) */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
              title={theme === 'dark' ? t.lightMode : t.darkMode}
              className="header-icon-btn flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-800 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {theme === 'dark'
                ? <Sun aria-hidden="true" className="h-5 w-5" />
                : <Moon aria-hidden="true" className="h-5 w-5" />}
            </button>

            {/* Language Switcher (icon button + dropdown) */}
            <div
              ref={langMenuRef}
              className="relative"
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setIsLangMenuOpen(false);
                  langButtonRef.current?.focus();
                }
              }}
            >
              <button
                ref={langButtonRef}
                type="button"
                onClick={() => setIsLangMenuOpen((isOpen) => !isOpen)}
                aria-label={lang === 'lo' ? 'ເລືອກພາສາ' : lang === 'th' ? 'เลือกภาษา' : 'Choose language'}
                aria-expanded={isLangMenuOpen}
                aria-controls="header-language-options"
                title={lang === 'lo' ? 'ເລືອກພາສາ' : lang === 'th' ? 'เลือกภาษา' : 'Choose language'}
                className="header-icon-btn flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-800 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <Languages aria-hidden="true" className="h-5 w-5" />
              </button>
              {isLangMenuOpen && (
                <div
                  id="header-language-options"
                  role="group"
                  aria-label={lang === 'lo' ? 'ເລືອກພາສາ' : lang === 'th' ? 'เลือกภาษา' : 'Choose language'}
                  className="absolute right-0 top-full z-60 mt-2 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {([
                    { code: 'lo', short: 'LO', label: 'ລາວ' },
                    { code: 'en', short: 'EN', label: 'English' },
                    { code: 'th', short: 'TH', label: 'ไทย' },
                  ] as const).map(({ code, short, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        handleSetLang(code);
                        setIsLangMenuOpen(false);
                      }}
                      aria-label={label}
                      aria-pressed={lang === code}
                      title={label}
                      className={`flex h-10 min-w-10 items-center justify-center rounded-lg px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        lang === code
                          ? 'bg-blue-100 text-blue-800 dark:bg-zinc-700 dark:text-white'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {short}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void runRefresh(true)}
              disabled={isRefreshing}
              aria-label="ໂຫຼດຂໍ້ມູນລ່າສຸດ"
              title="ໂຫຼດຂໍ້ມູນລ່າສຸດຈາກຖານຂໍ້ມູນ (ອັບເດດເອງທຸກ 1 ນາທີ)"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-200 dark:border-zinc-700 bg-blue-50 dark:bg-zinc-900 text-blue-700 dark:text-zinc-200">{currentUser.roleTitleLo}</span>
          </div>
        </header>

        {/* Content Views */}
        <main className="app-content flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary>
            <Suspense fallback={<ViewSkeleton />}>
            {currentMenu === 'dashboard' && (
            <DashboardView
              leads={leads}
              setLeads={setLeads}
              inventory={inventory}
              services={services}
              testDrives={testDrives}
              vehicles={vehicles}
              bills={bills}
              currentUser={currentUser}
              lang={lang}
              isAdmin={isAdmin}
              activeTimeframe={sharedTimeframe}
              onTimeframeChange={setSharedTimeframe}
              onNavigateMenu={navigateMenu}
              onOpenNewLead={() => setIsNewLeadOpen(true)}
              onOpenQuote={handleOpenQuoteForVehicle}
              onOpenNewService={() => setIsServiceOpen(true)}
              onOpenNewTestDrive={() => {
                setTestDriveInitialModel('AVATR 12');
                setIsTestDriveOpen(true);
              }}
            />
          )}

          {currentMenu === 'pos_sales' && (
            <POSSalesView
              inventory={inventory}
              setInventory={setInventory}
              bills={bills}
              setBills={setBills}
              leads={leads}
              setLeads={setLeads}
              stockLogs={stockLogs}
              setStockLogs={setStockLogs}
              vehicles={vehicles}
              currentUser={currentUser}
              users={users}
              lang={lang}
              onNavigateToBills={() => setCurrentMenu('bills')}
              prefilledCustomer={prefilledCustomerForPOS}
              onClearPrefilledCustomer={() => setPrefilledCustomerForPOS(null)}
              onChooseCustomer={() => setIsCustomerPickerOpen(true)}
            />
          )}

          {currentMenu === 'customers' && (
            <CustomerView
              leads={leads}
              setLeads={setLeads}
              onEditLead={(lead) => setLeadToEdit(lead)}
              vehicles={vehicles}
              currentUser={currentUser}
              lang={lang}
              initialClassificationTab={customerViewInitialTab}
              onOpenNewLead={() => setIsNewLeadOpen(true)}
              onOpenQuote={handleOpenQuoteForVehicle}
              onSelectCustomerForPOS={handleSelectCustomerForPOS}
              onNavigateMenu={navigateMenu}
              bills={bills}
              setBills={setBills}
              services={services}
              setServices={setServices}
              onAddService={handleAddService}
              onUpdateServiceStatus={handleUpdateServiceStatus}
            />
          )}

          {currentMenu === 'inventory' && isAdmin && (
            <InventoryView
              inventory={inventory}
              setInventory={setInventory}
              setBills={setBills}
              stockLogs={stockLogs}
              setStockLogs={setStockLogs}
              vehicles={vehicles}
              setVehicles={setVehicles}
              currentUser={currentUser}
              isSuperAdmin={isAdmin}
              lang={lang}
              onOpenQuote={handleOpenQuoteForVehicle}
              onNavigateToStockIn={() => setCurrentMenu('stock_in')}
            />
          )}

          {currentMenu === 'stock_in' && isAdmin && (
            <StockInView
              inventory={inventory}
              setInventory={setInventory}
              bills={bills}
              setBills={setBills}
              stockLogs={stockLogs}
              setStockLogs={setStockLogs}
              vehicles={vehicles}
              setVehicles={setVehicles}
              currentUser={currentUser}
              isSuperAdmin={isAdmin}
              lang={lang}
              onNavigateToStock={() => setCurrentMenu('inventory')}
              onNavigateToBills={() => setCurrentMenu('bills')}
            />
          )}

          {currentMenu === 'bills' && (
            <BillsManagementView
              bills={bills}
              setBills={setBills}
              leads={leads}
              setLeads={setLeads}
              vehicles={vehicles}
              currentUser={currentUser}
              lang={lang}
              isSuperAdmin={isAdmin}
              onDeleteBill={handleDeleteBill}
              onOpenNewImport={isAdmin ? () => setCurrentMenu('stock_in') : undefined}
              onOpenNewSale={() => handleSelectCustomerForPOS(null)}
            />
          )}

          {currentMenu === 'sales_leaderboard' && (
            <SalesLeaderboardView
              bills={bills}
              leads={leads}
              vehicles={vehicles}
              currentUser={currentUser}
              lang={lang}
              initialPeriod={sharedTimeframe}
              onPeriodChange={setSharedTimeframe}
              onNavigateMenu={navigateMenu}
            />
          )}

          {currentMenu === 'installment_dashboard' && (
            <InstallmentDashboardView
              leads={leads}
              setLeads={setLeads}
              bills={bills}
              setBills={setBills}
              vehicles={vehicles}
              currentUser={currentUser}
              lang={lang}
              onNavigateMenu={navigateMenu}
              onNavigateTab={(tab) => {
                setCustomerViewInitialTab(tab);
                setCurrentMenu('customers');
              }}
            />
          )}

          {currentMenu === 'alerts' && isAdmin && (
            <StockAlertsView
              inventory={inventory}
              setInventory={setInventory}
              vehicles={vehicles}
              lang={lang}
              onNavigateToStock={() => setCurrentMenu('inventory')}
              onNavigateToStockIn={() => setCurrentMenu('stock_in')}
            />
          )}

          {currentMenu === 'users' && (
            <UserManagementView
              currentUser={currentUser}
              users={users}
              setUsers={setUsers}
              leads={leads}
              setLeads={setLeads}
              lang={lang}
            />
          )}

          {currentMenu === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              onUpdateProfile={(updated) => {
                setCurrentUser(updated);
                setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                triggerToast('ບັນທຶກຂໍ້ມູນໂປຣໄຟລ໌ສຳເລັດ!');
              }}
              onLogout={handleLogout}
              lang={lang}
              onClose={() => setCurrentMenu('dashboard')}
              users={users}
              setUsers={setUsers}
              leads={leads}
              setLeads={setLeads}
            />
          )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>



      {/* Lazy-loaded Modals with Suspense */}
      <ErrorBoundary>
        <Suspense
          fallback={
            isNewLeadOpen || Boolean(leadToEdit) || isCustomerPickerOpen || isServiceOpen || isTestDriveOpen || (quoteVehicle && isQuoteOpen) ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs text-white text-sm font-medium">
                ກຳລັງໂຫຼດ...
              </div>
            ) : null
          }
        >
        {(isNewLeadOpen || leadToEdit) && (
          <NewLeadModal
            key={leadToEdit ? `edit-${leadToEdit.id}` : 'new'}
            isOpen={isNewLeadOpen || Boolean(leadToEdit)}
            onClose={() => { setIsNewLeadOpen(false); setLeadToEdit(null); }}
            onAddLead={async (leadData) => { await handleAddLead(leadData); }}
            initialLead={leadToEdit}
            onUpdateLead={handleUpdateLead}
            existingLeads={leads}
            staffOptions={users.filter(u => u.status !== 'suspended' && (u.role === 'sales' || u.role === 'admin')).map(u => u.name)}
            vehicles={vehicles}
            inventory={inventory}
            currentUser={currentUser}
            lang={lang}
          />
        )}

        {isCustomerPickerOpen && (
          <CustomerPickerModal
            leads={leads}
            vehicles={vehicles}
            lang={lang}
            staffName={currentUser.name}
            onClose={() => setIsCustomerPickerOpen(false)}
            onPick={(lead) => handleSelectCustomerForPOS(lead)}
            onCreate={async (leadData) => {
              const created = await handleAddLead(leadData);
              handleSelectCustomerForPOS(created);
            }}
          />
        )}

        {isServiceOpen && (
          <ServiceModal
            isOpen={isServiceOpen}
            onClose={() => setIsServiceOpen(false)}
            onAddService={handleAddService}
            lang={lang}
            modelOptions={vehicles.map(v => v.name)}
          />
        )}

        {isTestDriveOpen && (
          <TestDriveModal
            isOpen={isTestDriveOpen}
            onClose={() => setIsTestDriveOpen(false)}
            onAddTestDrive={handleAddTestDrive}
            initialModel={testDriveInitialModel}
            lang={lang}
          />
        )}

        {quoteVehicle && isQuoteOpen && (
          <QuotationModal
            isOpen={isQuoteOpen}
            onClose={() => setIsQuoteOpen(false)}
            vehicle={quoteVehicle}
            customerName={quoteCustomerName}
            lang={lang}
          />
        )}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
