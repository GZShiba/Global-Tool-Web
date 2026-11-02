import { ReactNode } from 'react';
import { X, Loader2 } from 'lucide-react';

export function AdminField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-faint">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal font-normal text-faint/80">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export const adminInputClass =
  'w-full px-3.5 py-2.5 bg-inset text-neutral-900 dark:text-white border border-subtle focus:bg-card focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl outline-none text-[13px] font-medium transition-all';

export function AdminBtn({ children, onClick, variant = 'primary', disabled, type = 'button', className = '' }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const variants = {
    primary: 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90',
    secondary: 'border border-subtle text-secondary hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    ghost: 'text-secondary hover:text-neutral-900 dark:hover:text-white hover:bg-inset',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[40px] rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function AdminModal({ title, onClose, children, maxWidth = 'max-w-2xl' }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-card border border-subtle rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-neutral-900 dark:text-white tracking-tight">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-inset text-neutral-900 dark:text-white flex items-center justify-center hover:opacity-80 transition-opacity shrink-0" aria-label="Close">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AdminSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="py-12 flex flex-col items-center gap-3">
      <Loader2 size={22} className="text-faint animate-spin" />
      <span className="text-xs text-secondary font-normal">{label}</span>
    </div>
  );
}

export function AdminEmpty({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="bg-card border border-dashed border-neutral-300 dark:border-neutral-700 rounded-3xl p-12 text-center">
      <h3 className="text-base font-extrabold text-neutral-900 dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-secondary font-normal max-w-sm mx-auto leading-relaxed">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
