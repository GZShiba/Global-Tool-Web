import { useEffect, useState } from 'react';
import { Link2, Copy, Trash2, Search, Check, Info } from 'lucide-react';
import { toast } from 'sonner';
import { currentAdminUid } from '../../lib/firestoreCms';
import { CmsMediaRecord, fetchAllMediaFromFirestore, upsertMediaRecordToFirestore, deleteMediaRecordFromFirestore } from '../../lib/firestoreCms';
import { AdminBtn, AdminEmpty, AdminModal, AdminSpinner } from './adminUi';

/**
 * Media Library — Firestore-backed, URL-based (no uploads, no backend).
 * Records live in the cms_media collection; public reads allowed for
 * references, writes only by the allowlisted admin (Firestore rules).
 */
export default function MediaLibrary() {
  const [media, setMedia] = useState<CmsMediaRecord[] | null>(null);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState<CmsMediaRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CmsMediaRecord | null>(null);
  const [recordMode, setRecordMode] = useState(false);
  const [recordUrl, setRecordUrl] = useState('');
  const [recordName, setRecordName] = useState('image.png');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    try {
      const fb = await fetchAllMediaFromFirestore();
      if (fb) { setMedia(fb); setLoadError(null); }
      else { setMedia([]); setLoadError('Firestore unavailable — media cannot be loaded right now.'); }
    } catch (err) {
      setMedia([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load media');
    }
  };
  useEffect(() => { load(); }, []);

  const copyUrl = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.info(`URL: ${url}`);
    }
  };

  const addRecord = async () => {
    const url = recordUrl.trim();
    if (!url) { toast.error('Enter an image URL'); return; }
    if (!/^https?:\/\/[^\s]+$/i.test(url) && !url.startsWith('/')) {
      toast.error('Enter a valid http(s) URL or a local path like /admin-media/…');
      return;
    }
    const uid = await currentAdminUid();
    if (!uid) { toast.error('Sign in to add media.'); return; }
    setSaving(true);
    try {
      const record: CmsMediaRecord = {
        id: `media-${Date.now().toString(36)}`,
        url,
        originalName: recordName.trim() || 'image.png',
        alt: '',
        size: 0,
        createdAt: new Date().toISOString(),
      };
      await upsertMediaRecordToFirestore(record);
      toast.success('Media record added');
      setRecordMode(false); setRecordUrl(''); setRecordName('image.png');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add media');
    } finally {
      setSaving(false);
    }
  };

  if (!media) return <AdminSpinner label="Loading media…" />;
  const filtered = media.filter(m => !query.trim() || m.originalName.toLowerCase().includes(query.toLowerCase()) || m.alt.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-stretch">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input className="w-full pl-10 pr-4 py-2.5 bg-card border border-subtle focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl outline-none text-[13px] font-medium" placeholder="Search images…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <AdminBtn onClick={() => setRecordMode(true)}><Link2 size={14} /> Add Image URL</AdminBtn>
      </div>

      <div className="flex items-start gap-2.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/40 rounded-xl p-3.5 mb-5 text-xs text-sky-800 dark:text-sky-300">
        <Info size={15} className="shrink-0 mt-0.5" />
        <span>URL-based media records (stored in Firestore). Uploads are not available on the free Spark plan — use a local path like <code className="bg-sky-100/70 dark:bg-sky-900/40 px-1 py-0.5 rounded">/admin-media/…</code> or any http(s) URL.</span>
      </div>

      {loadError && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-3.5 mb-5 text-xs text-amber-800 dark:text-amber-300">
          {loadError}
        </div>
      )}

      {recordMode && (
        <div className="bg-card border border-subtle rounded-2xl p-5 mb-5 space-y-3">
          <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Add image by URL</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="w-full px-3.5 py-2.5 bg-inset border border-subtle focus:bg-card focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl outline-none text-sm font-medium"
              placeholder="/admin-media/logo.png or https://…"
              value={recordUrl}
              onChange={e => setRecordUrl(e.target.value)}
            />
            <input
              className="w-full px-3.5 py-2.5 bg-inset border border-subtle focus:bg-card focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl outline-none text-sm font-medium"
              placeholder="File name (label)"
              value={recordName}
              onChange={e => setRecordName(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2.5">
            <AdminBtn variant="secondary" onClick={() => setRecordMode(false)}>Cancel</AdminBtn>
            <AdminBtn onClick={addRecord} disabled={saving}>{saving ? 'Adding…' : 'Add Record'}</AdminBtn>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <AdminEmpty title={media.length === 0 ? 'No media yet' : 'No matching images'} message="Add image URLs to reference existing local/static assets." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-card border border-subtle rounded-2xl overflow-hidden">
              <div className="aspect-video bg-inset flex items-center justify-center overflow-hidden">
                {item.url ? (
                  <img src={item.url} alt={item.alt || item.originalName} className="w-full h-full object-contain" loading="lazy" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span className="text-[10px] text-faint font-bold uppercase tracking-widest">No preview</span>
                )}
              </div>
              <div className="p-3 space-y-2">
                <p className="text-[11px] font-bold text-neutral-900 dark:text-white truncate" title={item.originalName}>{item.originalName}</p>
                <p className="text-[10px] text-faint font-normal truncate">{item.url}</p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => copyUrl(item.url.startsWith('/') ? `${window.location.origin}${item.url}` : item.url, item.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-subtle text-[9px] font-bold uppercase tracking-wider text-secondary hover:text-neutral-900 dark:hover:text-white transition-colors">
                    {copied === item.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />} {copied === item.id ? 'Copied' : 'Copy URL'}
                  </button>
                  <button onClick={() => setEditAlt(item)} className="px-2 py-1.5 rounded-lg border border-subtle text-[9px] font-bold uppercase tracking-wider text-secondary hover:text-neutral-900 dark:hover:text-white transition-colors">Alt</button>
                  <button onClick={() => setConfirmDelete(item)} className="px-2 py-1.5 rounded-lg border border-subtle text-[9px] font-bold uppercase tracking-wider text-secondary hover:text-red-600 transition-colors"><Trash2 size={11} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editAlt && (
        <AdminModal title="Edit alt text" onClose={() => setEditAlt(null)} maxWidth="max-w-sm">
          <input className="w-full px-3.5 py-2.5 bg-inset border border-subtle focus:bg-card focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl outline-none text-sm font-medium" value={editAlt.alt} onChange={e => setEditAlt({ ...editAlt, alt: e.target.value })} placeholder="Alt text for this image" />
          <div className="flex justify-end gap-2.5 mt-4">
            <AdminBtn variant="secondary" onClick={() => setEditAlt(null)}>Cancel</AdminBtn>
            <AdminBtn onClick={async () => {
              try {
                const uid = await currentAdminUid();
                if (!uid) { toast.error('Sign in to edit media.'); return; }
                await upsertMediaRecordToFirestore(editAlt);
                toast.success('Alt text saved');
                setEditAlt(null);
                load();
              } catch (err) { toast.error(err instanceof Error ? err.message : 'Save failed'); }
            }}>Save</AdminBtn>
          </div>
        </AdminModal>
      )}

      {confirmDelete && (
        <AdminModal title="Delete media record" onClose={() => setConfirmDelete(null)} maxWidth="max-w-sm">
          <p className="text-sm text-secondary font-normal leading-relaxed mb-5">Delete “{confirmDelete.originalName}”? This removes the record only — the image file itself is untouched.</p>
          <div className="flex justify-end gap-2.5">
            <AdminBtn variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</AdminBtn>
            <AdminBtn variant="danger" onClick={async () => {
              try {
                const uid = await currentAdminUid();
                if (!uid) { toast.error('Sign in to delete media.'); return; }
                await deleteMediaRecordFromFirestore(confirmDelete.id);
                toast.success('Media record deleted');
                setConfirmDelete(null);
                load();
              } catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed'); }
            }}>Delete</AdminBtn>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
