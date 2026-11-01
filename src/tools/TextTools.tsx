import { useMemo, useState } from 'react';
import { 
  StatBox, Field, inputClass, textareaClass, primaryButtonClass, CopyButton, ClearButton, Toggle, OutputArea 
} from './ui';

/* ---------- Word Counter ---------- */
export function WordCounter() {
  const [text, setText] = useState('');

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const sentences = trimmed ? (trimmed.match(/[.!?]+(?=\s|$)/g) || []).length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(p => p.trim()).length : 0;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    const longest = trimmed ? trimmed.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '') : '—';
    return { words, sentences, paragraphs, chars, charsNoSpaces, readingTime, longest: words ? longest : '—' };
  }, [text]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatBox label="Words" value={stats.words} />
        <StatBox label="Characters" value={stats.chars} hint={`${stats.charsNoSpaces} no spaces`} />
        <StatBox label="Sentences" value={stats.sentences} />
        <StatBox label="Paragraphs" value={stats.paragraphs} />
        <StatBox label="Reading time" value={`~${stats.readingTime} min`} hint="at 200 wpm" />
        <StatBox label="Longest word" value={<span className="text-sm break-all">{stats.longest}</span>} />
      </div>
      <Field label="Your text">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Start typing or paste your text here…"
          className={textareaClass}
          rows={8}
        />
      </Field>
      <div className="flex gap-2">
        <ClearButton onClick={() => setText('')} />
      </div>
    </div>
  );
}

/* ---------- Case Converter ---------- */
export function CaseConverter() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');

  const toWords = (s: string) =>
    s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  const conversions: Record<string, (s: string) => string> = {
    'UPPER CASE': s => s.toUpperCase(),
    'lower case': s => s.toLowerCase(),
    'Title Case': s => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    'Sentence case': s => s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase()),
    'camelCase': s => toWords(s).replace(/ (\w)/g, (_, c) => c.toUpperCase()),
    'PascalCase': s => toWords(s).replace(/(^| )(\w)/g, (_, __, c) => c.toUpperCase()),
    'snake_case': s => toWords(s).replace(/\s+/g, '_'),
    'kebab-case': s => toWords(s).replace(/\s+/g, '-'),
  };

  const convert = (fn: (s: string) => string) => setResult(fn(text));

  return (
    <div className="space-y-5">
      <Field label="Input text">
        <textarea value={text} onChange={e => { setText(e.target.value); setResult(''); }} placeholder="Type or paste text to convert…" className={textareaClass} rows={5} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {Object.entries(conversions).map(([label, fn]) => (
          <button
            key={label}
            onClick={() => convert(fn)}
            disabled={!text}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-neutral-900 dark:hover:border-white hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {label}
          </button>
        ))}
      </div>
      {result && (
        <Field label="Result">
          <div className="space-y-3">
            <OutputArea value={result} mono={false} />
            <CopyButton text={result} />
          </div>
        </Field>
      )}
    </div>
  );
}

/* ---------- Lorem Ipsum Generator ---------- */
const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');

function randomSentence(min = 6, max = 14) {
  const len = Math.floor(Math.random() * (max - min + 1)) + min;
  const words = Array.from({ length: len }, () => LOREM[Math.floor(Math.random() * LOREM.length)]);
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

export function LoremIpsum() {
  const [unit, setUnit] = useState<'paragraphs' | 'sentences' | 'words'>('paragraphs');
  const [count, setCount] = useState(3);
  const [classicStart, setClassicStart] = useState(true);
  const [output, setOutput] = useState('');

  const generate = () => {
    let result = '';
    if (unit === 'words') {
      const words = Array.from({ length: count }, () => LOREM[Math.floor(Math.random() * LOREM.length)]);
      result = words.join(' ');
      if (classicStart) result = 'Lorem ipsum dolor sit amet, ' + words.join(' ');
      result = result.charAt(0).toUpperCase() + result.slice(1);
    } else if (unit === 'sentences') {
      const sentences = Array.from({ length: count }, () => randomSentence());
      result = sentences.join(' ');
      if (classicStart) result = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + result;
    } else {
      const paragraphs = Array.from({ length: count }, () =>
        Array.from({ length: Math.floor(Math.random() * 3) + 3 }, () => randomSentence()).join(' ')
      );
      if (classicStart) paragraphs[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' + paragraphs[0];
      result = paragraphs.join('\n\n');
    }
    setOutput(result);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <Field label="Generate">
          <select value={unit} onChange={e => setUnit(e.target.value as any)} className={inputClass}>
            <option value="paragraphs">Paragraphs</option>
            <option value="sentences">Sentences</option>
            <option value="words">Words</option>
          </select>
        </Field>
        <Field label={`Amount (1–50)`}>
          <input type="number" min={1} max={50} value={count} onChange={e => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} className={inputClass} />
        </Field>
        <button onClick={generate} className={primaryButtonClass + ' h-[46px]'}>Generate</button>
      </div>
      <Toggle label="Start with “Lorem ipsum dolor sit amet”" checked={classicStart} onChange={setClassicStart} />
      {output && (
        <div className="space-y-3">
          <OutputArea value={output} mono={false} />
          <CopyButton text={output} />
        </div>
      )}
    </div>
  );
}

/* ---------- Slug Generator ---------- */
const TRANSLITERATE: Record<string, string> = {
  'á':'a','à':'a','â':'a','ä':'a','ã':'a','å':'a','é':'e','è':'e','ê':'e','ë':'e','í':'i','ì':'i','î':'i','ï':'i',
  'ó':'o','ò':'o','ô':'o','ö':'o','õ':'o','ú':'u','ù':'u','û':'u','ü':'u','ñ':'n','ç':'c','ß':'ss',
  'æ':'ae','ø':'o','œ':'oe','š':'s','ž':'z','ý':'y','ÿ':'y','ť':'t','ď':'d','ľ':'l','ŕ':'r','ĺ':'l',
};

const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'is', 'are']);

export function SlugGenerator() {
  const [text, setText] = useState('');
  const [separator, setSeparator] = useState<'-' | '_'>('-');
  const [removeStopWords, setRemoveStopWords] = useState(false);

  const slug = useMemo(() => {
    const translit = text
      .toLowerCase()
      .split('')
      .map(ch => (TRANSLITERATE[ch] !== undefined ? TRANSLITERATE[ch] : ch))
      .join('');
    let words = translit.replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
    if (removeStopWords) words = words.filter(w => !STOP_WORDS.has(w));
    return words.join(separator);
  }, [text, separator, removeStopWords]);

  return (
    <div className="space-y-5">
      <Field label="Title or text">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. 10 Tips for Better Coffee!" className={inputClass} />
      </Field>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <Field label="Separator">
          <div className="flex gap-2">
            {(['-', '_'] as const).map(sep => (
              <button
                key={sep}
                onClick={() => setSeparator(sep)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  separator === sep
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                    : 'border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {sep === '-' ? 'Hyphen (-)' : 'Underscore (_)'}
              </button>
            ))}
          </div>
        </Field>
        <div className="pt-4 sm:pt-6">
          <Toggle label="Remove common stop words" checked={removeStopWords} onChange={setRemoveStopWords} />
        </div>
      </div>
      <Field label="Slug" hint="updates live">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className={`flex-1 bg-white dark:bg-neutral-900 border rounded-xl px-4 py-3 text-sm font-mono truncate transition-all ${slug ? 'border-neutral-900 dark:border-white' : 'border-gray-200 dark:border-neutral-700 text-gray-400'}`}>
            {slug || <span className="text-gray-300 dark:text-gray-600">your-slug-appears-here</span>}
          </div>
          <CopyButton text={slug} />
        </div>
      </Field>
    </div>
  );
}
