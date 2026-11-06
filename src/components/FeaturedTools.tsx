import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { getPublicPopular } from '../lib/adminApi';
import { getPopularConfigCached } from '../lib/firestoreCms';
import { isFirebaseConfigured } from '../lib/firebase';
import ToolCard from './ToolCard';
import { ToolCardGridSkeleton, CmsErrorNote } from './skeletons';

export default function FeaturedTools() {
  const { navigate, cmsState, tools: catalogTools } = useToolStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [cmsToolIds, setCmsToolIds] = useState<string[] | null>(null);
  const [cmsEnabled, setCmsEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fbCfg = await getPopularConfigCached();
        if (cancelled) return;
        if (fbCfg) {
          setCmsEnabled(fbCfg.enabled);
          setCmsToolIds(fbCfg.toolIds);
          return;
        }
        if (isFirebaseConfigured()) {
          // Firestore configured but no popular document yet → fresh CMS: empty popular.
          setCmsEnabled(true);
          setCmsToolIds([]);
          return;
        }
        const localCfg = await getPublicPopular();
        if (cancelled) return;
        if (localCfg) {
          setCmsEnabled(localCfg.enabled);
          setCmsToolIds(localCfg.toolIds);
          return;
        }
        // Legacy API unavailable → resolve to empty instead of skeletonizing forever.
        setCmsEnabled(true);
        setCmsToolIds([]);
      } catch {
        // Never leave the section skeletonized forever — resolve to empty.
        setCmsEnabled(true);
        setCmsToolIds([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  let featured: (typeof catalogTools)[number][] = [];
  if (cmsEnabled && cmsToolIds) {
    const byId = new Map(catalogTools.map(t => [t.id, t]));
    const ordered = cmsToolIds.map(id => byId.get(id)).filter((t): t is (typeof catalogTools)[number] => Boolean(t));
    featured = ordered.slice(0, 8);
  }

  // Skeleton while the featured configuration OR the tool catalogue is still
  // loading — no empty state flashes before the first Firestore response.
  const isLoading = cmsToolIds === null || cmsState === 'loading';

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-8 sm:mt-10">
      <div className="flex justify-between items-center mb-6 sm:mb-7">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-[28px] font-extrabold text-neutral-900 dark:text-white tracking-tight">Most Popular Tools</h2>
          <p className="text-xs sm:text-sm text-secondary font-normal mt-1.5">The tools our users reach for every day</p>
        </div>
        <button
          onClick={() => navigate('tools')}
          className="border-2 border-neutral-900 dark:border-white text-neutral-900 dark:text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] sm:text-xs hover:bg-accent hover:border-accent dark:hover:bg-accent dark:hover:border-accent transition-all active:scale-95 shrink-0 tap-feedback"
        >
          View All
        </button>
      </div>

      {isLoading ? (
        <ToolCardGridSkeleton count={8} />
      ) : cmsState === 'error' ? (
        <CmsErrorNote
          message="We couldn't reach the content service, so popular tools can't be shown right now."
          onRetry={() => window.location.reload()}
        />
      ) : featured.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 justify-items-stretch">
          {featured.map((tool, index) => (
            <div key={tool.id} className={`${!isExpanded && index >= 4 ? 'hidden lg:block' : 'block'}`}>
              <ToolCard tool={tool} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-dashed border-gray-300 dark:border-neutral-800 rounded-[24px] py-12 text-center">
          <p className="text-sm font-bold text-neutral-900 dark:text-white">No popular tools configured yet</p>
          <p className="text-xs text-secondary font-normal mt-1">Tools marked as Popular in the Admin Panel will appear here.</p>
        </div>
      )}

      <div className="text-center mt-7 lg:hidden">
        <button
          className="border border-subtle bg-card hover:border-neutral-400 dark:hover:border-neutral-600 px-5 py-2.5 rounded-xl font-bold text-xs text-neutral-900 dark:text-white transition-colors inline-flex items-center gap-2 tap-feedback"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'View Less' : 'View More Tools'}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
    </section>
  );
}
