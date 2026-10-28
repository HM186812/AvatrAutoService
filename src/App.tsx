import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
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
import { getModelStockSummaries } from './data/stockSummary';
import { isSupabaseConfigured, supabase } from './backend/client';
import {
  deleteBill,
  getSignedInStaff,
  loadBackendData,
  saveLead,
  saveServiceAppointment,
  saveTestDriveBooking,
} from './backend/data';
import { DEFAULT_OFFLINE_USERS } from './backend/offlineStore';
import { newRecordId } from './backend/ids';
// Categorized Components & Views
import { Sidebar } from './components/layout';
import AvatrLogo from './components/layout/AvatrLogo';
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
import {
  NewLeadModal,
  QuotationModal,
  ServiceModal,
  TestDriveModal,
  VehicleModal,
} from './components/modals';
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
  LogOut, 
  DollarSign, 
  Coins, 
  Plus, 
  ChevronRight, 
  ShieldCheck, 
  Lock,
  Cloud,
  CloudCheck,
  Radio,
  Sun,
  Moon
} from 'lucide-react';

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

  const [activeSection, setActiveSection] = useState('home');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const FALLBACK_EMPTY_USER: SystemUser = {
    id: '',
    name: '',
    email: '',
    phone: '',
    role: 'general_user',
    roleTitleLo: 'General User',
    department: '',
    status: 'suspended',
    avatarInitials: '',
    permissions: {
      canManageUsers: false,
      canDeleteUsers: false,
      canGrantRoles: false,
      canEditInventory: false,
      canUploadQR: false,
      canAddModels: false,
      canDeductPOS: false,
      canViewFinancials: false,
    },
    createdAt: '',
  };

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [currentUser, setCurrentUser] = useState<SystemUser>(FALLBACK_EMPTY_USER);
  const [leads, setLeads] = useState<Lead[]>([]);
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
    const data = await loadBackendData();
    setUsers(data.users);
    setLeads(data.leads);
    setInventory(data.inventory);
    setServices(data.services);
    setTestDrives(data.testDrives);
    setStockLogs(data.stockLogs);
    setBills(data.bills);
    setVehicles(data.vehicles);
    if (data.settings && typeof data.settings === 'object') {
      const settings = data.settings as Record<string, unknown>;
      if (settings.companyBankInfo) {
        try {
          localStorage.setItem('avatr_company_bank_info_v2', JSON.stringify(settings.companyBankInfo));
        } catch {
          // ignore
        }
      }
      if (Array.isArray(settings.currencies)) {
        try {
          localStorage.setItem('avatr_custom_currencies_v1', JSON.stringify(settings.currencies));
        } catch {
          // ignore
        }
      }
    }
    setBackendError(data.warnings.length ? data.warnings.join(' ') : null);
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

    if (!supabase || !isSupabaseConfigured) {
      setBackendError(null);
      void refreshBackendData();
      const savedOfflineUser = localStorage.getItem('avatr_offline_active_user');
      if (savedOfflineUser) {
        try {
          const user = JSON.parse(savedOfflineUser);
          if (user && user.id && user.id !== 'user-tech-01' && !user.name?.includes('ຊ່າງເຕັກນິກ')) {
            const cleanUser = {
              ...user,
              name: (user.name || '').replace(/Super\s*Admin/gi, 'Admin').trim(),
              roleTitleLo: user.roleTitleLo === 'Super Admin' ? 'Admin' : (user.roleTitleLo || 'Admin').replace(/Super\s*Admin/gi, 'Admin'),
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
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
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
        setIsAuthLoading(false);
        return;
      }

      try {
        const user = await getSignedInStaff(session.user.id);
        await refreshBackendData();
        if (!active) return;
        setCurrentUser(user);
        setIsLoggedIn(true);
        setBackendError(null);
      } catch (error: unknown) {
        if (!active) return;
        setBackendError(error instanceof Error ? error.message : 'Could not load Supabase session.');
        void supabase?.auth.signOut();
      } finally {
        if (active) setIsAuthLoading(false);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [refreshBackendData]);

  // Alert counts: Grouped by vehicle model (ໝວດ/ລຸ້ນລົດ). If available units in stock < 5, trigger low stock alert!
  const modelStockSummaries = useMemo(() => getModelStockSummaries(vehicles, inventory), [vehicles, inventory]);
  const lowStockCount = modelStockSummaries.filter(m => m.isLowStock).length;
  const outOfStockCount = modelStockSummaries.filter(m => m.isOutOfStock).length;

  // Active installment & leasing portfolio count
  const installmentCount = useMemo(() => {
    return leads.filter(l => 
      l.paymentType === 'installment' || 
      l.paymentType === 'finance' || 
      Boolean(l.downPaymentPercent) || 
      Boolean(l.financeCompany) || 
      Boolean(l.installmentRecords && l.installmentRecords.length > 0) ||
      l.installmentStatus === 'active_repaying' ||
      l.installmentStatus === 'completed' ||
      l.installmentStatus === 'approved' ||
      l.installmentStatus === 'pending_approval'
    ).length;
  }, [leads]);

  // Modal States
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isTestDriveOpen, setIsTestDriveOpen] = useState(false);
  const [testDriveInitialModel, setTestDriveInitialModel] = useState('AVATR 12');
  
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState<VehicleModel | null>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const [quoteVehicle, setQuoteVehicle] = useState<VehicleModel | null>(null);
  const [quoteCustomerName, setQuoteCustomerName] = useState<string | undefined>(undefined);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);

  const [prefilledCustomerForPOS, setPrefilledCustomerForPOS] = useState<Lead | null>(null);

  const handleSelectCustomerForPOS = (lead?: Lead | null) => {
    setPrefilledCustomerForPOS(lead || null);
    setCurrentMenu('pos_sales');
  };

  // Role & Admin Check
  const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';

  // Guard admin-only sections (Inventory, Stock-In, Stock Alerts, User Management)
  useEffect(() => {
    if (!isAdmin && (currentMenu === 'inventory' || currentMenu === 'stock_in' || currentMenu === 'alerts' || currentMenu === 'users')) {
      setCurrentMenu('dashboard');
    }
  }, [currentUser.role, currentMenu, isAdmin]);


  const handleLogout = async () => {
    setIsLoggedIn(false);
    setCurrentUser(FALLBACK_EMPTY_USER);
    try {
      localStorage.removeItem('avatr_offline_active_user');
    } catch {}
    try {
      await supabase?.auth.signOut();
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Sign-out failed.');
    }
    triggerToast('ທ່ານໄດ້ອອກຈາກລະບົບຮຽບຮ້ອຍແລ້ວ');
  };

  // Delete Bill Handler (Admin only - synced to Supabase)
  const handleDeleteBill = async (billId: string) => {
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
      triggerToast('ສະເພາະ Admin ເທົ່ານັ້ນທີ່ມີສິດລົບບິນ!');
      return;
    }
    try {
      const targetBill = bills.find(b => b.id === billId);
      await deleteBill(billId);
      setBills(prev => prev.filter(b => b.id !== billId));
      if (targetBill?.vin) {
        const billType = targetBill.billType || targetBill.type;
        if ((billType === 'sale' || billType === 'installment') && targetBill.installmentType !== 'monthly_installment') {
          setInventory(prev => {
            const exists = prev.some(item => item.vin === targetBill.vin);
            if (exists) {
              return prev.map(item =>
                item.vin === targetBill.vin ? { ...item, status: 'ready', stockQuantity: 1 } : item
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
                interiorColor: targetBill.interiorColor || 'Black',
                battery: targetBill.battery || 'CATL Ternary Lithium',
                priceUSD: targetBill.unitPriceUSD || targetBill.netTotalUSD || 0,
                priceLAK: targetBill.unitPriceLAK || targetBill.netTotalLAK || 0,
                stockQuantity: 1,
                status: 'ready',
                pdiStatus: 'passed',
                location: 'ໂຊຣູມໃຫຍ່ ຫຼັກ 3 ທ່າເດື່ອ',
                arrivalDate: (targetBill.date || new Date().toISOString()).slice(0, 10),
                mileageKm: 0,
              },
              ...prev,
            ];
          });
        } else if (billType === 'import') {
          const hasOtherBills = bills.some(b => b.id !== billId && b.vin === targetBill.vin);
          if (!hasOtherBills) {
            setInventory(prev => prev.filter(item => item.vin !== targetBill.vin));
          }
        }
        setStockLogs(prev => prev.filter(log => !(log.billId === billId || (log.vin === targetBill.vin && log.type === (billType === 'import' ? 'stock_in' : 'stock_out')))));
      }
      triggerToast('ລົບບິນສຳເລັດແລ້ວ!');
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Bill could not be deleted.');
    }
  };

  const triggerToast = (msg: string, type: ToastType = 'success') => {
    showToast(msg, type);
  };

  // Handlers
  const handleAddLead = async (leadData: Omit<Lead, 'id' | 'createdAt'> & { createdAt?: string }) => {
    const newLead: Lead = { ...leadData, id: newRecordId(), createdAt: leadData.createdAt || new Date().toISOString() };
    try {
      await saveLead(newLead, currentUser.id);
      setLeads(prev => [newLead, ...prev]);
      triggerToast(`ເພີ່ມຂໍ້ມູນລູກຄ້າ ${newLead.customerName} ສຳເລັດ`);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Customer could not be saved.');
    }
  };

  const handleAddService = async (serviceData: Omit<ServiceAppointment, 'id'>) => {
    const newService: ServiceAppointment = { ...serviceData, id: newRecordId() };
    try {
      await saveServiceAppointment(newService, currentUser.id);
      setServices(prev => [newService, ...prev]);
      triggerToast(`ນັດບໍລິການ ${newService.model} ບັນທຶກແລ້ວ`);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Appointment could not be saved.');
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

  const handleOpenTestDriveForModel = (modelName: string) => {
    setTestDriveInitialModel(modelName);
    setIsTestDriveOpen(true);
  };

  const handleOpenQuoteForVehicle = (vehicle: VehicleModel, customerName?: string) => {
    setQuoteVehicle(vehicle);
    setQuoteCustomerName(customerName);
    setIsQuoteOpen(true);
  };

  const handleSelectVehicle = (vehicle: VehicleModel) => {
    setSelectedVehicleForModal(vehicle);
    setIsVehicleModalOpen(true);
  };

  const handleSubmitWebInquiry = async (name: string, phone: string, model: string, message: string) => {
    await handleAddLead({
      customerName: name,
      phone: phone,
      category: 'online',
      interestedModel: model as any,
      status: 'new',
      priority: 'high',
      source: 'web',
      notes: message || 'ສອບຖາມຜ່ານແບບຟອມໜ້າເວັບໄຊທ໌',
      assignedTo: currentUser?.name || 'Admin',
    });
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
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
            <div className="w-1/2 h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full animate-pulse" />
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
        }}
        onRegisterUser={(newUser) => setUsers(prev => [newUser, ...prev.filter(u => u.id !== newUser.id)])}
        lang={lang}
        setLang={handleSetLang}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="app-shell min-h-[100dvh] bg-black text-white flex flex-col lg:flex-row font-sans selection:bg-white selection:text-black">
      {/* Modern High-Agency Luxury Toast Container */}
      <ToastContainer />

      {/* LEFT SIDEBAR */}
      <Sidebar
        currentMenu={currentMenu}
        setCurrentMenu={setCurrentMenu}
        lang={lang}
        setLang={handleSetLang}
        leadCount={leads.length}
        stockCount={inventory.length}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        billsCount={bills.length}
        installmentCount={installmentCount}
        currentUser={currentUser}
        allUsers={users}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* MAIN CONTENT CANVAS */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0 min-h-[100dvh]">
        {/* Top Header Strip inside Main Area */}
        <header className="app-header sticky top-0 z-30 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-slate-200/90 dark:border-zinc-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current Active Section Heading */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-zinc-900 border border-blue-200 dark:border-zinc-800 text-blue-600 dark:text-white flex-shrink-0 shadow-2xs">
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Database Connection Status Indicator */}
            <div 
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-mono text-[11px]"
              title={backendError || (isSupabaseConfigured ? 'Supabase configured' : 'ໂໝດ Localhost Offline (ຕັດການເຊື່ອມຕໍ່ຖານຂໍ້ມູນແລ້ວ)')}
            >
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured && !backendError ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              <span className="text-slate-600 dark:text-zinc-300 font-medium">
                {backendError ? 'DB Error' : isSupabaseConfigured ? 'Supabase Cloud' : 'Localhost (Offline)'}
              </span>
            </div>

            {/* Theme Toggle Button (Light / Night Mode) */}
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title={theme === 'dark' ? t.lightMode : t.darkMode}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-zinc-200" />
                  <span className="text-[11px] font-medium hidden sm:inline">{t.lightMode}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span className="text-[11px] font-medium hidden sm:inline">{t.darkMode}</span>
                </>
              )}
            </button>

            <span className="px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-200 dark:border-zinc-700 bg-blue-50 dark:bg-zinc-900 text-blue-700 dark:text-zinc-200">{currentUser.roleTitleLo}</span>
          </div>
        </header>

        {/* Content Views */}
        <main className="app-content flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
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
              onNavigateMenu={(menu) => setCurrentMenu(menu)}
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
              lang={lang}
              onNavigateToBills={() => setCurrentMenu('bills')}
              prefilledCustomer={prefilledCustomerForPOS}
              onClearPrefilledCustomer={() => setPrefilledCustomerForPOS(null)}
            />
          )}

          {currentMenu === 'customers' && (
            <CustomerView
              leads={leads}
              setLeads={setLeads}
              vehicles={vehicles}
              currentUser={currentUser}
              lang={lang}
              initialClassificationTab={customerViewInitialTab}
              onOpenNewLead={() => setIsNewLeadOpen(true)}
              onOpenQuote={handleOpenQuoteForVehicle}
              onSelectCustomerForPOS={handleSelectCustomerForPOS}
              onNavigateMenu={(menu) => setCurrentMenu(menu)}
              bills={bills}
              setBills={setBills}
              services={services}
              onAddService={handleAddService}
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
              onOpenNewSale={() => {
                setPrefilledCustomerForPOS(null);
                setCurrentMenu('pos_sales');
              }}
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
              onNavigateMenu={(menu) => setCurrentMenu(menu)}
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
              onNavigateMenu={(menu) => setCurrentMenu(menu)}
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
            />
          )}
          </Suspense>
        </main>
      </div>



      {/* Modals */}
      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onAddLead={handleAddLead}
        vehicles={vehicles}
        inventory={inventory}
        currentUser={currentUser}
        lang={lang}
      />

      <ServiceModal
        isOpen={isServiceOpen}
        onClose={() => setIsServiceOpen(false)}
        onAddService={handleAddService}
        lang={lang}
      />

      <TestDriveModal
        isOpen={isTestDriveOpen}
        onClose={() => setIsTestDriveOpen(false)}
        onAddTestDrive={handleAddTestDrive}
        initialModel={testDriveInitialModel}
        lang={lang}
      />

      <VehicleModal
        vehicle={selectedVehicleForModal}
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onOpenQuote={handleOpenQuoteForVehicle}
        onOpenTestDrive={handleOpenTestDriveForModel}
        lang={lang}
      />

      {quoteVehicle && (
        <QuotationModal
          isOpen={isQuoteOpen}
          onClose={() => setIsQuoteOpen(false)}
          vehicle={quoteVehicle}
          customerName={quoteCustomerName}
          lang={lang}
        />
      )}
    </div>
  );
}
