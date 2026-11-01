import { useState } from 'react';
import { RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  Field, inputClass, primaryButtonClass, CopyButton, Toggle, StatBox, inputClass as inputCls,
} from './ui';

/* ---------- UUID Generator ---------- */
export function UuidGenerator() {
  const [count, setCount] = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [noHyphens, setNoHyphens] = useState(false);
  const [uuids, setUuids] = useState<string[]>([]);

  const generate = () => {
    const list: string[] = [];
    for (let i = 0; i < Math.min(100, Math.max(1, count)); i++) {
      let id: string = crypto.randomUUID();
      if (noHyphens) id = id.replace(/-/g, '');
      if (uppercase) id = id.toUpperCase();
      list.push(id);
    }
    setUuids(list);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <Field label="How many (1–100)">
          <input type="number" min={1} max={100} value={count} onChange={e => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} className={inputClass} />
        </Field>
        <div className="flex flex-col gap-2 pb-1">
          <Toggle label="Uppercase" checked={uppercase} onChange={setUppercase} />
          <Toggle label="Remove hyphens" checked={noHyphens} onChange={setNoHyphens} />
        </div>
        <button onClick={generate} className={primaryButtonClass + ' h-[46px]'}>
          <RefreshCw size={14} /> Generate
        </button>
      </div>
      {uuids.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{uuids.length} UUID{uuids.length === 1 ? '' : 's'}</span>
            <CopyButton text={uuids.join('\n')} />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {uuids.map((id, i) => (
              <div key={i} className="flex items-center justify-between gap-3 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl px-4 py-2.5">
                <span className="text-sm font-mono font-medium text-gray-900 dark:text-white break-all">{id}</span>
                <CopyButton text={id} className="shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Password Generator ---------- */
const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{};:,.<>?/',
};
const AMBIGUOUS = /[l1IO0]/g;

export function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [opts, setOpts] = useState({ lower: true, upper: true, digits: true, symbols: true });
  const [avoidAmbiguous, setAvoidAmbiguous] = useState(false);
  const [password, setPassword] = useState('');

  const generate = () => {
    let pool = '';
    if (opts.lower) pool += SETS.lower;
    if (opts.upper) pool += SETS.upper;
    if (opts.digits) pool += SETS.digits;
    if (opts.symbols) pool += SETS.symbols;
    if (avoidAmbiguous) pool = pool.replace(AMBIGUOUS, '');
    if (!pool) { setPassword(''); return; }
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    setPassword(Array.from(values, v => pool[v % pool.length]).join(''));
  };

  const activeSets = Object.values(opts).filter(Boolean).length;
  const bitsPerChar = Math.log2(activeSets ? (opts.lower ? 26 : 0) + (opts.upper ? 26 : 0) + (opts.digits ? 10 : 0) + (opts.symbols ? 24 : 0) || 1 : 1);
  const entropy = Math.round(length * bitsPerChar);
  const strength = entropy >= 100 ? { label: 'Excellent', cls: 'text-emerald-600', icon: ShieldCheck } : entropy >= 60 ? { label: 'Strong', cls: 'text-emerald-600', icon: ShieldCheck } : entropy >= 40 ? { label: 'Moderate', cls: 'text-amber-600', icon: ShieldAlert } : { label: 'Weak', cls: 'text-red-500', icon: ShieldAlert };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 min-h-[58px]">
        <span className="font-mono text-sm sm:text-base font-medium text-gray-900 dark:text-white break-all">
          {password || <span className="text-gray-300 dark:text-gray-600">Click Generate to create a password</span>}
        </span>
        <div className="shrink-0"><CopyButton text={password} /></div>
      </div>
      {password && (
        <div className="flex items-center gap-2 text-xs font-bold">
          {(() => { const Icon = strength.icon; return <Icon size={14} className={strength.cls} />; })()}
          <span className={strength.cls}>{strength.label}</span>
          <span className="text-gray-400 font-medium">· ~{entropy} bits of entropy</span>
        </div>
      )}
      <Field label={`Length: ${length}`}>
        <input type="range" min={8} max={64} value={length} onChange={e => setLength(Number(e.target.value))} className="w-full accent-neutral-900 dark:accent-white" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Toggle label="Lowercase (a–z)" checked={opts.lower} onChange={v => setOpts(o => ({ ...o, lower: v }))} />
        <Toggle label="Uppercase (A–Z)" checked={opts.upper} onChange={v => setOpts(o => ({ ...o, upper: v }))} />
        <Toggle label="Digits (0–9)" checked={opts.digits} onChange={v => setOpts(o => ({ ...o, digits: v }))} />
        <Toggle label="Symbols (!@#$…)" checked={opts.symbols} onChange={v => setOpts(o => ({ ...o, symbols: v }))} />
      </div>
      <Toggle label="Exclude look-alike characters (l, 1, I, O, 0)" checked={avoidAmbiguous} onChange={setAvoidAmbiguous} />
      <button onClick={generate} className={primaryButtonClass} disabled={!activeSets}>
        <RefreshCw size={14} /> Generate Password
      </button>
      {!activeSets && <p className="text-xs text-red-500 font-medium">Select at least one character set.</p>}
    </div>
  );
}

/* ---------- Hash Generator ---------- */
const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function HashGenerator() {
  const [text, setText] = useState('');
  const [digests, setDigests] = useState<Record<string, string>>({});
  const [expected, setExpected] = useState('');
  const [uppercase, setUppercase] = useState(false);

  const compute = async (value: string) => {
    setText(value);
    if (!value) { setDigests({}); return; }
    const data = new TextEncoder().encode(value);
    const result: Record<string, string> = {};
    for (const alg of ALGORITHMS) {
      try {
        const buf = await crypto.subtle.digest(alg, data);
        result[alg] = toHex(buf);
      } catch {
        result[alg] = 'unavailable';
      }
    }
    setDigests(result);
  };

  const fmt = (hash: string) => (uppercase ? hash.toUpperCase() : hash);
  const matches = (hash: string) => expected.trim() !== '' && (hash === expected.trim().toLowerCase() || hash === expected.trim().toUpperCase());

  return (
    <div className="space-y-5">
      <Field label="Text to hash">
        <textarea value={text} onChange={e => compute(e.target.value)} placeholder="Type or paste text…" className={inputCls + ' min-h-[110px] font-mono resize-y'} spellCheck={false} />
      </Field>
      {Object.keys(digests).length > 0 && (
        <div className="space-y-3">
          {ALGORITHMS.map(alg => (
            <div key={alg} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{alg}</span>
                  {matches(digests[alg]) && <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">Match</span>}
                </div>
                <div className={`text-xs font-mono font-medium break-all ${matches(digests[alg]) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>{fmt(digests[alg])}</div>
              </div>
              <CopyButton text={fmt(digests[alg])} className="shrink-0" />
            </div>
          ))}
        </div>
      )}
      {Object.keys(digests).length > 0 && (
        <>
          <Field label="Compare with an expected digest" hint="optional">
            <input value={expected} onChange={e => setExpected(e.target.value)} placeholder="Paste a digest to compare…" className={inputCls + ' font-mono'} spellCheck={false} />
          </Field>
          <Toggle label="Uppercase output" checked={uppercase} onChange={setUppercase} />
        </>
      )}
    </div>
  );
}
