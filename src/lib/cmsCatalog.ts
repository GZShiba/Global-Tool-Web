/**
 * Public CMS catalog integration.
 *
 * Loads published tools and enabled categories from the local admin API and
 * merges them over the static catalog. Rules:
 *  - A published CMS record overrides the static tool with the same slug.
 *  - CMS-only published tools are appended (fallback icon + honest detail page).
 *  - Drafts and archived tools are never surfaced.
 *  - Disabled CMS categories are hidden; enabled ones override/extend static.
 *  - If the API is unreachable, the static catalog is used unchanged.
 */
import { useEffect, useState } from 'react';
import { createElement } from 'react';
import { Wrench } from 'lucide-react';
import { Tool, ToolCategory } from '../types';
import { tools as staticTools, categories as staticCategories } from '../data/tools';
import { CmsTool, CmsCategory, getPublicCategories, getPublicTools } from './adminApi';
import { getEnabledCategoriesCached, getPublishedToolsCached } from './firestoreCms';

export interface CmsCatalog {
  tools: Tool[];
  categories: ToolCategory[];
  offline: boolean;
  loaded: boolean;
}

let cachePromise: Promise<CmsCatalog> | null = null;
let cacheValue: CmsCatalog | null = null;

function fallbackIcon(categoryId: string) {
  return createElement(Wrench, { size: 28, strokeWidth: 1.5 });
}

export function cmsToTool(cms: CmsTool, fallback?: Tool): Tool {
  const howTo = cms.howTo.filter(h => h.title.trim()).map(h => h.title);
  const features = cms.features.filter(f => f.trim());
  const tags = cms.tags || [];
  return {
    id: cms.id || cms.slug,
    slug: cms.slug,
    name: cms.name,
    tagline: cms.tagline || fallback?.tagline || '',
    description: cms.description || fallback?.description || cms.tagline || '',
    icon: fallback?.icon ?? fallbackIcon(cms.category),
    category: cms.category || fallback?.category || 'text',
    tags: tags.length ? tags : fallback?.tags || [],
    features: features.length ? features : fallback?.features || [],
    useCases: fallback?.useCases || [],
    howTo: howTo.length ? howTo : fallback?.howTo || [],
    notes: cms.details.filter(d => d.label && d.value).map(d => ({ label: d.label, value: d.value })),
    privacy: cms.privacy || fallback?.privacy || 'This tool runs in your browser.',
    popular: !!cms.popular || !!fallback?.popular,
    isNew: !!cms.isNew || !!fallback?.isNew,
    externalUrl: cms.externalUrl || undefined,
    redirectEnabled: cms.redirectEnabled,
    cornerTimerEnabled: cms.cornerTimerEnabled,
  };
}

export function mergeTools(cmsTools: CmsTool[] | null): Tool[] {
  const published = (cmsTools || []).filter(t => t.status === 'published');
  const bySlug = new Map(published.map(t => [t.slug, t]));
  const merged = new Map<string, Tool>();

  for (const tool of staticTools) {
    const cms = bySlug.get(tool.slug);
    merged.set(tool.slug, cms ? cmsToTool(cms, tool) : tool);
  }
  for (const cms of published) {
    if (!merged.has(cms.slug)) merged.set(cms.slug, cmsToTool(cms));
  }
  return [...merged.values()];
}

export function mergeCategories(cmsCategories: CmsCategory[] | null): ToolCategory[] {
  const enabled = (cmsCategories || []).filter(c => c.enabled !== false);
  const byId = new Map(enabled.map(c => [c.id, c]));
  const merged = new Map<string, ToolCategory>();

  for (const cat of staticCategories) {
    const cms = byId.get(cat.id);
    if (cms && cms.enabled === false) continue; // disabled → hidden
    merged.set(cat.id, cms ? { ...cat, name: cms.name || cat.name, description: cms.description || cat.description } : cat);
  }
  for (const cms of enabled) {
    if (!merged.has(cms.id)) {
      merged.set(cms.id, {
        id: cms.id,
        name: cms.name,
        description: cms.description,
        icon: fallbackIcon(cms.id),
      });
    }
  }
  return [...merged.values()];
}

export async function loadCmsCatalog(force = false): Promise<CmsCatalog> {
  if (cacheValue && !force) return cacheValue;
  if (cachePromise && !force) return cachePromise;

  cachePromise = (async () => {
    // 1. Prefer Firestore (published/enabled only) when configured.
    const [fbTools, fbCategories] = await Promise.all([getPublishedToolsCached(), getEnabledCategoriesCached()]);
    if (fbTools && fbCategories) {
      const catalog: CmsCatalog = {
        tools: mergeTools(fbTools),
        categories: mergeCategories(fbCategories),
        offline: false,
        loaded: true,
      };
      cacheValue = catalog;
      return catalog;
    }

    // 2. Fallback: local admin API (or static when the API is unreachable).
    const [cmsTools, cmsCats] = await Promise.all([getPublicTools(), getPublicCategories()]);
    const offline = cmsTools === null && cmsCats === null;
    const catalog: CmsCatalog = {
      tools: mergeTools(cmsTools),
      categories: mergeCategories(cmsCats),
      offline,
      loaded: true,
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

/** React hook: loads the CMS catalog once and keeps the merged lists available. */
export function useCmsCatalog(): CmsCatalog {
  const [catalog, setCatalog] = useState<CmsCatalog>(() => cacheValue || {
    tools: staticTools,
    categories: staticCategories,
    offline: false,
    loaded: false,
  });

  useEffect(() => {
    let alive = true;
    loadCmsCatalog().then(res => {
      if (alive) setCatalog(res);
    }).catch(() => {
      if (alive) setCatalog({ tools: staticTools, categories: staticCategories, offline: true, loaded: true });
    });
    return () => { alive = false; };
  }, []);

  return catalog;
}
