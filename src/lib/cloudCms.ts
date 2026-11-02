/**
 * Cloud CMS write client — talks to the hosted adminCms Cloud Function.
 * Authorization uses a short-lived bridge ticket minted by the local admin
 * API (verified server-side by the function with the shared secret).
 */
import { CmsCategory, CmsTool, HeroSlide, PopularConfig, firebaseFunctionsUrl, obtainFirebaseTicket } from './adminApi';

export class CloudCmsError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'CloudCmsError';
  }
}

async function call(action: string, payload: Record<string, unknown>): Promise<void> {
  const base = firebaseFunctionsUrl();
  if (!base) throw new CloudCmsError('Cloud CMS URL is not configured (VITE_FIREBASE_FUNCTIONS_URL).');
  const ticket = await obtainFirebaseTicket();
  const url = `${base.replace(/\/$/, '')}/adminCms`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ticket}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new CloudCmsError((data && data.error) || `Cloud CMS error (${res.status})`, res.status);
  }
}

export const cloudUpsertTool = (tool: CmsTool) => call('tool.upsert', { tool });
export const cloudDeleteTool = (slug: string) => call('tool.delete', { slug });
export const cloudUpsertCategory = (category: CmsCategory) => call('category.upsert', { category });
export const cloudDeleteCategory = (id: string) => call('category.delete', { id });
export const cloudReorderCategories = (orderedIds: string[]) => call('category.reorder', { orderedIds });
export const cloudUpsertSlide = (slide: HeroSlide) => call('slide.upsert', { slide });
export const cloudDeleteSlide = (id: string) => call('slide.delete', { id });
export const cloudReorderSlides = (orderedIds: string[]) => call('slide.reorder', { orderedIds });
export const cloudSavePopular = (popular: PopularConfig) => call('popular.save', { popular });
