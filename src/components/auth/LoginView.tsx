import { useState, useEffect } from 'react';
import { SystemUser, Language } from '../../types';
import { translations } from '../../data/translations';
import { signInStaff, signUpStaff } from '../../backend/data';
import { isSupabaseConfigured } from '../../backend/client';
import { DEFAULT_OFFLINE_USERS } from '../../backend/offlineStore';
import AvatrLogo from '../layout/AvatrLogo';
import TurnstileWidget from '../common/TurnstileWidget';
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
  Loader2,
  Sun,
  Moon
} from 'lucide-react';

interface LoginViewProps {
  users: SystemUser[];
  onLoginSuccess: (user: SystemUser, rememberMe: boolean) => void;
  onRegisterUser?: (newUser: SystemUser) => void;
  lang: Language;
  setLang?: (lang: Language) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

type MainTab = 'signin' | 'signup';

function formatAuthError(error: unknown, lang: Language): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    if (lang === 'lo') return 'ບໍ່ສາມາດເຊື່ອມຕໍ່ກັບ Supabase Backend ໄດ້ (Failed to fetch). ກະລຸນາກວດສອບ VITE_SUPABASE_URL ໃນໄຟລ໌ .env ວ່າເປັນ URL ຕົວຈິງ ຫຼື ບໍ່.';
    if (lang === 'th') return 'ไม่สามารถเชื่อมต่อกับ Supabase Backend ได้ (Failed to fetch) โปรดตรวจสอบ VITE_SUPABASE_URL ในไฟล์ .env ว่าเป็น URL จริงหรือไม่';
    return 'Could not connect to Supabase Backend (Failed to fetch). Please check VITE_SUPABASE_URL in your .env file.';
  }
  if (msg.includes('Supabase is not configured')) {
    if (lang === 'lo') return 'ຍັງບໍ່ທັນໄດ້ຕັ້ງຄ່າ Supabase ໃນໄຟລ໌ .env (ກະລຸນາໃສ່ Project URL ແລະ Anon Key ຕົວຈິງ).';
    if (lang === 'th') return 'ยังไม่ได้กำหนดค่า Supabase ในไฟล์ .env (โปรดระบุ Project URL และ Anon Key จริง)';
    return 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.';
  }
  return msg;
}

export default function LoginView({
  users,
  onLoginSuccess,
  onRegisterUser,
  lang,
  setLang,
  theme: propTheme,
  onToggleTheme
}: LoginViewProps) {
  const t = translations[lang] || translations.lo;

  // Local theme state if not fully driven by parent
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>(() => {
    if (propTheme) return propTheme;
    try {
      const saved = localStorage.getItem('avatr_app_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return document.documentElement.classList.contains('light') ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    if (propTheme) {
      setCurrentTheme(propTheme);
    }
  }, [propTheme]);

  const isDark = currentTheme === 'dark';

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const next = isDark ? 'light' : 'dark';
      setCurrentTheme(next);
      try {
        localStorage.setItem('avatr_app_theme', next);
        if (next === 'light') {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('dark');
        }
      } catch (e) {
        console.warn('Theme toggle error:', e);
      }
    }
  };

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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    setTurnstileToken(null);
  }, [mainTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!identifier.trim() || !password) {
      setErrorMessage(lang === 'th' ? 'กรอกอีเมลและรหัสผ่าน' : lang === 'lo' ? 'ປ້ອນອີເມວ ແລະ ລະຫັດຜ່ານ' : 'Enter email and password.');
      return;
    }
    const isTurnstileConfigured = Boolean((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim());
    if (isTurnstileConfigured && !turnstileToken) {
      setErrorMessage(lang === 'th' ? 'กรุณายืนยันการตรวจสอบความปลอดภัย (Cloudflare Turnstile)' : lang === 'lo' ? 'ກະລຸນາກວດສອບຄວາມປອດໄພ (Cloudflare Turnstile)' : 'Please complete the security check.');
      return;
    }
    setIsLoading(true);
    try {
      const user = await signInStaff(identifier, password, turnstileToken || undefined);
      setSuccessMessage(`${lang === 'th' ? 'เข้าสู่ระบบสำเร็จ' : lang === 'lo' ? 'ເຂົ້າລະບົບສຳເລັດ' : 'Signed in'}: ${user.name}`);
      onLoginSuccess(user, rememberMe);
    } catch (error) {
      setErrorMessage(formatAuthError(error, lang));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPhone = regPhone.trim();

    if (!cleanName || !cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage(lang === 'th' ? 'กรอกชื่อและอีเมลให้ถูกต้อง' : lang === 'lo' ? 'ປ້ອນຊື່ ແລະ ອີເມວໃຫ້ຖືກຕ້ອງ' : 'Enter a name and valid email.');
      return;
    }
    if (regPassword.length < 8 || regPassword !== regConfirmPassword) {
      setErrorMessage(regPassword.length < 8
        ? (lang === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว' : lang === 'lo' ? 'ລະຫັດຜ່ານຕ້ອງມີ 8 ຕົວຂຶ້ນໄປ' : 'Password must be at least 8 characters.')
        : (lang === 'th' ? 'รหัสผ่านไม่ตรงกัน' : lang === 'lo' ? 'ລະຫັດຜ່ານບໍ່ກົງກັນ' : 'Passwords do not match.'));
      return;
    }

    const isTurnstileConfigured = Boolean((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim());
    if (isTurnstileConfigured && !turnstileToken) {
      setErrorMessage(lang === 'th' ? 'กรุณายืนยันการตรวจสอบความปลอดภัย (Cloudflare Turnstile)' : lang === 'lo' ? 'ກະລຸນາກວດສອບຄວາມປອດໄພ (Cloudflare Turnstile)' : 'Please complete the security check.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await signUpStaff(cleanEmail, regPassword, cleanName, cleanPhone, turnstileToken || undefined);
      setSuccessMessage(lang === 'th' ? 'สร้างบัญชี General User สำเร็จ' : lang === 'lo' ? 'ສ້າງບັນຊີ General User ສຳເລັດ' : 'General User account created.');
      onRegisterUser?.(user);
      onLoginSuccess(user, rememberMe);
    } catch (error) {
      setErrorMessage(formatAuthError(error, lang));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`app-shell login-shell min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#09090b] text-white selection:bg-white selection:text-black' : 'bg-[#f8fafc] text-slate-900 selection:bg-slate-900 selection:text-white'
      }`}
    >
      {/* Background Soft Glow Accents */}
      {isDark ? (
        <>
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-zinc-700/25 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-zinc-600/20 rounded-full blur-[140px] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-slate-200/60 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-100/40 rounded-full blur-[140px] pointer-events-none" />
        </>
      )}

      {/* Main Login Card */}
      <div
        className={`relative w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6 transition-all border ${
          isDark
            ? 'bg-zinc-950/95 border-zinc-700/90 text-white shadow-black/80'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/80'
        }`}
      >
        {/* Top Bar: Logo, Theme Switcher & Language Selector */}
        <div
          className={`flex items-center justify-between pb-4 border-b ${
            isDark ? 'border-zinc-800' : 'border-slate-100'
          }`}
        >
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border shadow-sm flex-shrink-0 ${
                isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <AvatrLogo className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-black text-base tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  AVATR
                </span>
                <span
                  className={`text-[9px] tracking-widest font-mono uppercase px-1.5 py-0.5 rounded font-bold border ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                      : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                >
                  AUTO
                </span>
              </div>
              <p className={`text-[10px] font-mono tracking-wide ${isDark ? 'text-zinc-300 font-medium' : 'text-slate-500'}`}>
                Changan × Huawei × CATL
              </p>
            </div>
          </div>

          {/* Action Tools: Theme Switcher & Language Selector */}
          <div className="flex items-center gap-1.5">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                isDark
                  ? 'bg-zinc-900 border-zinc-700 text-amber-300 hover:bg-zinc-800 hover:text-amber-200 hover:border-zinc-600'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900 hover:border-slate-300'
              }`}
              title={isDark ? t.lightMode : t.darkMode}
              aria-label={isDark ? t.lightMode : t.darkMode}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Language Selector */}
            {setLang && (
              <div
                className={`flex items-center gap-1 border rounded-xl p-1 shadow-inner ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setLang('lo')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                    lang === 'lo'
                      ? isDark
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'bg-white text-slate-950 shadow-sm'
                      : isDark
                      ? 'text-zinc-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  ລາວ
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                    lang === 'en'
                      ? isDark
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'bg-white text-slate-950 shadow-sm'
                      : isDark
                      ? 'text-zinc-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLang('th')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                    lang === 'th'
                      ? isDark
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'bg-white text-slate-950 shadow-sm'
                      : isDark
                      ? 'text-zinc-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  ไทย
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Header Title & Subtitle with high contrast */}
        <div className="space-y-1">
          <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
            {mainTab === 'signin' ? t.authSignInTitle : t.authSignUpTitle}
          </h1>
          <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-zinc-200' : 'text-slate-600'}`}>
            {mainTab === 'signin' ? t.authSignInDesc : t.authSignUpDesc}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div
          className={`grid grid-cols-2 gap-1 p-1 border rounded-2xl text-xs font-semibold ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setMainTab('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mainTab === 'signin'
                ? isDark
                  ? 'bg-white text-black font-black shadow-md'
                  : 'bg-white text-slate-950 font-black shadow-sm'
                : isDark
                ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
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
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mainTab === 'signup'
                ? isDark
                  ? 'bg-white text-black font-black shadow-md'
                  : 'bg-white text-slate-950 font-black shadow-sm'
                : isDark
                ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t.authSignUpTitle}</span>
          </button>
        </div>

        {/* Feedback Banners with High Visibility */}
        {/* Offline Demo Mode Quick Access */}
        {!isSupabaseConfigured && (
          <div
            className={`p-4 border rounded-2xl text-xs space-y-3 ${
              isDark
                ? 'bg-zinc-900/90 border-amber-500/40 text-zinc-200'
                : 'bg-amber-50/80 border-amber-300 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span>
                  {lang === 'lo'
                    ? 'ໂໝດ Offline Demo (ຕັດການເຊື່ອມຕໍ່ຖານຂໍ້ມູນແລ້ວ)'
                    : lang === 'th'
                    ? 'โหมด Offline Demo (ตัดการเชื่อมต่อฐานข้อมูลแล้ว)'
                    : 'Offline Demo Mode (Database Disconnected)'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                OFFLINE
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-zinc-300">
              {lang === 'lo'
                ? 'ທ່ານສາມາດກົດເຂົ້າສູ່ລະບົບທົດລອງໄດ້ທັນທີ ຫຼື ເລືອກຕຳແໜ່ງທີ່ຕ້ອງການທົດສອບ:'
                : lang === 'th'
                ? 'คุณสามารถคลิกเข้าสู่ระบบทดลองได้ทันที หรือเลือกตำแหน่งที่ต้องการทดสอบ:'
                : 'You can sign in with a demo account immediately:'}
            </p>

            {/* Quick Demo Login Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {DEFAULT_OFFLINE_USERS.map((demoUser) => (
                <button
                  key={demoUser.id}
                  type="button"
                  onClick={() => {
                    onLoginSuccess(demoUser, true);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer group ${
                    isDark
                      ? 'bg-zinc-950/80 border-zinc-700 hover:border-amber-400 hover:bg-zinc-800'
                      : 'bg-white border-slate-300 hover:border-amber-500 hover:bg-amber-50'
                  }`}
                >
                  <div className="font-bold text-[11px] truncate text-white group-hover:text-amber-400">
                    {demoUser.role === 'super_admin' ? '👑 ' : demoUser.role === 'sales' ? '💼 ' : '🔧 '}
                    {demoUser.roleTitleLo}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">{demoUser.email}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            className={`p-3 border rounded-2xl text-xs flex items-center gap-2 font-medium ${
              isDark
                ? 'bg-red-950/40 border-red-800 text-red-200'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            className={`p-3 border rounded-2xl text-xs flex items-center gap-2 font-medium ${
              isDark
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {mainTab === 'signin' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label
                className={`block font-bold mb-1.5 ${
                  isDark ? 'text-zinc-100' : 'text-slate-800'
                }`}
              >
                {t.authEmailOrPhone}
              </label>
              <div className="relative group">
                <Mail
                  className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark
                      ? 'text-zinc-400 group-focus-within:text-white'
                      : 'text-slate-400 group-focus-within:text-slate-950'
                  }`}
                />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@avatr.la ຫຼື ເບີໂທລະສັບ"
                  className={`w-full border rounded-xl pl-10 pr-3.5 py-2.5 font-medium transition-all text-xs outline-none ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400 focus:border-white focus:ring-1 focus:ring-white'
                      : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-400 focus:bg-white focus:border-slate-950 focus:ring-1 focus:ring-slate-950'
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                className={`block font-bold mb-1.5 ${
                  isDark ? 'text-zinc-100' : 'text-slate-800'
                }`}
              >
                {t.authPassword}
              </label>
              <div className="relative group">
                <Lock
                  className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark
                      ? 'text-zinc-400 group-focus-within:text-white'
                      : 'text-slate-400 group-focus-within:text-slate-950'
                  }`}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full border rounded-xl pl-10 pr-10 py-2.5 font-mono text-xs font-medium transition-all outline-none ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400 focus:border-white focus:ring-1 focus:ring-white'
                      : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-400 focus:bg-white focus:border-slate-950 focus:ring-1 focus:ring-slate-950'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer transition-colors ${
                    isDark
                      ? 'text-zinc-300 hover:text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label
                className={`flex items-center gap-2 cursor-pointer select-none text-xs font-semibold ${
                  isDark ? 'text-zinc-200 hover:text-white' : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={`rounded cursor-pointer ${
                    isDark
                      ? 'border-zinc-600 bg-zinc-900 text-white focus:ring-0'
                      : 'border-slate-300 bg-white text-slate-950 focus:ring-0'
                  }`}
                />
                <span>{t.authRememberMe}</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setMainTab('signup');
                  setErrorMessage(null);
                }}
                className={`text-xs font-bold underline transition-colors cursor-pointer ${
                  isDark ? 'text-zinc-200 hover:text-white' : 'text-slate-800 hover:text-slate-950'
                }`}
              >
                {t.authNoAccount}
              </button>
            </div>

            <TurnstileWidget
              action="login"
              theme={isDark ? 'dark' : 'light'}
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />

            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: isDark ? '#ffffff' : '#09090b',
                color: isDark ? '#09090b' : '#ffffff',
              }}
              className={`w-full py-3 font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-3 cursor-pointer group disabled:opacity-50 ${
                isDark ? 'hover:bg-zinc-100 shadow-zinc-950/50' : 'hover:bg-zinc-800 shadow-slate-400/50'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    style={{ color: isDark ? '#09090b' : '#ffffff' }}
                  />
                  <span
                    className="font-black"
                    style={{ color: isDark ? '#09090b' : '#ffffff' }}
                  >
                    ກຳລັງເຂົ້າສູ່ລະບົບ...
                  </span>
                </>
              ) : (
                <>
                  <LogIn
                    className="w-4 h-4"
                    style={{
                      color: isDark ? '#09090b' : '#ffffff',
                      stroke: isDark ? '#09090b' : '#ffffff',
                    }}
                  />
                  <span
                    className="font-black"
                    style={{ color: isDark ? '#09090b' : '#ffffff' }}
                  >
                    {t.authSignInBtn}
                  </span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    style={{
                      color: isDark ? '#09090b' : '#ffffff',
                      stroke: isDark ? '#09090b' : '#ffffff',
                    }}
                  />
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
              <label
                className={`block font-bold mb-1 ${
                  isDark ? 'text-zinc-100' : 'text-slate-800'
                }`}
              >
                {t.authFullName} *
              </label>
              <div className="relative group">
                <User
                  className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark
                      ? 'text-zinc-400 group-focus-within:text-white'
                      : 'text-slate-400 group-focus-within:text-slate-950'
                  }`}
                />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="ຊື່ ແລະ ນາມສະກຸນ"
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 font-medium text-xs outline-none transition-colors ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400 focus:border-white focus:ring-1 focus:ring-white'
                      : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-400 focus:bg-white focus:border-slate-950 focus:ring-1 focus:ring-slate-950'
                  }`}
                />
              </div>
            </div>

            {/* Phone and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label
                  className={`block font-bold mb-1 ${
                    isDark ? 'text-zinc-100' : 'text-slate-800'
                  }`}
                >
                  ເບີໂທລະສັບ (Phone)
                </label>
                <div className="relative group">
                  <Phone
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark
                        ? 'text-zinc-400 group-focus-within:text-white'
                        : 'text-slate-400 group-focus-within:text-slate-950'
                    }`}
                  />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="020 00000000"
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 font-medium text-xs outline-none transition-colors ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400 focus:border-white focus:ring-1 focus:ring-white'
                        : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-400 focus:bg-white focus:border-slate-950 focus:ring-1 focus:ring-slate-950'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block font-bold mb-1 ${
                    isDark ? 'text-zinc-100' : 'text-slate-800'
                  }`}
                >
                  ອີເມວ (Email)
                </label>
                <div className="relative group">
                  <Mail
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark
                        ? 'text-zinc-400 group-focus-within:text-white'
                        : 'text-slate-400 group-focus-within:text-slate-950'
                    }`}
                  />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@email.com"
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 font-medium text-xs outline-none transition-colors ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400 focus:border-white focus:ring-1 focus:ring-white'
                        : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-400 focus:bg-white focus:border-slate-950 focus:ring-1 focus:ring-slate-950'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label
                  className={`block font-bold mb-1 ${
                    isDark ? 'text-zinc-100' : 'text-slate-800'
                  }`}
                >
                  {t.authPassword} *
                </label>
                <div className="relative group">
                  <Lock
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark
                        ? 'text-zinc-400 group-focus-within:text-white'
                        : 'text-slate-400 group-focus-within:text-slate-950'
                    }`}
                  />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full border rounded-xl pl-9 pr-9 py-2 font-mono font-medium text-xs outline-none transition-colors ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400 focus:border-white focus:ring-1 focus:ring-white'
                        : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-400 focus:bg-white focus:border-slate-950 focus:ring-1 focus:ring-slate-950'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 cursor-pointer transition-colors ${
                      isDark
                        ? 'text-zinc-300 hover:text-white'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    aria-label="Toggle password visibility"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className={`block font-bold mb-1 flex items-center justify-between ${
                    isDark ? 'text-zinc-100' : 'text-slate-800'
                  }`}
                >
                  <span>{t.authConfirmPassword} <span className="text-red-500">*</span></span>
                  {regConfirmPassword && (
                    regPassword === regConfirmPassword ? (
                      <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
                        isDark ? 'text-emerald-400' : 'text-emerald-600'
                      }`}>
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
                        isDark ? 'text-red-400' : 'text-red-600'
                      }`}>
                        <X className="w-3 h-3" />
                      </span>
                    )
                  )}
                </label>
                <div className="relative group">
                  <ShieldCheck
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark
                        ? 'text-zinc-400 group-focus-within:text-white'
                        : 'text-slate-400 group-focus-within:text-slate-950'
                    }`}
                  />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 font-mono font-medium text-xs outline-none transition-colors ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400 focus:border-white focus:ring-1 focus:ring-white'
                        : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-400 focus:bg-white focus:border-slate-950 focus:ring-1 focus:ring-slate-950'
                    }`}
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
                className={`text-xs font-bold underline transition-colors cursor-pointer ${
                  isDark ? 'text-zinc-200 hover:text-white' : 'text-slate-800 hover:text-slate-950'
                }`}
              >
                {t.authHaveAccount}
              </button>
            </div>

            <TurnstileWidget
              action="signup"
              theme={isDark ? 'dark' : 'light'}
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />

            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: isDark ? '#ffffff' : '#09090b',
                color: isDark ? '#09090b' : '#ffffff',
              }}
              className={`w-full py-3 font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-3 cursor-pointer group disabled:opacity-50 ${
                isDark
                  ? 'hover:bg-zinc-100 shadow-zinc-950/50'
                  : 'hover:bg-zinc-800 shadow-slate-400/50'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    style={{ color: isDark ? '#09090b' : '#ffffff' }}
                  />
                  <span
                    className="font-black"
                    style={{ color: isDark ? '#09090b' : '#ffffff' }}
                  >
                    ກຳລັງສ້າງບັນຊີ...
                  </span>
                </>
              ) : (
                <>
                  <User
                    className="w-4 h-4"
                    style={{
                      color: isDark ? '#09090b' : '#ffffff',
                      stroke: isDark ? '#09090b' : '#ffffff',
                    }}
                  />
                  <span
                    className="font-black"
                    style={{ color: isDark ? '#09090b' : '#ffffff' }}
                  >
                    {t.authSignUpBtn}
                  </span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    style={{
                      color: isDark ? '#09090b' : '#ffffff',
                      stroke: isDark ? '#09090b' : '#ffffff',
                    }}
                  />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div
          className={`pt-2 border-t flex items-center justify-between text-[10px] font-mono font-medium ${
            isDark ? 'border-zinc-800 text-zinc-400' : 'border-slate-200 text-slate-500'
          }`}
        >
          <span>AVATR Auto Service v1.2.0</span>
          <span>Vientiane, Lao PDR</span>
        </div>
      </div>
    </div>
  );
}
