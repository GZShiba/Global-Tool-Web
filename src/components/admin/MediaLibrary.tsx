import { useEffect, useRef, useState } from 'react';
import { Upload, Copy, Trash2, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import { MediaItem, deleteMedia, listMedia, updateMedia, uploadMedia } from '../../lib/adminApi';
import { AdminBtn, AdminEmpty, AdminModal, AdminSpinner } from './adminUi';

export default function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState<MediaItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MediaItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setMedia(await listMedia());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load media');
      setMedia([]);
    }
  };
  useEffect(() => { load(); }, []);

  const onUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 8 MB`);
          continue;
        }
        await uploadMedia(file);
      }
      toast.success('Upload complete');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const copyUrl = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.info(`URL: ${url}`);
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
        <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={e => onUpload(e.target.files)} />
        <AdminBtn onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload Images'}
        </AdminBtn>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty title={media.length === 0 ? 'No media yet' : 'No matching images'} message="Upload PNG, JPEG, WebP, or SVG images up to 8 MB." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-card border border-subtle rounded-2xl overflow-hidden group">
              <div className="aspect-video bg-inset flex items-center justify-center overflow-hidden">
                <img src={item.url} alt={item.alt || item.originalName} className="w-full h-full object-contain" />
              </div>
              <div className="p-3 space-y-2">
                <p className="text-[11px] font-bold text-neutral-900 dark:text-white truncate" title={item.originalName}>{item.originalName}</p>
                <p className="text-[10px] text-faint font-normal truncate">{item.url}</p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => copyUrl(`${window.location.origin}${item.url}`, item.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-subtle text-[9px] font-bold uppercase tracking-wider text-secondary hover:text-neutral-900 dark:hover:text-white transition-colors">
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
              try { await updateMedia(editAlt.id, { alt: editAlt.alt }); toast.success('Alt text saved'); setEditAlt(null); load(); }
              catch (err) { toast.error(err instanceof Error ? err.message : 'Save failed'); }
            }}>Save</AdminBtn>
          </div>
        </AdminModal>
      )}

      {confirmDelete && (
        <AdminModal title="Delete image" onClose={() => setConfirmDelete(null)} maxWidth="max-w-sm">
          <p className="text-sm text-secondary font-normal leading-relaxed mb-5">Delete “{confirmDelete.originalName}”? Images referenced by content will break — update those references first.</p>
          <div className="flex justify-end gap-2.5">
            <AdminBtn variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</AdminBtn>
            <AdminBtn variant="danger" onClick={async () => {
              try { await deleteMedia(confirmDelete.id); toast.success('Image deleted'); setConfirmDelete(null); load(); }
              catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed'); }
            }}>Delete</AdminBtn>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
