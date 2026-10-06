import { useState } from 'react';
import { SystemUser, Language } from '../../types';
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
  Calendar,
  Sparkles,
  X
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: SystemUser;
  onUpdateProfile: (updated: SystemUser) => void;
  onLogout: () => void;
  lang: Language;
  onClose?: () => void;
}

export default function ProfileView({
  currentUser,
  onUpdateProfile,
  onLogout,
  lang,
  onClose,
}: ProfileViewProps) {
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email);
  const [department, setDepartment] = useState(currentUser.department);
  const [password, setPassword] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
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
      password: password || currentUser.password,
    };

    onUpdateProfile(updatedUser);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const isSuperAdmin = currentUser.role === 'super_admin';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-7 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl flex-shrink-0 ${
            isSuperAdmin ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-white border border-zinc-700'
          }`}>
            {currentUser.avatarInitials}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-black text-white">{currentUser.name}</h1>
              {isSuperAdmin ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 font-mono">
                  <Crown className="w-3 h-3 fill-amber-400" /> Admin ໃຫຍ່
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-700 font-mono">
                  {currentUser.roleTitleLo || 'ຜູ້ໃຊ້ງານລະບົບ'}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              ID: {currentUser.id} • ພະແນກ: {currentUser.department}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-950/70 hover:bg-red-900 text-red-300 rounded-xl border border-red-800 font-semibold text-xs transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>ອອກຈາກລະບົບ (Log Out)</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-2xl text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>ບັນທຶກຂໍ້ມູນໂປຣໄຟລ໌ສຳເລັດຮຽບຮ້ອຍແລ້ວ!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Edit Profile Form (2 cols) */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-white font-bold text-sm">
            <User className="w-4 h-4 text-emerald-400" />
            <span>ແກ້ໄຂຂໍ້ມູນບັນຊີສ່ວນຕົວ (Edit Profile)</span>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 mb-1.5 font-medium">ຊື່ ແລະ ນາມສະກຸນ (Full Name) *</label>
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
                <label className="block text-zinc-400 mb-1.5 font-medium">ເບີໂທລະສັບ (Phone Number) *</label>
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
                <label className="block text-zinc-400 mb-1.5 font-medium">ອີເມວ (Email Address) *</label>
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
                <label className="block text-zinc-400 mb-1.5 font-medium">ພະແນກ / ສາຂາ (Department)</label>
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

            <div>
              <label className="block text-zinc-400 mb-1.5 font-medium">ປ່ຽນລະຫັດຜ່ານໃໝ່ (New Password - ປ່ອຍວ່າງຫາກບໍ່ປ່ຽນ)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="ປ້ອນລະຫັດຜ່ານໃໝ່..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-white hover:bg-zinc-200 text-black font-extrabold rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>ບັນທຶກການປ່ຽນແປງ</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Roles & Privileges Card (1 col) */}
        <div className="space-y-5">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>ສິດທິການໃຊ້ງານ (Permissions)</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-300">ຈັດການຜູ້ໃຊ້ & ມອບສິດ</span>
                {currentUser.permissions.canManageUsers ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> ອະນຸຍາດ
                  </span>
                ) : (
                  <span className="text-zinc-500 font-mono">ບໍ່ມີສິດ</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-300">ແກ້ໄຂສະຕ໋ອກລົດຍົນ</span>
                {currentUser.permissions.canEditInventory ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> ອະນຸຍາດ
                  </span>
                ) : (
                  <span className="text-zinc-500 font-mono">ບໍ່ມີສິດ</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-300">ຂາຍລົດ POS & ຕັດສະຕ໋ອກ</span>
                {currentUser.permissions.canDeductPOS ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> ອະນຸຍາດ
                  </span>
                ) : (
                  <span className="text-zinc-500 font-mono">ບໍ່ມີສິດ</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-300">ລົບຜູ້ໃຊ້ອອກຈາກລະບົບ</span>
                {currentUser.permissions.canDeleteUsers ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> ອະນຸຍາດ
                  </span>
                ) : (
                  <span className="text-zinc-500 font-mono">ບໍ່ມີສິດ</span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 font-mono">
              ເຂົ້າສູ່ລະບົບຫຼ້າສຸດ: {currentUser.lastLogin}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
