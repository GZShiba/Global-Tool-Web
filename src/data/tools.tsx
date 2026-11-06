/**
 * Metadata + label helpers only — NOT CMS content.
 *
 * Firestore is the single source of truth for all tools, categories, slides,
 * popular config, and media. This module intentionally exposes NO tool or
 * category content; it provides category icon/name metadata and pure label
 * helpers used by UI components.
 */
import { ReactNode } from 'react';
import { Type, Repeat, Sparkles, Code2, Calculator, Image, Wrench } from 'lucide-react';

const icon = (Icon: any, size = 28): ReactNode => <Icon size={size} strokeWidth={1.5} />;

/** Category icon metadata keyed by id (used only for display, not as content). */
const categoryIconById: Record<string, ReactNode> = {
  text: icon(Type),
  converters: icon(Repeat),
  generators: icon(Sparkles),
  'web-dev': icon(Code2),
  calculators: icon(Calculator),
  files: icon(Image),
};

const fallbackCategoryIcon = icon(Wrench);

export function getCategoryIcon(id: string): ReactNode {
  return categoryIconById[id] ?? fallbackCategoryIcon;
}

/** Display name for a category id (label helper). */
const categoryNameById: Record<string, string> = {
  text: 'Text',
  converters: 'Converters',
  generators: 'Generators',
  'web-dev': 'Web & Dev',
  calculators: 'Calculators',
  files: 'Files & Media',
};

export function getCategoryName(id: string): string {
  return categoryNameById[id] || id;
}

/** Legacy alias used by UI for category lookup (id → name only). */
export function getCategory(id: string): { id: string; name: string; description: string } | undefined {
  if (!id) return undefined;
  return {
    id,
    name: getCategoryName(id),
    description: '',
  };
}

// No CMS content exists in this module. Empty defaults reflect the fresh CMS.
export const tools: never[] = [];
export const categories: never[] = [];

// Content helpers intentionally return nothing (Firestore is authoritative).
export function getToolBySlug(): undefined {
  return undefined;
}
export function getPopularTools(): never[] {
  return [];
}
export function getRelatedTools(): never[] {
  return [];
}
export function searchTools(): never[] {
  return [];
}
