import { useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import ExpandableSection from './ExpandableSection';

/**
 * Homepage FAQ section — placed immediately after the "What Is OmniToolify?"
 * section and before the Footer.
 *
 * Premium redesign notes:
 *  - Two-column layout on desktop: a sticky intro panel (heading, kicker,
 *    description, resources) beside the refined accordion list. On mobile the
 *    columns stack naturally.
 *  - Brand language is borrowed from the existing sections (WhyToolNest,
 *    HomepageSeoContent): the same card surfaces, radius scale, kicker chip,
 *    restrained ambient glow, and hairline accent — no new design language.
 *  - Smooth, meaningful animation: scroll-reveal entrance (once, honors
 *    prefers-reduced-motion), animated open/close via CSS grid-rows with an
 *    inner fade/slide, and a rotating indicator that fills when open.
 *  - SEO & accessibility: answers remain permanently mounted in the DOM
 *    (crawlable visible text regardless of state); real <button> controls
 *    with aria-expanded/aria-controls; panels are role="region" and marked
 *    `inert` while collapsed so hidden content is never focusable.
 *  - No FAQPage schema (Google discontinued FAQ rich results in May 2026).
 *  - Internal links point only to real routes (/tools, /about, /privacy).
 */

interface FaqItem {
  q: string;
  a: ReactNode;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'What is OmniToolify?',
    a: (
      <>
        OmniToolify is an online tools directory. Instead of keeping a dozen bookmarks for one-off utilities, you can
        browse a single, organized catalogue of digital tools, open the one you need, and get on with your work. The
        directory is grouped into categories, and every tool has its own page that explains what it does and how to open it.
      </>
    ),
  },
  {
    q: 'What can I do on OmniToolify?',
    a: (
      <>
        OmniToolify helps you find tools for everyday tasks — working with text, converting between formats, generating
        values, calculating numbers, preparing files, and similar digital jobs. The exact set of available tools is
        managed in the catalogue and shown under{' '}
        <a href="/tools" className="font-semibold underline decoration-1 underline-offset-2 text-neutral-900 dark:text-white hover:opacity-70 transition-opacity">All Tools</a>.
        Because some tools link out to an external service instead of working inside the browser, check a tool's page to
        see how it opens before you start.
      </>
    ),
  },
  {
    q: 'How do I find a specific tool?',
    a: (
      <>
        There are three ways. Use the search bar in the header — it matches tool names and descriptions as you type.
        Browse the category cards on the homepage, or open the complete listing under{' '}
        <a href="/tools" className="font-semibold underline decoration-1 underline-offset-2 text-neutral-900 dark:text-white hover:opacity-70 transition-opacity">All Tools</a>.
        Each tool page also shows related tools, so you can discover nearby utilities while you work.
      </>
    ),
  },
  {
    q: 'Do I need to install anything to use OmniToolify?',
    a: (
      <>
        No. OmniToolify is a website — there is nothing to download and no desktop installation. As long as you have a
        modern web browser, you can open the directory and start browsing. Tools that run in the browser work directly
        on the page; tools that open an external site will take you there in a new tab.
      </>
    ),
  },
  {
    q: 'Does OmniToolify work on mobile phones and tablets?',
    a: (
      <>
        Yes. The site is built to be responsive, so the layout, search, category cards, and tool pages adapt to phone,
        tablet, and desktop screens. Buttons and controls are sized for touch, and the accordion-style sections on this
        page work with both touch and keyboard input.
      </>
    ),
  },
  {
    q: 'Is OmniToolify free to use?',
    a: (
      <>
        Yes — browsing the directory and opening its tools is free, and there are no payment flows, paywalls, or trial
        counters anywhere in the app. If a tool links out to a third-party service, that service may have its own terms
        and pricing, which are always shown on the tool's own page.
      </>
    ),
  },
  {
    q: 'Do I need an account?',
    a: (
      <>
        No account is needed to browse or use the public site. You can bookmark tools by clicking the bookmark icon on a
        tool card — those bookmarks are saved privately in your browser and appear under “My Tools”. Nothing on the public
        site requires signing in.
      </>
    ),
  },
  {
    q: 'Are my files and data kept private?',
    a: (
      <>
        For tools that run in your browser, your input — pasted text, selected files, and entered values — is processed
        on your device using standard browser APIs. OmniToolify keeps only two small preferences in your browser's local
        storage (your theme choice and your bookmarks), and neither leaves your browser. This is described in detail on
        the{' '}
        <a href="/privacy" className="font-semibold underline decoration-1 underline-offset-2 text-neutral-900 dark:text-white hover:opacity-70 transition-opacity">Privacy Policy</a>{' '}
        page. One honest caveat: if a tool opens an external website, that site's own privacy
        practices apply to anything you do there.
      </>
    ),
  },
  {
    q: 'What categories of tools are available?',
    a: (
      <>
        The catalogue is organized into categories such as text utilities, converters, generators, developer helpers,
        calculators, and file and media tools. Categories are managed through the platform, and the current set is always
        visible on the homepage category cards and in the sidebar of the tools browser.
      </>
    ),
  },
  {
    q: 'How do new tools get added?',
    a: (
      <>
        New tools are published through the platform's content system. When a tool is published, it appears in its
        category, in search results, and on the “New & Noteworthy” section of the homepage, so returning visitors can
        spot recent additions without searching.
      </>
    ),
  },
  {
    q: 'Where can I learn more about OmniToolify?',
    a: (
      <>
        The{' '}
        <a href="/about" className="font-semibold underline decoration-1 underline-offset-2 text-neutral-900 dark:text-white hover:opacity-70 transition-opacity">About page</a>{' '}
        explains the platform's purpose and approach, and the{' '}
        <a href="/privacy" className="font-semibold underline decoration-1 underline-offset-2 text-neutral-900 dark:text-white hover:opacity-70 transition-opacity">Privacy Policy</a>{' '}
        describes exactly how (and how little) data is handled.
      </>
    ),
  },
];

const EASE = [0.22, 0.61, 0.36, 1] as const;

export default function FaqSection() {
  // Multiple items may be open at once; each toggles independently.
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const reducedMotion = useReducedMotion();

  const toggle = (index: number) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  /** Arrow-key navigation between question buttons (WAI-ARIA accordion pattern). */
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      e.currentTarget.querySelectorAll('button[data-faq-btn]')
    ) as HTMLButtonElement[];
    if (buttons.length === 0) return;
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex === -1) return;
    let next = currentIndex;
    if (e.key === 'ArrowDown') next = (currentIndex + 1) % buttons.length;
    else if (e.key === 'ArrowUp') next = (currentIndex - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    else return;
    e.preventDefault();
    buttons[next].focus();
  };

  const reveal = (delay = 0) => ({
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.55, delay, ease: EASE },
  });

  return (
    <section
      className="max-w-7xl mx-auto px-4 md:px-8 mt-8 sm:mt-10 scroll-mt-24"
      aria-labelledby="faq-h2"
    >
      <motion.div
        {...reveal(0)}
        className="relative overflow-hidden bg-card border border-subtle rounded-[28px] sm:rounded-[32px] p-6 sm:p-10 lg:p-14 shadow-xl shadow-black/[0.03] dark:shadow-black/40"
      >
        {/* Ambient decorative glow — restrained, matches the brand's existing sections */}
        <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full blur-3xl opacity-50" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent 65%)' }} />
        <div className="pointer-events-none absolute -bottom-28 -left-24 w-80 h-80 rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10), transparent 65%)' }} />

        {/* Top hairline accent — same signature used by the "Why OmniToolify" section */}
        <div className="absolute inset-x-8 sm:inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10 lg:gap-16">
          {/* ---------- Intro panel (sticky on desktop) ---------- */}
          <motion.div
            {...reveal(0.05)}
            className="lg:sticky lg:top-10 self-start"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft text-accent font-bold uppercase tracking-[0.22em] text-[10px] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              FAQ
            </span>
            <h2 id="faq-h2" className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1] text-neutral-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-secondary text-sm sm:text-base font-normal leading-relaxed mt-4 max-w-md">
              Straight answers about what OmniToolify is, how it works, and what you can expect — written to be useful,
              not to sell.
            </p>

            <div className="mt-8 pt-6 border-t border-subtle max-w-md">
              <p className="text-[13px] font-bold text-neutral-900 dark:text-white mb-3">
                Still have a question?
              </p>
              <p className="text-xs text-secondary font-normal leading-relaxed mb-5">
                The best way to understand the platform is to see it in action — browse the catalogue or read how the
                platform is put together.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <a
                  href="/tools"
                  className="inline-flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                  Browse all tools
                  <ArrowRight size={12} />
                </a>
                <a
                  href="/about"
                  className="inline-flex items-center gap-2 border border-subtle text-secondary hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all active:scale-[0.98]"
                >
                  About OmniToolify
                </a>
              </div>
            </div>
          </motion.div>

          {/* ---------- Accordion list ---------- */}
          <motion.div
            {...reveal(0.1)}
            className="min-w-0"
            onKeyDown={handleKeyDown}
          >
            <ExpandableSection
              id="faq-list-preview"
              collapsedMaxHeightClass="max-h-[400px] sm:max-h-[480px] md:max-h-[560px] lg:max-h-[600px]"
              expandedLabel="View All Questions"
              collapsedLabel="Show Less"
            >
              <div className="space-y-3">
              {FAQ_ITEMS.map((item, index) => {
                const open = openItems.has(index);
                const btnId = `faq-btn-${index}`;
                const panelId = `faq-panel-${index}`;
                return (
                  <div
                    key={index}
                    className={`relative overflow-hidden rounded-2xl border transition-colors duration-300 ${
                      open
                        ? 'bg-inset/60 border-neutral-300/80 dark:border-neutral-600/60'
                        : 'bg-transparent border-transparent hover:bg-inset/40 hover:border-subtle'
                    }`}
                  >
                    {/* Open-state accent underline */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-blue-500/50 to-transparent origin-left transition-transform duration-500 ease-out ${
                        open ? 'scale-x-100' : 'scale-x-0'
                      }`}
                    />

                    <h3 className="text-base m-0">
                      <button
                        id={btnId}
                        type="button"
                        data-faq-btn
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => toggle(index)}
                        className="group w-full flex items-center justify-between gap-4 px-5 sm:px-6 text-left rounded-2xl focus-visible:outline-2 focus-visible:outline-blue-400 focus-visible:outline-offset-[-2px] min-h-[52px]"
                        style={{ paddingTop: 18, paddingBottom: 18 }}
                      >
                        <span className="text-[15px] sm:text-base font-bold text-neutral-900 dark:text-white leading-snug pr-2 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors duration-200">
                          {item.q}
                        </span>

                        {/* Expand indicator */}
                        <span
                          className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ease-out ${
                            open
                              ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-900'
                              : 'border-subtle bg-inset text-faint group-hover:text-neutral-900 dark:group-hover:text-white group-hover:border-neutral-400 dark:group-hover:border-neutral-600'
                          }`}
                          aria-hidden="true"
                        >
                          <ChevronDown
                            size={15}
                            className={`transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </button>
                    </h3>

                    {/* Answers stay mounted in the DOM at all times (crawlable).
                        Height animates via grid-rows; inner content fades/slides in. */}
                    <div
                      className={`grid transition-[grid-template-rows] ease-out ${
                        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                      style={{ transitionDuration: '350ms' }}
                    >
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={btnId}
                        inert={!open}
                        tabIndex={open ? 0 : -1}
                        className="overflow-hidden min-h-0 focus-visible:outline-none"
                      >
                        <div
                          className={`px-5 sm:px-6 pb-5 sm:pb-6 transition-all duration-300 ease-out ${
                            open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                          }`}
                        >
                          <p className="text-sm text-secondary font-normal leading-relaxed max-w-2xl">
                            {item.a}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </ExpandableSection>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
