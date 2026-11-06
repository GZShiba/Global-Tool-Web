/**
 * Minimal Firestore REST client (service-account authorized).
 *
 * Supports: document read, create with explicit documentId, update with
 * `currentDocument.updateTime` precondition (compare-and-swap), and delete.
 * No gRPC, no Admin SDK, no transactions (REST has none) — atomicity is
 * achieved with update-time preconditions.
 */

const BASE = 'https://firestore.googleapis.com/v1';

export type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { referenceValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === 'object') {
    return { mapValue: { fields: encodeFields(value) } };
  }
  return { stringValue: String(value) };
}

export function encodeFields(data: object): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = encodeValue(v);
  }
  return fields;
}

export function decodeValue(value: FirestoreValue): unknown {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(decodeValue);
  }
  if ('mapValue' in value) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value.mapValue.fields ?? {})) {
      out[k] = decodeValue(v);
    }
    return out;
  }
  return null;
}

export interface FirestoreDocument {
  name: string;
  createTime?: string;
  updateTime?: string;
  fields?: Record<string, FirestoreValue>;
  data?: Record<string, unknown>;
}

export interface FirestoreListResult {
  documents: FirestoreDocument[];
  nextPageToken?: string;
}

export class FirestoreClient {
  constructor(
    private readonly projectId: string,
    private readonly getToken: () => Promise<string>,
  ) {}

  private docPath(collection: string, docId: string): string {
    return `${BASE}/projects/${this.projectId}/databases/(default)/documents/${collection}/${docId}`;
  }

  private colPath(collection: string): string {
    return `${BASE}/projects/${this.projectId}/databases/(default)/documents/${collection}`;
  }

  private async authed(
    url: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const token = await this.getToken();
    return fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  }

  private static decode(doc: FirestoreDocument): FirestoreDocument {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(doc.fields ?? {})) {
      data[k] = decodeValue(v);
    }
    return { ...doc, data };
  }

  /** Read a document. Returns null when missing. */
  async get(collection: string, docId: string): Promise<FirestoreDocument | null> {
    const res = await this.authed(this.docPath(collection, docId), { method: 'GET' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore read failed: HTTP ${res.status}`);
    return FirestoreClient.decode((await res.json()) as FirestoreDocument);
  }

  /** Create with an explicit documentId. Throws ConflictError on duplicates. */
  async create(
    collection: string,
    docId: string,
    data: object,
  ): Promise<FirestoreDocument> {
    const url = `${this.colPath(collection)}?documentId=${encodeURIComponent(docId)}`;
    const res = await this.authed(url, {
      method: 'POST',
      body: JSON.stringify({ fields: encodeFields(data) }),
    });
    if (res.status === 409) {
      throw new ConflictError('Document already exists');
    }
    if (!res.ok) throw new Error(`Firestore create failed: HTTP ${res.status}`);
    return FirestoreClient.decode((await res.json()) as FirestoreDocument);
  }

  /**
   * Compare-and-swap update: requires the stored document to still have the
   * given updateTime. Throws ConflictError when the precondition fails.
   */
  async updateCas(
    collection: string,
    docId: string,
    data: object,
    expectedUpdateTime: string,
  ): Promise<FirestoreDocument> {
    const params = new URLSearchParams();
    params.set('currentDocument.updateTime', expectedUpdateTime);
    for (const field of Object.keys(data)) {
      params.append('updateMask.fieldPaths', field);
    }
    const res = await this.authed(`${this.docPath(collection, docId)}?${params}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: encodeFields(data) }),
    });
    if (res.status === 409 || res.status === 412) {
      throw new ConflictError('Precondition failed (concurrent update)');
    }
    if (!res.ok) throw new Error(`Firestore update failed: HTTP ${res.status}`);
    return FirestoreClient.decode((await res.json()) as FirestoreDocument);
  }

  async delete(collection: string, docId: string): Promise<void> {
    const res = await this.authed(this.docPath(collection, docId), { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Firestore delete failed: HTTP ${res.status}`);
    }
  }

  async list(collection: string, pageSize = 100, pageToken?: string): Promise<FirestoreListResult> {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await this.authed(`${this.colPath(collection)}?${params}`, { method: 'GET' });
    if (!res.ok) throw new Error(`Firestore list failed: HTTP ${res.status}`);
    const body = (await res.json()) as FirestoreListResult;
    return {
      documents: (body.documents ?? []).map(FirestoreClient.decode),
      nextPageToken: body.nextPageToken,
    };
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
