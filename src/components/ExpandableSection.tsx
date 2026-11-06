import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExpandableSectionProps {
  /** Stable id used for aria-controls. */
  id: string;
  /** Responsive collapsed max-height classes, e.g. "max-h-[200px] sm:max-h-[300px]". */
  collapsedMaxHeightClass: string;
  /** Label shown while collapsed (e.g. "Read More"). */
  expandedLabel: string;
  /** Label shown while expanded (e.g. "Show Less"). */
  collapsedLabel: string;
  children: ReactNode;
}

/**
 * Responsive expand/collapse wrapper used by the homepage's "What Is
 * OmniToolify?" and FAQ sections.
 *
 * Design notes:
 *  - Content is ALWAYS present in the rendered DOM (clipped visually with
 *    overflow + max-height), so SEO text stays crawlable and screen readers
 *    can read everything.
 *  - The collapsed state clips with a responsive max-height (tuned per
 *    breakpoint via `collapsedMaxHeightClass`) and fades the bottom edge
 *    into the card background (var(--bg-card)) so text melts away softly.
 *  - The fade overlay is always mounted; it only becomes invisible when
 *    expanded, giving a smooth crossfade and a clean restore on collapse.
 *  - Height animates with a CSS max-height transition — no JS measurement,
 *    no layout thrash. prefers-reduced-motion is handled globally by the
 *    app stylesheet (all transitions shrink to ~0ms).
 */
export default function ExpandableSection({
  id,
  collapsedMaxHeightClass,
  expandedLabel,
  collapsedLabel,
  children,
}: ExpandableSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        id={id}
        className={`relative overflow-hidden transition-[max-height] duration-500 ease-out ${
          expanded ? 'max-h-[2400px]' : collapsedMaxHeightClass
        }`}
      >
        {children}

        {/* Fade into the card background — invisible while expanded. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 sm:h-14 transition-opacity duration-500 ${
            expanded ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ background: 'linear-gradient(to top, var(--bg-card), transparent)' }}
        />
      </div>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(v => !v)}
          className="group inline-flex items-center gap-2 border border-subtle rounded-full bg-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-secondary hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-blue-400 focus-visible:outline-offset-2"
        >
          {expanded ? collapsedLabel : expandedLabel}
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}
