import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Copy, Eye, EyeOff, ChevronUp, ChevronDown, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { HeroSlide, createHeroSlide, deleteHeroSlide, listHeroSlides, reorderHeroSlides, updateHeroSlide } from '../../lib/adminApi';
import { tools, getCategory } from '../../data/tools';
import { AdminBtn, AdminEmpty, AdminField, AdminModal, AdminSpinner, adminInputClass } from './adminUi';

function defaultSlide(toolSlug: string): HeroSlide {
  const tool = tools.find(t => t.slug === toolSlug);
  const category = tool ? getCategory(tool.category) : undefined;
  return {
    toolSlug,
    title: tool?.name || '',
    eyebrow: `Featured · ${(category?.name || 'Tools').toUpperCase()}`,
    description: tool?.tagline || tool?.description || '',
    imageUrl: '',
    imageAlt: tool?.name || '',
    backgroundType: 'dark',
    backgroundColor: '#0b0b0d',
    primaryLabel: 'Open Tool',
    secondaryLabel: 'About This Tool',
    active: true,
    order: 0,
  };
}

export default function HeroSlidesManager() {
  const [slides, setSlides] = useState<HeroSlide[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; slide: HeroSlide } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    try {
      setSlides(await listHeroSlides());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load slides');
      setSlides([]);
    }
  };

  useEffect(() => { load(); }, []);

  const move = async (index: number, dir: -1 | 1) => {
    const list = slides ? [...slides] : [];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(target, 0, item);
    const orderedIds = list.map(s => s.id!).filter(Boolean);
    setSlides(list);
    try {
      await reorderHeroSlides(orderedIds);
      toast.success('Slide order updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reorder failed');
      load();
    }
  };

  const toggleActive = async (slide: HeroSlide) => {
    if (!slide.id) return;
    const next = { ...slide, active: !slide.active };
    setSlides(prev => prev ? prev.map(s => s.id === slide.id ? next : s) : prev);
    try {
      await updateHeroSlide(slide.id, { active: next.active });
      toast.success(next.active ? 'Slide enabled' : 'Slide disabled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
      load();
    }
  };

  const duplicate = async (slide: HeroSlide) => {
    try {
      const copy = { ...defaultSlide(slide.toolSlug), ...slide, id: undefined, title: `${slide.title} (copy)`, active: false };
      delete copy.id;
      await createHeroSlide(copy);
      toast.success('Slide duplicated (inactive by default)');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Duplicate failed');
    }
  };

  const saveSlide = async (slide: HeroSlide) => {
    try {
      if (modal?.mode === 'create') {
        await createHeroSlide(slide);
        toast.success('Slide created');
      } else if (slide.id) {
        await updateHeroSlide(slide.id, slide);
        toast.success('Slide saved');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  if (error && slides === null) {
    return <AdminEmpty title="Cannot reach admin API" message={error} action={<AdminBtn onClick={load}>Retry</AdminBtn>} />;
  }
  if (!slides) return <AdminSpinner label="Loading slides…" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-secondary font-normal">Control the homepage hero carousel. Active slides appear on the site in order.</p>
        <AdminBtn onClick={() => setModal({ mode: 'create', slide: defaultSlide('') })}><Plus size={14} /> New Slide</AdminBtn>
      </div>

      {slides.length === 0 ? (
        <AdminEmpty
          title="No hero slides yet"
          message="Create your first slide to start filling the homepage carousel."
          action={<AdminBtn onClick={() => setModal({ mode: 'create', slide: defaultSlide('') })}><Plus size={14} /> New Slide</AdminBtn>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {slides.map((slide, idx) => {
            const tool = tools.find(t => t.slug === slide.toolSlug);
            const category = tool ? getCategory(tool.category) : undefined;
            return (
              <div key={slide.id} className="bg-card border border-subtle rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up" className="text-faint hover:text-neutral-900 dark:hover:text-white disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button onClick={() => move(idx, 1)} disabled={idx === slides.length - 1} aria-label="Move down" className="text-faint hover:text-neutral-900 dark:hover:text-white disabled:opacity-30"><ChevronDown size={14} /></button>
                  </div>
                  <div className="w-20 h-12 rounded-lg bg-neutral-900 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-white/80 px-2 text-center overflow-hidden">
                    {slide.title || 'Untitled'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-neutral-900 dark:text-white truncate">{slide.title}</p>
                    <p className="text-[11px] text-secondary font-normal truncate flex items-center gap-1">
                      <Link2 size={11} /> {tool?.name || slide.toolSlug} · {category?.name || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${slide.active ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-inset text-faint'}`}>
                    {slide.active ? <Eye size={10} /> : <EyeOff size={10} />} {slide.active ? 'Active' : 'Inactive'}
                  </span>
                  <AdminBtn variant="secondary" onClick={() => toggleActive(slide)}>{slide.active ? 'Disable' : 'Enable'}</AdminBtn>
                  <AdminBtn variant="secondary" onClick={() => duplicate(slide)} aria-label="Duplicate"><Copy size={13} /></AdminBtn>
                  <AdminBtn variant="secondary" onClick={() => setModal({ mode: 'edit', slide: { ...slide } })} aria-label="Edit"><Pencil size={13} /></AdminBtn>
                  <AdminBtn variant="danger" onClick={() => setConfirmDelete(slide.id!)} aria-label="Delete"><Trash2 size={13} /></AdminBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <SlideFormModal
          slide={modal.slide}
          onClose={() => setModal(null)}
          onSave={saveSlide}
        />
      )}

      {confirmDelete && (
        <AdminModal title="Delete slide" onClose={() => setConfirmDelete(null)} maxWidth="max-w-sm">
          <p className="text-sm text-secondary font-normal leading-relaxed mb-5">Delete this slide from the hero carousel? This cannot be undone.</p>
          <div className="flex justify-end gap-2.5">
            <AdminBtn variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</AdminBtn>
            <AdminBtn variant="danger" onClick={async () => {
              try { await deleteHeroSlide(confirmDelete); toast.success('Slide deleted'); setConfirmDelete(null); load(); }
              catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed'); }
            }}>Delete</AdminBtn>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

function SlideFormModal({ slide, onClose, onSave }: { slide: HeroSlide; onClose: () => void; onSave: (s: HeroSlide) => void }) {
  const [form, setForm] = useState<HeroSlide>(slide);
  const [selectedTool, setSelectedTool] = useState(slide.toolSlug);

  const pickTool = (slug: string) => {
    setSelectedTool(slug);
    if (slug) setForm(prev => ({ ...prev, toolSlug: slug, ...defaultSlide(slug) }));
  };

  const set = <K extends keyof HeroSlide>(key: K, value: HeroSlide[K]) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <AdminModal title={slide.id ? 'Edit Slide' : 'New Slide'} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <AdminField label="Linked tool" hint="Buttons link to this tool's routes">
          <select value={selectedTool} onChange={e => pickTool(e.target.value)} className={`${adminInputClass} cursor-pointer`}>
            <option value="">Select a tool…</option>
            {tools.map(t => <option key={t.id} value={t.slug}>{t.name} — {getCategory(t.category)?.name}</option>)}
          </select>
        </AdminField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminField label="Slide title"><input className={adminInputClass} value={form.title} onChange={e => set('title', e.target.value)} /></AdminField>
          <AdminField label="Eyebrow text"><input className={adminInputClass} value={form.eyebrow} onChange={e => set('eyebrow', e.target.value)} /></AdminField>
        </div>

        <AdminField label="Short description">
          <textarea className={`${adminInputClass} min-h-[70px] resize-y`} value={form.description} onChange={e => set('description', e.target.value)} />
        </AdminField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminField label="Image URL" hint="Optional — from Media Library or /admin-media/…">
            <input className={adminInputClass} value={form.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)} placeholder="/admin-media/….png" />
          </AdminField>
          <AdminField label="Image alt text"><input className={adminInputClass} value={form.imageAlt || ''} onChange={e => set('imageAlt', e.target.value)} /></AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminField label="Background type">
            <select className={`${adminInputClass} cursor-pointer`} value={form.backgroundType || 'dark'} onChange={e => set('backgroundType', e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="image">Image</option>
              <option value="gradient">Gradient</option>
            </select>
          </AdminField>
          <AdminField label="Background color">
            <input type="color" className="h-11 w-full rounded-xl border border-subtle bg-inset cursor-pointer" value={form.backgroundColor || '#0b0b0d'} onChange={e => set('backgroundColor', e.target.value)} />
          </AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminField label="Background image URL"><input className={adminInputClass} value={form.backgroundImage || ''} onChange={e => set('backgroundImage', e.target.value)} placeholder="/admin-media/….png" /></AdminField>
          <AdminField label="Focus point"><input className={adminInputClass} value={form.focusPoint || ''} onChange={e => set('focusPoint', e.target.value)} placeholder="center | top | bottom" /></AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminField label="Primary button label"><input className={adminInputClass} value={form.primaryLabel || 'Open Tool'} onChange={e => set('primaryLabel', e.target.value)} /></AdminField>
          <AdminField label="Secondary button label"><input className={adminInputClass} value={form.secondaryLabel || 'About This Tool'} onChange={e => set('secondaryLabel', e.target.value)} /></AdminField>
        </div>

        <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-900 dark:text-white cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-blue-600" />
          Active (shown on homepage)
        </label>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-subtle">
          <AdminBtn variant="secondary" onClick={onClose}>Cancel</AdminBtn>
          <AdminBtn onClick={() => onSave(form)}>Save Slide</AdminBtn>
        </div>
      </div>
    </AdminModal>
  );
}
