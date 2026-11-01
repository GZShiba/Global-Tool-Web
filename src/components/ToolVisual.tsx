import { ReactNode } from 'react';

/* Category tint used to give each tool area a consistent identity */
const TINTS: Record<string, { from: string; to: string; accent: string }> = {
  text: { from: 'rgba(59,130,246,0.28)', to: 'rgba(59,130,246,0)', accent: '#60a5fa' },
  converters: { from: 'rgba(16,185,129,0.28)', to: 'rgba(16,185,129,0)', accent: '#34d399' },
  generators: { from: 'rgba(168,85,247,0.28)', to: 'rgba(168,85,247,0)', accent: '#c084fc' },
  'web-dev': { from: 'rgba(245,158,11,0.26)', to: 'rgba(245,158,11,0)', accent: '#fbbf24' },
  calculators: { from: 'rgba(14,165,233,0.26)', to: 'rgba(14,165,233,0)', accent: '#38bdf8' },
  files: { from: 'rgba(236,72,153,0.24)', to: 'rgba(236,72,153,0)', accent: '#f472b6' },
};

interface ToolVisualProps {
  icon: ReactNode;
  tint?: string; // category id
  size?: 'hero' | 'detail';
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Abstract, honest tool visual: a glassy app-icon presentation on a
 * category-tinted panel with a subtle grid. Deliberately NOT a fake
 * screenshot of the tool's interface.
 */
export default function ToolVisual({ icon, tint = 'text', size = 'detail', align = 'left', className = '' }: ToolVisualProps) {
  const t = TINTS[tint] ?? TINTS.text;
  const isHero = size === 'hero';

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 ${className}`}
      style={{ background: 'linear-gradient(135deg, #171717 0%, #0b0b0d 100%)' }}
      aria-hidden="true"
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Category tint glow */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 70% 25%, ${t.from} 0%, ${t.to} 55%)` }}
      />
      {/* Oversized ghost icon */}
      <div className={`absolute ${isHero ? '-right-10 -bottom-14' : '-right-8 -bottom-12'} opacity-[0.07] text-white pointer-events-none`}>
        <div style={{ transform: 'scale(4.5)' }}>{icon}</div>
      </div>

      {/* Icon presentation */}
      <div className={`absolute inset-0 flex items-center ${isHero ? 'px-8 sm:px-12' : 'px-8'} ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        <div
          className="relative rounded-3xl border border-white/15 shadow-2xl flex items-center justify-center"
          style={{
            width: isHero ? 120 : 104,
            height: isHero ? 120 : 104,
            background: 'linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ color: t.accent }}>{icon}</span>
          <span
            className="absolute inset-x-6 -bottom-px h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`, opacity: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}
