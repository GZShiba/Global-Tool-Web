import { ChevronRight, ArrowLeft, Info, AlertCircle } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { getCategory } from '../data/tools';
import { resolveToolAction } from '../lib/toolRouting';

export default function ToolRunPage() {
  const { selectedTool, navigate } = useToolStore();

  if (!selectedTool) return null;
  const tool = selectedTool;
  const category = getCategory(tool.category);
  const action = resolveToolAction(tool);

  return (
    <div className="min-h-screen pb-20">
      {/* Breadcrumbs */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center gap-1.5 text-xs sm:text-[13px] text-secondary overflow-x-auto no-scrollbar whitespace-nowrap">
        <button onClick={() => navigate('home')} className="hover:text-neutral-900 dark:hover:text-white transition-colors font-medium">Home</button>
        <ChevronRight size={13} className="shrink-0 text-faint" />
        <button onClick={() => navigate('tool', { tool })} className="hover:text-neutral-900 dark:hover:text-white transition-colors font-medium truncate">{tool.name}</button>
        <ChevronRight size={13} className="shrink-0 text-faint" />
        <span className="text-neutral-900 dark:text-white font-semibold">Use Tool</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {/* Compact tool header */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 bg-card border border-subtle rounded-2xl flex items-center justify-center text-secondary shrink-0">
              {tool.icon}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-tight truncate">{tool.name}</h1>
              <p className="text-[11px] sm:text-xs text-secondary font-normal mt-0.5 flex items-center gap-1.5">
                {category?.name}
                <span className="text-faint">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Info size={11} /> Runs in your browser
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('tool', { tool })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-subtle bg-card text-[11px] font-bold uppercase tracking-wider text-secondary hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft size={13} /> Tool Details
          </button>
        </div>

        {/* Working interface */}
        <div className="bg-card border border-subtle rounded-[24px] p-4 sm:p-6 md:p-8 shadow-sm">
          {action.kind === 'internal' ? null : (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-inset rounded-full flex items-center justify-center mx-auto mb-4 border border-subtle">
                <AlertCircle size={22} className="text-faint" />
              </div>
              {action.kind === 'external' ? (
                <>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white mb-1">This tool opens an external site</p>
                  <p className="text-xs text-faint font-normal">
                    Open it from the tool details page to continue.
                  </p>
                </>
              ) : action.reason === 'invalid-external-url' ? (
                <>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">This tool is temporarily unavailable</p>
                  <p className="text-xs text-faint font-normal">
                    Its external link isn't set up correctly yet. Please try again later.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white mb-1">This tool is not available yet</p>
                  <p className="text-xs text-faint font-normal">
                    No working implementation exists for this tool — check back soon.
                  </p>
                </>
              )}
              <button
                onClick={() => navigate('tool', { tool })}
                className="mt-6 px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all active:scale-[0.98]"
              >
                Back to Details
              </button>
            </div>
          )}
        </div>

        {/* Quick help */}
        <div className="mt-5 bg-inset border border-subtle rounded-2xl p-4 sm:p-5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint mb-2.5">Quick help</h2>
          <ol className="space-y-1.5">
            {tool.howTo.map((step, idx) => (
              <li key={idx} className="text-xs sm:text-[13px] text-secondary font-normal leading-relaxed flex gap-2">
                <span className="text-faint font-bold">{idx + 1}.</span> {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
