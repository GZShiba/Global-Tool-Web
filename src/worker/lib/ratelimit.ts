/**
 * Server-side rate limiting with atomic compare-and-swap counters.
 *
 * Counters live in Firestore (`admin_config/ratelimit/<key>`) and are
 * updated via update-time preconditions (CAS). Read-then-write races are
 * resolved by retrying the CAS; no insecure read-modify-write is used.
 *
 * Firestore REST has no transactions; remote CAS with preconditions is the
 * supported atomic primitive on this stack. Cloudflare KV is deliberately
 * NOT used (eventual consistency + 1 write/s same-key limit).
 */

import { ConflictError, FirestoreClient, type FirestoreDocument } from './firestoreRest';

const COLLECTION = 'admin_config/ratelimit';

export interface RateLimitConfig {
  /** max attempts within the window */
  limit: number;
  /** sliding/rolling window in ms */
  windowMs: number;
  /** lockout duration in ms after limit is reached */
  lockMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

function toDoc(rec: { count: number; windowStart: number; lockUntil: number }) {
  return {
    count: rec.count,
    windowStart: rec.windowStart,
    lockUntil: rec.lockUntil,
  };
}

function fromDoc(doc: FirestoreDocument | null): {
  count: number;
  windowStart: number;
  lockUntil: number;
} {
  const d = doc?.data as { count?: number; windowStart?: number; lockUntil?: number } | undefined;
  return {
    count: typeof d?.count === 'number' ? d.count : 0,
    windowStart: typeof d?.windowStart === 'number' ? d.windowStart : Date.now(),
    lockUntil: typeof d?.lockUntil === 'number' ? d.lockUntil : 0,
  };
}

export class RateLimiter {
  constructor(private readonly fs: FirestoreClient) {}

  /**
   * Record an attempt and decide whether it is allowed.
   * Returns { allowed: false, retryAfterMs } when locked out or over limit.
   */
  async hit(key: string, cfg: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const docId = sanitizeKey(key);

    for (let attempt = 0; attempt < 4; attempt++) {
      const doc = await this.fs.get(COLLECTION, docId);
      const rec = fromDoc(doc);

      if (rec.lockUntil > now) {
        return { allowed: false, retryAfterMs: rec.lockUntil - now };
      }

      // New window (use a sliding window: reset if the window expired).
      const windowStart = rec.windowStart > now - cfg.windowMs ? rec.windowStart : now;
      const inWindow = windowStart === rec.windowStart;
      const nextCount = (inWindow ? rec.count : 0) + 1;

      const next = { count: nextCount, windowStart, lockUntil: rec.lockUntil };

      if (nextCount > cfg.limit) {
        next.lockUntil = now + cfg.lockMs;
        next.count = 0;
        try {
          await this.write(doc, docId, next);
        } catch (err) {
          if (err instanceof ConflictError) continue;
          throw err;
        }
        return { allowed: false, retryAfterMs: cfg.lockMs };
      }

      try {
        await this.write(doc, docId, next);
        return { allowed: true, retryAfterMs: 0 };
      } catch (err) {
        if (err instanceof ConflictError) continue;
        throw err;
      }
    }

    // Too many concurrent CAS conflicts: fail closed rather than allow.
    throw new Error('Rate limit counter busy (retry)');
  }

  private async write(
    current: FirestoreDocument | null,
    docId: string,
    rec: { count: number; windowStart: number; lockUntil: number },
  ): Promise<void> {
    if (!current?.updateTime) {
      try {
        await this.fs.create(COLLECTION, docId, toDoc(rec));
        return;
      } catch (err) {
        if (err instanceof ConflictError) {
          // Created concurrently — fall through to CAS on the winner.
        } else {
          throw err;
        }
      }
    }
    const latest = current?.updateTime ? current : await this.fs.get(COLLECTION, docId);
    if (!latest?.updateTime) throw new ConflictError('Counter vanished');
    await this.fs.updateCas(COLLECTION, docId, toDoc(rec), latest.updateTime);
  }
}

function sanitizeKey(key: string): string {
  // Firestore document ids may not contain '/'
  return key.replace(/[\/]/g, '_').slice(0, 1500);
}
