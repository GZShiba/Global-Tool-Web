import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { tools } from '../data/tools';

export default function ToolTicker() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const words = tools.map(tool => tool.name);
  // Repeat twice for seamless scrolling
  const repeatedWords = [...words, ...words];

  return (
    <div
      className="relative w-full overflow-hidden bg-neutral-950 text-white/40 py-2.5 sm:py-3 mt-8 sm:mt-10 select-none"
      aria-hidden="true"
    >
      <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-neutral-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-neutral-950 to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex gap-10 sm:gap-16 whitespace-nowrap min-w-full"
        animate={prefersReducedMotion ? undefined : { x: [0, -1500] }}
        transition={prefersReducedMotion ? undefined : { repeat: Infinity, ease: 'linear', duration: 35 }}
      >
        {repeatedWords.map((word, idx) => (
          <span
            key={idx}
            className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em]"
          >
            {word}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
