/**
 * Pure, side-effect-free CMS helpers (unit-testable without Firebase).
 */

/** Deterministic Firestore document id from a slug/id. */
export function toDocId(input: string): string {
  const clean = String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || `doc-${Date.now().toString(36)}`;
}

/** Normalize a storage path: no leading slashes, no query/hash, collapse slashes. */
export function sanitizeStoragePath(path: string): string {
  const clean = String(path || '')
    .replace(/^\/+/, '')
    .replace(/[?#].*$/, '') // strip query/hash fragment
    .replace(/\/+/g, '/');
  return clean || 'cms-media/untitled';
}

/** True when a tool record should appear on the public site. */
export function isToolPubliclyVisible(status: string | undefined): boolean {
  return status === 'published';
}

/** True when a category should appear on the public site. */
export function isCategoryPubliclyVisible(enabled: boolean | undefined): boolean {
  return enabled !== false;
}

/**
 * Recursively strip `undefined` (and NaN) values so Firestore never rejects a
 * write with "Unsupported field value: undefined". Arrays keep their shape;
 * null values are preserved (they are valid Firestore data).
 */
export function cleanUndefined<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(v => cleanUndefined(v)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined || (typeof v === 'number' && Number.isNaN(v))) continue;
    out[k] = cleanUndefined(v);
  }
  return out as T;
}

/** True when a string is usable as a real Firestore document id (never "undefined"/blank). */
export function isValidDocId(id: string | undefined | null): id is string {
  return typeof id === 'string' && id.trim().length > 0 && id !== 'undefined' && id !== 'null';
}

/**
 * Resolve a category by its authoritative identifier. Matching is
 * case-insensitive and accepts both the category `id` and its `slug`, so a
 * route built from either representation resolves to the same record.
 * Returns undefined only when the category genuinely does not exist in the
 * provided list (callers show NotFound then — never a fabricated record).
 */
export function resolveCategoryMatch<T extends { id?: string | null; slug?: string | null }>(
  categories: T[],
  id: string | undefined | null,
): T | undefined {
  if (typeof id !== 'string' || !id.trim()) return undefined;
  const needle = id.trim().toLowerCase();
  for (const cat of categories) {
    const catId = typeof cat.id === 'string' ? cat.id.trim().toLowerCase() : '';
    const slug = typeof cat.slug === 'string' ? cat.slug.trim().toLowerCase() : '';
    if ((catId && catId === needle) || (slug && slug === needle)) return cat;
  }
  return undefined;
}

