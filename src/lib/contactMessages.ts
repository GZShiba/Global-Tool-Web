/**
 * Contact message system — Firestore-backed.
 *
 * Public visitors may CREATE messages in `contact_messages` (validated by
 * security rules); only the allowlisted admin can read/update/delete them.
 * Message contents are never logged or placed in public state/localStorage.
 */
import { getFirestoreSafe, isFirebaseConfigured } from './firebase';
import { isValidDocId } from './cmsPure';

export type ContactMessageStatus = 'new' | 'read' | 'archived';

export interface ContactMessage {
  __docId?: string;
  name: string;
  email: string;
  subjectType: string; // e.g. 'advertising' | 'custom'
  subject: string;     // actual subject text (predefined label or custom text)
  message: string;
  status: ContactMessageStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactSubjectOption {
  id: string;
  label: string;
  enabled: boolean;
}

export const COLLECTIONS = {
  messages: 'contact_messages',
  config: 'contact_messages_config',
} as const;

export const DEFAULT_SUBJECTS: ContactSubjectOption[] = [
  { id: 'advertising', label: 'Advertising', enabled: true },
  { id: 'bug-report', label: 'Bug Report', enabled: true },
  { id: 'feature-suggestion', label: 'Feature Suggestion', enabled: true },
  { id: 'tool-suggestion', label: 'Tool Suggestion', enabled: true },
  { id: 'business-inquiry', label: 'Business Inquiry', enabled: true },
  { id: 'general-question', label: 'General Question', enabled: true },
  { id: 'other', label: 'Other', enabled: true },
];

export const CUSTOM_SUBJECT_ID = 'custom';

export const LIMITS = {
  nameMax: 120,
  emailMax: 254,
  subjectTypeMax: 40,
  subjectMax: 200,
  messageMin: 10,
  messageMax: 5000,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactInput {
  name: string;
  email: string;
  subjectType: string;
  subject: string;
  message: string;
}

/** Pure client-side validation (mirrors the security-rule constraints). */
export function validateContactInput(input: ContactInput): Partial<Record<keyof ContactInput, string>> {
  const errors: Partial<Record<keyof ContactInput, string>> = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Please enter your name.';
  else if (name.length > LIMITS.nameMax) errors.name = `Name must be ${LIMITS.nameMax} characters or fewer.`;

  const email = input.email.trim();
  if (!email) errors.email = 'Please enter your email address.';
  else if (email.length > LIMITS.emailMax) errors.email = `Email must be ${LIMITS.emailMax} characters or fewer.`;
  else if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email address.';

  const subjectType = input.subjectType.trim();
  if (!subjectType) errors.subjectType = 'Please choose a subject.';
  else if (subjectType.length > LIMITS.subjectTypeMax) errors.subjectType = 'Invalid subject selection.';

  const subject = input.subject.trim();
  if (!subject) errors.subject = 'Please enter a subject.';
  else if (subject.length > LIMITS.subjectMax) errors.subject = `Subject must be ${LIMITS.subjectMax} characters or fewer.`;

  const message = input.message.trim();
  if (!message) errors.message = 'Please enter a message.';
  else if (message.length < LIMITS.messageMin) errors.message = `Message must be at least ${LIMITS.messageMin} characters.`;
  else if (message.length > LIMITS.messageMax) errors.message = `Message must be ${LIMITS.messageMax} characters or fewer.`;

  return errors;
}

/* ------------------------------------------------------------------ */
/* Public submission                                                   */
/* ------------------------------------------------------------------ */

/**
 * Save a validated contact message. Returns the created document id.
 * The caller must have validated input already (`validateContactInput`).
 */
export async function submitContactMessage(input: ContactInput): Promise<string> {
  if (!isFirebaseConfigured()) throw new Error('Contact form is unavailable right now — please try again later.');
  const db = await getFirestoreSafe();
  if (!db) throw new Error('Contact form is unavailable right now — please try again later.');

  const errors = validateContactInput(input);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const ref = await addDoc(collection(db, COLLECTIONS.messages), {
    name: input.name.trim(),
    email: input.email.trim(),
    subjectType: input.subjectType.trim(),
    subject: input.subject.trim(),
    message: input.message.trim(),
    status: 'new',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/* ------------------------------------------------------------------ */
/* Subject configuration (public read + admin write)                   */
/* ------------------------------------------------------------------ */

const CACHE_TTL_MS = 30_000;
let subjectsCache: { at: number; value: ContactSubjectOption[] } | null = null;

export function clearContactCache() {
  subjectsCache = null;
}

async function fetchSubjectsFromFirestore(): Promise<ContactSubjectOption[] | null> {
  if (!isFirebaseConfigured()) return null;
  const db = await getFirestoreSafe();
  if (!db) return null;
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, COLLECTIONS.config, 'subjects'));
    if (!snap.exists()) return null;
    const data = snap.data();
    const list = Array.isArray(data.subjects) ? data.subjects : null;
    if (!list) return null;
    return list
      .filter(s => s && typeof s.id === 'string' && typeof s.label === 'string')
      .map(s => ({ id: s.id, label: s.label, enabled: s.enabled !== false }));
  } catch {
    return null;
  }
}

/** Enabled predefined subjects (defaults when no config exists). */
export async function getEnabledSubjects(): Promise<ContactSubjectOption[]> {
  if (subjectsCache && Date.now() - subjectsCache.at < CACHE_TTL_MS) return subjectsCache.value;
  const fetched = await fetchSubjectsFromFirestore();
  const list = fetched && fetched.length > 0 ? fetched : DEFAULT_SUBJECTS;
  subjectsCache = { at: Date.now(), value: list };
  return list.filter(s => s.enabled);
}

/** All configured subjects (admin management view). */
export async function getAllSubjects(): Promise<ContactSubjectOption[]> {
  const fetched = await fetchSubjectsFromFirestore();
  if (fetched && fetched.length > 0) return fetched;
  return DEFAULT_SUBJECTS;
}

/** Admin: persist subject configuration. */
export async function saveSubjectsConfig(subjects: ContactSubjectOption[]): Promise<void> {
  if (!isFirebaseConfigured()) throw new Error('Firestore unavailable — cannot save subject settings.');
  const db = await getFirestoreSafe();
  if (!db) throw new Error('Firestore unavailable — cannot save subject settings.');
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, COLLECTIONS.config, 'subjects'), { subjects }, { merge: true });
  clearContactCache();
}

/* ------------------------------------------------------------------ */
/* Admin message management                                             */
/* ------------------------------------------------------------------ */

function toContactMessage(data: Record<string, unknown>, docId: string): ContactMessage {
  const msg: ContactMessage = {
    __docId: docId,
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : '',
    subjectType: typeof data.subjectType === 'string' ? data.subjectType : '',
    subject: typeof data.subject === 'string' ? data.subject : '',
    message: typeof data.message === 'string' ? data.message : '',
    status: data.status === 'read' || data.status === 'archived' ? data.status : 'new',
  };
  const createdAt = data.createdAt;
  if (createdAt) {
    msg.createdAt = typeof createdAt === 'string' ? createdAt : String(createdAt);
  }
  return msg;
}

export async function fetchAllContactMessages(): Promise<ContactMessage[]> {
  if (!isFirebaseConfigured()) throw new Error('Firestore unavailable — cannot load messages.');
  const db = await getFirestoreSafe();
  if (!db) throw new Error('Firestore unavailable — cannot load messages.');
  const { collection, getDocs } = await import('firebase/firestore');
  const snap = await getDocs(collection(db, COLLECTIONS.messages));
  return snap.docs.map(d => toContactMessage(d.data() as Record<string, unknown>, d.id));
}

export async function updateContactMessageStatus(docId: string, status: ContactMessageStatus): Promise<void> {
  if (!isValidDocId(docId)) throw new Error('Cannot update message: missing document id.');
  const db = await getFirestoreSafe();
  if (!db) throw new Error('Firestore unavailable.');
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  await setDoc(doc(db, COLLECTIONS.messages, docId), { status, updatedAt: serverTimestamp() }, { merge: true });
  clearContactCache();
}

export async function deleteContactMessage(docId: string): Promise<void> {
  if (!isValidDocId(docId)) throw new Error('Cannot delete message: missing document id.');
  const db = await getFirestoreSafe();
  if (!db) throw new Error('Firestore unavailable.');
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, COLLECTIONS.messages, docId));
  clearContactCache();
}

/** Date display helper (accepts Firestore Timestamp or ISO string). */
export function formatContactTime(value: unknown): string {
  if (!value) return '';
  const d = (value as { toDate?: () => Date }).toDate ? (value as { toDate: () => Date }).toDate() : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
