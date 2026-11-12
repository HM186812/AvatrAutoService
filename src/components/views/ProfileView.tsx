import { useEffect, useRef, useState } from 'react';
import { isAdminRole } from '../../utils/roles';
import { SystemUser, Language, Lead } from '../../types';
import { translations } from '../../data/translations';
import UserManagementView from './UserManagementView';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Hash,
  ShieldCheck, 
  Key, 
  Check, 
  LogOut, 
  Save, 
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { saveUserToSupabase } from '../../supabase';
import { supabase } from '../../backend/client';

interface ProfileViewProps {
  currentUser: SystemUser;
  onUpdateProfile: (updated: SystemUser) => void;
  onLogout: () => void;
  lang: Language;
  onClose?: () => void;
  users?: SystemUser[];
  setUsers?: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  leads?: Lead[];
  setLeads?: React.Dispatch<React.SetStateAction<Lead[]>>;
}

export default function ProfileView({
  currentUser,
  onUpdateProfile,
  onLogout,
  lang,
  onClose,
  users = [],
  setUsers,
  leads,
  setLeads,
}: ProfileViewProps) {
  const t = translations[lang] || translations.lo;
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile');
  
  // Profile Form State
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email);
  const [department, setDepartment] = useState(currentUser.department);
  const [profileError, setProfileError] = useState<string | null>(null);
  const profileUserIdRef = useRef(currentUser.id);

  useEffect(() => {
    if (profileUserIdRef.current === currentUser.id) return;
    profileUserIdRef.current = currentUser.id;
    setName(currentUser.name);
    setPhone(currentUser.phone);
    setEmail(currentUser.email);
    setDepartment(currentUser.department);
    setProfileError(null);
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, [currentUser.id]);

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

  const isSuperAdmin = isAdminRole(currentUser);
  const canManageUsers = isSuperAdmin;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) {
      setProfileError(lang === 'en' ? 'Please enter your full name.' : lang === 'th' ? 'กรุณากรอกชื่อ-นามสกุล' : 'ກະລຸນາປ້ອນຊື່ ແລະ ນາມສະກຸນ');
      return;
    }
    if (!cleanPhone) {
      setProfileError(lang === 'en' ? 'Please enter your phone number.' : lang === 'th' ? 'กรุณากรอกเบอร์โทรศัพท์' : 'ກະລຸນາປ້ອນເບີໂທລະສັບ');
      return;
    }
    const initials = cleanName
      .split(/\s+/)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || currentUser.avatarInitials;

    // Email is the login identity and is read-only here (changed only by an administrator).
    const updatedUser: SystemUser = {
      ...currentUser,
      name: cleanName,
      phone: cleanPhone,
      department: department.trim(),
      avatarInitials: initials,
    };

    setProfileError(null);
    try {
      await saveUserToSupabase(updatedUser);
      onUpdateProfile(updatedUser);
      setName(cleanName);
      setPhone(cleanPhone);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Profile could not be saved.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError(
        lang === 'lo'
          ? 'ລະຫັດຜ່ານປັດຈຸບັນບໍ່ຖືກຕ້ອງ!'
          : lang === 'th'
          ? 'รหัสผ่านปัจจุบันไม่ถูกต้อง!'
          : 'Current password is incorrect!'
      );
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError(
        lang === 'lo'
          ? 'ລະຫັດຜ່ານໃໝ່ຕ້ອງມີ 8 ຕົວຂຶ້ນໄປ!'
          : lang === 'th'
          ? 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร!'
          : 'New password must be at least 8 characters!'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordMismatchError || 'ລະຫັດຜ່ານໃໝ່ ແລະ ການຢືນຢັນບໍ່ກົງກັນ!');
      return;
    }

    try {
      if (!supabase) {
        setPasswordSuccess(t.passwordSuccessMsg || 'ປ່ຽນລະຫັດຜ່ານສຳເລັດແລ້ວ (ໂໝດ Localhost)!');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: currentPassword });
        if (signInError) throw signInError;
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setPasswordSuccess(t.passwordSuccessMsg || 'ປ່ຽນລະຫັດຜ່ານສຳເລັດແລ້ວ!');
      }
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Password could not be changed.');
      return;
    }
    
    setTimeout(() => {
      setPasswordSuccess(null);
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <header className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-gradient-to-br dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-400/[0.04] blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold shadow-sm sm:h-16 sm:w-16 sm:text-xl ${
            isSuperAdmin
              ? 'border border-amber-400/30 bg-amber-400/10 text-amber-500'
              : 'border border-sky-400/30 bg-sky-400/10 text-sky-600 dark:text-sky-400'
          }`}>
            <span>{currentUser.avatarInitials || currentUser.name.slice(0, 2)}</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">{currentUser.name}</h1>
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                  <UserCheck className="h-3.5 w-3.5" /> User
                </span>
              )}

              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                currentUser.status !== 'suspended'
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-rose-400/20 bg-rose-400/10 text-rose-600 dark:text-rose-400'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${currentUser.status !== 'suspended' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span>{currentUser.status !== 'suspended'
                  ? (lang === 'lo' ? 'ໃຊ້ງານຢູ່' : lang === 'th' ? 'ใช้งานอยู่' : 'Active')
                  : (lang === 'lo' ? 'ຖືກລະງັບ' : lang === 'th' ? 'ถูกระงับ' : 'Suspended')}</span>
              </span>
            </div>
            <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="inline-flex min-w-0 items-center gap-1.5">
                <Building2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                <dt className="shrink-0">{t.memberDepartment}:</dt>
                <dd className="min-w-0 truncate font-semibold">{currentUser.department || '—'}</dd>
              </div>
              <div className="inline-flex min-w-0 items-center gap-1.5">
                <Hash aria-hidden="true" className="h-4 w-4 shrink-0" />
                <dt className="shrink-0">ID:</dt>
                <dd className="truncate font-mono">{currentUser.id}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title="Close Profile"
              aria-label="Close Profile"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <LogOut className="h-4 w-4" />
            <span>{t.navLogout}</span>
          </button>
        </div>
        </div>
      </header>

      {/* Profile & User Governance Tabs (For Admin/Authorized) */}
      {canManageUsers && setUsers && (
        <div role="tablist" aria-label={lang === 'lo' ? 'ເມນູໂປຣໄຟລ໌' : lang === 'th' ? 'เมนูโปรไฟล์' : 'Profile navigation'} className="flex items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-1 sm:gap-1.5 sm:p-1.5">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:px-4 sm:text-sm ${
              activeTab === 'profile'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t.profileTitle || 'ຂໍ້ມູນສ່ວນຕົວ'}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:px-4 sm:text-sm ${
              activeTab === 'users'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{t.userGovernanceTitle || 'ຈັດການຜູ້ໃຊ້ & ມອບສິດ'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'users'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-black always-white-text'
                : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
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
            leads={leads}
            setLeads={setLeads}
            lang={lang}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 items-start gap-4">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-6">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {profileError && <p role="alert" className="text-xs text-rose-500">{profileError}</p>}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-zinc-300">{t.authFullName}</label>
                    <div className="relative">
                      <User aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="profile-name"
                        type="text"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-3 text-sm text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="profile-phone" className="mb-2 block text-sm font-medium text-zinc-300">{t.contactNumber} <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Phone aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="profile-phone"
                        type="tel"
                        required
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-3 text-sm text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-email" className="mb-2 block text-sm font-medium text-zinc-300">Email</label>
                    <div className="relative">
                      <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="profile-email"
                        type="email"
                        readOnly
                        autoComplete="email"
                        value={email}
                        className="min-h-11 w-full cursor-not-allowed rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-3 text-sm text-zinc-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="profile-department" className="mb-2 block text-sm font-medium text-zinc-300">{t.memberDepartment}</label>
                    <div className="relative">
                      <Building2 aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="profile-department"
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-3 text-sm text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordError(null);
                      setPasswordSuccess(null);
                      setIsPasswordModalOpen(true);
                    }}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <Key className="w-4 h-4 text-zinc-300" />
                    <span>{t.changePasswordBtn || 'ປ່ຽນລະຫັດຜ່ານ'}</span>
                  </button>

                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    <Save className="w-4 h-4" />
                    <span>{t.saveChanges}</span>
                  </button>
                </div>
              </form>
            </section>

          </div>
          </div>
      )}

      {/* POPUP MODAL: CHANGE PASSWORD */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div role="dialog" aria-modal="true" aria-labelledby="change-password-title" className="relative w-full max-w-md space-y-5 rounded-3xl border border-zinc-700 bg-zinc-950 p-5 text-white shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-600 dark:text-amber-400">
                  <Key className="h-5 w-5" />
                </span>
                <h3 id="change-password-title" className="text-base font-semibold text-white">
                  {t.changePasswordBtn || 'ປ່ຽນລະຫັດຜ່ານ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                aria-label="Close password dialog"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 transition hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordError && (
              <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
                <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password (if any) */}
              <div>
                <label htmlFor="current-password" className="mb-2 block text-sm font-medium text-zinc-300">
                  {t.currentPasswordLabel || 'ລະຫັດຜ່ານປັດຈຸບັນ'}
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 pr-11 text-sm text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-zinc-300">
                  {t.newPasswordLabel || 'ລະຫັດຜ່ານໃໝ່'} *
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 pr-11 text-sm text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-zinc-300">
                  {t.confirmPasswordLabel || 'ຢືນຢັນລະຫັດຜ່ານໃໝ່'} *
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 pr-11 text-sm text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-zinc-800 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="min-h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-5 py-2 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
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
