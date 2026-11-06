#!/usr/bin/env node
/**
 * Deploy guard: verify the Firebase environment variables the production
 * frontend needs are present BEFORE publishing a build to Cloudflare.
 *
 * Vite bakes VITE_* variables into the JS bundle at build time. If they are
 * missing during `npm run build`, the deployed site ships with Firebase
 * unconfigured: the homepage CMS sections (Featured Carousel, Most Popular,
 * New & Noteworthy) all fail with "could not be loaded" errors even though
 * the Firestore rules and data are fine.
 *
 * Usage:
 *   npm run deploy:check
 *
 * Reads .env (local) and process.env (CI / Cloudflare build environment);
 * process.env wins. Never prints secret values — only names and the safe
 * project id.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

let envFile = {};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const raw = fs.readFileSync(path.join(root, '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) envFile[m[1]] = m[2].trim();
  }
} catch {
  /* no .env → rely on process.env */
}

const get = (name) => {
  const v = process.env[name];
  if (v !== undefined && v !== '') return v;
  const f = envFile[name];
  if (f !== undefined && f !== '') return f;
  return '';
};

const missing = REQUIRED.filter((name) => !get(name));
if (missing.length > 0) {
  console.error('[deploy:check] FAIL — missing Firebase env variables (needed at build time):');
  for (const name of missing) console.error(`  - ${name}`);
  console.error('\nSet them in the build environment (Cloudflare Pages → Settings → Environment variables,');
  console.error('or Cloudflare Workers → Settings → Variables when building in CI) using the values from');
  console.error('your local .env / Firebase Console. Then rebuild and redeploy.');
  process.exit(1);
}

const projectId = get('VITE_FIREBASE_PROJECT_ID');
console.log('[deploy:check] OK — Firebase config present for project:', projectId);
console.log(`[deploy:check] ${REQUIRED.length} required vars set${process.env.VITE_FIREBASE_MEASUREMENT_ID ? ' + measurement id' : ''} (values not printed).`);
