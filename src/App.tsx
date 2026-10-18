import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  ActiveMenu 
} from './types';
import { translations } from './data/translations';
import { getModelStockSummaries } from './data/stockSummary';
import { isSupabaseConfigured, supabase } from './backend/client';
import {
  clearStaffCache,
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
import { LoginView } from './components/auth';
import {
  DashboardView,
  CustomerView,
  InventoryView,
  StockInView,
  POSSalesView,
  BillsManagementView,
  StockAlertsView,
  UserManagementView,
  ProfileView,
  InstallmentDashboardView,
} from './components/views';
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
  const [isDataSyncing, setIsDataSyncing] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const inFlightSyncRef = useRef<Promise<void> | null>(null);

  const refreshBackendData = useCallback(async () => {
    if (inFlightSyncRef.current) {
      return inFlightSyncRef.current;
    }
    const syncPromise = (async () => {
      try {
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
      } finally {
        inFlightSyncRef.current = null;
      }
    })();

    inFlightSyncRef.current = syncPromise;
    return syncPromise;
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
          } else if (user && (user.id === 'user-tech-01' || user.name?.includes('ຊ່າງເຕັກນິກ'))) {
            setCurrentUser(DEFAULT_OFFLINE_USERS[0]);
            setIsLoggedIn(true);
          }
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
        setIsDataSyncing(false);
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
        if (!active) return;
        setCurrentUser(user);
        setIsLoggedIn(true);
        setIsAuthLoading(false);
        setBackendError(null);

        // Fetch remaining 11 backend tables in background (non-blocking)
        setIsDataSyncing(true);
        void refreshBackendData()
          .catch((err) => {
            if (!active) return;
            console.error('Failed to sync backend data:', err);
            setBackendError(err instanceof Error ? err.message : 'Could not load backend data.');
          })
          .finally(() => {
            if (active) setIsDataSyncing(false);
          });
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

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setIsDataSyncing(false);
    clearStaffCache();
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
        if (billType === 'sale') {
          setInventory(prev => prev.map(item =>
            item.vin === targetBill.vin ? { ...item, status: 'ready', stockQuantity: 1 } : item
          ));
        } else if (billType === 'import') {
          const hasOtherBills = bills.some(b => b.id !== billId && b.vin === targetBill.vin);
          if (!hasOtherBills) {
            setInventory(prev => prev.filter(item => item.vin !== targetBill.vin));
          }
        }
        setStockLogs(prev => prev.filter(log => !(log.vin === targetBill.vin && log.type === (billType === 'import' ? 'stock_in' : 'stock_out'))));
      }
      triggerToast('ລົບບິນສຳເລັດແລ້ວ!');
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Bill could not be deleted.');
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
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
    return <div className="min-h-screen bg-black text-white grid place-items-center">Loading…</div>;
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
          setIsDataSyncing(true);
          void refreshBackendData()
            .catch((err) => {
              console.error('Failed to sync backend data:', err);
              setBackendError(err instanceof Error ? err.message : 'Could not load backend data.');
            })
            .finally(() => {
              setIsDataSyncing(false);
            });
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
    <div className="app-shell min-h-screen bg-black text-white flex flex-col lg:flex-row font-sans selection:bg-white selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-zinc-900 border border-zinc-600 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

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
        currentUser={currentUser}
        allUsers={users}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* MAIN CONTENT CANVAS */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Strip inside Main Area */}
        <header className="app-header sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 bg-zinc-900 transition-colors flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current Active Section Heading */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white flex-shrink-0">
                {currentMenu === 'dashboard' && <LayoutDashboard className="w-4 h-4" />}
                {currentMenu === 'pos_sales' && <ShoppingBag className="w-4 h-4 text-emerald-400" />}
                {currentMenu === 'customers' && <Users className="w-4 h-4" />}
                {currentMenu === 'inventory' && <Car className="w-4 h-4" />}
                {currentMenu === 'stock_in' && <PackagePlus className="w-4 h-4" />}
                {currentMenu === 'bills' && <FileText className="w-4 h-4" />}
                {currentMenu === 'installment_dashboard' && <CreditCard className="w-4 h-4 text-amber-400" />}
                {currentMenu === 'alerts' && <AlertTriangle className="w-4 h-4" />}
                {currentMenu === 'users' && <Key className="w-4 h-4" />}
                {currentMenu === 'profile' && <UserIcon className="w-4 h-4" />}
              </span>

              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                  {currentMenu === 'dashboard' && t.headerDashboard}
                  {currentMenu === 'pos_sales' && (t.headerPOS || 'POS ຂາຍລົດຍົນ • ອອກໃບບິນ & ຕັດສະຕ໋ອກ')}
                  {currentMenu === 'customers' && t.headerCustomers}
                  {currentMenu === 'inventory' && t.headerInventory}
                  {currentMenu === 'stock_in' && t.headerStockIn}
                  {currentMenu === 'bills' && t.headerBills}
                  {currentMenu === 'installment_dashboard' && (lang === 'lo' ? 'Dashboard ຜ່ອນຊຳລະ & ເງິນດາວ (Leasing & Installment Portfolio)' : 'Installment & Down Payment Dashboard')}
                  {currentMenu === 'alerts' && t.headerAlerts}
                  {currentMenu === 'users' && t.headerUsers}
                  {currentMenu === 'profile' && t.headerProfile}
                </h2>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Supabase Cloud Connection Status Indicator */}
            <div 
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs bg-zinc-900 border border-zinc-800 font-mono text-[11px]"
              title={backendError || (isSupabaseConfigured ? 'Supabase configured' : 'Supabase is not configured')}
            >
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured && !backendError ? (isDataSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse') : 'bg-amber-400'}`}></span>
              <span className="text-zinc-300">
                {backendError ? 'DB Error' : isDataSyncing ? (lang === 'th' ? 'กำลังซิงก์ข้อมูล...' : lang === 'lo' ? 'ກຳລັງຊິ້ງຂໍ້ມູນ...' : 'Syncing data...') : isSupabaseConfigured ? 'Supabase Cloud' : 'Not Connected'}
              </span>
            </div>

            {/* Theme Toggle Button (Light / Night Mode) */}
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title={theme === 'dark' ? t.lightMode : t.darkMode}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-zinc-200" />
                  <span className="text-[11px] font-medium hidden sm:inline">{t.lightMode}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-zinc-800" />
                  <span className="text-[11px] font-medium hidden sm:inline">{t.darkMode}</span>
                </>
              )}
            </button>

            <span className="px-3 py-1.5 rounded-xl text-xs font-bold border border-zinc-700 bg-zinc-900 text-zinc-200">{currentUser.roleTitleLo}</span>
          </div>
        </header>

        {/* Content Views */}
        <main className="app-content flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
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
              onNavigateMenu={(menu) => setCurrentMenu(menu)}
              onOpenNewLead={() => setIsNewLeadOpen(true)}
              onOpenQuote={handleOpenQuoteForVehicle}
            />
          )}

          {currentMenu === 'pos_sales' && (
            <POSSalesView
              inventory={inventory}
              setInventory={setInventory}
              bills={bills}
              setBills={setBills}
              leads={leads}
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
              onOpenNewLead={() => setIsNewLeadOpen(true)}
              onOpenQuote={handleOpenQuoteForVehicle}
              onSelectCustomerForPOS={handleSelectCustomerForPOS}
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

          {currentMenu === 'installment_dashboard' && (
            <InstallmentDashboardView
              leads={leads}
              setLeads={setLeads}
              bills={bills}
              vehicles={vehicles}
              currentUser={currentUser}
              lang={lang}
              onNavigateMenu={(menu) => setCurrentMenu(menu)}
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
        </main>
      </div>



      {/* Modals */}
      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onAddLead={handleAddLead}
        vehicles={vehicles}
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
