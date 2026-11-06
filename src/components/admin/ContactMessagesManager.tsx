import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Search, Trash2, RefreshCw, Inbox, CheckCheck, Archive, Tag, Save } from 'lucide-react';
import {
  DEFAULT_SUBJECTS, fetchAllContactMessages, formatContactTime, updateContactMessageStatus,
  deleteContactMessage, getAllSubjects, saveSubjectsConfig, CUSTOM_SUBJECT_ID,
} from '../../lib/contactMessages';
import type { ContactMessage, ContactMessageStatus, ContactSubjectOption } from '../../lib/contactMessages';
import { AdminBtn, AdminEmpty, AdminModal, AdminSpinner, adminInputClass } from './adminUi';

type FilterTab = 'all' | 'new' | 'read' | 'archived';

const STATUS_META: Record<ContactMessageStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/40' },
  read: { label: 'Read', className: 'bg-neutral-100 dark:bg-neutral-800/60 text-secondary border-neutral-200/70 dark:border-neutral-700/60' },
  archived: { label: 'Archived', className: 'bg-neutral-100 dark:bg-neutral-800/60 text-faint border-neutral-200/70 dark:border-neutral-700/60' },
};

export default function ContactMessagesManager() {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [subjects, setSubjects] = useState<ContactSubjectOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortNewest, setSortNewest] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContactMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [subjectsSaved, setSubjectsSaved] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [msgList, subjList] = await Promise.all([fetchAllContactMessages(), getAllSubjects()]);
      setMessages(msgList);
      setSubjects(subjList);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load messages');
      setMessages([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counters = useMemo(() => {
    const list = messages || [];
    return {
      total: list.length,
      new: list.filter(m => m.status === 'new').length,
      read: list.filter(m => m.status === 'read').length,
      archived: list.filter(m => m.status === 'archived').length,
    };
  }, [messages]);

  const filtered = useMemo(() => {
    if (!messages) return [];
    const q = query.trim().toLowerCase();
    return messages
      .filter(m => (tab === 'all' ? true : m.status === tab))
      .filter(m => (subjectFilter === 'all' ? true : m.subjectType === subjectFilter || (subjectFilter === CUSTOM_SUBJECT_ID && m.subjectType === CUSTOM_SUBJECT_ID)))
      .filter(m => {
        if (!q) return true;
        return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(String(a.createdAt)).getTime() : 0;
        const tb = b.createdAt ? new Date(String(b.createdAt)).getTime() : 0;
        return sortNewest ? tb - ta : ta - tb;
      });
  }, [messages, tab, query, subjectFilter, sortNewest]);

  const setStatus = async (msg: ContactMessage, status: ContactMessageStatus) => {
    if (!msg.__docId || busy) return;
    setBusy(true);
    try {
      await updateContactMessageStatus(msg.__docId, status);
      await load();
      if (selected && selected.__docId === msg.__docId) {
        setSelected({ ...selected, status });
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete?.__docId || busy) return;
    setBusy(true);
    try {
      await deleteContactMessage(confirmDelete.__docId);
      setConfirmDelete(null);
      if (selected && selected.__docId === confirmDelete.__docId) setSelected(null);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete message');
    } finally {
      setBusy(false);
    }
  };

  const toggleSubject = (id: string) => {
    setSubjects(prev => prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    setSubjectsSaved(false);
  };

  const saveSubjects = async () => {
    setSavingSubjects(true);
    try {
      await saveSubjectsConfig(subjects);
      setSubjectsSaved(true);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save subject settings');
    } finally {
      setSavingSubjects(false);
    }
  };

  const tabBtn = (id: FilterTab, label: string, count: number) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`px-3.5 py-2 rounded-xl text-[11px] font-bold transition-colors ${tab === id ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-secondary hover:bg-inset hover:text-neutral-900 dark:hover:text-white'}`}
    >
      {label} <span className={`ml-1 text-[10px] ${tab === id ? 'opacity-70' : 'text-faint'}`}>{count}</span>
    </button>
  );

  if (messages === null) return <AdminSpinner label="Loading contact messages…" />;

  if (loadError) {
    return (
      <div className="bg-card border border-subtle rounded-2xl p-8 text-center">
        <p className="text-sm text-secondary font-normal mb-4">{loadError}</p>
        <AdminBtn onClick={load}><RefreshCw size={13} /> Retry</AdminBtn>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { key: 'total', label: 'Total messages', icon: <Inbox size={16} />, value: counters.total },
          { key: 'new', label: 'New', icon: <Mail size={16} />, value: counters.new },
          { key: 'read', label: 'Read', icon: <CheckCheck size={16} />, value: counters.read },
          { key: 'archived', label: 'Archived', icon: <Archive size={16} />, value: counters.archived },
        ] as const).map(c => (
          <div key={c.key} className="bg-card border border-subtle rounded-2xl p-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-inset text-secondary flex items-center justify-center shrink-0">{c.icon}</span>
            <div>
              <div className="text-xl font-extrabold text-neutral-900 dark:text-white leading-none">{c.value}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-faint mt-1">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-subtle rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">{tabBtn('all', 'All', counters.total)}{tabBtn('new', 'New', counters.new)}{tabBtn('read', 'Read', counters.read)}{tabBtn('archived', 'Archived', counters.archived)}</div>
        <div className="flex-1" />
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search name or email…"
              aria-label="Search messages"
              className={`${adminInputClass} pl-9 !py-2 w-full sm:w-56`}
            />
          </div>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} aria-label="Filter by subject" className={`${adminInputClass} !py-2 w-full sm:w-44 cursor-pointer`}>
            <option value="all">All subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            <option value={CUSTOM_SUBJECT_ID}>Custom Subject</option>
          </select>
          <button
            onClick={() => setSortNewest(v => !v)}
            className="px-3.5 py-2 rounded-xl border border-subtle text-secondary hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 text-[10px] font-bold uppercase tracking-wider transition-colors"
            title="Toggle sort order"
          >
            {sortNewest ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      </div>

      {/* Message list */}
      {filtered.length === 0 ? (
        <AdminEmpty
          title={messages.length === 0 ? 'No messages yet' : 'No messages match'}
          message={messages.length === 0 ? 'Contact form submissions will appear here.' : 'Try a different search or filter.'}
          action={<AdminBtn variant="secondary" onClick={() => { setQuery(''); setTab('all'); setSubjectFilter('all'); }}>Clear filters</AdminBtn>}
        />
      ) : (
        <div className="bg-card border border-subtle rounded-2xl overflow-hidden">
          {filtered.map(m => (
            <button
              key={m.__docId}
              onClick={() => setSelected(m)}
              className={`w-full text-left p-4 border-b border-subtle last:border-b-0 transition-colors hover:bg-inset/50 ${selected?.__docId === m.__docId ? 'bg-inset/60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">{m.name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${STATUS_META[m.status].className}`}>
                      {STATUS_META[m.status].label}
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary font-normal mt-0.5 truncate">{m.email} · {m.subject}</p>
                  <p className="text-xs text-faint font-normal mt-1 line-clamp-2">{m.message}</p>
                </div>
                <span className="text-[10px] text-faint font-normal shrink-0 pt-0.5">{formatContactTime(m.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <AdminModal title="Message details" onClose={() => setSelected(null)} maxWidth="max-w-2xl">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-inset/50 border border-subtle rounded-xl p-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-faint mb-1">From</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{selected.name}</p>
                <p className="text-xs text-secondary font-normal mt-0.5 break-all">{selected.email}</p>
              </div>
              <div className="bg-inset/50 border border-subtle rounded-xl p-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-faint mb-1">Received</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{formatContactTime(selected.createdAt) || '—'}</p>
                <p className="text-xs text-secondary font-normal mt-0.5">{selected.status}</p>
              </div>
            </div>

            <div className="bg-inset/50 border border-subtle rounded-xl p-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-faint mb-1">Subject</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">{selected.subject}</p>
            </div>

            <div className="bg-inset/50 border border-subtle rounded-xl p-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-faint mb-1">Message</p>
              <p className="text-sm text-secondary font-normal leading-relaxed whitespace-pre-wrap">{selected.message}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Status:</span>
                <AdminBtn variant={selected.status === 'new' ? 'primary' : 'secondary'} onClick={() => setStatus(selected, 'new')} disabled={busy}>New</AdminBtn>
                <AdminBtn variant={selected.status === 'read' ? 'primary' : 'secondary'} onClick={() => setStatus(selected, 'read')} disabled={busy}>Mark Read</AdminBtn>
                <AdminBtn variant={selected.status === 'archived' ? 'primary' : 'secondary'} onClick={() => setStatus(selected, 'archived')} disabled={busy}>Archive</AdminBtn>
              </div>
              <AdminBtn variant="danger" onClick={() => setConfirmDelete(selected)} disabled={busy}><Trash2 size={13} /> Delete</AdminBtn>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <AdminModal title="Delete message" onClose={() => setConfirmDelete(null)} maxWidth="max-w-sm">
          <p className="text-sm text-secondary font-normal leading-relaxed mb-5">
            Permanently delete the message from <strong className="text-neutral-900 dark:text-white">{confirmDelete.name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2.5">
            <AdminBtn variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</AdminBtn>
            <AdminBtn variant="danger" onClick={doDelete} disabled={busy}><Trash2 size={13} /> Delete</AdminBtn>
          </div>
        </AdminModal>
      )}

      {/* Subject management */}
      <div className="bg-card border border-subtle rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <Tag size={15} className="text-accent" />
          <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Contact form subjects</h3>
        </div>
        <p className="text-xs text-secondary font-normal mb-4">
          Enabled subjects appear in the public contact form. The Custom Subject option is always available. Submitted messages keep their original subject text even if an option is later disabled.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {subjects.map(s => (
            <label key={s.id} className="flex items-center gap-2.5 border border-subtle rounded-xl px-3.5 py-2.5 cursor-pointer hover:bg-inset/40 transition-colors">
              <input type="checkbox" checked={s.enabled} onChange={() => toggleSubject(s.id)} className="w-4 h-4 accent-blue-600" />
              <span className="text-[13px] font-medium text-neutral-900 dark:text-white">{s.label}</span>
              <span className="ml-auto text-[9px] text-faint font-bold uppercase tracking-widest">{s.enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <AdminBtn onClick={saveSubjects} disabled={savingSubjects}><Save size={13} /> {savingSubjects ? 'Saving…' : 'Save subjects'}</AdminBtn>
          {subjectsSaved && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Saved</span>}
        </div>
      </div>
    </div>
  );
}
