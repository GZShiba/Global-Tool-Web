import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowRight, Play } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { tools } from '../data/tools';
import ToolVisual from './ToolVisual';

const SLIDE_IDS = ['json-formatter', 'password-generator', 'image-resizer', 'word-counter', 'regex-tester'];

const AUTO_ROTATE_MS = 6000;
const DRAG_THRESHOLD = 60; // px — horizontal distance that triggers a slide change

export default function Hero() {
  const { navigate } = useToolStore();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const hoverRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragRef = useRef({ active: false, startX: 0, dx: 0, moved: false });

  const slides = SLIDE_IDS
    .map(id => tools.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

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

  // Auto-rotation: skipped entirely for reduced-motion users; pauses on hover/focus.
  useEffect(() => {
    if (prefersReducedMotion || isPaused) return;
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

  if (slides.length === 0) return null;
  const slide = slides[current];

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
        className="relative h-[380px] sm:h-[420px] md:h-[460px] lg:h-[500px] rounded-[28px] sm:rounded-[32px] overflow-hidden bg-[#0b0b0d] shadow-2xl select-none cursor-grab active:cursor-grabbing"
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
        {/* Ambient blue / indigo depth accents */}
        <div
          className="absolute -top-28 -right-20 w-[420px] h-[420px] rounded-full blur-3xl opacity-60 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.38) 0%, transparent 62%)' }}
        />
        <div
          className="absolute top-1/3 -left-24 w-[380px] h-[380px] rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.30) 0%, transparent 62%)' }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {/* Slide visual: consistent tool identity treatment, right-weighted */}
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 1.04 }}
              animate={{ scale: 1 }}
              transition={{ duration: 5.5, ease: 'linear' }}
              className="absolute inset-0"
            >
              <ToolVisual icon={slide.icon} tint={slide.category} size="hero" align="right" className="absolute inset-0 !rounded-none border-0" />
            </motion.div>

            {/* Depth gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0d] via-transparent to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0d] via-[#0b0b0d]/70 to-transparent z-10" />

            {/* Slide content */}
            <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-20 z-20">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="max-w-lg md:max-w-xl"
              >
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <span className="h-[2px] w-8 bg-blue-400/70"></span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
                    Featured · {slide.category.replace('-', ' & ')}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold mb-3 sm:mb-4 tracking-tight leading-[1.08] text-white">
                  {slide.name}
                </h2>

                <p className="text-xs sm:text-sm md:text-base text-gray-300 font-normal leading-relaxed mb-5 sm:mb-7 line-clamp-3 max-w-md">
                  {slide.description}
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate('run', { tool: slide })}
                    className="group bg-white hover:bg-neutral-100 text-black px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Open Tool</span>
                  </button>

                  <button
                    onClick={() => navigate('tool', { tool: slide })}
                    className="group bg-white/10 hover:bg-white/20 border border-white/15 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-2 transition-all active:scale-95"
                  >
                    <span>About This Tool</span>
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={14} />
                  </button>
                </div>
              </motion.div>
            </div>
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
              key={s.id}
              onClick={() => goTo(idx)}
              aria-label={`Go to slide ${idx + 1}: ${s.name}`}
              aria-current={current === idx}
              className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-blue-400 ${current === idx ? 'bg-blue-500 w-8' : 'bg-white/25 hover:bg-white/50 w-3'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
