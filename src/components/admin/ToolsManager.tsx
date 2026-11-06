import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Plus, Pencil, Trash2, Copy, Search, Archive, Eye, Sparkles, ExternalLink, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { CmsTool, CmsCategory } from '../../lib/adminApi';
import { fetchAllToolsFromFirestore, fetchAllCategoriesFromFirestore } from '../../lib/firestoreCms';
import { createCmsToolCloud, deleteCmsToolCloud, updateCmsToolCloud } from '../../lib/adminWriteLayer';
import { toolRegistry } from '../../tools/registry';
import { isValidExternalUrl } from '../../lib/toolRouting';
import { getCategoryName } from '../../data/tools';
import { recommendRelated } from '../../lib/relatedRecommendations';
import { AdminBtn, AdminEmpty, AdminField, AdminModal, AdminSpinner, adminInputClass } from './adminUi';

const STATUSES: CmsTool['status'][] = ['published', 'draft', 'archived'];

/**
 * Authoritative Firestore document id for a loaded tool. Prefers the doc id
 * captured at read time (`__docId`); falls back to the legacy internal `id`
 * only when it is non-empty and not the malformed "undefined" literal.
 */
function getDocKey(tool: CmsTool): string {
  const key = tool.__docId ?? tool.id;
  if (!key || key === 'undefined' || key === 'null') {
    throw new Error('This tool record is missing its Firestore document id — reload the list and try again.');
  }
  return key;
}

// Guards against double-submit while a Firestore write is in flight.
let writeInFlight = false;

export default function ToolsManager({ mode }: { mode: 'list' | 'add' }) {
  const [tools, setTools] = useState<CmsTool[] | null>(null);
  const [cmsCategories, setCmsCategories] = useState<CmsCategory[]>([]);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<CmsTool | null>(null);
  const [creating, setCreating] = useState(mode === 'add');
  const [confirmDelete, setConfirmDelete] = useState<CmsTool | null>(null);

  const load = async () => {
    try {
      const [fb, cats] = await Promise.all([
        fetchAllToolsFromFirestore(),
        fetchAllCategoriesFromFirestore().catch(() => []),
      ]);
      if (fb) {
        // Defensive: ignore malformed docs (e.g. legacy "undefined" doc) so a
        // single bad record cannot crash the whole list.
        setTools(fb.filter(t => t.slug && t.name));
      } else {
        setTools([]); toast.error('Firestore unavailable — tools cannot be loaded right now.');
      }
      setCmsCategories(cats ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tools');
      setTools([]);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!tools) return [];
    const q = query.trim().toLowerCase();
    return tools.filter(t =>
      (!q || t.name.toLowerCase().includes(q) || t.slug.includes(q)) &&
      (catFilter === 'all' || t.category === catFilter) &&
      (statusFilter === 'all' || t.status === statusFilter)
    ).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [tools, query, catFilter, statusFilter]);

  const saveTool = async (tool: CmsTool, isNew: boolean) => {
    try {
      const res = isNew ? await createCmsToolCloud(tool) : await updateCmsToolCloud(getDocKey(tool), tool);
      if (!res.ok) throw new Error(res.error || 'Save failed');
      toast.success(isNew ? 'Tool created' : 'Tool saved');
      setCreating(false);
      setEditing(null);
      load();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
      return false;
    }
  };

  if (!tools) return <AdminSpinner label="Loading tools…" />;

  if (creating) {
    return <ToolForm tool={emptyTool()} isNew allTools={tools} categories={cmsCategories} onCancel={() => setCreating(false)} onSave={t => saveTool(t, true)} />;
  }
  if (editing) {
    return <ToolForm tool={editing} isNew={false} allTools={tools} categories={cmsCategories} onCancel={() => setEditing(null)} onSave={t => saveTool(t, false)} />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input className={`${adminInputClass} pl-10`} placeholder="Search tools by name or slug…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <select className={`${adminInputClass} sm:w-44 cursor-pointer`} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">All categories</option>
          {cmsCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={`${adminInputClass} sm:w-40 cursor-pointer`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <AdminBtn onClick={() => setCreating(true)}><Plus size={14} /> Add New Tool</AdminBtn>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty title="No tools match" message="Try different search terms or filters." />
      ) : (
        <div className="bg-card border border-subtle rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 px-4 py-3 border-b border-subtle text-[9px] font-bold uppercase tracking-widest text-faint">
            <span>Tool</span><span>Category</span><span>Status</span><span>Popular</span><span className="text-right">Actions</span>
          </div>
          {filtered.map(tool => (
            <div key={getDocKey(tool)} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 md:gap-3 px-4 py-3 border-b border-subtle last:border-b-0 items-center">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-icon flex items-center justify-center text-secondary shrink-0">
                  {tool.icon ? <img src={tool.icon} alt="" className="w-4 h-4 object-contain" /> : <span className="text-[10px] font-extrabold">{(tool.name || '?')[0]}</span>}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[13px] text-neutral-900 dark:text-white truncate">{tool.name}</p>
                  <p className="text-[10px] text-faint font-normal truncate">/{tool.slug} · {tool.implementationId ? 'implementation linked' : 'no implementation'}</p>
                </div>
              </div>
              <p className="text-xs text-secondary font-medium">{getCategoryName(tool.category) || tool.category || '—'}</p>
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                  tool.status === 'published' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                  : tool.status === 'archived' ? 'bg-inset text-faint'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                }`}>{tool.status}</span>
              </div>
              <span className="text-xs text-secondary font-medium">{tool.popular ? '★' : '—'}</span>
              <div className="flex items-center justify-end gap-1.5">
                <AdminBtn variant="secondary" onClick={() => setEditing(tool)} aria-label="Edit"><Pencil size={13} /></AdminBtn>
                <AdminBtn variant="secondary" onClick={() => duplicateTool(tool, load)} aria-label="Duplicate"><Copy size={13} /></AdminBtn>
                <AdminBtn variant="secondary" onClick={() => setStatus(tool, tool.status === 'published' ? 'archived' : 'published', load)} aria-label="Toggle publish/archive">
                  {tool.status === 'published' ? <Archive size={13} /> : <Eye size={13} />}
                </AdminBtn>
                <AdminBtn variant="danger" onClick={() => setConfirmDelete(tool)} aria-label="Delete"><Trash2 size={13} /></AdminBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <AdminModal title="Delete tool" onClose={() => setConfirmDelete(null)} maxWidth="max-w-sm">
          <p className="text-sm text-secondary font-normal leading-relaxed mb-5">
            Delete “{confirmDelete.name}”? This also removes it from hero slides and popular tools. Prefer Archive (reversible) when unsure. This action is permanent.
          </p>
          <div className="flex justify-end gap-2.5">
            <AdminBtn variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</AdminBtn>
            <AdminBtn variant="danger" onClick={async () => {
              if (writeInFlight) return;
              writeInFlight = true;
              try {
                const res = await deleteCmsToolCloud(getDocKey(confirmDelete));
                if (!res.ok) throw new Error(res.error || 'Delete failed');
                toast.success('Tool deleted'); setConfirmDelete(null); load();
              } catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed'); }
              finally { writeInFlight = false; }
            }}>Permanently Delete</AdminBtn>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

async function duplicateTool(tool: CmsTool, reload: () => Promise<void>) {
  if (writeInFlight) return;
  writeInFlight = true;
  // The duplicate is a brand-new record: strip the original doc identity
  // (`__docId` and internal `id`), derive a unique slug, and force draft.
  const copy = { ...tool } as CmsTool;
  delete (copy as { __docId?: string }).__docId;
  delete (copy as { id?: string }).id;
  copy.name = `${tool.name || 'Untitled'} (copy)`;
  copy.slug = `${tool.slug || 'tool'}-copy-${Date.now().toString(36)}`;
  copy.status = 'draft';
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = undefined;
  try {
    const res = await createCmsToolCloud(copy);
    if (!res.ok) throw new Error(res.error || 'Duplicate failed');
    toast.success('Tool duplicated as draft');
    await reload();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Duplicate failed');
  } finally {
    writeInFlight = false;
  }
}

async function setStatus(tool: CmsTool, status: CmsTool['status'], reload: () => Promise<void>) {
  if (writeInFlight) return;
  writeInFlight = true;
  try {
    // Status-only partial update targeting the exact Firestore document id —
    // never a full-document overwrite, never a derived/undefined doc id.
    const res = await updateCmsToolCloud(getDocKey(tool), { status });
    if (!res.ok) throw new Error(res.error || 'Status change failed');
    toast.success(`Tool ${status}`);
    await reload();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Status change failed');
  } finally {
    writeInFlight = false;
  }
}

function emptyTool(): CmsTool {
  return {
    id: '', name: '', slug: '', tagline: '', description: '', category: '', implementationId: '',
    tags: [], features: [], howTo: [], details: [], privacy: '', relatedToolIds: [],
    autoRelated: false,
    maxRecommendations: 4,
    recommendedCategories: [],
    externalUrl: '',
    redirectEnabled: false,
    cornerTimerEnabled: true,
    status: 'draft', createdAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Tool form                                                           */
/* ------------------------------------------------------------------ */

function ToolForm({ tool, isNew, allTools, categories, onCancel, onSave }: {
  tool: CmsTool;
  isNew: boolean;
  allTools: CmsTool[];
  categories: CmsCategory[];
  onCancel: () => void;
  onSave: (t: CmsTool) => Promise<boolean>;
}) {
  const [form, setForm] = useState<CmsTool>(tool);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CmsTool>(key: K, value: CmsTool[K]) => setForm(prev => ({ ...prev, [key]: value }));

  const slugFromName = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const recommended = useMemo(() => {
    if (!form.autoRelated) return [];
    const candidates = allTools
      .filter(t => t.status === 'published')
      .map(t => ({
        id: t.id,
        slug: t.slug,
        category: t.category,
        tags: t.tags || [],
        description: `${t.description} ${t.tagline}`,
        status: t.status,
      }));
    return recommendRelated({
      toolId: form.id || form.slug || 'new-tool',
      toolCategory: form.category,
      toolTags: form.tags,
      toolDescription: `${form.description} ${form.tagline}`,
      candidates,
      preferredCategories: form.recommendedCategories?.length ? form.recommendedCategories : undefined,
      max: form.maxRecommendations ?? 4,
    });
  }, [form.autoRelated, form.id, form.slug, form.category, form.tags, form.description, form.tagline, form.recommendedCategories, form.maxRecommendations, allTools]);

  const manualIds = form.relatedToolIds || [];
  const finalRelatedIds = useMemo(() => {
    const ids = [...manualIds];
    for (const r of recommended) if (!ids.includes(r.id)) ids.push(r.id);
    return ids;
  }, [manualIds, recommended]);

  const isExternalUrlValid = form.redirectEnabled ? isValidExternalUrl(form.externalUrl) : true;
  const eligibleRelated = allTools.filter(t => t.slug && t.slug !== form.slug);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.redirectEnabled && !isExternalUrlValid) {
      toast.error('Redirect is enabled but the external URL is invalid or unsafe. Use an http(s) URL.');
      return;
    }
    setSaving(true);
    const ok = await onSave({ ...form, relatedToolIds: finalRelatedIds });
    setSaving(false);
    if (ok) void 0;
  };

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-6">
      {/* Basic */}
      <section className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminField label="Tool name">
            <input className={adminInputClass} value={form.name} onChange={e => {
              const name = e.target.value;
              setForm(prev => ({ ...prev, name, slug: isNew && prev.slug === slugFromName(prev.name) ? slugFromName(name) : prev.slug }));
            }} placeholder="JSON Formatter" />
          </AdminField>
          <AdminField label="URL slug">
            <input className={adminInputClass} value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="json-formatter" />
          </AdminField>
        </div>
        <AdminField label="Short description"><input className={adminInputClass} value={form.tagline} onChange={e => set('tagline', e.target.value)} /></AdminField>
        <AdminField label="Full overview"><textarea className={`${adminInputClass} min-h-[80px] resize-y`} value={form.description} onChange={e => set('description', e.target.value)} /></AdminField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminField label="Category">
            <AdminSelect value={form.category} onChange={e => set('category', e.target.value)} ariaLabel="Category">
              <option value="">Select category…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </AdminSelect>
          </AdminField>
          <AdminField label="Registered implementation" hint="Only genuine registered implementations appear here; none are registered yet — drafts stay without an internal interface.">
            <AdminSelect value={form.implementationId || ''} onChange={e => set('implementationId', e.target.value || undefined)} ariaLabel="Registered implementation">
              <option value="">— No implementation (draft only) —</option>
              {Object.keys(toolRegistry).map(id => <option key={id} value={id}>{id}</option>)}
            </AdminSelect>
          </AdminField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AdminField label="Runs on">
            <AdminSelect value={form.runsOn || 'Your Device'} onChange={e => set('runsOn', e.target.value)} ariaLabel="Runs on">
              <option>Your Device</option><option>Browser</option><option>Server</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="Account needed">
            <AdminSelect value={form.accountNeeded || 'None'} onChange={e => set('accountNeeded', e.target.value)} ariaLabel="Account needed">
              <option>None</option><option>Optional</option><option>Required</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="Availability">
            <input className={adminInputClass} value={form.availability || ''} onChange={e => set('availability', e.target.value)} placeholder="Public" />
          </AdminField>
        </div>
      </section>

      {/* Tags */}
      <section className="bg-card border border-subtle rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Tags</h3>
        <TagEditor tags={form.tags} onChange={tags => set('tags', tags)} />
      </section>

      {/* Features */}
      <section className="bg-card border border-subtle rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Features</h3>
        <ListEditor
          items={form.features}
          onChange={items => set('features', items)}
          placeholder="e.g. One-click copy"
        />
      </section>

      {/* How it works */}
      <section className="bg-card border border-subtle rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">How It Works</h3>
        <div className="space-y-2">
          {form.howTo.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span className="w-6 h-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0 mt-1">{idx + 1}</span>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input className={adminInputClass} value={step.title} onChange={e => {
                  const next = [...form.howTo]; next[idx] = { ...step, title: e.target.value }; set('howTo', next);
                }} placeholder="Step instruction" />
                <input className={adminInputClass} value={step.description || ''} onChange={e => {
                  const next = [...form.howTo]; next[idx] = { ...step, description: e.target.value }; set('howTo', next);
                }} placeholder="Optional supporting description" />
              </div>
              <button type="button" onClick={() => set('howTo', form.howTo.filter((_, i) => i !== idx))} className="text-faint hover:text-red-600 mt-1.5">✕</button>
            </div>
          ))}
          <AdminBtn variant="secondary" type="button" onClick={() => set('howTo', [...form.howTo, { title: '' }])}><Plus size={13} /> Add Step</AdminBtn>
        </div>
      </section>

      {/* Details */}
      <section className="bg-card border border-subtle rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Details</h3>
        <div className="space-y-2">
          {form.details.map((d, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_0.5fr_auto] gap-2 items-center">
              <input className={adminInputClass} value={d.label} onChange={e => { const next = [...form.details]; next[idx] = { ...d, label: e.target.value }; set('details', next); }} placeholder="Label" />
              <input className={adminInputClass} value={d.value} onChange={e => { const next = [...form.details]; next[idx] = { ...d, value: e.target.value }; set('details', next); }} placeholder="Value" />
              <input className={adminInputClass} value={d.type || ''} onChange={e => { const next = [...form.details]; next[idx] = { ...d, type: e.target.value }; set('details', next); }} placeholder="Type" />
              <button type="button" onClick={() => set('details', form.details.filter((_, i) => i !== idx))} className="text-faint hover:text-red-600">✕</button>
            </div>
          ))}
          <AdminBtn variant="secondary" type="button" onClick={() => set('details', [...form.details, { label: '', value: '', type: '' }])}><Plus size={13} /> Add Detail</AdminBtn>
        </div>
      </section>

      {/* Privacy */}
      <section className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Privacy</h3>
        <AdminField label="Privacy description" hint="Only claim local processing if the implementation truly supports it">
          <textarea className={`${adminInputClass} min-h-[60px] resize-y`} value={form.privacy} onChange={e => set('privacy', e.target.value)} />
        </AdminField>
        <AdminField label="Privacy status label"><input className={adminInputClass} value={form.privacyStatus || ''} onChange={e => set('privacyStatus', e.target.value)} placeholder="No uploads · No tracking" /></AdminField>
      </section>

      {/* Related tools */}
      <section className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Related Tools</h3>

        <AdminCheckbox
          label={<span className="flex items-center gap-2">Automatic related tools <Sparkles size={14} className="text-accent" /></span>}
          hint="suggest from published catalogue"
          checked={!!form.autoRelated}
          onChange={v => set('autoRelated', v)}
        />

        {form.autoRelated && (
          <div className="bg-inset border border-subtle rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminField label="Recommendation source categories" hint="Leave empty to use this tool's category">
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => {
                    const selected = (form.recommendedCategories || []).includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => set('recommendedCategories',
                          selected
                            ? (form.recommendedCategories || []).filter(c => c !== cat.id)
                            : [...(form.recommendedCategories || []), cat.id])}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors border ${
                          selected
                            ? 'bg-accent border-accent text-white'
                            : 'bg-card border-subtle text-secondary hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </AdminField>
              <AdminField label="Maximum recommendations" hint="Default 4">
                <input
                  type="number"
                  min={0}
                  max={12}
                  className={`${adminInputClass} w-28`}
                  value={form.maxRecommendations ?? 4}
                  onChange={e => set('maxRecommendations', Math.max(0, Math.min(12, Number(e.target.value) || 4)))}
                />
              </AdminField>
            </div>

            {recommended.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-faint mb-2">Suggested (auto-included on save)</p>
                <div className="flex flex-wrap gap-2">
                  {recommended.map(r => (
                    <span key={r.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-soft border border-accent/25 text-xs font-medium text-accent">
                      <Sparkles size={11} /> {r.slug}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-secondary font-normal">No suggestions match the current criteria — add tools manually below.</p>
            )}
          </div>
        )}

        <AdminField label="Manually selected related tools" hint="Only real Firestore CMS tools — current tool excluded">
          <AdminSelect
            value=""
            onChange={e => {
              const value = e.target.value;
              if (value && value !== form.slug && !manualIds.includes(value)) set('relatedToolIds', [...manualIds, value]);
            }}
            ariaLabel="Add related tool"
          >
            <option value="">Add related tool…</option>
            {eligibleRelated.filter(t => !manualIds.includes(t.slug)).map(t => (
              <option key={t.slug} value={t.slug}>{t.name} ({t.slug})</option>
            ))}
          </AdminSelect>
        </AdminField>

        {eligibleRelated.length === 0 && (
          <p className="text-xs text-secondary font-normal bg-inset border border-subtle rounded-xl p-3">
            No other tools exist in the CMS yet — related tools will become available once you save more tools.
          </p>
        )}

        {manualIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {manualIds.map(id => {
              const t = allTools.find(x => x.slug === id);
              return (
                <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-inset border border-subtle text-xs font-medium text-neutral-900 dark:text-white">
                  {t ? t.name : id}
                  <button type="button" onClick={() => set('relatedToolIds', manualIds.filter(r => r !== id))} className="text-faint hover:text-red-600">✕</button>
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* Tool execution & redirect */}
      <section className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
          <ExternalLink size={15} className="text-accent" /> Tool Execution & Redirect
        </h3>
        <AdminField label="External tool URL" hint={form.redirectEnabled ? 'Required when redirect is enabled — http/https only' : 'Optional — used only when redirect is enabled'}>
          <input
            className={`${adminInputClass} ${form.redirectEnabled && !isExternalUrlValid ? 'border-red-400 dark:border-red-500/60' : ''}`}
            value={form.externalUrl || ''}
            onChange={e => set('externalUrl', e.target.value)}
            placeholder="https://example.com/tool"
          />
        </AdminField>
        {form.redirectEnabled && !isExternalUrlValid && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">Enter a valid http(s) URL — javascript:/data: are rejected.</p>
        )}
        {form.redirectEnabled && (
          <AdminField label="Redirect delay (seconds)" hint="0 or empty = redirect immediately when Open Tool is clicked">
            <input
              type="number"
              min={0}
              max={120}
              className={`${adminInputClass} w-32`}
              placeholder="0"
              value={form.redirectDelaySeconds ?? ''}
              onChange={e => set('redirectDelaySeconds', e.target.value === '' ? undefined : Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            />
          </AdminField>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AdminCheckbox
            label="Redirect Open Tool to the external URL"
            hint="Open Tool goes to the exact configured URL"
            checked={!!form.redirectEnabled}
            onChange={v => set('redirectEnabled', v)}
          />
          <AdminCheckbox
            label="Show corner timer on the details page"
            hint="Auto-open countdown when a redirect delay is set"
            checked={form.cornerTimerEnabled !== false}
            onChange={v => set('cornerTimerEnabled', v)}
          />
        </div>
        <p className="text-[11px] text-faint font-normal leading-relaxed">
          With redirect enabled, Open Tool navigates to the exact configured external URL (the configured delay applies to the corner-timer auto-open only).
          With redirect disabled, the registered internal implementation is used; without either, the tool shows an unavailable state instead of a fake interface.
        </p>
      </section>

      {/* Publication */}
      <section className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Publication</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminCheckbox compact label="Published" checked={form.status === 'published'} onChange={v => set('status', v ? 'published' : 'draft')} />
          <AdminCheckbox compact label="Show in Popular" checked={!!form.popular} onChange={v => set('popular', v)} />
          <AdminCheckbox compact label="Mark as New" checked={!!form.isNew} onChange={v => set('isNew', v)} />
          <AdminCheckbox compact label="Featured" checked={!!form.featured} onChange={v => set('featured', v)} />
        </div>
        {!form.implementationId && !form.redirectEnabled && form.status === 'published' && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-3">
            Warning: this tool has no registered implementation and no external redirect — its Open Tool action will show an unavailable state.
          </p>
        )}
      </section>

      <div className="flex justify-end gap-2.5">
        <AdminBtn variant="secondary" type="button" onClick={onCancel}>Cancel</AdminBtn>
        <AdminBtn type="submit" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create Tool' : 'Save Tool'}</AdminBtn>
      </div>
    </form>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [value, setValue] = useState('');
  const add = () => {
    const tag = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setValue('');
  };
  return (
    <div>
      <div className="flex gap-2">
        <input className={adminInputClass} value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="Add a tag and press Enter" />
        <AdminBtn variant="secondary" type="button" onClick={add}><Plus size={13} /></AdminBtn>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-inset border border-subtle text-xs font-medium text-neutral-900 dark:text-white">
              #{tag}
              <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} className="text-faint hover:text-red-600">✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (i: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2">
          <input className={adminInputClass} value={item} onChange={e => { const next = [...items]; next[idx] = e.target.value; onChange(next); }} placeholder={placeholder} />
          <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx))} className="text-faint hover:text-red-600">✕</button>
        </div>
      ))}
      <AdminBtn variant="secondary" type="button" onClick={() => onChange([...items, ''])}><Plus size={13} /> Add Item</AdminBtn>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upgraded checkbox / select controls (visual only — behavior kept)   */
/* ------------------------------------------------------------------ */

function AdminCheckbox({ label, hint, checked, onChange, disabled, compact }: {
  label: ReactNode;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <label
      className={`group flex items-start gap-3 rounded-xl border transition-colors select-none ${
        compact ? 'p-2.5' : 'p-3'
      } ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : `cursor-pointer bg-card border-subtle hover:bg-inset hover:border-neutral-400 dark:hover:border-neutral-600 ${checked ? 'border-neutral-900 dark:border-white' : ''}`
      }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
          checked
            ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-900'
            : 'bg-transparent border-gray-300 dark:border-neutral-600 group-hover:border-neutral-500 dark:group-hover:border-neutral-400'
        }`}
      >
        {checked && <Check size={13} strokeWidth={3.5} />}
      </span>
      <span className="min-w-0">
        <span className={`block font-semibold text-neutral-900 dark:text-white leading-snug ${compact ? 'text-xs' : 'text-[13px]'}`}>{label}</span>
        {hint && <span className="block text-[11px] text-faint font-normal mt-0.5 leading-relaxed">{hint}</span>}
      </span>
    </label>
  );
}

function AdminSelect({ value, onChange, children, ariaLabel, className }: {
  value: string;
  onChange: (e: FormEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <select
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className={`${adminInputClass} appearance-none pr-10 cursor-pointer w-full`}
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
    </div>
  );
}
