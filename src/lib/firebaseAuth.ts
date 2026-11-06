/**
 * Firebase Authentication (Email/Password) session management for the Admin
 * Panel. Session persistence uses Firebase Auth's bundled localStorage
 * persistence (browserIdPersistence) — no plaintext passwords stored, no
 * custom backend, no custom claims. Firestore rules are the real
 * authorization gate (admin email allowlist).
 */
import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { getAuthSafe } from './firebase';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

export function useFirebaseAuth() {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let unsub: (() => void) | null = null;
    (async () => {
      const auth = await getAuthSafe();
      if (!auth) {
        if (alive) { setStatus('unauthenticated'); setUser(null); }
        return;
      }
      const { onAuthStateChanged, setPersistence, browserLocalPersistence } = await import('firebase/auth');
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch { /* persistence best-effort */ }
      unsub = onAuthStateChanged(auth, u => {
        if (!alive) return;
        setUser(u);
        setStatus(u ? 'authenticated' : 'unauthenticated');
      });
    })();
    return () => { alive = false; unsub?.(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    const auth = await getAuthSafe();
    if (!auth) { setError('Firebase Auth is not configured.'); return false; }
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
      return false;
    }
  };

  const signOut = async () => {
    const auth = await getAuthSafe();
    if (auth) {
      const { signOut } = await import('firebase/auth');
      await signOut(auth).catch(() => {});
    }
    setUser(null);
    setStatus('unauthenticated');
  };

  return { status, user, error, setError, signIn, signOut };
}
