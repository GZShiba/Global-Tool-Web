/**
 * Constant-time comparison (best-effort for JS) and PBKDF2-SHA256 hashing
 * using the Web Crypto API — the only KDF available in `crypto.subtle`
 * (scrypt is NOT available). No Node.js crypto, no firebase-admin.
 */

const enc = new TextEncoder();

/** Constant-time-ish byte equality; XOR-accumulate, same loop for both lengths. */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function randomSalt(bytes = 16): Uint8Array {
  const salt = new Uint8Array(bytes);
  crypto.getRandomValues(salt);
  return salt;
}

/** PBKDF2-SHA256 via Web Crypto. Returns 256-bit derived bytes. */
export async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

export interface PinRecordInput {
  pin: string;
  iterations: number;
}

export async function hashPin(pin: string, iterations: number): Promise<{
  salt: string;
  hash: string;
  iterations: number;
}> {
  const salt = randomSalt(16);
  const derived = await pbkdf2(pin, salt, iterations);
  return { salt: bytesToHex(salt), hash: bytesToHex(derived), iterations };
}

/** Verify a PIN against a stored record. Constant-time on the digest. */
export async function verifyPin(
  pin: string,
  stored: { salt: string; hash: string; iterations: number },
): Promise<boolean> {
  const salt = hexToBytes(stored.salt);
  const derived = await pbkdf2(pin, salt, stored.iterations);
  return constantTimeEqual(derived, hexToBytes(stored.hash));
}

/** Exactly six decimal digits. */
export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{6}$/.test(pin);
}
