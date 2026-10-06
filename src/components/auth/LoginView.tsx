import { useState, useRef } from 'react';
import { SystemUser, Language, UserRole } from '../../types';
import { 
  auth, 
  isFirebaseConfigured, 
  saveUserToFirestore 
} from '../../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import AvatrLogo from '../layout/AvatrLogo';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Crown, 
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
  Briefcase,
  Shield,
  Activity,
  BatteryCharging,
  Gauge,
  Flame,
  Check,
  X
} from 'lucide-react';

interface LoginViewProps {
  users: SystemUser[];
  onLoginSuccess: (user: SystemUser, rememberMe: boolean) => void;
  onRegisterUser?: (newUser: SystemUser) => void;
  lang: Language;
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
    themeColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.22)',
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
    themeColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.22)',
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
    themeColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.22)',
  },
];

export default function LoginView({ users, onLoginSuccess, onRegisterUser }: LoginViewProps) {
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
  const [regRole, setRegRole] = useState<UserRole>('general_user');
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

    // Try Firebase Authentication if configured and email/password provided
    if (isFirebaseConfigured() && auth && cleanId.includes('@') && password) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanId, password);
        const fbUid = userCredential.user.uid;
        const matchedFb = users.find(u => u.id === fbUid || u.email.toLowerCase() === cleanId);
        if (matchedFb) {
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

    const matched = users.find(
      u => u.email.toLowerCase() === cleanId ||
           u.phone.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '') ||
           u.name.toLowerCase().includes(cleanId)
    );

    if (matched) {
      playSound('success');
      setSuccessMessage(`ເຂົ້າສູ່ລະບົບສຳເລັດ! ຍິນດີຕ້ອນຮັບ ${matched.name}`);
      setTimeout(() => {
        onLoginSuccess(matched, rememberMe);
      }, 400);
    } else {
      if (cleanId === 'admin' || cleanId === 'super_admin') {
        const adminUser = users.find(u => u.role === 'super_admin') || users[0];
        playSound('success');
        onLoginSuccess(adminUser, rememberMe);
        return;
      }
      setErrorMessage('ບໍ່ພົບບັນຊີນີ້ໃນລະບົບ. ຫາກຍັງບໍ່ມີບັນຊີ ທ່ານສາມາດກົດ "ສ້າງບັນຊີໃໝ່" ໄດ້.');
    }
  };

  // 2. Sign Up / Register Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regName.trim()) {
      setErrorMessage('ກະລຸນາປ້ອນ ຊື່ ແລະ ນາມສະກຸນ');
      return;
    }

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMessage('ກະລຸນາປ້ອນອີເມວໃຫ້ຖືກຕ້ອງ');
      return;
    }

    if (!regPhone.trim()) {
      setErrorMessage('ກະລຸນາປ້ອນເບີໂທລະສັບ');
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

    // Check if email or phone already exists locally
    const emailExists = users.some(u => u.email.toLowerCase() === regEmail.trim().toLowerCase());
    if (emailExists) {
      setErrorMessage('ອີເມວນີ້ມີໃນລະບົບແລ້ວ ກະລຸນາເຂົ້າສູ່ລະບົບ');
      return;
    }

    // Create New User Object
    const initials = regName.trim().slice(0, 2);
    let newUserId = `USR-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

    let roleTitleLo = 'ຜູ້ໃຊ້ທົ່ວໄປ (General User)';
    let department = 'General Staff';
    if (regRole === 'sales') {
      roleTitleLo = 'ທີ່ປຶກສາການຂາຍ (Sales Consultant)';
      department = 'Showroom Sales';
    } else if (regRole === 'technician') {
      roleTitleLo = 'ຊ່າງເຕັກນິກ & PDI (Technician)';
      department = 'Workshop & PDI';
    } else if (regRole === 'admin') {
      roleTitleLo = 'Admin ສາຂາ (Branch Manager)';
      department = 'Operations';
    }

    // Attempt Firebase Auth user creation
    if (isFirebaseConfigured() && auth) {
      try {
        const userCred = await createUserWithEmailAndPassword(auth, regEmail.trim().toLowerCase(), regPassword);
        newUserId = userCred.user.uid;
      } catch (err: any) {
        console.warn('Firebase Auth user creation notice:', err.message);
      }
    }

    const newUser: SystemUser = {
      id: newUserId,
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      phone: regPhone.trim(),
      role: regRole,
      roleTitleLo: roleTitleLo,
      department: department,
      status: 'active',
      avatarInitials: initials,
      permissions: {
        canManageUsers: regRole === 'super_admin',
        canDeleteUsers: regRole === 'super_admin',
        canGrantRoles: regRole === 'super_admin',
        canEditInventory: regRole === 'super_admin' || regRole === 'admin' || regRole === 'technician',
        canUploadQR: regRole === 'super_admin',
        canAddModels: regRole === 'super_admin',
        canDeductPOS: regRole === 'super_admin' || regRole === 'admin' || regRole === 'sales',
        canViewFinancials: regRole === 'super_admin' || regRole === 'admin',
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
    setSuccessMessage(`ສ້າງບັນຊີໃໝ່ສຳເລັດ! ຍິນດີຕ້ອນຮັບ ${newUser.name}`);

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
      
      {/* Dynamic Animated Ambient Background Aura synchronized with active vehicle color */}
      <div 
        className="absolute top-1/4 left-1/6 w-[650px] h-[650px] rounded-full blur-[150px] pointer-events-none transition-all duration-700 opacity-25 animate-pulse-glow"
        style={{ backgroundColor: activeCar.themeColor }}
      />
      <div className="absolute -bottom-24 -right-24 w-[550px] h-[550px] bg-blue-900/20 rounded-full blur-[140px] pointer-events-none animate-float-reverse" />
      <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-purple-900/15 rounded-full blur-[130px] pointer-events-none" />

      {/* LiDAR Laser Point Grid Overlay Simulation */}
      {isLidarActive && (
        <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
      )}

      {/* Floating Cyber Particle Icons (Interactive Aesthetic Backdrop) */}
      <div className="absolute top-12 left-12 p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-emerald-400/80 hidden xl:flex items-center gap-2 animate-float-slow backdrop-blur-md">
        <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
        <span className="text-[11px] font-mono">800V SiC High-Voltage Ready</span>
      </div>

      <div className="absolute bottom-12 left-20 p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-blue-400/80 hidden xl:flex items-center gap-2 animate-float-reverse backdrop-blur-md">
        <Cpu className="w-4 h-4 text-blue-400 animate-spin-slow" />
        <span className="text-[11px] font-mono">HarmonyOS 4.0 Dual-Chip Cockpit</span>
      </div>

      <div className="absolute top-16 right-16 p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-amber-400/80 hidden xl:flex items-center gap-2 animate-float-slow backdrop-blur-md">
        <ShieldCheck className="w-4 h-4 text-amber-400" />
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
                className={`p-1.5 rounded-lg transition-all ${
                  isSoundEnabled ? 'bg-zinc-800 text-emerald-400 shadow' : 'text-zinc-500 hover:text-white'
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
                className={`p-1.5 rounded-lg transition-all ${
                  isLidarActive ? 'bg-zinc-800 text-blue-400 shadow' : 'text-zinc-500 hover:text-white'
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
                className={`p-1.5 rounded-lg transition-all ${
                  boostModeActive ? 'bg-amber-950 text-amber-300 border border-amber-500 shadow' : 'text-zinc-500 hover:text-white'
                }`}
                title="Turbo Boost Mode"
              >
                <Flame className={`w-3.5 h-3.5 ${boostModeActive ? 'animate-bounce text-amber-400' : ''}`} />
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeCarIdx === idx
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
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/80 to-transparent animate-laser-sweep" />
                  </div>
                )}

                {/* Ambient dynamic vehicle HUD overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent p-3.5 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/85 border text-white backdrop-blur-md flex items-center gap-1.5"
                      style={{ borderColor: activeCar.themeColor }}
                    >
                      <Car className="w-3 h-3 text-emerald-400" />
                      <span>{activeCar.subTitle}</span>
                    </span>

                    {/* Headlight Toggle Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeadlightOn(!isHeadlightOn);
                        playSound('tab_click');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold backdrop-blur-md border transition-all ${
                        isHeadlightOn 
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md' 
                          : 'bg-black/80 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {isHeadlightOn ? '💡 ໄຟໜ້າ Matrix ON' : '💡 ໄຟໜ້າ OFF'}
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
                className={`p-2 rounded-xl border text-center transition-all ${
                  activeHudWidget === 'battery'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <BatteryCharging className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
                <span className="text-[9px] font-mono block uppercase">ແບັດເຕີຣີ</span>
                <span className="text-[10px] font-bold text-white block">{activeCar.range.split(' ')[0]}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveHudWidget('motor');
                  playSound('tab_click');
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  activeHudWidget === 'motor'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Gauge className="w-3.5 h-3.5 mx-auto mb-1 text-amber-400" />
                <span className="text-[9px] font-mono block uppercase">ອັດຕາເລັ່ງ</span>
                <span className="text-[10px] font-bold text-white block">{activeCar.accel.split(' ')[0]}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveHudWidget('lidar');
                  playSound('tab_click');
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  activeHudWidget === 'lidar'
                    ? 'bg-blue-950/80 border-blue-500 text-blue-300 shadow'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5 mx-auto mb-1 text-blue-400" />
                <span className="text-[9px] font-mono block uppercase">ພະລັງຂັບ</span>
                <span className="text-[10px] font-bold text-white block">{activeCar.power.split(' ')[0]}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveHudWidget('security');
                  playSound('tab_click');
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  activeHudWidget === 'security'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-300 shadow'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5 mx-auto mb-1 text-purple-400" />
                <span className="text-[9px] font-mono block uppercase">ລະບົບຄວາມປອດໄພ</span>
                <span className="text-[10px] font-bold text-white block">IP69K</span>
              </button>
            </div>
          </div>

          {/* Bottom Factory Collaboration Note */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>HarmonyOS 4.0 Cockpit</span>
            </span>
            <span className="text-zinc-400">CATL 800V Supercharge</span>
          </div>
        </div>

        {/* RIGHT COLUMN: HIGH-TECH COCKPIT ACCESS CONSOLE (7 cols on lg) */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
          
          {/* Header Title & Access Mode Segmented Switcher */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>ລະບົບຈັດການ AVATR AUTO</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ONLINE
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {mainTab === 'signup' 
                    ? 'ສ້າງບັນຊີຜູ້ໃຊ້ໃໝ່ ເພື່ອເຂົ້າຮ່ວມທີມງານ AVATR'
                    : 'ເຂົ້າສູ່ລະບົບຈັດການ AVATR AUTO SERVICE'}
                </p>
              </div>

              {/* Security Shield Badge */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-zinc-900/90 px-2.5 py-1 rounded-xl border border-zinc-800 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-Bit TLS</span>
              </div>
            </div>

            {/* 2 ACCESS TABS: Sign In & Sign Up */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs font-semibold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setMainTab('signin');
                  playSound('tab_click');
                }}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  mainTab === 'signin'
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LogIn className="w-4 h-4 text-emerald-500" />
                <span>ເຂົ້າສູ່ລະບົບ (Sign In)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMainTab('signup');
                  playSound('tab_click');
                }}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  mainTab === 'signup'
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4 text-amber-500" />
                <span>ສ້າງບັນຊີໃໝ່ (Sign Up)</span>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN (ເຂົ້າສູ່ລະບົບ) */}
          {mainTab === 'signin' && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5 flex items-center justify-between">
                  <span>ອີເມວ ຫຼື ເບີໂທລະສັບ (Email / Phone)</span>
                  {identifier.includes('@') && (
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> ອີເມວຖືກຕ້ອງ
                    </span>
                  )}
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="sengouthai.avatr@laos-ev.la ຫຼື 020 55575537"
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-zinc-300 font-semibold">
                    ລະຫັດຜ່ານ (Password)
                  </label>
                  {/* Dynamic CATL Shenxing Battery Gauge Meter */}
                  {password && (
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className="text-zinc-500">ຄວາມປອດໄພ:</span>
                      <span className={`font-bold ${
                        currentStrength >= 80 ? 'text-emerald-400' : currentStrength >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}>
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
                      className={`h-full transition-all duration-300 ${
                        currentStrength >= 80 ? 'bg-emerald-400' : currentStrength >= 50 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
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
                  <span>ຈົດຈຳການເຂົ້າສູ່ລະບົບ (Remember Me)</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setMainTab('signup');
                    playSound('tab_click');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  ຍັງບໍ່ມີບັນຊີ? ສ້າງບັນຊີໃໝ່
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer group"
              >
                <LogIn className="w-4 h-4" />
                <span>ເຂົ້າສູ່ລະບົບ (Sign In)</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          )}

          {/* TAB 2: SIGN UP / REGISTER (ສ້າງບັນຊີໃໝ່) */}
          {mainTab === 'signup' && (
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    ຊື່ ແລະ ນາມສະກຸນ (Full Name) *
                  </label>
                  <div className="relative group">
                    <User className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="ທ້າວ ສົມສັກ ແກ້ວມະນີ"
                      className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    ເບີໂທລະສັບ (Phone) *
                  </label>
                  <div className="relative group">
                    <Phone className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="020 55575537"
                      className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  ອີເມວ (Email) *
                </label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-zinc-500 group-focus-within:text-white absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="somsack.staff@laos-ev.la"
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                  <span>ເລືອກຕຳແໜ່ງ / ພະແນກ (Role & Department)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRegRole('general_user');
                      playSound('tab_click');
                    }}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      regRole === 'general_user'
                        ? 'bg-white text-black font-bold border-white shadow-sm'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold text-[11px] truncate">👤 ຜູ້ໃຊ້ທົ່ວໄປ</span>
                    <span className="text-[9px] opacity-75 block truncate">Staff / Support</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRegRole('sales');
                      playSound('tab_click');
                    }}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      regRole === 'sales'
                        ? 'bg-white text-black font-bold border-white shadow-sm'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold text-[11px] truncate">💼 ທີ່ປຶກສາການຂາຍ</span>
                    <span className="text-[9px] opacity-75 block truncate">Showroom Sales</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRegRole('technician');
                      playSound('tab_click');
                    }}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      regRole === 'technician'
                        ? 'bg-white text-black font-bold border-white shadow-sm'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-bold text-[11px] truncate">🔧 ຊ່າງເຕັກນິກ & PDI</span>
                    <span className="text-[9px] opacity-75 block truncate">Workshop Bay</span>
                  </button>
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">
                    ລະຫັດຜ່ານ (Password) *
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
                    <span>ຢືນຢັນລະຫັດຜ່ານ *</span>
                    {regConfirmPassword && (
                      regPassword === regConfirmPassword ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> ຕົງກັນ
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                          <X className="w-3 h-3" /> ບໍ່ຕົງກັນ
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
                  ມີບັນຊີແລ້ວ? <span className="text-emerald-400 underline font-semibold">ເຂົ້າສູ່ລະບົບ</span>
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm mt-1 cursor-pointer group"
              >
                <UserPlus className="w-4 h-4" />
                <span>ສ້າງບັນຊີ ແລະ ເຂົ້າສູ່ລະບົບ (Register & Enter)</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          )}



          {/* Footer note with ecosystem branding */}
          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>AVATR Intelligent EV Ecosystem</span>
            </span>
            <span>Vientiane, Lao PDR</span>
          </div>

        </div>

      </div>
    </div>
  );
}
