import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Copy, Eye, EyeOff, ChevronUp, ChevronDown, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { HeroSlide, CmsTool } from '../../lib/adminApi';
import { fetchAllHeroSlidesFromFirestore, fetchAllToolsFromFirestore } from '../../lib/firestoreCms';
import { createHeroSlideCloud, deleteHeroSlideCloud, reorderHeroSlidesCloud, updateHeroSlideCloud } from '../../lib/adminWriteLayer';
import { isValidDocId } from '../../lib/cmsPure';
import { getCategoryName } from '../../data/tools';
import { AdminBtn, AdminEmpty, AdminModal, AdminSpinner } from './adminUi';
import HeroSlideStudio from './HeroSlideStudio';

/**
 * Authoritative Firestore document id for a loaded slide. Read from the actual
 * document reference at load time (`__docId`) with the legacy internal `id` as
 * fallback — never derived from the tool slug; never undefined/blank.
 */
function docIdOf(slide: HeroSlide): string | null {
  if (isValidDocId(slide.__docId)) return slide.__docId;
  return isValidDocId(slide.id) ? slide.id : null;
}

function defaultSlide(toolSlug: string, tools: CmsTool[]): HeroSlide {
  const tool = tools.find(t => t.slug === toolSlug);
  return {
    toolSlug,
    title: tool?.name || '',
    eyebrow: `Featured · ${(tool ? getCategoryName(tool.category) : 'Tools').toUpperCase()}`,
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
  const [cmsTools, setCmsTools] = useState<CmsTool[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // one write at a time
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; slide: HeroSlide } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    try {
      const fb = await fetchAllHeroSlidesFromFirestore();
      if (fb) { setSlides(fb); setError(null); }
      else { setSlides([]); setError('Firestore unavailable — slides cannot be loaded right now.'); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load slides');
      setSlides([]);
    }
  };

  useEffect(() => {
    load();
    fetchAllToolsFromFirestore().then(setCmsTools).catch(() => setCmsTools([]));
  }, []);

  const move = async (index: number, dir: -1 | 1) => {
    if (!slides || busyId) return;
    const list = [...slides];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    // Reorder targets authoritative doc ids — never slug-derived or undefined.
    const orderedIds: string[] = [];
    for (const s of list) {
      const id = docIdOf(s);
      if (!id) {
        toast.error('A slide has no valid Firestore document id — reload the list and try again.');
        return;
      }
      orderedIds.push(id);
    }
    const [item] = list.splice(index, 1);
    list.splice(target, 0, item);
    setSlides(list);
    setBusyId(orderedIds[index]);
    try {
      const res = await reorderHeroSlidesCloud(orderedIds);
      if (!res.ok) throw new Error(res.error || 'Reorder failed');
      toast.success('Slide order updated');
      await load(); // update the admin list from confirmed Firestore data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reorder failed');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (slide: HeroSlide) => {
    const docId = docIdOf(slide);
    if (!docId) {
      toast.error('This slide has no valid Firestore document id — reload the list and try again.');
      await load();
      return;
    }
    if (busyId) return;
    const next = !slide.active;
    setBusyId(docId);
    try {
      const res = await updateHeroSlideCloud(docId, { active: next });
      if (!res.ok) throw new Error(res.error || 'Update failed');
      // Success only after the confirmed Firestore write; reload from Firestore.
      toast.success(next ? 'Slide enabled' : 'Slide disabled');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const duplicate = async (slide: HeroSlide) => {
    if (busyId) return;
    // Fresh document each time — copies never overwrite the original.
    const copy: HeroSlide = {
      ...slide,
      title: `${slide.title} (copy)`,
      active: false,
      order: (slide.order ?? 0) + 1,
    };
    delete copy.id;
    delete copy.__docId;
    setBusyId('duplicating');
    try {
      const res = await createHeroSlideCloud(copy);
      if (!res.ok) throw new Error(res.error || 'Duplicate failed');
      toast.success('Slide duplicated (inactive by default)');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Duplicate failed');
    } finally {
      setBusyId(null);
    }
  };

  const saveSlide = async (slide: HeroSlide) => {
    if (!modal) return;
    const isCreate = modal.mode === 'create';
    let docId: string | null = null;
    if (!isCreate) {
      docId = docIdOf(slide);
      if (!docId) {
        // Verify against freshly loaded data before giving up — a stale record
        // from before doc-id tracking gains `__docId` on a re-read.
        const fb = await fetchAllHeroSlidesFromFirestore();
        const match = (fb ?? []).find(s => s.toolSlug === slide.toolSlug && s.title === slide.title);
        docId = match ? docIdOf(match) : null;
        if (docId) setSlides(fb);
      }
      if (!docId) {
        toast.error('This slide has no valid Firestore document id — save aborted so no duplicate is created.');
        return;
      }
    }
    setBusyId(docId ?? 'creating');
    try {
      const res = isCreate
        ? await createHeroSlideCloud(slide)
        : await updateHeroSlideCloud(docId as string, slide);
      if (!res.ok) throw new Error(res.error || 'Save failed');
      // Success only after the confirmed Firestore write.
      toast.success(isCreate ? 'Slide created' : 'Slide saved');
      setModal(null);
      await load();
      // Post-write verification: confirm the updated document still exists in
      // the Firestore list AND is still active — a mismatched/absent record
      // here surfaces immediately instead of silently vanishing from the
      // public hero later.
      if (!isCreate && docId) {
        const fb = await fetchAllHeroSlidesFromFirestore();
        const saved = (fb ?? []).find(s => s.__docId === docId || s.id === docId);
        if (!saved) {
          console.warn('[hero] post-save verification: document not found after update', { docId });
          toast.error('Saved, but the document could not be re-found — check the slide list.');
        } else if (saved.active !== true && slide.active === true) {
          console.warn('[hero] post-save verification: active flag mismatch', { docId, active: saved.active });
          toast.error('Saved, but the slide is flagged inactive — enable it in the list to show it publicly.');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusyId(null);
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
        <AdminBtn onClick={() => setModal({ mode: 'create', slide: defaultSlide('', cmsTools ?? []) })}><Plus size={14} /> New Slide</AdminBtn>
      </div>

      {slides.length === 0 ? (
        <AdminEmpty
          title="No hero slides yet"
          message="Create your first slide to start filling the homepage carousel."
          action={<AdminBtn onClick={() => setModal({ mode: 'create', slide: defaultSlide('', cmsTools ?? []) })}><Plus size={14} /> New Slide</AdminBtn>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {slides.map((slide, idx) => {
            const tool = (cmsTools ?? []).find(t => t.slug === slide.toolSlug);
            const categoryName = tool ? getCategoryName(tool.category) : '—';
            const rowId = docIdOf(slide) ?? `row-${idx}`;
            return (
              <div key={rowId} className="bg-card border border-subtle rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
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
                      <Link2 size={11} /> {tool?.name || slide.toolSlug} · {categoryName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${slide.active ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-inset text-faint'}`}>
                    {slide.active ? <Eye size={10} /> : <EyeOff size={10} />} {slide.active ? 'Active' : 'Inactive'}
                  </span>
                  <AdminBtn variant="secondary" disabled={!!busyId} onClick={() => toggleActive(slide)}>{slide.active ? 'Disable' : 'Enable'}</AdminBtn>
                  <AdminBtn variant="secondary" disabled={!!busyId} onClick={() => duplicate(slide)} aria-label="Duplicate"><Copy size={13} /></AdminBtn>
                  <AdminBtn variant="secondary" disabled={!!busyId} onClick={() => setModal({ mode: 'edit', slide: { ...slide } })} aria-label="Edit"><Pencil size={13} /></AdminBtn>
                  <AdminBtn variant="danger" disabled={!!busyId} onClick={() => { const id = docIdOf(slide); if (!id) { toast.error('This slide has no valid Firestore document id — reload the list and try again.'); return; } setConfirmDelete(id); }} aria-label="Delete"><Trash2 size={13} /></AdminBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <HeroSlideStudio
          slide={modal.slide}
          tools={cmsTools ?? []}
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
              try {
                const res = await deleteHeroSlideCloud(confirmDelete);
                if (!res.ok) throw new Error(res.error || 'Delete failed');
                toast.success('Slide deleted'); setConfirmDelete(null); load();
              } catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed'); }
            }}>Delete</AdminBtn>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

