import { useState } from 'react';
import { Language, ActiveMenu, SystemUser } from '../../types';
import { translations } from '../../data/translations';
import AvatrLogo from './AvatrLogo';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  AlertTriangle, 
  ChevronRight, 
  ShieldCheck, 
  PackagePlus, 
  ShoppingBag, 
  FileText, 
  CalendarDays,
  Key,
  LogOut, 
  Sun, 
  Moon 
} from 'lucide-react';

interface SidebarProps {
  currentMenu: ActiveMenu;
  setCurrentMenu: (menu: ActiveMenu) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  leadCount: number;
  stockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  billsCount?: number;
  pendingRequestsCount?: number;
  currentUser: SystemUser;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

interface MenuItem {
  id: ActiveMenu;
  labelLo: string;
  labelEn: string;
  labelTh: string;
  subLo?: string;
  icon: any;
  badge?: string | number | null;
  badgeColor?: string;
  adminOnly?: boolean;
  userManagementOnly?: boolean;
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
  setLang,
  leadCount,
  stockCount,
  lowStockCount,
  outOfStockCount,
  billsCount = 4,
  pendingRequestsCount = 3,
  currentUser,
  isMobileOpen,
  setIsMobileOpen,
  onLogout,
  theme = 'dark',
  onToggleTheme,
}: SidebarProps) {
  const isSuperAdmin = currentUser.role === 'super_admin';
  const isAdmin = Boolean(currentUser.permissions?.canEditInventory);

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
          id: 'pos',
          labelLo: 'POS ຂາຍລົດຍົນ',
          labelEn: 'Vehicle Sales POS',
          labelTh: 'POS ขายรถยนต์',
          subLo: 'ອອກບິນ & ຕັດສະຕ໋ອກ',
          icon: ShoppingBag,
          badge: 'ຂາຍ',
          badgeColor: 'text-zinc-200 bg-zinc-800 border-zinc-700 font-bold',
          adminOnly: false,
        },
        {
          id: 'customers',
          labelLo: 'ລູກຄ້າ (CRM)',
          labelEn: 'Customers CRM',
          labelTh: 'ลูกค้า (CRM)',
          icon: Users,
          badge: leadCount > 0 ? leadCount : null,
          adminOnly: false,
        },
        {
          id: 'appointments',
          labelLo: 'ນັດໝາຍບໍລິການ / ທົດລອງຂັບ',
          labelEn: 'Service & Test Drive',
          labelTh: 'นัดบริการ / ทดลองขับ',
          icon: CalendarDays,
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
      groupLo: 'ການເງິນ & ບໍລິຫານ',
      groupEn: 'FINANCE & ADMIN',
      groupTh: 'การเงิน & บริหาร',
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
        {
          id: 'users',
          labelLo: 'ຈັດການຜູ້ໃຊ້',
          labelEn: 'Staff & Access',
          labelTh: 'ผู้ใช้และสิทธิ์',
          icon: Key,
          userManagementOnly: true,
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
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header: Logo & Branding */}
        <div className="p-4 border-b border-zinc-900">
          <div 
            onClick={() => {
              setCurrentMenu('dashboard');
              setIsMobileOpen(false);
            }}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <AvatrLogo className="w-9 h-9 flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-widest text-white group-hover:text-zinc-200">
                  AVATR
                </span>
                <span className="text-[9px] tracking-widest font-mono uppercase px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded font-semibold">
                  AUTO
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate tracking-wide">
                Changan × Huawei × CATL
              </p>
            </div>
          </div>
        </div>

        {/* Grouped Navigation Links */}
        <div className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
          {menuGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter(item => {
              if (item.adminOnly && !isAdmin) return false;
              if (item.userManagementOnly && !currentUser.permissions?.canManageUsers) return false;
              if (item.id === 'appointments' && !currentUser.permissions?.canDeductPOS && !currentUser.permissions?.canUpdatePDI && !currentUser.permissions?.canManageUsers) return false;
              if (item.id === 'pos' && !currentUser.permissions?.canDeductPOS) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            const groupLabel = lang === 'lo' ? group.groupLo : lang === 'th' ? group.groupTh : group.groupEn;

            return (
              <div key={groupIdx} className="space-y-1">
                <div className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 px-2.5 pb-1 flex items-center justify-between">
                  <span>{groupLabel}</span>
                  <span className="text-zinc-600 text-[9px]">{visibleItems.length}</span>
                </div>

                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentMenu === item.id;
                    const label = lang === 'lo' ? item.labelLo : lang === 'th' ? item.labelTh : item.labelEn;
                    const badgeText = item.badge === 'ຂາຍ' ? t.badgeSale : item.badge === 'ນຳເຂົ້າ' ? t.badgeImport : item.badge;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCurrentMenu(item.id);
                          setIsMobileOpen(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left group ${
                          isActive
                            ? 'bg-white text-black font-bold shadow-md'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-900/90'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive 
                              ? 'text-black' 
                              : 'text-zinc-400 group-hover:text-white'
                          }`} />
                          <span className="truncate">{label}</span>
                        </div>

                        {badgeText !== null && badgeText !== undefined && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border flex-shrink-0 ml-1.5 ${
                            item.badgeColor || (isActive ? 'bg-zinc-200 text-black border-zinc-300 font-bold' : 'bg-zinc-900 text-zinc-300 border-zinc-800')
                          }`}>
                            {badgeText}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quick Stock Alert Notice (Admin Only) */}
          {isAdmin && (lowStockCount > 0 || outOfStockCount > 0) && (
            <div 
              onClick={() => {
                setCurrentMenu('alerts');
                setIsMobileOpen(false);
              }}
              className="mt-2 p-2.5 bg-zinc-900/90 border border-zinc-700/80 rounded-xl cursor-pointer hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-white font-semibold text-xs mb-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-zinc-300" />
                <span className="truncate">{t.navAlerts}</span>
              </div>
              <div className="text-[11px] text-zinc-400 space-y-0.5">
                {outOfStockCount > 0 && <span className="text-zinc-200 block truncate font-medium">• {t.criticalStockAlert}: {outOfStockCount}</span>}
                {lowStockCount > 0 && <span className="text-zinc-300 block truncate">• {t.warningStockAlert}: {lowStockCount}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Profile, Theme, Language, Logout */}
        <div className="p-3 border-t border-zinc-900 bg-zinc-950 space-y-2">

          {/* User Profile Card Button */}
          <button
            type="button"
            onClick={() => {
              setCurrentMenu('profile');
              setIsMobileOpen(false);
            }}
            className={`w-full p-2 rounded-xl border transition-all text-left flex items-center justify-between gap-2 group ${
              currentMenu === 'profile'
                ? 'bg-white text-black border-white shadow-md'
                : 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-800 text-white'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                currentMenu === 'profile'
                  ? 'bg-black text-white'
                  : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
              }`}>
                {currentUser.avatarInitials || currentUser.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold truncate">{currentUser.name.split(' ')[0]}</span>
                  {isSuperAdmin && (
                    <ShieldCheck className={`w-3 h-3 flex-shrink-0 ${currentMenu === 'profile' ? 'text-black' : 'text-zinc-200'}`} />
                  )}
                </div>
                <p className={`text-[10px] truncate ${currentMenu === 'profile' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {isSuperAdmin ? t.roleSuperAdmin : (currentUser.roleTitleLo || t.roleGeneralUser)} • {t.navProfile}
                </p>
              </div>
            </div>

            <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
              currentMenu === 'profile' ? 'text-black' : 'text-zinc-500'
            }`} />
          </button>

          {/* Theme & Language Controls Row */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex items-center justify-center gap-1.5 p-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs text-zinc-300 hover:text-white transition-colors"
                title={theme === 'dark' ? t.lightMode : t.darkMode}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-zinc-200" />
                    <span className="text-[11px] font-medium">{t.lightMode}</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-zinc-800" />
                    <span className="text-[11px] font-medium">{t.darkMode}</span>
                  </>
                )}
              </button>
            )}

            {/* Language Switcher */}
            <div className={`flex items-center justify-around p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs ${!onToggleTheme ? 'col-span-2' : ''}`}>
              <button
                type="button"
                onClick={() => setLang('lo')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  lang === 'lo' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ລາວ
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  lang === 'en' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('th')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  lang === 'th' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ไทย
              </button>
            </div>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.navLogout}</span>
            </button>
          )}

          {/* Version Info */}
          <div className="pt-0.5 text-center select-none">
            <span className="text-[9px] font-mono text-zinc-600 tracking-wider">
              v1.2.0 · USD Edition
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
