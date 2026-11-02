import { useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, KeyRound, Loader2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { loginStep1, loginStep2, setSessionToken } from '../../lib/adminApi';
import { useAdminTheme } from './adminTheme';

export default function AdminLogin({ onAuthed, notice }: { onAuthed: () => void; notice?: string | null }) {
  const { adminTheme } = useAdminTheme();
  const [step, setStep] = useState<'credentials' | 'pin'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [stepToken, setStepToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const submitCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const token = await loginStep1(email.trim(), password);
      setStepToken(token);
      setStep('pin');
      setTimeout(() => pinRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const handlePinChange = (idx: number, value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 1);
    const next = [...pin];
    next[idx] = digits;
    setPin(next);
    if (digits && idx < 5) pinRefs.current[idx + 1]?.focus();
  };

  const handlePinKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) pinRefs.current[idx - 1]?.focus();
  };

  const submitPin = async (e: FormEvent) => {
    e.preventDefault();
    const code = pin.join('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter all six digits of your PIN.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await loginStep2(stepToken, code);
      setSessionToken(token);
      toast.success('Welcome back, admin');
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN verification failed');
      setPin(['', '', '', '', '', '']);
      pinRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

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

        {step === 'credentials' ? (
          <form onSubmit={submitCredentials} className="space-y-4">
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
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-secondary"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-xl p-3 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : null} Continue
            </button>
          </form>
        ) : (
          <form onSubmit={submitPin} className="space-y-4">
            <div className="text-center">
              <KeyRound size={22} className="mx-auto text-accent mb-2" />
              <p className="text-sm font-bold text-neutral-900 dark:text-white">Enter your 6-digit PIN</p>
              <p className="text-xs text-secondary font-normal mt-1">A security PIN is required to complete sign-in.</p>
            </div>

            <div className="flex justify-center gap-2">
              {pin.map((d, idx) => (
                <input
                  key={idx}
                  ref={el => { pinRefs.current[idx] = el; }}
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handlePinChange(idx, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(idx, e)}
                  aria-label={`PIN digit ${idx + 1}`}
                  className="w-11 h-12 text-center bg-inset border border-subtle text-neutral-900 dark:text-white focus:bg-card focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl outline-none text-lg font-bold tabular-nums"
                />
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-xl p-3 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : null} Verify PIN
            </button>
            <button
              type="button"
              onClick={() => { setStep('credentials'); setPin(['', '', '', '', '', '']); setError(null); }}
              className="w-full text-center text-[10px] font-bold uppercase tracking-wider text-secondary hover:text-neutral-900 dark:hover:text-white"
            >
              ← Back to sign in
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[10px] text-faint font-normal leading-relaxed">
          Protected area · Sign-in is verified locally by the admin service.
        </p>
      </div>
    </div>
  );
}
