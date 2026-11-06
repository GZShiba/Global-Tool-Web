/**
 * Unified admin write layer — Spark-plan compatible.
 *
 * Writes go DIRECTLY to Firestore from the authenticated admin session
 * (Firebase Auth). Authorization is enforced by Firestore rules (admin email
 * allowlist). There is no Cloud Function, no HMAC ticket, no local-API write
 * dependency, and no custom claims.
 *
 * If Firebase is unconfigured or the session is not authenticated, writes
 * fail with a clear message (the local Admin API remains available only for
 * the non-CMS admin/security features, not for CMS writes).
 */
import { isFirebaseConfigured } from './firebase';
import { currentAdminUid } from './firestoreCms';
import type { CmsCategory, CmsTool, HeroSlide, PopularConfig } from './adminApi';

export function useCloudWrites(): boolean {
  return isFirebaseConfigured();
}

async function runWrite(fn: () => Promise<unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    await fn();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Write failed' };
  }
}

async function requireAuthed() {
  const uid = await currentAdminUid();
  if (!uid) throw new Error('Not signed in — sign in with Firebase Auth to save CMS changes.');
}

/**
 * Tool CRUD — strict document-identity contract.
 *
 * The Firestore document ID is the authoritative identity for every tool:
 *  - create: a fresh unique doc id is generated inside `createToolInFirestore`;
 *  - update / publish / unpublish / delete: the caller must pass the exact
 *    doc id (carried on the record as `__docId`). It is used verbatim, never
 *    derived from slug or a partial object, and never undefined/blank.
 */
export function createCmsToolCloud(tool: CmsTool) {
  return runWrite(async () => {
    await requireAuthed();
    const { createToolInFirestore } = await import('./firestoreCms');
    await createToolInFirestore(tool);
  });
}
export function updateCmsToolCloud(docId: string, tool: Partial<CmsTool>) {
  return runWrite(async () => {
    await requireAuthed();
    const { updateToolAtDocIdToFirestore } = await import('./firestoreCms');
    await updateToolAtDocIdToFirestore(docId, tool);
  });
}
export function deleteCmsToolCloud(docId: string) {
  return runWrite(async () => {
    await requireAuthed();
    const { deleteToolAtDocIdFromFirestore } = await import('./firestoreCms');
    await deleteToolAtDocIdFromFirestore(docId);
  });
}

export function createCmsCategoryCloud(cat: CmsCategory) {
  return runWrite(async () => {
    await requireAuthed();
    const { upsertCategoryToFirestore } = await import('./firestoreCms');
    await upsertCategoryToFirestore(cat);
  });
}
export function updateCmsCategoryCloud(id: string, cat: CmsCategory) {
  return runWrite(async () => {
    await requireAuthed();
    const { upsertCategoryToFirestore } = await import('./firestoreCms');
    await upsertCategoryToFirestore({ ...cat, id });
  });
}
export function deleteCmsCategoryCloud(id: string) {
  return runWrite(async () => {
    await requireAuthed();
    const { deleteCategoryFromFirestore } = await import('./firestoreCms');
    await deleteCategoryFromFirestore(id);
  });
}
export function reorderCmsCategoriesCloud(orderedIds: string[]) {
  return runWrite(async () => {
    await requireAuthed();
    const { setCategoryOrder } = await import('./firestoreCms');
    await setCategoryOrder(orderedIds);
  });
}

/**
 * Hero slide CRUD — strict document-identity contract (same as tools):
 *  - create: a fresh unique doc id is generated inside `createHeroSlideInFirestore`;
 *  - update / enable / disable / delete: the caller must pass the exact doc id
 *    (carried on the record as `__docId`). It is used verbatim, never derived
 *    from the tool slug, and never undefined/blank.
 */
export function createHeroSlideCloud(slide: HeroSlide) {
  return runWrite(async () => {
    await requireAuthed();
    const { createHeroSlideInFirestore } = await import('./firestoreCms');
    await createHeroSlideInFirestore(slide);
  });
}
export function updateHeroSlideCloud(docId: string, slide: Partial<HeroSlide>) {
  return runWrite(async () => {
    await requireAuthed();
    const { updateHeroSlideFieldsAtDocIdToFirestore } = await import('./firestoreCms');
    await updateHeroSlideFieldsAtDocIdToFirestore(docId, slide);
  });
}
export function deleteHeroSlideCloud(id: string) {
  return runWrite(async () => {
    await requireAuthed();
    const { deleteHeroSlideFromFirestore } = await import('./firestoreCms');
    await deleteHeroSlideFromFirestore(id);
  });
}
export function reorderHeroSlidesCloud(orderedIds: string[]) {
  return runWrite(async () => {
    await requireAuthed();
    const { setHeroSlideOrder } = await import('./firestoreCms');
    await setHeroSlideOrder(orderedIds);
  });
}

export function updatePopularConfigCloud(cfg: PopularConfig) {
  return runWrite(async () => {
    await requireAuthed();
    const { savePopularConfigToFirestore } = await import('./firestoreCms');
    await savePopularConfigToFirestore(cfg);
  });
}
