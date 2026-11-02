/**
 * Admin CMS write function (Firebase Cloud Functions, Admin SDK).
 *
 * Trusted bridge:
 *  1. The local admin server authenticates the admin (email+password+PIN,
 *     session, rate limits) and mints a short-lived HMAC ticket.
 *  2. The browser sends that ticket as Bearer to THIS function.
 *  3. This function verifies the ticket with the shared ADMIN_BRIDGE_SECRET
 *     and performs the requested Firestore write.
 *
 * No service-account credentials are exposed to browsers. Firestore rules
 * additionally restrict public reads to published/enabled/active records.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHmac, timingSafeEqual } from 'node:crypto';

initializeApp(); // uses GOOGLE_APPLICATION_CREDENTIALS / default service account
const db = getFirestore();

const COLLECTIONS = {
  tools: 'cms_tools',
  categories: 'cms_categories',
  heroSlides: 'cms_heroSlides',
  popular: 'cms_popular',
};

function toDocId(input) {
  const clean = String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || 'doc-undefined';
}

function verifyTicket(ticket) {
  const key = process.env.ADMIN_BRIDGE_SECRET || '';
  if (!key) return { ok: false, reason: 'secret-not-configured' };
  if (typeof ticket !== 'string' || !ticket.includes('.')) return { ok: false, reason: 'malformed' };
  const [body, sig] = ticket.split('.');
  const expected = createHmac('sha256', key).update(body).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad-signature' };
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'bad-payload' };
  }
  if (!payload.sub || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, adminId: String(payload.sub) };
}

function sanitizeTool(tool) {
  return {
    id: String(tool.id || tool.slug || ''),
    slug: String(tool.slug || ''),
    name: String(tool.name || ''),
    tagline: String(tool.tagline || ''),
    description: String(tool.description || ''),
    category: String(tool.category || ''),
    implementationId: tool.implementationId ? String(tool.implementationId) : undefined,
    tags: Array.isArray(tool.tags) ? tool.tags.map(String) : [],
    features: Array.isArray(tool.features) ? tool.features.map(String) : [],
    howTo: Array.isArray(tool.howTo) ? tool.howTo : [],
    details: Array.isArray(tool.details) ? tool.details : [],
    privacy: String(tool.privacy || ''),
    privacyStatus: tool.privacyStatus ? String(tool.privacyStatus) : '',
    relatedToolIds: Array.isArray(tool.relatedToolIds) ? tool.relatedToolIds.map(String) : [],
    autoRelated: Boolean(tool.autoRelated),
    maxRecommendations: Number.isFinite(tool.maxRecommendations) ? Number(tool.maxRecommendations) : 4,
    recommendedCategories: Array.isArray(tool.recommendedCategories) ? tool.recommendedCategories.map(String) : [],
    externalUrl: tool.externalUrl ? String(tool.externalUrl) : '',
    redirectEnabled: Boolean(tool.redirectEnabled),
    cornerTimerEnabled: tool.cornerTimerEnabled !== false,
    runsOn: String(tool.runsOn || 'Your Device'),
    accountNeeded: String(tool.accountNeeded || 'None'),
    availability: String(tool.availability || 'Public'),
    status: String(tool.status || 'draft'),
    popular: Boolean(tool.popular),
    isNew: Boolean(tool.isNew),
    featured: Boolean(tool.featured),
    displayOrder: Number.isFinite(tool.displayOrder) ? Number(tool.displayOrder) : 0,
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeCategory(cat) {
  return {
    id: String(cat.id || cat.slug || ''),
    name: String(cat.name || ''),
    slug: String(cat.slug || ''),
    description: String(cat.description || ''),
    icon: cat.icon ? String(cat.icon) : '',
    imageUrl: cat.imageUrl ? String(cat.imageUrl) : '',
    order: Number.isFinite(cat.order) ? Number(cat.order) : 0,
    enabled: cat.enabled !== false,
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeSlide(slide) {
  return {
    id: String(slide.id || slide.toolSlug || ''),
    toolSlug: String(slide.toolSlug || ''),
    title: String(slide.title || ''),
    eyebrow: String(slide.eyebrow || ''),
    description: String(slide.description || ''),
    imageUrl: slide.imageUrl ? String(slide.imageUrl) : '',
    imageAlt: slide.imageAlt ? String(slide.imageAlt) : '',
    backgroundType: String(slide.backgroundType || 'dark'),
    backgroundColor: String(slide.backgroundColor || '#0b0b0d'),
    backgroundImage: slide.backgroundImage ? String(slide.backgroundImage) : '',
    focusPoint: slide.focusPoint ? String(slide.focusPoint) : '',
    primaryLabel: String(slide.primaryLabel || 'Open Tool'),
    secondaryLabel: String(slide.secondaryLabel || 'About This Tool'),
    active: slide.active !== false,
    order: Number.isFinite(slide.order) ? Number(slide.order) : 0,
    updatedAt: new Date().toISOString(),
  };
}

function sanitizePopular(cfg) {
  return {
    enabled: cfg.enabled !== false,
    maxCards: Number.isFinite(cfg.maxCards) ? Math.max(1, Math.min(12, Number(cfg.maxCards))) : 4,
    toolIds: Array.isArray(cfg.toolIds) ? cfg.toolIds.map(String) : [],
    updatedAt: new Date().toISOString(),
  };
}

export const adminCms = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST only' });
    return;
  }

  const header = req.headers.authorization || '';
  const ticket = header.startsWith('Bearer ') ? header.slice(7) : '';
  const check = verifyTicket(ticket);
  if (!check.ok) {
    res.status(401).json({ ok: false, error: `Unauthorized (${check.reason})` });
    return;
  }

  const body = req.body || {};
  const action = String(body.action || '');

  try {
    switch (action) {
      case 'tool.upsert': {
        if (!body.tool || !body.tool.slug) throw new Error('tool.slug is required');
        await db.collection(COLLECTIONS.tools).doc(toDocId(body.tool.slug)).set(sanitizeTool(body.tool), { merge: true });
        res.json({ ok: true, id: toDocId(body.tool.slug) });
        return;
      }
      case 'tool.delete': {
        if (!body.slug) throw new Error('slug is required');
        await db.collection(COLLECTIONS.tools).doc(toDocId(body.slug)).delete();
        res.json({ ok: true });
        return;
      }
      case 'category.upsert': {
        if (!body.category || (!body.category.id && !body.category.slug)) throw new Error('category id/slug is required');
        const clean = sanitizeCategory(body.category);
        await db.collection(COLLECTIONS.categories).doc(toDocId(clean.id || clean.slug)).set(clean, { merge: true });
        res.json({ ok: true, id: toDocId(clean.id || clean.slug) });
        return;
      }
      case 'category.delete': {
        if (!body.id) throw new Error('id is required');
        await db.collection(COLLECTIONS.categories).doc(toDocId(body.id)).delete();
        res.json({ ok: true });
        return;
      }
      case 'category.reorder':
      case 'slide.reorder': {
        const collection = action.startsWith('category') ? COLLECTIONS.categories : COLLECTIONS.heroSlides;
        if (!Array.isArray(body.orderedIds)) throw new Error('orderedIds array is required');
        const batch = db.batch();
        const refs = body.orderedIds.map((id, index) => batch.update(db.collection(collection).doc(toDocId(id)), { order: index }));
        await batch.commit();
        res.json({ ok: true, updated: refs.length });
        return;
      }
      case 'slide.upsert': {
        if (!body.slide || (!body.slide.id && !body.slide.toolSlug)) throw new Error('slide id/toolSlug is required');
        const clean = sanitizeSlide(body.slide);
        await db.collection(COLLECTIONS.heroSlides).doc(toDocId(clean.id || clean.toolSlug)).set(clean, { merge: true });
        res.json({ ok: true, id: toDocId(clean.id || clean.toolSlug) });
        return;
      }
      case 'slide.delete': {
        if (!body.id) throw new Error('id is required');
        await db.collection(COLLECTIONS.heroSlides).doc(toDocId(body.id)).delete();
        res.json({ ok: true });
        return;
      }
      case 'popular.save': {
        if (!body.popular) throw new Error('popular config is required');
        await db.collection(COLLECTIONS.popular).doc('settings').set(sanitizePopular(body.popular), { merge: true });
        res.json({ ok: true });
        return;
      }
      default:
        res.status(400).json({ ok: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});
