import { useMemo, useState } from 'react';
import { Field, inputClass, StatBox, SegmentedControl } from './ui';

/* ---------- Percentage Calculator ---------- */
type PctMode = 'of' | 'isWhatPercent' | 'change' | 'addSub';

export function PercentageCalculator() {
  const [mode, setMode] = useState<PctMode>('of');
  const [a, setA] = useState('25');
  const [b, setB] = useState('200');

  const na = parseFloat(a), nb = parseFloat(b);
  const valid = Number.isFinite(na) && Number.isFinite(nb);

  const result = useMemo(() => {
    if (!valid) return null;
    switch (mode) {
      case 'of': return { value: (na / 100) * nb, label: `${na}% of ${nb}` };
      case 'isWhatPercent': return nb === 0 ? null : { value: (na / nb) * 100, label: `${na} is what % of ${nb}` };
      case 'change': return na === 0 ? null : { value: ((nb - na) / Math.abs(na)) * 100, label: `Change from ${na} → ${nb}` };
      case 'addSub': return { value: nb + (nb * na) / 100, label: `${nb} ± ${na}%` };
    }
  }, [mode, na, nb, valid]);

  const fmt = (v: number) => (Number.isFinite(v) ? Number(v.toFixed(4)).toLocaleString() : '—');

  return (
    <div className="space-y-5">
      <SegmentedControl
        options={[
          { value: 'of', label: 'X% of Y' },
          { value: 'isWhatPercent', label: 'X is what % of Y' },
          { value: 'change', label: '% change' },
          { value: 'addSub', label: 'Add / subtract %' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={mode === 'change' ? 'From (original)' : mode === 'addSub' ? 'Percentage (%)' : 'Value X'}>
          <input type="number" value={a} onChange={e => setA(e.target.value)} className={inputClass} placeholder="Enter first value" />
        </Field>
        <Field label={mode === 'change' ? 'To (new)' : mode === 'addSub' ? 'Base value' : 'Value Y'}>
          <input type="number" value={b} onChange={e => setB(e.target.value)} className={inputClass} placeholder="Enter second value" />
        </Field>
      </div>
      {mode === 'addSub' && (
        <p className="text-xs text-gray-400 font-medium">Tip: enter a negative percentage to subtract (e.g. −20).</p>
      )}
      {result ? (
        <div className="bg-neutral-900 dark:bg-neutral-950 text-white rounded-2xl p-6 text-center">
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">{result.label}</div>
          <div className="text-4xl font-extrabold tracking-tight tabular-nums">
            {mode === 'isWhatPercent' || mode === 'change' ? fmt(result.value) + '%' : fmt(result.value)}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-neutral-900/60 border border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl p-6 text-center text-sm text-gray-400 font-medium">
          Enter valid numbers to see the result.
        </div>
      )}
      {valid && mode === 'change' && (
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Direction" value={(nb - na) >= 0 ? 'Increase' : 'Decrease'} />
          <StatBox label="Absolute difference" value={fmt(Math.abs(nb - na))} />
        </div>
      )}
    </div>
  );
}

/* ---------- Unit Converter ---------- */
type Family = 'length' | 'weight' | 'temperature' | 'data';

const UNITS: Record<Family, { value: string; label: string }[]> = {
  length: [
    { value: 'mm', label: 'Millimeters' }, { value: 'cm', label: 'Centimeters' }, { value: 'm', label: 'Meters' },
    { value: 'km', label: 'Kilometers' }, { value: 'in', label: 'Inches' }, { value: 'ft', label: 'Feet' },
    { value: 'mi', label: 'Miles' },
  ],
  weight: [
    { value: 'mg', label: 'Milligrams' }, { value: 'g', label: 'Grams' }, { value: 'kg', label: 'Kilograms' },
    { value: 't', label: 'Tonnes' }, { value: 'oz', label: 'Ounces' }, { value: 'lb', label: 'Pounds' },
  ],
  temperature: [
    { value: 'c', label: 'Celsius (°C)' }, { value: 'f', label: 'Fahrenheit (°F)' }, { value: 'k', label: 'Kelvin (K)' },
  ],
  data: [
    { value: 'b', label: 'Bytes' }, { value: 'kb', label: 'Kilobytes' }, { value: 'mb', label: 'Megabytes' },
    { value: 'gb', label: 'Gigabytes' }, { value: 'tb', label: 'Terabytes' },
  ],
};

const FACTORS: Record<Family, Record<string, number>> = {
  length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.344 },
  weight: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237 },
  data: { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 },
  temperature: {},
};

function tempConvert(v: number, from: string, to: string): number {
  let c: number;
  if (from === 'c') c = v;
  else if (from === 'f') c = ((v - 32) * 5) / 9;
  else c = v - 273.15;
  if (to === 'c') return c;
  if (to === 'f') return (c * 9) / 5 + 32;
  return c + 273.15;
}

export function UnitConverter() {
  const [family, setFamily] = useState<Family>('length');
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('ft');
  const [amount, setAmount] = useState('100');

  const changeFamily = (f: Family) => {
    setFamily(f);
    setFrom(UNITS[f][0].value);
    setTo(UNITS[f][Math.min(2, UNITS[f].length - 1)].value);
  };

  const n = parseFloat(amount);
  let result: number | null = null;
  if (Number.isFinite(n)) {
    if (family === 'temperature') result = tempConvert(n, from, to);
    else result = (n * FACTORS[family][from]) / FACTORS[family][to];
  }

  const fmtNum = (v: number) => {
    if (Math.abs(v) >= 1e9 || (Math.abs(v) < 1e-6 && v !== 0)) return v.toExponential(4);
    return Number(v.toPrecision(10)).toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  return (
    <div className="space-y-5">
      <SegmentedControl
        options={[
          { value: 'length', label: 'Length' }, { value: 'weight', label: 'Weight' },
          { value: 'temperature', label: 'Temperature' }, { value: 'data', label: 'Data' },
        ]}
        value={family}
        onChange={changeFamily}
      />
      <Field label="Value">
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} placeholder="Enter a value" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
        <Field label="From">
          <select value={from} onChange={e => setFrom(e.target.value)} className={inputClass}>
            {UNITS[family].map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </Field>
        <button
          onClick={() => { setFrom(to); setTo(from); }}
          className="hidden sm:flex h-[46px] w-[46px] items-center justify-center rounded-xl border-2 border-gray-200 dark:border-neutral-700 text-gray-500 hover:border-neutral-900 dark:hover:border-white hover:text-neutral-900 dark:hover:text-white transition-all active:scale-95"
          aria-label="Swap units"
          title="Swap units"
        >
          ⇄
        </button>
        <Field label="To">
          <select value={to} onChange={e => setTo(e.target.value)} className={inputClass}>
            {UNITS[family].map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </Field>
      </div>
      {result !== null ? (
        <div className="bg-neutral-900 dark:bg-neutral-950 text-white rounded-2xl p-6 text-center">
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Result</div>
          <div className="text-4xl font-extrabold tracking-tight tabular-nums break-all">{fmtNum(result)}</div>
          <div className="text-xs text-gray-400 font-medium mt-2">
            {Number.isFinite(n) ? fmtNum(n) : ''} {UNITS[family].find(u => u.value === from)?.label} → {UNITS[family].find(u => u.value === to)?.label}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-neutral-900/60 border border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl p-6 text-center text-sm text-gray-400 font-medium">
          Enter a value to convert.
        </div>
      )}
    </div>
  );
}

/* ---------- BMI Calculator ---------- */
export function BmiCalculator() {
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [cm, setCm] = useState('175');
  const [kg, setKg] = useState('70');
  const [ft, setFt] = useState('5');
  const [inch, setInch] = useState('9');
  const [lb, setLb] = useState('154');

  const bmi = useMemo(() => {
    if (unit === 'metric') {
      const h = parseFloat(cm) / 100, w = parseFloat(kg);
      if (!(h > 0) || !(w > 0)) return null;
      return w / (h * h);
    }
    const hIn = parseFloat(ft) * 12 + parseFloat(inch || '0');
    const w = parseFloat(lb);
    if (!(hIn > 0) || !(w > 0)) return null;
    return (703 * w) / (hIn * hIn);
  }, [unit, cm, kg, ft, inch, lb]);

  const WHO = [
    { max: 18.5, label: 'Underweight', color: 'bg-sky-400' },
    { max: 25, label: 'Healthy', color: 'bg-emerald-500' },
    { max: 30, label: 'Overweight', color: 'bg-amber-400' },
    { max: Infinity, label: 'Obese', color: 'bg-red-500' },
  ];
  const cat = bmi === null ? null : WHO.find(w => bmi < w.max)!;

  const healthyRange = useMemo(() => {
    if (bmi === null) return null;
    if (unit === 'metric') {
      const h = parseFloat(cm) / 100;
      if (!(h > 0)) return null;
      return { lo: 18.5 * h * h, hi: 24.9 * h * h, unit: 'kg' };
    }
    const hIn = parseFloat(ft) * 12 + parseFloat(inch || '0');
    if (!(hIn > 0)) return null;
    return { lo: (18.5 * hIn * hIn) / 703, hi: (24.9 * hIn * hIn) / 703, unit: 'lb' };
  }, [bmi, unit, cm, ft, inch]);

  return (
    <div className="space-y-5">
      <SegmentedControl options={[{ value: 'metric', label: 'Metric (cm / kg)' }, { value: 'imperial', label: 'Imperial (ft / lb)' }]} value={unit} onChange={setUnit} />
      {unit === 'metric' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Height (cm)">
            <input type="number" value={cm} onChange={e => setCm(e.target.value)} className={inputClass} placeholder="175" />
          </Field>
          <Field label="Weight (kg)">
            <input type="number" value={kg} onChange={e => setKg(e.target.value)} className={inputClass} placeholder="70" />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Height (ft)">
            <input type="number" value={ft} onChange={e => setFt(e.target.value)} className={inputClass} placeholder="5" />
          </Field>
          <Field label="Height (in)">
            <input type="number" value={inch} onChange={e => setInch(e.target.value)} className={inputClass} placeholder="9" />
          </Field>
          <Field label="Weight (lb)">
            <input type="number" value={lb} onChange={e => setLb(e.target.value)} className={inputClass} placeholder="154" />
          </Field>
        </div>
      )}
      {bmi !== null && cat ? (
        <div className="space-y-4">
          <div className="bg-neutral-900 dark:bg-neutral-950 text-white rounded-2xl p-6 text-center">
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Your BMI</div>
            <div className="text-4xl font-extrabold tracking-tight tabular-nums">{bmi.toFixed(1)}</div>
            <div className="text-xs font-bold uppercase tracking-widest mt-2 text-gray-300">{cat.label}</div>
          </div>
          <div>
            <div className="flex h-3 rounded-full overflow-hidden">
              {WHO.map(w => <div key={w.label} className={w.color} style={{ flex: w.max === Infinity ? 2 : w.max - (WHO[WHO.indexOf(w) - 1]?.max ?? 0) }} />)}
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-bold uppercase tracking-wider text-gray-400">
              {WHO.map(w => <span key={w.label}>{w.label}</span>)}
            </div>
          </div>
          {healthyRange && (
            <div className="grid grid-cols-2 gap-3">
              <StatBox label={`Healthy range low (${healthyRange.unit})`} value={healthyRange.lo.toFixed(1)} />
              <StatBox label={`Healthy range high (${healthyRange.unit})`} value={healthyRange.hi.toFixed(1)} />
            </div>
          )}
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            BMI is a general screening measure for adults. It does not account for muscle mass, age, or body composition, and is not a substitute for professional medical advice.
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-neutral-900/60 border border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl p-6 text-center text-sm text-gray-400 font-medium">
          Enter your height and weight to calculate BMI.
        </div>
      )}
    </div>
  );
}
