/**
 * Typed client for the local admin API (127.0.0.1:4735).
 * Session token is kept in memory only (never in localStorage/sessionStorage).
 */

export const ADMIN_API_URL = 'http://127.0.0.1:4735';

export interface HeroSlide {
  id?: string;
  toolSlug: string;
  title: string;
  eyebrow: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  backgroundType?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundGradient?: string;
  focusPoint?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  active: boolean;
  order?: number;
}

export interface PopularConfig {
  enabled: boolean;
  maxCards: number;
  toolIds: string[];
}

export interface CmsTool {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  icon?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  implementationId?: string;
  tags: string[];
  runsOn?: string;
  accountNeeded?: string;
  availability?: string;
  features: string[];
  howTo: { title: string; description?: string }[];
  details: { label: string; value: string; description?: string; type?: string }[];
  privacy: string;
  privacyStatus?: string;
  relatedToolIds: string[];
  autoRelated?: boolean;
  maxRecommendations?: number;
  recommendedCategories?: string[];
  externalUrl?: string;
  redirectEnabled?: boolean;
  cornerTimerEnabled?: boolean;
  status: 'draft' | 'published' | 'archived';
  popular?: boolean;
  isNew?: boolean;
  featured?: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CmsCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  imageUrl?: string;
  order?: number;
  enabled: boolean;
}

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  ext: string;
  url: string;
  alt: string;
  size: number;
  createdAt: string;
}

export class AdminApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AdminApiError';
  }
}

let sessionToken: string | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}
export function getSessionToken() {
  return sessionToken;
}
export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  if (!(options.body instanceof FormData) && options.body !== undefined && !(options.body instanceof Blob)) {
    headers['Content-Type'] = 'application/json';
  }
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  try {
    const res = await fetch(`${ADMIN_API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json().catch(() => null) : null;
    if (!res.ok) {
      const message = (data && data.error) || `Admin API error (${res.status})`;
      if (res.status === 401 && message.toLowerCase().includes('expired')) {
        // Server invalidated the session (60-min inactivity) — notify the app.
        sessionToken = null;
        sessionExpiredHandler?.();
      }
      throw new AdminApiError(message, res.status);
    }
    return data as T;
  } catch (err) {
    if (err instanceof AdminApiError) throw err;
    throw new AdminApiError(
      err instanceof DOMException && err.name === 'AbortError'
        ? 'Admin API timed out'
        : 'Cannot reach the admin API. Start it with: node scripts/admin-server.mjs serve',
    );
  } finally {
    clearTimeout(timeout);
  }
}

/* ---- Auth ---- */
export async function loginStep1(email: string, password: string): Promise<string> {
  const data = await request<{ ok: boolean; stepToken: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.stepToken;
}

export async function loginStep2(stepToken: string, pin: string): Promise<string> {
  const data = await request<{ ok: boolean; sessionToken: string }>('/api/auth/verify-pin', {
    method: 'POST',
    body: JSON.stringify({ stepToken, pin }),
  });
  return data.sessionToken;
}

export async function checkSession(): Promise<boolean> {
  if (!sessionToken) return false;
  try {
    await request<{ ok: boolean }>('/api/auth/me');
    return true;
  } catch {
    return false;
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  } catch { /* ignore */ }
  setSessionToken(null);
}

/* ---- Content ---- */
export const listHeroSlides = () => request<{ ok: boolean; slides: HeroSlide[] }>('/api/hero-slides').then(d => d.slides);
export const createHeroSlide = (slide: HeroSlide) => request<{ ok: boolean; slide: HeroSlide }>('/api/hero-slides', { method: 'POST', body: JSON.stringify(slide) }).then(d => d.slide);
export const updateHeroSlide = (id: string, slide: Partial<HeroSlide>) => request<{ ok: boolean; slide: HeroSlide }>(`/api/hero-slides/${id}`, { method: 'PUT', body: JSON.stringify(slide) }).then(d => d.slide);
export const deleteHeroSlide = (id: string) => request<{ ok: boolean }>(`/api/hero-slides/${id}`, { method: 'DELETE' });
export const reorderHeroSlides = (orderedIds: string[]) => request<{ ok: boolean }>('/api/hero-slides/reorder', { method: 'POST', body: JSON.stringify({ orderedIds }) });

export const getPopularConfig = () => request<{ ok: boolean; popular: PopularConfig }>('/api/popular').then(d => d.popular);
export const updatePopularConfig = (cfg: Partial<PopularConfig>) => request<{ ok: boolean; popular: PopularConfig }>('/api/popular', { method: 'PUT', body: JSON.stringify(cfg) }).then(d => d.popular);

export const listCmsTools = () => request<{ ok: boolean; tools: CmsTool[] }>('/api/tools').then(d => d.tools);
export const createCmsTool = (tool: Partial<CmsTool>) => request<{ ok: boolean; tool: CmsTool }>('/api/tools', { method: 'POST', body: JSON.stringify(tool) }).then(d => d.tool);
export const updateCmsTool = (id: string, tool: Partial<CmsTool>) => request<{ ok: boolean; tool: CmsTool }>(`/api/tools/${id}`, { method: 'PUT', body: JSON.stringify(tool) }).then(d => d.tool);
export const deleteCmsTool = (id: string) => request<{ ok: boolean }>(`/api/tools/${id}`, { method: 'DELETE' });

export const listCmsCategories = () => request<{ ok: boolean; categories: CmsCategory[] }>('/api/categories').then(d => d.categories);
export const createCmsCategory = (cat: Partial<CmsCategory>) => request<{ ok: boolean; category: CmsCategory }>('/api/categories', { method: 'POST', body: JSON.stringify(cat) }).then(d => d.category);
export const updateCmsCategory = (id: string, cat: Partial<CmsCategory>) => request<{ ok: boolean; category: CmsCategory }>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(cat) }).then(d => d.category);
export const deleteCmsCategory = (id: string) => request<{ ok: boolean }>(`/api/categories/${id}`, { method: 'DELETE' });
export const reorderCmsCategories = (orderedIds: string[]) => request<{ ok: boolean }>('/api/categories/reorder', { method: 'POST', body: JSON.stringify({ orderedIds }) });

export const listMedia = () => request<{ ok: boolean; media: MediaItem[] }>('/api/media').then(d => d.media);
export const uploadMedia = async (file: File): Promise<MediaItem> => {
  const data = await request<{ ok: boolean; media: MediaItem }>('/api/media', {
    method: 'POST',
    headers: { 'X-File-Name': encodeURIComponent(file.name) },
    body: await file.arrayBuffer(),
  });
  return data.media;
};
export const updateMedia = (id: string, patch: Partial<MediaItem>) => request<{ ok: boolean; media: MediaItem }>(`/api/media/${id}`, { method: 'PUT', body: JSON.stringify(patch) }).then(d => d.media);
export const deleteMedia = (id: string) => request<{ ok: boolean }>(`/api/media/${id}`, { method: 'DELETE' });

export const changePin = (currentPassword: string, currentPin: string, newPin: string) =>
  request<{ ok: boolean }>('/api/admin/pin', { method: 'POST', body: JSON.stringify({ currentPassword, currentPin, newPin }) });

export const rotateCredentials = (currentPassword: string, currentPin: string) =>
  request<{ ok: boolean; password: string; pin: string }>('/api/admin/rotate-credentials', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, currentPin }),
  });

export interface AdministratorAccount {
  id: string;
  email: string;
  status: string;
  createdAt: string;
}

export const changeAdminEmail = (currentPassword: string, currentPin: string, newEmail: string) =>
  request<{ ok: boolean; email: string }>('/api/admin/email', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, currentPin, newEmail }),
  });

export const changeAdminPassword = (currentPassword: string, currentPin: string, newPassword: string, confirmNewPassword: string) =>
  request<{ ok: boolean }>('/api/admin/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, currentPin, newPassword, confirmNewPassword }),
  });

export const listAdminAccounts = () =>
  request<{ ok: boolean; accounts: AdministratorAccount[] }>('/api/admin/accounts').then(d => d.accounts);

export const createAdministrator = (currentPassword: string, currentPin: string, email: string, password: string) =>
  request<{ ok: boolean; administrator: AdministratorAccount; pin: string }>('/api/admin/accounts', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, currentPin, email, password }),
  });

/* ---- Public reads (used by the public site to sync CMS content) ---- */
export const getPublicHeroSlides = () => request<{ ok: boolean; slides: HeroSlide[] }>('/api/public/hero-slides').then(d => d.slides).catch(() => null);
export const getPublicPopular = () => request<{ ok: boolean; popular: PopularConfig }>('/api/public/popular').then(d => d.popular).catch(() => null);
export const getPublicTools = () => request<{ ok: boolean; tools: CmsTool[] }>('/api/public/tools').then(d => d.tools).catch(() => null);
export const getPublicCategories = () => request<{ ok: boolean; categories: CmsCategory[] }>('/api/public/categories').then(d => d.categories).catch(() => null);
