import { useEffect, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import { Tool } from '../types';
import { resolveToolAction } from '../lib/toolRouting';

/**
 * Compact auto-redirect countdown for Tool Details pages.
 *
 * Only rendered when the tool has an enabled external redirect WITH a
 * configured delay (see ToolPage gating). After the configured delay it
 * navigates to the exact external URL. Cancel stops it; "Open Now" skips
 * the wait. Leaving the page unmounts the component, which cancels any
 * pending navigation.
 */
export default function ToolRedirectCountdown({ tool }: { tool: Tool }) {
  const action = resolveToolAction(tool);
  const seconds = action.kind === 'external' ? action.delaySeconds : 0;
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  const [cancelled, setCancelled] = useState(false);
  const navigatedRef = useRef(false);

  const goExternal = () => {
    if (action.kind !== 'external' || navigatedRef.current) return; // never navigate twice
    navigatedRef.current = true;
    window.location.href = action.url;
  };

  useEffect(() => {
    if (cancelled) return;
    if (secondsLeft <= 0) {
      goExternal();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer); // unmount → pending navigation cancelled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, cancelled]);

  if (cancelled || action.kind !== 'external') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-xs bg-card border border-subtle rounded-2xl shadow-xl p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-faint block">
            Opening external site
          </span>
          <p className="text-[13px] font-semibold text-neutral-900 dark:text-white leading-snug mt-1 break-words">
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
          onClick={goExternal}
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
