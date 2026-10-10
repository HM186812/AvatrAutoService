import { lazy, Suspense, useState, useEffect, useRef } from 'react';
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
import { getModelStockCounts, isLowStock, isOutOfStock } from './data/stockSummary';
import { isSupabaseConfigured, requireSupabase } from './backend/client';
import { newRecordId } from './backend/ids';
import {
  getSignedInStaff,
  loadBackendData,
  saveBillRecord,
  saveInventoryItem as persistInventoryItem,
  saveLead,
  saveStaffProfile,
  saveVehicleModel,
  saveServiceAppointment,
  saveTestDriveBooking,
  updateServiceAppointment,
  updateTestDriveBooking,
  linkTestDriveToCustomer,
  signInStaff,
  deleteBill,
  deleteInventoryItem,
} from './backend/data';
// Categorized Components & Views
import { Sidebar } from './components/layout';
import { LoginView } from './components/auth';
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
  CalendarDays,
  Plus, 
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

const DashboardView = lazy(() => import('./components/views/DashboardView'));
const CustomerView = lazy(() => import('./components/views/CustomerView'));
const InventoryView = lazy(() => import('./components/views/InventoryView'));
const StockInView = lazy(() => import('./components/views/StockInView'));
const POSSalesView = lazy(() => import('./components/views/POSSalesView'));
const BillsManagementView = lazy(() => import('./components/views/BillsManagementView'));
const StockAlertsView = lazy(() => import('./components/views/StockAlertsView'));
const AppointmentsView = lazy(() => import('./components/views/AppointmentsView'));
const UserManagementView = lazy(() => import('./components/views/UserManagementView'));
const ProfileView = lazy(() => import('./components/views/ProfileView'));
const NewLeadModal = lazy(() => import('./components/modals/NewLeadModal'));
const QuotationModal = lazy(() => import('./components/modals/QuotationModal'));
const ServiceModal = lazy(() => import('./components/modals/ServiceModal'));
const TestDriveModal = lazy(() => import('./components/modals/TestDriveModal'));
const VehicleModal = lazy(() => import('./components/modals/VehicleModal'));

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

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const FALLBACK_EMPTY_USER: SystemUser = {
    id: '',
    name: '',
    email: '',
    phone: '',
    role: 'general_user',
    roleTitleLo: 'General User',
    department: '',
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
      canUpdatePDI: false,
      canViewVehicles: false,
    },
    status: 'suspended',
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
  const [dealershipSettings, setDealershipSettings] = useState<Record<string, unknown>>({});
  const [posInitialVin, setPosInitialVin] = useState<string | undefined>();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const leadsRef = useRef<Lead[]>([]);
  const databaseWriteQueue = useRef<Promise<void>>(Promise.resolve());
  const leadWriteQueue = databaseWriteQueue;
  const inventoryRef = useRef<InventoryItem[]>([]);
  const inventoryWriteQueue = databaseWriteQueue;
  const billRef = useRef<InvoiceBillRecord[]>([]);
  const billWriteQueue = databaseWriteQueue;
  const modelRef = useRef<VehicleModel[]>([]);
  const modelWriteQueue = databaseWriteQueue;

  const queueWrite = (queue: React.MutableRefObject<Promise<void>>, operation: () => Promise<void>, fallback: string) => {
    queue.current = queue.current
      .catch(() => undefined)
      .then(operation)
      .catch((error: unknown) => {
        const message = error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : fallback;
        setBackendError((previous) => previous ? `${previous} | ${message || fallback}` : message || fallback);
      });
  };

  const setLeadsAndPersist: React.Dispatch<React.SetStateAction<Lead[]>> = (update) => {
    const previous = leadsRef.current;
    const requested = typeof update === 'function' ? update(previous) : update;
    const next = requested.map((lead) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(lead.id)
      ? lead
      : { ...lead, id: newRecordId() });
    leadsRef.current = next;
    setLeads(next);

    const oldById = new Map(previous.map((lead) => [lead.id, lead]));
    const changed = next.filter((lead) => JSON.stringify(oldById.get(lead.id)) !== JSON.stringify(lead));
    if (changed.length > 0 && currentUser.id) {
      queueWrite(leadWriteQueue, async () => {
        try {
          for (const lead of changed) await saveLead(lead, currentUser.id);
        } catch (error) {
          // Drop the unsaved changes from the screen so it matches the database.
          try {
            applyBackendData(await loadBackendData());
          } catch {
            // Keep the original save error visible if refreshing also fails.
          }
          throw error;
        }
      }, 'Could not save customer data.');
    }
  };

  const setInventoryAndPersist: React.Dispatch<React.SetStateAction<InventoryItem[]>> = (update) => {
    const previous = inventoryRef.current;
    const next = typeof update === 'function' ? update(previous) : update;
    inventoryRef.current = next;
    setInventory(next);
    const oldByVin = new Map(previous.map((item) => [item.vin, item]));
    const newByVin = new Map(next.map((item) => [item.vin, item]));
    const changed = next.filter((item) => JSON.stringify(oldByVin.get(item.vin)) !== JSON.stringify(item));
    const removed = previous.filter((item) => !newByVin.has(item.vin));
    const changedOutsideSale = changed.filter((item) => {
      const previousItem = oldByVin.get(item.vin);
      return !(previousItem?.status !== 'sold' && item.status === 'sold');
    });
    if ((changedOutsideSale.length || removed.length) && currentUser.id) {
      queueWrite(inventoryWriteQueue, async () => {
        try {
          for (const item of changedOutsideSale) await persistInventoryItem(item);
          for (const item of removed) await deleteInventoryItem(item.vin);
        } catch (error) {
          try {
            applyBackendData(await loadBackendData());
          } catch {
            // Keep the original save error visible if refreshing also fails.
          }
          throw error;
        }
      }, 'Could not save inventory.');
    }
  };

  const setBillsAndPersist: React.Dispatch<React.SetStateAction<InvoiceBillRecord[]>> = (update) => {
    const previous = billRef.current;
    const requested = typeof update === 'function' ? update(previous) : update;
    const next = requested.map((bill) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bill.id)
      ? bill
      : { ...bill, id: newRecordId() });
    billRef.current = next;
    setBills(next);
    const oldById = new Map(previous.map((bill) => [bill.id, bill]));
    const added = next.filter((bill) => !oldById.has(bill.id));
    if (added.length && currentUser.id) {
      queueWrite(billWriteQueue, async () => {
        try {
          for (const bill of added) await saveBillRecord(bill, currentUser.id);
        } catch (error) {
          // A failed sale transaction must restore the current stock view from the database.
          try {
            applyBackendData(await loadBackendData());
          } catch {
            // Keep the original save error visible if refreshing also fails.
          }
          throw error;
        }
      }, 'Could not save bill and stock movement.');
    }
  };

  const handleRecordStockIn = async (item: InventoryItem, bill: InvoiceBillRecord, log: StockLogRecord) => {
    await persistInventoryItem(item);
    try {
      await saveBillRecord(bill, currentUser.id);
    } catch (error) {
      try {
        await deleteInventoryItem(item.vin);
      } catch (rollbackError) {
        const rollbackMessage = rollbackError instanceof Error ? rollbackError.message : 'Could not roll back the inventory row.';
        throw new Error(`${error instanceof Error ? error.message : 'Could not save the stock-in bill.'} Inventory rollback also failed: ${rollbackMessage}`);
      }
      throw error;
    }

    const nextInventory = [item, ...inventoryRef.current.filter((existing) => existing.vin !== item.vin)];
    inventoryRef.current = nextInventory;
    setInventory(nextInventory);
    const nextBills = [bill, ...billRef.current.filter((existing) => existing.id !== bill.id)];
    billRef.current = nextBills;
    setBills(nextBills);
    setStockLogs((previous) => [log, ...previous]);
  };

  const setVehiclesAndPersist: React.Dispatch<React.SetStateAction<VehicleModel[]>> = (update) => {
    const previous = modelRef.current;
    const next = typeof update === 'function' ? update(previous) : update;
    modelRef.current = next;
    setVehicles(next);
    const oldById = new Map(previous.map((model) => [model.id, model]));
    const changed = next.filter((model) => JSON.stringify(oldById.get(model.id)) !== JSON.stringify(model));
    if (changed.length && currentUser.id) {
      queueWrite(modelWriteQueue, async () => {
        try {
          for (const model of changed) await saveVehicleModel(model, currentUser.id);
        } catch (error) {
          // Drop the unsaved models from the screen so it matches the database.
          try {
            applyBackendData(await loadBackendData());
          } catch {
            // Keep the original save error visible if refreshing also fails.
          }
          throw error;
        }
      }, 'Could not save vehicle model.');
    }
  };

  const applyBackendData = (data: Awaited<ReturnType<typeof loadBackendData>>) => {
    setUsers(data.users);
    setLeads(data.leads);
    leadsRef.current = data.leads;
    setInventory(data.inventory);
    inventoryRef.current = data.inventory;
    setStockLogs(data.stockLogs);
    setBills(data.bills);
    billRef.current = data.bills;
    setVehicles(data.vehicles);
    modelRef.current = data.vehicles;
    setServices(data.services);
    setTestDrives(data.testDrives);
    setDealershipSettings(data.settings);
  };

  const loadDataForUser = async (userId: string) => {
    const staff = await getSignedInStaff(userId);
    const data = await loadBackendData();
    setCurrentUser(staff);
    applyBackendData(data);
    setIsLoggedIn(true);
    setBackendError(data.warnings.length ? data.warnings.join(' | ') : null);
    return staff;
  };

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) {
      setBackendError('ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ก่อนเชื่อมต่อ Supabase');
      setIsAuthLoading(false);
      return;
    }

    const client = requireSupabase();
    const { data: authListener } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && active) {
        setIsLoggedIn(false);
        setCurrentUser(FALLBACK_EMPTY_USER);
        setUsers([]);
        setLeads([]);
        setInventory([]);
        setStockLogs([]);
        setBills([]);
        setVehicles([]);
      }
    });

    void client.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error) throw error;
      if (data.session?.user) await loadDataForUser(data.session.user.id);
    }).catch(async (error: unknown) => {
      if (!active) return;
      await client.auth.signOut();
      setBackendError(error instanceof Error ? error.message : 'Could not restore the Supabase session.');
    }).finally(() => {
      if (active) setIsAuthLoading(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Alert counts
  const modelStockCounts = getModelStockCounts(vehicles, inventory);
  const lowStockCount = modelStockCounts.filter(({ count }) => isLowStock(count)).length;
  const outOfStockCount = modelStockCounts.filter(({ count }) => isOutOfStock(count)).length;

  // Modal States
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isTestDriveOpen, setIsTestDriveOpen] = useState(false);
  const [testDriveInitialModel, setTestDriveInitialModel] = useState('');
  
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState<VehicleModel | null>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const [quoteVehicle, setQuoteVehicle] = useState<VehicleModel | null>(null);
  const [quoteCustomerName, setQuoteCustomerName] = useState<string | undefined>(undefined);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);

  // Role & Admin Check
  const isAdmin = Boolean(currentUser.permissions.canEditInventory);

  // Keep the selected page inside the signed-in user's current permissions.
  useEffect(() => {
    if (!isAdmin && (currentMenu === 'inventory' || currentMenu === 'stock_in' || currentMenu === 'alerts')) {
      setCurrentMenu('dashboard');
    }
    if (currentMenu === 'users' && !currentUser.permissions.canManageUsers) setCurrentMenu('dashboard');
    if (currentMenu === 'appointments' && !currentUser.permissions.canDeductPOS && !currentUser.permissions.canUpdatePDI && !currentUser.permissions.canManageUsers) setCurrentMenu('dashboard');
  }, [currentUser.permissions, currentMenu, isAdmin]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = translations[lang] || translations.lo;

  const handleLogout = async () => {
    try {
      await requireSupabase().auth.signOut();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : 'Sign-out failed.');
    }
    setIsLoggedIn(false);
    setCurrentUser(FALLBACK_EMPTY_USER);
    setUsers([]);
    setLeads([]);
    leadsRef.current = [];
    setInventory([]);
    setStockLogs([]);
    setBills([]);
    setVehicles([]);
  };

  // Delete Bill Handler (database policy remains the final permission check)
  const handleDeleteBill = async (billId: string) => {
    if (!currentUser.permissions.canDeleteUsers) {
      triggerToast('ບໍ່ມີສິດລຶບບິນ');
      return;
    }
    try {
      await deleteBill(billId);
      applyBackendData(await loadBackendData());
      triggerToast('ລົບບິນສຳເລັດແລ້ວ!');
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'ລຶບບິນບໍ່ສຳເລັດ');
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Handlers
  const handleAddLead = async (leadData: Omit<Lead, 'id' | 'createdAt'>, rethrow = false) => {
    const now = new Date().toISOString();
    const newLead: Lead = {
      ...leadData,
      id: newRecordId(),
      createdAt: now,
    };
    try {
      await saveLead(newLead, currentUser.id);
      leadsRef.current = [newLead, ...leadsRef.current];
      setLeads(leadsRef.current);
      triggerToast(`ເພີ່ມຂໍ້ມູນລູກຄ້າ ${newLead.customerName} ສຳເລັດ!`);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'ບັນທຶກລູກຄ້າບໍ່ສຳເລັດ');
      if (rethrow) throw error;
    }
  };

  const handleAddService = async (serviceData: Omit<ServiceAppointment, 'id'>) => {
    const newId = newRecordId();
    const newService: ServiceAppointment = {
      ...serviceData,
      id: newId,
    };
    try {
      await saveServiceAppointment(newService, currentUser.id);
      setServices(prev => [newService, ...prev]);
      triggerToast(`ນັດໝາຍສ້ອມບຳລຸງລົດ ${newService.model} ບັນທຶກແລ້ວ!`);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'ບັນທຶກນັດຊ່າງບໍ່ສຳເລັດ');
    }
  };

  const handleAddTestDrive = async (tdData: Omit<TestDriveBooking, 'id'>) => {
    const newId = newRecordId();
    const newTd: TestDriveBooking = {
      ...tdData,
      id: newId,
    };
    try {
      await saveTestDriveBooking(newTd, currentUser.id);
      setTestDrives(prev => [newTd, ...prev]);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'ບັນທຶກການຈອງບໍ່ສຳເລັດ');
      return;
    }

    // Add the lead only after the booking is safely stored, so a failed booking
    // cannot leave a customer follow-up record behind.
    const leadExists = leadsRef.current.some(l => l.phone.replace(/\s+/g, '') === tdData.phone.replace(/\s+/g, ''));
    if (!leadExists) {
      try {
        await handleAddLead({
          customerName: tdData.customerName,
          phone: tdData.phone,
          category: 'walk_in',
          interestedModel: tdData.model as any,
          status: 'test_drive',
          priority: 'high',
          source: 'ໂຊຣູມ',
          assignedTo: currentUser.name,
          notes: `ຈອງທົດລອງຂັບ ${tdData.model} ວັນທີ ${tdData.date} @ ${tdData.timeSlot} ທີ່ ${tdData.location}`,
          testDriveDate: `${tdData.date} ${tdData.timeSlot}`,
        }, true);
        // The booking was saved before this customer existed, so link it now.
        await linkTestDriveToCustomer(newTd.id, tdData.phone);
      } catch (error) {
        triggerToast(`ບັນທຶກການຈອງແລ້ວ ແຕ່ບັນທຶກລູກຄ້າບໍ່ສຳເລັດ: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
    }

    triggerToast(`ຢືນຢັນການຈອງທົດລອງຂັບ ${tdData.model} ຮຽບຮ້ອຍແລ້ວ!`);
  };

  const handleChangeServiceStatus = async (id: string, status: ServiceAppointment['status']) => {
    const appointment = services.find((item) => item.id === id);
    if (!appointment) return;
    const updated = { ...appointment, status };
    try {
      await updateServiceAppointment(updated);
      setServices((previous) => previous.map((item) => item.id === id ? updated : item));
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'ອັບເດດສະຖານະນັດຊ່າງບໍ່ສຳເລັດ');
    }
  };

  const handleChangeTestDriveStatus = async (id: string, status: TestDriveBooking['status']) => {
    const booking = testDrives.find((item) => item.id === id);
    if (!booking) return;
    const updated = { ...booking, status };
    try {
      await updateTestDriveBooking(updated);
      setTestDrives((previous) => previous.map((item) => item.id === id ? updated : item));
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'ອັບເດດສະຖານະການຈອງບໍ່ສຳເລັດ');
    }
  };

  useEffect(() => {
    if (vehicles.length && !vehicles.some((vehicle) => vehicle.name === testDriveInitialModel)) {
      setTestDriveInitialModel(vehicles[0].name);
    }
  }, [vehicles, testDriveInitialModel]);

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
    try {
      await handleAddLead({
        customerName: name,
        phone,
        category: 'online',
        interestedModel: model as any,
        status: 'new',
        priority: 'high',
        source: 'web',
        notes: message || 'ສອບຖາມຜ່ານແບບຟອມໜ້າເວັບໄຊທ໌',
        assignedTo: currentUser?.name || 'Admin',
      }, true);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'ບັນທຶກຂໍ້ສອບຖາມບໍ່ສຳເລັດ');
    }
  };

  // If user is logged out, show LoginView
  if (!isLoggedIn) {
    if (isAuthLoading) {
      return <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center text-sm">Connecting to Supabase…</div>;
    }
    return (
      <LoginView
        onLogin={async (email, password) => {
          const user = await signInStaff(email, password);
          await loadDataForUser(user.id);
          return user;
        }}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLoggedIn(true);
          triggerToast(`${t.success}: ${user.name}`);
        }}
        lang={lang}
        theme={theme}
        onToggleTheme={toggleTheme}
        setupError={backendError}
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
                {currentMenu === 'appointments' && <CalendarDays className="w-4 h-4" />}
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
                  {currentMenu === 'appointments' && (lang === 'en' ? 'Appointments' : lang === 'th' ? 'นัดหมาย' : 'ນັດໝາຍ')}
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

            <span className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200">
              {currentUser.roleTitleLo}
            </span>
          </div>
        </header>

        {backendError && (
          <div role="alert" className="mx-4 mt-4 sm:mx-8 p-3 rounded-xl border border-red-900 bg-red-950/60 text-red-200 text-xs flex items-center justify-between gap-3">
            <span>{backendError}</span>
            <button type="button" onClick={() => setBackendError(null)} className="text-red-100 underline">ປິດ</button>
          </div>
        )}

        {/* Content Views */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={<div role="status" className="py-12 text-center text-sm text-zinc-400">Loading…</div>}>
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
              setLeads={setLeadsAndPersist}
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
              setInventory={setInventoryAndPersist}
              stockLogs={stockLogs}
              setStockLogs={setStockLogs}
              vehicles={vehicles}
              setVehicles={setVehiclesAndPersist}
              currentUser={currentUser}
              isSuperAdmin={isAdmin}
              lang={lang}
              onOpenQuote={handleOpenQuoteForVehicle}
              onNavigateToStockIn={() => setCurrentMenu('stock_in')}
              onNavigateToPOS={(vin) => {
                setPosInitialVin(vin);
                setCurrentMenu('pos');
              }}
            />
          )}

          {currentMenu === 'stock_in' && isAdmin && (
            <StockInView
              inventory={inventory}
              bills={bills}
              stockLogs={stockLogs}
              vehicles={vehicles}
              setVehicles={setVehiclesAndPersist}
              onRecordStockIn={handleRecordStockIn}
              isSuperAdmin={isAdmin}
              lang={lang}
              onNavigateToStock={() => setCurrentMenu('inventory')}
              onNavigateToBills={() => setCurrentMenu('bills')}
            />
          )}

          {currentMenu === 'pos' && (
            <POSSalesView
              inventory={inventory}
              setInventory={setInventoryAndPersist}
              bills={bills}
              setBills={setBillsAndPersist}
              stockLogs={stockLogs}
              setStockLogs={setStockLogs}
              vehicles={vehicles}
              currentUser={currentUser}
              initialVin={posInitialVin}
              dealershipSettings={dealershipSettings}
              onSettingsChange={setDealershipSettings}
              lang={lang}
              onNavigateToBills={() => setCurrentMenu('bills')}
            />
          )}

          {currentMenu === 'bills' && (
            <BillsManagementView
              bills={bills}
              dealershipSettings={dealershipSettings}
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
              setInventory={setInventoryAndPersist}
              vehicles={vehicles}
              lang={lang}
              onNavigateToStock={() => setCurrentMenu('inventory')}
            />
          )}

          {currentMenu === 'appointments' && (
            <AppointmentsView
              services={services}
              testDrives={testDrives}
              lang={lang}
              onNewService={() => setIsServiceOpen(true)}
              onNewTestDrive={() => setIsTestDriveOpen(true)}
              onChangeServiceStatus={handleChangeServiceStatus}
              onChangeTestDriveStatus={handleChangeTestDriveStatus}
            />
          )}

          {currentMenu === 'users' && currentUser.permissions.canManageUsers && (
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
              onUpdateProfile={async (updated) => {
                try {
                  const savedUser = await saveStaffProfile(updated);
                  setCurrentUser(savedUser);
                  setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
                  triggerToast('ບັນທຶກຂໍ້ມູນໂປຣໄຟລ໌ສຳເລັດ!');
                } catch (error) {
                  triggerToast(error instanceof Error ? error.message : 'ບັນທຶກບໍ່ສຳເລັດ');
                }
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
      <Suspense fallback={null}>
      {isNewLeadOpen && <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onAddLead={handleAddLead}
        vehicles={vehicles}
        lang={lang}
      />}

      {isServiceOpen && <ServiceModal
        isOpen={isServiceOpen}
        onClose={() => setIsServiceOpen(false)}
        onAddService={handleAddService}
        vehicles={vehicles}
        lang={lang}
      />}

      {isTestDriveOpen && <TestDriveModal
        isOpen={isTestDriveOpen}
        onClose={() => setIsTestDriveOpen(false)}
        onAddTestDrive={handleAddTestDrive}
        vehicles={vehicles}
        initialModel={testDriveInitialModel}
        lang={lang}
      />}

      {isVehicleModalOpen && <VehicleModal
        vehicle={selectedVehicleForModal}
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onOpenQuote={handleOpenQuoteForVehicle}
        onOpenTestDrive={handleOpenTestDriveForModel}
        lang={lang}
      />}

      {isQuoteOpen && quoteVehicle && (
        <QuotationModal
          isOpen={isQuoteOpen}
          onClose={() => setIsQuoteOpen(false)}
          vehicle={quoteVehicle}
          customerName={quoteCustomerName}
          lang={lang}
        />
      )}
      </Suspense>
    </div>
  );
}
