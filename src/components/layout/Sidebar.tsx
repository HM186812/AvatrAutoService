import { Language, ActiveMenu, SystemUser } from '../../types';
import { isAdminRole } from '../../utils/roles';
import { translations } from '../../data/translations';
import AvatrLogo from './AvatrLogo';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  AlertTriangle, 
  PackagePlus, 
  FileText, 
  Trophy,
  LogOut
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SidebarProps {
  currentMenu: ActiveMenu;
  setCurrentMenu: (menu: ActiveMenu) => void;
  lang: Language;
  leadCount: number;
  /** Leads whose follow-up is due today or overdue (shown as the CRM badge) */
  followUpDueCount?: number;
  stockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  billsCount?: number;
  installmentCount?: number;
  pendingRequestsCount?: number;
  currentUser: SystemUser;
  allUsers: SystemUser[];
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout?: () => void;
}

interface MenuItem {
  id: ActiveMenu;
  labelLo: string;
  labelEn: string;
  labelTh: string;
  subLo?: string;
  icon: LucideIcon;
  badge?: string | number | null;
  badgeColor?: string;
  adminOnly?: boolean;
}

interface MenuGroup {
  groupLo: string;
  groupEn: string;
  groupTh: string;
  items: MenuItem[];
}

export default function Sidebar({
  currentMenu,
  setCurrentMenu,
  lang,
  followUpDueCount = 0,
  stockCount,
  lowStockCount,
  outOfStockCount,
  billsCount = 4,
  currentUser,
  isMobileOpen,
  setIsMobileOpen,
  onLogout,
}: SidebarProps) {
  const isSuperAdmin = isAdminRole(currentUser);
  const isAdmin = isSuperAdmin;

  // Grouped Menu Structure for Maximum Ergonomics & Convenience
  const menuGroups: MenuGroup[] = [
    {
      groupLo: 'ງານຂາຍ & ລູກຄ້າ',
      groupEn: 'SALES & CRM',
      groupTh: 'งานขาย & ลูกค้า',
      items: [
        {
          id: 'dashboard',
          labelLo: 'Dashboard (ພາບລວມ)',
          labelEn: 'Dashboard',
          labelTh: 'Dashboard (ภาพรวม)',
          icon: LayoutDashboard,
          badge: null,
          adminOnly: false,
        },
        {
          id: 'customers',
          labelLo: 'ລູກຄ້າ (CRM)',
          labelEn: 'Customers CRM',
          labelTh: 'ลูกค้า (CRM)',
          icon: Users,
          badge: followUpDueCount > 0 ? followUpDueCount : null,
          badgeColor: 'text-white bg-rose-600 border-rose-700 font-bold',
          adminOnly: false,
        },
        {
          id: 'sales_leaderboard',
          labelLo: 'ອັນດັບນັກຂາຍ (Top Sales)',
          labelEn: 'Sales Leaderboard',
          labelTh: 'อันดับนักขาย (Top Sales)',
          subLo: 'ຈັດອັນດັບ & ຜົນງານ',
          icon: Trophy,
          badge: 'TOP',
          badgeColor: 'text-amber-300 bg-amber-950/80 border-amber-700 font-bold',
          adminOnly: false,
        },
      ],
    },
    {
      groupLo: 'ຄັງສິນຄ້າ & ສະຕ໋ອກ',
      groupEn: 'INVENTORY & STOCK',
      groupTh: 'คลังสินค้า & สต็อก',
      items: [
        {
          id: 'inventory',
          labelLo: 'ສະຕ໋ອກລົດ (Stock)',
          labelEn: 'Vehicle Stock',
          labelTh: 'สต็อกรถยนต์ (Stock)',
          icon: Car,
          badge: stockCount,
          adminOnly: true,
        },
        {
          id: 'stock_in',
          labelLo: 'ປ້ອນນຳເຂົ້າລົດ (Stock-In)',
          labelEn: 'Import Entry (Stock-In)',
          labelTh: 'บันทึกนำเข้ารถ (Stock-In)',
          subLo: 'ຮັບລົດ & ອອກໃບຮັບ',
          icon: PackagePlus,
          badge: 'ນຳເຂົ້າ',
          badgeColor: 'text-zinc-200 bg-zinc-800 border-zinc-700 font-bold',
          adminOnly: true,
        },
        {
          id: 'alerts',
          labelLo: 'ແຈ້ງເຕືອນສະຕ໋ອກ',
          labelEn: 'Stock Alerts',
          labelTh: 'แจ้งเตือนสต็อก',
          icon: AlertTriangle,
          badge: (lowStockCount + outOfStockCount) > 0 ? `${lowStockCount + outOfStockCount}` : null,
          badgeColor: 'text-white bg-zinc-800 border-zinc-600 font-bold',
          adminOnly: true,
        },
      ],
    },
    {
      groupLo: 'ການເງິນ & ໃບບິນ',
      groupEn: 'FINANCE & BILLS',
      groupTh: 'การเงิน & บันทึกบิล',
      items: [
        {
          id: 'bills',
          labelLo: 'ບັນທຶກບິນ & ໃບຮັບ',
          labelEn: 'Bills & Invoices',
          labelTh: 'บันทึกบิล & ใบรับ',
          icon: FileText,
          badge: billsCount > 0 ? `${billsCount}` : null,
          badgeColor: 'text-zinc-300 bg-zinc-900 border-zinc-700',
          adminOnly: false,
        },
      ],
    },
  ];

  const t = translations[lang] || translations.lo;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Left Sidebar Container */}
      <aside className={`app-sidebar fixed top-0 bottom-0 left-0 z-50 w-20 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex justify-center p-3 border-b border-slate-200 dark:border-zinc-900">
          <button
            type="button"
            onClick={() => {
              setCurrentMenu('dashboard');
              setIsMobileOpen(false);
            }}
            aria-label={lang === 'lo' ? 'ໜ້າພາບລວມ' : lang === 'th' ? 'แดชบอร์ด' : 'Dashboard'}
            title={lang === 'lo' ? 'ໜ້າພາບລວມ' : lang === 'th' ? 'แดชบอร์ด' : 'Dashboard'}
            className="flex h-12 w-12 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-900"
          >
            <AvatrLogo className="w-9 h-9 shrink-0" />
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav
          aria-label={lang === 'lo' ? 'ເມນູຫຼັກ' : lang === 'th' ? 'เมนูหลัก' : 'Main navigation'}
          className="flex-1 overflow-y-auto px-3 py-3"
        >
          {menuGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter(item => {
              if (item.adminOnly && !isAdmin) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            const groupLabel = lang === 'lo' ? group.groupLo : lang === 'th' ? group.groupTh : group.groupEn;

            return (
              <div
                key={groupIdx}
                role="group"
                aria-label={groupLabel}
                className={`flex flex-col items-center gap-1.5 ${groupIdx > 0 ? 'mt-3 border-t border-slate-200 pt-3 dark:border-zinc-800' : ''}`}
              >
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentMenu === item.id || (item.id === 'customers' && currentMenu === 'pos_sales');
                  const label = lang === 'lo' ? item.labelLo : lang === 'th' ? item.labelTh : item.labelEn;
                  const badgeText = item.badge === 'ຂາຍ' ? t.badgeSale : item.badge === 'ນຳເຂົ້າ' ? t.badgeImport : item.badge;
                  const hasNumericBadge = typeof badgeText === 'number' || (typeof badgeText === 'string' && /^\d+$/.test(badgeText));

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCurrentMenu(item.id);
                        setIsMobileOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      aria-label={label}
                      aria-current={isActive ? 'page' : undefined}
                      title={label}
                      className={`group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
                        isActive
                          ? 'sidebar-menu-btn-active font-bold shadow-sm'
                          : 'text-slate-900 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900/90'
                      }`}
                    >
                      <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 transition-colors ${
                        isActive
                          ? 'text-blue-600 dark:text-white'
                          : 'text-slate-900 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-white'
                      }`} />

                      {hasNumericBadge && (
                        <span className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[9px] font-mono leading-none ${
                          item.badgeColor || (isActive
                            ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 font-bold'
                            : 'bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-300 border-slate-200 dark:border-zinc-800')
                        }`}>
                          {badgeText}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer: Profile, Logout */}
        <div className="flex flex-col items-center gap-2 border-t border-slate-200 bg-white p-2 dark:border-zinc-900 dark:bg-zinc-950">

          {/* User Profile Card Button */}
          <button
            type="button"
            onClick={() => {
              setCurrentMenu('profile');
              setIsMobileOpen(false);
            }}
            aria-label={`${t.navProfile}: ${currentUser.name}`}
            title={`${t.navProfile}: ${currentUser.name}`}
            className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              currentMenu === 'profile'
                ? 'sidebar-menu-btn-active font-bold shadow-sm'
                : 'bg-slate-50 dark:bg-zinc-900/90 hover:bg-slate-100 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white'
            }`}
          >
            <span className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border text-xs font-bold ${
              currentMenu === 'profile'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-100 text-blue-700 dark:bg-zinc-800 dark:text-zinc-200 border-blue-200 dark:border-zinc-700'
            }`}>
              {currentUser.avatarInitials || currentUser.name.slice(0, 2)}
            </span>
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label={t.navLogout}
              title={t.navLogout}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-800 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
