import { motion, AnimatePresence } from 'motion/react';
import { useToolStore } from '../context/ToolContext';
import ToolCard from './ToolCard';
import { ToolCardGridSkeleton, CmsErrorNote } from './skeletons';

export default function NewAndNoteworthy() {
  const { navigate, cmsState, tools: catalogTools } = useToolStore();

  // Newly added tools first, then the rest of the Firestore catalogue.
  const showcase = [...catalogTools]
    .sort((a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false))
    .slice(0, 8);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-8 sm:mt-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-7">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-[28px] font-extrabold text-neutral-900 dark:text-white tracking-tight">New &amp; Noteworthy</h2>
          <p className="text-xs sm:text-sm text-secondary font-normal mt-1.5">Fresh additions and recently expanded categories</p>
        </div>
        <button
          onClick={() => navigate('tools')}
          className="border-2 border-neutral-900 dark:border-white text-neutral-900 dark:text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] sm:text-xs hover:bg-accent hover:border-accent dark:hover:bg-accent dark:hover:border-accent transition-all active:scale-95 shrink-0 tap-feedback"
        >
          Browse All
        </button>
      </div>

      {cmsState === 'loading' ? (
        <ToolCardGridSkeleton count={8} />
      ) : cmsState === 'error' ? (
        <CmsErrorNote
          message="We couldn't reach the content service, so tool listings can't be shown right now."
          onRetry={() => window.location.reload()}
        />
      ) : showcase.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 justify-items-stretch">
          <AnimatePresence mode="popLayout">
            {showcase.map(tool => (
              <motion.div
                layout
                key={tool.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <ToolCard tool={tool} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-card border border-dashed border-gray-300 dark:border-neutral-800 rounded-[24px] py-12 text-center">
          <p className="text-sm font-bold text-neutral-900 dark:text-white">No new tools yet</p>
          <p className="text-xs text-secondary font-normal mt-1">Fresh tools will appear here as they launch.</p>
        </div>
      )}
    </section>
  );
}
