import { useState, useEffect } from 'react';
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
import { 
  AVATR_VEHICLES, 
  INITIAL_LEADS, 
  INITIAL_SERVICES, 
  INITIAL_TEST_DRIVES, 
  INITIAL_INVENTORY, 
  INITIAL_USERS, 
  INITIAL_STOCK_LOGS, 
  INITIAL_BILLS 
} from './data/mockData';
import { translations } from './data/translations';
import { 
  isFirebaseConfigured, 
  seedFirestoreIfEmpty, 
  subscribeToInventory, 
  subscribeToBills, 
  subscribeToVehicleModels, 
  subscribeToUsers, 
  deleteBillFromFirestore 
} from './firebase';
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
  ShoppingBag, 
  FileText, 
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

  // Automatic clean-up of old mock data & cached users from previous versions
  useEffect(() => {
    try {
      const isCleaned = localStorage.getItem('avatr_db_clean_init_v2');
      if (!isCleaned) {
        localStorage.removeItem('avatr_inventory_v3');
        localStorage.removeItem('avatr_inventory_v2');
        localStorage.removeItem('avatr_leads_v2');
        localStorage.removeItem('avatr_services_v2');
        localStorage.removeItem('avatr_testdrives_v2');
        localStorage.removeItem('avatr_stock_logs_v2');
        localStorage.removeItem('avatr_invoice_bills_v2');
        localStorage.removeItem('avatr_system_users_v2');
        localStorage.removeItem('avatr_system_users_prod_v1');
        localStorage.removeItem('avatr_active_user_id_v1');
        localStorage.removeItem('avatr_logged_in');
        localStorage.setItem('avatr_db_clean_init_v2', 'true');
      }
    } catch (e) {
      console.warn('Storage cleanup notice:', e);
    }
  }, []);

  const FALLBACK_EMPTY_USER: SystemUser = {
    id: 'USR-ADMIN',
    name: 'Admin (Super Admin)',
    email: '',
    phone: '',
    role: 'super_admin',
    roleTitleLo: 'Admin (Super Admin & ຜູ້ອຳນວຍການສູນ)',
    department: 'Executive Management & Direction',
    status: 'active',
    avatarInitials: 'AD',
    permissions: {
      canManageUsers: true,
      canDeleteUsers: true,
      canGrantRoles: true,
      canEditInventory: true,
      canUploadQR: true,
      canAddModels: true,
      canDeductPOS: true,
      canViewFinancials: true,
    },
    createdAt: new Date().toISOString().slice(0, 10),
  };

  // Users State (with LocalStorage persistence)
  const [users, setUsers] = useState<SystemUser[]>(() => {
    try {
      const saved = localStorage.getItem('avatr_system_users_prod_v1');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // Current logged in user
  const [currentUser, setCurrentUser] = useState<SystemUser>(() => {
    try {
      const savedId = localStorage.getItem('avatr_active_user_id_v1');
      const found = users.find(u => u.id === savedId);
      return found || users[0] || FALLBACK_EMPTY_USER;
    } catch {
      return FALLBACK_EMPTY_USER;
    }
  });

  // Leads state with localStorage persistence
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem('avatr_leads_prod_v1');
      return saved ? JSON.parse(saved) : INITIAL_LEADS;
    } catch {
      return INITIAL_LEADS;
    }
  });

  // Inventory state with localStorage persistence
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('avatr_inventory_prod_v1');
      return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
    } catch {
      return INITIAL_INVENTORY;
    }
  });

  // Services state with localStorage persistence
  const [services, setServices] = useState<ServiceAppointment[]>(() => {
    try {
      const saved = localStorage.getItem('avatr_services_prod_v1');
      return saved ? JSON.parse(saved) : INITIAL_SERVICES;
    } catch {
      return INITIAL_SERVICES;
    }
  });

  // Test Drives state with localStorage persistence
  const [testDrives, setTestDrives] = useState<TestDriveBooking[]>(() => {
    try {
      const saved = localStorage.getItem('avatr_testdrives_prod_v1');
      return saved ? JSON.parse(saved) : INITIAL_TEST_DRIVES;
    } catch {
      return INITIAL_TEST_DRIVES;
    }
  });

  // Stock Movement & Sales Logs state with localStorage persistence
  const [stockLogs, setStockLogs] = useState<StockLogRecord[]>(() => {
    try {
      const saved = localStorage.getItem('avatr_stock_logs_prod_v1');
      return saved ? JSON.parse(saved) : INITIAL_STOCK_LOGS;
    } catch {
      return INITIAL_STOCK_LOGS;
    }
  });

  // Official Bills & Invoices state with localStorage persistence
  const [bills, setBills] = useState<InvoiceBillRecord[]>(() => {
    try {
      const saved = localStorage.getItem('avatr_invoice_bills_prod_v1');
      return saved ? JSON.parse(saved) : INITIAL_BILLS;
    } catch {
      return INITIAL_BILLS;
    }
  });

  // Vehicle Models State (Admin ສາມາດເພີ່ມຕົວເລືອກລຸ້ນຍານຍົນຂຶ້ນມາໄດ້)
  const [vehicles, setVehicles] = useState<VehicleModel[]>(() => {
    try {
      const saved = localStorage.getItem('avatr_vehicle_models_prod_v1');
      return saved ? JSON.parse(saved) : AVATR_VEHICLES;
    } catch {
      return AVATR_VEHICLES;
    }
  });

  useEffect(() => {
    localStorage.setItem('avatr_vehicle_models_prod_v1', JSON.stringify(vehicles));
  }, [vehicles]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('avatr_system_users_prod_v1', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('avatr_active_user_id_v1', currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('avatr_leads_prod_v1', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('avatr_inventory_prod_v1', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('avatr_stock_logs_prod_v1', JSON.stringify(stockLogs));
  }, [stockLogs]);

  useEffect(() => {
    localStorage.setItem('avatr_invoice_bills_prod_v1', JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('avatr_services_prod_v1', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('avatr_testdrives_prod_v1', JSON.stringify(testDrives));
  }, [testDrives]);

  // Real-time Firestore Cloud Synchronization (100% Spark Free Plan)
  useEffect(() => {
    if (isFirebaseConfigured()) {
      seedFirestoreIfEmpty();

      const unsubInventory = subscribeToInventory((items) => {
        setInventory(items || []);
      });

      const unsubBills = subscribeToBills((bList) => {
        setBills(bList || []);
      });

      const unsubVehicles = subscribeToVehicleModels((models) => {
        if (models && models.length > 0) {
          setVehicles(models);
        }
      });



      const unsubUsers = subscribeToUsers((uList) => {
        const list = uList || [];
        setUsers(list);
        if (list.length > 0) {
          const savedId = localStorage.getItem('avatr_active_user_id_v1');
          const activeUpdated = list.find(u => u.id === currentUser.id) || list.find(u => u.id === savedId) || list[0];
          if (activeUpdated) {
            setCurrentUser(activeUpdated);
          }
        }
      });

      return () => {
        unsubInventory();
        unsubBills();
        unsubVehicles();
        unsubUsers();
      };
    }
  }, []);

  // Alert counts
  const lowStockCount = inventory.filter(i => i.stockQuantity === 1 && i.status !== 'sold').length;
  const outOfStockCount = inventory.filter(i => i.stockQuantity === 0).length;

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

  // Role & Admin Check
  const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';

  // Guard admin-only sections (Inventory, Stock-In, Stock Alerts)
  useEffect(() => {
    if (!isAdmin && (currentMenu === 'inventory' || currentMenu === 'stock_in' || currentMenu === 'alerts')) {
      setCurrentMenu('dashboard');
    }
  }, [currentUser.role, currentMenu, isAdmin]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const savedLoggedIn = localStorage.getItem('avatr_logged_in');
      return savedLoggedIn === 'true';
    } catch {
      return false;
    }
  });



  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('avatr_logged_in');
    localStorage.removeItem('avatr_active_user_id_v1');
    triggerToast('ທ່ານໄດ້ອອກຈາກລະບົບຮຽບຮ້ອຍແລ້ວ');
  };

  // Delete Bill Handler (Super Admin only - synced to Firestore)
  const handleDeleteBill = async (billId: string) => {
    if (currentUser.role !== 'super_admin') {
      triggerToast('ສະເພາະ Admin ເທົ່ານັ້ນທີ່ມີສິດລົບບິນ!');
      return;
    }
    try {
      await deleteBillFromFirestore(billId);
    } catch (e) {
      console.warn('Firestore delete bill fallback:', e);
    }
    setBills(prev => prev.filter(b => b.id !== billId));
    triggerToast('ລົບບິນສຳເລັດແລ້ວ!');
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Handlers
  const handleAddLead = (leadData: Omit<Lead, 'id' | 'createdAt'>) => {
    const newId = `LD-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newLead: Lead = {
      ...leadData,
      id: newId,
      createdAt: now,
    };
    setLeads(prev => [newLead, ...prev]);
    triggerToast(`ເພີ່ມຂໍ້ມູນລູກຄ້າ ${newLead.customerName} ເຂົ້າສູ່ລະບົບ CRM ສຳເລັດ!`);
  };

  const handleAddService = (serviceData: Omit<ServiceAppointment, 'id'>) => {
    const newId = `SRV-${Math.floor(800 + Math.random() * 200)}`;
    const newService: ServiceAppointment = {
      ...serviceData,
      id: newId,
    };
    setServices(prev => [newService, ...prev]);
    triggerToast(`ນັດໝາຍສ້ອມບຳລຸງລົດ ${newService.model} ບັນທຶກແລ້ວ!`);
  };

  const handleAddTestDrive = (tdData: Omit<TestDriveBooking, 'id'>) => {
    const newId = `TD-${Math.floor(300 + Math.random() * 700)}`;
    const newTd: TestDriveBooking = {
      ...tdData,
      id: newId,
    };
    setTestDrives(prev => [newTd, ...prev]);

    // Also auto-create a lead for CRM pipeline if not exists
    const leadExists = leads.some(l => l.phone.replace(/\s+/g, '') === tdData.phone.replace(/\s+/g, ''));
    if (!leadExists) {
      handleAddLead({
        customerName: tdData.customerName,
        phone: tdData.phone,
        category: 'walk_in',
        interestedModel: tdData.model as any,
        status: 'test_drive',
        priority: 'high',
        source: 'ໂຊຣູມ',
        budget: '$45,000',
        assignedTo: currentUser?.name || 'Admin',
        notes: `ຈອງທົດລອງຂັບ ${tdData.model} ວັນທີ ${tdData.date} @ ${tdData.timeSlot} ທີ່ ${tdData.location}`,
        testDriveDate: `${tdData.date} ${tdData.timeSlot}`,
      });
    }

    triggerToast(`ຢືນຢັນການຈອງທົດລອງຂັບ ${tdData.model} ຮຽບຮ້ອຍແລ້ວ!`);
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

  const handleSubmitWebInquiry = (name: string, phone: string, model: string, message: string) => {
    handleAddLead({
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

  // If user is logged out, show LoginView
  if (!isLoggedIn) {
    return (
      <LoginView
        users={users}
        onLoginSuccess={(user, remember) => {
          setCurrentUser(user);
          setIsLoggedIn(true);
          localStorage.setItem('avatr_logged_in', 'true');
          localStorage.setItem('avatr_active_user_id_v1', user.id);
          triggerToast(`${t.success}: ${user.name}`);
        }}
        onRegisterUser={(newUser) => {
          setUsers(prev => [newUser, ...prev.filter(u => u.id !== newUser.id)]);
        }}
        lang={lang}
        setLang={handleSetLang}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const t = translations[lang] || translations.lo;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row font-sans selection:bg-white selection:text-black">
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
        onSwitchUser={(u) => {
          setCurrentUser(u);
          triggerToast(`User: ${u.name} (${u.role === 'super_admin' ? t.roleSuperAdmin : t.roleGeneralUser})`);
        }}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* MAIN CONTENT CANVAS */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Strip inside Main Area */}
        <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
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
                {currentMenu === 'customers' && <Users className="w-4 h-4" />}
                {currentMenu === 'inventory' && <Car className="w-4 h-4" />}
                {currentMenu === 'stock_in' && <PackagePlus className="w-4 h-4" />}
                {currentMenu === 'pos' && <ShoppingBag className="w-4 h-4" />}
                {currentMenu === 'bills' && <FileText className="w-4 h-4" />}
                {currentMenu === 'alerts' && <AlertTriangle className="w-4 h-4" />}
                {currentMenu === 'users' && <Key className="w-4 h-4" />}
                {currentMenu === 'profile' && <UserIcon className="w-4 h-4" />}
              </span>

              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                  {currentMenu === 'dashboard' && t.headerDashboard}
                  {currentMenu === 'customers' && t.headerCustomers}
                  {currentMenu === 'inventory' && t.headerInventory}
                  {currentMenu === 'stock_in' && t.headerStockIn}
                  {currentMenu === 'pos' && t.headerPOS}
                  {currentMenu === 'bills' && t.headerBills}
                  {currentMenu === 'alerts' && t.headerAlerts}
                  {currentMenu === 'users' && t.headerUsers}
                  {currentMenu === 'profile' && t.headerProfile}
                </h2>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
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

            {/* Quick Role Switcher Pill */}
            <button
              onClick={() => {
                const nextRole = currentUser.role === 'super_admin' ? 'general_user' : 'super_admin';
                const isSuper = nextRole === 'super_admin';
                const updated: SystemUser = {
                  ...currentUser,
                  role: nextRole,
                  roleTitleLo: isSuper ? 'Admin (Super Admin & ຜູ້ອຳນວຍການສູນ)' : 'ຜູ້ໃຊ້ທົ່ວໄປ (General User)',
                  department: isSuper ? 'Executive Management & Direction' : 'General Staff',
                  permissions: {
                    canManageUsers: isSuper,
                    canDeleteUsers: isSuper,
                    canGrantRoles: isSuper,
                    canEditInventory: isSuper,
                    canUploadQR: isSuper,
                    canAddModels: isSuper,
                    canDeductPOS: true,
                    canViewFinancials: isSuper,
                  }
                };
                setCurrentUser(updated);
                setUsers(prev => {
                  const exists = prev.some(u => u.id === updated.id);
                  if (exists) {
                    return prev.map(u => u.id === updated.id ? updated : u);
                  }
                  return [updated, ...prev];
                });
                triggerToast(`${t.switchRoleBtn}: ${isSuper ? t.roleSuperAdmin : t.roleGeneralUser}`);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border shadow-sm ${
                currentUser.role === 'super_admin'
                  ? 'bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
              }`}
              title="Switch between Super Admin and General User"
            >
              {currentUser.role === 'super_admin' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">{t.roleSuperAdmin}</span>
                  <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-white text-black font-extrabold">{t.switchRoleBtn}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">{t.roleGeneralUser}</span>
                  <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">{t.switchRoleBtn}</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Content Views */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentMenu === 'dashboard' && (
            <DashboardView
              leads={leads}
              inventory={inventory}
              services={services}
              testDrives={testDrives}
              vehicles={vehicles}
              bills={bills}
              lang={lang}
              isAdmin={isAdmin}
              onNavigateMenu={(menu) => setCurrentMenu(menu)}
              onOpenNewLead={() => setIsNewLeadOpen(true)}
              onOpenQuote={handleOpenQuoteForVehicle}
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
            />
          )}

          {currentMenu === 'inventory' && isAdmin && (
            <InventoryView
              inventory={inventory}
              setInventory={setInventory}
              stockLogs={stockLogs}
              setStockLogs={setStockLogs}
              vehicles={vehicles}
              setVehicles={setVehicles}
              currentUser={currentUser}
              isSuperAdmin={isAdmin}
              lang={lang}
              onOpenQuote={handleOpenQuoteForVehicle}
              onNavigateToStockIn={() => setCurrentMenu('stock_in')}
              onNavigateToPOS={() => setCurrentMenu('pos')}
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
              isSuperAdmin={isAdmin}
              lang={lang}
              onNavigateToStock={() => setCurrentMenu('inventory')}
              onNavigateToBills={() => setCurrentMenu('bills')}
            />
          )}

          {currentMenu === 'pos' && (
            <POSSalesView
              inventory={inventory}
              setInventory={setInventory}
              bills={bills}
              setBills={setBills}
              stockLogs={stockLogs}
              setStockLogs={setStockLogs}
              vehicles={vehicles}
              currentUser={currentUser}
              lang={lang}
              onNavigateToBills={() => setCurrentMenu('bills')}
            />
          )}

          {currentMenu === 'bills' && (
            <BillsManagementView
              bills={bills}
              lang={lang}
              isSuperAdmin={isAdmin}
              onDeleteBill={handleDeleteBill}
              onOpenNewSale={() => setCurrentMenu('pos')}
              onOpenNewImport={isAdmin ? () => setCurrentMenu('stock_in') : undefined}
            />
          )}

          {currentMenu === 'alerts' && isAdmin && (
            <StockAlertsView
              inventory={inventory}
              setInventory={setInventory}
              vehicles={vehicles}
              lang={lang}
              onNavigateToStock={() => setCurrentMenu('inventory')}
            />
          )}

          {currentMenu === 'users' && (
            <UserManagementView
              currentUser={currentUser}
              users={users}
              setUsers={setUsers}
              lang={lang}
              onSwitchUser={(u) => {
                setCurrentUser(u);
                triggerToast(`ສະຫຼັບບັນຊີເປັນ: ${u.name}`);
              }}
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
              onSwitchUser={(u) => {
                setCurrentUser(u);
                triggerToast(`ສະຫຼັບບັນຊີເປັນ: ${u.name}`);
              }}
            />
          )}
        </main>
      </div>



      {/* Modals */}
      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onAddLead={handleAddLead}
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
