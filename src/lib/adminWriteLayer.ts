/**
 * Unified admin write layer.
 *
 * When Firebase + the hosted adminCms function are configured, writes go to
 * Firestore through the Cloud Function (bridge-ticket authorized). Otherwise
 * the local Admin API is used. Reads always come from the local admin API /
 * public fallbacks. This keeps the Admin Panel fully functional in both modes
 * with identical call signatures.
 */
import { isFirebaseConfigured } from './firebase';
import type { CmsCategory, CmsTool, HeroSlide, PopularConfig } from './adminApi';
import { firebaseFunctionsUrl } from './adminApi';
import {
  cloudDeleteCategory, cloudDeleteSlide, cloudDeleteTool, cloudReorderCategories,
  cloudReorderSlides, cloudSavePopular, cloudUpsertCategory, cloudUpsertSlide,
  cloudUpsertTool,
} from './cloudCms';
import {
  createCmsCategory, createCmsTool, createHeroSlide, deleteCmsCategory,
  deleteCmsTool, deleteHeroSlide, reorderCmsCategories, reorderHeroSlides,
  updateCmsCategory, updateCmsTool, updateHeroSlide, updatePopularConfig,
} from './adminApi';

export function useCloudWrites(): boolean {
  return isFirebaseConfigured() && Boolean(firebaseFunctionsUrl());
}

/** Run a write; returns {ok:true} or {ok:false,error}. */
async function runWrite(fn: () => Promise<unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    await fn();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Write failed' };
  }
}

export function createCmsToolCloud(tool: Parameters<typeof createCmsTool>[0]) {
  return runWrite(() => (useCloudWrites() ? cloudUpsertTool(tool as CmsTool) : createCmsTool(tool)));
}
export function updateCmsToolCloud(id: string, tool: Parameters<typeof updateCmsTool>[1]) {
  return runWrite(() => (useCloudWrites() ? cloudUpsertTool({ ...(tool as CmsTool), id }) : updateCmsTool(id, tool)));
}
export function deleteCmsToolCloud(id: string) {
  return runWrite(() => (useCloudWrites() ? cloudDeleteTool(id) : deleteCmsTool(id)));
}

export function createCmsCategoryCloud(cat: Parameters<typeof createCmsCategory>[0]) {
  return runWrite(() => (useCloudWrites() ? cloudUpsertCategory(cat as CmsCategory) : createCmsCategory(cat)));
}
export function updateCmsCategoryCloud(id: string, cat: Parameters<typeof updateCmsCategory>[1]) {
  return runWrite(() => (useCloudWrites() ? cloudUpsertCategory({ ...(cat as CmsCategory), id }) : updateCmsCategory(id, cat)));
}
export function deleteCmsCategoryCloud(id: string) {
  return runWrite(() => (useCloudWrites() ? cloudDeleteCategory(id) : deleteCmsCategory(id)));
}
export function reorderCmsCategoriesCloud(orderedIds: string[]) {
  return runWrite(() => (useCloudWrites() ? cloudReorderCategories(orderedIds) : reorderCmsCategories(orderedIds)));
}

export function createHeroSlideCloud(slide: Parameters<typeof createHeroSlide>[0]) {
  return runWrite(() => (useCloudWrites() ? cloudUpsertSlide(slide as HeroSlide) : createHeroSlide(slide)));
}
export function updateHeroSlideCloud(id: string, slide: Parameters<typeof updateHeroSlide>[1]) {
  return runWrite(() => (useCloudWrites() ? cloudUpsertSlide({ ...(slide as HeroSlide), id }) : updateHeroSlide(id, slide)));
}
export function deleteHeroSlideCloud(id: string) {
  return runWrite(() => (useCloudWrites() ? cloudDeleteSlide(id) : deleteHeroSlide(id)));
}
export function reorderHeroSlidesCloud(orderedIds: string[]) {
  return runWrite(() => (useCloudWrites() ? cloudReorderSlides(orderedIds) : reorderHeroSlides(orderedIds)));
}

export function updatePopularConfigCloud(cfg: Parameters<typeof updatePopularConfig>[0]) {
  return runWrite(() => (useCloudWrites() ? cloudSavePopular({ enabled: true, maxCards: 4, toolIds: [], ...(cfg as PopularConfig) }) : updatePopularConfig(cfg)));
}
