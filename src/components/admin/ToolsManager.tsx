import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Pencil, Trash2, Copy, Search, Archive, Eye, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { CmsTool, createCmsTool, deleteCmsTool, listCmsTools, updateCmsTool } from '../../lib/adminApi';
import { createCmsToolCloud, deleteCmsToolCloud, updateCmsToolCloud } from '../../lib/adminWriteLayer';
import { toolRegistry } from '../../tools/registry';
import { categories, getCategory } from '../../data/tools';
import { recommendRelated } from '../../lib/relatedRecommendations';
import { AdminBtn, AdminEmpty, AdminField, AdminModal, AdminSpinner, adminInputClass } from './adminUi';

const STATUSES: CmsTool['status'][] = ['published', 'draft', 'archived'];

export default function ToolsManager({ mode }: { mode: 'list' | 'add' }) {
  const [tools, setTools] = useState<CmsTool[] | null>(null);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<CmsTool | null>(null);
  const [creating, setCreating] = useState(mode === 'add');
  const [confirmDelete, setConfirmDelete] = useState<CmsTool | null>(null);

  const load = async () => {
    try {
      setTools(await listCmsTools());
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
      const res = isNew ? await createCmsToolCloud(tool) : await updateCmsToolCloud(tool.id, tool);
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
    return <ToolForm tool={emptyTool()} isNew allTools={tools} onCancel={() => setCreating(false)} onSave={t => saveTool(t, true)} />;
  }
  if (editing) {
    return <ToolForm tool={editing} isNew={false} allTools={tools} onCancel={() => setEditing(null)} onSave={t => saveTool(t, false)} />;
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
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <div key={tool.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 md:gap-3 px-4 py-3 border-b border-subtle last:border-b-0 items-center">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-icon flex items-center justify-center text-secondary shrink-0">
                  {tool.icon ? <img src={tool.icon} alt="" className="w-4 h-4 object-contain" /> : <span className="text-[10px] font-extrabold">{tool.name.slice(0, 1)}</span>}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[13px] text-neutral-900 dark:text-white truncate">{tool.name}</p>
                  <p className="text-[10px] text-faint font-normal truncate">/{tool.slug} · {tool.implementationId ? 'implementation linked' : 'no implementation'}</p>
                </div>
              </div>
              <p className="text-xs text-secondary font-medium">{getCategory(tool.category)?.name || tool.category || '—'}</p>
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
              try {
                const res = await deleteCmsToolCloud(confirmDelete.id);
                if (!res.ok) throw new Error(res.error || 'Delete failed');
                toast.success('Tool deleted'); setConfirmDelete(null); load();
              } catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed'); }
            }}>Permanently Delete</AdminBtn>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

async function duplicateTool(tool: CmsTool, reload: () => Promise<void>) {
  const copy: CmsTool = { ...tool, id: '', name: `${tool.name} (copy)`, slug: `${tool.slug}-copy-${Date.now().toString(36)}`, status: 'draft' };
  delete (copy as { id?: string }).id;
  try {
    const res = await createCmsToolCloud(copy);
    if (!res.ok) throw new Error(res.error || 'Duplicate failed');
    toast.success('Tool duplicated as draft');
    await reload();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Duplicate failed');
  }
}

async function setStatus(tool: CmsTool, status: CmsTool['status'], reload: () => Promise<void>) {
  try {
    const res = await updateCmsToolCloud(tool.id, { status });
    if (!res.ok) throw new Error(res.error || 'Status change failed');
    toast.success(`Tool ${status}`);
    await reload();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Status change failed');
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

function ToolForm({ tool, isNew, allTools, onCancel, onSave }: {
  tool: CmsTool;
  isNew: boolean;
  allTools: CmsTool[];
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

  const isExternalUrlValid = form.redirectEnabled ? /^https?:\/\/[^\s]+$/i.test(form.externalUrl || '') : true;

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
            <select className={`${adminInputClass} cursor-pointer`} value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Select category…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </AdminField>
          <AdminField label="Registered implementation" hint="Maps to the working tool interface; essential for a live tool">
            <select className={`${adminInputClass} cursor-pointer`} value={form.implementationId || ''} onChange={e => set('implementationId', e.target.value || undefined)}>
              <option value="">— No implementation (draft only) —</option>
              {Object.keys(toolRegistry).map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </AdminField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AdminField label="Runs on">
            <select className={`${adminInputClass} cursor-pointer`} value={form.runsOn || 'Your Device'} onChange={e => set('runsOn', e.target.value)}>
              <option>Your Device</option><option>Browser</option><option>Server</option>
            </select>
          </AdminField>
          <AdminField label="Account needed">
            <select className={`${adminInputClass} cursor-pointer`} value={form.accountNeeded || 'None'} onChange={e => set('accountNeeded', e.target.value)}>
              <option>None</option><option>Optional</option><option>Required</option>
            </select>
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

        <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-900 dark:text-white cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.autoRelated}
            onChange={e => set('autoRelated', e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          Automatic related tools <Sparkles size={14} className="text-accent" />
          <span className="text-[11px] text-faint font-normal">suggest from published catalogue</span>
        </label>

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

        <AdminField label="Manually selected related tools" hint="Always preserved — current tool excluded">
          <select
            className={`${adminInputClass} cursor-pointer`}
            value=""
            onChange={e => {
              const value = e.target.value;
              if (value && value !== form.slug && !manualIds.includes(value)) set('relatedToolIds', [...manualIds, value]);
            }}
          >
            <option value="">Add related tool…</option>
            {Object.keys(toolRegistry).filter(id => id !== form.slug && !manualIds.includes(id)).map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </AdminField>

        {manualIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {manualIds.map(id => (
              <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-inset border border-subtle text-xs font-medium text-neutral-900 dark:text-white">
                {id}
                <button type="button" onClick={() => set('relatedToolIds', manualIds.filter(r => r !== id))} className="text-faint hover:text-red-600">✕</button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Tool execution & redirect */}
      <section className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
          <ExternalLink size={15} className="text-accent" /> Tool Execution & Redirect
        </h3>
        <AdminField label="External tool URL" hint="Optional — only http/https allowed; used only when redirect is enabled">
          <input
            className={`${adminInputClass} ${form.redirectEnabled && !isExternalUrlValid ? 'border-red-400 dark:border-red-500/60' : ''}`}
            value={form.externalUrl || ''}
            onChange={e => set('externalUrl', e.target.value)}
            placeholder="https://example.com/tool"
          />
        </AdminField>
        {form.redirectEnabled && !isExternalUrlValid && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">Enter a valid http(s) URL (javascript:/data: are rejected).</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-900 dark:text-white cursor-pointer">
            <input type="checkbox" checked={!!form.redirectEnabled} onChange={e => set('redirectEnabled', e.target.checked)} className="w-4 h-4 accent-blue-600" />
            Redirect Open Tool to the external URL
          </label>
          <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-900 dark:text-white cursor-pointer">
            <input type="checkbox" checked={form.cornerTimerEnabled !== false} onChange={e => set('cornerTimerEnabled', e.target.checked)} className="w-4 h-4 accent-blue-600" />
            Show corner timer on the details page
          </label>
        </div>
        <p className="text-[11px] text-faint font-normal leading-relaxed">
          With redirect enabled, the primary Open Tool button navigates to the external URL only when a visitor deliberately activates it —
          opening the details page never redirects automatically. With redirect disabled (or no URL), the existing local implementation is used. The corner
          timer is independent: hiding it never blocks the tool action.
        </p>
      </section>

      {/* Publication */}
      <section className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Publication</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-neutral-900 dark:text-white"><input type="checkbox" checked={form.status === 'published'} onChange={e => set('status', e.target.checked ? 'published' : 'draft')} className="accent-blue-600" /> Published</label>
          <label className="flex items-center gap-2 text-xs font-medium text-neutral-900 dark:text-white"><input type="checkbox" checked={!!form.popular} onChange={e => set('popular', e.target.checked)} className="accent-blue-600" /> Show in Popular</label>
          <label className="flex items-center gap-2 text-xs font-medium text-neutral-900 dark:text-white"><input type="checkbox" checked={!!form.isNew} onChange={e => set('isNew', e.target.checked)} className="accent-blue-600" /> Mark as New</label>
          <label className="flex items-center gap-2 text-xs font-medium text-neutral-900 dark:text-white"><input type="checkbox" checked={!!form.featured} onChange={e => set('featured', e.target.checked)} className="accent-blue-600" /> Featured</label>
        </div>
        {!form.implementationId && form.status === 'published' && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-3">
            Warning: this tool has no registered implementation linked, so its Open Tool action will have nothing to run.
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
