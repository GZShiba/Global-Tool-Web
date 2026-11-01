import { useRef, useState } from 'react';
import { Download, UploadCloud } from 'lucide-react';
import { Field, inputClass, primaryButtonClass, SegmentedControl, Toggle } from './ui';

/* ---------- Image Resizer & Converter ---------- */
const INPUT_TYPES = 'image/png,image/jpeg,image/webp,image/gif';

export function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [originalSize, setOriginalSize] = useState<{ w: number; h: number } | null>(null);
  const [mode, setMode] = useState<'dimensions' | 'percent'>('percent');
  const [width, setWidth] = useState('800');
  const [scale, setScale] = useState('50');
  const [keepRatio, setKeepRatio] = useState(true);
  const [height, setHeight] = useState('600');
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('webp');
  const [quality, setQuality] = useState(85);
  const [resultSize, setResultSize] = useState<{ bytes: number; w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const targetDims = () => {
    if (!originalSize) return null;
    if (mode === 'percent') {
      const s = Math.min(400, Math.max(1, parseFloat(scale) || 100)) / 100;
      return { w: Math.max(1, Math.round(originalSize.w * s)), h: Math.max(1, Math.round(originalSize.h * s)) };
    }
    const w = Math.max(1, Math.round(parseFloat(width) || 1));
    const h = keepRatio ? Math.max(1, Math.round((w / originalSize.w) * originalSize.h)) : Math.max(1, Math.round(parseFloat(height) || 1));
    return { w, h };
  };

  const onFile = (f: File | null) => {
    setFile(f); setPreviewUrl(''); setResultSize(null);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (!f) { setOriginalUrl(''); setOriginalSize(null); return; }
    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
    const img = new Image();
    img.onload = () => setOriginalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  };

  const process = async () => {
    if (!file || !originalSize) return;
    const dims = targetDims();
    if (!dims) return;
    setBusy(true);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not read this image.'));
        img.src = originalUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = dims.w;
      canvas.height = dims.h;
      const ctx = canvas.getContext('2d')!;
      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const mime = `image/${format}`;
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Encoding failed.'))), mime, format === 'png' ? undefined : quality / 100)
      );
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setResultSize({ bytes: blob.size, w: dims.w, h: dims.h });
    } catch {
      alert('Could not process this image. Try a different file.');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!previewUrl || !file) return;
    const ext = format === 'jpeg' ? 'jpg' : format;
    const base = file.name.replace(/\.[^.]+$/, '');
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `${base}-${resultSize?.w}x${resultSize?.h}.${ext}`;
    a.click();
  };

  const fmtBytes = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(2)} MB` : `${(b / 1024).toFixed(1)} KB`);

  return (
    <div className="space-y-5">
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-gray-200 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white rounded-3xl p-8 text-center transition-all group"
      >
        <UploadCloud size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
        <p className="text-sm font-bold text-gray-900 dark:text-white">{file ? file.name : 'Click to select an image'}</p>
        <p className="text-xs text-gray-400 font-medium mt-1">PNG, JPEG, WebP, or GIF (first frame) · processed locally</p>
        <input ref={inputRef} type="file" accept={INPUT_TYPES} className="hidden" onChange={e => onFile(e.target.files?.[0] ?? null)} />
      </button>

      {originalSize && (
        <>
          <p className="text-xs text-gray-400 font-medium">Original: {originalSize.w} × {originalSize.h} px · {file ? fmtBytes(file.size) : ''}</p>
          <SegmentedControl options={[{ value: 'percent', label: 'Scale by %' }, { value: 'dimensions', label: 'Exact dimensions' }]} value={mode} onChange={setMode} />
          {mode === 'percent' ? (
            <Field label={`Scale: ${scale}%`}>
              <input type="range" min={1} max={200} value={scale} onChange={e => setScale(e.target.value)} className="w-full accent-neutral-900 dark:accent-white" />
            </Field>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Width (px)">
                <input type="number" min={1} value={width} onChange={e => setWidth(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Height (px)">
                <input type="number" min={1} value={height} onChange={e => setHeight(e.target.value)} disabled={keepRatio} className={inputClass + ' disabled:opacity-50'} />
              </Field>
              <div className="sm:col-span-2"><Toggle label="Keep aspect ratio" checked={keepRatio} onChange={setKeepRatio} /></div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <Field label="Output format">
              <select value={format} onChange={e => setFormat(e.target.value as any)} className={inputClass}>
                <option value="webp">WebP (smaller files)</option>
                <option value="jpeg">JPEG (no transparency)</option>
                <option value="png">PNG (lossless)</option>
              </select>
            </Field>
            {format !== 'png' && (
              <Field label={`Quality: ${quality}%`}>
                <input type="range" min={10} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full accent-neutral-900 dark:accent-white" />
              </Field>
            )}
          </div>
          <button onClick={process} disabled={busy} className={primaryButtonClass}>
            {busy ? 'Processing…' : 'Resize Image'}
          </button>
          {resultSize && previewUrl && (
            <div className="space-y-4">
              <img src={previewUrl} alt="Resized preview" className="max-h-72 rounded-2xl border border-gray-100 dark:border-neutral-800 w-auto mx-auto" />
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800 rounded-2xl px-4 py-3">
                <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  {resultSize.w} × {resultSize.h} px · {fmtBytes(resultSize.bytes)}
                  {file && <span className="text-gray-400 font-medium"> (was {fmtBytes(file.size)})</span>}
                </div>
                <button onClick={download} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all active:scale-95">
                  <Download size={13} /> Download
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Image to Base64 ---------- */
export function ImageToBase64() {
  const [file, setFile] = useState<File | null>(null);
  const [dataUri, setDataUri] = useState('');
  const [error, setError] = useState('');
  const [outputFormat, setOutputFormat] = useState<'uri' | 'css' | 'html'>('uri');
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | null) => {
    setFile(f); setDataUri(''); setError('');
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    const reader = new FileReader();
    reader.onload = () => setDataUri(String(reader.result));
    reader.onerror = () => setError('Could not read this file.');
    reader.readAsDataURL(f);
  };

  const outputs = dataUri ? {
    uri: dataUri,
    css: `background-image: url("${dataUri}");`,
    html: `<img src="${dataUri}" alt="">`,
  } : null;

  const encodedBytes = dataUri ? dataUri.length - dataUri.indexOf(',') - 1 : 0;
  const fmtBytes = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(2)} MB` : `${(b / 1024).toFixed(1)} KB`);

  return (
    <div className="space-y-5">
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-gray-200 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white rounded-3xl p-8 text-center transition-all group"
      >
        <UploadCloud size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
        <p className="text-sm font-bold text-gray-900 dark:text-white">{file ? file.name : 'Click to select an image'}</p>
        <p className="text-xs text-gray-400 font-medium mt-1">Read locally — never uploaded</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0] ?? null)} />
      </button>
      {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm text-red-600 dark:text-red-300 font-medium">{error}</div>}
      {file && dataUri && outputs && (
        <>
          <div className="flex items-center gap-4">
            <img src={dataUri} alt="Selected" className="w-16 h-16 object-cover rounded-xl border border-gray-100 dark:border-neutral-800" />
            <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
              <div>{fmtBytes(file.size)} original</div>
              <div className="text-gray-400 font-medium">{fmtBytes(encodedBytes)} encoded (+~33%)</div>
            </div>
          </div>
          <SegmentedControl
            options={[{ value: 'uri', label: 'Data URI' }, { value: 'css', label: 'CSS' }, { value: 'html', label: 'HTML' }]}
            value={outputFormat}
            onChange={setOutputFormat}
          />
          <div className="w-full bg-neutral-900 dark:bg-neutral-950 text-emerald-300 rounded-xl px-4 py-3 text-xs font-mono break-all whitespace-pre-wrap max-h-56 overflow-y-auto">{outputs[outputFormat]}</div>
          <div className="flex gap-2">
            <button
              onClick={async () => { await navigator.clipboard.writeText(outputs[outputFormat]); }}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase tracking-wider hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all active:scale-95"
            >
              Copy {outputFormat === 'uri' ? 'Data URI' : outputFormat === 'css' ? 'CSS' : 'HTML'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
