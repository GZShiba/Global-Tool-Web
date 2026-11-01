import { ShieldCheck, Zap, Wallet, Compass, ArrowRight } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';

export default function WhyToolNest() {
  const { navigate } = useToolStore();

  const values = [
    {
      icon: <ShieldCheck size={20} />,
      title: 'Private by design',
      desc: 'Every tool runs entirely in your browser. Your text, files, and data are processed on your device — nothing is uploaded.',
    },
    {
      icon: <Zap size={20} />,
      title: 'Instant and lightweight',
      desc: 'No loading queues, no accounts. Open a tool and use it immediately — results appear as fast as your device can compute them.',
    },
    {
      icon: <Wallet size={20} />,
      title: 'Free, with no catch',
      desc: 'All tools are free to use with no usage limits, paywalls, or sign-up forms. Bookmark your favorites and come back anytime.',
    },
    {
      icon: <Compass size={20} />,
      title: 'Curated, not cluttered',
      desc: 'Each tool solves a real, frequent task — with clear instructions and honest notes about what it can and cannot do.',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-8 sm:mt-10">
      <div className="relative overflow-hidden bg-card border border-subtle rounded-[28px] sm:rounded-[32px] p-6 sm:p-10 lg:p-14 shadow-xl shadow-black/[0.03] dark:shadow-black/40">
        {/* Ambient decorative glow — restrained, brand-tinted */}
        <div className="pointer-events-none absolute -top-24 -left-20 w-72 h-72 rounded-full blur-3xl opacity-60" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.14), transparent 65%)' }} />
        <div className="pointer-events-none absolute -bottom-28 -right-24 w-80 h-80 rounded-full blur-3xl opacity-50" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 65%)' }} />

        {/* Top hairline accent */}
        <div className="absolute inset-x-8 sm:inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="relative">
          <div className="max-w-2xl mb-8 sm:mb-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft text-accent font-bold uppercase tracking-[0.22em] text-[10px] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Why OmniToolify
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1] text-neutral-900 dark:text-white">
              Built for getting things done,
              <br className="hidden sm:block" />
              <span className="text-secondary"> not for keeping you waiting.</span>
            </h2>
            <p className="text-secondary text-sm sm:text-base font-normal leading-relaxed mt-4">
              Most online tools bury you in ads, uploads, and sign-up walls. OmniToolify takes a different approach: focused tools that respect your time and your privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
            {values.map((value, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden bg-gradient-to-b from-white to-gray-50 dark:from-neutral-800/70 dark:to-neutral-900 border border-subtle rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/[0.06] dark:hover:shadow-black/40 hover:border-neutral-300 dark:hover:border-neutral-600"
              >
                {/* Accent hairline reveal */}
                <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Ghost step number */}
                <span className="absolute top-4 right-5 text-[10px] font-bold tracking-[0.2em] text-faint/60 group-hover:text-accent/80 transition-colors duration-300">
                  0{idx + 1}
                </span>

                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/10 text-blue-600 dark:text-blue-400 shadow-sm transition-all duration-300 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white dark:group-hover:from-blue-500 dark:group-hover:to-indigo-500 group-hover:scale-105">
                  {value.icon}
                </div>
                <h3 className="text-[15px] sm:text-base font-bold text-neutral-900 dark:text-white tracking-tight mb-1.5">{value.title}</h3>
                <p className="text-secondary text-xs sm:text-sm font-normal leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 sm:mt-10 flex justify-center">
            <button
              onClick={() => navigate('tools')}
              className="group inline-flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-7 py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:-translate-y-0.5 hover:shadow-lg hover:shadow-neutral-900/20 dark:hover:shadow-black/40 transition-all duration-200 active:scale-[0.98] tap-feedback"
            >
              Explore All Tools
              <span className="w-5 h-5 rounded-full bg-white/15 dark:bg-neutral-900/10 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight size={12} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
