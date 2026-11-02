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
