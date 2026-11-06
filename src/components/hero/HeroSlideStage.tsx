/**
 * HeroSlideStage — the SINGLE shared renderer for a hero slide.
 *
 * Used unchanged by:
 *  1. the public homepage carousel (`Hero.tsx`), and
 *  2. the admin Hero Slide Studio live preview (`HeroSlidesManager.tsx`).
 *
 * One implementation means the preview cannot visually drift from the
 * homepage. All visual customization is expressed through validated settings
 * from `src/lib/heroVisual.ts`; defaults reproduce the pre-existing public
 * design exactly.
 */
import { ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { Tool } from '../../types';
import type { HeroSlide } from '../../lib/adminApi';
import {
  buildGradientBackground, buildImageFilter, getHeroImageUrl, rgbaOf,
  type HeroVisualSettings,
} from '../../lib/heroVisual';
import ToolVisual from '../ToolVisual';

/* Deduplicated image diagnostics (once per distinct URL+reason). */
const LOGGED_IMAGE_URLS = new Set<string>();

function logImageProblem(url: string, reason: string, docId?: string, title?: string) {
  const key = `${url}::${reason}`;
  if (LOGGED_IMAGE_URLS.has(key)) return;
  LOGGED_IMAGE_URLS.add(key);
  console.warn('[hero] hero slide image could NOT be rendered:', {
    docId: docId || '(no doc id)',
    title: title || '(untitled)',
    url,
    reason,
  });
  if (/^https?:\/\/(www\.)?ibb\.co\//i.test(url) && !/i\.ibb\.co\//i.test(url)) {
    console.warn(
      '[hero] That URL looks like an ImageBB share page, not a direct image file. ' +
      'Use the direct file URL (i.ibb.co/<…>.png/.jpg/…) from the image\u2019s embed options.'
    );
  }
}

function logImageLoaded(url: string, widthPx: number, docId?: string, title?: string) {
  const key = `${url}::loaded`;
  if (LOGGED_IMAGE_URLS.has(key)) return;
  LOGGED_IMAGE_URLS.add(key);
  console.info('[hero] hero slide image loaded OK:', { docId: docId || '(no doc id)', title: title || '(untitled)', url, widthPx });
}

export interface HeroSlideStageProps {
  tool: Tool;
  slide: HeroSlide;
  /** Pre-resolved (validated) visual settings — same object for preview + public. */
  visual: HeroVisualSettings;
  onOpenTool: () => void;
  onDetails: () => void;
  /** Chrome parity for the preview: inert nav controls + indicator dots. */
  chrome?: 'full' | 'preview';
}

export default function HeroSlideStage({ tool, slide, visual: s, onOpenTool, onDetails, chrome = 'full' }: HeroSlideStageProps) {
  const title = slide.title || tool.name;
  const eyebrow = slide.eyebrow || `Featured · ${tool.category.replace('-', ' & ')}`;
  const description = slide.description || tool.description;
  const primaryLabel = slide.primaryLabel || 'Open Tool';
  const secondaryLabel = slide.secondaryLabel || 'About This Tool'; // now actually wired (was hardcoded before)

  const imageUrl = getHeroImageUrl(slide);
  const canvasColor = (slide.backgroundColor || '#0b0b0d').trim();

  const align = s.text.alignment;
  const columnAlign =
    align === 'center' ? 'items-center text-center mx-auto'
    : align === 'right' ? 'items-end text-right ml-auto'
    : 'items-start text-left';
  const justifyAlign =
    align === 'center' ? 'justify-center'
    : align === 'right' ? 'justify-end'
    : 'justify-start';
  const eyebrowRow = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'items-center';
  const shadow = s.text.textShadow > 0 ? `0 2px 8px rgba(0,0,0,${(s.text.textShadow / 100).toFixed(2)})` : undefined;

  const warmthAlpha = Math.abs(s.image.warmth) / 100 * 0.22;
  const warmthColor = s.image.warmth > 0 ? '255,166,76' : '110,160,255';

  const openBtnStyle = (s.text.primaryBg || s.text.primaryText)
    ? { backgroundColor: s.text.primaryBg || undefined, color: s.text.primaryText || undefined }
    : undefined;
  const secondaryBtnStyle = (s.text.secondaryBg || s.text.secondaryText)
    ? {
        backgroundColor: s.text.secondaryBg || 'rgba(255,255,255,0.1)',
        color: s.text.secondaryText || undefined,
        borderColor: s.text.secondaryBg ? 'transparent' : undefined,
      }
    : undefined;

  return (
    <div className="absolute inset-0" style={{ backgroundColor: canvasColor }}>
      {/* Fallback visual (also renders when no image URL is configured) */}
      <ToolVisual icon={tool.icon} tint={tool.category} size="hero" align="right" className="absolute inset-0 !rounded-none border-0" />

      {/* CMS-configured slide image: the original file (never recompressed).
          Fit / focus / zoom / all adjustments come from shared settings. */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={slide.imageAlt || tool.name || 'Featured tool'}
          referrerPolicy="no-referrer"
          draggable={false}
          decoding="async"
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: s.position.fitMode,
            objectPosition: `${s.position.focusX}% ${s.position.focusY}%`,
            filter: buildImageFilter(s.image),
            opacity: s.position.imageOpacity / 100,
            transform: `scale(${(s.position.zoom / 100).toFixed(3)})`,
            transformOrigin: 'center',
          }}
          onLoad={e => {
            const img = e.currentTarget;
            logImageLoaded(img.currentSrc || img.src || imageUrl, img.naturalWidth, slide.__docId, slide.title);
          }}
          onError={e => {
            const img = e.currentTarget;
            logImageProblem(
              img.currentSrc || img.src || imageUrl,
              'image failed to load or decode (network error, non-image content type, hotlink block, or corrupt file)',
              slide.__docId,
              slide.title
            );
          }}
        />
      ) : null}

      {/* Warmth / temperature (soft-light blend — never flattens the photo) */}
      {warmthAlpha > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `rgb(${warmthColor})`, mixBlendMode: 'soft-light', opacity: warmthAlpha }}
        />
      )}

      {/* Subtle color tint */}
      {s.position.tintEnabled && s.position.tintOpacity > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: rgbaOf(s.position.tintColor, s.position.tintOpacity) }} />
      )}

      {/* Overlay color (explicitly enabled — off by default so images stay vivid) */}
      {s.overlay.enabled && s.overlay.opacity > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: rgbaOf(s.overlay.color, s.overlay.opacity) }} />
      )}

      {/* Overall darkness — an explicit control, never implicit stacking */}
      {s.overlay.darkness > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: `rgba(0,0,0,${(s.overlay.darkness / 100).toFixed(3)})` }} />
      )}

      {/* Directional gradient (independent from image brightness) */}
      {s.overlay.gradientEnabled && (s.overlay.gradientStartOpacity > 0 || s.overlay.gradientEndOpacity > 0) && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: buildGradientBackground(s.overlay) }} />
      )}

      {/* Vignette */}
      {s.position.vignette > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 46%, rgba(0,0,0,${(s.position.vignette / 100 * 0.72).toFixed(3)}) 100%)`,
          }}
        />
      )}

      {/* Slide content */}
      <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-20 z-20">
        <div className={`max-w-lg md:max-w-xl flex flex-col ${columnAlign}`}>
          <div className={`flex items-center gap-2 mb-3 sm:mb-4 ${eyebrowRow}`}>
            <span className="h-[2px] w-8 bg-blue-400/70"></span>
            <span
              className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em] text-white/70"
              style={{ color: s.text.eyebrowColor || undefined, textShadow: shadow }}
            >
              {eyebrow}
            </span>
          </div>

          <h2
            className="text-2xl sm:text-4xl lg:text-5xl font-extrabold mb-3 sm:mb-4 tracking-tight leading-[1.08] text-white"
            style={{ color: s.text.titleColor || undefined, textShadow: shadow }}
          >
            {title}
          </h2>

          <p
            className="text-xs sm:text-sm md:text-base text-gray-300 font-normal leading-relaxed mb-5 sm:mb-7 line-clamp-3 max-w-md"
            style={{ color: s.text.descriptionColor || undefined, textShadow: shadow }}
          >
            {description}
          </p>

          <div className={`flex flex-wrap gap-3 ${justifyAlign}`}>
            <button
              onClick={onOpenTool}
              className="group bg-white hover:bg-neutral-100 text-black px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              style={openBtnStyle}
            >
              <Play size={13} fill="currentColor" />
              <span>{primaryLabel}</span>
            </button>

            <button
              onClick={onDetails}
              className="group bg-white/10 hover:bg-white/20 border border-white/15 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              style={secondaryBtnStyle}
            >
              <span>{secondaryLabel}</span>
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Chrome parity for the preview (presented, but inert — the public
          carousel owns the working controls). */}
      {chrome === 'preview' && (
        <>
          <div className="absolute bottom-5 left-8 z-30 flex items-center gap-2 opacity-60 pointer-events-none" aria-hidden="true">
            <span className="w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center">
              <ChevronLeft size={16} />
            </span>
            <span className="w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center">
              <ChevronRight size={16} />
            </span>
          </div>
          <div className="absolute bottom-7 right-8 z-30 flex items-center gap-2 pointer-events-none" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-white" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
          </div>
        </>
      )}
    </div>
  );
}
