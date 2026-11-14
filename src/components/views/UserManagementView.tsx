import React, { useState } from 'react';
import { SystemUser, UserRole, Language } from '../../types';
import { isAdminRole, normalizeRole, ROLE_LABELS, ROLE_OPTIONS } from '../../utils/roles';
import { translations } from '../../data/translations';
import { createStaffAccount, deactivateStaffProfile, reactivateStaffProfile, deleteStaffProfile, saveStaffProfile, handoverStaffPendingLeads } from '../../backend/data';
import type { Lead } from '../../types';
import { showToast } from '../common';
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
  Crown,
  UserCheck,
  Shield,
  AlertTriangle,
  ArrowRightLeft,
  Power,
  RotateCcw
} from 'lucide-react';

interface UserManagementViewProps {
  currentUser: SystemUser;
  users: SystemUser[];
  setUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  leads?: Lead[];
  setLeads?: React.Dispatch<React.SetStateAction<Lead[]>>;
  lang: Language;
}

export default function UserManagementView({
  currentUser,
  users,
  setUsers,
  leads = [],
  setLeads,
  lang,
}: UserManagementViewProps) {
  const t = translations[lang] || translations.lo;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  
  // Modal states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // 1-Click Pending Deals Handover state
  const [handoverUser, setHandoverUser] = useState<SystemUser | null>(null);
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>('');
  const [isHandingOver, setIsHandingOver] = useState(false);

  const getUserPendingLeads = (user: SystemUser): Lead[] => {
    if (!leads || leads.length === 0) return [];
    return leads.filter((lead) => {
      const isAssigned =
        lead.assignedTo === user.name ||
        lead.assignedTo === user.id ||
        lead.assignedTo === user.email;
      return isAssigned && lead.status !== 'delivered' && lead.status !== 'lost';
    });
  };

  const handleConfirmHandover = async () => {
    if (!handoverUser || !selectedTargetUserId || isHandingOver) return;
    const targetStaff = users.find(u => u.id === selectedTargetUserId);
    if (!targetStaff) {
      showToast('ກະລຸນາເລືອກເພື່ອນຮ່ວມງານປາຍທາງ!', 'warning');
      return;
    }

    const pending = getUserPendingLeads(handoverUser);
    if (pending.length === 0) {
      showToast('ບໍ່ມີເຄສຄັ່ງຄ້າງທີ່ຕ້ອງໂອນ!', 'info');
      setHandoverUser(null);
      return;
    }

    setIsHandingOver(true);
    try {
      const pendingIds = pending.map(l => l.id);
      await handoverStaffPendingLeads(
        { id: handoverUser.id, name: handoverUser.name },
        { id: targetStaff.id, name: targetStaff.name },
        pendingIds
      );

      if (setLeads) {
        setLeads(prev =>
          prev.map(l => {
            if (pendingIds.includes(l.id)) {
              return {
                ...l,
                assignedTo: targetStaff.name,
                notes: ((l.notes || '') + ' [ໂອນເຄສຈາກ ' + handoverUser.name + ' ໃຫ້ ' + targetStaff.name + ']').trim(),
              };
            }
            return l;
          })
        );
      }

      triggerFeedback('ໂອນຍ້າຍ ' + pending.length + ' ເຄສໃຫ້ "' + targetStaff.name + '" ສຳເລັດແລ້ວ!');
      showToast('ໂອນຍ້າຍ ' + pending.length + ' ເຄສໃຫ້ "' + targetStaff.name + '" ສຳເລັດແລ້ວ!', 'success');
      setHandoverUser(null);
      setSelectedTargetUserId('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to handover deals', 'error');
    } finally {
      setIsHandingOver(false);
    }
  };

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDepartment, setNewDepartment] = useState('ຝ່າຍຂາຍ ແລະ ບໍລິການລູກຄ້າ');
  const [newRole, setNewRole] = useState<UserRole>('sales');

  const triggerFeedback = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Only Admin manages accounts
  const isAdmin = isAdminRole(currentUser);
  const canDeleteUsers = isAdmin;
  const canGrantRoles = isAdmin;
  /** Old Technician / General User account that has not been given Admin or Sales yet */
  const hasNoRole = (user: SystemUser) => user.dbRole !== undefined && !normalizeRole(user.dbRole);

  // Toggle user active / suspended status
  const handleToggleUserStatus = async (userToToggle: SystemUser) => {
    if (userToToggle.id === currentUser.id) {
      showToast('ບໍ່ສາມາດລະງັບບັນຊີຂອງຕົນເອງໄດ້!', 'error');
      return;
    }
    const newStatus = userToToggle.status === 'suspended' ? 'active' : 'suspended';
    const updated: SystemUser = { ...userToToggle, status: newStatus };
    try {
      if (newStatus === 'active') {
        if (hasNoRole(userToToggle)) {
          // Store the Sales role before giving access
          const saved = await saveStaffProfile({ ...userToToggle, role: 'sales', roleTitleLo: ROLE_LABELS.sales });
          updated.dbRole = saved.dbRole;
        }
        await reactivateStaffProfile(updated.id);
      } else {
        await deactivateStaffProfile(updated.id);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update account status.', 'error');
      return;
    }
    setUsers(prev => prev.map(u => u.id === userToToggle.id ? updated : u));
    triggerFeedback(
      newStatus === 'active'
        ? `ເປີດໃຊ້ງານບັນຊີ "${userToToggle.name}" ສຳເລັດ`
        : `ລະງັບບັນຊີ "${userToToggle.name}" ສຳເລັດ`
    );
  };

  // 1. ARCHIVE (SOFT DELETE) USER HANDLER — hides from web while preserving DB record for 10-year audit
  const handleConfirmDelete = async () => {
    if (!deletingUser || isDeleting) return;
    if (deletingUser.id === currentUser.id) {
      showToast('ບໍ່ສາມາດລົບຕົນເອງ (Admin ປະຈຸບັນ) ອອກຈາກໜ້າເວັບໄດ້!', 'error');
      setDeletingUser(null);
      return;
    }
    if (deletingUser.status === 'active') {
      showToast('ກະລຸນາກົດປິດໃຊ້ງານ (Deactivate) ກ່ອນລົບອອກຈາກໜ້າເວັບ', 'warning');
      setDeletingUser(null);
      return;
    }

    const remainingAdmins = users.filter(
      u => u.role === 'admin' && 
           u.status === 'active' && 
           u.id !== deletingUser.id
    );
    if (deletingUser.role === 'admin' && remainingAdmins.length === 0) {
      showToast('ບໍ່ສາມາດລົບ Admin ຄົນສຸດທ້າຍອອກໄດ້! ຕ້ອງມີ Admin ຢ່າງໜ້ອຍ 1 ຄົນໃນລະບົບ.', 'warning');
      setDeletingUser(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteStaffProfile(deletingUser.id);
      setUsers(prev => prev.map(user => (user.id === deletingUser.id ? { ...user, status: 'archived' } : user)));
      triggerFeedback(`ລົບບັນຊີ "${deletingUser.name}" ອອກຈາກໜ້າເວັບແລ້ວ (ປະຫວັດຍັງເກັບໃນຖານຂໍ້ມູນ)`);
      setDeletingUser(null);
    } catch (error) {
      let msg = error instanceof Error ? error.message : 'Could not archive this account.';
      if (msg.includes('last active')) {
        msg = 'ບໍ່ສາມາດລົບ Admin ຄົນສຸດທ້າຍອອກໄດ້! ຕ້ອງມີ Admin ຢ່າງໜ້ອຍ 1 ຄົນ.';
      } else if (msg.includes('own account')) {
        msg = 'ບໍ່ສາມາດລົບຕົນເອງອອກໄດ້!';
      } else if (msg.includes('not found') || msg.includes('404')) {
        msg = 'ບໍ່ພົບບັນຊີຜູ້ໃຊ້ນີ້ໃນລະບົບ.';
      }
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // 2. SAVE ACCOUNT & ROLE HANDLER (permissions follow the role)
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || isSavingUser) return;

    const finalRole: UserRole = editingUser.role;

    const cleanName = (editingUser.name || '').trim();
    if (!cleanName) {
      showToast('ກະລຸນາປ້ອນຊື່ ແລະ ນາມສະກຸນ ຂອງຜູ້ໃຊ້!', 'error');
      return;
    }

    // Guard: never leave the system without an active admin
    const target = users.find(u => u.id === editingUser.id);
    const wasActiveAdmin = Boolean(target && target.role === 'admin' && target.status === 'active');
    const willBeAdmin = finalRole === 'admin';
    if (wasActiveAdmin && !willBeAdmin) {
      const otherActiveAdmins = users.filter(
        u => u.id !== editingUser.id && u.role === 'admin' && u.status === 'active'
      );
      if (otherActiveAdmins.length === 0) {
        showToast('ບໍ່ສາມາດປ່ຽນບົດບາດຂອງ Admin ຄົນສຸດທ້າຍໄດ້! ຕ້ອງມີ Admin ຢ່າງໜ້ອຍ 1 ຄົນໃນລະບົບ.', 'warning');
        return;
      }
      if (editingUser.id === currentUser.id) {
        const ok = window.confirm('ທ່ານກຳລັງຫຼຸດສິດ Admin ຂອງຕົນເອງ. ຫຼັງບັນທຶກແລ້ວ ທ່ານຈະບໍ່ສາມາດຈັດການຜູ້ໃຊ້ ຫຼື ມອບສິດຄືນເອງໄດ້. ຢືນຢັນບໍ່?');
        if (!ok) return;
      }
    }

    const initials = cleanName
      .split(/\s+/)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || editingUser.avatarInitials;

    const updatedUser: SystemUser = {
      ...editingUser,
      name: cleanName,
      phone: (editingUser.phone || '').trim(),
      department: (editingUser.department || '').trim(),
      avatarInitials: initials,
      role: finalRole,
      roleTitleLo: ROLE_LABELS[finalRole],
    };

    setIsSavingUser(true);
    try {
      const saved = await saveStaffProfile(updatedUser);
      setUsers(prev => prev.map(u => (u.id === updatedUser.id ? saved : u)));
      triggerFeedback(`${t.success}: ${updatedUser.name}`);
      setEditingUser(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update this account.', 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  // 3. CREATE NEW USER HANDLER
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || isSavingUser) return;
    if (newPassword.trim().length < 8) {
      showToast('ກະລຸນາຕັ້ງລະຫັດຜ່ານເລີ່ມຕົ້ນຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ!', 'warning');
      return;
    }
    setIsSavingUser(true);
    try {
      const newUser = await createStaffAccount({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim(),
        department: newDepartment.trim(),
        role: newRole,
        password: newPassword.trim(),
      });
      setUsers(prev => [newUser, ...prev]);
      setIsAddUserOpen(false);
      triggerFeedback(`${t.success}: ${newUser.name}`);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not create this account.', 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Distinct Avatar Color Gradients per Role
  const getUserAvatarStyle = (role: UserRole) => {
    if (role === 'admin') {
      return 'bg-gradient-to-tr from-slate-700 to-slate-500 text-white font-black shadow-sm border border-slate-500';
    }
    return 'bg-gradient-to-tr from-slate-600 to-slate-500 text-white font-bold shadow-sm border border-slate-500';
  };

  // Use restrained role colors so status remains the clearest account signal.
  const getRoleBadge = (user: SystemUser) => {
    const role = user.role;
    if (hasNoRole(user)) {
      return (
        <span className="user-management-role-badge user-management-role-user px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit" title="ບັນຊີເກົ່າ: ເປີດໃຊ້ງານເພື່ອມອບບົດບາດ Sales ຫຼື ແກ້ໄຂເພື່ອເລືອກບົດບາດ">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>ຍັງບໍ່ມີບົດບາດ</span>
        </span>
      );
    }
    if (role === 'admin') {
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
        <span>{ROLE_LABELS[role]}</span>
      </span>
    );
  };

  // Keep account status readable without hidden badge toggles; explicit row buttons drive lifecycle transitions.
  const getStatusBadge = (status?: string) => {
    const isActive = status === 'active';
    return (
      <span
        className={`user-management-status-badge ${isActive ? 'user-management-status-active' : 'user-management-status-suspended'} px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition-colors w-fit`}
      >
        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
        <span>{isActive ? 'ເປີດໃຊ້ງານ (Active)' : 'ປິດໃຊ້ງານຊົ່ວຄາວ (Suspended)'}</span>
      </span>
    );
  };

  // Filtered users (excluding removed technician demo account and archived soft-deleted staff)
  const activeUsers = users.filter(
    u => u.id !== 'user-tech-01' && !u.name?.includes('ຊ່າງເຕັກນິກ') && u.status !== 'archived'
  );
  const filteredUsers = activeUsers.filter(user => {
    if (selectedRoleFilter !== 'all' && user.role !== selectedRoleFilter) return false;
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

  // RESTRICTED VIEW: If current logged in user is not an Admin
  if (!isAdmin) {
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
            ສະເພາະຜູ້ດູແລລະບົບ (Admin) ເທົ່ານັ້ນ ທີ່ມີສິດຈັດການບັນຊີຜູ້ໃຊ້ ແລະ ມອບສິດ.
          </p>
        </div>
      </div>
    );
  }

  // ADMIN MANAGEMENT CONSOLE
  return (
    <div className="user-management-view space-y-4 pb-12 sm:space-y-5">
      {/* Toast Alert */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 bg-zinc-900 border border-emerald-500/60 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      <div className="user-management-hero theme-adaptive-dark-surface bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 rounded-3xl text-slate-900 dark:text-white flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="user-management-hero-icon p-2 rounded-xl font-black" aria-hidden="true">
            <Crown className="w-5 h-5" />
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            ຈັດການບັນຊີ & ສິດ
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setIsAddUserOpen(true)}
          aria-label="ສ້າງບັນຊີຜູ້ໃຊ້ໃໝ່"
          className="user-management-primary-action flex min-h-11 items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>ສ້າງບັນຊີໃໝ່</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="user-management-stat rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="user-management-stat-icon user-management-stat-icon-blue"><UserCheck className="h-4 w-4" /></span>
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">ບັນຊີທັງໝົດ</p>
              <p className="mt-0.5 text-xl font-bold font-mono text-slate-900 dark:text-white">{activeUsers.length}</p>
            </div>
          </div>
        </div>
        <div className="user-management-stat rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="user-management-stat-icon user-management-stat-icon-green"><CheckCircle2 className="h-4 w-4" /></span>
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">ບັນຊີທີ່ໃຊ້ງານຢູ່</p>
              <p className="mt-0.5 text-xl font-bold font-mono text-slate-900 dark:text-white">{activeUsers.filter(user => user.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="user-management-stat rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="user-management-stat-icon user-management-stat-icon-amber"><Shield className="h-4 w-4" /></span>
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">ຜູ້ດູແລລະບົບ (Admin)</p>
              <p className="mt-0.5 text-xl font-bold font-mono text-slate-900 dark:text-white">{activeUsers.filter(user => user.role === 'admin').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="user-management-toolbar theme-adaptive-dark-surface bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3 sm:p-4 rounded-2xl text-slate-900 dark:text-white flex flex-wrap items-center gap-3 text-xs shadow-md">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search aria-hidden="true" className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              aria-label="ຄົ້ນຫາຜູ້ໃຊ້"
              placeholder="ຄົ້ນຫາຜູ້ໃຊ້..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-11 w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white text-xs"
            />
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor="user-role-filter" className="text-zinc-400 font-medium">ປະເພດ</label>
            <select
              id="user-role-filter"
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="min-h-11 max-w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white text-xs cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-white">ທັງໝົດ ({activeUsers.length})</option>
              <option value="admin" className="bg-zinc-900 text-white">Admin</option>
              <option value="sales" className="bg-zinc-900 text-white">Sales</option>
            </select>
          </div>
        </div>

        <span className="shrink-0 text-zinc-400 font-mono text-xs" aria-live="polite">
          <strong className="text-white">{filteredUsers.length}</strong> {t.unitPeople}
        </span>
      </div>

      {/* Users List: Table / Cards with Admin Actions */}
      <div className="user-management-list bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="font-bold text-base text-slate-900 dark:text-white">ບັນຊີຜູ້ໃຊ້</h2>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
          {filteredUsers.length === 0 && (
            <div className="user-management-empty-state px-6 py-12 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-400">
                <Search className="h-5 w-5" />
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">ບໍ່ພົບບັນຊີຜູ້ໃຊ້</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ຕົວກອງປະເພດບັນຊີ.</p>
            </div>
          )}
          {filteredUsers.map((user) => {
            const isCurrentUser = user.id === currentUser.id;
            const pendingLeadCount = isAdmin ? getUserPendingLeads(user).length : 0;

            return (
              <div
                key={user.id}
                className="user-management-account-row p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 xl:grid xl:grid-cols-[minmax(0,1.35fr)_minmax(180px,1fr)_auto] hover:bg-slate-50/80 dark:hover:bg-zinc-900/40 transition-colors text-xs"
              >
                {/* User Identity with Role Gradient Avatar */}
                <div className="flex items-center gap-3.5 min-w-65">
                  <div className={`user-management-avatar w-12 h-12 overflow-hidden rounded-2xl flex items-center justify-center font-bold text-sm ${getUserAvatarStyle(user.role)}`}>
                    {user.avatarInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{user.name}</h3>
                      {isCurrentUser && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 font-bold">
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

                {/* Role Badge & Status Badge */}
                <div className="space-y-1.5 min-w-37.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {getRoleBadge(user)}
                    {getStatusBadge(user.status)}
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono block">
                    ເຂົ້າສູ່ລະບົບ: {user.lastLogin || '-'}
                  </span>
                </div>

                {/* ADMIN ACTIONS: HANDOVER, GRANT ROLE & DELETE USER */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-900 xl:w-auto xl:pt-0">
                  {pendingLeadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTargetUserId('');
                        setHandoverUser(user);
                      }}
                      aria-label={`ໂອນເຄສຄັ່ງຄ້າງ ${pendingLeadCount} ລາຍການ`}
                      className="user-management-grant-button inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl border px-2 font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
                      title={`ໂອນເຄສລູກຄ້າທີ່ຄ້າງ ${pendingLeadCount} ລາຍການ`}
                    >
                      <ArrowRightLeft aria-hidden="true" className="w-4 h-4" />
                      <span className="text-[10px]">{pendingLeadCount}</span>
                    </button>
                  )}

                  {canGrantRoles && (
                    <button
                      onClick={() => {
                        setEditingUser({ ...user });
                      }}
                      aria-label="ມອບສິດ ແລະ ປ່ຽນບົດບາດ"
                      className="user-management-grant-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
                      title="ມອບສິດ ແລະ ປ່ຽນບົດບາດ"
                    >
                      <Key aria-hidden="true" className="w-4 h-4" />
                    </button>
                  )}

                  {!isCurrentUser && user.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleToggleUserStatus(user)}
                      disabled={!canDeleteUsers}
                      aria-label={`ປິດໃຊ້ງານບັນຊີ ${user.name}`}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                      title="ປິດໃຊ້ງານບັນຊີຊົ່ວຄາວ ແລະ ເຕະ Session ອອກທັນທີ"
                    >
                      <Power aria-hidden="true" className="w-3.5 h-3.5" />
                      <span>ປິດໃຊ້ງານ</span>
                    </button>
                  )}

                  {!isCurrentUser && user.status === 'suspended' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(user)}
                        disabled={!canDeleteUsers}
                        aria-label={`ເປີດໃຊ້ບັນຊີ ${user.name}`}
                        className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                        title="ເປີດໃຊ້ງານບັນຊີຄືນໃໝ່"
                      >
                        <RotateCcw aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>ເປີດໃຊ້</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingUser(user)}
                        disabled={!canDeleteUsers}
                        aria-label={!canDeleteUsers ? 'ທ່ານບໍ່ມີສິດລົບຜູ້ໃຊ້' : `ລົບບັນຊີ ${user.name} ອອກຈາກໜ້າເວັບ`}
                        className={`user-management-delete-button inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          !canDeleteUsers
                            ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed opacity-50'
                            : 'bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 hover:text-rose-200 border-rose-800/70 hover:border-rose-700'
                        }`}
                        title={!canDeleteUsers ? 'ທ່ານບໍ່ມີສິດລົບຜູ້ໃຊ້' : 'ລົບອອກຈາກໜ້າເວັບຖາວອນ (ຍັງເກັບປະຫວັດໃນຖານຂໍ້ມູນ)'}
                      >
                        <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>ລົບເລີຍ</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* MODAL: 1-CLICK PENDING DEALS HANDOVER */}
      {handoverUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">ໂອນເຄສຄັ່ງຄ້າງ (1-Click Handover)</h3>
                  <p className="text-xs text-zinc-400">ໂອນເຄສລູກຄ້າທີ່ຍັງລໍຖ້າສົ່ງມອບລົດໃຫ້ເພື່ອນຮ່ວມງານ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setHandoverUser(null); setSelectedTargetUserId(''); }}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Source User Card */}
            <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-400 block">ພະນັກງານຕົ້ນທາງ</span>
                <span className="font-bold text-sm text-white">{handoverUser.name}</span>
                <span className="text-xs text-zinc-400 block font-mono">{handoverUser.phone} • {handoverUser.role}</span>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {getUserPendingLeads(handoverUser).length} ເຄສຄ້າງ
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1 font-mono">
                  {handoverUser.status === 'suspended' ? '🔴 ຖືກລະງັບແລ້ວ' : '🟢 ພ້ອມໂອນ'}
                </span>
              </div>
            </div>

            {/* Pending Deals List Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">
                ລາຍການລູກຄ້າທີ່ຍັງເຈລະຈາ / ລໍຖ້າສົ່ງມອບ ({getUserPendingLeads(handoverUser).length} ລາຍ)
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {getUserPendingLeads(handoverUser).map((lead) => (
                  <div key={lead.id} className="p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{lead.customerName}</span>
                      <span className="text-[11px] text-zinc-400 font-mono">{lead.phone} • {lead.interestedModel}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {lead.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Colleague Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">
                ເລືອກເພື່ອນຮ່ວມງານປາຍທາງ (Active Sales / Admin) <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedTargetUserId}
                onChange={(e) => setSelectedTargetUserId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="" className="bg-zinc-900 text-zinc-400">-- ເລືອກພະນັກງານຂາຍທີ່ມີສະຖານະ Active --</option>
                {users
                  .filter(u => u.id !== handoverUser.id && u.status === 'active' && !hasNoRole(u))
                  .map(target => (
                    <option key={target.id} value={target.id} className="bg-zinc-900 text-white">
                      {target.name} ({ROLE_LABELS[target.role]}) - {target.phone}
                    </option>
                  ))}
              </select>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => { setHandoverUser(null); setSelectedTargetUserId(''); }}
                className="px-4 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs font-semibold"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                disabled={!selectedTargetUserId || isHandingOver}
                onClick={handleConfirmHandover}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-amber-500/20"
              >
                {isHandingOver ? (
                  <span>ກຳລັງໂອນຍ້າຍ...</span>
                ) : (
                  <>
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>ຢືນຢັນການໂອນ 1-Click</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => {
                  setEditingUser(null);
                }}
                className="user-management-modal-close p-1.5 rounded-xl border transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
              {/* Staff details (email is the login identity and stays read-only) */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="edit-user-name" className="block text-zinc-300 font-medium mb-1.5">
                    ຊື່ ແລະ ນາມສະກຸນ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="edit-user-name"
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-user-phone" className="block text-zinc-300 font-medium mb-1.5">ເບີໂທລະສັບ</label>
                  <input
                    id="edit-user-phone"
                    type="tel"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-user-department" className="block text-zinc-300 font-medium mb-1.5">ພະແນກ</label>
                  <input
                    id="edit-user-department"
                    type="text"
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="edit-user-email" className="block text-zinc-300 font-medium mb-1.5">ອີເມວ (ໃຊ້ເຂົ້າສູ່ລະບົບ)</label>
                  <input
                    id="edit-user-email"
                    type="email"
                    readOnly
                    value={editingUser.email}
                    className="w-full cursor-not-allowed bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <label className="block text-zinc-300 font-medium mb-1.5">
                  ເລືອກບົດບາດ (Role) ທີ່ຕ້ອງການມອບໃຫ້:
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => {
                    const selected = e.target.value as UserRole;
                    setEditingUser({
                      ...editingUser,
                      role: selected,
                      roleTitleLo: ROLE_LABELS[selected],
                    });
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white cursor-pointer"
                >
                  {ROLE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value} className="bg-zinc-900 text-white">{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                  }}
                  disabled={isSavingUser}
                  className="user-management-modal-cancel px-4 py-2 rounded-xl border cursor-pointer disabled:opacity-50"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="user-management-modal-submit px-5 py-2 font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingUser ? 'ກຳລັງບັນທຶກ...' : 'ຢືນຢັນການມອບສິດ'}
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
              <h3 className="font-bold text-lg text-white">ຢືນຢັນການລົບບັນຊີອອກຈາກໜ້າເວັບ?</h3>
              <p className="text-xs text-zinc-300">
                ຕ້ອງການລົບບັນຊີ: <strong className="text-white underline">{deletingUser.name}</strong> ({deletingUser.email || deletingUser.phone}) ອອກຈາກໜ້າເວັບບໍ່?
              </p>
              <p className="text-[11px] text-rose-300 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/60 flex items-center justify-center gap-1.5 text-left">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>ບັນຊີນີ້ຈະຖືກຊ່ອນຈາກໜ້າເວັບ ແລະ ປິດສິດເຂົ້າລະບົບຖາວອນ (ຍັງຄົງເກັບຂໍ້ມູນໄວ້ໃນຖານຂໍ້ມູນເພື່ອອ້າງອີງປະຫວັດບິນ 10 ປີ).</span>
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
                <span>{isDeleting ? 'ກຳລັງດຳເນີນການ...' : 'ຢືນຢັນລົບອອກຈາກໜ້າເວັບ'}</span>
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
                <label className="block text-zinc-300 mb-1 font-medium">ຊື່ ແລະ ນາມສະກຸນ <span className="text-red-500 font-bold ml-1">*</span></label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. ທ່ານ ສົມຈິດ ໄຊຍະວົງ"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">ເບີໂທລະສັບ <span className="text-red-500 font-bold ml-1">*</span></label>
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
                  <label className="block text-zinc-300 mb-1 font-medium">ອີເມວ <span className="text-red-500 font-bold ml-1">*</span></label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@laos-ev.la"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-medium">ລະຫັດຜ່ານເລີ່ມຕົ້ນ (Initial Password) <span className="text-red-500 font-bold ml-1">*</span></label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="ຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ (ພະນັກງານໃຊ້ລ็อกອິນໄດ້ທັນທີ)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">ປະເພດບັນຊີ (Role) <span className="text-red-500 font-bold ml-1">*</span></label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white cursor-pointer font-medium"
                  >
                    {ROLE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value} className="bg-zinc-900 text-white">{option.label}</option>
                    ))}
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
                  disabled={isSavingUser}
                  className="user-management-modal-cancel px-4 py-2 rounded-xl border cursor-pointer disabled:opacity-50"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="user-management-modal-submit px-5 py-2 font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingUser ? 'ກຳລັງສ້າງ...' : 'ສ້າງຜູ້ໃຊ້ໃໝ່'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
