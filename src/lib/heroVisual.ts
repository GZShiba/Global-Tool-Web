/**
 * Hero slide visual configuration — the single rendering engine shared by the
 * admin live preview and the public homepage Hero.
 *
 * All numeric values are stored in safe, clamped ranges and map directly to
 * CSS filter/gradient/overlay rules in `HeroSlideStage.tsx`. Defaults are
 * neutral and reproduce the existing public design, so slides saved before
 * this system existed render exactly as before (never excessively darkened).
 */
import type { HeroSlide } from './adminApi';

export interface HeroImageAdjustments {
  brightness: number;   // % — 0..200 (100 = unchanged)
  contrast: number;     // % — 0..200
  saturation: number;   // % — 0..200
  exposure: number;     // -50..50 additional brightness multiplier
  blur: number;         // px — 0..20
  grayscale: number;    // % — 0..100
  sepia: number;        // % — 0..100
  hueRotate: number;    // deg — -180..180
  warmth: number;       // -100..100 (cool ↔ warm tint layer)
}

export interface HeroOverlaySettings {
  enabled: boolean;
  color: string;        // hex
  opacity: number;      // % — 0..100
  darkness: number;     // % — 0..100 (separate black layer)
  gradientEnabled: boolean;
  gradientDirection: 'to-right' | 'to-left' | 'to-top' | 'to-bottom';
  gradientStartColor: string;
  gradientStartOpacity: number;  // % — 0..100
  gradientEndColor: string;
  gradientEndOpacity: number;    // % — 0..100
  gradientIntensity: number;     // % — 0..200 multiplier on both stops
}

export interface HeroPositionSettings {
  fitMode: 'cover' | 'contain';
  focusX: number;       // % — 0..100 horizontal focus
  focusY: number;       // % — 0..100 vertical focus
  zoom: number;         // % — 100..300 (100 = no zoom)
  imageOpacity: number; // % — 0..100
  vignette: number;     // % — 0..100
  tintEnabled: boolean;
  tintColor: string;
  tintOpacity: number;  // % — 0..100
}

export interface HeroTextSettings {
  eyebrowColor: string;       // '' = inherit design default
  titleColor: string;
  descriptionColor: string;
  primaryBg: string;
  primaryText: string;
  secondaryBg: string;
  secondaryText: string;
  textShadow: number;         // % — 0..100
  alignment: 'left' | 'center' | 'right';
}

export interface HeroVisualSettings {
  image: HeroImageAdjustments;
  overlay: HeroOverlaySettings;
  position: HeroPositionSettings;
  text: HeroTextSettings;
  preset?: string;            // last preset applied (informational)
}

export const DEFAULT_HERO_VISUAL_SETTINGS: HeroVisualSettings = {
  image: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    exposure: 0,
    blur: 0,
    grayscale: 0,
    sepia: 0,
    hueRotate: 0,
    warmth: 0,
  },
  overlay: {
    enabled: false,
    color: '#0b0b0d',
    opacity: 30,
    darkness: 0,
    gradientEnabled: true,
    gradientDirection: 'to-right',
    gradientStartColor: '#0b0b0d',
    gradientStartOpacity: 85,
    gradientEndColor: '#0b0b0d',
    gradientEndOpacity: 0,
    gradientIntensity: 100,
  },
  position: {
    fitMode: 'cover',
    focusX: 50,
    focusY: 50,
    zoom: 100,
    imageOpacity: 100,
    vignette: 0,
    tintEnabled: false,
    tintColor: '#1e3a8a',
    tintOpacity: 15,
  },
  text: {
    eyebrowColor: '',
    titleColor: '',
    descriptionColor: '',
    primaryBg: '',
    primaryText: '',
    secondaryBg: '',
    secondaryText: '',
    textShadow: 0,
    alignment: 'left',
  },
};

/* ------------------------------------------------------------------ */
/* Clamping                                                            */
/* ------------------------------------------------------------------ */

export function clampNum(value: unknown, min: number, max: number, fallback: number, step = 1): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  // Round to the step precision so CSS never receives tiny float noise.
  const clamped = Math.min(max, Math.max(min, n));
  return Math.round(clamped / step) * step;
}

function clampColor(value: unknown, fallback: string): string {
  const v = typeof value === 'string' ? value.trim() : '';
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;
}

function clampOptionalColor(value: unknown): string {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return '';
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : '';
}

const GRADIENT_DIRECTIONS = ['to-right', 'to-left', 'to-top', 'to-bottom'] as const;
const FIT_MODES = ['cover', 'contain'] as const;
const ALIGNMENTS = ['left', 'center', 'right'] as const;

/* ------------------------------------------------------------------ */
/* Resolution (schema defaults + legacy field migration)               */
/* ------------------------------------------------------------------ */

/**
 * Resolve an editable slide (possibly unsaved form values) into a complete,
 * validated settings object. Older slides without `visualSettings` get the
 * defaults; a legacy `focusPoint` string ("top"/"bottom"…) still positions
 * the image until the studio writes explicit focus values.
 */
export function resolveVisualSettings(slide?: Partial<HeroSlide> | null): HeroVisualSettings {
  const raw = (slide?.visualSettings ?? null) as Partial<HeroVisualSettings> | null;
  const d = DEFAULT_HERO_VISUAL_SETTINGS;
  const image: Partial<HeroImageAdjustments> = raw?.image ?? {};
  const overlay: Partial<HeroOverlaySettings> = raw?.overlay ?? {};
  const position: Partial<HeroPositionSettings> = raw?.position ?? {};
  const text: Partial<HeroTextSettings> = raw?.text ?? {};

  const resolved: HeroVisualSettings = {
    image: {
      brightness: clampNum(image.brightness, 0, 200, d.image.brightness),
      contrast: clampNum(image.contrast, 0, 200, d.image.contrast),
      saturation: clampNum(image.saturation, 0, 200, d.image.saturation),
      exposure: clampNum(image.exposure, -50, 50, d.image.exposure),
      blur: clampNum(image.blur, 0, 20, d.image.blur),
      grayscale: clampNum(image.grayscale, 0, 100, d.image.grayscale),
      sepia: clampNum(image.sepia, 0, 100, d.image.sepia),
      hueRotate: clampNum(image.hueRotate, -180, 180, d.image.hueRotate),
      warmth: clampNum(image.warmth, -100, 100, d.image.warmth),
    },
    overlay: {
      enabled: typeof overlay.enabled === 'boolean' ? overlay.enabled : d.overlay.enabled,
      color: clampColor(overlay.color, d.overlay.color),
      opacity: clampNum(overlay.opacity, 0, 100, d.overlay.opacity),
      darkness: clampNum(overlay.darkness, 0, 100, d.overlay.darkness),
      gradientEnabled: typeof overlay.gradientEnabled === 'boolean' ? overlay.gradientEnabled : d.overlay.gradientEnabled,
      gradientDirection: GRADIENT_DIRECTIONS.includes(overlay.gradientDirection as never)
        ? overlay.gradientDirection as HeroOverlaySettings['gradientDirection']
        : d.overlay.gradientDirection,
      gradientStartColor: clampColor(overlay.gradientStartColor, d.overlay.gradientStartColor),
      gradientStartOpacity: clampNum(overlay.gradientStartOpacity, 0, 100, d.overlay.gradientStartOpacity),
      gradientEndColor: clampColor(overlay.gradientEndColor, d.overlay.gradientEndColor),
      gradientEndOpacity: clampNum(overlay.gradientEndOpacity, 0, 100, d.overlay.gradientEndOpacity),
      gradientIntensity: clampNum(overlay.gradientIntensity, 0, 200, d.overlay.gradientIntensity),
    },
    position: {
      fitMode: FIT_MODES.includes(position.fitMode as never)
        ? position.fitMode as HeroPositionSettings['fitMode']
        : d.position.fitMode,
      focusX: clampNum(position.focusX, 0, 100, d.position.focusX),
      focusY: clampNum(position.focusY, 0, 100, d.position.focusY),
      zoom: clampNum(position.zoom, 100, 300, d.position.zoom),
      imageOpacity: clampNum(position.imageOpacity, 0, 100, d.position.imageOpacity),
      vignette: clampNum(position.vignette, 0, 100, d.position.vignette),
      tintEnabled: typeof position.tintEnabled === 'boolean' ? position.tintEnabled : d.position.tintEnabled,
      tintColor: clampColor(position.tintColor, d.position.tintColor),
      tintOpacity: clampNum(position.tintOpacity, 0, 100, d.position.tintOpacity),
    },
    text: {
      eyebrowColor: clampOptionalColor(text.eyebrowColor),
      titleColor: clampOptionalColor(text.titleColor),
      descriptionColor: clampOptionalColor(text.descriptionColor),
      primaryBg: clampOptionalColor(text.primaryBg),
      primaryText: clampOptionalColor(text.primaryText),
      secondaryBg: clampOptionalColor(text.secondaryBg),
      secondaryText: clampOptionalColor(text.secondaryText),
      textShadow: clampNum(text.textShadow, 0, 100, d.text.textShadow),
      alignment: ALIGNMENTS.includes(text.alignment as never)
        ? text.alignment as HeroTextSettings['alignment']
        : d.text.alignment,
    },
    preset: typeof raw?.preset === 'string' ? raw.preset : undefined,
  };

  // Legacy migration: slides saved with the old single-string `focusPoint`
  // keep their positioning until the studio writes focusX/focusY.
  if (raw === null && slide?.focusPoint) {
    const fp = slide.focusPoint.trim().toLowerCase();
    const map: Record<string, [number, number]> = {
      'center': [50, 50], 'top': [50, 0], 'bottom': [50, 100],
      'left': [0, 50], 'right': [100, 50],
    };
    if (map[fp]) {
      resolved.position.focusX = map[fp][0];
      resolved.position.focusY = map[fp][1];
    }
  }

  return resolved;
}

/** True when any image adjustment deviates from neutral. */
export function imageAdjustmentsActive(s: HeroImageAdjustments): boolean {
  return (
    s.brightness !== 100 || s.contrast !== 100 || s.saturation !== 100 ||
    s.exposure !== 0 || s.blur !== 0 || s.grayscale !== 0 ||
    s.sepia !== 0 || s.hueRotate !== 0 || s.warmth !== 0
  );
}

/* ------------------------------------------------------------------ */
/* CSS builders                                                        */
/* ------------------------------------------------------------------ */

/** Hex → rgba() with 0..1 alpha. Invalid hex falls back to transparent black. */
export function rgbaOf(hex: string, opacityPercent: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex || '');
  if (!m) return `rgba(0,0,0,${clampNum(opacityPercent, 0, 100, 0) / 100})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const a = clampNum(opacityPercent, 0, 100, 0) / 100;
  return `rgba(${r},${g},${b},${a})`;
}

/** Compose the CSS filter() string from clamped adjustment values. */
export function buildImageFilter(s: HeroImageAdjustments): string {
  const exposureFactor = 1 + s.exposure / 100; // 0.5 .. 1.5
  const parts: string[] = [
    `brightness(${clampNum((s.brightness / 100) * exposureFactor * 100, 0, 300, 100)}%)`,
    `contrast(${s.contrast}%)`,
    `saturate(${s.saturation}%)`,
  ];
  if (s.grayscale > 0) parts.push(`grayscale(${s.grayscale}%)`);
  if (s.sepia > 0) parts.push(`sepia(${s.sepia}%)`);
  if (s.hueRotate !== 0) parts.push(`hue-rotate(${s.hueRotate}deg)`);
  if (s.blur > 0) parts.push(`blur(${s.blur}px)`);
  return parts.join(' ');
}

/** Build the gradient overlay CSS background from settings. */
export function buildGradientBackground(s: HeroOverlaySettings): string {
  const dirMap: Record<HeroOverlaySettings['gradientDirection'], string> = {
    'to-right': 'to right',
    'to-left': 'to left',
    'to-top': 'to top',
    'to-bottom': 'to bottom',
  };
  const intensity = clampNum(s.gradientIntensity, 0, 200, 100) / 100;
  const startA = (clampNum(s.gradientStartOpacity, 0, 100, 0) / 100) * intensity;
  const endA = (clampNum(s.gradientEndOpacity, 0, 100, 0) / 100) * intensity;
  return `linear-gradient(${dirMap[s.gradientDirection]}, ${rgbaOf(s.gradientStartColor, startA * 100)} 0%, ${rgbaOf(s.gradientEndColor, endA * 100)} 100%)`;
}

/* ------------------------------------------------------------------ */
/* Resolve the image URL (shared with the studio + public hero)        */
/* ------------------------------------------------------------------ */

/** Resolve the image URL a hero slide should render:
 *  `imageUrl` when set, else `backgroundImage` when backgroundType is 'image'. */
export function getHeroImageUrl(slide?: Partial<HeroSlide> | null): string {
  if (!slide) return '';
  const primary = (slide.imageUrl || '').trim();
  if (primary) return primary;
  if (slide.backgroundType === 'image') return (slide.backgroundImage || '').trim();
  return '';
}

/* ------------------------------------------------------------------ */
/* Creative presets — set adjustment values; users can fine-tune after */
/* ------------------------------------------------------------------ */

export interface HeroPreset {
  id: string;
  name: string;
  image: Partial<HeroImageAdjustments>;
  overlay?: Partial<HeroOverlaySettings>;
  position?: Partial<HeroPositionSettings>;
}

export const HERO_PRESETS: HeroPreset[] = [
  {
    id: 'vintage', name: 'Vintage',
    image: { sepia: 32, contrast: 92, saturation: 78, brightness: 104, hueRotate: -6 },
    position: { vignette: 30 },
  },
  {
    id: 'cinematic', name: 'Cinematic',
    image: { contrast: 116, saturation: 90, brightness: 96 },
    position: { vignette: 48 },
  },
  {
    id: 'warm', name: 'Warm',
    image: { warmth: 38, saturation: 108, brightness: 102 },
  },
  {
    id: 'cool', name: 'Cool',
    image: { warmth: -38, saturation: 104, brightness: 101 },
  },
  {
    id: 'faded', name: 'Faded',
    image: { contrast: 84, saturation: 78, brightness: 107 },
    overlay: { enabled: true, color: '#9aa3af', opacity: 12, darkness: 0 },
    position: { vignette: 0 },
  },
  {
    id: 'dramatic', name: 'Dramatic',
    image: { contrast: 126, saturation: 110, brightness: 93 },
    position: { vignette: 55 },
  },
  {
    id: 'monochrome', name: 'Monochrome',
    image: { grayscale: 100, contrast: 106, brightness: 102 },
    overlay: { enabled: false },
    position: { vignette: 0 },
  },
  {
    id: 'noir', name: 'Noir',
    image: { grayscale: 100, contrast: 132, brightness: 94 },
    position: { vignette: 62 },
  },
  {
    id: 'retro', name: 'Retro',
    image: { sepia: 52, saturation: 122, contrast: 106, hueRotate: -14, brightness: 100 },
    position: { vignette: 26 },
  },
];
