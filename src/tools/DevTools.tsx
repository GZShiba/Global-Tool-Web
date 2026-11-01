import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Field, inputClass, textareaClass, CopyButton, SegmentedControl, Toggle } from './ui';

/* ---------- Regex Tester ---------- */
interface MatchInfo { text: string; index: number; groups: string[]; }

export function RegexTester() {
  const [pattern, setPattern] = useState('\\b\\w+@\\w+\\.\\w+\\b');
  const [flags, setFlags] = useState('gi');
  const [text, setText] = useState('Contact ada@example.com or grace@example.org for details.\nInvalid: foo@bar');
  const [error, setError] = useState('');

  const { matches, highlighted } = useMemo(() => {
    setError('');
    if (!pattern || !text) return { matches: [] as MatchInfo[], highlighted: [text] };
    try {
      const regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
      const found: MatchInfo[] = [];
      let m: RegExpExecArray | null;
      let safety = 0;
      while ((m = regex.exec(text)) !== null && safety < 1000) {
        found.push({ text: m[0], index: m.index, groups: m.slice(1).map(g => g ?? '') });
        if (m[0] === '') regex.lastIndex++;
        safety++;
      }
      // Build highlighted parts
      const parts: (string | { match: string })[] = [];
      let cursor = 0;
      for (const match of found) {
        if (match.index > cursor) parts.push(text.slice(cursor, match.index));
        parts.push({ match: text.slice(match.index, match.index + match.text.length) });
        cursor = match.index + match.text.length;
      }
      if (cursor < text.length) parts.push(text.slice(cursor));
      return { matches: found, highlighted: parts };
    } catch (e: any) {
      setError(e?.message || 'Invalid pattern');
      return { matches: [] as MatchInfo[], highlighted: [text] };
    }
  }, [pattern, flags, text]);

  const toggleFlag = (f: string) => setFlags(prev => (prev.includes(f) ? prev.replace(f, '') : prev + f));

  return (
    <div className="space-y-5">
      <div className="flex items-stretch bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl overflow-hidden focus-within:border-neutral-900 dark:focus-within:border-white transition-all">
        <span className="flex items-center pl-4 text-gray-400 font-mono text-sm">/</span>
        <input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="regular expression" spellCheck={false} className="flex-1 px-1 py-3 bg-transparent outline-none text-sm font-mono text-gray-900 dark:text-white" />
        <span className="flex items-center text-gray-400 font-mono text-sm">/</span>
        <input value={flags} onChange={e => setFlags(e.target.value.replace(/[^gimsuy]/g, ''))} spellCheck={false} aria-label="Regex flags" className="w-16 px-2 py-3 bg-transparent outline-none text-sm font-mono text-gray-900 dark:text-white border-l border-gray-100 dark:border-neutral-800" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[['g', 'global'], ['i', 'ignore case'], ['m', 'multiline'], ['s', 'dotall'], ['u', 'unicode']].map(([f, label]) => (
          <button
            key={f}
            onClick={() => toggleFlag(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              flags.includes(f) ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white' : 'border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-gray-400'
            }`}
            title={label}
          >
            {f}
          </button>
        ))}
      </div>
      {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm text-red-600 dark:text-red-300 font-medium font-mono">{error}</div>}
      <Field label="Test text" hint={`${matches.length} match${matches.length === 1 ? '' : 'es'}`}>
        <textarea value={text} onChange={e => setText(e.target.value)} className={textareaClass} rows={5} spellCheck={false} />
      </Field>
      {matches.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Highlighted</div>
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl p-4 text-sm font-mono leading-loose whitespace-pre-wrap break-words text-gray-600 dark:text-gray-300 max-h-64 overflow-y-auto">
            {highlighted.map((part, i) =>
              typeof part === 'string' ? (
                <span key={i}>{part}</span>
              ) : (
                <mark key={i} className="bg-amber-200 dark:bg-amber-500/40 text-neutral-900 dark:text-white rounded px-0.5">{part.match}</mark>
              )
            )}
          </div>
          <div className="mt-4 space-y-2">
            {matches.map((m, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-xs font-mono bg-gray-50 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800 rounded-lg px-3 py-2">
                <span className="text-gray-400 font-bold">#{i + 1}</span>
                <span className="text-gray-900 dark:text-white font-bold">{m.text}</span>
                <span className="text-gray-400">at index {m.index}</span>
                {m.groups.map((g, gi) => g !== '' && (
                  <span key={gi} className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">${gi + 1}: {g}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Color Converter ---------- */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslToRgb(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

export function ColorConverter() {
  const [hex, setHex] = useState('#3B82F6');
  const rgb = hexToRgb(hex) ?? { r: 59, g: 130, b: 246 };
  const isValid = hexToRgb(hex) !== null;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const cssValue = (r: number, g: number, b: number) => ({
    hex: toHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
  });
  const values = cssValue(rgb.r, rgb.g, rgb.b);

  const rows = [
    { label: 'HEX', value: values.hex },
    { label: 'RGB', value: values.rgb },
    { label: 'HSL', value: values.hsl },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="w-full sm:w-28 h-28 rounded-2xl border border-gray-200 dark:border-neutral-700 shadow-inner shrink-0" style={{ backgroundColor: isValid ? hex : '#e5e5e5' }} title={isValid ? hex : 'Invalid color'} />
        <div className="flex-1 space-y-4">
          <Field label="Pick a color">
            <input type="color" value={isValid ? hex : '#3B82F6'} onChange={e => setHex(e.target.value)} className="w-full h-12 rounded-xl cursor-pointer bg-transparent border border-gray-200 dark:border-neutral-700" />
          </Field>
          <Field label="Or type a HEX value">
            <input value={hex} onChange={e => setHex(e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value)} placeholder="#3B82F6" className={inputClass + ' font-mono'} spellCheck={false} />
          </Field>
        </div>
      </div>
      {!isValid && <p className="text-xs text-red-500 font-medium">Showing the last valid color until the HEX value is correct.</p>}
      <div className="space-y-2.5">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between gap-3 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl px-4 py-3">
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{row.label}</div>
              <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">{row.value}</div>
            </div>
            <CopyButton text={row.value} className="shrink-0" />
          </div>
        ))}
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">CSS declaration</div>
        <div className="flex items-center justify-between gap-3 bg-neutral-900 dark:bg-neutral-950 text-white rounded-xl px-4 py-3">
          <code className="text-xs font-mono break-all">color: {values.hex};</code>
          <CopyButton text={`color: ${values.hex};`} className="shrink-0 !bg-white/10 !text-white hover:!bg-white/20" />
        </div>
      </div>
    </div>
  );
}

/* ---------- HTML Entities ---------- */
const BASIC_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0', copy: '©', reg: '®', trade: '™',
  hellip: '…', mdash: '—', ndash: '–', lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D',
  laquo: '«', raquo: '»', deg: '°', plusmn: '±', times: '×', divide: '÷', euro: '€', pound: '£', yen: '¥', cent: '¢', sect: '§', para: '¶', bull: '•', middot: '·',
};

export function HtmlEntitiesTool() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [fullMode, setFullMode] = useState(false);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setError(''); setOutput('');
    if (!input) return;
    if (mode === 'encode') {
      if (fullMode) {
        setOutput([...input].map(ch => (BASIC_MAP[ch] ?? (ch.charCodeAt(0) > 127 ? `&#${ch.charCodeAt(0)};` : ch))).join(''));
      } else {
        setOutput(input.replace(/[&<>"']/g, ch => BASIC_MAP[ch]));
      }
    } else {
      try {
        const decoded = input.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (ent, body: string) => {
          if (body.startsWith('#')) {
            const num = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
            return Number.isFinite(num) && num >= 0 && num <= 0x10ffff ? String.fromCodePoint(num) : ent;
          }
          return NAMED_ENTITIES[body] ?? ent;
        });
        setOutput(decoded);
        if (decoded.includes('&') && /&[a-zA-Z]+;/.test(decoded)) setError('Some entities were not recognized and left unchanged.');
      } catch {
        setError('Could not decode this input.');
      }
    }
  }, [input, mode, fullMode]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <SegmentedControl options={[{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]} value={mode} onChange={setMode} />
        {mode === 'encode' && <Toggle label="Encode all non-ASCII characters" checked={fullMode} onChange={setFullMode} />}
      </div>
      <Field label={mode === 'encode' ? 'Plain text / HTML' : 'Encoded text'}>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'encode' ? '<div class="greeting">Hello & welcome!</div>' : '&lt;div&gt;Hello &amp; welcome!&lt;/div&gt;'} className={textareaClass} rows={6} spellCheck={false} />
      </Field>
      {error && <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 font-medium">{error}</div>}
      {output && (
        <div className="space-y-3">
          <Field label={mode === 'encode' ? 'Encoded output' : 'Decoded text'}>
            <div className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 text-sm font-mono leading-relaxed break-all whitespace-pre-wrap text-gray-900 dark:text-white max-h-72 overflow-y-auto">{output}</div>
          </Field>
          <CopyButton text={output} />
        </div>
      )}
    </div>
  );
}
