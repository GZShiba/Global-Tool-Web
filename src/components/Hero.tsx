import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { HeroSkeleton } from './skeletons';
import HeroSlideStage from './hero/HeroSlideStage';
import { HeroSlide } from '../lib/adminApi';
import { getActiveHeroSlidesCached, clearCmsCache } from '../lib/firestoreCms';
import { resolveToolAction } from '../lib/toolRouting';
import { resolveVisualSettings, type HeroVisualSettings } from '../lib/heroVisual';
import type { Tool } from '../types';

const AUTO_ROTATE_MS = 6000;
const DRAG_THRESHOLD = 60; // px — horizontal distance that triggers a slide change

interface HeroSlideData {
  tool: Tool;
  slide: HeroSlide;
  /** Pre-resolved settings so the public carousel and admin preview share one exact rendering path. */
  visual: HeroVisualSettings;
}

export default function Hero() {
  const { navigate, tools: catalogTools, cmsState } = useToolStore();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cmsSlides, setCmsSlides] = useState<HeroSlideData[]>([]);
  const [heroState, setHeroState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const hoverRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragRef = useRef({ active: false, startX: 0, dx: 0, moved: false });

  const slides: HeroSlideData[] = cmsSlides;

  const load = useCallback(async (force = false) => {
    if (force) clearCmsCache(); // a failed read is cached for the TTL — retry must bypass it
    setHeroState('loading');
    try {
      // Firestore is the single source of truth: no local-API or demo fallback.
      const fbSlides = await getActiveHeroSlidesCached();
      if (fbSlides === null) {
        setHeroState('error');
        return;
      }
      // Resolve each slide's linked tool from the real catalogue
      // (fed by cms_tools). Slides whose tool is not published are
      // admin-managed only and stay hidden publicly — not a silent data failure.
      const mapped = fbSlides
        .map(slide => {
          const tool = catalogTools.find(t => t.slug === slide.toolSlug);
          if (!tool) return null;
          // Shared resolution: identical settings object used by the studio.
          return { tool, slide, visual: resolveVisualSettings(slide) };
        })
        .filter((x): x is HeroSlideData => x !== null);
      setCmsSlides(mapped);
      setHeroState(mapped.length > 0 ? 'ready' : 'empty');
    } catch {
      setHeroState('error');
    }
  }, [catalogTools]);

  // Wait for the catalogue (cms_tools) to finish loading before mapping
  // slides — otherwise every slide would look "unlinked" mid-load.
  useEffect(() => {
    if (cmsState === 'loading') return; // keep showing the skeleton
    void load(false);
  }, [cmsState, load]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrent(((index % slides.length) + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-rotation: skipped entirely for reduced-motion users; pauses on hover/focus;
  // off until real slides are loaded.
  useEffect(() => {
    if (prefersReducedMotion || isPaused || slides.length === 0) return;
    timer.current = setInterval(() => setCurrent(prev => (prev + 1) % slides.length), AUTO_ROTATE_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [prefersReducedMotion, isPaused, slides.length]);

  /* ---- Drag / swipe support (mouse + touch via pointer events) ---- */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = { active: true, startX: e.clientX, dx: 0, moved: false };
    setIsPaused(true); // pause auto-rotation while interacting
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active) return;
    d.dx = e.clientX - d.startX;
    if (Math.abs(d.dx) > 10) d.moved = true;
  };

  const endDrag = () => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    if (d.moved) {
      suppressClickRef.current = true; // a drag is not a click — block child buttons
      if (d.dx <= -DRAG_THRESHOLD) goTo(current + 1);
      else if (d.dx >= DRAG_THRESHOLD) goTo(current - 1);
    }
    dragRef.current = { active: false, startX: 0, dx: 0, moved: false };
    setIsPaused(hoverRef.current); // resume rotation when not hovering
  };

  if (heroState === 'loading') {
    return <HeroSkeleton />;
  }
  if (heroState === 'error') {
    return (
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-5 sm:mt-6 lg:mt-8">
        <div
          className="h-[380px] sm:h-[420px] md:h-[460px] lg:h-[500px] rounded-[28px] sm:rounded-[32px] bg-card border border-subtle flex flex-col items-center justify-center text-center px-6"
          role="alert"
          aria-busy="false"
        >
          <div className="w-12 h-12 bg-inset rounded-full flex items-center justify-center mb-4 border border-subtle">
            <RefreshCw size={20} className="text-faint" />
          </div>
          <p className="text-sm font-bold text-neutral-900 dark:text-white mb-1">The featured tools carousel could not be loaded</p>
          <p className="text-xs text-secondary font-normal max-w-xs leading-relaxed">
            We couldn't reach the content service. Check your connection and try again.
          </p>
          <button
            onClick={() => void load(true)}
            className="mt-5 inline-flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] hover:opacity-90 transition-all active:scale-95"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </section>
    );
  }
  // Firestore responded but no active slides exist (fresh CMS) — the hero
  // content region is intentionally hidden. Never demo/default slides.
  if (slides.length === 0) return null;
  const entry = slides[current];
  const { tool: slide, slide: cms, visual } = entry;

  return (
    <section
      className="max-w-7xl mx-auto px-4 md:px-8 mt-5 sm:mt-6 lg:mt-8 overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured tools"
      onMouseEnter={() => { hoverRef.current = true; setIsPaused(true); }}
      onMouseLeave={() => { hoverRef.current = false; setIsPaused(false); }}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div
        className="relative h-[380px] sm:h-[420px] md:h-[460px] lg:h-[500px] rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl select-none cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={e => {
          if (suppressClickRef.current) {
            e.preventDefault();
            e.stopPropagation();
            suppressClickRef.current = false;
          }
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {/* Slide visual — the SAME shared renderer the admin live preview
                uses (Studio <=> homepage can never drift apart). */}
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 1.04 }}
              animate={{ scale: 1 }}
              transition={{ duration: 5.5, ease: 'linear' }}
              className="absolute inset-0"
            >
              <HeroSlideStage
                tool={slide}
                slide={cms}
                visual={visual}
                onOpenTool={() => {
                  const action = resolveToolAction(slide);
                  if (action.kind === 'external') {
                    window.location.href = action.url;
                    return;
                  }
                  navigate('run', { tool: slide });
                }}
                onDetails={() => navigate('tool', { tool: slide })}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next controls */}
        <div className="absolute bottom-5 left-6 sm:bottom-8 sm:left-12 lg:left-20 z-30 flex items-center gap-2">
          <button
            onClick={() => goTo(current - 1)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 border border-white/10 text-white flex items-center justify-center transition-all active:scale-90 focus-visible:outline-2 focus-visible:outline-blue-400"
            aria-label="Previous slide"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => goTo(current + 1)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 border border-white/10 text-white flex items-center justify-center transition-all active:scale-90 focus-visible:outline-2 focus-visible:outline-blue-400"
            aria-label="Next slide"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Pagination indicators */}
        <div className="absolute bottom-7 right-6 sm:bottom-9 sm:right-12 lg:right-20 z-30 flex items-center gap-2">
          {slides.map((s, idx) => (
            <button
              key={s.tool.id}
              onClick={() => goTo(idx)}
              aria-label={`Go to slide ${idx + 1}: ${s.tool.name}`}
              aria-current={current === idx}
              className={`h-2.5 rounded-full transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-400 ${
                current === idx ? 'w-6 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
