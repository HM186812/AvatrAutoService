import { useState } from 'react';
import { SystemUser, Language, UserRole } from '../../types';
import { translations } from '../../data/translations';
import {
  auth,
  db,
  isFirebaseConfigured,
  saveUserToFirestore
} from '../../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AvatrLogo from '../layout/AvatrLogo';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  LogIn,
  User,
  Phone,
  Check,
  X,
  Loader2
} from 'lucide-react';

interface LoginViewProps {
  users: SystemUser[];
  onLoginSuccess: (user: SystemUser, rememberMe: boolean) => void;
  onRegisterUser?: (newUser: SystemUser) => void;
  lang: Language;
  setLang?: (lang: Language) => void;
}

type MainTab = 'signin' | 'signup';

export default function LoginView({ users, onLoginSuccess, onRegisterUser, lang, setLang }: LoginViewProps) {
  const t = translations[lang] || translations.lo;

  // Main Tab State: Sign In vs Sign Up
  const [mainTab, setMainTab] = useState<MainTab>('signin');

  // Sign In Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sign Up / Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // 1. Password Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      setErrorMessage(lang === 'lo' ? 'ກະລຸນາປ້ອນ ອີເມວ ຫຼື ເບີໂທລະສັບ' : lang === 'th' ? 'กรุณากรอก อีเมล หรือ เบอร์โทรศัพท์' : 'Please enter Email or Phone number');
      return;
    }

    setIsLoading(true);

    try {
      // Try Firebase Authentication if configured
      if (isFirebaseConfigured() && auth && password) {
        const emailAttempts: string[] = [];
        if (cleanId.includes('@')) {
          emailAttempts.push(cleanId);
        } else {
          const rawDigits = cleanId.replace(/\D/g, '') || cleanId.replace(/\s+/g, '');
          emailAttempts.push(`${rawDigits}@avatr.phone.la`);
          emailAttempts.push(`${rawDigits}@avatr-member.la`);
          emailAttempts.push(`${rawDigits}@laos-ev.la`);
          emailAttempts.push(`${cleanId}@avatr.phone.la`);
        }

        let userCredential = null;
        for (const attemptEmail of emailAttempts) {
          try {
            userCredential = await signInWithEmailAndPassword(auth, attemptEmail, password);
            if (userCredential) break;
          } catch {
            // continue
          }
        }

        if (userCredential) {
          const fbUid = userCredential.user.uid;

          // 1. Search in current memory state
          let matchedFb = users.find(
            u => u.id === fbUid ||
              (u.email && u.email.toLowerCase() === cleanId) ||
              (u.phone && u.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, ''))
          );

          // 2. If not found in memory, try fetching directly from Firestore
          if (!matchedFb && db) {
            try {
              const docSnap = await getDoc(doc(db, 'users', fbUid));
              if (docSnap.exists()) {
                const data = docSnap.data();
                matchedFb = {
                  id: docSnap.id,
                  name: data.name || cleanId,
                  email: data.email || (cleanId.includes('@') ? cleanId : ''),
                  phone: data.phone || (cleanId.includes('@') ? '' : cleanId),
                  role: data.role || 'super_admin',
                  roleTitleLo: data.roleTitleLo || 'Admin (Super Admin & ຜູ້ອຳນວຍການສູນ)',
                  department: data.department || 'Executive Management & Direction',
                  status: data.status || 'active',
                  avatarInitials: data.avatarInitials || (data.name ? data.name.slice(0, 2) : 'AD'),
                  permissions: data.permissions || {
                    canManageUsers: true,
                    canDeleteUsers: true,
                    canGrantRoles: true,
                    canEditInventory: true,
                    canUploadQR: true,
                    canAddModels: true,
                    canDeductPOS: true,
                    canViewFinancials: true,
                  },
                  createdAt: data.createdAt || new Date().toISOString().slice(0, 10),
                };
              }
            } catch (fetchErr) {
              console.warn('Firestore user fetch notice:', fetchErr);
            }
          }

          // 3. If authenticated in Firebase but no Firestore profile exists yet, auto-create as Super Admin
          if (!matchedFb) {
            const isSuperAdmin = !users || users.length === 0 || !users.some(u => u.role === 'super_admin');
            matchedFb = {
              id: fbUid,
              name: cleanId.includes('@') ? cleanId.split('@')[0] : `User-${cleanId.slice(-4)}`,
              email: cleanId.includes('@') ? cleanId : `${cleanId.replace(/\s+/g, '')}@avatr.phone.la`,
              phone: cleanId.includes('@') ? '' : cleanId,
              role: isSuperAdmin ? 'super_admin' : 'general_user',
              roleTitleLo: isSuperAdmin ? 'Admin (Super Admin & ຜູ້ອຳນວຍການສູນ)' : 'ຜູ້ໃຊ້ທົ່ວໄປ (General User)',
              department: isSuperAdmin ? 'Executive Management & Direction' : 'General Staff',
              status: 'active',
              avatarInitials: 'AD',
              permissions: {
                canManageUsers: isSuperAdmin,
                canDeleteUsers: isSuperAdmin,
                canGrantRoles: isSuperAdmin,
                canEditInventory: isSuperAdmin,
                canUploadQR: isSuperAdmin,
                canAddModels: isSuperAdmin,
                canDeductPOS: isSuperAdmin,
                canViewFinancials: isSuperAdmin,
              },
              createdAt: new Date().toISOString().slice(0, 10),
              lastLogin: new Date().toISOString().slice(0, 16).replace('T', ' '),
            };
            try {
              await saveUserToFirestore(matchedFb);
            } catch {}
          } else {
            const hasAnySuperAdmin = users.some(u => u.role === 'super_admin' && u.id !== matchedFb!.id);
            if (!hasAnySuperAdmin) {
              matchedFb.role = 'super_admin';
              matchedFb.roleTitleLo = 'Admin (Super Admin & ຜູ້ອຳນວຍການສູນ)';
              matchedFb.department = 'Executive Management & Direction';
              matchedFb.permissions = {
                canManageUsers: true,
                canDeleteUsers: true,
                canGrantRoles: true,
                canEditInventory: true,
                canUploadQR: true,
                canAddModels: true,
                canDeductPOS: true,
                canViewFinancials: true,
              };
              try {
                await saveUserToFirestore(matchedFb);
              } catch {}
            }
          }

          if (matchedFb) {
            if (onRegisterUser) onRegisterUser(matchedFb);
            setSuccessMessage(lang === 'lo' ? `ເຂົ້າສູ່ລະບົບ Cloud Firebase ສຳເລັດ! ຍິນດີຕ້ອນຮັບ ${matchedFb.name}` : lang === 'th' ? `เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ${matchedFb.name}` : `Welcome ${matchedFb.name}`);
            setTimeout(() => {
              onLoginSuccess(matchedFb!, rememberMe);
            }, 300);
            return;
          }
        }
      }

      // Memory or Mock Users check
      const matched = users.find(
        u => (u.email && u.email.toLowerCase() === cleanId) ||
          (u.phone && u.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '')) ||
          (u.name && u.name.toLowerCase().includes(cleanId))
      );

      if (matched) {
        setSuccessMessage(lang === 'lo' ? `ເຂົ້າສູ່ລະບົບສຳເລັດ! ຍິນດີຕ້ອນຮັບ ${matched.name}` : lang === 'th' ? `เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ${matched.name}` : `Welcome ${matched.name}`);
        setTimeout(() => {
          onLoginSuccess(matched, rememberMe);
        }, 300);
      } else {
        setErrorMessage(lang === 'lo' ? 'ບໍ່ພົບບັນຊີນີ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' : lang === 'th' ? 'ไม่พบบัญชีนี้ หรือรหัสผ่านไม่ถูกต้อง' : 'Invalid credentials or account not found');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Sign Up / Register Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPhone = regPhone.trim();

    if (!cleanName) {
      setErrorMessage(lang === 'lo' ? 'ກະລຸນາປ້ອນ ຊື່ ແລະ ນາມສະກຸນ' : lang === 'th' ? 'กรุณากรอก ชื่อ-นามสกุล' : 'Please enter Full Name');
      return;
    }

    if (!cleanEmail && !cleanPhone) {
      setErrorMessage(lang === 'lo' ? 'ກະລຸນາປ້ອນ ອີເມວ ຫຼື ເບີໂທລະສັບ (ເລືອກໃສ່ຢ່າງໜ້ອຍ 1 ຢ່າງ)' : lang === 'th' ? 'กรุณากรอก อีเมล หรือ เบอร์โทรศัพท์' : 'Please enter Email or Phone');
      return;
    }

    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      setErrorMessage(lang === 'lo' ? 'ກະລຸນາປ້ອນອີເມວໃຫ້ຖືກຕ້ອງຕາມຮູບແບບ' : lang === 'th' ? 'กรุณากรอกรูปแบบอีเมลให้ถูกต้อง' : 'Please enter a valid email');
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setErrorMessage(lang === 'lo' ? 'ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 4 ຕົວອັກສອນ' : lang === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' : 'Password must be at least 4 characters');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage(lang === 'lo' ? 'ລະຫັດຜ່ານ ແລະ ຢືນຢັນລະຫັດຜ່ານ ບໍ່ຕົງກັນ' : lang === 'th' ? 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const isFirstUser = !users || users.length === 0 || !users.some(u => u.role === 'super_admin');
      const assignedRole: UserRole = isFirstUser ? 'super_admin' : 'general_user';
      const roleTitleLo = isFirstUser 
        ? 'Admin (Super Admin & ຜູ້ອຳນວຍການສູນ)' 
        : 'ຜູ້ໃຊ້ທົ່ວໄປ (General User)';
      const department = isFirstUser 
        ? 'Executive Management & Direction' 
        : 'General Staff';

      const initials = cleanName.slice(0, 2);
      let newUserId = `USR-${Math.floor(100 + Math.random() * 900)}`;
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const authEmail = cleanEmail || `${cleanPhone.replace(/\D/g, '') || cleanPhone.replace(/\s+/g, '')}@avatr.phone.la`;

      // Attempt Firebase Auth user creation
      if (isFirebaseConfigured() && auth) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, authEmail, regPassword);
          newUserId = userCred.user.uid;
        } catch (err: any) {
          console.warn('Firebase Auth user creation notice:', err.message);
          if (err.code === 'auth/email-already-in-use' || err.message?.includes('already in use')) {
            try {
              const loginCred = await signInWithEmailAndPassword(auth, authEmail, regPassword);
              newUserId = loginCred.user.uid;
            } catch (loginErr) {
              console.warn('Existing account signin notice:', loginErr);
            }
          }
        }
      }

      const newUser: SystemUser = {
        id: newUserId,
        name: cleanName,
        email: cleanEmail || `${cleanPhone.replace(/\s+/g, '')}@avatr.phone.la`,
        phone: cleanPhone,
        role: assignedRole,
        roleTitleLo: roleTitleLo,
        department: department,
        status: 'active',
        avatarInitials: initials,
        permissions: {
          canManageUsers: isFirstUser,
          canDeleteUsers: isFirstUser,
          canGrantRoles: isFirstUser,
          canEditInventory: isFirstUser,
          canUploadQR: isFirstUser,
          canAddModels: isFirstUser,
          canDeductPOS: isFirstUser,
          canViewFinancials: isFirstUser,
        },
        createdAt: now,
        lastLogin: now,
        password: regPassword,
      };

      try {
        await saveUserToFirestore(newUser);
      } catch (err) {
        console.warn('Firestore user save fallback:', err);
      }

      setSuccessMessage(
        isFirstUser 
          ? (lang === 'lo' ? 'ສ້າງບັນຊີທຳອິດສຳເລັດ! ທ່ານໄດ້ຮັບສິດ Admin (Super Admin)' : lang === 'th' ? 'สร้างบัญชีแรกสำเร็จ! คุณได้รับสิทธิ์ Admin (Super Admin)' : 'First account created! Super Admin privileges granted.') 
          : (lang === 'lo' ? `ສ້າງບັນຊີໃໝ່ສຳເລັດ! ຍິນດີຕ້ອນຮັບ ${newUser.name}` : lang === 'th' ? `สร้างบัญชีใหม่สำเร็จ! ยินดีต้อนรับ ${newUser.name}` : `Account created! Welcome ${newUser.name}`)
      );

      if (onRegisterUser) {
        onRegisterUser(newUser);
      }

      setTimeout(() => {
        onLoginSuccess(newUser, rememberMe);
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-white selection:text-black">
      {/* Background Soft Glow Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-zinc-800/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-zinc-700/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-zinc-950/95 border border-zinc-800/90 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
        
        {/* Top Bar: Logo & Language Selector */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm flex-shrink-0">
              <AvatrLogo className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-widest text-white">AVATR</span>
                <span className="text-[9px] tracking-widest font-mono uppercase px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded font-semibold">AUTO</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono tracking-wide">Changan × Huawei × CATL</p>
            </div>
          </div>

          {/* Language Selector */}
          {setLang && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setLang('lo')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  lang === 'lo' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ລາວ
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  lang === 'en' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('th')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  lang === 'th' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ไทย
              </button>
            </div>
          )}
        </div>

        {/* Header Title */}
        <div className="space-y-1">
          <h1 className="text-xl font-black text-white">
            {mainTab === 'signin' ? t.authSignInTitle : t.authSignUpTitle}
          </h1>
          <p className="text-xs text-zinc-400">
            {mainTab === 'signin' ? t.authSignInDesc : t.authSignUpDesc}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMainTab('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mainTab === 'signin'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t.authSignInTitle}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMainTab('signup');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mainTab === 'signup'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t.authSignUpTitle}</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="p-3 bg-zinc-900/90 border border-zinc-700 rounded-2xl text-xs text-zinc-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-zinc-300 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-zinc-900/90 border border-zinc-700 rounded-2xl text-xs text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {mainTab === 'signin' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5">
                {t.authEmailOrPhone}
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@avatr.la ຫຼື ເບີໂທລະສັບ"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5">
                {t.authPassword}
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-400 text-xs">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0 cursor-pointer"
                />
                <span>{t.authRememberMe}</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setMainTab('signup');
                  setErrorMessage(null);
                }}
                className="text-zinc-400 hover:text-white text-xs underline transition-colors"
              >
                {t.authNoAccount}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-3 cursor-pointer group disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ກຳລັງເຂົ້າສູ່ລະບົບ...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{t.authSignInBtn}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: SIGN UP / REGISTER */}
        {mainTab === 'signup' && (
          <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
            {/* Full Name */}
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                {t.authFullName} *
              </label>
              <div className="relative group">
                <User className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="ຊື່ ແລະ ນາມສະກຸນ"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors text-xs"
                />
              </div>
            </div>

            {/* Phone and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  ເບີໂທລະສັບ (Phone)
                </label>
                <div className="relative group">
                  <Phone className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="020 00000000"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  ອີເມວ (Email)
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@email.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  {t.authPassword} *
                </label>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-9 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center justify-between">
                  <span>{t.authConfirmPassword} *</span>
                  {regConfirmPassword && (
                    regPassword === regConfirmPassword ? (
                      <span className="text-[10px] text-zinc-300 flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                        <X className="w-3 h-3" />
                      </span>
                    )
                  )}
                </label>
                <div className="relative group">
                  <ShieldCheck className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setMainTab('signin');
                  setErrorMessage(null);
                }}
                className="text-zinc-400 hover:text-white text-xs underline transition-colors"
              >
                {t.authHaveAccount}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer group disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ກຳລັງສ້າງບັນຊີ...</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  <span>{t.authSignUpBtn}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>AVATR Auto Service</span>
          <span>Vientiane, Lao PDR</span>
        </div>

      </div>
    </div>
  );
}
