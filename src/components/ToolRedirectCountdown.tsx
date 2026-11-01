import { useEffect, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { Tool } from '../types';

const COUNTDOWN_SECONDS = 5;

/**
 * Compact auto-redirect countdown for Tool Details pages.
 * After 5 seconds it navigates to the working tool route via the
 * existing navigate('run') logic. Cancel stops it; Open Now skips it.
 *
 * Must be keyed by tool id at the usage site so switching tools
 * remounts it (fresh timer, no stale navigation).
 */
export default function ToolRedirectCountdown({ tool }: { tool: Tool }) {
  const { navigate } = useToolStore();
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [cancelled, setCancelled] = useState(false);
  const navigatedRef = useRef(false);

  const goToRun = () => {
    if (navigatedRef.current) return; // never redirect twice
    navigatedRef.current = true;
    navigate('run', { tool });
  };

  useEffect(() => {
    if (cancelled) return;
    if (secondsLeft <= 0) {
      goToRun();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, cancelled]);

  if (cancelled) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-xs bg-card border border-subtle rounded-2xl shadow-xl p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-faint block">
            Auto-opening tool
          </span>
          <p className="text-[13px] font-semibold text-neutral-900 dark:text-white leading-snug mt-1">
            {tool.name} in {secondsLeft}s
          </p>
        </div>
        <span
          className="w-8 h-8 bg-inset border border-subtle rounded-lg flex items-center justify-center text-sm font-bold text-neutral-900 dark:text-white tabular-nums shrink-0"
          aria-hidden="true"
        >
          {secondsLeft}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={goToRun}
          className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-3 py-2 min-h-[44px] rounded-xl text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all active:scale-[0.98]"
        >
          <Play size={11} fill="currentColor" /> Open Now
        </button>
        <button
          onClick={() => setCancelled(true)}
          className="flex-1 flex items-center justify-center gap-1.5 border border-subtle text-secondary px-3 py-2 min-h-[44px] rounded-xl text-[10px] font-bold uppercase tracking-wider hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 transition-all active:scale-[0.98]"
          aria-label="Cancel automatic redirect"
        >
          <X size={11} /> Cancel
        </button>
      </div>
    </div>
  );
}
