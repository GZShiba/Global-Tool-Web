/**
 * Firestore-only CMS catalog.
 *
 * Firestore is the SINGLE source of truth for all CMS-managed content.
 * There is no static catalogue and no fallback content: if a read fails the
 * catalog is marked offline (callers show an error); if a read succeeds but
 * the collection is empty, the catalog is empty (callers show empty states).
 *
 * Tool *implementations* come from the tool registry (functional components),
 * never from CMS records. A published tool's implementation is attached only
 * when a registered implementation id matches.
 */
import { createElement, useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { Tool, ToolCategory } from '../types';
import { CmsTool, CmsCategory } from './adminApi';
import { resolveCategoryMatch } from './cmsPure';
import { getEnabledCategoriesCached, getPublishedToolsCached } from './firestoreCms';

export type CatalogState = 'loading' | 'ready' | 'error';

export interface CmsCatalog {
  state: CatalogState;
  tools: Tool[];
  categories: ToolCategory[];
  freshEmpty: boolean;
}

function fallbackIcon() {
  return createElement(Wrench, { size: 28, strokeWidth: 1.5 });
}

/** Convert a Firestore tool record into a UI Tool (implementation attached when registered). */
export function cmsToTool(cms: CmsTool): Tool {
  const howTo = cms.howTo.filter(h => h.title.trim()).map(h => h.title);
  const features = cms.features.filter(f => f.trim());
  const tags = cms.tags || [];
  return {
    id: cms.id || cms.slug,
    slug: cms.slug,
    name: cms.name,
    tagline: cms.tagline || '',
    description: cms.description || cms.tagline || '',
    icon: fallbackIcon(),
    category: cms.category || 'uncategorized',
    tags: tags.length ? tags : [],
    features: features.length ? features : [],
    useCases: [],
    howTo: howTo.length ? howTo : [],
    notes: cms.details.filter(d => d.label && d.value).map(d => ({ label: d.label, value: d.value })),
    privacy: cms.privacy || 'This tool runs in your browser.',
    popular: !!cms.popular,
    isNew: !!cms.isNew,
    implementationId: cms.implementationId || undefined,
    externalUrl: cms.externalUrl || undefined,
    redirectEnabled: cms.redirectEnabled,
    redirectDelaySeconds: cms.redirectDelaySeconds,
    cornerTimerEnabled: cms.cornerTimerEnabled,
  };
}

export function cmsToCategory(cms: CmsCategory): ToolCategory {
  return {
    id: cms.id || cms.slug || cms.__docId || '',
    name: cms.name,
    description: cms.description || '',
    icon: fallbackIcon(),
  };
}

/**
 * Authoritative category lookup for the catalog: matches by `id` OR `slug`
 * (case-insensitive). Every category-identity decision in the app must go
 * through this resolver so a route built from either representation resolves
 * to the same record, and a genuinely unknown id returns undefined (NotFound).
 */
export function findCategory(categories: ToolCategory[], id: string): ToolCategory | undefined {
  return resolveCategoryMatch(categories, id);
}

/** Load the catalog strictly from Firestore. Returns a state object. */
export async function loadCmsCatalog(force = false): Promise<CmsCatalog> {
  if (cacheValue && !force) return cacheValue;
  if (cachePromise && !force) return cachePromise;

  cachePromise = (async () => {
    const [fbTools, fbCategories] = await Promise.all([getPublishedToolsCached(), getEnabledCategoriesCached()]);
    const firestoreReachable = fbTools !== null && fbCategories !== null;

    if (!firestoreReachable) {
      const catalog: CmsCatalog = { state: 'error', tools: [], categories: [], freshEmpty: false };
      cacheValue = catalog;
      return catalog;
    }

    const freshEmpty = fbTools.length === 0 && fbCategories.length === 0;
    const catalog: CmsCatalog = {
      state: 'ready',
      tools: fbTools.map(cmsToTool),
      categories: fbCategories.map(cmsToCategory),
      freshEmpty,
    };
    cacheValue = catalog;
    return catalog;
  })();

  try {
    return await cachePromise;
  } finally {
    cachePromise = null;
  }
}

let cacheValue: CmsCatalog | null = null;
let cachePromise: Promise<CmsCatalog> | null = null;

/** React hook: loads the Firestore CMS catalog once and exposes its state. */
export function useCmsCatalog(): CmsCatalog {
  const [catalog, setCatalog] = useState<CmsCatalog>(() => cacheValue || {
    state: 'loading',
    tools: [],
    categories: [],
    freshEmpty: false,
  });

  useEffect(() => {
    let alive = true;
    loadCmsCatalog().then(res => {
      if (alive) setCatalog(res);
    }).catch(() => {
      if (alive) setCatalog({ state: 'error', tools: [], categories: [], freshEmpty: false });
    });
    return () => { alive = false; };
  }, []);

  return catalog;
}
