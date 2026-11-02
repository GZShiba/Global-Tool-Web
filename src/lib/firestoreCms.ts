/**
 * Firestore-backed CMS data access.
 *
 * Collections (document ids = stable slug/id):
 *   cms_tools/<slug>         — tool content & metadata
 *   cms_categories/<id>      — category records
 *   cms_heroSlides/<id>      — homepage slides
 *   cms_popular/settings      — featured/popular configuration
 *
 * Public reads filter published/enabled/active docs. Writes are intended for
 * trusted, server-authorized callers (rules require an admin custom claim);
 * the browser admin panel keeps using the local API as its operational layer.
 *
 * A tiny in-memory cache (TTL 30s) avoids repeated reads while keeping the
 * data fresh enough for admin saves to appear.
 */
import type { Firestore } from 'firebase/firestore';
import { getFirestoreSafe, isFirebaseConfigured } from './firebase';
import { toDocId } from './cmsPure';
import type { CmsCategory, CmsTool, HeroSlide, PopularConfig } from './adminApi';

export const COLLECTIONS = {
  tools: 'cms_tools',
  categories: 'cms_categories',
  heroSlides: 'cms_heroSlides',
  popular: 'cms_popular',
} as const;

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { at: number; value: unknown }>();

function cached<T>(key: string, ttlMs: number, producer: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value as T);
  return producer().then(value => {
    cache.set(key, { at: Date.now(), value });
    return value;
  });
}

export function clearCmsCache() {
  cache.clear();
}

/* ------------------------------------------------------------------ */
/* Public reads (Firestore)                                            */
/* ------------------------------------------------------------------ */

async function getDb(): Promise<Firestore | null> {
  return getFirestoreSafe();
}

export async function fetchPublishedToolsFromFirestore(): Promise<CmsTool[] | null> {
  if (!isFirebaseConfigured()) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const q = query(collection(db, COLLECTIONS.tools), where('status', '==', 'published'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CmsTool);
  } catch (err) {
    console.warn('[firestore] read tools failed — local fallback.', err);
    return null;
  }
}

export async function fetchEnabledCategoriesFromFirestore(): Promise<CmsCategory[] | null> {
  if (!isFirebaseConfigured()) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const q = query(collection(db, COLLECTIONS.categories), where('enabled', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CmsCategory);
  } catch (err) {
    console.warn('[firestore] read categories failed — local fallback.', err);
    return null;
  }
}

export async function fetchActiveHeroSlidesFromFirestore(): Promise<HeroSlide[] | null> {
  if (!isFirebaseConfigured()) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
    const q = query(collection(db, COLLECTIONS.heroSlides), where('active', '==', true), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as HeroSlide);
  } catch (err) {
    console.warn('[firestore] read slides failed — local fallback.', err);
    return null;
  }
}

export async function fetchPopularConfigFromFirestore(): Promise<PopularConfig | null> {
  if (!isFirebaseConfigured()) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const ref = doc(db, COLLECTIONS.popular, 'settings');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as PopularConfig;
  } catch (err) {
    console.warn('[firestore] read popular failed — local fallback.', err);
    return null;
  }
}

export function getPublishedToolsCached(): Promise<CmsTool[] | null> {
  return cached('published-tools', CACHE_TTL_MS, fetchPublishedToolsFromFirestore);
}
export function getEnabledCategoriesCached(): Promise<CmsCategory[] | null> {
  return cached('enabled-categories', CACHE_TTL_MS, fetchEnabledCategoriesFromFirestore);
}
export function getActiveHeroSlidesCached(): Promise<HeroSlide[] | null> {
  return cached('active-hero-slides', CACHE_TTL_MS, fetchActiveHeroSlidesFromFirestore);
}
export function getPopularConfigCached(): Promise<PopularConfig | null> {
  return cached('popular-config', CACHE_TTL_MS, fetchPopularConfigFromFirestore);
}

/* ------------------------------------------------------------------ */
/* Admin writes (server-authorized by rules; used by trusted tooling)   */
/* ------------------------------------------------------------------ */

async function requireDbForWrite(action: string): Promise<Firestore> {
  const db = await getDb();
  if (!db) throw new Error(`Firebase not configured — cannot ${action}. Add VITE_FIREBASE_* env vars.`);
  return db;
}

export async function upsertToolToFirestore(tool: CmsTool): Promise<void> {
  const db = await requireDbForWrite('upsert tool');
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, COLLECTIONS.tools, toDocId(tool.slug)), tool, { merge: true });
  clearCmsCache();
}

export async function upsertCategoryToFirestore(category: CmsCategory): Promise<void> {
  const db = await requireDbForWrite('upsert category');
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, COLLECTIONS.categories, toDocId(category.id || category.slug)), category, { merge: true });
  clearCmsCache();
}

export async function upsertHeroSlideToFirestore(slide: HeroSlide): Promise<void> {
  const db = await requireDbForWrite('upsert hero slide');
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, COLLECTIONS.heroSlides, toDocId(slide.id || slide.toolSlug)), slide, { merge: true });
  clearCmsCache();
}

export async function savePopularConfigToFirestore(cfg: PopularConfig): Promise<void> {
  const db = await requireDbForWrite('save popular config');
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, COLLECTIONS.popular, 'settings'), cfg, { merge: true });
  clearCmsCache();
}

export async function deleteToolFromFirestore(slug: string): Promise<void> {
  const db = await requireDbForWrite('delete tool');
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, COLLECTIONS.tools, toDocId(slug)));
  clearCmsCache();
}
