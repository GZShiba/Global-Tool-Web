/**
 * OmniToolify Cloudflare Worker — SPA + API.
 *
 * Public API (Step 3):
 *   POST /api/auth/verify-pin
 *   POST /api/admin/change-pin
 *   POST /api/admin/toggle-secondary
 *   POST /api/admin/bootstrap-pin   (operator-only, one-time)
 *   POST /api/auth/logout
 *   GET  /api/health
 *
 * Everything else serves static assets (Workers Static Assets) with SPA
 * fallback. All privileged operations verify the Firebase ID token server
 * side, enforce authorization + PIN session state via Firestore, and never
 * trust client-supplied email/uid.
 */

import { verifyIdToken, VerifyError } from './worker/lib/firebaseToken';
import {
  getAccessToken,
  parseServiceAccount,
  type ServiceAccount,
} from './worker/lib/googleOauth';
import { FirestoreClient } from './worker/lib/firestoreRest';
import { AdminConfig } from './worker/lib/adminConfig';
import { RateLimiter } from './worker/lib/ratelimit';
import { constantTimeEqual, hashPin, isValidPin, verifyPin } from './worker/lib/crypto';

export interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_SERVICE_ACCOUNT?: string;
  BOOTSTRAP_SECRET?: string;
  PRIMARY_ADMIN_EMAIL?: string;
  SECONDARY_ADMIN_EMAIL?: string;
  KDF_ITERATIONS?: string;
  SESSION_TTL_MS?: string;
}

const DEFAULT_PRIMARY_EMAIL = 'gzshiba99329@gmail.com';
const DEFAULT_SECONDARY_EMAIL = 'hb9717777@gmail.com';
const DEFAULT_KDF_ITERATIONS = 65_000;
const DEFAULT_SESSION_TTL_MS = 12 * 60 * 1000;

const RATE_WINDOW = 15 * 60 * 1000;
const RATE_LOCK = 15 * 60 * 1000;
const CHANGE_WINDOW = 30 * 60 * 1000;

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

class NotConfiguredError extends Error {}

interface Runtime {
  projectId: string;
  primaryEmail: string;
  secondaryEmail: string;
  kdfIterations: number;
  sessionTtlMs: number;
  firestore: FirestoreClient;
  config: AdminConfig;
  limiter: RateLimiter;
}

let runtimePromise: Promise<Runtime> | null = null;

async function getRuntime(env: Env): Promise<Runtime> {
  const projectId = env.FIREBASE_PROJECT_ID;
  const secret = env.FIREBASE_SERVICE_ACCOUNT;

  if (!projectId) {
    console.warn('[worker] runtime init failed: missing-project (FIREBASE_PROJECT_ID var)');
    throw new NotConfiguredError('Firebase service account is not configured');
  }
  if (!secret) {
    console.warn('[worker] runtime init failed: missing-secret (FIREBASE_SERVICE_ACCOUNT)');
    throw new NotConfiguredError('Firebase service account is not configured');
  }

  let sa: ServiceAccount;
  try {
    sa = parseServiceAccount(secret);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    // Sanitized: never log the secret contents, only the failure class.
    console.warn('[worker] runtime init failed: service-account parse error —', reason);
    throw new NotConfiguredError('Firebase service account is not configured');
  }

  const primaryEmail = (env.PRIMARY_ADMIN_EMAIL || DEFAULT_PRIMARY_EMAIL).toLowerCase().trim();
  const secondaryEmail = (env.SECONDARY_ADMIN_EMAIL || DEFAULT_SECONDARY_EMAIL).toLowerCase().trim();
  const kdfIterations = Number(env.KDF_ITERATIONS) > 0 ? Number(env.KDF_ITERATIONS) : DEFAULT_KDF_ITERATIONS;
  const sessionTtlMs = Number(env.SESSION_TTL_MS) > 0 ? Number(env.SESSION_TTL_MS) : DEFAULT_SESSION_TTL_MS;

  const accessToken = () => getAccessToken(sa);
  const firestore = new FirestoreClient(projectId, accessToken);
  const config = new AdminConfig(firestore, { primaryEmail, secondaryEmail });
  const limiter = new RateLimiter(firestore);

  return {
    projectId,
    primaryEmail,
    secondaryEmail,
    kdfIterations,
    sessionTtlMs,
    firestore,
    config,
    limiter,
  };
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 32 * 1024) {
    throw new HttpError(413, 'payload-too-large', 'Request body too large');
  }
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'invalid-json', 'Request body must be valid JSON');
  }
}

function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new HttpError(401, 'unauthorized', 'Missing bearer token');
  return m[1].trim();
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
  });
}

function errorJson(status: number, code: string, message: string): Response {
  return json({ ok: false, error: { code, message } }, status);
}

async function requireVerifiedToken(runtime: Runtime, request: Request) {
  const token = bearerToken(request);
  try {
    const verified = await verifyIdToken(token, runtime.projectId);
    return verified;
  } catch (err) {
    if (err instanceof VerifyError) {
      throw new HttpError(
        err.code === 'unverified-email' ? 403 : 401,
        err.code,
        err.message,
      );
    }
    throw new HttpError(401, 'invalid-token', 'Could not verify ID token');
  }
}

async function authorizeAdmin(runtime: Runtime, verified: { uid: string; email: string }) {
  const accounts = await runtime.config.getAccounts();
  let role: 'primary' | 'secondary' | null = null;
  if (verified.email === accounts.primaryEmail) role = 'primary';
  else if (verified.email === accounts.secondaryEmail) role = 'secondary';
  if (!role) {
    throw new HttpError(403, 'unknown-admin', 'Account is not an authorized administrator');
  }
  if (role === 'secondary' && !accounts.secondaryEnabled) {
    throw new HttpError(403, 'secondary-disabled', 'Secondary admin is disabled');
  }
  return { role, accounts };
}

async function requireActiveSession(runtime: Runtime, verified: { uid: string }, pinVersion: number) {
  const session = await runtime.config.getSession(verified.uid);
  if (!runtime.config.isSessionActive(session, pinVersion)) {
    throw new HttpError(401, 'no-active-session', 'PIN-verified session is missing or expired');
  }
  return session;
}

/*
 * Endpoint handlers
 */

async function handleVerifyPin(runtime: Runtime, request: Request): Promise<Response> {
  const body = await readJson(request);
  const pin = body.pin;
  if (!isValidPin(pin)) {
    throw new HttpError(400, 'invalid-pin', 'PIN must be exactly six digits');
  }

  const verified = await requireVerifiedToken(runtime, request);
  const { role } = await authorizeAdmin(runtime, verified);

  // Rate limit: per-uid, per-ip, and global shared-PIN.
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const perUid = await runtime.limiter.hit(`pin:uid:${verified.uid}`, {
    limit: 5,
    windowMs: RATE_WINDOW,
    lockMs: RATE_LOCK,
  });
  if (!perUid.allowed) {
    return json({ ok: false, error: { code: 'rate-limited', message: 'Too many PIN attempts', retryAfterMs: perUid.retryAfterMs } }, 429);
  }
  const perIp = await runtime.limiter.hit(`pin:ip:${ip}`, {
    limit: 10,
    windowMs: RATE_WINDOW,
    lockMs: RATE_LOCK,
  });
  if (!perIp.allowed) {
    return json({ ok: false, error: { code: 'rate-limited', message: 'Too many PIN attempts', retryAfterMs: perIp.retryAfterMs } }, 429);
  }
  const global = await runtime.limiter.hit('pin:global', {
    limit: 5,
    windowMs: RATE_WINDOW,
    lockMs: RATE_LOCK,
  });
  if (!global.allowed) {
    return json({ ok: false, error: { code: 'rate-limited', message: 'Too many PIN attempts', retryAfterMs: global.retryAfterMs } }, 429);
  }

  const security = await runtime.config.getSecurity();
  if (!security) {
    throw new HttpError(503, 'pin-not-initialized', 'Shared PIN has not been initialized');
  }

  const ok = await verifyPin(pin, { salt: security.pinSalt, hash: security.pinHash, iterations: security.pinIterations });
  if (!ok) {
    return json({ ok: false, error: { code: 'invalid-pin', message: 'Incorrect PIN' } }, 401);
  }

  const now = Date.now();
  await runtime.config.putSession({
    uid: verified.uid,
    email: verified.email,
    active: true,
    verifiedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + runtime.sessionTtlMs).toISOString(),
    pinVersion: security.pinVersion,
  });

  return json({ ok: true, role, expiresAt: new Date(now + runtime.sessionTtlMs).toISOString(), pinVersion: security.pinVersion });
}

async function handleChangePin(runtime: Runtime, request: Request): Promise<Response> {
  const body = await readJson(request);
  const { currentPin, newPin, confirmNewPin } = body;
  if (!isValidPin(currentPin) || !isValidPin(newPin) || !isValidPin(confirmNewPin)) {
    throw new HttpError(400, 'invalid-pin', 'All PIN fields must be exactly six digits');
  }
  if (newPin !== confirmNewPin) {
    throw new HttpError(400, 'pin-mismatch', 'New PINs do not match');
  }

  const verified = await requireVerifiedToken(runtime, request);
  const { role } = await authorizeAdmin(runtime, verified);
  if (role !== 'primary') {
    throw new HttpError(403, 'primary-only', 'Only the primary admin may change the shared PIN');
  }

  const security = await runtime.config.getSecurity();
  if (!security) {
    throw new HttpError(503, 'pin-not-initialized', 'Shared PIN has not been initialized');
  }

  await requireActiveSession(runtime, verified, security.pinVersion);

  const rate = await runtime.limiter.hit(`change:uid:${verified.uid}`, {
    limit: 5,
    windowMs: CHANGE_WINDOW,
    lockMs: RATE_LOCK,
  });
  if (!rate.allowed) {
    return json({ ok: false, error: { code: 'rate-limited', message: 'Too many change attempts', retryAfterMs: rate.retryAfterMs } }, 429);
  }

  const currentOk = await verifyPin(String(currentPin), { salt: security.pinSalt, hash: security.pinHash, iterations: security.pinIterations });
  if (!currentOk) {
    throw new HttpError(401, 'invalid-current-pin', 'Current PIN is incorrect');
  }

  const nextHash = await hashPin(String(newPin), runtime.kdfIterations);
  const nextSecurity = {
    pinHash: nextHash.hash,
    pinSalt: nextHash.salt,
    pinIterations: nextHash.iterations,
    pinVersion: security.pinVersion + 1,
    updatedAt: new Date().toISOString(),
  };
  await runtime.config.rotateSecurity(security, nextSecurity);
  await runtime.config.revokeAllSessions();

  return json({ ok: true, pinVersion: nextSecurity.pinVersion });
}

async function handleToggleSecondary(runtime: Runtime, request: Request): Promise<Response> {
  const body = await readJson(request);
  if (typeof body.enabled !== 'boolean') {
    throw new HttpError(400, 'invalid-enabled', 'enabled must be a boolean');
  }

  const verified = await requireVerifiedToken(runtime, request);
  const { role, accounts } = await authorizeAdmin(runtime, verified);
  if (role !== 'primary') {
    throw new HttpError(403, 'primary-only', 'Only the primary admin may manage the secondary admin');
  }

  const security = await runtime.config.getSecurity();
  if (!security) {
    throw new HttpError(503, 'pin-not-initialized', 'Shared PIN has not been initialized');
  }
  await requireActiveSession(runtime, verified, security.pinVersion);

  const rate = await runtime.limiter.hit(`toggle:uid:${verified.uid}`, {
    limit: 10,
    windowMs: CHANGE_WINDOW,
    lockMs: RATE_LOCK,
  });
  if (!rate.allowed) {
    return json({ ok: false, error: { code: 'rate-limited', message: 'Too many toggle attempts', retryAfterMs: rate.retryAfterMs } }, 429);
  }

  const next = await runtime.config.setSecondaryEnabled(body.enabled);
  if (!body.enabled) {
    await runtime.config.revokeSessionsByEmail(accounts.secondaryEmail);
  }
  return json({ ok: true, secondaryEnabled: next.secondaryEnabled });
}

async function handleLogout(runtime: Runtime, request: Request): Promise<Response> {
  const verified = await requireVerifiedToken(runtime, request);
  await runtime.config.revokeSession(verified.uid);
  return json({ ok: true });
}

async function handleBootstrap(runtime: Runtime, env: Env, request: Request): Promise<Response> {
  const operatorSecret = env.BOOTSTRAP_SECRET;
  if (!operatorSecret) {
    throw new HttpError(503, 'bootstrap-not-configured', 'Bootstrap secret is not configured');
  }
  const provided = request.headers.get('x-bootstrap-secret') || '';
  if (!constantTimeEqual(new TextEncoder().encode(provided), new TextEncoder().encode(operatorSecret))) {
    throw new HttpError(403, 'forbidden', 'Invalid bootstrap secret');
  }

  const body = await readJson(request);
  const { pin, confirmPin } = body;
  if (!isValidPin(pin) || !isValidPin(confirmPin)) {
    throw new HttpError(400, 'invalid-pin', 'PIN must be exactly six digits');
  }
  if (pin !== confirmPin) {
    throw new HttpError(400, 'pin-mismatch', 'PINs do not match');
  }

  const existing = await runtime.config.getSecurity();
  if (existing) {
    throw new HttpError(409, 'already-initialized', 'Shared PIN is already initialized');
  }

  const accounts = await runtime.config.getAccounts();
  await runtime.config.createAccountsIfMissing(accounts);

  const hashed = await hashPin(String(pin), runtime.kdfIterations);
  await runtime.config.createSecurity({
    pinHash: hashed.hash,
    pinSalt: hashed.salt,
    pinIterations: hashed.iterations,
    pinVersion: 1,
    updatedAt: new Date().toISOString(),
  });
  return json({ ok: true, pinVersion: 1 });
}

/*
 * Router
 */

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const POST_ENDPOINTS = new Set([
    '/api/auth/verify-pin',
    '/api/admin/change-pin',
    '/api/admin/toggle-secondary',
    '/api/auth/logout',
    '/api/admin/bootstrap-pin',
  ]);

  if (url.pathname === '/api/health') {
    if (request.method !== 'GET') {
      return errorJson(405, 'method-not-allowed', 'Method not allowed');
    }
    return json({ ok: true, service: 'omnitoolify', ts: Date.now() });
  }

  if (POST_ENDPOINTS.has(url.pathname)) {
    if (request.method !== 'POST') {
      return errorJson(405, 'method-not-allowed', 'Method not allowed');
    }
  } else {
    return errorJson(404, 'not-found', 'Not found');
  }

  let runtime: Runtime;
  try {
    runtime = await getRuntime(env);
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return errorJson(503, 'not-configured', err.message);
    }
    return errorJson(500, 'internal', 'Internal server error');
  }

  const handlers: Record<string, (r: Runtime, req: Request, e: Env) => Promise<Response>> = {
    '/api/auth/verify-pin': (r, req) => handleVerifyPin(r, req),
    '/api/admin/change-pin': (r, req) => handleChangePin(r, req),
    '/api/admin/toggle-secondary': (r, req) => handleToggleSecondary(r, req),
    '/api/auth/logout': (r, req) => handleLogout(r, req),
    '/api/admin/bootstrap-pin': (r, req, e) => handleBootstrap(r, e, req),
  };

  try {
    return await handlers[url.pathname](runtime, request, env);
  } catch (err) {
    if (err instanceof HttpError) {
      return errorJson(err.status, err.code, err.message);
    }
    console.error('[worker] unhandled error', err);
    return errorJson(500, 'internal', 'Internal server error');
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }
    return env.ASSETS.fetch(request);
  },
};
