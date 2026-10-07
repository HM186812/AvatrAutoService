import { useState } from 'react';
import { SystemUser, Language } from '../../types';
import { translations } from '../../data/translations';
import UserManagementView from './UserManagementView';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  ShieldCheck, 
  Crown, 
  Key, 
  Lock, 
  Check, 
  LogOut, 
  Save, 
  X,
  Eye,
  EyeOff,
  Users,
  AlertTriangle
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: SystemUser;
  onUpdateProfile: (updated: SystemUser) => void;
  onLogout: () => void;
  lang: Language;
  onClose?: () => void;
  users?: SystemUser[];
  setUsers?: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  onSwitchUser?: (user: SystemUser) => void;
}

export default function ProfileView({
  currentUser,
  onUpdateProfile,
  onLogout,
  lang,
  onClose,
  users = [],
  setUsers,
  onSwitchUser,
}: ProfileViewProps) {
  const t = translations[lang] || translations.lo;
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile');
  
  // Profile Form State
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email);
  const [department, setDepartment] = useState(currentUser.department);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === 'super_admin';
  const canManageUsers = isSuperAdmin || Boolean(currentUser.permissions?.canManageUsers);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const initials = name
      .trim()
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || currentUser.avatarInitials;

    const updatedUser: SystemUser = {
      ...currentUser,
      name,
      phone,
      email,
      department,
      avatarInitials: initials,
    };

    onUpdateProfile(updatedUser);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Verify current password if user already had a password set
    if (currentUser.password && currentUser.password !== currentPassword) {
      setPasswordError(
        lang === 'lo'
          ? 'ລະຫັດຜ່ານປັດຈຸບັນບໍ່ຖືກຕ້ອງ!'
          : lang === 'th'
          ? 'รหัสผ่านปัจจุบันไม่ถูกต้อง!'
          : 'Current password is incorrect!'
      );
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setPasswordError(
        lang === 'lo'
          ? 'ລະຫັດຜ່ານໃໝ່ຕ້ອງມີຢ່າງໜ້ອຍ 4 ຕົວອັກສອນ!'
          : lang === 'th'
          ? 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร!'
          : 'New password must be at least 4 characters!'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordMismatchError || 'ລະຫັດຜ່ານໃໝ່ ແລະ ການຢືນຢັນບໍ່ກົງກັນ!');
      return;
    }

    const updatedUser: SystemUser = {
      ...currentUser,
      password: newPassword,
    };

    onUpdateProfile(updatedUser);
    setPasswordSuccess(t.passwordSuccessMsg || 'ປ່ຽນລະຫັດຜ່ານສຳເລັດແລ້ວ!');
    
    setTimeout(() => {
      setPasswordSuccess(null);
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-7 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl flex-shrink-0 ${
            isSuperAdmin ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-white border border-zinc-700'
          }`}>
            {currentUser.avatarInitials || currentUser.name.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-black text-white">{currentUser.name}</h1>
              {isSuperAdmin ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 font-mono">
                  <Crown className="w-3 h-3 fill-amber-400" /> {t.roleSuperAdmin}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-700 font-mono">
                  {currentUser.role === 'admin' ? t.roleBranchAdmin : currentUser.role === 'sales' ? t.roleSales : currentUser.role === 'technician' ? t.roleTechnician : t.roleGeneralUser}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              ID: {currentUser.id} • {t.memberDepartment}: {currentUser.department}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 transition-colors"
              title="Close Profile"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-950/70 hover:bg-red-900 text-red-300 rounded-xl border border-red-800 font-semibold text-xs transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.navLogout}</span>
          </button>
        </div>
      </div>

      {/* Profile & User Governance Tabs (For Admin/Authorized) */}
      {canManageUsers && setUsers && (
        <div className="flex items-center gap-2 p-1.5 bg-zinc-950 border border-zinc-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t.profileTitle || 'ຂໍ້ມູນສ່ວນຕົວ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-amber-400 text-black shadow-md font-extrabold'
                : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{t.userGovernanceTitle || 'ຈັດການຜູ້ໃຊ້ & ມອບສິດ'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'users' ? 'bg-black text-amber-300' : 'bg-amber-950 border border-amber-800 text-amber-300'
            }`}>
              {users.length}
            </span>
          </button>
        </div>
      )}

      {/* Render active tab */}
      {activeTab === 'users' && canManageUsers && setUsers ? (
        <div className="animate-fadeIn">
          <UserManagementView
            currentUser={currentUser}
            users={users}
            setUsers={setUsers}
            lang={lang}
            onSwitchUser={onSwitchUser || (() => {})}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          {savedSuccess && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-2xl text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{t.success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Edit Profile Form (2 cols) */}
            <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span>{t.profileTitle}</span>
                </div>

                {/* Change Password Button instead of plain input */}
                <button
                  type="button"
                  onClick={() => {
                    setPasswordError(null);
                    setPasswordSuccess(null);
                    setIsPasswordModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700 rounded-xl text-xs font-semibold transition-all hover:border-zinc-500 shadow-sm"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.changePasswordBtn || 'ປ່ຽນລະຫັດຜ່ານ'}</span>
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 mb-1.5 font-medium">{t.authFullName}</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1.5 font-medium">{t.contactNumber} *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 mb-1.5 font-medium">Email *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1.5 font-medium">{t.memberDepartment}</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Security Information Card */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">{t.authPassword}</span>
                      <span className="text-[11px] text-zinc-400 font-mono">•••••••••••• (Encrypted & Protected)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPasswordError(null);
                      setPasswordSuccess(null);
                      setIsPasswordModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold border border-zinc-700 transition-colors flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.changePasswordBtn || 'ປ່ຽນລະຫັດຜ່ານ'}</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-white hover:bg-zinc-200 text-black font-extrabold rounded-xl transition-all shadow-md flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{t.saveChanges}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Roles & Privileges Card (1 col) */}
            <div className="space-y-5">
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-white font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'lo' ? 'ສິດທິການໃຊ້ງານ (Permissions)' : lang === 'th' ? 'สิทธิ์การใช้งาน (Permissions)' : 'Permissions & Privileges'}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-300">{lang === 'lo' ? 'ຈັດການຜູ້ໃຊ້ & ມອບສິດ' : lang === 'th' ? 'จัดการผู้ใช้ & มอบสิทธิ์' : 'User Governance'}</span>
                    {currentUser.permissions?.canManageUsers ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {lang === 'lo' ? 'ອະນຸຍາດ' : lang === 'th' ? 'อนุญาต' : 'Granted'}
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-mono">{lang === 'lo' ? 'ບໍ່ມີສິດ' : lang === 'th' ? 'ไม่มีสิทธิ์' : 'Restricted'}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-300">{lang === 'lo' ? 'ແກ້ໄຂສະຕ໋ອກລົດຍົນ' : lang === 'th' ? 'แก้ไขสต็อกรถยนต์' : 'Edit Inventory'}</span>
                    {currentUser.permissions?.canEditInventory ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {lang === 'lo' ? 'ອະນຸຍາດ' : lang === 'th' ? 'อนุญาต' : 'Granted'}
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-mono">{lang === 'lo' ? 'ບໍ່ມີສິດ' : lang === 'th' ? 'ไม่มีสิทธิ์' : 'Restricted'}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-300">{lang === 'lo' ? 'ຂາຍລົດ POS & ຕັດສະຕ໋ອກ' : lang === 'th' ? 'ขายรถ POS & ตัดสต็อก' : 'POS Sales'}</span>
                    {currentUser.permissions?.canDeductPOS ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {lang === 'lo' ? 'ອະນຸຍາດ' : lang === 'th' ? 'อนุญาต' : 'Granted'}
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-mono">{lang === 'lo' ? 'ບໍ່ມີສິດ' : lang === 'th' ? 'ไม่มีสิทธิ์' : 'Restricted'}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-300">{lang === 'lo' ? 'ລົບຜູ້ໃຊ້ອອກຈາກລະບົບ' : lang === 'th' ? 'ลบผู้ใช้ออกจากระบบ' : 'Delete Users'}</span>
                    {currentUser.permissions?.canDeleteUsers ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {lang === 'lo' ? 'ອະນຸຍາດ' : lang === 'th' ? 'อนุญาต' : 'Granted'}
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-mono">{lang === 'lo' ? 'ບໍ່ມີສິດ' : lang === 'th' ? 'ไม่มีสิทธิ์' : 'Restricted'}</span>
                    )}
                  </div>
                </div>

                {canManageUsers && (
                  <div className="pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab('users')}
                      className="w-full py-2 px-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{t.manageUsersFromProfileBtn || 'ເຂົ້າສູ່ລະບົບຈັດການຜູ້ໃຊ້'}</span>
                    </button>
                  </div>
                )}

                <div className="pt-2 text-[11px] text-zinc-500 font-mono">
                  {lang === 'lo' ? 'ເຂົ້າສູ່ລະບົບຫຼ້າສຸດ:' : lang === 'th' ? 'เข้าสู่ระบบล่าสุด:' : 'Last Login:'} {currentUser.lastLogin || new Date().toISOString().slice(0, 10)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: CHANGE PASSWORD */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-amber-400">
                <Key className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">
                  {t.changePasswordBtn || 'ປ່ຽນລະຫັດຜ່ານ'}
                </h3>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 border border-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              {/* Current Password (if any) */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  {t.currentPasswordLabel || 'ລະຫັດຜ່ານປັດຈຸບັນ'}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-9 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  {t.newPasswordLabel || 'ລະຫັດຜ່ານໃໝ່'} *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-9 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">
                  {t.confirmPasswordLabel || 'ຢືນຢັນລະຫັດຜ່ານໃໝ່'} *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-9 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl font-semibold transition-colors border border-zinc-800"
                >
                  {t.cancelBtn || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{t.saveChanges || 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
