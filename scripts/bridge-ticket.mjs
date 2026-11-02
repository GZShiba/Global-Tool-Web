/**
 * Shared bridge-ticket primitives.
 *
 * The local admin server mints a short-lived HMAC-SHA256 ticket after a
 * successful, fully-authenticated admin session check. The hosted Cloud
 * Function verifies the ticket with the SAME secret (ADMIN_BRIDGE_SECRET)
 * before performing Firestore writes. Secrets exist only on the local server
 * and the function environment — never in the browser.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export function ticketSecret() {
  return process.env.ADMIN_BRIDGE_SECRET || '';
}

export function mintTicket(adminId, { ttlMs = 5 * 60 * 1000, secret } = {}) {
  const key = secret || ticketSecret();
  if (!key) throw new Error('ADMIN_BRIDGE_SECRET is not configured');
  const payload = {
    sub: String(adminId),
    iat: Date.now(),
    exp: Date.now() + ttlMs,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', key).update(body).digest('hex');
  return `${body}.${sig}`;
}

export function verifyTicket(ticket, { secret } = {}) {
  const key = secret || ticketSecret();
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
