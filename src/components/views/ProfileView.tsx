import { useEffect, useRef, useState } from 'react';
import { SystemUser, Language } from '../../types';
import { translations } from '../../data/translations';
import UserManagementView from './UserManagementView';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  ShieldCheck, 
  Key, 
  Lock, 
  Check, 
  LogOut, 
  Save, 
  X,
  Eye,
  EyeOff,
  Users,
  AlertTriangle,
  ArrowRight,
  Crown,
  Wrench,
  TrendingUp,
  UserCheck,
  Camera,
} from 'lucide-react';
import { saveUserToSupabase } from '../../supabase';

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
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const profileUserIdRef = useRef(currentUser.id);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profileUserIdRef.current === currentUser.id) return;
    profileUserIdRef.current = currentUser.id;
    setName(currentUser.name);
    setPhone(currentUser.phone);
    setEmail(currentUser.email);
    setDepartment(currentUser.department);
    setAvatarUrl(currentUser.avatarUrl || '');
    setAvatarError(null);
    setSavedSuccess(false);
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

  const isSuperAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';
  const canManageUsers = isSuperAdmin || Boolean(currentUser.permissions?.canManageUsers);

  const handleSaveProfile = async (e: React.FormEvent) => {
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
      avatarUrl,
    };

    onUpdateProfile(updatedUser);
    await saveUserToSupabase(updatedUser);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAvatarChange = (file?: File) => {
    setAvatarError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError(lang === 'en' ? 'Choose an image file.' : lang === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ' : 'ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(lang === 'en' ? 'Image must be 5 MB or smaller.' : lang === 'th' ? 'รูปภาพต้องมีขนาดไม่เกิน 5 MB' : 'ຮູບພາບຕ້ອງມີຂະໜາດບໍ່ເກີນ 5 MB');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const size = Math.min(image.naturalWidth, image.naturalHeight, 512);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        setAvatarError(lang === 'en' ? 'Could not process this image. Try another file.' : lang === 'th' ? 'ไม่สามารถประมวลผลรูปภาพนี้ได้ กรุณาลองไฟล์อื่น' : 'ບໍ່ສາມາດປະມວນຜົນຮູບນີ້ໄດ້ ກະລຸນາລອງໄຟລ໌ອື່ນ');
        return;
      }
      try {
        const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
        const sourceX = (image.naturalWidth - cropSize) / 2;
        const sourceY = (image.naturalHeight - cropSize) / 2;
        context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, size, size);
        setAvatarUrl(canvas.toDataURL('image/jpeg', 0.82));
      } catch {
        setAvatarError(lang === 'en' ? 'Could not process this image. Try another file.' : lang === 'th' ? 'ไม่สามารถประมวลผลรูปภาพนี้ได้ กรุณาลองไฟล์อื่น' : 'ບໍ່ສາມາດປະມວນຜົນຮູບນີ້ໄດ້ ກະລຸນາລອງໄຟລ໌ອື່ນ');
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setAvatarError(lang === 'en' ? 'Could not read this image. Try another file.' : lang === 'th' ? 'ไม่สามารถเปิดรูปภาพนี้ได้ กรุณาลองไฟล์อื่น' : 'ບໍ່ສາມາດເປີດຮູບນີ້ໄດ້ ກະລຸນາລອງໄຟລ໌ອື່ນ');
    };
    image.src = objectUrl;
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
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-amber-400/5 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
          <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl font-bold shadow-sm ${
            isSuperAdmin
              ? 'border border-amber-400/30 bg-amber-400/10 text-amber-500'
              : 'border border-sky-400/30 bg-sky-400/10 text-sky-600 dark:text-sky-400'
          }`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${currentUser.name} profile`} className="h-full w-full object-cover" />
            ) : (
              <span>{currentUser.avatarInitials || currentUser.name.slice(0, 2)}</span>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                handleAvatarChange(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              aria-label={lang === 'en' ? 'Change profile photo' : lang === 'th' ? 'เปลี่ยนรูปโปรไฟล์' : 'ປ່ຽນຮູບໂປຣໄຟລ໌'}
              title={lang === 'en' ? 'Change profile photo' : lang === 'th' ? 'เปลี่ยนรูปโปรไฟล์' : 'ປ່ຽນຮູບໂປຣໄຟລ໌'}
              className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{currentUser.name}</h1>
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
            <p className="text-sm leading-6 text-zinc-400">
              {t.profileSubtitle}
            </p>
            <p className="mt-1 truncate text-xs text-zinc-500">
              <span className="font-mono">ID: {currentUser.id}</span>
              <span className="mx-2 text-zinc-600">•</span>
              {t.memberDepartment}: {currentUser.department || '—'}
            </p>
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
        <div role="tablist" aria-label={lang === 'lo' ? 'ເມນູໂປຣໄຟລ໌' : lang === 'th' ? 'เมนูโปรไฟล์' : 'Profile navigation'} className="flex items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-950 p-1.5">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
            className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              activeTab === 'users'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{t.userGovernanceTitle || 'ຈັດການຜູ້ໃຊ້ & ມອບສິດ'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'users' ? 'bg-black text-white' : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
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
            <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 animate-fadeIn">
              <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{t.success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
            {/* Left Column: Edit Profile Form (2 cols) */}
            <section className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-7 lg:col-span-2">
              <div className="flex items-start gap-3 border-b border-zinc-800 pb-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-600 dark:text-amber-400">
                  <User className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-white">{t.profileTitle}</h2>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 text-base font-bold text-white">
                    {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : (currentUser.avatarInitials || currentUser.name.slice(0, 2))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{lang === 'en' ? 'Profile photo' : lang === 'th' ? 'รูปโปรไฟล์' : 'ຮູບໂປຣໄຟລ໌'}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{lang === 'en' ? 'Square crop · up to 5 MB' : lang === 'th' ? 'ครอบตัดเป็นสี่เหลี่ยม · ไม่เกิน 5 MB' : 'ຕັດຮູບເປັນສີ່ຫຼ່ຽມ · ບໍ່ເກີນ 5 MB'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <Camera className="h-4 w-4" />
                    <span>{lang === 'en' ? 'Choose photo' : lang === 'th' ? 'เลือกรูป' : 'ເລືອກຮູບ'}</span>
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => { setAvatarUrl(''); setAvatarError(null); }}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      {lang === 'en' ? 'Remove' : lang === 'th' ? 'ลบรูป' : 'ລຶບຮູບ'}
                    </button>
                  )}
                  {avatarError && <p role="alert" className="w-full text-xs text-rose-500">{avatarError}</p>}
                </div>
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
                    <label htmlFor="profile-email" className="mb-2 block text-sm font-medium text-zinc-300">Email <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="profile-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-3 text-sm text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
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

            {/* Right Column: Roles & Privileges Card (1 col) */}
            <aside className="space-y-5">
              <div className="h-full space-y-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3 border-b border-zinc-800 pb-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-600 dark:text-sky-400">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-white">{lang === 'lo' ? 'ສິດທິການໃຊ້ງານ' : lang === 'th' ? 'สิทธิ์การใช้งาน' : 'Permissions'}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{lang === 'lo' ? 'ສະຫຼຸບສິດທິຂອງບັນຊີ' : lang === 'th' ? 'สรุปสิทธิ์ของบัญชี' : 'Account access summary'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <span className="text-sm leading-5 text-zinc-300">{lang === 'lo' ? 'ຈັດການຜູ້ໃຊ້ & ມອບສິດ' : lang === 'th' ? 'จัดการผู้ใช้ & มอบสิทธิ์' : 'User Governance'}</span>
                    {currentUser.permissions?.canManageUsers ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> {lang === 'lo' ? 'ອະນຸຍາດ' : lang === 'th' ? 'อนุญาต' : 'Granted'}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-zinc-500">{lang === 'lo' ? 'ບໍ່ມີສິດ' : lang === 'th' ? 'ไม่มีสิทธิ์' : 'Restricted'}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <span className="text-sm leading-5 text-zinc-300">{lang === 'lo' ? 'ແກ້ໄຂສະຕ໋ອກລົດຍົນ' : lang === 'th' ? 'แก้ไขสต็อกรถยนต์' : 'Edit Inventory'}</span>
                    {currentUser.permissions?.canEditInventory ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> {lang === 'lo' ? 'ອະນຸຍາດ' : lang === 'th' ? 'อนุญาต' : 'Granted'}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-zinc-500">{lang === 'lo' ? 'ບໍ່ມີສິດ' : lang === 'th' ? 'ไม่มีสิทธิ์' : 'Restricted'}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <span className="text-sm leading-5 text-zinc-300">{lang === 'lo' ? 'ຂາຍລົດ POS & ຕັດສະຕ໋ອກ' : lang === 'th' ? 'ขายรถ POS & ตัดสต็อก' : 'POS Sales'}</span>
                    {currentUser.permissions?.canDeductPOS ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> {lang === 'lo' ? 'ອະນຸຍາດ' : lang === 'th' ? 'อนุญาต' : 'Granted'}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-zinc-500">{lang === 'lo' ? 'ບໍ່ມີສິດ' : lang === 'th' ? 'ไม่มีสิทธิ์' : 'Restricted'}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <span className="text-sm leading-5 text-zinc-300">{lang === 'lo' ? 'ລົບຜູ້ໃຊ້ອອກຈາກລະບົບ' : lang === 'th' ? 'ลบผู้ใช้ออกจากระบบ' : 'Delete Users'}</span>
                    {currentUser.permissions?.canDeleteUsers ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> {lang === 'lo' ? 'ອະນຸຍາດ' : lang === 'th' ? 'อนุญาต' : 'Granted'}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-zinc-500">{lang === 'lo' ? 'ບໍ່ມີສິດ' : lang === 'th' ? 'ไม่มีสิทธิ์' : 'Restricted'}</span>
                    )}
                  </div>
                </div>

                {canManageUsers && (
                  <div className="pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab('users')}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{t.manageUsersFromProfileBtn || 'ເຂົ້າສູ່ລະບົບຈັດການຜູ້ໃຊ້'}</span>
                    </button>
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">
                  {lang === 'lo' ? 'ເຂົ້າສູ່ລະບົບຫຼ້າສຸດ:' : lang === 'th' ? 'เข้าสู่ระบบล่าสุด:' : 'Last Login:'} {currentUser.lastLogin || new Date().toISOString().slice(0, 10)}
                </div>
              </div>
            </aside>
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
