#!/usr/bin/env node
/**
 * Repeatable local → Firestore CMS import.
 *
 * Reads `.admin-data/db.json` (tools, categories, hero slides, popular config)
 * and writes it into Firestore using the Firebase Admin SDK with
 * deterministic document ids. Safe to run repeatedly: existing records are
 * updated in place, never duplicated. Authentication data (passwords, PINs,
 * sessions) is never exported.
 *
 * Prereqs:
 *   - GOOGLE_APPLICATION_CREDENTIALS points at a service-account key with
 *     Firestore write access (or use `firebase use` + default credentials).
 *   - npm install inside functions/admin-cms (firebase-admin).
 *
 * Usage (from repo root):
 *   node scripts/migrate-local-to-firestore.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_FILE = path.join(ROOT, '.admin-data', 'db.json');
const DRY_RUN = process.argv.includes('--dry-run');

const db = JSON.parse(readFileSync(DB_FILE, 'utf8'));

function toDocId(input) {
  const clean = String(input || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return clean || 'doc-undefined';
}

const app = initializeApp();
const store = getFirestore(app);

let imported = 0; let skipped = 0; let failed = 0;
async function write(collection, id, data) {
  if (DRY_RUN) { imported += 1; return; }
  try {
    await store.collection(collection).doc(id).set(data, { merge: true });
    imported += 1;
  } catch (err) {
    failed += 1;
    console.error(`  FAIL ${collection}/${id}: ${err.message}`);
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'IMPORT'}`);

  for (const tool of db.tools || []) {
    if (!tool.slug) { skipped += 1; continue; }
    await write('cms_tools', toDocId(tool.slug), { ...tool, updatedAt: new Date().toISOString() });
  }
  for (const cat of db.categories || []) {
    if (!cat.id && !cat.slug) { skipped += 1; continue; }
    await write('cms_categories', toDocId(cat.id || cat.slug), { ...cat, updatedAt: new Date().toISOString() });
  }
  for (const slide of db.heroSlides || []) {
    if (!slide.id && !slide.toolSlug) { skipped += 1; continue; }
    await write('cms_heroSlides', toDocId(slide.id || slide.toolSlug), { ...slide, updatedAt: new Date().toISOString() });
  }
  if (db.popular) {
    await write('cms_popular', 'settings', { ...db.popular, updatedAt: new Date().toISOString() });
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped, ${failed} failed.`);
  console.log('Authentication data was NOT exported.');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(2);
});
