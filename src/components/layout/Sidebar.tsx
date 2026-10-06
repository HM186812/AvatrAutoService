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
  Crown,
  Key,
  ChevronDown,
  PackagePlus,
  ShoppingBag,
  FileText,
  LogOut,
  Coins,
  Sparkles
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
  allUsers: SystemUser[];
  onSwitchUser: (user: SystemUser) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout?: () => void;
  onOpenCurrencyModal?: () => void;
}

interface MenuItem {
  id: ActiveMenu;
  labelLo: string;
  labelEn: string;
  labelZh: string;
  subLo?: string;
  icon: any;
  badge?: string | number | null;
  badgeColor?: string;
  adminOnly?: boolean;
}

interface MenuGroup {
  groupLo: string;
  groupEn: string;
  groupZh: string;
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
  allUsers,
  onSwitchUser,
  isMobileOpen,
  setIsMobileOpen,
  onLogout,
  onOpenCurrencyModal,
}: SidebarProps) {
  const isSuperAdmin = currentUser.role === 'super_admin';

  // Grouped Menu Structure for Maximum Ergonomics & Convenience
  const menuGroups: MenuGroup[] = [
    {
      groupLo: 'ງານຂາຍ & ລູກຄ້າ',
      groupEn: 'SALES & CRM',
      groupZh: '销售与客户',
      items: [
        {
          id: 'dashboard',
          labelLo: 'Dashboard (ພາບລວມ)',
          labelEn: 'Dashboard',
          labelZh: '总览看板',
          icon: LayoutDashboard,
          badge: null,
          adminOnly: false,
        },
        {
          id: 'pos',
          labelLo: 'POS ຂາຍລົດຍົນ',
          labelEn: 'Vehicle Sales POS',
          labelZh: '销售开单 POS',
          subLo: 'ອອກບິນ & ຕັດສະຕ໋ອກ',
          icon: ShoppingBag,
          badge: 'ຂາຍ',
          badgeColor: 'text-emerald-300 bg-emerald-950/80 border-emerald-700/80 font-bold',
          adminOnly: false,
        },
        {
          id: 'customers',
          labelLo: 'ລູກຄ້າ (CRM)',
          labelEn: 'Customers CRM',
          labelZh: '客户管理',
          icon: Users,
          badge: leadCount > 0 ? leadCount : null,
          adminOnly: false,
        },
      ],
    },
    {
      groupLo: 'ຄັງສິນຄ້າ & ສະຕ໋ອກ',
      groupEn: 'INVENTORY & STOCK',
      groupZh: '库存管理',
      items: [
        {
          id: 'inventory',
          labelLo: 'ສະຕ໋ອກລົດ (Stock)',
          labelEn: 'Vehicle Stock',
          labelZh: '车辆库存',
          icon: Car,
          badge: stockCount,
          adminOnly: false,
        },
        {
          id: 'stock_in',
          labelLo: 'ປ້ອນນຳເຂົ້າລົດ (Stock-In)',
          labelEn: 'Import Entry (Stock-In)',
          labelZh: '新车入库录入',
          subLo: 'ຮັບລົດ & ອອກໃບຮັບ',
          icon: PackagePlus,
          badge: 'ນຳເຂົ້າ',
          badgeColor: 'text-blue-300 bg-blue-950/80 border-blue-700/80 font-bold',
          adminOnly: false,
        },
        {
          id: 'alerts',
          labelLo: 'ແຈ້ງເຕືອນສະຕ໋ອກ',
          labelEn: 'Stock Alerts',
          labelZh: '库存预警',
          icon: AlertTriangle,
          badge: (lowStockCount + outOfStockCount) > 0 ? `${lowStockCount + outOfStockCount}` : null,
          badgeColor: 'text-amber-300 bg-amber-950/90 border-amber-700 font-bold',
          adminOnly: false,
        },
      ],
    },
    {
      groupLo: 'ການເງິນ & ບໍລິຫານ',
      groupEn: 'FINANCE & ADMIN',
      groupZh: '财务与管理',
      items: [
        {
          id: 'bills',
          labelLo: 'ບັນທຶກບິນ & ໃບຮັບ',
          labelEn: 'Bills & Invoices',
          labelZh: '单据记录',
          icon: FileText,
          badge: billsCount > 0 ? `${billsCount}` : null,
          badgeColor: 'text-zinc-300 bg-zinc-900 border-zinc-700',
          adminOnly: false,
        },
        {
          id: 'users',
          labelLo: 'ອະນຸຍາດ & ມອບສິດ',
          labelEn: 'User Governance',
          labelZh: '成员审核与赋权',
          icon: Key,
          badge: pendingRequestsCount > 0 ? `${pendingRequestsCount}` : 'Admin',
          badgeColor: 'text-amber-300 bg-amber-950 border-amber-700 font-bold',
          adminOnly: true, // Only for Super Admin
        },
      ],
    },
  ];

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
              if (item.adminOnly && !isSuperAdmin) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            const groupLabel = lang === 'lo' ? group.groupLo : lang === 'zh' ? group.groupZh : group.groupEn;

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
                    const label = lang === 'lo' ? item.labelLo : lang === 'zh' ? item.labelZh : item.labelEn;

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
                              : item.adminOnly 
                              ? 'text-amber-400' 
                              : 'text-zinc-400 group-hover:text-white'
                          }`} />
                          <span className="truncate">{label}</span>
                        </div>

                        {item.badge !== null && item.badge !== undefined && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border flex-shrink-0 ml-1.5 ${
                            item.badgeColor || (isActive ? 'bg-zinc-200 text-black border-zinc-300 font-bold' : 'bg-zinc-900 text-zinc-300 border-zinc-800')
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quick Stock Alert Notice */}
          {(lowStockCount > 0 || outOfStockCount > 0) && (
            <div 
              onClick={() => {
                setCurrentMenu('alerts');
                setIsMobileOpen(false);
              }}
              className="mt-2 p-2.5 bg-amber-950/30 border border-amber-900/70 rounded-xl cursor-pointer hover:bg-amber-950/50 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs mb-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">ແຈ້ງເຕືອນສະຕ໋ອກລົດ</span>
              </div>
              <div className="text-[11px] text-zinc-400 space-y-0.5">
                {outOfStockCount > 0 && <span className="text-red-400 block truncate">• ໝົດສະຕ໋ອກ: {outOfStockCount} ລຸ້ນ</span>}
                {lowStockCount > 0 && <span className="text-amber-300 block truncate">• ໃກ້ໝົດ (≤1): {lowStockCount} ລຸ້ນ</span>}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Currency Button, Profile, Language, Logout */}
        <div className="p-3 border-t border-zinc-900 bg-zinc-950 space-y-2">
          {/* Quick Currency Button */}
          {onOpenCurrencyModal && (
            <button
              type="button"
              onClick={onOpenCurrencyModal}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-white text-xs transition-colors"
              title="ຈັດການສະກຸນເງິນ & ອັດຕາແລກປ່ຽນ"
            >
              <div className="flex items-center gap-2">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-medium">ສະກຸນເງິນ (Currencies)</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                USD · LAK · THB
              </span>
            </button>
          )}

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
                  : isSuperAdmin ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
              }`}>
                {currentUser.avatarInitials || currentUser.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold truncate">{currentUser.name.split(' ')[0]}</span>
                  {isSuperAdmin && (
                    <Crown className={`w-3 h-3 flex-shrink-0 ${currentMenu === 'profile' ? 'text-amber-600 fill-amber-600' : 'text-amber-400 fill-amber-400'}`} />
                  )}
                </div>
                <p className={`text-[10px] truncate ${currentMenu === 'profile' ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {isSuperAdmin ? 'Admin ໃຫຍ່' : currentUser.roleTitleLo || 'ຜູ້ໃຊ້ທົ່ວໄປ'} • ໂປຣໄຟລ໌
                </p>
              </div>
            </div>

            <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
              currentMenu === 'profile' ? 'text-black' : 'text-zinc-500'
            }`} />
          </button>

          {/* Language Switcher */}
          <div className="flex items-center justify-between p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs">
            <span className="text-[10px] text-zinc-500 pl-1.5 font-mono uppercase">ພາສາ:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLang('lo')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  lang === 'lo' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ລາວ
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  lang === 'en' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('zh')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  lang === 'zh' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                中文
              </button>
            </div>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-red-950/30 hover:bg-red-950/60 text-red-300 hover:text-red-200 border border-red-900/50 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ອອກຈາກລະບົບ (Log Out)</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
