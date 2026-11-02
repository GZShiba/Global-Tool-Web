/**
 * Firebase initialization for OmniToolify.
 *
 * Public client configuration comes from Vite environment variables:
 *   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN,
 *   VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET,
 *   VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
 *
 * Never put real keys/secrets in source or committed files. If the config is
 * missing, every accessor resolves to `null` and callers use their existing
 * fallbacks (local admin API → static catalog). Firebase is initialized at
 * most once and only when configuration exists.
 */
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export function readFirebaseConfig(): FirebaseConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
  };
}

export function isFirebaseConfigured(): boolean {
  const cfg = readFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
}

let appCache: FirebaseApp | null | undefined;
let firestoreCache: Firestore | null | undefined;
let storageCache: FirebaseStorage | null | undefined;

/** Returns the Firebase app or null when unconfigured/initialization fails. */
export async function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (appCache !== undefined) return appCache;
  if (!isFirebaseConfigured()) {
    appCache = null;
    return null;
  }
  try {
    const { initializeApp } = await import('firebase/app');
    appCache = initializeApp(readFirebaseConfig() as Record<string, string>);
  } catch (err) {
    console.warn('[firebase] initialization failed — continuing with local fallback.', err);
    appCache = null;
  }
  return appCache;
}

/** Firestore instance or null (unconfigured / error). */
export async function getFirestoreSafe(): Promise<Firestore | null> {
  if (firestoreCache !== undefined) return firestoreCache;
  const app = await getFirebaseApp();
  if (!app) {
    firestoreCache = null;
    return null;
  }
  try {
    const { getFirestore } = await import('firebase/firestore');
    firestoreCache = getFirestore(app);
  } catch (err) {
    console.warn('[firebase] Firestore unavailable — continuing with local fallback.', err);
    firestoreCache = null;
  }
  return firestoreCache;
}

/** Firebase Storage instance or null (unconfigured / error). */
export async function getStorageSafe(): Promise<FirebaseStorage | null> {
  if (storageCache !== undefined) return storageCache;
  const app = await getFirebaseApp();
  if (!app) {
    storageCache = null;
    return null;
  }
  try {
    const { getStorage } = await import('firebase/storage');
    storageCache = getStorage(app, readFirebaseConfig().storageBucket || undefined);
  } catch (err) {
    console.warn('[firebase] Storage unavailable — continuing with local fallback.', err);
    storageCache = null;
  }
  return storageCache;
}
