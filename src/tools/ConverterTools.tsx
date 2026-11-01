import { Fragment, useEffect, useMemo, useState } from 'react';
import { 
  Field, inputClass, textareaClass, primaryButtonClass, CopyButton, ClearButton, OutputArea, SegmentedControl 
} from './ui';

/* ---------- JSON Formatter ---------- */
export function JsonFormatter() {
  const [input, setInput] = useState('');
  const [indent, setIndent] = useState<'2' | '4'>('2');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<{ message: string; position: { line: number; column: number } } | null>(null);

  const process = (mode: 'beautify' | 'minify' | 'validate') => {
    setError(null);
    setOutput('');
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      if (mode === 'validate') { setOutput('✓ Valid JSON'); return; }
      setOutput(mode === 'beautify' ? JSON.stringify(parsed, null, indent === '2' ? 2 : 4) : JSON.stringify(parsed));
    } catch (e: any) {
      const message: string = e?.message || 'Invalid JSON';
      const posMatch = message.match(/position (\d+)/);
      if (posMatch) {
        const pos = Number(posMatch[1]);
        const upto = input.slice(0, pos);
        const line = upto.split('\n').length;
        const column = pos - upto.lastIndexOf('\n');
        setError({ message, position: { line, column } });
      } else {
        setError({ message, position: { line: 0, column: 0 } });
      }
    }
  };

  return (
    <div className="space-y-5">
      <Field label="JSON input">
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder='{"example": "Paste your JSON here"}' className={textareaClass} rows={7} spellCheck={false} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => process('beautify')} disabled={!input} className={primaryButtonClass}>Beautify</button>
        <button onClick={() => process('minify')} disabled={!input} className={primaryButtonClass}>Minify</button>
        <button onClick={() => process('validate')} disabled={!input} className={primaryButtonClass}>Validate</button>
        {output === '✓ Valid JSON' || (!error && input) ? (
          <div className="flex items-center gap-2">
            <SegmentedControl
              options={[{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }]}
              value={indent}
              onChange={setIndent}
              size="sm"
            />
            <ClearButton onClick={() => { setInput(''); setOutput(''); setError(null); }} />
          </div>
        ) : (
          <ClearButton onClick={() => { setInput(''); setOutput(''); setError(null); }} />
        )}
      </div>
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm">
          <p className="font-bold text-red-700 dark:text-red-400 text-xs uppercase tracking-wider mb-1">Invalid JSON</p>
          <p className="text-red-600 dark:text-red-300 font-medium">{error.message}</p>
          {error.position.line > 0 && (
            <p className="text-red-500/80 dark:text-red-400/70 text-xs mt-1 font-mono">Line {error.position.line}, Column {error.position.column}</p>
          )}
        </div>
      )}
      {output && (
        <div className="space-y-3">
          <OutputArea value={output} />
          {output !== '✓ Valid JSON' && <CopyButton text={output} />}
        </div>
      )}
    </div>
  );
}

/* ---------- CSV ⇄ JSON ---------- */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); if (row.length > 1 || row[0] !== '') rows.push(row); }
  return rows;
}

const csvEscape = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function CsvJsonConverter() {
  const [direction, setDirection] = useState<'csv2json' | 'json2csv'>('csv2json');
  const [delimiter, setDelimiter] = useState(',');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const convert = () => {
    setError(''); setOutput('');
    if (!input.trim()) return;
    try {
      if (direction === 'csv2json') {
        const rows = parseCsv(input, delimiter);
        if (rows.length < 1) { setError('No data found.'); return; }
        const [header, ...dataRows] = rows;
        const result = dataRows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
        setOutput(JSON.stringify(result, null, 2));
      } else {
        const parsed = JSON.parse(input);
        if (!Array.isArray(parsed) || parsed.length === 0) { setError('Expected a non-empty JSON array of objects.'); return; }
        const flat = parsed.filter(item => typeof item === 'object' && item !== null && !Array.isArray(item));
        if (flat.length === 0) { setError('No flat objects found in the array (nested objects/arrays are skipped).'); return; }
        const header = [...new Set(flat.flatMap(obj => Object.keys(obj)))];
        const lines = [header.map(csvEscape).join(delimiter)];
        for (const obj of flat) lines.push(header.map(h => csvEscape((obj as any)[h])).join(delimiter));
        setOutput(lines.join('\n'));
      }
    } catch (e: any) {
      setError(e?.message || 'Conversion failed.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <SegmentedControl
          options={[{ value: 'csv2json', label: 'CSV → JSON' }, { value: 'json2csv', label: 'JSON → CSV' }]}
          value={direction}
          onChange={v => { setDirection(v); setOutput(''); setError(''); }}
        />
        <Field label="Delimiter">
          <select value={delimiter} onChange={e => setDelimiter(e.target.value)} className={inputClass + ' !w-36'}>
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
            <option value={'\t'}>Tab</option>
          </select>
        </Field>
      </div>
      <Field label={direction === 'csv2json' ? 'CSV input' : 'JSON input (array of objects)'}>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={direction === 'csv2json' ? 'name,role\nAda,engineer' : '[{"name": "Ada", "role": "engineer"}]'} className={textareaClass} rows={7} spellCheck={false} />
      </Field>
      <div className="flex gap-3">
        <button onClick={convert} disabled={!input} className={primaryButtonClass}>Convert</button>
        <ClearButton onClick={() => { setInput(''); setOutput(''); setError(''); }} />
      </div>
      {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm text-red-600 dark:text-red-300 font-medium">{error}</div>}
      {output && (
        <div className="space-y-3">
          <OutputArea value={output} />
          <CopyButton text={output} />
        </div>
      )}
    </div>
  );
}

/* ---------- Base64 ---------- */
export function Base64Tool() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const run = (text: string) => {
    setInput(text); setError('');
    if (!text) { setOutput(''); return; }
    try {
      if (mode === 'encode') {
        let b64 = btoa(String.fromCharCode(...new TextEncoder().encode(text)));
        if (urlSafe) b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        setOutput(b64);
      } else {
        let normalized = text.trim().replace(/-/g, '+').replace(/_/g, '/');
        while (normalized.length % 4) normalized += '=';
        const bytes = Uint8Array.from(atob(normalized), c => c.charCodeAt(0));
        setOutput(new TextDecoder().decode(bytes));
      }
    } catch {
      setOutput('');
      setError(mode === 'decode' ? 'This is not valid Base64. Check for typos or missing characters.' : 'Could not encode this input.');
    }
  };

  return (
    <div className="space-y-5">
      <SegmentedControl options={[{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]} value={mode} onChange={v => { setMode(v); run(input); }} />
      <Field label={mode === 'encode' ? 'Plain text' : 'Base64 string'}>
        <textarea value={input} onChange={e => run(e.target.value)} placeholder={mode === 'encode' ? 'Text to encode…' : 'Base64 to decode…'} className={textareaClass} rows={5} spellCheck={false} />
      </Field>
      {mode === 'encode' && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
          <input type="checkbox" checked={urlSafe} onChange={e => run(input)} className="accent-neutral-900 dark:accent-white w-4 h-4" />
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">URL-safe output (− and _ instead of + and /)</span>
        </label>
      )}
      {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm text-red-600 dark:text-red-300 font-medium">{error}</div>}
      {output && (
        <div className="space-y-3">
          <Field label={mode === 'encode' ? 'Base64 output' : 'Decoded text'}>
            <OutputArea value={output} />
          </Field>
          <CopyButton text={output} />
        </div>
      )}
    </div>
  );
}

/* ---------- URL Encoder ---------- */
export function UrlEncoder() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [scope, setScope] = useState<'component' | 'uri'>('component');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setError(''); setOutput('');
    if (!input) return;
    try {
      if (mode === 'encode') {
        setOutput(scope === 'component' ? encodeURIComponent(input) : encodeURI(input));
      } else {
        setOutput(scope === 'component' ? decodeURIComponent(input) : decodeURI(input));
      }
    } catch {
      setOutput('');
      setError('Could not decode — the input contains an invalid percent-encoding sequence.');
    }
  }, [input, mode, scope]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <SegmentedControl options={[{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]} value={mode} onChange={setMode} />
        <SegmentedControl options={[{ value: 'component', label: 'Component' }, { value: 'uri', label: 'Full URL' }]} value={scope} onChange={setScope} size="sm" />
      </div>
      <Field label="Input">
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'encode' ? 'https://example.com/search?q=hello world' : 'https://example.com/search?q=hello%20world'} className={textareaClass} rows={4} spellCheck={false} />
      </Field>
      {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm text-red-600 dark:text-red-300 font-medium">{error}</div>}
      {output && (
        <div className="space-y-3">
          <Field label="Result">
            <OutputArea value={output} />
          </Field>
          <CopyButton text={output} />
        </div>
      )}
    </div>
  );
}

/* ---------- Number Base Converter ---------- */
export function NumberBaseTool() {
  const [value, setValue] = useState('255');
  const [base, setBase] = useState(10);

  const parsed = useMemo(() => {
    const n = parseInt(value.trim(), base);
    return Number.isFinite(n) && Number.isSafeInteger(n) && /^[a-z0-9]+$/i.test(value.trim()) ? n : null;
  }, [value, base]);

  const isValidForBase = (s: string, b: number) => {
    if (!s.trim()) return false;
    const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, b);
    return s.toLowerCase().split('').every(d => digits.includes(d));
  };

  const bases: { base: number; label: string }[] = [
    { base: 2, label: 'Binary (2)' },
    { base: 8, label: 'Octal (8)' },
    { base: 10, label: 'Decimal (10)' },
    { base: 16, label: 'Hex (16)' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {bases.map(b => (
          <Fragment key={b.base}>
            <Field label={b.label}>
            <input
              value={parsed === null ? '' : parsed.toString(b.base)}
              onChange={e => { setValue(e.target.value); setBase(b.base); }}
              placeholder={isValidForBase(value, b.base) ? '' : value ? `Not a valid base-${b.base} number` : `Enter base ${b.base}`}
              className={`${inputClass} font-mono ${parsed !== null && parsed.toString(b.base) === value.toLowerCase().trim() ? 'border-neutral-900 dark:border-white' : ''}`}
              spellCheck={false}
            />
            </Field>
          </Fragment>
        ))}
      </div>
      <Field label="Custom base (2–36)">
        <div className="flex gap-3 items-center">
          <input
            type="number" min={2} max={36}
            value={base}
            onChange={e => setBase(Math.min(36, Math.max(2, Number(e.target.value) || 10)))}
            className={inputClass + ' !w-24'}
          />
          <input
            value={parsed === null ? '' : parsed.toString(base)}
            onChange={e => setValue(e.target.value)}
            placeholder={`Value in base ${base}`}
            className={inputClass + ' flex-1 font-mono'}
            spellCheck={false}
          />
        </div>
      </Field>
      {value && parsed === null && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm text-red-600 dark:text-red-300 font-medium">
          “{value}” is not a valid base-{base} number.
        </div>
      )}
      {parsed !== null && (
        <div className="bg-gray-50 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800 rounded-2xl p-4 text-sm font-medium text-gray-600 dark:text-gray-300">
          <span className="font-mono">{parsed.toLocaleString()}</span> in decimal · {value.trim().length} digit{value.trim().length === 1 ? '' : 's'} in base {base}
        </div>
      )}
    </div>
  );
}

/* ---------- Unix Timestamp Converter ---------- */
function formatDateTime(ms: number) {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return {
    utc: d.toUTCString(),
    local: d.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' }),
    iso: d.toISOString(),
  };
}

export function TimestampConverter() {
  const [tsInput, setTsInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const parsedTs = useMemo(() => {
    const n = Number(tsInput.trim());
    if (!tsInput.trim() || !Number.isFinite(n)) return null;
    const ms = Math.abs(n) < 1e12 ? n * 1000 : n; // seconds vs milliseconds heuristic
    return formatDateTime(ms);
  }, [tsInput]);

  const parsedDate = useMemo(() => {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    return { seconds: Math.floor(d.getTime() / 1000), ms: d.getTime() };
  }, [dateInput]);

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900 dark:bg-neutral-950 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Current Unix time (seconds)</div>
          <div className="text-2xl font-extrabold tabular-nums tracking-tight">{Math.floor(now / 1000)}</div>
        </div>
        <CopyButton text={String(Math.floor(now / 1000))} className="!bg-white/10 !text-white hover:!bg-white/20" />
      </div>

      <Field label="Timestamp → date" hint="seconds or milliseconds, auto-detected">
        <input value={tsInput} onChange={e => setTsInput(e.target.value)} placeholder="e.g. 1767225600" className={inputClass + ' font-mono'} spellCheck={false} />
      </Field>
      {tsInput && parsedTs && (
        <div className="grid grid-cols-1 gap-3">
          {[['UTC', parsedTs.utc], ['Local', parsedTs.local], ['ISO 8601', parsedTs.iso]].map(([label, val]) => (
            <div key={label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl px-4 py-3">
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</div>
                <div className="text-sm font-mono font-medium text-gray-900 dark:text-white break-all">{val}</div>
              </div>
              <CopyButton text={val} className="shrink-0" />
            </div>
          ))}
        </div>
      )}
      {tsInput && !parsedTs && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm text-red-600 dark:text-red-300 font-medium">Not a valid timestamp.</div>
      )}

      <Field label="Date → timestamp">
        <input type="datetime-local" value={dateInput} onChange={e => setDateInput(e.target.value)} className={inputClass} />
      </Field>
      {parsedDate && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[['Seconds', String(parsedDate.seconds)], ['Milliseconds', String(parsedDate.ms)]].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between gap-2 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl px-4 py-3">
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</div>
                <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">{val}</div>
              </div>
              <CopyButton text={val} className="shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
