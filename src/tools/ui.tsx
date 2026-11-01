import { ReactNode, useEffect, useRef, useState } from 'react';
import { Check, Copy, Eraser, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

/* Shared building blocks for tool interfaces. All tools are fully client-side. */

export async function copyToClipboard(text: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Could not copy — select the text manually');
  }
}

export function CopyButton({ text, disabled, className = '' }: { text: string; disabled?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <button
      onClick={async () => { await copyToClipboard(text); setCopied(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1500); }}
      disabled={disabled || !text}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
        copied
          ? 'bg-emerald-600 text-white'
          : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90'
      } ${className}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function ClearButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-gray-400 hover:border-neutral-900 dark:hover:border-white hover:text-neutral-900 dark:hover:text-white transition-all active:scale-95 ${className}`}
    >
      <Eraser size={12} /> Clear
    </button>
  );
}

export function ToolPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-inset border border-subtle rounded-3xl p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal font-normal text-faint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  'w-full bg-card text-neutral-900 dark:text-white border border-subtle rounded-xl px-4 py-3 outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-all text-sm font-medium';

export const textareaClass =
  'w-full bg-card text-neutral-900 dark:text-white border border-subtle rounded-xl px-4 py-3 outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-all text-sm font-medium font-mono leading-relaxed resize-y min-h-[140px]';

export const primaryButtonClass =
  'flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed';

export const secondaryButtonClass =
  'flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-neutral-900 dark:border-white text-neutral-900 dark:text-white text-xs font-bold uppercase tracking-wider hover:bg-inset transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed';

export function StatBox({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-inset border border-subtle rounded-2xl p-4 text-center">
      <div className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight tabular-nums">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-faint mt-1">{label}</div>
      {hint && <div className="text-[9px] text-faint mt-0.5 font-normal">{hint}</div>}
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${checked ? 'bg-neutral-900 dark:bg-white' : 'bg-gray-200 dark:bg-neutral-700'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-neutral-900 shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      <span className="text-xs font-semibold text-secondary">{label}</span>
    </label>
  );
}

export function SegmentedControl<T extends string>({ options, value, onChange, size = 'md' }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 bg-inset border border-subtle p-1 rounded-xl">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg font-semibold transition-all ${size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'} ${
            value === opt.value
              ? 'bg-card text-neutral-900 dark:text-white shadow-sm'
              : 'text-secondary hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function OutputArea({ value, placeholder, mono = true }: { value: string; placeholder?: string; mono?: boolean }) {
  return (
    <div className="relative">
      <textarea
        readOnly
        value={value}
        placeholder={placeholder}
        className={`w-full min-h-[140px] bg-card text-neutral-900 dark:text-white border border-subtle rounded-xl px-4 py-3 outline-none text-sm leading-relaxed resize-y ${mono ? 'font-mono' : ''} placeholder:text-disabled`}
      />
    </div>
  );
}

export function ResetIcon() {
  return <RotateCcw size={12} />;
}
