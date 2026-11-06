/**
 * Firebase ID-token verification without firebase-admin.
 *
 * Verifies RS256 signature against Google's public signing certificates
 * (x509 PEM, fetched once and cached), then enforces issuer, audience,
 * expiry (handled by jwtVerify) and email_verified.
 */

import { decodeProtectedHeader, importX509, jwtVerify } from 'jose';

type VerifierKey = Awaited<ReturnType<typeof importX509>>;

const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const CERTS_TTL_MS = 6 * 60 * 60 * 1000;

interface CertsCache {
  at: number;
  keys: Map<string, VerifierKey>;
}

let certsCache: CertsCache | null = null;

async function fetchKeys(): Promise<Map<string, VerifierKey>> {
  const res = await fetch(CERTS_URL, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!res.ok) {
    throw new Error(`Google cert fetch failed: HTTP ${res.status}`);
  }
  const certs = (await res.json()) as Record<string, string>;
  const keys = new Map<string, VerifierKey>();
  for (const [kid, pem] of Object.entries(certs)) {
    keys.set(kid, await importX509(pem, 'RS256'));
  }
  return keys;
}

async function getKeys(): Promise<Map<string, VerifierKey>> {
  if (certsCache && Date.now() - certsCache.at < CERTS_TTL_MS) {
    return certsCache.keys;
  }
  const keys = await fetchKeys();
  certsCache = { at: Date.now(), keys };
  return keys;
}

export interface VerifiedIdToken {
  uid: string;
  email: string;
  emailVerified: boolean;
}

export async function verifyIdToken(
  token: string,
  projectId: string,
): Promise<VerifiedIdToken> {
  const header = decodeProtectedHeader(token);
  const kid = typeof header.kid === 'string' ? header.kid : undefined;

  let keys = await getKeys();
  let key = kid ? keys.get(kid) : undefined;
  if (!key && kid) {
    // Unknown kid: the certificate set may have rotated — refetch once.
    certsCache = null;
    keys = await getKeys();
    key = keys.get(kid);
  }
  if (!key) {
    throw new VerifyError('unknown-key', 'Signing key not recognized');
  }

  let payload: Record<string, unknown>;
  try {
    const result = await jwtVerify(token, key, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });
    payload = result.payload as Record<string, unknown>;
  } catch (err) {
    throw new VerifyError(
      'invalid-token',
      err instanceof Error ? err.message : 'Invalid ID token',
    );
  }

  const uid = typeof payload.sub === 'string' ? payload.sub : '';
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
  const emailVerified = payload.email_verified === true;

  if (!uid || !email) {
    throw new VerifyError('invalid-token', 'ID token is missing uid/email');
  }
  if (!emailVerified) {
    throw new VerifyError('unverified-email', 'Email is not verified');
  }

  return { uid, email, emailVerified };
}

export class VerifyError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'VerifyError';
  }
}
