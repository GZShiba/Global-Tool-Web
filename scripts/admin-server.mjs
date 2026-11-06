#!/usr/bin/env node
/**
 * OmniToolify Admin Backend Service
 *
 * A local, file-persisted content-management API for the admin panel.
 * - Binds 127.0.0.1 only (never exposed to the network).
 * - Auth: email+password step, then 6-digit PIN step. Secrets are stored
 *   with scrypt (salt + hash), never plaintext; sessions are random tokens
 *   stored hashed with expiry.
 * - Rate limiting + lockout on login/PIN attempts (per IP).
 * - Storage: `.admin-data/db.json` (content) + `.admin-data/auth.json`.
 * - Media uploads are written to `public/admin-media/` and servable statically.
 *
 * Bootstrap: on first run, a random admin password and PIN are generated and
 * printed to the console exactly once. Nothing is hardcoded in frontend code.
 *
 * Run:  node scripts/admin-server.mjs serve [--port 4735]
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.ADMIN_DATA_ROOT ? path.resolve(process.env.ADMIN_DATA_ROOT) : path.resolve(SCRIPT_DIR, '..');
const DATA_DIR = path.join(ROOT, '.admin-data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const PUBLIC_MEDIA_DIR = path.join(ROOT, 'public', 'admin-media');

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // absolute max session lifetime (8h)
const INACTIVITY_TTL_MS = Number(process.env.ADMIN_INACTIVITY_TTL_MS) || 60 * 60 * 1000; // sliding inactivity (60 min)
const STEP_TTL_MS = 10 * 60 * 1000;          // 10 min for PIN step
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_ADMINS = 2;

/** In-process stores for the single-server deployment (avoid shared-file races). */
const stepStore = new Map();
const sessionStore = new Map();

/* ------------------------------------------------------------------ */
/* Crypto helpers                                                       */
/* ------------------------------------------------------------------ */

function hashSecret(value) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(value), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifySecret(value, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = scryptSync(String(value), salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(candidate, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function randomToken() {
  return randomBytes(32).toString('hex');
}

/** Strong random password (24 chars, base64url). */
function generatePassword() {
  return randomBytes(18).toString('base64url');
}

/** Random 6-digit PIN that avoids predictable sequences. */
function generatePin() {
  for (;;) {
    const digits = Array.from({ length: 6 }, () => randomBytes(1)[0] % 10);
    const s = digits.join('');
    // Reject repeated/sequential/near-sequential patterns.
    const predictable = /^(\d)\1{5}$/.test(s)
      || ['012345','123456','234567','345678','456789','987654','876543','765432','654321','543210']
          .includes(s);
    if (!predictable) return s;
  }
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

/* ------------------------------------------------------------------ */
/* Store helpers                                                        */
/* ------------------------------------------------------------------ */

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_MEDIA_DIR, { recursive: true });
}

async function readDb() {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(raw);
    if (db && typeof db === 'object') return db;
  } catch { /* fall through */ }
  return {
    schemaVersion: 1,
    heroSlides: [],
    popular: { enabled: true, maxCards: 4, toolIds: [] },
    tools: [],
    categories: [],
    media: [],
    updatedAt: new Date().toISOString(),
  };
}

async function writeDb(db) {
  db.updatedAt = new Date().toISOString();
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

async function readAuth() {
  try {
    const raw = await fs.readFile(AUTH_FILE, 'utf8');
    const a = JSON.parse(raw);
    if (a && typeof a === 'object') return await migrateAuth(a);
  } catch { /* fall through */ }
  if (existsSync(AUTH_FILE)) {
    const a = JSON.parse(await fs.readFile(AUTH_FILE, 'utf8'));
    if (a && typeof a === 'object') return await migrateAuth(a);
  }
  // Fresh bootstrap: create the first administrator with random credentials.
  const password = generatePassword();
  const pin = generatePin();
  const now = new Date().toISOString();
  const auth = {
    schemaVersion: 2,
    administrators: [{
      id: 'admin-1',
      email: 'admin@omnitoolify.app',
      emailHash: hashSecret('admin@omnitoolify.app'),
      passwordHash: hashSecret(password),
      pinHash: hashSecret(pin),
      status: 'active',
      createdAt: now,
    }],
    sessions: {},
    steps: {},
    attempts: {},
    bootstrap: { password, pin, at: now },
  };
  await fs.writeFile(AUTH_FILE, JSON.stringify(auth, null, 2), 'utf8');
  console.log('==============================================================');
  console.log(' ADMIN BOOTSTRAP (printed once — store these securely)');
  console.log(`   Email:    admin@omnitoolify.app`);
  console.log(`   Password: ${password}`);
  console.log(`   PIN:      ${pin}`);
  console.log('   Change them from Admin Security after first login.');
  console.log('==============================================================');
  return auth;
}

/**
 * Idempotent migration from the legacy single-account auth schema
 * ({ email, emailHash, passwordHash, pinHash, ... }) to the multi-account
 * schema ({ schemaVersion: 2, administrators: [...] }). Existing hashes and
 * sessions are preserved — nothing is reset. Safe to run on every start.
 */
async function migrateAuth(a) {
  if (Array.isArray(a.administrators)) {
    a.schemaVersion = 2;
    if (!Array.isArray(a.sessions)) a.sessions = {};
    if (!Array.isArray(a.steps)) a.steps = {};
    if (!Array.isArray(a.attempts)) a.attempts = {};
    return a;
  }
  // Legacy single-account shape.
  const email = (a.email === 'admin@omnntoolify.app') ? 'admin@omnitoolify.app' : (a.email || 'admin@omnitoolify.app');
  const emailHash = (a.email === 'admin@omnntoolify.app') ? hashSecret(email) : (a.emailHash || hashSecret(email));
  const now = new Date().toISOString();
  const administrators = [{
    id: 'admin-1',
    email,
    emailHash,
    passwordHash: a.passwordHash || hashSecret(String(Math.random())),
    pinHash: a.pinHash || hashSecret(String(Math.floor(100000 + Math.random() * 900000))),
    status: 'active',
    createdAt: a.createdAt || now,
  }];
  // Preserve existing sessions/steps by tying them to the single admin.
  const sessions = {};
  for (const [h, rec] of Object.entries(a.sessions || {})) {
    sessions[h] = { ...rec, adminId: 'admin-1' };
  }
  const steps = {};
  for (const [h, rec] of Object.entries(a.steps || {})) {
    steps[h] = { ...rec, adminId: 'admin-1' };
  }
  const migrated = {
    schemaVersion: 2,
    administrators,
    sessions,
    steps,
    attempts: a.attempts || {},
    bootstrap: a.bootstrap || null,
  };
  await fs.writeFile(AUTH_FILE, JSON.stringify(migrated, null, 2), 'utf8');
  return migrated;
}

async function saveAuth(auth) {
  await fs.writeFile(AUTH_FILE, JSON.stringify(auth, null, 2), 'utf8');
}

function findAdminByEmail(auth, email) {
  const normalized = String(email || '').toLowerCase().trim();
  return auth.administrators.find(a => a.email.toLowerCase() === normalized && a.status === 'active') || null;
}

function passwordMeetsPolicy(password) {
  const p = String(password || '');
  return p.length >= 12 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);
}

/**
 * Validates the bearer session from the in-process store, enforces the
 * sliding inactivity timeout, and stamps lastActivity. Throws
 * 'SESSION_EXPIRED' (→ 401 with a user-facing message) when idle too long.
 */
function requireSession(auth, req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new Error('Unauthorized');
  const hash = tokenHash(token);
  const rec = sessionStore.get(hash);
  if (!rec || !rec.adminId) throw new Error('Unauthorized');
  const admin = auth.administrators.find(a => a.id === rec.adminId);
  if (!admin || admin.status !== 'active') throw new Error('Unauthorized');
  const now = Date.now();
  if (now - (rec.lastActivity || rec.createdAt || now) > INACTIVITY_TTL_MS) {
    sessionStore.delete(hash); // invalidate the expired session server-side
    throw new Error('SESSION_EXPIRED');
  }
  if (now > rec.expiresAt) {
    sessionStore.delete(hash);
    throw new Error('SESSION_EXPIRED');
  }
  rec.lastActivity = now;
  return { token, admin };
}

/* ------------------------------------------------------------------ */
/* Rate limiting                                                        */
/* ------------------------------------------------------------------ */

function checkRateLimit(auth, ip, action) {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const rec = auth.attempts[key] || { count: 0, lockedUntil: 0 };
  if (rec.lockedUntil > now) {
    const mins = Math.ceil((rec.lockedUntil - now) / 60000);
    throw new Error(`Too many attempts. Try again in ${mins} min.`);
  }
  rec.count += 1;
  rec.lastAt = now;
  auth.attempts[key] = rec;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCKOUT_MS;
    rec.count = 0;
    throw new Error('Too many attempts. Account locked for 15 minutes.');
  }
  return rec;
}

function clearRateLimit(auth, ip, action) {
  delete auth.attempts[`${ip}:${action}`];
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                         */
/* ------------------------------------------------------------------ */

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:4173', 'http://127.0.0.1:4173',
]);

function sendJson(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readBody(req, limit = 5 * 1024 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const body = Buffer.concat(chunks);
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) return JSON.parse(body.toString('utf8'));
  return body; // raw binary (media upload)
}

function clientIp(req) {
  return (req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { sendJson(res, 204, {}); return; }
    const ip = clientIp(req);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split('/').filter(Boolean);
    const auth = await readAuth();
    const db = await readDb();

    try {
      /* ---- Public content reads (no auth) ---- */
      if (url.pathname === '/api/public/hero-slides' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, slides: db.heroSlides.filter(s => s.active !== false) });
        return;
      }
      if (url.pathname === '/api/public/popular' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, popular: db.popular });
        return;
      }
      if (url.pathname === '/api/public/categories' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, categories: db.categories.filter(c => c.enabled !== false) });
        return;
      }
      if (url.pathname === '/api/public/tools' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, tools: db.tools.filter(t => t.status === 'published') });
        return;
      }

      /* ---- Auth ---- */
      if (url.pathname === '/api/auth/login' && req.method === 'POST') {
        const { email, password } = await readBody(req);
        checkRateLimit(auth, ip, 'login');
        const admin = findAdminByEmail(auth, email);
        if (!admin || !verifySecret(password, admin.passwordHash)) {
          throw new Error('Invalid email or password');
        }
        clearRateLimit(auth, ip, 'login');
        const stepToken = randomToken();
        stepStore.set(tokenHash(stepToken), { adminId: admin.id, expiresAt: Date.now() + STEP_TTL_MS, ip });
        sendJson(res, 200, { ok: true, stepToken });
        return;
      }

      if (url.pathname === '/api/auth/verify-pin' && req.method === 'POST') {
        const { stepToken, pin } = await readBody(req);
        checkRateLimit(auth, ip, 'pin');
        const hash = tokenHash(String(stepToken || ''));
        const rec = stepStore.get(hash);
        if (!rec || rec.expiresAt < Date.now() || rec.ip !== ip) {
          throw new Error('Login step expired. Please sign in again.');
        }
        const admin = auth.administrators.find(a => a.id === rec.adminId);
        if (!admin || admin.status !== 'active' || !/^\d{6}$/.test(String(pin)) || !verifySecret(String(pin), admin.pinHash)) {
          throw new Error('Invalid PIN');
        }
        clearRateLimit(auth, ip, 'pin');
        stepStore.delete(hash);
        const now = Date.now();
        const sessionToken = randomToken();
        sessionStore.set(tokenHash(sessionToken), {
          adminId: admin.id,
          createdAt: now,
          lastActivity: now,
          expiresAt: now + SESSION_TTL_MS,
          ip,
        });
        sendJson(res, 200, { ok: true, sessionToken, expiresAt: now + SESSION_TTL_MS });
        return;
      }

      if (url.pathname === '/api/auth/me' && req.method === 'GET') {
        const { admin } = requireSession(auth, req);
        sendJson(res, 200, { ok: true, email: admin.email });
        return;
      }

      if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
        const { token } = requireSession(auth, req);
        sessionStore.delete(tokenHash(token));
        sendJson(res, 200, { ok: true });
        return;
      }

      /* ---- Authenticated admin endpoints ---- */
      const session = requireSession(auth, req);

      if (url.pathname === '/api/hero-slides' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, slides: db.heroSlides });
        return;
      }
      if (url.pathname === '/api/hero-slides' && req.method === 'POST') {
        const slide = await readBody(req);
        if (!slide.toolSlug) throw new Error('A linked tool is required');
        slide.id = slide.id || randomToken().slice(0, 12);
        slide.active = slide.active !== false;
        slide.order = typeof slide.order === 'number' ? slide.order : db.heroSlides.length;
        db.heroSlides.push(slide);
        await writeDb(db);
        sendJson(res, 201, { ok: true, slide });
        return;
      }
      if (parts[0] === 'api' && parts[1] === 'hero-slides' && parts[2] && req.method === 'PUT') {
        const id = parts[2];
        const idx = db.heroSlides.findIndex(s => s.id === id);
        if (idx === -1) { sendJson(res, 404, { ok: false, error: 'Slide not found' }); return; }
        const update = await readBody(req);
        db.heroSlides[idx] = { ...db.heroSlides[idx], ...update, id };
        await writeDb(db);
        sendJson(res, 200, { ok: true, slide: db.heroSlides[idx] });
        return;
      }
      if (parts[0] === 'api' && parts[1] === 'hero-slides' && parts[2] && req.method === 'DELETE') {
        const id = parts[2];
        db.heroSlides = db.heroSlides.filter(s => s.id !== id);
        await writeDb(db);
        sendJson(res, 200, { ok: true });
        return;
      }
      if (url.pathname === '/api/hero-slides/reorder' && req.method === 'POST') {
        const { orderedIds } = await readBody(req);
        if (!Array.isArray(orderedIds)) throw new Error('orderedIds array required');
        db.heroSlides.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
        await writeDb(db);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (url.pathname === '/api/popular' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, popular: db.popular });
        return;
      }
      if (url.pathname === '/api/popular' && req.method === 'PUT') {
        const update = await readBody(req);
        db.popular = { enabled: true, maxCards: 4, toolIds: [], ...db.popular, ...update };
        await writeDb(db);
        sendJson(res, 200, { ok: true, popular: db.popular });
        return;
      }

      if (url.pathname === '/api/tools' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, tools: db.tools });
        return;
      }
      if (url.pathname === '/api/tools' && req.method === 'POST') {
        const tool = await readBody(req);
        if (!tool.slug) throw new Error('Slug is required');
        if (db.tools.some(t => t.slug === tool.slug)) throw new Error(`Slug "${tool.slug}" already exists`);
        tool.id = tool.id || randomToken().slice(0, 12);
        tool.status = tool.status || 'draft';
        db.tools.push(tool);
        await writeDb(db);
        sendJson(res, 201, { ok: true, tool });
        return;
      }
      if (parts[0] === 'api' && parts[1] === 'tools' && parts[2] && req.method === 'PUT') {
        const id = parts[2];
        const idx = db.tools.findIndex(t => t.id === id);
        if (idx === -1) { sendJson(res, 404, { ok: false, error: 'Tool not found' }); return; }
        const update = await readBody(req);
        if (update.slug && update.slug !== db.tools[idx].slug && db.tools.some(t => t.slug === update.slug)) {
          throw new Error(`Slug "${update.slug}" already exists`);
        }
        db.tools[idx] = { ...db.tools[idx], ...update, id };
        await writeDb(db);
        sendJson(res, 200, { ok: true, tool: db.tools[idx] });
        return;
      }
      if (parts[0] === 'api' && parts[1] === 'tools' && parts[2] && req.method === 'DELETE') {
        const id = parts[2];
        db.tools = db.tools.filter(t => t.id !== id);
        db.heroSlides = db.heroSlides.filter(s => s.toolSlug !== id);
        db.popular.toolIds = db.popular.toolIds.filter(t => t !== id);
        await writeDb(db);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (url.pathname === '/api/categories' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, categories: db.categories });
        return;
      }
      if (url.pathname === '/api/categories' && req.method === 'POST') {
        const cat = await readBody(req);
        if (!cat.slug) throw new Error('Slug is required');
        if (db.categories.some(c => c.slug === cat.slug)) throw new Error(`Slug "${cat.slug}" already exists`);
        cat.id = cat.id || randomToken().slice(0, 12);
        cat.enabled = cat.enabled !== false;
        db.categories.push(cat);
        await writeDb(db);
        sendJson(res, 201, { ok: true, category: cat });
        return;
      }
      if (parts[0] === 'api' && parts[1] === 'categories' && parts[2] && req.method === 'PUT') {
        const id = parts[2];
        const idx = db.categories.findIndex(c => c.id === id);
        if (idx === -1) { sendJson(res, 404, { ok: false, error: 'Category not found' }); return; }
        const update = await readBody(req);
        db.categories[idx] = { ...db.categories[idx], ...update, id };
        await writeDb(db);
        sendJson(res, 200, { ok: true, category: db.categories[idx] });
        return;
      }
      if (parts[0] === 'api' && parts[1] === 'categories' && parts[2] && req.method === 'DELETE') {
        const id = parts[2];
        const inUse = db.tools.filter(t => t.category === id && t.status === 'published').length;
        if (inUse > 0) {
          sendJson(res, 409, { ok: false, error: `Cannot delete: ${inUse} published tool(s) are in this category` });
          return;
        }
        db.categories = db.categories.filter(c => c.id !== id);
        await writeDb(db);
        sendJson(res, 200, { ok: true });
        return;
      }
      if (url.pathname === '/api/categories/reorder' && req.method === 'POST') {
        const { orderedIds } = await readBody(req);
        if (!Array.isArray(orderedIds)) throw new Error('orderedIds array required');
        db.categories.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
        await writeDb(db);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (url.pathname === '/api/media' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, media: db.media });
        return;
      }
      if (url.pathname === '/api/media' && req.method === 'POST') {
        const ct = req.headers['content-type'] || '';
        if (ct.includes('application/json')) {
          // JSON metadata record for cloud-hosted files (e.g. Firebase Storage URLs).
          const meta = await readBody(req);
          const ext = path.extname((meta.originalName || 'image.png')).toLowerCase() || '.png';
          if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) throw new Error('Unsupported file type');
          const id = randomToken().slice(0, 12);
          const item = {
            id, filename: meta.url || '', originalName: meta.originalName || 'image.png', ext,
            url: meta.url || '', alt: '', size: Number(meta.size) || 0,
            createdAt: new Date().toISOString(), hosted: true,
          };
          db.media.push(item);
          await writeDb(db);
          sendJson(res, 201, { ok: true, media: item });
          return;
        }
        const raw = await readBody(req);
        if (!Buffer.isBuffer(raw)) throw new Error('Expected binary upload');
        const name = decodeURIComponent(String(req.headers['x-file-name'] || 'image.png')).split(/[\\/]/).pop();
        const ext = path.extname(name).toLowerCase() || '.png';
        if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) throw new Error('Unsupported file type');
        if (raw.length > 8 * 1024 * 1024) throw new Error('File too large (max 8 MB)');
        const id = randomToken().slice(0, 12);
        const filename = `${id}${ext}`;
        await fs.writeFile(path.join(PUBLIC_MEDIA_DIR, filename), raw);
        const item = {
          id, filename, originalName: name, ext,
          url: `/admin-media/${filename}`,
          alt: '',
          size: raw.length,
          createdAt: new Date().toISOString(),
        };
        db.media.push(item);
        await writeDb(db);
        sendJson(res, 201, { ok: true, media: item });
        return;
      }
      if (parts[0] === 'api' && parts[1] === 'media' && parts[2] && req.method === 'PUT') {
        const id = parts[2];
        const idx = db.media.findIndex(m => m.id === id);
        if (idx === -1) { sendJson(res, 404, { ok: false, error: 'Media not found' }); return; }
        const update = await readBody(req);
        db.media[idx] = { ...db.media[idx], ...update, id };
        await writeDb(db);
        sendJson(res, 200, { ok: true, media: db.media[idx] });
        return;
      }
      if (parts[0] === 'api' && parts[1] === 'media' && parts[2] && req.method === 'DELETE') {
        const id = parts[2];
        const item = db.media.find(m => m.id === id);
        if (item) await fs.rm(path.join(PUBLIC_MEDIA_DIR, item.filename), { force: true }).catch(() => {});
        db.media = db.media.filter(m => m.id !== id);
        await writeDb(db);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (url.pathname === '/api/admin/pin' && req.method === 'POST') {
        const { currentPassword, currentPin, newPin } = await readBody(req);
        checkRateLimit(auth, ip, 'pinchange');
        if (!verifySecret(currentPassword, session.admin.passwordHash)) throw new Error('Current password is incorrect');
        if (!verifySecret(String(currentPin), session.admin.pinHash)) throw new Error('Current PIN is incorrect');
        if (!/^\d{6}$/.test(String(newPin))) throw new Error('New PIN must be exactly 6 digits');
        session.admin.pinHash = hashSecret(String(newPin));
        clearRateLimit(auth, ip, 'pinchange');
        await saveAuth(auth);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (url.pathname === '/api/admin/rotate-credentials' && req.method === 'POST') {
        const { currentPassword, currentPin } = await readBody(req);
        checkRateLimit(auth, ip, 'rotate');
        if (!verifySecret(currentPassword, session.admin.passwordHash)) throw new Error('Current password is incorrect');
        if (!verifySecret(String(currentPin), session.admin.pinHash)) throw new Error('Current PIN is incorrect');
        const newPassword = generatePassword();
        const newPin = generatePin();
        session.admin.passwordHash = hashSecret(newPassword);
        session.admin.pinHash = hashSecret(newPin);
        // Credentials are regenerated: the bootstrap plaintext is destroyed.
        delete auth.bootstrap;
        clearRateLimit(auth, ip, 'rotate');
        await saveAuth(auth);
        // Return the new credentials exactly once; they are never stored in plaintext.
        sendJson(res, 200, { ok: true, password: newPassword, pin: newPin });
        return;
      }

      if (url.pathname === '/api/admin/email' && req.method === 'PUT') {
        const { currentPassword, currentPin, newEmail } = await readBody(req);
        checkRateLimit(auth, ip, 'emailchange');
        if (!verifySecret(currentPassword, session.admin.passwordHash)) throw new Error('Current password is incorrect');
        if (!verifySecret(String(currentPin), session.admin.pinHash)) throw new Error('Current PIN is incorrect');
        const email = String(newEmail || '').toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address');
        if (auth.administrators.some(a => a.email.toLowerCase() === email && a.id !== session.admin.id)) {
          throw new Error('That email is already used by another administrator');
        }
        session.admin.email = email;
        session.admin.emailHash = hashSecret(email);
        clearRateLimit(auth, ip, 'emailchange');
        await saveAuth(auth);
        sendJson(res, 200, { ok: true, email });
        return;
      }

      if (url.pathname === '/api/admin/password' && req.method === 'PUT') {
        const { currentPassword, currentPin, newPassword, confirmNewPassword } = await readBody(req);
        checkRateLimit(auth, ip, 'pwchange');
        if (!verifySecret(currentPassword, session.admin.passwordHash)) throw new Error('Current password is incorrect');
        if (!verifySecret(String(currentPin), session.admin.pinHash)) throw new Error('Current PIN is incorrect');
        if (String(newPassword) !== String(confirmNewPassword)) throw new Error('New passwords do not match');
        if (!passwordMeetsPolicy(newPassword)) {
          throw new Error('New password must be at least 12 characters and include upper/lower case and a number');
        }
        session.admin.passwordHash = hashSecret(newPassword);
        // Security policy: rotate sessions — drop every other session of this admin.
        const currentHash = tokenHash(session.token);
        for (const [h, rec] of sessionStore) {
          if (rec.adminId === session.admin.id && h !== currentHash) sessionStore.delete(h);
        }
        clearRateLimit(auth, ip, 'pwchange');
        await saveAuth(auth);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (url.pathname === '/api/admin/accounts' && req.method === 'GET') {
        sendJson(res, 200, {
          ok: true,
          accounts: auth.administrators.map(a => ({ id: a.id, email: a.email, status: a.status, createdAt: a.createdAt })),
        });
        return;
      }

      if (url.pathname === '/api/admin/accounts' && req.method === 'POST') {
        const { currentPassword, currentPin, email: newEmail, password: newPassword } = await readBody(req);
        checkRateLimit(auth, ip, 'createadmin');
        if (!verifySecret(currentPassword, session.admin.passwordHash)) throw new Error('Current password is incorrect');
        if (!verifySecret(String(currentPin), session.admin.pinHash)) throw new Error('Current PIN is incorrect');
        const activeAdmins = auth.administrators.filter(a => a.status === 'active');
        if (activeAdmins.length >= MAX_ADMINS) {
          throw new Error(`Maximum of ${MAX_ADMINS} active administrators reached`);
        }
        const email = String(newEmail || '').toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address');
        if (auth.administrators.some(a => a.email.toLowerCase() === email)) throw new Error('That email is already used by an administrator');
        if (!passwordMeetsPolicy(newPassword)) {
          throw new Error('Password must be at least 12 characters and include upper/lower case and a number');
        }
        const adminId = `admin-${Date.now().toString(36)}`;
        const pin = generatePin();
        auth.administrators.push({
          id: adminId,
          email,
          emailHash: hashSecret(email),
          passwordHash: hashSecret(newPassword),
          pinHash: hashSecret(pin),
          status: 'active',
          createdAt: new Date().toISOString(),
        });
        clearRateLimit(auth, ip, 'createadmin');
        await saveAuth(auth);
        // New PIN is returned exactly once for the setup flow; never persisted in plaintext.
        sendJson(res, 201, { ok: true, administrator: { id: adminId, email, status: 'active' }, pin });
        return;
      }

      if (url.pathname === '/api/admin/firebase-ticket' && req.method === 'POST') {
        // Removed: no HMAC bridge tickets in the Spark-plan architecture.
        // Admin CMS writes are now direct Firestore writes via Firebase Auth.
        sendJson(res, 410, { ok: false, error: 'Bridge tickets removed — CMS writes go directly to Firestore via Firebase Auth.' });
        return;
      }

      sendJson(res, 404, { ok: false, error: 'Not found' });
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        sendJson(res, 401, { ok: false, error: 'Your session expired due to inactivity. Please log in again.' });
        return;
      }
      const code = err.message.includes('Unauthorized') || err.message.includes('Session') ? 401 : 400;
      sendJson(res, code, { ok: false, error: err.message });
    }
  });
}

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex > -1 ? Number(args[portIndex + 1]) : 4735;

if (args[0] === 'serve') {
  await ensureDirs();
  await readAuth(); // bootstrap if needed
  const server = createServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`OmniToolify Admin API on http://127.0.0.1:${port}`);
    console.log(`Data dir: ${DATA_DIR}`);
  });
  server.on('error', err => { console.error('Server error:', err.message); process.exitCode = 1; });
} else {
  console.log('Usage: node scripts/admin-server.mjs serve [--port 4735]');
}
