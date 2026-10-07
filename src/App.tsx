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
  ActiveMenu, 
  CustomCurrencyConfig 
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
import { getStoredCurrencies } from './data/currencies';
import { 
  isFirebaseConfigured, 
  seedFirestoreIfEmpty, 
  subscribeToInventory, 
  subscribeToBills, 
  subscribeToVehicleModels, 
  subscribeToDealershipConfig, 
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
  CurrencyModal,
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
  Crown, 
  Lock,
  Cloud,
  CloudCheck,
  Radio
} from 'lucide-react';

export default function App() {
  const [currentMenu, setCurrentMenu] = useState<ActiveMenu>('dashboard');
  const [lang, setLang] = useState<Language>('lo');
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
    name: 'Admin ໃຫຍ່ (Super Admin)',
    email: '',
    phone: '',
    role: 'super_admin',
    roleTitleLo: 'Admin ໃຫຍ່ (Super Admin & ຜູ້ອຳນວຍການສູນ)',
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

  // Vehicle Models State (Admin ໃຫຍ່ ສາມາດເພີ່ມຕົວເລືອກລຸ້ນຍານຍົນຂຶ້ນມາໄດ້)
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

      const unsubConfig = subscribeToDealershipConfig((cfg) => {
        if (cfg && cfg.currencies && cfg.currencies.length > 0) {
          setCurrencies(cfg.currencies);
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
        unsubConfig();
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

  // Custom Currencies State
  const [currencies, setCurrencies] = useState<CustomCurrencyConfig[]>(() => getStoredCurrencies());
  const [activeCurrency, setActiveCurrency] = useState<string>('USD');
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('avatr_logged_in');
    localStorage.removeItem('avatr_active_user_id_v1');
    triggerToast('ທ່ານໄດ້ອອກຈາກລະບົບຮຽບຮ້ອຍແລ້ວ');
  };

  // Delete Bill Handler (Super Admin only - synced to Firestore)
  const handleDeleteBill = async (billId: string) => {
    if (currentUser.role !== 'super_admin') {
      triggerToast('ສະເພາະ Admin ໃຫຍ່ ເທົ່ານັ້ນທີ່ມີສິດລົບບິນ!');
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
        assignedTo: 'ທ້າວແສງອຸໄທ',
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
      assignedTo: 'ທ້າວແສງອຸໄທ',
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
          triggerToast(`ຍິນດີຕ້ອນຮັບ: ${user.name}`);
        }}
        onRegisterUser={(newUser) => {
          setUsers(prev => [newUser, ...prev.filter(u => u.id !== newUser.id)]);
        }}
        lang={lang}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row font-sans selection:bg-white selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-zinc-900 border border-zinc-600 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LEFT SIDEBAR (ປ່ຽນເມນູມາຢູ່ດ້ານຂ້າງ ດ້ານຊ້າຍ) */}
      <Sidebar
        currentMenu={currentMenu}
        setCurrentMenu={setCurrentMenu}
        lang={lang}
        setLang={setLang}
        leadCount={leads.length}
        stockCount={inventory.length}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        billsCount={bills.length}
        currentUser={currentUser}
        allUsers={users}
        onSwitchUser={(u) => {
          setCurrentUser(u);
          triggerToast(`ສະຫຼັບບັນຊີເປັນ: ${u.name} (${u.role === 'super_admin' ? 'Admin ໃຫຍ່' : 'ຜູ້ໃຊ້ທົ່ວໄປ'})`);
        }}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        onLogout={handleLogout}
        onOpenCurrencyModal={() => setIsCurrencyModalOpen(true)}
      />

      {/* MAIN CONTENT CANVAS (OFFSET BY SIDEBAR ON LARGE SCREENS) */}
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
              <span className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 flex-shrink-0">
                {currentMenu === 'dashboard' && <LayoutDashboard className="w-4 h-4 text-emerald-400" />}
                {currentMenu === 'customers' && <Users className="w-4 h-4 text-blue-400" />}
                {currentMenu === 'inventory' && <Car className="w-4 h-4 text-white" />}
                {currentMenu === 'stock_in' && <PackagePlus className="w-4 h-4 text-blue-400" />}
                {currentMenu === 'pos' && <ShoppingBag className="w-4 h-4 text-emerald-400" />}
                {currentMenu === 'bills' && <FileText className="w-4 h-4 text-amber-400" />}
                {currentMenu === 'alerts' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {currentMenu === 'users' && <Key className="w-4 h-4 text-purple-400" />}
                {currentMenu === 'profile' && <UserIcon className="w-4 h-4 text-emerald-400" />}
              </span>

              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                  {currentMenu === 'dashboard' && 'Dashboard • ພາບລວມລະບົບ'}
                  {currentMenu === 'customers' && 'ລູກຄ້າ CRM • ຖານຂໍ້ມູນ & ຕິດຕາມ'}
                  {currentMenu === 'inventory' && 'ສະຕ໋ອກລົດ AVATR • ຄັງສິນຄ້າທັງໝົດ'}
                  {currentMenu === 'stock_in' && 'ປ້ອນນຳເຂົ້າລົດ • Stock-In Entry'}
                  {currentMenu === 'pos' && 'POS ຂາຍລົດຍົນ • ອອກໃບບິນ & ຕັດສະຕ໋ອກ'}
                  {currentMenu === 'bills' && 'ບັນທຶກບິນທັງໝົດ • ໃບຮັບ & ໃບຂາຍ'}
                  {currentMenu === 'alerts' && 'ແຈ້ງເຕືອນສະຕ໋ອກ • ໃກ້ໝົດ & ສັ່ງເພີ່ມ'}
                  {currentMenu === 'users' && 'ອະນຸຍາດສະມາຊິກ • ມອບສິດ (Admin ໃຫຍ່)'}
                  {currentMenu === 'profile' && 'ໂປຣໄຟລ໌ຜູ້ໃຊ້ • ຂໍ້ມູນບັນຊີ'}
                </h2>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons & User Profile */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Quick POS Shortcut */}
            <button
              onClick={() => setCurrentMenu('pos')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                currentMenu === 'pos'
                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
                  : 'bg-emerald-950/40 hover:bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>+ ຂາຍລົດ (POS)</span>
            </button>

            {/* Quick Stock-In Shortcut */}
            <button
              onClick={() => setCurrentMenu('stock_in')}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                currentMenu === 'stock_in'
                  ? 'bg-blue-500 text-black border-blue-400 shadow-md'
                  : 'bg-blue-950/40 hover:bg-blue-950/80 text-blue-300 border-blue-800/60'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>+ ນຳເຂົ້າລົດ</span>
            </button>

            {/* Cloud Firestore Spark Plan Live Status Indicator */}
            <div 
              className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-mono border ${
                isFirebaseConfigured()
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  : 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
              }`}
              title={
                isFirebaseConfigured()
                  ? 'Cloud Firestore & Firebase Auth (Spark Free Plan) ກຳລັງເຊື່ອມຕໍ່ Real-time'
                  : 'ລະບົບໃຊ້ IndexedDB Offline Persistence (ເພີ່ມ VITE_FIREBASE_API_KEY ເພື່ອເຊື່ອມຕໍ່ Cloud Firestore)'
              }
            >
              <span className={`w-2 h-2 rounded-full ${isFirebaseConfigured() ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
              <span>{isFirebaseConfigured() ? 'Firestore Live Sync' : 'Offline Persistence'}</span>
            </div>

            {/* Currency Button */}
            <button
              onClick={() => setIsCurrencyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="ກົດເພື່ອເບິ່ງ ຫຼື ປັບອັດຕາແລກປ່ຽນ USD / LAK / THB"
            >
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-[11px] hidden xs:inline">USD · LAK · THB</span>
            </button>

            {/* Quick Role Switcher Pill (ທົດສອບສະຫຼັບສິດ Admin ໃຫຍ່ vs User ທຳມະດາ) */}
            <button
              onClick={() => {
                const superAdminUser = users.find(u => u.role === 'super_admin') || users[0];
                const generalUser = users.find(u => u.role === 'general_user') || users[users.length - 1];
                const nextUser = currentUser.role === 'super_admin' ? generalUser : superAdminUser;
                setCurrentUser(nextUser);
                triggerToast(`ສະຫຼັບສິດເປັນ: ${nextUser.role === 'super_admin' ? '👑 Admin ໃຫຍ່ (Super Admin)' : '👤 User ທຳມະດາ (General User)'} - ${nextUser.name}`);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border shadow-sm ${
                currentUser.role === 'super_admin'
                  ? 'bg-amber-950/90 text-amber-300 border-amber-500 hover:bg-amber-900'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
              }`}
              title="ກົດເພື່ອສະຫຼັບທົດສອບລະຫວ່າງ Admin ໃຫຍ່ (Super Admin) ແລະ User ທຳມະດາ"
            >
              {currentUser.role === 'super_admin' ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="hidden sm:inline">Admin ໃຫຍ່</span>
                  <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-200">ປ່ຽນສິດ</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">User ທຳມະດາ</span>
                  <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">ປ່ຽນສິດ</span>
                </>
              )}
            </button>

            {/* Right Status Indicator (Clean Luxury Header) */}
            <button
              onClick={() => setCurrentMenu('profile')}
              className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs transition-colors border ${
                currentMenu === 'profile'
                  ? 'bg-white text-black border-white font-bold shadow-md'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
              }`}
              title="ເບິ່ງໂປຣໄຟລ໌ສ່ວນຕົວ"
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${currentUser.role === 'super_admin' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
              <span className="font-medium truncate max-w-[90px] sm:max-w-none">{currentUser.name.split(' ')[0]}</span>
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
              lang={lang}
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
              lang={lang}
              onOpenNewLead={() => setIsNewLeadOpen(true)}
              onOpenQuote={handleOpenQuoteForVehicle}
            />
          )}

          {currentMenu === 'inventory' && (
            <InventoryView
              inventory={inventory}
              setInventory={setInventory}
              stockLogs={stockLogs}
              setStockLogs={setStockLogs}
              vehicles={vehicles}
              setVehicles={setVehicles}
              isSuperAdmin={currentUser.role === 'super_admin'}
              lang={lang}
              onOpenQuote={handleOpenQuoteForVehicle}
              onNavigateToStockIn={() => setCurrentMenu('stock_in')}
              onNavigateToPOS={() => setCurrentMenu('pos')}
            />
          )}

          {currentMenu === 'stock_in' && (
            <StockInView
              inventory={inventory}
              setInventory={setInventory}
              bills={bills}
              setBills={setBills}
              stockLogs={stockLogs}
              setStockLogs={setStockLogs}
              vehicles={vehicles}
              setVehicles={setVehicles}
              isSuperAdmin={currentUser.role === 'super_admin'}
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
              isSuperAdmin={currentUser.role === 'super_admin'}
              onDeleteBill={handleDeleteBill}
              onOpenNewSale={() => setCurrentMenu('pos')}
              onOpenNewImport={() => setCurrentMenu('stock_in')}
            />
          )}

          {currentMenu === 'alerts' && (
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
            />
          )}
        </main>
      </div>

      {/* Currency Customizer Modal */}
      <CurrencyModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        currencies={currencies}
        onCurrenciesChange={setCurrencies}
        activeCurrencyCode={activeCurrency}
        onSelectActiveCurrency={setActiveCurrency}
        isSuperAdmin={currentUser.role === 'super_admin'}
      />

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
