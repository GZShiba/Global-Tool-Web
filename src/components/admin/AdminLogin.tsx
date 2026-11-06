import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useFirebaseAuth } from '../../lib/firebaseAuth';
import { useAdminTheme } from './adminTheme';

export default function AdminLogin({ notice }: { notice?: string | null }) {
  const { status, error, setError, signIn } = useFirebaseAuth();
  const { adminTheme } = useAdminTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') toast.success('Welcome back, admin');
  }, [status]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await signIn(email, password);
    setBusy(false);
    if (!ok) setError(error || 'Sign-in failed');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <Loader2 size={22} className="text-faint animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-app">
      <div className="w-full max-w-md bg-card border border-subtle rounded-3xl shadow-2xl p-7 sm:p-9">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-neutral-900 dark:bg-white flex items-center justify-center">
            <ShieldCheck className="text-white dark:text-neutral-900" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-neutral-900 dark:text-white tracking-tight">Admin Panel</h1>
            <p className="text-xs text-secondary font-normal">OmniToolify Content Management</p>
          </div>
        </div>

        {notice && (
          <div className="mb-5 flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300">
            <Info size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span className="leading-relaxed">{notice}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="email"
              required
              placeholder="Admin email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-inset border border-subtle text-neutral-900 dark:text-white focus:bg-card focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl outline-none text-sm font-medium"
            />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 pr-11 py-3 bg-inset border border-subtle text-neutral-900 dark:text-white focus:bg-card focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl outline-none text-sm font-medium"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-secondary" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-xl p-3 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null} Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-faint font-normal leading-relaxed">
          Protected area · Sign-in via Firebase Authentication (Email/Password).
        </p>
      </div>
    </div>
  );
}
