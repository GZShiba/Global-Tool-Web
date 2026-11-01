import { SearchX, ArrowLeft } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';

export default function NotFoundPage() {
  const { navigate } = useToolStore();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-inset border border-subtle flex items-center justify-center mx-auto mb-5">
          <SearchX size={26} className="text-faint" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Page not found
        </h1>
        <p className="text-secondary text-sm font-normal leading-relaxed mt-3">
          The page or tool you're looking for doesn't exist, or it may have moved. Check the URL or browse the full tool collection.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('home')}
            className="inline-flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-5 py-2.5 min-h-[44px] rounded-xl font-bold uppercase tracking-wider text-xs hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <ArrowLeft size={14} /> Home
          </button>
          <button
            onClick={() => navigate('tools')}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl border border-subtle text-secondary text-xs font-bold uppercase tracking-wider hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 transition-all active:scale-[0.98]"
          >
            All Tools
          </button>
        </div>
      </div>
    </div>
  );
}
