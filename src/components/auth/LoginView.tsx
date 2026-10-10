import { useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, LogIn, Mail } from 'lucide-react';
import type { Language, SystemUser } from '../../types';
import { translations } from '../../data/translations';
import AvatrLogo from '../layout/AvatrLogo';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<SystemUser>;
  onLoginSuccess: (user: SystemUser) => void;
  lang: Language;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  setupError?: string | null;
}

export default function LoginView({ onLogin, onLoginSuccess, lang, theme, onToggleTheme, setupError }: LoginViewProps) {
  const t = translations[lang] || translations.lo;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const user = await onLogin(email, password);
      onLoginSuccess(user);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign-in failed. Check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#09090b] text-white' : 'bg-slate-50 text-slate-950'}`}>
      <section className={`w-full max-w-md rounded-3xl border p-7 shadow-2xl ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <AvatrLogo />
            <h1 className="mt-6 text-xl font-black">{t.authSignInBtn}</h1>
            <p className={`mt-1 text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {lang === 'th' ? 'เข้าสู่ระบบด้วยบัญชีพนักงานที่ผู้ดูแลสร้างให้' : lang === 'lo' ? 'ເຂົ້າລະບົບດ້ວຍບັນຊີພະນັກງານ' : 'Sign in with your staff account.'}
            </p>
          </div>
          <button type="button" onClick={onToggleTheme} className={`rounded-xl border px-3 py-2 text-xs ${isDark ? 'border-zinc-700 text-zinc-200' : 'border-slate-300 text-slate-700'}`}>
            {isDark ? t.lightMode : t.darkMode}
          </button>
        </div>

        {(setupError || errorMessage) && (
          <div role="alert" className={`mt-5 flex items-start gap-2 rounded-xl border p-3 text-xs ${isDark ? 'border-red-900 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage || setupError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="staff-email" className="mb-1.5 block text-xs font-bold">Email</label>
            <div className="relative">
              <Mail aria-hidden="true" className={`absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
              <input
                id="staff-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none focus:ring-2 ${isDark ? 'border-zinc-700 bg-zinc-900 text-white focus:border-white focus:ring-white/20' : 'border-slate-300 bg-slate-50 text-slate-950 focus:border-slate-900 focus:ring-slate-900/10'}`}
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="staff-password" className="mb-1.5 block text-xs font-bold">{t.authPassword}</label>
            <div className="relative">
              <Lock aria-hidden="true" className={`absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
              <input
                id="staff-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`w-full rounded-xl border py-3 pl-10 pr-11 text-sm outline-none focus:ring-2 ${isDark ? 'border-zinc-700 bg-zinc-900 text-white focus:border-white focus:ring-white/20' : 'border-slate-300 bg-slate-50 text-slate-950 focus:border-slate-900 focus:ring-slate-900/10'}`}
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className={`absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-950'}`}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black disabled:opacity-50 ${isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-slate-950 text-white hover:bg-slate-800'}`}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            <span>{isLoading ? (lang === 'th' ? 'กำลังเข้าสู่ระบบ…' : 'Signing in…') : t.authSignInBtn}</span>
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </section>
    </main>
  );
}
