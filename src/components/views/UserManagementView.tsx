import React, { useState } from 'react';
import { SystemUser, UserRole, Language } from '../../types';
import { translations } from '../../data/translations';
import { createStaffAccount, deactivateStaffProfile, deleteStaffProfile, saveStaffProfile } from '../../backend/data';
import { 
  UserPlus, 
  Trash2, 
  Lock, 
  Key, 
  CheckCircle2, 
  Search, 
  Phone, 
  Mail, 
  X,
  UserX, 
  Check, 
  Crown,
  UserCheck,
  Shield,
  Activity,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface UserManagementViewProps {
  currentUser: SystemUser;
  users: SystemUser[];
  setUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  lang: Language;
  onSwitchUser: (user: SystemUser) => void;
}

export default function UserManagementView({
  currentUser,
  users,
  setUsers,
  lang,
  onSwitchUser,
}: UserManagementViewProps) {
  const t = translations[lang] || translations.lo;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  
  // Modal states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDepartment, setNewDepartment] = useState('ຝ່າຍຂາຍ ແລະ ບໍລິການລູກຄ້າ');
  const [newRole, setNewRole] = useState<UserRole>('admin');

  const triggerFeedback = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const isSuperAdmin = currentUser.role === 'super_admin';

  // Toggle user active / suspended status
  const handleToggleUserStatus = async (userToToggle: SystemUser) => {
    if (userToToggle.id === currentUser.id) {
      alert('ບໍ່ສາມາດລະງັບບັນຊີຂອງຕົນເອງໄດ້!');
      return;
    }
    const newStatus = userToToggle.status === 'suspended' ? 'active' : 'suspended';
    if (newStatus === 'active') {
      alert('Reactivation is not available here. Ask the super admin to restore this account.');
      return;
    }
    const updated: SystemUser = { ...userToToggle, status: newStatus as any };
    try {
      await deactivateStaffProfile(updated.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not suspend this account.');
      return;
    }
    setUsers(prev => prev.map(u => u.id === userToToggle.id ? updated : u));
    triggerFeedback(`ລະງັບບັນຊີ "${userToToggle.name}" ສຳເລັດ`);
  };

  // 1. DELETE USER HANDLER
  const handleConfirmDelete = async () => {
    if (!deletingUser || isDeleting) return;
    if (deletingUser.id === currentUser.id) {
      alert('ບໍ່ສາມາດລົບຕົນເອງ (Admin ປະຈຸບັນ) ອອກຈາກລະບົບໄດ້!');
      setDeletingUser(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteStaffProfile(deletingUser.id);
      setUsers(prev => prev.filter(user => user.id !== deletingUser.id));
      triggerFeedback(`ລົບຜູ້ໃຊ້ "${deletingUser.name}" ອອກຈາກລະບົບສຳເລັດ`);
      setDeletingUser(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not delete this account.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 2. GRANT ROLE & PERMISSIONS HANDLER
  const handleSaveRoleAndPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const isAdminRole = editingUser.role === 'super_admin' || editingUser.role === 'admin';
    const updatedUser: SystemUser = {
      ...editingUser,
      role: isAdminRole ? 'admin' : 'general_user',
      roleTitleLo: isAdminRole ? 'Admin' : 'User',
    };

    try {
      await saveStaffProfile(updatedUser);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not update this account.');
      return;
    }

    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    triggerFeedback(`${t.success}: ${updatedUser.name}`);
    setEditingUser(null);
  };

  // 3. CREATE NEW USER HANDLER
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      const newUser = await createStaffAccount({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim(),
        department: newDepartment.trim(),
        role: newRole === 'super_admin' ? 'admin' : newRole,
      });
      setUsers(prev => [newUser, ...prev]);
      setIsAddUserOpen(false);
      triggerFeedback(`${t.success}: ${newUser.name}`);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not create this account.');
    }
  };

  // Distinct Avatar Color Gradients per Role
  const getUserAvatarStyle = (role: UserRole) => {
    if (role === 'super_admin' || role === 'admin') {
      return 'bg-gradient-to-tr from-slate-700 to-slate-500 text-white font-black shadow-sm border border-slate-500';
    }
    return 'bg-gradient-to-tr from-slate-600 to-slate-500 text-white font-bold shadow-sm border border-slate-500';
  };

  // Use restrained role colors so status remains the clearest account signal.
  const getRoleBadge = (role: UserRole) => {
    if (role === 'super_admin' || role === 'admin') {
      return (
        <span className="user-management-role-badge user-management-role-admin px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit">
          <Shield className="w-3.5 h-3.5" />
          <span>Admin</span>
        </span>
      );
    }
    return (
      <span className="user-management-role-badge user-management-role-user px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit">
        <UserCheck className="w-3.5 h-3.5" />
        <span>User</span>
      </span>
    );
  };

  // Keep account status readable without adding unnecessary motion or intensity.
  const getStatusBadge = (status?: string, onToggle?: () => void) => {
    const isActive = status !== 'suspended';
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={!onToggle}
        className={`user-management-status-badge ${isActive ? 'user-management-status-active' : 'user-management-status-suspended'} px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition-colors w-fit ${
          onToggle ? 'cursor-pointer' : 'cursor-default'
        }`}
        title={onToggle ? 'ກົດເພື່ອປ່ຽນສະຖານະບັນຊີ' : undefined}
      >
        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
        <span>{isActive ? 'ເປີດໃຊ້ງານ (Active)' : 'ລະງັບຊົ່ວຄາວ (Suspended)'}</span>
      </button>
    );
  };

  // Filtered users
  const filteredUsers = users.filter(user => {
    if (selectedRoleFilter === 'admin') {
      if (user.role !== 'admin' && user.role !== 'super_admin') return false;
    } else if (selectedRoleFilter === 'general_user') {
      if (user.role === 'admin' || user.role === 'super_admin') return false;
    } else if (selectedRoleFilter !== 'all') {
      if (user.role !== selectedRoleFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.phone.includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // RESTRICTED VIEW: If current logged in user is a General User
  if (!isSuperAdmin) {
    const activeAdmin = users.find(u => u.role === 'super_admin' || u.role === 'admin');
    return (
      <div className="user-management-view space-y-6 pb-12">
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-center max-w-2xl mx-auto space-y-4 my-8 shadow-2xl">
          <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-full w-fit mx-auto text-zinc-300">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            ສະຫງວນສິດສຳລັບ Admin ເທົ່ານັ້ນ
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            ທ່ານກຳລັງເຂົ້າສູ່ລະບົບໃນຖານະ: <strong className="text-white">{currentUser.name} ({currentUser.roleTitleLo})</strong>. 
            ສະເພາະ <strong>Admin{activeAdmin ? `: ${activeAdmin.name}` : ''}</strong> ເທົ່ານັ້ນ ທີ່ມີສິດລົບຜູ້ໃຊ້ອອກຈາກລະບົບ ແລະ ມອບສິດ/ບົດບາດໃຫ້ແກ່ຜູ້ອື່ນ.
          </p>
          {activeAdmin && (
            <div className="pt-4 border-t border-zinc-900 flex justify-center gap-3">
              <button
                onClick={() => onSwitchUser(activeAdmin)}
                className="px-5 py-2.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Crown className="w-4 h-4 text-black" />
                <span>ສະຫຼັບເປັນ Admin ({activeAdmin.name})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SUPER ADMIN MANAGEMENT CONSOLE
  return (
    <div className="user-management-view space-y-6 pb-12">
      {/* Toast Alert */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 bg-zinc-900 border border-emerald-500/60 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Banner: Admin Executive Privileges */}
      <div className="user-management-hero bg-zinc-950 border border-zinc-800 p-6 sm:p-7 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="user-management-hero-icon p-1.5 rounded-lg font-black">
              <Crown className="w-4 h-4" />
            </span>
            <span className="user-management-eyebrow text-xs font-mono uppercase tracking-widest font-bold">
              ADMIN CONSOLE • ລະບົບຈັດການບັນຊີຜູ້ໃຊ້
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ຈັດການບັນຊີຜູ້ໃຊ້ & ມອບສິດ
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Admin ປະຈຸບັນ: <strong className="text-white">{currentUser.name}</strong> | ຄວບຄຸມບົດບາດ (Admin & User), ສິດອະນຸຍາດ, ລະຫັດຜ່ານ ແລະ ສະຖານະບັນຊີທັງໝົດ
          </p>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="user-management-primary-action flex items-center gap-2 px-5 py-2.5 font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ ສ້າງບັນຊີໃໝ່ (Add User)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="user-management-stat rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="user-management-stat-icon user-management-stat-icon-blue"><UserCheck className="h-4 w-4" /></span>
            <div>
              <p className="text-xs text-zinc-400">ບັນຊີທັງໝົດ</p>
              <p className="mt-0.5 text-xl font-bold text-white">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="user-management-stat rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="user-management-stat-icon user-management-stat-icon-green"><CheckCircle2 className="h-4 w-4" /></span>
            <div>
              <p className="text-xs text-zinc-400">ບັນຊີທີ່ໃຊ້ງານຢູ່</p>
              <p className="mt-0.5 text-xl font-bold text-white">{users.filter(user => user.status !== 'suspended').length}</p>
            </div>
          </div>
        </div>
        <div className="user-management-stat rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="user-management-stat-icon user-management-stat-icon-amber"><Shield className="h-4 w-4" /></span>
            <div>
              <p className="text-xs text-zinc-400">ຜູ້ດູແລລະບົບ (Admin)</p>
              <p className="mt-0.5 text-xl font-bold text-white">{users.filter(user => user.role === 'admin' || user.role === 'super_admin').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fast Switch User Role for Testing/Verification */}
      <div className="user-management-switcher bg-zinc-950 border border-zinc-800/80 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-300 font-semibold">ສະຫຼັບບັນຊີທົດສອບ (Switch Account):</span>
          <span className="text-zinc-500 text-[11px]">(ຄລິກເພື່ອທົດລອງສິດຂອງແຕ່ລະບົດບາດ)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {users.map((u) => {
            const isSelected = currentUser.id === u.id;
            return (
              <button
                key={u.id}
                onClick={() => onSwitchUser(u)}
                className={`user-management-switch-button ${isSelected ? 'user-management-switch-selected' : 'user-management-switch-idle'} px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? 'font-bold'
                    : ''
                }`}
              >
                <span className={`user-management-role-dot h-2 w-2 rounded-full ${
                  (u.role === 'super_admin' || u.role === 'admin') ? 'user-management-role-dot-admin' : 'user-management-role-dot-user'
                }`}></span>
                <span>{u.name.split(' ')[0]}</span>
                <span className="user-management-switch-role text-[10px]">
                  ({(u.role === 'super_admin' || u.role === 'admin') ? 'Admin' : 'User'})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="user-management-toolbar bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-55">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="ຄົ້ນຫາຊື່ຜູ້ໃຊ້, ເບີໂທ, ອີເມວ, ພະແນກ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">ປະເພດບັນຊີ:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white text-xs cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-white">ທັງໝົດ ({users.length})</option>
              <option value="admin" className="bg-zinc-900 text-white">Admin</option>
              <option value="general_user" className="bg-zinc-900 text-white">User</option>
            </select>
          </div>
        </div>

        <span className="text-zinc-400 font-mono text-xs">
          {t.usersTitle}: <strong className="text-white">{filteredUsers.length}</strong> {t.unitPeople}
        </span>
      </div>

      {/* Users List: Table / Cards with Admin Actions */}
      <div className="user-management-list bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-white">ລາຍຊື່ບັນຊີຜູ້ໃຊ້ໃນລະບົບ ({filteredUsers.length})</h2>
            <p className="text-xs text-zinc-400">ສະແດງບົດບາດ, ສະຖານະ, ສິດອະນຸຍາດ ແລະ ປຸ່ມຈັດການຂອງ Admin</p>
          </div>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {filteredUsers.length === 0 && (
            <div className="user-management-empty-state px-6 py-12 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400">
                <Search className="h-5 w-5" />
              </span>
              <h3 className="text-sm font-semibold text-white">ບໍ່ພົບບັນຊີຜູ້ໃຊ້</h3>
              <p className="mt-1 text-xs text-zinc-400">ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ຕົວກອງປະເພດບັນຊີ.</p>
            </div>
          )}
          {filteredUsers.map((user) => {
            const isCurrentUser = user.id === currentUser.id;

            return (
              <div
                key={user.id}
                className="user-management-account-row p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-zinc-900/40 transition-colors text-xs"
              >
                {/* User Identity with Role Gradient Avatar */}
                <div className="flex items-center gap-3.5 min-w-65">
                  <div className={`user-management-avatar w-12 h-12 overflow-hidden rounded-2xl flex items-center justify-center font-bold text-sm ${getUserAvatarStyle(user.role)}`}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      user.avatarInitials
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{user.name}</h3>
                      {isCurrentUser && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                          (ທ່ານເອງ)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{user.phone}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        <span>{user.email}</span>
                      </span>
                    </div>
                    <p className="text-zinc-500 text-[11px] mt-0.5 font-medium">{user.department}</p>
                  </div>
                </div>

                {/* Role Badge & Status Badge (Both clearly colored) */}
                <div className="space-y-1.5 min-w-37.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user.status, !isCurrentUser ? () => handleToggleUserStatus(user) : undefined)}
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono block">
                    ເຂົ້າສູ່ລະບົບ: {user.lastLogin}
                  </span>
                </div>

                {/* Permissions Category-Coded Badges */}
                <div className="hidden lg:block space-y-1 text-[11px]">
                  <span className="text-zinc-500 uppercase font-mono text-[10px] block font-bold">ສິດອະນຸຍາດ:</span>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {user.permissions.canManageUsers && (
                      <span className="user-management-permission-badge px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ຈັດການຜູ້ໃຊ້</span>
                      </span>
                    )}
                    {user.permissions.canDeleteUsers && (
                      <span className="user-management-permission-badge user-management-permission-danger px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ລົບຜູ້ໃຊ້ໄດ້</span>
                      </span>
                    )}
                    {user.permissions.canGrantRoles && (
                      <span className="user-management-permission-badge px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ມອບສິດໄດ້</span>
                      </span>
                    )}
                    {user.permissions.canEditInventory && (
                      <span className="user-management-permission-badge px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ແກ້ສະຕ໋ອກ</span>
                      </span>
                    )}
                    {user.permissions.canUploadQR && (
                      <span className="user-management-permission-badge px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ອັບໂຫລດ QR</span>
                      </span>
                    )}
                    {user.permissions.canAddModels && (
                      <span className="user-management-permission-badge px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ເພີ່ມລຸ້ນລົດ</span>
                      </span>
                    )}
                    {user.permissions.canDeductPOS && (
                      <span className="user-management-permission-badge px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ຕັດສະຕ໋ອກ POS</span>
                      </span>
                    )}
                    {user.permissions.canViewFinancials && (
                      <span className="user-management-permission-badge px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ການເງິນ</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* ADMIN ACTIONS: GRANT ROLE & DELETE USER */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-900">
                  {/* Grant / Change Role Button */}
                  <button
                    onClick={() => {
                      setEditingUser(user);
                    }}
                    className="user-management-grant-button px-3.5 py-2 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="ມອບສິດ ແລະ ປ່ຽນບົດບາດ"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>ມອບສິດ (Grant)</span>
                  </button>

                  {/* Delete User Button (Disabled for current self Super Admin) */}
                  <button
                    onClick={() => setDeletingUser(user)}
                    disabled={isCurrentUser}
                    className={`user-management-delete-button px-3 py-2 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isCurrentUser
                        ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                        : 'bg-zinc-900 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border-zinc-800 hover:border-rose-800/60'
                    }`}
                    title={isCurrentUser ? 'ບໍ່ສາມາດລົບຕົນເອງໄດ້' : 'ລົບຜູ້ໃຊ້ນີ້ອອກຈາກລະບົບ'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ລົບຜູ້ໃຊ້</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: GRANT ROLE & PERMISSIONS */}
      {editingUser && (
        <div className="user-management-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="user-management-modal relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-950/60 border border-purple-700/60 rounded-xl text-purple-300">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">ມອບສິດ ແລະ ປັບແຕ່ງບັນຊີ</h3>
                  <p className="text-xs text-zinc-400">{editingUser.name} ({editingUser.phone})</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="user-management-modal-close p-1.5 rounded-xl border transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleAndPermissions} className="space-y-4 text-xs">
              {/* Select Role */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  ເລືອກບົດບາດ (Role) ທີ່ຕ້ອງການມອບໃຫ້:
                </label>
                <select
                  value={(editingUser.role === 'super_admin' || editingUser.role === 'admin') ? 'admin' : 'general_user'}
                  onChange={(e) => {
                    const selected = e.target.value as 'admin' | 'general_user';
                    const isAdminRole = selected === 'admin';
                    setEditingUser({
                      ...editingUser,
                      role: selected,
                      roleTitleLo: isAdminRole ? 'Admin' : 'User',
                      permissions: {
                        canManageUsers: isAdminRole,
                        canDeleteUsers: isAdminRole,
                        canGrantRoles: isAdminRole,
                        canEditInventory: isAdminRole,
                        canUploadQR: isAdminRole,
                        canAddModels: isAdminRole,
                        canDeductPOS: true,
                        canViewFinancials: isAdminRole,
                      }
                    });
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white cursor-pointer"
                >
                  <option value="admin" className="bg-zinc-900 text-white">Admin (ຜູ້ດູແລລະບົບ / Admin)</option>
                  <option value="general_user" className="bg-zinc-900 text-white">User (ຜູ້ໃຊ້ທົ່ວໄປ / User)</option>
                </select>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-zinc-300 font-semibold block text-xs">
                  ກຳນົດສິດລະອຽດ (Permissions Configuration):
                </span>

                <label className={`user-management-permission-row flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  editingUser.permissions.canManageUsers
                    ? 'border-blue-600/70 bg-blue-950/30 text-white'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={editingUser.permissions.canManageUsers}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      permissions: { ...editingUser.permissions, canManageUsers: e.target.checked }
                    })}
                    className="accent-blue-500 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-white font-medium block">ຈັດການຜູ້ໃຊ້ອື່ນ (Manage Users)</span>
                    <span className="text-zinc-400 text-[11px]">ສາມາດເບິ່ງ ແລະ ແກ້ໄຂຂໍ້ມູນພະນັກງານໃນລະບົບໄດ້</span>
                  </div>
                </label>

                <label className={`user-management-permission-row flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  editingUser.permissions.canDeleteUsers
                    ? 'border-rose-600/70 bg-rose-950/30 text-white'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={editingUser.permissions.canDeleteUsers}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      permissions: { ...editingUser.permissions, canDeleteUsers: e.target.checked }
                    })}
                    className="accent-rose-500 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-white font-medium block">ລົບຜູ້ໃຊ້ອື່ນອອກຈາກລະບົບ (Delete Users)</span>
                    <span className="text-zinc-400 text-[11px]">ອະນຸຍາດໃຫ້ລົບ ແລະ ຍົກເລີກສິດຜູ້ໃຊ້ອື່ນ</span>
                  </div>
                </label>

                <label className={`user-management-permission-row flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  editingUser.permissions.canGrantRoles
                    ? 'border-blue-600/70 bg-blue-950/30 text-white'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={editingUser.permissions.canGrantRoles}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      permissions: { ...editingUser.permissions, canGrantRoles: e.target.checked }
                    })}
                    className="accent-blue-500 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-white font-medium block">ມອບສິດ & ປ່ຽນບົດບາດ (Grant Roles)</span>
                    <span className="text-zinc-400 text-[11px]">ສາມາດແຕ່ງຕັ້ງ ຫຼື ປ່ຽນ Role ໃຫ້ພະນັກງານຄົນອື່ນ</span>
                  </div>
                </label>

                <label className={`user-management-permission-row flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  editingUser.permissions.canEditInventory
                    ? 'border-blue-600/70 bg-blue-950/30 text-white'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={editingUser.permissions.canEditInventory}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      permissions: { ...editingUser.permissions, canEditInventory: e.target.checked }
                    })}
                    className="accent-blue-500 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-white font-medium block">ແກ້ໄຂສະຕ໋ອກລົດ & PDI (Edit Stock)</span>
                    <span className="text-zinc-400 text-[11px]">ສາມາດເພີ່ມ, ແກ້ໄຂເລກ VIN, ທະບຽນ ແລະ ລາຄາລົດ</span>
                  </div>
                </label>

                <label className={`user-management-permission-row flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  editingUser.permissions.canUploadQR
                    ? 'border-blue-600/70 bg-blue-950/30 text-white'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={Boolean(editingUser.permissions.canUploadQR)}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      permissions: { ...editingUser.permissions, canUploadQR: e.target.checked }
                    })}
                    className="accent-blue-500 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-white font-medium block">ອັບໂຫລດ QR ບໍລິສັດ (Upload Company QR)</span>
                    <span className="text-zinc-400 text-[11px]">ສິດອັບໂຫລດ ແລະ ປ່ຽນຮູບ QR ບໍລິສັດທາງການ</span>
                  </div>
                </label>

                <label className={`user-management-permission-row flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  editingUser.permissions.canDeductPOS
                    ? 'border-blue-600/70 bg-blue-950/30 text-white'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={editingUser.permissions.canDeductPOS}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      permissions: { ...editingUser.permissions, canDeductPOS: e.target.checked }
                    })}
                    className="accent-blue-500 w-4 h-4 rounded"
                  />
                  <div>
                    <span className="text-white font-medium block">ຕັດສະຕ໋ອກ & ອອກໃບຮັບເງິນ POS (POS Deduction)</span>
                    <span className="text-zinc-400 text-[11px]">ສາມາດຕັດຍອດລົດອອກຈາກສາງເມື່ອມີການຂາຍ</span>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="user-management-modal-cancel px-4 py-2 rounded-xl border cursor-pointer"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="user-management-modal-submit px-5 py-2 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ຢືນຢັນການມອບສິດ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM DELETE USER WITH DANGER RED HIGHLIGHT */}
      {deletingUser && (
        <div className="user-management-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="user-management-modal relative w-full max-w-md bg-zinc-950 border border-rose-900/60 rounded-3xl p-6 text-white space-y-4 shadow-2xl">
            <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl w-fit text-rose-400 mx-auto">
              <UserX className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg text-white">ຢືນຢັນການລົບຜູ້ໃຊ້?</h3>
              <p className="text-xs text-zinc-300">
                ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບຜູ້ໃຊ້: <strong className="text-white underline">{deletingUser.name}</strong> ({deletingUser.phone}) ອອກຈາກລະບົບ?
              </p>
              <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded-xl border border-rose-900/60 flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>ການກະທຳນີ້ຈະລົບສິດການເຂົ້າເຖິງລະບົບຂອງຜູ້ໃຊ້ນີ້ທັງໝົດ.</span>
              </p>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="user-management-modal-cancel px-5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="user-management-danger-action px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'ກຳລັງລົບ...' : 'ຢືນຢັນການລົບຜູ້ໃຊ້'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD NEW USER */}
      {isAddUserOpen && (
        <div className="user-management-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="user-management-modal relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>ເພີ່ມຜູ້ໃຊ້ໃໝ່ເຂົ້າລະບົບ</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="user-management-modal-close p-1.5 rounded-xl border transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">ຊື່ ແລະ ນາມສະກຸນ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. ທ່ານ ສົມຈິດ ໄຊຍະວົງ"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">ເບີໂທລະສັບ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="020 5xxxxxxx"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">ອີເມວ</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@laos-ev.la"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">ປະເພດບັນຊີ (Role) <span className="text-red-500">*</span></label>
                  <select
                    value={(newRole === 'super_admin' || newRole === 'admin') ? 'admin' : 'general_user'}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white cursor-pointer font-medium"
                  >
                    <option value="admin" className="bg-zinc-900 text-white">Admin (ຜູ້ດູແລລະບົບ / Admin)</option>
                    <option value="general_user" className="bg-zinc-900 text-white">User (ຜູ້ໃຊ້ທົ່ວໄປ / User)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">ພະແນກ / ສາຂາ</label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>

              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="user-management-modal-cancel px-4 py-2 rounded-xl border cursor-pointer"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="user-management-modal-submit px-5 py-2 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ສ້າງຜູ້ໃຊ້ໃໝ່
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
