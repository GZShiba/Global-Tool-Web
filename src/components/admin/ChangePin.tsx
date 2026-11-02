import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  KeyRound, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Copy, Check,
  Mail, Lock, UserPlus, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AdministratorAccount, changeAdminEmail, changeAdminPassword, createAdministrator,
  listAdminAccounts, rotateCredentials,
} from '../../lib/adminApi';
import { AdminBtn, AdminField, adminInputClass } from './adminUi';

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-xl p-3 text-xs text-red-700 dark:text-red-300">
      <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
    </div>
  );
}

function SuccessBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-3 text-xs text-emerald-700 dark:text-emerald-300">
      <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> {message}
    </div>
  );
}

export default function ChangePin() {
  return (
    <div className="max-w-3xl space-y-6">
      <RotateCredentialsCard />
      <ChangePasswordCard />
      <ChangeEmailCard />
      <AdministratorsCard />
    </div>
  );
}

function SectionCard({ icon, title, subtitle, children }: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-card border border-subtle rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">{icon}</div>
        <div>
          <h2 className="font-extrabold text-sm text-neutral-900 dark:text-white">{title}</h2>
          <p className="text-xs text-secondary font-normal">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ------------------------- Rotate credentials ------------------------- */

function RotateCredentialsCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ password: string; pin: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(label); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setResult(null);
    if (!currentPassword || !/^\d{6}$/.test(currentPin)) { setError('Enter your current password and six-digit PIN.'); return; }
    setBusy(true);
    try {
      const res = await rotateCredentials(currentPassword, currentPin);
      setResult({ password: res.password, pin: res.pin });
      setCurrentPassword(''); setCurrentPin('');
      toast.success('Credentials rotated — save the new values now');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rotation failed');
    } finally { setBusy(false); }
  };

  return (
    <SectionCard icon={<RefreshCw size={18} />} title="Rotate Admin Credentials" subtitle="Generates a strong new password and a non-predictable 6-digit PIN.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminField label="Current password"><input type="password" className={adminInputClass} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoComplete="current-password" /></AdminField>
          <AdminField label="Current 6-digit PIN"><input inputMode="numeric" maxLength={6} className={adminInputClass} value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} required /></AdminField>
        </div>
        <ErrorBox error={error} />
        <div className="flex justify-end">
          <AdminBtn type="submit" disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {busy ? 'Rotating…' : 'Rotate Credentials'}
          </AdminBtn>
        </div>
      </form>
      {result && (
        <div className="mt-5 border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-widest">
            <CheckCircle2 size={14} /> New credentials — show once, store securely
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-card border border-subtle rounded-xl p-3.5">
              <div className="text-[9px] text-faint font-bold uppercase tracking-widest mb-1">New password</div>
              <div className="font-mono text-sm text-neutral-900 dark:text-white break-all">{result.password}</div>
              <button type="button" onClick={() => copy('pw', result.password)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                {copied === 'pw' ? <Check size={12} /> : <Copy size={12} />} {copied === 'pw' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="bg-card border border-subtle rounded-xl p-3.5">
              <div className="text-[9px] text-faint font-bold uppercase tracking-widest mb-1">New PIN</div>
              <div className="font-mono text-sm text-neutral-900 dark:text-white tracking-[0.3em]">{result.pin}</div>
              <button type="button" onClick={() => copy('pin', result.pin)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                {copied === 'pin' ? <Check size={12} /> : <Copy size={12} />} {copied === 'pin' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-secondary font-normal">The old credentials no longer work. These values are shown once and never stored in plaintext.</p>
        </div>
      )}
    </SectionCard>
  );
}

/* --------------------------- Change password --------------------------- */

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
    if (newPassword.length < 12 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('New password must be at least 12 characters and include upper/lower case and a number.');
      return;
    }
    setBusy(true);
    try {
      await changeAdminPassword(currentPassword, currentPin, newPassword, confirmPassword);
      setSuccess('Password changed. Other sessions for this account were signed out.');
      setCurrentPassword(''); setCurrentPin(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Password updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally { setBusy(false); }
  };

  return (
    <SectionCard icon={<Lock size={18} />} title="Change Admin Password" subtitle="Requires your current password and PIN.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminField label="Current password"><input type="password" className={adminInputClass} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></AdminField>
          <AdminField label="Current 6-digit PIN"><input inputMode="numeric" maxLength={6} className={adminInputClass} value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} required /></AdminField>
          <AdminField label="New password" hint="12+ chars, upper/lower/digit"><input type="password" className={adminInputClass} value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></AdminField>
          <AdminField label="Confirm new password"><input type="password" className={adminInputClass} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></AdminField>
        </div>
        <ErrorBox error={error} />
        <SuccessBox message={success} />
        <div className="flex justify-end">
          <AdminBtn type="submit" disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : null} {busy ? 'Updating…' : 'Change Password'}</AdminBtn>
        </div>
      </form>
    </SectionCard>
  );
}

/* ----------------------------- Change email ----------------------------- */

function ChangeEmailCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    setBusy(true);
    try {
      const res = await changeAdminEmail(currentPassword, currentPin, newEmail);
      setSuccess(`Admin email updated to ${res.email}. Note: ownership verification (email confirmation) is not available in this local setup.`);
      setCurrentPassword(''); setCurrentPin(''); setNewEmail('');
      toast.success('Email updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change email');
    } finally { setBusy(false); }
  };

  return (
    <SectionCard icon={<Mail size={18} />} title="Change Admin Email" subtitle="Requires your current password and PIN.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AdminField label="Current password"><input type="password" className={adminInputClass} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></AdminField>
          <AdminField label="Current 6-digit PIN"><input inputMode="numeric" maxLength={6} className={adminInputClass} value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} required /></AdminField>
          <AdminField label="New email"><input type="email" className={adminInputClass} value={newEmail} onChange={e => setNewEmail(e.target.value)} required /></AdminField>
        </div>
        <ErrorBox error={error} />
        <SuccessBox message={success} />
        <p className="text-[11px] text-faint font-normal">Email format is validated on both client and server. Address ownership verification (confirmation email) is unavailable in this local deployment.</p>
        <div className="flex justify-end">
          <AdminBtn type="submit" disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : null} {busy ? 'Updating…' : 'Change Email'}</AdminBtn>
        </div>
      </form>
    </SectionCard>
  );
}

/* --------------------------- Administrators --------------------------- */

function AdministratorsCard() {
  const [accounts, setAccounts] = useState<AdministratorAccount[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; pin: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [fields, setFields] = useState({ currentPassword: '', currentPin: '', email: '', password: '' });

  const load = async () => {
    try { setAccounts(await listAdminAccounts()); } catch { setAccounts([]); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setCreated(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) { setError('Enter a valid email address.'); return; }
    if (fields.password.length < 12 || !/[a-z]/.test(fields.password) || !/[A-Z]/.test(fields.password) || !/\d/.test(fields.password)) {
      setError('Password must be at least 12 characters and include upper/lower case and a number.');
      return;
    }
    setBusy(true);
    try {
      const res = await createAdministrator(fields.currentPassword, fields.currentPin, fields.email, fields.password);
      setCreated({ email: res.administrator.email, pin: res.pin });
      setFields({ currentPassword: '', currentPin: '', email: '', password: '' });
      toast.success('Second administrator created');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create administrator');
    } finally { setBusy(false); }
  };

  return (
    <SectionCard icon={<Users size={18} />} title="Administrator Accounts" subtitle="Up to two active administrators manage the same CMS with independent credentials.">
      <div className="mb-5 space-y-2">
        {accounts === null ? (
          <p className="text-xs text-secondary font-normal">Loading accounts…</p>
        ) : accounts.length === 0 ? (
          <p className="text-xs text-secondary font-normal">No administrators found.</p>
        ) : (
          accounts.map(acc => (
            <div key={acc.id} className="flex items-center justify-between bg-inset border border-subtle rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{acc.email}</p>
                <p className="text-[10px] text-faint font-normal uppercase tracking-widest mt-0.5">{acc.status} · created {new Date(acc.createdAt).toLocaleDateString()}</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-widest">
                {acc.status}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-subtle pt-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={16} className="text-accent" />
          <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Add Administrator</h3>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminField label="Your current password"><input type="password" className={adminInputClass} value={fields.currentPassword} onChange={e => setFields(p => ({ ...p, currentPassword: e.target.value }))} required /></AdminField>
            <AdminField label="Your current 6-digit PIN"><input inputMode="numeric" maxLength={6} className={adminInputClass} value={fields.currentPin} onChange={e => setFields(p => ({ ...p, currentPin: e.target.value.replace(/\D/g, '') }))} required /></AdminField>
            <AdminField label="New administrator email"><input type="email" className={adminInputClass} value={fields.email} onChange={e => setFields(p => ({ ...p, email: e.target.value }))} required /></AdminField>
            <AdminField label="New administrator password" hint="12+ chars, upper/lower/digit"><input type="password" className={adminInputClass} value={fields.password} onChange={e => setFields(p => ({ ...p, password: e.target.value }))} required /></AdminField>
          </div>
          <ErrorBox error={error} />
          {created && (
            <div className="border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl p-4 space-y-2">
              <p className="text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={14} /> Administrator created
              </p>
              <p className="text-xs text-secondary font-normal">Email: <span className="font-mono text-neutral-900 dark:text-white">{created.email}</span></p>
              <p className="text-xs text-secondary font-normal">
                Initial PIN (shown once): <span className="font-mono text-neutral-900 dark:text-white tracking-[0.3em]">{created.pin}</span>{' '}
                <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(created.pin); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }} className="text-accent text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                </button>
              </p>
              <p className="text-[11px] text-faint font-normal">The new administrator sets their own PIN via the security page after first login, or uses this one-time PIN.</p>
            </div>
          )}
          <div className="flex justify-end">
            <AdminBtn type="submit" disabled={busy || (accounts?.length ?? 0) >= 2}>
              <UserPlus size={14} /> {busy ? 'Creating…' : 'Create Administrator'}
            </AdminBtn>
          </div>
          {(accounts?.length ?? 0) >= 2 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Maximum of 2 active administrators reached.</p>
          )}
        </form>
      </div>
    </SectionCard>
  );
}
