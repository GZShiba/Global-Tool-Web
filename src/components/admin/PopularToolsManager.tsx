import { useEffect, useState } from 'react';
import { Star, Plus, X, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { PopularConfig, getPopularConfig, updatePopularConfig } from '../../lib/adminApi';
import { tools, getCategory } from '../../data/tools';
import { AdminBtn, AdminField, AdminSpinner, adminInputClass } from './adminUi';

export default function PopularToolsManager() {
  const [cfg, setCfg] = useState<PopularConfig | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPopularConfig().then(setCfg).catch(() => setCfg({ enabled: true, maxCards: 4, toolIds: [] }));
  }, []);

  if (!cfg) return <AdminSpinner label="Loading popular tools config…" />;

  const chosen = tools.filter(t => cfg.toolIds.includes(t.id));
  const available = tools.filter(t => !cfg.toolIds.includes(t.id));

  const add = (id: string) => {
    setCfg(prev => ({ ...prev, toolIds: [...prev.toolIds, id] }));
  };
  const remove = (id: string) => {
    setCfg(prev => ({ ...prev, toolIds: prev.toolIds.filter(t => t !== id) }));
  };
  const move = (index: number, dir: -1 | 1) => {
    setCfg(prev => {
      const list = [...prev.toolIds];
      const target = index + dir;
      if (target < 0 || target >= list.length) return prev;
      const [item] = list.splice(index, 1);
      list.splice(target, 0, item);
      return { ...prev, toolIds: list };
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      await updatePopularConfig(cfg);
      toast.success('Popular tools configuration saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
        <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-900 dark:text-white cursor-pointer">
          <input type="checkbox" checked={cfg.enabled} onChange={e => setCfg(prev => ({ ...prev, enabled: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
          Show “Most Popular Tools” on the homepage
        </label>
        <AdminField label="Maximum cards" hint="Sensible limit, e.g. 4–8">
          <input
            type="number" min={1} max={12}
            className={`${adminInputClass} w-32`}
            value={cfg.maxCards}
            onChange={e => setCfg(prev => ({ ...prev, maxCards: Math.max(1, Math.min(12, Number(e.target.value) || 4)) }))}
          />
        </AdminField>
      </div>

      <div className="bg-card border border-subtle rounded-2xl p-5">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-3 flex items-center gap-2"><Star size={15} className="text-accent" /> Selected tools ({chosen.length})</h3>
        {chosen.length === 0 ? (
          <p className="text-xs text-secondary font-normal">No tools selected. Add tools from the list below.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {chosen.map((tool, idx) => (
              <div key={tool.id} className="flex items-center gap-3 bg-inset border border-subtle rounded-xl px-3 py-2">
                <div className="flex flex-col">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up" className="text-faint hover:text-neutral-900 dark:hover:text-white disabled:opacity-30"><ChevronUp size={13} /></button>
                  <button onClick={() => move(idx, 1)} disabled={idx === chosen.length - 1} aria-label="Move down" className="text-faint hover:text-neutral-900 dark:hover:text-white disabled:opacity-30"><ChevronDown size={13} /></button>
                </div>
                <div className="w-7 h-7 rounded-lg bg-icon flex items-center justify-center text-secondary">{tool.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-neutral-900 dark:text-white truncate">{tool.name}</p>
                  <p className="text-[10px] text-faint font-normal">{getCategory(tool.category)?.name}</p>
                </div>
                <button onClick={() => remove(tool.id)} aria-label="Remove" className="text-faint hover:text-red-600"><X size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-subtle rounded-2xl p-5">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-3">Add from catalogue</h3>
        {available.length === 0 ? (
          <p className="text-xs text-secondary font-normal">All tools are already selected.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {available.map(tool => (
              <button key={tool.id} onClick={() => add(tool.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-subtle text-secondary hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 text-xs font-medium transition-colors">
                <Plus size={13} /> {tool.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <AdminBtn onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Configuration'}</AdminBtn>
      </div>
    </div>
  );
}
