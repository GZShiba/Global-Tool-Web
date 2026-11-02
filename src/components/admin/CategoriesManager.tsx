import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { CmsCategory, createCmsCategory, deleteCmsCategory, listCmsCategories, reorderCmsCategories, updateCmsCategory } from '../../lib/adminApi';
import { createCmsCategoryCloud, deleteCmsCategoryCloud, reorderCmsCategoriesCloud, updateCmsCategoryCloud } from '../../lib/adminWriteLayer';
import { AdminBtn, AdminEmpty, AdminField, AdminModal, AdminSpinner, adminInputClass } from './adminUi';
import { tools } from '../../data/tools';

export default function CategoriesManager() {
  const [cats, setCats] = useState<CmsCategory[] | null>(null);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; cat: CmsCategory } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CmsCategory | null>(null);

  const load = async () => {
    try {
      setCats(await listCmsCategories());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load categories');
      setCats([]);
    }
  };
  useEffect(() => { load(); }, []);

  const move = async (index: number, dir: -1 | 1) => {
    if (!cats) return;
    const list = [...cats];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(target, 0, item);
    setCats(list);
    try {
      const res = await reorderCmsCategoriesCloud(list.map(c => c.id!));
      if (!res.ok) throw new Error(res.error || 'Reorder failed');
      toast.success('Order updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reorder failed');
      load();
    }
  };

  if (!cats) return <AdminSpinner label="Loading categories…" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-secondary font-normal">Manage tool categories shown in Browse Categories, the All Tools sidebar, and tool breadcrumbs.</p>
        <AdminBtn onClick={() => setModal({ mode: 'create', cat: { id: '', name: '', slug: '', description: '', enabled: true } })}><Plus size={14} /> New Category</AdminBtn>
      </div>

      {cats.length === 0 ? (
        <AdminEmpty title="No categories yet" message="Create a category to start organizing tools." action={<AdminBtn onClick={() => setModal({ mode: 'create', cat: { id: '', name: '', slug: '', description: '', enabled: true } })}><Plus size={14} /> New Category</AdminBtn>} />
      ) : (
        <div className="bg-card border border-subtle rounded-2xl overflow-hidden">
          {cats.map((cat, idx) => {
            const count = tools.filter(t => t.category === cat.id).length;
            return (
              <div key={cat.id} className="flex items-center gap-3 p-4 border-b border-subtle last:border-b-0">
                <div className="flex flex-col">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up" className="text-faint hover:text-neutral-900 dark:hover:text-white disabled:opacity-30"><ChevronUp size={13} /></button>
                  <button onClick={() => move(idx, 1)} disabled={idx === cats.length - 1} aria-label="Move down" className="text-faint hover:text-neutral-900 dark:hover:text-white disabled:opacity-30"><ChevronDown size={13} /></button>
                </div>
                <div className="w-9 h-9 rounded-xl bg-icon flex items-center justify-center text-secondary shrink-0">
                  {cat.icon ? <img src={cat.icon} alt="" className="w-5 h-5 object-contain" /> : <span className="text-xs font-extrabold">{cat.name.slice(0, 1)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-neutral-900 dark:text-white">{cat.name} <span className="text-faint font-normal text-xs">/{cat.slug}</span></p>
                  <p className="text-[11px] text-secondary font-normal truncate">{cat.description || 'No description'}</p>
                </div>
                <span className="text-[10px] text-faint font-bold uppercase tracking-widest">{count} tools</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${cat.enabled ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-inset text-faint'}`}>
                  {cat.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <AdminBtn variant="secondary" onClick={() => setModal({ mode: 'edit', cat: { ...cat } })} aria-label="Edit"><Pencil size={13} /></AdminBtn>
                <AdminBtn variant="danger" onClick={() => setConfirmDelete(cat)} aria-label="Delete"><Trash2 size={13} /></AdminBtn>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <CategoryFormModal cat={modal.cat} onClose={() => setModal(null)} onSave={async c => {
          try {
            const res = modal.mode === 'create'
              ? await createCmsCategoryCloud(c)
              : await updateCmsCategoryCloud(c.id, c);
            if (!res.ok) throw new Error(res.error || 'Save failed');
            toast.success('Category saved');
            setModal(null);
            load();
          } catch (err) { toast.error(err instanceof Error ? err.message : 'Save failed'); }
        }} />
      )}

      {confirmDelete && (
        <AdminModal title="Delete category" onClose={() => setConfirmDelete(null)} maxWidth="max-w-sm">
          <p className="text-sm text-secondary font-normal leading-relaxed mb-5">
            Delete category “{confirmDelete.name}”? Categories containing published tools cannot be deleted until those tools are reassigned.
          </p>
          <div className="flex justify-end gap-2.5">
            <AdminBtn variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</AdminBtn>
            <AdminBtn variant="danger" onClick={async () => {
              try {
                const res = await deleteCmsCategoryCloud(confirmDelete.id);
                if (!res.ok) throw new Error(res.error || 'Delete failed');
                toast.success('Category deleted'); setConfirmDelete(null); load();
              } catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed'); }
            }}>Delete</AdminBtn>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

function CategoryFormModal({ cat, onClose, onSave }: { cat: CmsCategory; onClose: () => void; onSave: (c: CmsCategory) => void }) {
  const [form, setForm] = useState<CmsCategory>(cat);
  const set = <K extends keyof CmsCategory>(key: K, value: CmsCategory[K]) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <AdminModal title={cat.id ? 'Edit Category' : 'New Category'} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminField label="Name"><input className={adminInputClass} value={form.name} onChange={e => set('name', e.target.value)} /></AdminField>
          <AdminField label="Slug"><input className={adminInputClass} value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="text" /></AdminField>
        </div>
        <AdminField label="Description"><textarea className={`${adminInputClass} min-h-[60px] resize-y`} value={form.description} onChange={e => set('description', e.target.value)} /></AdminField>
        <AdminField label="Icon URL" hint="Optional"><input className={adminInputClass} value={form.icon || ''} onChange={e => set('icon', e.target.value)} placeholder="/admin-media/….png" /></AdminField>
        <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-900 dark:text-white cursor-pointer">
          <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} className="w-4 h-4 accent-blue-600" />
          Enabled (visible on the public site)
        </label>
        <div className="flex justify-end gap-2.5 pt-2 border-t border-subtle">
          <AdminBtn variant="secondary" onClick={onClose}>Cancel</AdminBtn>
          <AdminBtn onClick={() => onSave(form)}>Save Category</AdminBtn>
        </div>
      </div>
    </AdminModal>
  );
}
