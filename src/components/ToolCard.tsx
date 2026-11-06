import { MouseEvent } from 'react';
import { ArrowUpRight, Bookmark } from 'lucide-react';
import { Tool } from '../types';
import { useToolStore } from '../context/ToolContext';
import { getCategory } from '../data/tools';
import { resolveToolAction } from '../lib/toolRouting';

interface ToolCardProps {
  tool: Tool;
}

export default function ToolCard({ tool }: ToolCardProps) {
  const { navigate, bookmarks, toggleBookmark } = useToolStore();
  const category = getCategory(tool.category);
  const isBookmarked = bookmarks.includes(tool.id);

  const handleBookmark = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    toggleBookmark(tool.id);
  };

  const handleOpenTool = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // never trigger the card's details navigation
    const action = resolveToolAction(tool);
    if (action.kind === 'external') {
      // Explicit user click on Open Tool: navigate to the exact configured
      // external URL immediately (delay applies to auto-open countdowns only).
      window.location.href = action.url;
      return;
    }
    if (action.kind === 'internal') {
      navigate('run', { tool });
      return;
    }
    // No registered implementation → show the unavailable/draft state instead
    // of inventing a fake interface.
    navigate('run', { tool });
  };

  return (
    <div
      onClick={() => navigate('tool', { tool })}
      role="link"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') navigate('tool', { tool }); }}
      className="tool-card bg-card border-subtle rounded-2xl sm:rounded-3xl border overflow-hidden w-full max-w-[310px] sm:max-w-none flex flex-col card-lift hover:border-neutral-400 dark:hover:border-neutral-600 group cursor-pointer relative focus-visible:outline-2 focus-accent"
    >
      {/* Icon band */}
      <div className="h-24 sm:h-28 bg-icon flex items-center justify-center relative border-b border-subtle overflow-hidden">
        <div className="transform group-hover:scale-110 transition-transform duration-500 text-secondary group-hover:text-neutral-900 dark:group-hover:text-white">
          {tool.icon}
        </div>

        {tool.isNew && (
          <div className="absolute top-2.5 right-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-widest">
            New
          </div>
        )}
        <button
          onClick={handleBookmark}
          aria-label={isBookmarked ? `Remove ${tool.name} from My Tools` : `Save ${tool.name} to My Tools`}
          className={`absolute top-2 left-2 p-1.5 rounded-lg transition-all ${
            isBookmarked
              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
              : 'text-gray-300 dark:text-neutral-600 hover:text-amber-500 bg-white/60 dark:bg-neutral-900/40 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          }`}
        >
          <Bookmark size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-3.5 sm:p-5 flex flex-col flex-grow">
        <span className="text-[9px] text-faint font-bold uppercase tracking-[0.16em] truncate">{category?.name}</span>

        <h3 className="text-[13px] sm:text-[15px] font-bold mt-1 leading-snug line-clamp-2 text-neutral-900 dark:text-white group-hover:underline decoration-1 underline-offset-2">
          {tool.name}
        </h3>
        <p className="text-[10px] sm:text-xs text-secondary mt-1.5 line-clamp-2 font-normal leading-relaxed">
          {tool.tagline}
        </p>

        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-subtle">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-faint">Free · No sign-up</span>

          <button
            onClick={handleOpenTool}
            onKeyDown={e => e.stopPropagation()}
            aria-label={`Open ${tool.name}`}
            className="group/btn ml-auto inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-[10px] bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold uppercase tracking-wider text-[10px] shadow-md shadow-neutral-900/25 dark:shadow-black/30 hover:bg-neutral-700 dark:hover:bg-neutral-200 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 active:translate-y-0 active:scale-90 focus-visible:outline-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-white"
          >
            <span className="hidden min-[380px]:inline">Open Tool</span>
            <ArrowUpRight size={13} className="transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
