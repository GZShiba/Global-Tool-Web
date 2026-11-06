/**
 * Google OAuth2 service-account JWT → access token, using Web Crypto +
 * jose (RS256). Used to authorize Firestore REST calls. The access token
 * is cached in-memory and NEVER returned to the browser.
 */

import { importPKCS8, SignJWT } from 'jose';

type SigningKey = Awaited<ReturnType<typeof importPKCS8>>;

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/datastore';
const CACHE_SAFETY_MS = 10 * 60 * 1000;

export interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
}

export function parseServiceAccount(json: string): ServiceAccount {
  // Tolerate common paste artifacts: surrounding quotes and literal \n
  // sequences inside the private key (never logs or exposes contents).
  const cleaned = json.trim().replace(/^["']|["']$/g, '');
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
  }
  const clientEmail = parsed.client_email;
  const privateKeyRaw = parsed.private_key;
  if (typeof clientEmail !== 'string' || typeof privateKeyRaw !== 'string') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing client_email/private_key');
  }
  let privateKey: string = privateKeyRaw;
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  return { clientEmail, privateKey };
}

interface TokenCache {
  promise: Promise<string>;
  expiresAt: number;
}

let cache: TokenCache | null = null;

async function signAssertion(sa: ServiceAccount): Promise<string> {
  const key: SigningKey = await importPKCS8(sa.privateKey, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.clientEmail)
    .setSubject(sa.clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
}

async function fetchAccessToken(sa: ServiceAccount): Promise<string> {
  const assertion = await signAssertion(sa);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      `OAuth token exchange failed: ${data.error ?? res.status} ${data.error_description ?? ''}`,
    );
  }
  const expiresInMs = (data.expires_in ?? 3600) * 1000;
  cache = { promise: Promise.resolve(data.access_token), expiresAt: Date.now() + expiresInMs - CACHE_SAFETY_MS };
  return data.access_token;
}

/** Returns a valid access token, reusing it until just before expiry. */
export async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.promise;
  }
  const promise = fetchAccessToken(sa);
  cache = { promise, expiresAt: Date.now() + 50 * 60 * 1000 };
  try {
    const token = await promise;
    // Refresh the expiry from the real response.
    return token;
  } catch (err) {
    cache = null;
    throw err;
  }
}
