import { useState, useRef } from 'react';
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
  Sparkles,
  AlertCircle,
  Key,
  Scan,
  Zap,
  Volume2,
  VolumeX,
  Smartphone,
  CheckCircle2,
  Cpu,
  Car,
  Radio,
  Fingerprint,
  UserPlus,
  LogIn,
  User,
  Phone,
  Shield,
  Activity,
  BatteryCharging,
  Gauge,
  Flame,
  Check,
  X,
  Lightbulb
} from 'lucide-react';

interface LoginViewProps {
  users: SystemUser[];
  onLoginSuccess: (user: SystemUser, rememberMe: boolean) => void;
  onRegisterUser?: (newUser: SystemUser) => void;
  lang: Language;
  setLang?: (lang: Language) => void;
}

type MainTab = 'signin' | 'signup';

interface VehicleShowcase {
  name: string;
  subTitle: string;
  tagline: string;
  image: string;
  range: string;
  accel: string;
  power: string;
  colorName: string;
  themeColor: string;
  glowColor: string;
}

const VEHICLES: VehicleShowcase[] = [
  {
    name: 'AVATR 12',
    subTitle: 'Grand Coupé EV',
    tagline: 'ຍົນລະກຳອັດສະລິຍະລະດັບເຮືອທຸງ Luxury Flagship',
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    range: '700 km (CLTC)',
    accel: '3.9s (0-100)',
    power: '578 hp Dual-Motor',
    colorName: 'Liquid Titanium',
    themeColor: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.15)',
  },
  {
    name: 'AVATR 11',
    subTitle: 'Emotional Luxury SUV',
    tagline: 'SUV Coupé ພະລັງໄຟຟ້າແຫ່ງອະນາຄົດ',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    range: '730 km (CLTC)',
    accel: '3.98s (0-100)',
    power: '578 ps AWD',
    colorName: 'Obsidian Black',
    themeColor: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.15)',
  },
  {
    name: 'AVATR 07',
    subTitle: 'Smart Extended Range SUV',
    tagline: 'ລະບົບຂັບເຄື່ອນໄຮບຣິດຂັ້ນສູງ EREV & Dual Power',
    image: 'https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=1200&q=80',
    range: '1,150 km Combined',
    accel: '4.9s (0-100)',
    power: '492 hp Smart Hybrid',
    colorName: 'Nebula White',
    themeColor: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.15)',
  },
];

export default function LoginView({ users, onLoginSuccess, onRegisterUser, lang, setLang }: LoginViewProps) {
  const t = translations[lang] || translations.lo;

  // Main Tab State: Sign In vs Sign Up vs NFC vs Face ID
  const [mainTab, setMainTab] = useState<MainTab>('signin');

  // Sign In Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sign Up / Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Interactive Animated "ລູກຫຼິ້ນ" States
  const [activeCarIdx, setActiveCarIdx] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isLidarActive, setIsLidarActive] = useState(true);
  const [isHeadlightOn, setIsHeadlightOn] = useState(true);
  const [boostModeActive, setBoostModeActive] = useState(false);
  const [activeHudWidget, setActiveHudWidget] = useState<'battery' | 'motor' | 'lidar' | 'security'>('battery');



  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  const activeCar = VEHICLES[activeCarIdx];

  // Synthesize futuristic EV Cockpit Audio Chimes
  const playSound = (type: 'ev_start' | 'scan_beep' | 'nfc_chime' | 'success' | 'tab_click' | 'boost') => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'ev_start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'boost') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.4);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'scan_beep') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'nfc_chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'tab_click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {
      // Audio not supported or blocked
    }
  };

  // 1. Password Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      setErrorMessage('ກະລຸນາປ້ອນ ອີເມວ ຫຼື ເບີໂທລະສັບ');
      return;
    }

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
        } catch (e) {}
      }

      if (userCredential) {
        try {
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
                  roleTitleLo: data.roleTitleLo || 'Admin ໃຫຍ່ (Super Admin & ຜູ້ອຳນວຍການສູນ)',
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
              roleTitleLo: isSuperAdmin ? 'Admin ໃຫຍ່ (Super Admin & ຜູ້ອຳນວຍການສູນ)' : 'ຜູ້ໃຊ້ທົ່ວໄປ (General User)',
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
            // If no super admin exists yet in system, ensure this user gets Super Admin
            const hasAnySuperAdmin = users.some(u => u.role === 'super_admin' && u.id !== matchedFb!.id);
            if (!hasAnySuperAdmin) {
              matchedFb.role = 'super_admin';
              matchedFb.roleTitleLo = 'Admin ໃຫຍ່ (Super Admin & ຜູ້ອຳນວຍການສູນ)';
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
            playSound('success');
            setSuccessMessage(`ເຂົ້າສູ່ລະບົບ Cloud Firebase ສຳເລັດ! ຍິນດີຕ້ອນຮັບ ${matchedFb.name}`);
            setTimeout(() => {
              onLoginSuccess(matchedFb, rememberMe);
            }, 400);
            return;
          }
        } catch (fbErr: any) {
          console.warn('Firebase auth attempt:', fbErr.message);
        }
      }
    }

    const matched = users.find(
      u => (u.email && u.email.toLowerCase() === cleanId) ||
        (u.phone && u.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '')) ||
        (u.name && u.name.toLowerCase().includes(cleanId))
    );

    if (matched) {
      playSound('success');
      setSuccessMessage(`ເຂົ້າສູ່ລະບົບສຳເລັດ! ຍິນດີຕ້ອນຮັບ ${matched.name}`);
      setTimeout(() => {
        onLoginSuccess(matched, rememberMe);
      }, 400);
    } else {
      setErrorMessage('ບໍ່ພົບບັນຊີນີ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ. ຫາກຍັງບໍ່ມີບັນຊີ ທ່ານສາມາດກົດ "ສ້າງບັນຊີໃໝ່" ໄດ້.');
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
      setErrorMessage('ກະລຸນາປ້ອນ ຊື່ ແລະ ນາມສະກຸນ');
      return;
    }

    // Check if at least one contact method (email or phone) is provided
    if (!cleanEmail && !cleanPhone) {
      setErrorMessage('ກະລຸນາປ້ອນ ອີເມວ ຫຼື ເບີໂທລະສັບ (ເລືອກໃສ່ຢ່າງໜ້ອຍ 1 ຢ່າງ)');
      return;
    }

    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      setErrorMessage('ກະລຸນາປ້ອນອີເມວໃຫ້ຖືກຕ້ອງຕາມຮູບແບບ (ຕົວຢ່າງ: user@email.com)');
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setErrorMessage('ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 4 ຕົວອັກສອນ');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('ລະຫັດຜ່ານ ແລະ ຢືນຢັນລະຫັດຜ່ານ ບໍ່ຕົງກັນ');
      return;
    }

    // Check if this is the very first user or no super_admin exists in the system
    const isFirstUser = !users || users.length === 0 || !users.some(u => u.role === 'super_admin');

    const assignedRole: UserRole = isFirstUser ? 'super_admin' : 'general_user';
    const roleTitleLo = isFirstUser 
      ? 'Admin ໃຫຍ່ (Super Admin & ຜູ້ອຳນວຍການສູນ)' 
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

    // Save to Firestore if available
    try {
      await saveUserToFirestore(newUser);
    } catch (err) {
      console.warn('Firestore user save fallback:', err);
    }

    playSound('success');
    setSuccessMessage(
      isFirstUser 
        ? (lang === 'lo' ? 'ສ້າງບັນຊີທຳອິດສຳເລັດ! ທ່ານໄດ້ຮັບສິດ Admin ໃຫຍ່ (Super Admin)' : lang === 'th' ? 'สร้างบัญชีแรกสำเร็จ! คุณได้รับสิทธิ์ Admin ใหญ่ (Super Admin)' : 'First account created! Super Admin privileges granted.') 
        : (lang === 'lo' ? `ສ້າງບັນຊີໃໝ່ສຳເລັດ! ຍິນດີຕ້ອນຮັບ ${newUser.name}` : lang === 'th' ? `สร้างบัญชีใหม่สำเร็จ! ยินดีต้อนรับ ${newUser.name}` : `Account created! Welcome ${newUser.name}`)
    );

    if (onRegisterUser) {
      onRegisterUser(newUser);
    }

    setTimeout(() => {
      onLoginSuccess(newUser, rememberMe);
    }, 600);
  };



  // Password battery strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let strength = 20;
    if (pwd.length >= 6) strength += 30;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 25;
    return Math.min(100, strength);
  };

  const currentStrength = mainTab === 'signup' ? getPasswordStrength(regPassword) : getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center p-3 sm:p-6 lg:p-10 relative overflow-hidden font-sans selection:bg-white selection:text-black">

      {/* Dynamic Animated Ambient Background Aura */}
      <div
        className="absolute top-1/4 left-1/6 w-[650px] h-[650px] rounded-full blur-[150px] pointer-events-none transition-all duration-700 opacity-20 animate-pulse-glow"
        style={{ backgroundColor: '#ffffff' }}
      />
      <div className="absolute -bottom-24 -right-24 w-[550px] h-[550px] bg-zinc-800/20 rounded-full blur-[140px] pointer-events-none animate-float-reverse" />
      <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-zinc-700/15 rounded-full blur-[130px] pointer-events-none" />

      {/* LiDAR Laser Point Grid Overlay Simulation */}
      {isLidarActive && (
        <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
      )}

      {/* Floating Cyber Particle Icons (Interactive Aesthetic Backdrop) */}
      <div className="absolute top-12 left-12 p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-zinc-300 hidden xl:flex items-center gap-2 animate-float-slow backdrop-blur-md">
        <Zap className="w-4 h-4 text-white animate-pulse" />
        <span className="text-[11px] font-mono">800V SiC High-Voltage Ready</span>
      </div>

      <div className="absolute bottom-12 left-20 p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-zinc-300 hidden xl:flex items-center gap-2 animate-float-reverse backdrop-blur-md">
        <Cpu className="w-4 h-4 text-white animate-spin-slow" />
        <span className="text-[11px] font-mono">HarmonyOS 4.0 Dual-Chip Cockpit</span>
      </div>

      <div className="absolute top-16 right-16 p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-zinc-300 hidden xl:flex items-center gap-2 animate-float-slow backdrop-blur-md">
        <ShieldCheck className="w-4 h-4 text-white" />
        <span className="text-[11px] font-mono">CATL Shenxing Supercharge Battery</span>
      </div>

      {/* Main Split Showcase Card */}
      <div className="relative w-full max-w-5xl bg-zinc-950/90 border border-zinc-800/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[660px]">

        {/* LEFT COLUMN: INTERACTIVE VEHICLE SHOWCASE & COCKPIT HUD GADGETS (5 cols on lg) */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-gradient-to-b from-zinc-900/80 via-black/70 to-zinc-950 relative">

          {/* Top Brand & Sound/LiDAR/Turbo Toggles */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => playSound('ev_start')}>
              <div className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 group-hover:border-white transition-all shadow-md">
                <AvatrLogo className="w-6 h-6" />
              </div>
              <div>
                <span className="font-black text-sm tracking-widest text-white block group-hover:text-zinc-200">
                  AVATR LAOS
                </span>
                <span className="text-[9px] text-zinc-400 font-mono tracking-wider">
                  Changan × Huawei × CATL
                </span>
              </div>
            </div>

            {/* Interactive Dynamic Toggles */}
            <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-xl p-1 shadow-inner">
              {/* Audio Chimes */}
              <button
                type="button"
                onClick={() => {
                  const next = !isSoundEnabled;
                  setIsSoundEnabled(next);
                  if (next) playSound('ev_start');
                }}
                className={`p-1.5 rounded-lg transition-all ${isSoundEnabled ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-white'
                  }`}
                title={isSoundEnabled ? 'ສຽງ Cockpit: ເປີດ' : 'ສຽງ Cockpit: ປິດ'}
              >
                {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* LiDAR ADS 3.0 */}
              <button
                type="button"
                onClick={() => {
                  setIsLidarActive(!isLidarActive);
                  playSound('scan_beep');
                }}
                className={`p-1.5 rounded-lg transition-all ${isLidarActive ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-white'
                  }`}
                title={isLidarActive ? 'LiDAR ADS 3.0: ເປີດ' : 'LiDAR ADS 3.0: ປິດ'}
              >
                <Radio className={`w-3.5 h-3.5 ${isLidarActive ? 'animate-pulse' : ''}`} />
              </button>

              {/* Turbo Boost Mode */}
              <button
                type="button"
                onClick={() => {
                  setBoostModeActive(!boostModeActive);
                  playSound('boost');
                }}
                className={`p-1.5 rounded-lg transition-all ${boostModeActive ? 'bg-zinc-800 text-white border border-zinc-600 shadow' : 'text-zinc-500 hover:text-white'
                  }`}
                title="Turbo Boost Mode"
              >
                <Flame className={`w-3.5 h-3.5 ${boostModeActive ? 'animate-bounce text-white' : ''}`} />
              </button>
            </div>
          </div>

          {/* Center: Interactive Vehicle Card & Dynamic HUD Lighting */}
          <div className="my-5 space-y-3.5 text-center">
            {/* Model Selector Tabs */}
            <div className="inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-2xl gap-1 shadow-inner">
              {VEHICLES.map((car, idx) => (
                <button
                  key={car.name}
                  type="button"
                  onClick={() => {
                    setActiveCarIdx(idx);
                    playSound('ev_start');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeCarIdx === idx
                    ? 'bg-white text-black shadow-lg scale-102'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                >
                  {car.name}
                </button>
              ))}
            </div>

            {/* Vehicle Card Preview with Interactive Headlight & Ambient Beam */}
            <div className="relative group">
              <div
                className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden border border-zinc-800 relative bg-zinc-900 transition-all duration-500"
                style={{
                  boxShadow: isHeadlightOn ? `0 0 50px ${activeCar.glowColor}` : 'none'
                }}
              >
                <img
                  src={activeCar.image}
                  alt={activeCar.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />

                {/* Laser scan line overlay when LiDAR is active */}
                {isLidarActive && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-white to-transparent animate-laser-sweep" />
                  </div>
                )}

                {/* Ambient dynamic vehicle HUD overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent p-3.5 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/85 border border-zinc-600 text-white backdrop-blur-md flex items-center gap-1.5"
                    >
                      <Car className="w-3 h-3 text-zinc-300" />
                      <span>{activeCar.subTitle}</span>
                    </span>

                    {/* Headlight Toggle Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeadlightOn(!isHeadlightOn);
                        playSound('tab_click');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold backdrop-blur-md border transition-all flex items-center gap-1.5 ${isHeadlightOn
                        ? 'bg-zinc-800 border-white text-white shadow-md'
                        : 'bg-black/80 border-zinc-700 text-zinc-400'
                        }`}
                    >
                      <Lightbulb className={`w-3.5 h-3.5 ${isHeadlightOn ? 'text-white' : 'text-zinc-500'}`} />
                      <span>{isHeadlightOn ? t.authMatrixLightsOn : t.authMatrixLightsOff}</span>
                    </button>
                  </div>

                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-extrabold text-base tracking-wide">
                        {activeCar.name}
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-400">({activeCar.colorName})</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 line-clamp-1">{activeCar.tagline}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive HUD Widget Switcher (Battery / Motor / LiDAR / Security) */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveHudWidget('battery');
                  playSound('tab_click');
                }}
                className={`p-2 rounded-xl border text-center transition-all ${activeHudWidget === 'battery'
                  ? 'bg-zinc-800 border-zinc-600 text-white shadow'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
              >
                <BatteryCharging className="w-3.5 h-3.5 mx-auto mb-1 text-zinc-300" />
                <span className="text-[9px] font-mono block uppercase">ແບັດເຕີຣີ</span>
                <span className="text-[10px] font-bold text-white block">{activeCar.range.split(' ')[0]}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveHudWidget('motor');
                  playSound('tab_click');
                }}
                className={`p-2 rounded-xl border text-center transition-all ${activeHudWidget === 'motor'
                  ? 'bg-zinc-800 border-zinc-600 text-white shadow'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
              >
                <Gauge className="w-3.5 h-3.5 mx-auto mb-1 text-zinc-300" />
                <span className="text-[9px] font-mono block uppercase">ອັດຕາເລັ່ງ</span>
                <span className="text-[10px] font-bold text-white block">{activeCar.accel.split(' ')[0]}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveHudWidget('lidar');
                  playSound('tab_click');
                }}
                className={`p-2 rounded-xl border text-center transition-all ${activeHudWidget === 'lidar'
                  ? 'bg-zinc-800 border-zinc-600 text-white shadow'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
              >
                <Activity className="w-3.5 h-3.5 mx-auto mb-1 text-zinc-300" />
                <span className="text-[9px] font-mono block uppercase">ພະລັງຂັບ</span>
                <span className="text-[10px] font-bold text-white block">{activeCar.power.split(' ')[0]}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveHudWidget('security');
                  playSound('tab_click');
                }}
                className={`p-2 rounded-xl border text-center transition-all ${activeHudWidget === 'security'
                  ? 'bg-zinc-800 border-zinc-600 text-white shadow'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
              >
                <Shield className="w-3.5 h-3.5 mx-auto mb-1 text-zinc-300" />
                <span className="text-[9px] font-mono block uppercase">ລະບົບຄວາມປອດໄພ</span>
                <span className="text-[10px] font-bold text-white block">IP69K</span>
              </button>
            </div>
          </div>

          {/* Bottom Factory Collaboration Note */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-300" />
              <span>HarmonyOS 4.0 Cockpit</span>
            </span>
            <span className="text-zinc-400">CATL 800V Supercharge</span>
          </div>
        </div>

        {/* RIGHT COLUMN: HIGH-TECH COCKPIT ACCESS CONSOLE (7 cols on lg) */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">

          {/* Header Title & Access Mode Segmented Switcher & Language Switcher */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>{t.authSystemTitle}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-700 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    {t.authOnline}
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {mainTab === 'signup'
                    ? t.authSignUpDesc
                    : t.authSignInDesc}
                </p>
              </div>

              {/* Language Switcher in Login Header */}
              {setLang && (
                <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-xl p-1 shadow-sm">
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
                    onClick={() => setLang('th')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      lang === 'th' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    ไทย
                  </button>
                </div>
              )}
            </div>

            {/* 2 ACCESS TABS: Sign In & Sign Up */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs font-semibold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setMainTab('signin');
                  playSound('tab_click');
                }}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${mainTab === 'signin'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white'
                  }`}
              >
                <LogIn className="w-4 h-4 text-zinc-300" />
                <span>{t.authSignInTitle}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMainTab('signup');
                  playSound('tab_click');
                }}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${mainTab === 'signup'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white'
                  }`}
              >
                <UserPlus className="w-4 h-4 text-zinc-300" />
                <span>{t.authSignUpTitle}</span>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-zinc-300 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {mainTab === 'signin' && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5 flex items-center justify-between">
                  <span>{t.authEmailOrPhone}</span>
                  {identifier.includes('@') && (
                    <span className="text-[10px] font-mono text-zinc-300 flex items-center gap-1">
                      <Check className="w-3 h-3" /> {t.authValidEmail}
                    </span>
                  )}
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="User1234@email.com"
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-zinc-300 font-semibold">
                    {t.authPassword}
                  </label>
                  {/* Dynamic CATL Shenxing Battery Gauge Meter */}
                  {password && (
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className="text-zinc-500">{t.authSecurityStrength}</span>
                      <span className="font-bold text-white">
                        {currentStrength}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <Lock className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Animated Power Gauge Bar */}
                {password && (
                  <div className="mt-1.5 w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800/80">
                    <div
                      className="h-full transition-all duration-300 bg-white"
                      style={{ width: `${currentStrength}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0"
                  />
                  <span>{t.authRememberMe}</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setMainTab('signup');
                    playSound('tab_click');
                  }}
                  className="text-zinc-300 hover:text-white font-medium underline"
                >
                  {t.authNoAccount}
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer group"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.authSignInBtn}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          )}

          {/* TAB 2: SIGN UP / REGISTER */}
          {mainTab === 'signup' && (
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              {/* Full Name */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  {t.authFullName}
                </label>
                <div className="relative group">
                  <User className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800/90 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <span>{t.authEmailOrPhone}</span>
                  </span>
                  {(regPhone.trim() || regEmail.trim()) ? (
                    <span className="text-[10px] text-zinc-300 flex items-center gap-1 font-mono">
                      <Check className="w-3 h-3 text-white" /> Ready
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-mono">1 required</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Phone */}
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1 flex items-center justify-between">
                      <span>Phone</span>
                      {regPhone.trim() && <Check className="w-3 h-3 text-white" />}
                    </label>
                    <div className="relative group">
                      <Phone className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="020 00000000"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1 flex items-center justify-between">
                      <span>Email</span>
                      {regEmail.trim() && <Check className="w-3 h-3 text-white" />}
                    </label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="user@email.com"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-9 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors font-mono"
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
                        <span className="text-[10px] text-white flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> {t.authPasswordMatch}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                          <X className="w-3 h-3" /> {t.authPasswordMismatch}
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
                      className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('signin');
                    playSound('tab_click');
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  {t.authHaveAccount}
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm mt-1 cursor-pointer group"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t.authSignUpBtn}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          )}



          {/* Footer note with ecosystem branding */}
          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-zinc-400" />
              <span>AVATR Intelligent EV Ecosystem</span>
            </span>
            <span>Vientiane, Lao PDR</span>
          </div>

        </div>

      </div>
    </div>
  );
}
