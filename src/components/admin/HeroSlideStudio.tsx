/**
 * Hero Slide Customization Studio.
 *
 * Two-pane Add/Edit surface: a REAL, live homepage preview (rendered through
 * the shared `HeroSlideStage` — the exact component the public carousel uses)
 * next to sectioned controls. Every control updates the preview instantly via
 * unsaved form state; nothing here is decorative.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Moon, Sun, RotateCcw, Sparkles, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { HeroSlide, CmsTool } from '../../lib/adminApi';
import { cmsToTool } from '../../lib/cmsCatalog';
import {
  DEFAULT_HERO_VISUAL_SETTINGS, HERO_PRESETS, resolveVisualSettings,
  type HeroVisualSettings,
} from '../../lib/heroVisual';
import { getCategoryName } from '../../data/tools';
import { Tool } from '../../types';
import HeroSlideStage from '../hero/HeroSlideStage';
import { AdminBtn, AdminField, adminInputClass } from './adminUi';

const DEFAULT_CANVAS = '#0b0b0d';

/** Minimal, preview-only stand-in for "no linked tool yet". Never persisted. */
const PREVIEW_STUB_TOOL: Tool = {
  id: 'preview-stub',
  slug: '',
  name: 'Untitled Slide',
  tagline: '',
  description: '',
  icon: <div className="w-5 h-5 rounded bg-white/80" aria-hidden="true" />,
  category: 'text',
  tags: [], features: [], useCases: [], howTo: [],
  privacy: 'No data leaves your browser.',
};

/* ------------------------------------------------------------------ */
/* Small shared control components                                     */
/* ------------------------------------------------------------------ */

function VSSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-subtle rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-inset transition-colors text-left"
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">{title}</span>
        <ChevronDown size={14} className={`text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3.5">{children}</div>}
    </div>
  );
}

function VSRange({ label, value, min, max, step = 1, onChange, defaultValue, format, hint, disabled }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  defaultValue: number;
  format?: (v: number) => string;
  hint?: string;
  disabled?: boolean;
}) {
  const display = format ? format(value) : String(value);
  const isDefault = value === defaultValue;
  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-faint">
          {label}
          {hint && <span className="ml-2 normal-case tracking-normal font-normal text-faint/80">{hint}</span>}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tabular-nums text-neutral-900 dark:text-white">{display}</span>
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            aria-label={`Reset ${label}`}
            title={`Reset ${label} to default`}
            className="w-6 h-6 rounded-md flex items-center justify-center text-faint hover:text-neutral-900 dark:hover:text-white hover:bg-inset transition-colors disabled:opacity-30"
            disabled={isDefault}
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-blue-600 cursor-pointer"
      />
    </div>
  );
}

function VSColor({ label, value, onChange, allowEmpty, emptyLabel = 'Automatic' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean; // '' = inherit the design default
  emptyLabel?: string;
}) {
  const effective = value || '#ffffff';
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-faint">{label}</label>
        <span className="text-[10px] text-faint tabular-nums">{(value || emptyLabel).toUpperCase()}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {allowEmpty && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Reset to automatic"
            aria-label={`Reset ${label} to automatic`}
            className="w-6 h-6 rounded-md flex items-center justify-center text-faint hover:text-neutral-900 dark:hover:text-white hover:bg-inset transition-colors"
          >
            <RotateCcw size={11} />
          </button>
        )}
        <label className="relative cursor-pointer" title={label}>
          <input
            type="color"
            value={effective}
            onChange={e => onChange(e.target.value)}
            aria-label={label}
            className="h-8 w-12 rounded-lg border border-subtle bg-inset cursor-pointer p-1"
          />
        </label>
      </div>
    </div>
  );
}

function VSSelect({ label, value, onChange, options, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-faint">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal font-normal text-faint/80">{hint}</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label={label} className={`${adminInputClass} cursor-pointer`}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function VSToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group">
      <span className="text-[11px] font-semibold text-neutral-900 dark:text-white">{label}</span>
      <span
        className={`relative w-10 rounded-full border transition-colors shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'bg-inset border-subtle'}`}
        style={{ height: 22 }}
        aria-hidden="true"
      >
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} aria-label={label} />
        <span
          className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[20px]' : 'translate-x-[2px]'}`}
        />
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Studio                                                              */
/* ------------------------------------------------------------------ */

export default function HeroSlideStudio({ slide: initial, tools, onClose, onSave }: {
  slide: HeroSlide;
  tools: CmsTool[];
  onClose: () => void;
  onSave: (s: HeroSlide) => void;
}) {
  const isEdit = !!initial.id || !!initial.__docId;
  const [form, setForm] = useState<HeroSlide>(() => ({ ...initial }));
  const [visual, setVisual] = useState<HeroVisualSettings>(() => resolveVisualSettings(initial));
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTool, setActiveTool] = useState(initial.toolSlug);

  const setToolSlug = (slug: string) => {
    setActiveTool(slug);
    setForm(prev => {
      const tool = tools.find(t => t.slug === slug);
      const next = { ...prev, toolSlug: slug };
      if (tool) {
        next.title = tool.name;
        next.eyebrow = `Featured · ${getCategoryName(tool.category).toUpperCase()}`;
        next.description = tool.tagline || tool.description || '';
        next.imageAlt = tool.name;
      }
      return next;
    });
  };

  const set = <K extends keyof HeroSlide>(key: K, value: HeroSlide[K]) => setForm(prev => ({ ...prev, [key]: value }));

  const applyPreset = (presetId: string) => {
    const p = HERO_PRESETS.find(x => x.id === presetId);
    if (!p) return;
    setVisual(prev => ({
      ...prev,
      image: { ...prev.image, ...p.image },
      overlay: { ...prev.overlay, ...p.overlay },
      position: { ...prev.position, ...p.position },
      preset: p.name,
    }));
    toast.success(`${p.name} preset applied — fine-tune any slider below`);
  };

  const resetAll = () => {
    setVisual({ ...DEFAULT_HERO_VISUAL_SETTINGS });
    setForm(prev => ({ ...prev, visualSettings: { ...DEFAULT_HERO_VISUAL_SETTINGS } }));
    toast.info('All visual settings reset to defaults');
  };

  // The preview uses UNSAVED form values — changing any control is instant.
  const previewSlide: HeroSlide = { ...form, visualSettings: visual };
  // The linked CMS tool is mapped through the SAME converter the public site
  // uses (cmsCatalog), so the preview tool identity matches the homepage.
  const previewTool: Tool = previewSlide.toolSlug
    ? cmsToTool(tools.find(t => t.slug === previewSlide.toolSlug) || ({
        id: previewSlide.toolSlug, slug: previewSlide.toolSlug, name: previewSlide.title || 'Untitled Slide',
        tagline: '', description: '', category: 'text', tags: [], features: [], howTo: [], details: [], privacy: '',
        status: 'published', relatedToolIds: [], createdAt: '',
      } as CmsTool))
    : PREVIEW_STUB_TOOL;
  const resolvedPreview = resolveVisualSettings(previewSlide);

  const save = () => {
    // Defensive normalization before persisting:
    //  - `active` is coerced to a real boolean and NEVER allowed to become
    //    undefined/false due to a legacy doc missing the field — an active
    //    slide stays active.
    //  - `toolSlug` falls back to the originally loaded slug if the form
    //    accidentally holds an empty value (never silently unlinks a slide).
    const active = form.active !== false;
    const toolSlug = typeof form.toolSlug === 'string' && form.toolSlug.trim()
      ? form.toolSlug.trim()
      : (initial.toolSlug || '');
    // Persist fully validated + clamped settings (same resolver both renderers use).
    const clamped = resolveVisualSettings({ ...form, toolSlug, active, visualSettings: visual });
    const payload: HeroSlide = { ...form, toolSlug, active, visualSettings: clamped };
    onSave(payload);
  };

  const themeSurface = theme === 'dark' ? '#0b0b0d' : '#e7e5e4';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl bg-card border border-subtle rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-subtle px-5 py-3.5 flex items-center justify-between gap-3 rounded-t-3xl">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-neutral-900 dark:text-white tracking-tight truncate">
              {isEdit ? 'Edit Slide — Customization Studio' : 'New Slide — Customization Studio'}
            </h2>
            <p className="text-[10px] text-faint font-normal">Live preview updates instantly — saving is not required to see changes</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AdminBtn variant="secondary" onClick={onClose}>Cancel</AdminBtn>
            <AdminBtn onClick={save}>Save & Publish</AdminBtn>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px] gap-5 p-5">
          {/* ---------------- Live preview ---------------- */}
          <div className="lg:sticky lg:top-[68px] self-start space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-faint">
                <Monitor size={13} /> Live homepage preview
              </div>
              <div className="flex items-center gap-1 bg-inset border border-subtle rounded-xl p-1">
                <button
                  onClick={() => setTheme('dark')}
                  aria-pressed={theme === 'dark'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${theme === 'dark' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-faint hover:text-neutral-900 dark:hover:text-white'}`}
                >
                  <Moon size={12} /> Dark theme
                </button>
                <button
                  onClick={() => setTheme('light')}
                  aria-pressed={theme === 'light'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${theme === 'light' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-faint hover:text-neutral-900 dark:hover:text-white'}`}
                >
                  <Sun size={12} /> Light theme
                </button>
              </div>
            </div>

            {/* Site window frame: surrounding surface changes with the site
                theme; the hero card itself is identical on the real site. */}
            <div
              className="rounded-2xl border border-subtle p-3 sm:p-4 transition-colors"
              style={{ backgroundColor: themeSurface }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-white/25" aria-hidden="true" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/25" aria-hidden="true" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/25" aria-hidden="true" />
                <span
                  className="ml-2 text-[10px] font-bold uppercase tracking-widest opacity-60"
                  style={{ color: theme === 'dark' ? '#ffffff' : '#1c1917' }}
                >
                  omnitoolify.com — {theme} theme
                </span>
              </div>

              <div className="relative h-[300px] sm:h-[360px] xl:h-[400px] rounded-[24px] overflow-hidden shadow-xl">
                <HeroSlideStage
                  tool={previewTool}
                  slide={previewSlide}
                  visual={resolvedPreview}
                  chrome="preview"
                  onOpenTool={() => toast.info('Preview mode — on the homepage this opens the linked tool.')}
                  onDetails={() => toast.info('Preview mode — on the homepage this opens the tool details page.')}
                />
              </div>

              <p className="mt-2.5 text-[10px] text-secondary leading-relaxed" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(28,25,23,0.6)' }}>
                The homepage hero card is dark on both site themes — matching the live site. Image
                brightness is a separate, per-slide setting.
                {isEdit ? '' : ' Unsaved changes — nothing has been written to Firestore yet.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AdminBtn variant="secondary" onClick={resetAll}><RotateCcw size={12} /> Reset All Adjustments</AdminBtn>
              {visual.preset && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-faint inline-flex items-center gap-1.5">
                  <Sparkles size={11} /> preset: {visual.preset}
                </span>
              )}
            </div>
          </div>

          {/* ---------------- Controls ---------------- */}
          <div className="space-y-3 lg:max-h-[calc(92vh-140px)] lg:overflow-y-auto lg:pr-1">

            <VSSection title="Content" defaultOpen>
              <AdminField label="Linked tool" hint="Buttons link to this tool's routes">
                <select value={activeTool} onChange={e => setToolSlug(e.target.value)} className={`${adminInputClass} cursor-pointer`}>
                  <option value="">Select a tool…</option>
                  {tools.map(t => <option key={t.slug} value={t.slug}>{t.name} — {getCategoryName(t.category)}</option>)}
                </select>
              </AdminField>
              <AdminField label="Slide title"><input className={adminInputClass} value={form.title} onChange={e => set('title', e.target.value)} /></AdminField>
              <AdminField label="Eyebrow text"><input className={adminInputClass} value={form.eyebrow} onChange={e => set('eyebrow', e.target.value)} /></AdminField>
              <AdminField label="Short description"><textarea className={`${adminInputClass} min-h-[70px] resize-y`} value={form.description} onChange={e => set('description', e.target.value)} /></AdminField>
              <AdminField label="Primary button label"><input className={adminInputClass} value={form.primaryLabel || 'Open Tool'} onChange={e => set('primaryLabel', e.target.value)} /></AdminField>
              <AdminField label="Secondary button label"><input className={adminInputClass} value={form.secondaryLabel || 'About This Tool'} onChange={e => set('secondaryLabel', e.target.value)} /></AdminField>
              <VSToggle label="Active (shown on homepage)" checked={form.active} onChange={v => set('active', v)} />
            </VSSection>

            <VSSection title="Image">
              <AdminField label="Image URL" hint="Direct file URL — e.g. i.ibb.co/….png (not the share page)">
                <input className={adminInputClass} value={form.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)} placeholder="https://i.ibb.co/….png" />
              </AdminField>
              <AdminField label="Image alt text"><input className={adminInputClass} value={form.imageAlt || ''} onChange={e => set('imageAlt', e.target.value)} /></AdminField>
              <VSColor label="Canvas color (behind image)" value={form.backgroundColor || DEFAULT_CANVAS} onChange={v => set('backgroundColor', v)} />
              <VSRange
                label="Image opacity"
                value={visual.position.imageOpacity}
                min={0} max={100}
                onChange={v => setVisual(p => ({ ...p, position: { ...p.position, imageOpacity: v } }))}
                defaultValue={DEFAULT_HERO_VISUAL_SETTINGS.position.imageOpacity}
                format={v => `${v}%`}
                disabled={!getPreviewHasImage(form)}
              />
              <VSRange
                label="Zoom / scale"
                value={visual.position.zoom}
                min={100} max={300}
                onChange={v => setVisual(p => ({ ...p, position: { ...p.position, zoom: v } }))}
                defaultValue={DEFAULT_HERO_VISUAL_SETTINGS.position.zoom}
                format={v => `${v}%`}
                hint="crops in — original file untouched"
                disabled={!getPreviewHasImage(form)}
              />
              <VSRange
                label="Horizontal focus"
                value={visual.position.focusX}
                min={0} max={100}
                onChange={v => setVisual(p => ({ ...p, position: { ...p.position, focusX: v } }))}
                defaultValue={DEFAULT_HERO_VISUAL_SETTINGS.position.focusX}
                format={v => `${v}%`}
                disabled={!getPreviewHasImage(form)}
              />
              <VSRange
                label="Vertical focus"
                value={visual.position.focusY}
                min={0} max={100}
                onChange={v => setVisual(p => ({ ...p, position: { ...p.position, focusY: v } }))}
                defaultValue={DEFAULT_HERO_VISUAL_SETTINGS.position.focusY}
                format={v => `${v}%`}
                disabled={!getPreviewHasImage(form)}
              />
              <VSSelect
                label="Image fit mode"
                value={visual.position.fitMode}
                options={[{ value: 'cover', label: 'Cover — fill and crop' }, { value: 'contain', label: 'Contain — fit inside' }]}
                onChange={v => setVisual(p => ({ ...p, position: { ...p.position, fitMode: v as 'cover' | 'contain' } }))}
              />
              <VSSelect
                label="Background type (compat)"
                value={form.backgroundType || 'dark'}
                options={[
                  { value: 'dark', label: 'Dark (default)' },
                  { value: 'light', label: 'Light' },
                  { value: 'image', label: 'Image (uses background image below)' },
                  { value: 'gradient', label: 'Gradient' },
                ]}
                hint="existing field — 'image' activates the legacy background image"
                onChange={v => set('backgroundType', v)}
              />
              {form.backgroundType === 'image' && (
                <AdminField label="Background image URL" hint="Legacy field — used when no Image URL is set">
                  <input className={adminInputClass} value={form.backgroundImage || ''} onChange={e => set('backgroundImage', e.target.value)} placeholder="/admin-media/….png" />
                </AdminField>
              )}
            </VSSection>

            <VSSection title="Image Adjustments">
              <VSRange label="Brightness" value={visual.image.brightness} min={0} max={200} onChange={v => setVisual(p => ({ ...p, image: { ...p.image, brightness: v } }))} defaultValue={100} format={v => `${v}%`}
                disabled={!getPreviewHasImage(form)} />
              <VSRange label="Contrast" value={visual.image.contrast} min={0} max={200} onChange={v => setVisual(p => ({ ...p, image: { ...p.image, contrast: v } }))} defaultValue={100} format={v => `${v}%`}
                disabled={!getPreviewHasImage(form)} />
              <VSRange label="Saturation" value={visual.image.saturation} min={0} max={200} onChange={v => setVisual(p => ({ ...p, image: { ...p.image, saturation: v } }))} defaultValue={100} format={v => `${v}%`}
                disabled={!getPreviewHasImage(form)} />
              <VSRange label="Exposure" value={visual.image.exposure} min={-50} max={50} onChange={v => setVisual(p => ({ ...p, image: { ...p.image, exposure: v } }))} defaultValue={0}
                disabled={!getPreviewHasImage(form)} />
              <VSRange label="Warmth / temperature" value={visual.image.warmth} min={-100} max={100} onChange={v => setVisual(p => ({ ...p, image: { ...p.image, warmth: v } }))} defaultValue={0}
                hint="cool ← → warm"
                disabled={!getPreviewHasImage(form)} />
              <VSRange label="Hue rotation" value={visual.image.hueRotate} min={-180} max={180} onChange={v => setVisual(p => ({ ...p, image: { ...p.image, hueRotate: v } }))} defaultValue={0} format={v => `${v}°`}
                disabled={!getPreviewHasImage(form)} />
              <VSRange label="Grayscale" value={visual.image.grayscale} min={0} max={100} onChange={v => setVisual(p => ({ ...p, image: { ...p.image, grayscale: v } }))} defaultValue={0} format={v => `${v}%`}
                disabled={!getPreviewHasImage(form)} />
              <VSRange label="Sepia" value={visual.image.sepia} min={0} max={100} onChange={v => setVisual(p => ({ ...p, image: { ...p.image, sepia: v } }))} defaultValue={0} format={v => `${v}%`}
                disabled={!getPreviewHasImage(form)} />
              <VSRange label="Blur" value={visual.image.blur} min={0} max={20} onChange={v => setVisual(p => ({ ...p, image: { ...p.image, blur: v } }))} defaultValue={0} format={v => `${v}px`}
                disabled={!getPreviewHasImage(form)} />
              <p className="text-[10px] text-faint leading-relaxed">Sharpness is intentionally not offered — CSS-only sharpening degrades the original image.</p>
            </VSSection>

            <VSSection title="Overlay & Gradient">
              <VSToggle label="Enable overlay" checked={visual.overlay.enabled} onChange={v => setVisual(p => ({ ...p, overlay: { ...p.overlay, enabled: v } }))} />
              {visual.overlay.enabled && (
                <>
                  <VSColor label="Overlay color" value={visual.overlay.color} onChange={v => setVisual(p => ({ ...p, overlay: { ...p.overlay, color: v } }))} />
                  <VSRange label="Overlay opacity" value={visual.overlay.opacity} min={0} max={100} onChange={v => setVisual(p => ({ ...p, overlay: { ...p.overlay, opacity: v } }))} defaultValue={DEFAULT_HERO_VISUAL_SETTINGS.overlay.opacity} format={v => `${v}%`} />
                </>
              )}
              <VSRange label="Overall darkness" value={visual.overlay.darkness} min={0} max={100} onChange={v => setVisual(p => ({ ...p, overlay: { ...p.overlay, darkness: v } }))} defaultValue={0} format={v => `${v}%`}
                hint="explicit black layer" />
              <VSToggle label="Enable gradient" checked={visual.overlay.gradientEnabled} onChange={v => setVisual(p => ({ ...p, overlay: { ...p.overlay, gradientEnabled: v } }))} />
              {visual.overlay.gradientEnabled && (
                <>
                  <VSSelect
                    label="Gradient direction"
                    value={visual.overlay.gradientDirection}
                    options={[
                      { value: 'to-right', label: 'Dark side → LEFT (to right)' },
                      { value: 'to-left', label: 'Dark side → RIGHT (to left)' },
                      { value: 'to-top', label: 'Dark side → BOTTOM (to top)' },
                      { value: 'to-bottom', label: 'Dark side → TOP (to bottom)' },
                    ]}
                    onChange={v => setVisual(p => ({ ...p, overlay: { ...p.overlay, gradientDirection: v as typeof p.overlay.gradientDirection } }))}
                  />
                  <VSColor label="Gradient start color" value={visual.overlay.gradientStartColor} onChange={v => setVisual(p => ({ ...p, overlay: { ...p.overlay, gradientStartColor: v } }))} />
                  <VSRange label="Gradient start opacity" value={visual.overlay.gradientStartOpacity} min={0} max={100} onChange={v => setVisual(p => ({ ...p, overlay: { ...p.overlay, gradientStartOpacity: v } }))} defaultValue={DEFAULT_HERO_VISUAL_SETTINGS.overlay.gradientStartOpacity} format={v => `${v}%`} />
                  <VSColor label="Gradient end color" value={visual.overlay.gradientEndColor} onChange={v => setVisual(p => ({ ...p, overlay: { ...p.overlay, gradientEndColor: v } }))} />
                  <VSRange label="Gradient end opacity" value={visual.overlay.gradientEndOpacity} min={0} max={100} onChange={v => setVisual(p => ({ ...p, overlay: { ...p.overlay, gradientEndOpacity: v } }))} defaultValue={DEFAULT_HERO_VISUAL_SETTINGS.overlay.gradientEndOpacity} format={v => `${v}%`} />
                  <VSRange label="Gradient intensity" value={visual.overlay.gradientIntensity} min={0} max={200} onChange={v => setVisual(p => ({ ...p, overlay: { ...p.overlay, gradientIntensity: v } }))} defaultValue={DEFAULT_HERO_VISUAL_SETTINGS.overlay.gradientIntensity} format={v => `${v}%`}
                    hint="strengthens both stops" />
                </>
              )}
            </VSSection>

            <VSSection title="Creative Effects">
              <div className="flex flex-wrap gap-1.5">
                {HERO_PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all active:scale-95 ${
                      visual.preset === p.name
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-card border-subtle text-secondary hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-faint leading-relaxed">Presets set the adjustment values — every slider stays editable and the preview updates instantly.</p>
              <VSRange label="Vignette" value={visual.position.vignette} min={0} max={100} onChange={v => setVisual(p => ({ ...p, position: { ...p.position, vignette: v } }))} defaultValue={0} format={v => `${v}%`}
                disabled={!getPreviewHasImage(form)} />
              <VSToggle label="Enable color tint" checked={visual.position.tintEnabled} onChange={v => setVisual(p => ({ ...p, position: { ...p.position, tintEnabled: v } }))} />
              {visual.position.tintEnabled && (
                <>
                  <VSColor label="Tint color" value={visual.position.tintColor} onChange={v => setVisual(p => ({ ...p, position: { ...p.position, tintColor: v } }))} />
                  <VSRange label="Tint opacity" value={visual.position.tintOpacity} min={0} max={100} onChange={v => setVisual(p => ({ ...p, position: { ...p.position, tintOpacity: v } }))} defaultValue={DEFAULT_HERO_VISUAL_SETTINGS.position.tintOpacity} format={v => `${v}%`} />
                </>
              )}
            </VSSection>

            <VSSection title="Text & Buttons">
              <VSColor label="Eyebrow color" value={visual.text.eyebrowColor} allowEmpty onChange={v => setVisual(p => ({ ...p, text: { ...p.text, eyebrowColor: v } }))} />
              <VSColor label="Title color" value={visual.text.titleColor} allowEmpty onChange={v => setVisual(p => ({ ...p, text: { ...p.text, titleColor: v } }))} />
              <VSColor label="Description color" value={visual.text.descriptionColor} allowEmpty onChange={v => setVisual(p => ({ ...p, text: { ...p.text, descriptionColor: v } }))} />
              <VSColor label="Primary button background" value={visual.text.primaryBg} allowEmpty onChange={v => setVisual(p => ({ ...p, text: { ...p.text, primaryBg: v } }))} />
              <VSColor label="Primary button text" value={visual.text.primaryText} allowEmpty onChange={v => setVisual(p => ({ ...p, text: { ...p.text, primaryText: v } }))} />
              <VSColor label="Secondary button background" value={visual.text.secondaryBg} allowEmpty onChange={v => setVisual(p => ({ ...p, text: { ...p.text, secondaryBg: v } }))} />
              <VSColor label="Secondary button text" value={visual.text.secondaryText} allowEmpty onChange={v => setVisual(p => ({ ...p, text: { ...p.text, secondaryText: v } }))} />
              <VSRange label="Text shadow" value={visual.text.textShadow} min={0} max={100} onChange={v => setVisual(p => ({ ...p, text: { ...p.text, textShadow: v } }))} defaultValue={DEFAULT_HERO_VISUAL_SETTINGS.text.textShadow} format={v => `${v}%`} />
              <VSSelect
                label="Content alignment"
                value={visual.text.alignment}
                options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
                onChange={v => setVisual(p => ({ ...p, text: { ...p.text, alignment: v as typeof p.text.alignment } }))}
              />
              <p className="text-[10px] text-faint leading-relaxed">"Automatic" uses the website's built-in colors and keeps the existing design defaults.</p>
            </VSSection>

            <div className="flex items-center justify-between gap-2 pt-1 pb-2">
              <AdminBtn variant="secondary" onClick={onClose}>Cancel</AdminBtn>
              <AdminBtn onClick={save}>Save & Publish</AdminBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** True when the preview slide currently has an image to adjust. */
function getPreviewHasImage(s: HeroSlide): boolean {
  return !!((s.imageUrl || '').trim() || (s.backgroundType === 'image' && (s.backgroundImage || '').trim()));
}
