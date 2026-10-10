import { useState } from 'react';
import { SystemUser, UserRole, Language } from '../../types';
import { translations } from '../../data/translations';
import { createStaffAccount, deactivateStaffProfile, saveStaffProfile } from '../../backend/data';
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Lock, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  Search, 
  Phone, 
  Mail, 
  Building2, 
  X,
  ShieldAlert,
  UserX,
  Check,
  QrCode,
  Car
} from 'lucide-react';

interface UserManagementViewProps {
  currentUser: SystemUser;
  users: SystemUser[];
  setUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  lang: Language;
}

export default function UserManagementView({
  currentUser,
  users,
  setUsers,
  lang,
}: UserManagementViewProps) {
  const t = translations[lang] || translations.lo;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  
  // Modal states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDepartment, setNewDepartment] = useState('ຝ່າຍຂາຍ ແລະ ບໍລິການລູກຄ້າ');
  const [newRole, setNewRole] = useState<UserRole>('general_user');

  const triggerFeedback = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const canManageUsers = Boolean(currentUser.permissions?.canManageUsers);
  const canGrantRoles = Boolean(currentUser.permissions?.canGrantRoles);

  // 1. DELETE USER HANDLER (Admin ລົບຜູ້ໃຊ້ອື່ນໄດ້)
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    if (deletingUser.id === currentUser.id) {
      alert('ບໍ່ສາມາດລົບຕົນເອງ (Admin ປະຈຸບັນ) ອອກຈາກລະບົບໄດ້!');
      setDeletingUser(null);
      return;
    }

    try {
      await deactivateStaffProfile(deletingUser.id);
    } catch (error) {
      triggerFeedback(error instanceof Error ? error.message : 'Could not suspend this account.');
      return;
    }

    setUsers(prev => prev.map(user => user.id === deletingUser.id ? { ...user, status: 'suspended' } : user));
    triggerFeedback(`ປິດສິດບັນຊີ "${deletingUser.name}" ສຳເລັດແລ້ວ`);
    setDeletingUser(null);
  };

  // 2. GRANT ROLE & PERMISSIONS HANDLER (Admin ມອບສິດໃຫ້ແກ່ຜູ້ອື່ນ)
  const handleSaveRoleAndPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!canGrantRoles) {
      triggerFeedback('ບັນຊີນີ້ບໍ່ມີສິດມອບບົດບາດ.');
      return;
    }
    if (currentUser.role !== 'super_admin' && ['admin', 'super_admin'].includes(editingUser.role)) {
      triggerFeedback('ມີພຽງ Super Admin ທີ່ມອບສິດ Admin ໄດ້.');
      return;
    }

    // Get default role title
    const getRoleTitle = (role: UserRole) => {
      switch (role) {
        case 'super_admin': return t.roleSuperAdmin;
        case 'admin': return t.roleBranchAdmin;
        case 'sales': return t.roleSales;
        case 'technician': return t.roleTechnician;
        case 'general_user': return t.roleGeneralUser;
      }
    };

    const updatedUser: SystemUser = {
      ...editingUser,
      roleTitleLo: getRoleTitle(editingUser.role),
    };

    try {
      const savedUser = await saveStaffProfile(updatedUser);
      setUsers(prev => prev.map(u => (u.id === savedUser.id ? savedUser : u)));
    } catch (error) {
      triggerFeedback(error instanceof Error ? error.message : 'Could not update staff role.');
      return;
    }

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
        email: newEmail.trim(),
        phone: newPhone.trim(),
        department: newDepartment,
        role: newRole,
      });
      setUsers(prev => [newUser, ...prev]);
      setIsAddUserOpen(false);
      triggerFeedback(`ສົ່ງຄຳເຊີນໄປ ${newUser.email} ແລ້ວ`);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
    } catch (error) {
      triggerFeedback(error instanceof Error ? error.message : 'Could not invite the staff account.');
    }
  };

  // Role Badge Helper
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-black border border-zinc-300 flex items-center gap-1.5 w-fit shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-black" />
            {t.roleSuperAdmin}
          </span>
        );
      case 'admin':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 w-fit">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t.roleBranchAdmin}
          </span>
        );
      case 'sales':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700 flex items-center gap-1.5 w-fit">
            {t.roleSales}
          </span>
        );
      case 'technician':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700 flex items-center gap-1.5 w-fit">
            {t.roleTechnician}
          </span>
        );
      case 'general_user':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 flex items-center gap-1.5 w-fit">
            {t.roleGeneralUser}
          </span>
        );
    }
  };

  // Filtered users
  const filteredUsers = users.filter(user => {
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

  // RESTRICTED VIEW: If current logged in user is a General User
  if (!canManageUsers) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-center max-w-2xl mx-auto space-y-4 my-8">
          <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-full w-fit mx-auto text-zinc-300">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            ສະຫງວນສິດສຳລັບ Admin ເທົ່ານັ້ນ
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            ທ່ານກຳລັງເຂົ້າສູ່ລະບົບໃນຖານະ: <strong className="text-white">{currentUser.name} ({currentUser.roleTitleLo})</strong>. 
            ຜູ້ดูแลระบบเท่านั้นที่มีสิทธิ์จัดการบัญชีพนักงานและกำหนด role
          </p>
        </div>
      </div>
    );
  }

  // SUPER ADMIN MANAGEMENT CONSOLE
  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 bg-zinc-900 border border-zinc-700 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Banner: Admin Executive Privileges */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-7 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white text-black rounded-lg font-bold">
              <ShieldCheck className="w-5 h-5 text-black" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
              SUPER ADMIN CONSOLE • ລະບົບຄວບຄຸມສິດຜູ້ໃຊ້
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ຈັດການຜູ້ໃຊ້ & ມອບສິດ (User Access Governance)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Admin: <strong>{currentUser.name}</strong> | ທ່ານສາມາດ **ລົບຜູ້ໃຊ້ອື່ນອອກຈາກລະບົບ** ແລະ **ມອບສິດ/ບົດບາດ** ໄດ້ຕາມຕ້ອງການ
          </p>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 transition-all shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ ເພີ່ມຜູ້ໃຊ້ໃໝ່ (Add User)</span>
        </button>
      </div>


      {/* Filter and Search Bar */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="ຄົ້ນຫາຊື່ຜູ້ໃຊ້, ເບີໂທ, ອີເມວ, ພະແນກ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">{t.memberRole}:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
            >
              <option value="all">{t.filterAll} ({users.length})</option>
              <option value="super_admin">{t.roleSuperAdmin}</option>
              <option value="admin">{t.roleBranchAdmin}</option>
              <option value="sales">{t.roleSales}</option>
              <option value="technician">{t.roleTechnician}</option>
              <option value="general_user">{t.roleGeneralUser}</option>
            </select>
          </div>
        </div>

        <span className="text-zinc-400 font-mono text-xs">
          {t.usersTitle}: <strong className="text-white">{filteredUsers.length}</strong> {t.unitPeople}
        </span>
      </div>

      {/* Users List: Table / Cards with Admin Actions */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-white">ລາຍຊື່ຜູ້ໃຊ້ໃນລະບົບ</h2>
            <p className="text-xs text-zinc-400">ທ່ານສາມາດກົດ **ມອບສິດ** ຫຼື **ລົບຜູ້ໃຊ້** ອອກຈາກລະບົບໄດ້</p>
          </div>
        </div>

        <div className="divide-y divide-zinc-800/80">
      {filteredUsers.map((user) => {
            const isCurrentUser = user.id === currentUser.id;

            return (
              <div
                key={user.id}
                className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-zinc-900/40 transition-colors text-xs"
              >
                {/* User Identity */}
                <div className="flex items-center gap-3.5 min-w-[260px]">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${
                    user.role === 'super_admin'
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'bg-zinc-800 text-white border border-zinc-700'
                  }`}>
                    {user.avatarInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{user.name}</h3>
                      {isCurrentUser && (
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
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
                    <p className="text-zinc-500 text-[11px] mt-0.5">{user.department}</p>
                  </div>
                </div>

                {/* Role Badge & Status */}
                <div className="space-y-1">
                  <div>{getRoleBadge(user.role)}</div>
                  <span className="text-[11px] text-zinc-500 font-mono block">
                    ເຂົ້າສູ່ລະບົບ: {user.lastLogin}
                  </span>
                </div>

                {/* Permissions Preview */}
                <div className="hidden lg:block space-y-1 text-[11px]">
                  <span className="text-zinc-500 uppercase font-mono text-[10px] block">ສິດການໃຊ້ງານ:</span>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {user.permissions.canManageUsers && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ຈັດການຜູ້ໃຊ້</span>
                      </span>
                    )}
                    {user.permissions.canDeleteUsers && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ລົບຜູ້ໃຊ້ໄດ້</span>
                      </span>
                    )}
                    {user.permissions.canGrantRoles && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ມອບສິດໄດ້</span>
                      </span>
                    )}
                    {user.permissions.canEditInventory && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ແກ້ສະຕ໋ອກ</span>
                      </span>
                    )}
                    {user.permissions.canUploadQR && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ອັບໂຫລດ QR</span>
                      </span>
                    )}
                    {user.permissions.canAddModels && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ເພີ່ມລຸ້ນລົດ</span>
                      </span>
                    )}
                    {user.permissions.canDeductPOS && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>ຕັດສະຕ໋ອກ POS</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* ADMIN ACTIONS: GRANT ROLE & DELETE USER */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-900">
                  {/* Grant / Change Role Button */}
                    {canGrantRoles && <button
                      onClick={() => setEditingUser(user)}
                    className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl border border-zinc-700 font-semibold flex items-center gap-1.5 transition-colors"
                    title="ມອບສິດ ແລະ ປ່ຽນບົດບາດ"
                  >
                    <Key className="w-3.5 h-3.5 text-zinc-300" />
                    <span>ມອບສິດ (Grant)</span>
                    </button>}

                  {/* Delete User Button (Disabled for current self Super Admin) */}
                  <button
                    onClick={() => setDeletingUser(user)}
                    disabled={isCurrentUser}
                    className={`px-3 py-2 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors ${
                      isCurrentUser
                        ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">ມອບສິດ ແລະ ປ່ຽນບົດບາດ</h3>
                  <p className="text-xs text-zinc-400">{editingUser.name} ({editingUser.phone})</p>
                </div>
              </div>

              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleAndPermissions} className="space-y-4 text-xs">
              {/* Select Role */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1.5">
                  ເລືອກບົດບາດ (Role) ທີ່ຕ້ອງການມອບໃຫ້:
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setEditingUser({ ...editingUser, role: newRole });
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                >
                  {currentUser.role === 'super_admin' && <option value="super_admin">Admin (Super Admin - ສິດສູງສຸດ)</option>}
                  {currentUser.role === 'super_admin' && <option value="admin">Admin ສາຂາ (Branch Admin)</option>}
                  <option value="sales">ທີ່ປຶກສາການຂາຍ (Sales Staff)</option>
                  <option value="technician">ຊ່າງເຕັກນິກ PDI & ແບັດເຕີຣີ</option>
                  <option value="general_user">ຜູ້ໃຊ້ທົ່ວໄປ (General User / Staff)</option>
                </select>
              </div>

              <p className="pt-3 border-t border-zinc-800 text-zinc-400 text-xs">
                ສິດເຂົ້າເຖິງມາຈາກ role ໃນຖານຂໍ້ມູນ staff_roles.
              </p>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-900"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors shadow-md"
                >
                  ຢືນຢັນການມອບສິດ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM DELETE USER */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white space-y-4 shadow-2xl">
            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-2xl w-fit text-zinc-300 mx-auto">
              <UserX className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg text-white">ຢືນຢັນການລົບຜູ້ໃຊ້?</h3>
              <p className="text-xs text-zinc-300">
                ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບຜູ້ໃຊ້: <strong className="text-white">{deletingUser.name}</strong> ({deletingUser.phone}) ອອກຈາກລະບົບ?
              </p>
              <p className="text-[11px] text-zinc-500">
                ການກະທຳນີ້ຈະລົບສິດການເຂົ້າເຖິງລະບົບຂອງຜູ້ໃຊ້ນີ້ທັງໝົດ.
              </p>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-5 py-2.5 border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-900 text-xs font-semibold"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-lg border border-zinc-700 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ຢືນຢັນການລົບຜູ້ໃຊ້</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD NEW USER */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                <span>ເພີ່ມຜູ້ໃຊ້ໃໝ່ເຂົ້າລະບົບ</span>
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">ຊື່ ແລະ ນາມສະກຸນ *</label>
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
                  <label className="block text-zinc-400 mb-1 font-medium">ເບີໂທລະສັບ *</label>
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
                  <label className="block text-zinc-400 mb-1 font-medium">ອີເມວ</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@laos-ev.la"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">ບົດບາດເລີ່ມຕົ້ນ (Role)</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white"
                  >
                    <option value="general_user">ຜູ້ໃຊ້ທົ່ວໄປ (General User)</option>
                    <option value="sales">ທີ່ປຶກສາການຂາຍ (Sales Staff)</option>
                    <option value="technician">ຊ່າງ PDI & CATL</option>
                    {currentUser.role === 'super_admin' && <option value="admin">Admin ສາຂາ (Branch Admin)</option>}
                    {currentUser.role === 'super_admin' && <option value="super_admin">Admin (Super Admin)</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">ພະແນກ / ສາຂາ</label>
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
                  className="px-4 py-2 border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-900"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors shadow-md"
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
