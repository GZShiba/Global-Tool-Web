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
import { getAuthSafe, getFirestoreSafe, isFirebaseConfigured } from './firebase';
import { toDocId, isToolPubliclyVisible, isCategoryPubliclyVisible, cleanUndefined, isValidDocId } from './cmsPure';
import type { CmsCategory, CmsTool, HeroSlide, PopularConfig } from './adminApi';

export const COLLECTIONS = {
  tools: 'cms_tools',
  categories: 'cms_categories',
  heroSlides: 'cms_heroSlides',
  popular: 'cms_popular',
  media: 'cms_media',
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

/**
 * Attach the authoritative Firestore document id to a hero slide read from a
 * document snapshot. `__docId` is used for every later write; the legacy
 * internal `id` is kept in sync (or completed) so mixed-schema records stay
 * usable. Without this, records written before doc-id tracking have no usable
 * identity and enable/disable/duplicate would silently no-op.
 */
function hydrateHeroSlide(data: unknown, docId: string): HeroSlide {
  const slide = data as HeroSlide;
  return {
    ...slide,
    __docId: docId,
    id: isValidDocId(slide.id) ? slide.id : docId,
  };
}

/** Display order; slides without an `order` field sort last and stay visible. */
function bySlideOrder(a: HeroSlide, b: HeroSlide): number {
  const ao = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
  const bo = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
  return ao - bo || String(a.title || '').localeCompare(String(b.title || ''));
}

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
    return snap.docs.map(d => ({ ...(d.data() as CmsTool), __docId: d.id }));
  } catch (err) {
    console.warn('[firestore] read tools failed — local fallback.', err);
    return null;
  }
}

/**
 * Attach the authoritative Firestore document id to a category read from a
 * document snapshot, and normalize its identity so it is ALWAYS defined:
 * `id` field → `slug` field → document id. Without this, a category document
 * that predates id/slug fields would surface with an undefined `id`, and the
 * category selector would navigate to `/categories/all` (silently showing the
 * wrong view and a "Category Not Found" title).
 */
function hydrateCategory(data: unknown, docId: string): CmsCategory {
  const cat = data as CmsCategory;
  const id = typeof cat.id === 'string' && cat.id.trim() ? cat.id : docId;
  const slug = typeof cat.slug === 'string' && cat.slug.trim() ? cat.slug : id;
  return {
    ...cat,
    __docId: docId,
    id,
    slug,
  };
}

export async function fetchEnabledCategoriesFromFirestore(): Promise<CmsCategory[] | null> {
  if (!isFirebaseConfigured()) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const q = query(collection(db, COLLECTIONS.categories), where('enabled', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => hydrateCategory(d.data(), d.id));
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
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    // Only an equality filter — an equality `where` needs no composite index
    // (pairing it with a server-side `orderBy` does, and failing the query with
    // an index error would silently empty the public hero). Ordering and
    // sorting are applied below, in memory.
    const q = query(collection(db, COLLECTIONS.heroSlides), where('active', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => hydrateHeroSlide(d.data(), d.id)).sort(bySlideOrder);
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

/* ------------------------------------------------------------------ */
/* Admin reads (all records — drafts, archived, disabled included)     */
/* ------------------------------------------------------------------ */

export async function fetchAllToolsFromFirestore(): Promise<CmsTool[] | null> {
  if (!isFirebaseConfigured()) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, COLLECTIONS.tools));
    // `__docId` carries the authoritative Firestore document id on every record;
    // all later updates/publishes/deletes target exactly this id.
    return snap.docs.map(d => ({ ...(d.data() as CmsTool), __docId: d.id }));
  } catch (err) {
    console.warn('[firestore] read all tools failed — local fallback.', err);
    return null;
  }
}

export async function fetchAllCategoriesFromFirestore(): Promise<CmsCategory[] | null> {
  if (!isFirebaseConfigured()) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, COLLECTIONS.categories));
    return snap.docs.map(d => hydrateCategory(d.data(), d.id));
  } catch (err) {
    console.warn('[firestore] read all categories failed — local fallback.', err);
    return null;
  }
}

export async function fetchAllHeroSlidesFromFirestore(): Promise<HeroSlide[] | null> {
  if (!isFirebaseConfigured()) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, COLLECTIONS.heroSlides));
    // `__docId` carries the authoritative Firestore document id on every
    // record; all later toggles/edits/reorders/deletes target exactly this id.
    return snap.docs.map(d => hydrateHeroSlide(d.data(), d.id)).sort(bySlideOrder);
  } catch (err) {
    console.warn('[firestore] read all slides failed — local fallback.', err);
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

/** Resolve the current admin UID (Email/Password sign-in); used for direct Firestore writes. */
export async function currentAdminUid(): Promise<string | null> {
  const auth = await getAuthSafe();
  if (!auth) return null;
  return auth.currentUser?.uid ?? null;
}

/** Generate a fresh, unique Firestore document id for a new tool. */
export function newToolDocId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to timestamp id */
  }
  return `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a brand-new tool document under a fresh, unique Firestore document id.
 * The caller never supplies the target document id. Returns the created record
 * (with `__docId` attached) so the UI can reload from the confirmed write.
 */
export async function createToolInFirestore(tool: CmsTool): Promise<CmsTool> {
  const slug = String(tool.slug || '').trim().toLowerCase();
  if (!slug) throw new Error('A tool slug is required before saving.');
  const db = await requireDbForWrite('create tool');
  const { doc, setDoc } = await import('firebase/firestore');
  const docId = newToolDocId();
  const now = new Date().toISOString();
  const payload = cleanUndefined({
    ...tool,
    id: docId,            // internal id kept in sync with the authoritative doc id
    slug,
    createdAt: tool.createdAt || now,
    updatedAt: now,
  }) as CmsTool;
  await setDoc(doc(db, COLLECTIONS.tools, docId), payload);
  clearCmsCache();
  return { ...payload, __docId: docId };
}

/**
 * Update an EXISTING tool document by its authoritative Firestore document id.
 * Only the provided fields are written (merge), so status-only updates never
 * create a new document or drop sibling fields. The doc id is used verbatim —
 * never derived from slug or partial data; blank/"undefined" ids are rejected.
 */
export async function updateToolAtDocIdToFirestore(docId: string, fields: Partial<CmsTool>): Promise<void> {
  if (!isValidDocId(docId)) throw new Error('Cannot update tool: the record has no valid Firestore document id.');
  const db = await requireDbForWrite('update tool');
  const { doc, setDoc } = await import('firebase/firestore');
  const { __docId: _dropped, ...rest } = fields as Partial<CmsTool> & { __docId?: string };
  const payload = cleanUndefined({ ...rest, updatedAt: new Date().toISOString() });
  await setDoc(doc(db, COLLECTIONS.tools, docId), payload, { merge: true });
  clearCmsCache();
}

/**
 * Permanently delete a tool document by its authoritative Firestore document id.
 * Rejects absent/blank ids so a failed lookup can never silently "succeed".
 */
export async function deleteToolAtDocIdFromFirestore(docId: string): Promise<void> {
  if (!isValidDocId(docId)) throw new Error('Cannot delete tool: the record has no valid Firestore document id.');
  const db = await requireDbForWrite('delete tool');
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, COLLECTIONS.tools, docId));
  clearCmsCache();
}

export async function upsertCategoryToFirestore(category: CmsCategory): Promise<void> {
  const db = await requireDbForWrite('upsert category');
  const { doc, setDoc } = await import('firebase/firestore');
  // The document id is derived from the category's slug/id. The stored record
  // is normalized so identity fields are ALWAYS populated and self-consistent:
  // `id` and `slug` never remain empty, so every reader (hydrated or not)
  // sees the same authoritative identifier.
  const docId = toDocId(category.id || category.slug);
  const normalized = {
    ...category,
    id: typeof category.id === 'string' && category.id.trim() ? category.id : docId,
    slug: typeof category.slug === 'string' && category.slug.trim() ? category.slug : docId,
  };
  await setDoc(doc(db, COLLECTIONS.categories, docId), cleanUndefined(normalized), { merge: true });
  clearCmsCache();
}

/**
 * Create a brand-new hero slide under a fresh, unique Firestore document id.
 * The caller never supplies the target document id, so duplicates can never
 * collide with (or overwrite) an existing slide via a slug-derived id.
 * Returns the created record (with `__docId` attached).
 */
export async function createHeroSlideInFirestore(slide: HeroSlide): Promise<HeroSlide> {
  const db = await requireDbForWrite('create hero slide');
  const { doc, setDoc } = await import('firebase/firestore');
  const docId = newToolDocId();
  const now = new Date().toISOString();
  const { __docId: _droppedDocId, id: _droppedId, ...rest } = slide as HeroSlide & { __docId?: string };
  const payload = cleanUndefined({
    ...rest,
    id: docId,           // internal id kept in sync with the authoritative doc id
    toolSlug: String(slide.toolSlug || '').trim(),
    active: slide.active !== false,
    order: typeof slide.order === 'number' ? slide.order : 0,
    createdAt: now,
    updatedAt: now,
  }) as HeroSlide;
  await setDoc(doc(db, COLLECTIONS.heroSlides, docId), payload);
  clearCmsCache();
  return { ...payload, __docId: docId };
}

/**
 * Update an EXISTING hero slide document by its authoritative Firestore
 * document id. Only the provided fields are written (merge), so an
 * enable/disable toggle never creates a new document or drops sibling fields.
 * The doc id is used verbatim — never derived from toolSlug or partial data;
 * blank/"undefined" ids are rejected.
 */
export async function updateHeroSlideFieldsAtDocIdToFirestore(docId: string, fields: Partial<HeroSlide>): Promise<void> {
  if (!isValidDocId(docId)) throw new Error('Cannot update hero slide: the record has no valid Firestore document id.');
  const db = await requireDbForWrite('update hero slide');
  const { doc, setDoc } = await import('firebase/firestore');
  const { __docId: _droppedDocId, id: _droppedId, ...rest } = fields as Partial<HeroSlide> & { __docId?: string };
  // `active` must be a real boolean when present; a non-boolean is dropped so
  // a legacy record can never be silently turned inactive by a bad payload.
  const active = typeof rest.active === 'boolean' ? rest.active : undefined;
  const payload = cleanUndefined({
    ...rest,
    ...(typeof active === 'boolean' ? { active } : {}),
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(db, COLLECTIONS.heroSlides, docId), payload, { merge: true });
  clearCmsCache();
  console.info('[hero] slide update confirmed in Firestore', { docId, active: payload.active, updatedAt: payload.updatedAt });
}

export async function deleteHeroSlideFromFirestore(id: string): Promise<void> {
  if (!isValidDocId(id)) throw new Error('Cannot delete hero slide: the record has no valid Firestore document id.');
  const db = await requireDbForWrite('delete hero slide');
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, COLLECTIONS.heroSlides, id));
  clearCmsCache();
}

export async function savePopularConfigToFirestore(cfg: PopularConfig): Promise<void> {
  const db = await requireDbForWrite('save popular config');
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, COLLECTIONS.popular, 'settings'), cfg, { merge: true });
  clearCmsCache();
}

export async function deleteCategoryFromFirestore(id: string): Promise<void> {
  const db = await requireDbForWrite('delete category');
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, COLLECTIONS.categories, toDocId(id)));
  clearCmsCache();
}

async function setOrder(collection: string, orderedIds: string[]): Promise<void> {
  // Never derive or coerce ids here: a malformed id must fail loudly,
  // not be re-pointed at a slug-shaped or "undefined" document.
  if (!orderedIds.every(isValidDocId)) {
    throw new Error('Cannot reorder: one or more records lack a valid Firestore document id.');
  }
  const db = await requireDbForWrite('reorder');
  const { writeBatch, doc } = await import('firebase/firestore');
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, collection, id), { order: index });
  });
  await batch.commit();
  clearCmsCache();
}

export async function setCategoryOrder(orderedIds: string[]): Promise<void> {
  await setOrder(COLLECTIONS.categories, orderedIds);
}

export async function setHeroSlideOrder(orderedIds: string[]): Promise<void> {
  await setOrder(COLLECTIONS.heroSlides, orderedIds);
}

/* ------------------------------------------------------------------ */
/* Media (URL-based records)                                           */
/* ------------------------------------------------------------------ */

export interface CmsMediaRecord {
  id: string;
  url: string;
  originalName: string;
  alt: string;
  size: number;
  createdAt: string;
}

export async function fetchAllMediaFromFirestore(): Promise<CmsMediaRecord[] | null> {
  if (!isFirebaseConfigured()) return null;
  const db = await getDb();
  if (!db) return null;
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, COLLECTIONS.media));
    return snap.docs.map(d => d.data() as CmsMediaRecord);
  } catch (err) {
    console.warn('[firestore] read media failed — local fallback.', err);
    return null;
  }
}

export async function upsertMediaRecordToFirestore(record: CmsMediaRecord): Promise<void> {
  const db = await requireDbForWrite('upsert media');
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, COLLECTIONS.media, toDocId(record.id || record.url)), record, { merge: true });
  clearCmsCache();
}

export async function deleteMediaRecordFromFirestore(id: string): Promise<void> {
  const db = await requireDbForWrite('delete media');
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, COLLECTIONS.media, toDocId(id)));
  clearCmsCache();
}
