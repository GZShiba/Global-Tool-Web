/**
 * Firebase Storage uploads for CMS media (tool images, banners, slides).
 * Returns a public download URL on success. Throws a descriptive error when
 * Storage is not configured or the upload fails.
 */
import { getStorageSafe } from './firebase';
import { sanitizeStoragePath } from './cmsPure';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function uploadCmsFile(file: File, path: string): Promise<string> {
  const storage = await getStorageSafe();
  if (!storage) {
    throw new Error('Firebase Storage is not configured. Set VITE_FIREBASE_* and deploy storage rules.');
  }
  const ext = `.${file.name.split('.').pop()?.toLowerCase() || 'png'}`;
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type "${ext}" — use PNG, JPEG, WebP, GIF, or SVG.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error('File too large (max 8 MB).');
  }
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const cleanPath = sanitizeStoragePath(path);
  const storageRef = ref(storage, cleanPath.endsWith(ext) ? cleanPath : `${cleanPath}${ext}`);
  const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  return getDownloadURL(snapshot.ref);
}
