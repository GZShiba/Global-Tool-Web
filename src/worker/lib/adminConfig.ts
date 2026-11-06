/**
 * Protected admin configuration stored in Firestore under `admin_config/`.
 *
 * Both documents are only ever written by the Worker (service account);
 * Firestore rules will deny all client access in Step 4. Until then the
 * catch-all deny rule already blocks client reads/writes to these paths
 * because the collection is not whitelisted — server writes bypass rules.
 */

import { ConflictError, FirestoreClient, type FirestoreDocument } from './firestoreRest';

const ACCOUNTS_COLLECTION = 'admin_config';
const ACCOUNTS_DOC = 'accounts';
const SECURITY_DOC = 'security';
const SESSIONS_COLLECTION = 'admin_config/sessions';

export interface AccountsRecord {
  primaryEmail: string;
  secondaryEmail: string;
  secondaryEnabled: boolean;
}

export interface SecurityRecord {
  pinHash: string;
  pinSalt: string;
  pinIterations: number;
  pinVersion: number;
  updatedAt: string;
}

export interface SessionRecord {
  uid: string;
  email: string;
  active: boolean;
  verifiedAt: string;
  expiresAt: string;
  pinVersion: number;
}

export class AdminConfig {
  constructor(
    private readonly fs: FirestoreClient,
    private readonly defaults: {
      primaryEmail: string;
      secondaryEmail: string;
    },
  ) {}

  async getAccounts(): Promise<AccountsRecord> {
    const doc = await this.fs.get(ACCOUNTS_COLLECTION, ACCOUNTS_DOC);
    if (!doc) {
      return {
        primaryEmail: this.defaults.primaryEmail,
        secondaryEmail: this.defaults.secondaryEmail,
        secondaryEnabled: true,
      };
    }
    const d = doc.data as Partial<AccountsRecord>;
    return {
      primaryEmail: typeof d.primaryEmail === 'string' ? d.primaryEmail : this.defaults.primaryEmail,
      secondaryEmail: typeof d.secondaryEmail === 'string' ? d.secondaryEmail : this.defaults.secondaryEmail,
      secondaryEnabled: d.secondaryEnabled !== false,
    };
  }

  async createAccountsIfMissing(accounts: AccountsRecord): Promise<void> {
    const existing = await this.fs.get(ACCOUNTS_COLLECTION, ACCOUNTS_DOC);
    if (existing) return;
    try {
      await this.fs.create(ACCOUNTS_COLLECTION, ACCOUNTS_DOC, accounts);
    } catch (err) {
      if (!(err instanceof ConflictError)) throw err;
    }
  }

  /** CAS toggle of the Secondary enabled state. Returns the new record. */
  async setSecondaryEnabled(enabled: boolean): Promise<AccountsRecord> {
    const doc = await this.fs.get(ACCOUNTS_COLLECTION, ACCOUNTS_DOC);
    if (!doc?.updateTime) throw new Error('Accounts config not initialized');
    const current = (doc.data as Partial<AccountsRecord>) ?? {};
    const next: AccountsRecord = {
      primaryEmail: typeof current.primaryEmail === 'string' ? current.primaryEmail : this.defaults.primaryEmail,
      secondaryEmail: typeof current.secondaryEmail === 'string' ? current.secondaryEmail : this.defaults.secondaryEmail,
      secondaryEnabled: enabled,
    };
    await this.fs.updateCas(ACCOUNTS_COLLECTION, ACCOUNTS_DOC, next, doc.updateTime);
    return next;
  }

  async getSecurity(): Promise<SecurityRecord | null> {
    const doc = await this.fs.get(ACCOUNTS_COLLECTION, SECURITY_DOC);
    if (!doc) return null;
    const d = doc.data as Partial<SecurityRecord>;
    if (typeof d.pinHash !== 'string' || typeof d.pinSalt !== 'string') return null;
    return {
      pinHash: d.pinHash,
      pinSalt: d.pinSalt,
      pinIterations: typeof d.pinIterations === 'number' ? d.pinIterations : 0,
      pinVersion: typeof d.pinVersion === 'number' ? d.pinVersion : 1,
      updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
    };
  }

  /** One-time bootstrap: only allowed when no security record exists. */
  async createSecurity(record: SecurityRecord): Promise<void> {
    const existing = await this.fs.get(ACCOUNTS_COLLECTION, SECURITY_DOC);
    if (existing) throw new Error('PIN already initialized');
    try {
      await this.fs.create(ACCOUNTS_COLLECTION, SECURITY_DOC, record);
    } catch (err) {
      if (err instanceof ConflictError) throw new Error('PIN already initialized');
      throw err;
    }
  }

  /** CAS rotation of the PIN record (increments version). */
  async rotateSecurity(current: SecurityRecord, next: SecurityRecord): Promise<void> {
    const doc = await this.fs.get(ACCOUNTS_COLLECTION, SECURITY_DOC);
    if (!doc?.updateTime) throw new Error('Security config missing');
    if (doc.data?.pinVersion !== current.pinVersion) {
      throw new Error('PIN changed concurrently; retry');
    }
    await this.fs.updateCas(ACCOUNTS_COLLECTION, SECURITY_DOC, next, doc.updateTime);
  }

  /* ----------------------------- Sessions ----------------------------- */

  /** Read the session for a uid (null when absent). */
  async getSession(uid: string): Promise<SessionRecord | null> {
    const doc = await this.fs.get(SESSIONS_COLLECTION, uid);
    if (!doc) return null;
    return doc.data as unknown as SessionRecord;
  }

  /** Create or replace the session for a uid (reverification). */
  async putSession(session: SessionRecord): Promise<void> {
    const docId = session.uid;
    // Firestore rules compare expiresAt against request.time — store real
    // Timestamps, not ISO strings.
    const payload = {
      ...session,
      verifiedAt: new Date(session.verifiedAt),
      expiresAt: new Date(session.expiresAt),
    };
    const existing = await this.fs.get(SESSIONS_COLLECTION, docId);
    if (!existing?.updateTime) {
      try {
        await this.fs.create(SESSIONS_COLLECTION, docId, payload);
        return;
      } catch (err) {
        if (!(err instanceof ConflictError)) throw err;
      }
    }
    const latest = existing?.updateTime ? existing : await this.fs.get(SESSIONS_COLLECTION, docId);
    if (!latest?.updateTime) throw new Error('Session vanished');
    await this.fs.updateCas(SESSIONS_COLLECTION, docId, payload, latest.updateTime);
  }

  /** Revoke a single session (idempotent). */
  async revokeSession(uid: string): Promise<void> {
    const existing = await this.fs.get(SESSIONS_COLLECTION, uid);
    if (!existing?.updateTime) return;
    await this.fs.updateCas(
      SESSIONS_COLLECTION,
      uid,
      { ...(existing.data as Record<string, unknown>), active: false, expiresAt: new Date(0) },
      existing.updateTime,
    );
  }

  /** Revoke ALL sessions (PIN rotation). */
  async revokeAllSessions(): Promise<void> {
    let pageToken: string | undefined;
    for (let page = 0; page < 5; page++) {
      const result = await this.fs.list(SESSIONS_COLLECTION, 100, pageToken);
      for (const doc of result.documents) {
        const docId = doc.name.split('/').pop();
        if (!docId || !doc.updateTime) continue;
        try {
          await this.fs.updateCas(
            SESSIONS_COLLECTION,
            docId,
            { ...(doc.data as Record<string, unknown>), active: false, expiresAt: new Date(0) },
            doc.updateTime,
          );
        } catch (err) {
          if (!(err instanceof ConflictError)) throw err;
        }
      }
      if (!result.nextPageToken) break;
      pageToken = result.nextPageToken;
    }
  }

  /** Revoke every session belonging to a given email (e.g. Secondary disable). */
  async revokeSessionsByEmail(email: string): Promise<void> {
    let pageToken: string | undefined;
    for (let page = 0; page < 5; page++) {
      const result = await this.fs.list(SESSIONS_COLLECTION, 100, pageToken);
      for (const doc of result.documents) {
        const docId = doc.name.split('/').pop();
        const data = doc.data as Partial<SessionRecord> | undefined;
        if (!docId || !doc.updateTime || !data) continue;
        if (String(data.email || '').toLowerCase() !== email.toLowerCase()) continue;
        try {
          await this.fs.updateCas(
            SESSIONS_COLLECTION,
            docId,
            { ...(data as Record<string, unknown>), active: false, expiresAt: new Date(0) },
            doc.updateTime,
          );
        } catch (err) {
          if (!(err instanceof ConflictError)) throw err;
        }
      }
      if (!result.nextPageToken) break;
      pageToken = result.nextPageToken;
    }
  }

  /** True when the session is active and unexpired (and PIN version matches). */
  isSessionActive(session: SessionRecord | null, pinVersion: number): boolean {
    if (!session) return false;
    if (!session.active) return false;
    if (session.pinVersion !== pinVersion) return false;
    const expiresAt = Date.parse(session.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
    return true;
  }
}
