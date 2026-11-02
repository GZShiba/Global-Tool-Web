#!/usr/bin/env node
/**
 * Seeds .admin-data/db.json from the existing static catalog
 * (src/data/tools.tsx). Preserves names, slugs, categories, taglines,
 * descriptions, features, how-to steps, and privacy text. Sets
 * implementationId = slug when a matching registered component exists.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS_SOURCE = path.join(ROOT, 'src', 'data', 'tools.tsx');
const REGISTRY_SOURCE = path.join(ROOT, 'src', 'tools', 'registry.tsx');
const DB_FILE = path.join(ROOT, '.admin-data', 'db.json');

const source = readFileSync(TOOLS_SOURCE, 'utf8');
const registrySource = readFileSync(REGISTRY_SOURCE, 'utf8');

const implIds = new Set();
const implRe = /'([a-z0-9-]+)':\s*\w+/g;
let m;
while ((m = implRe.exec(registrySource)) !== null) implIds.add(m[1]);

const categories = [];
const catBlock = source.slice(0, source.indexOf('export const tools'));
const catRe = /{ id: '([^']+)', name: '([^']+)', description: '([^']*)'/g;
while ((m = catRe.exec(catBlock)) !== null) {
  categories.push({ id: m[1], name: m[2], slug: m[1], description: m[3], enabled: true });
}

const toolRe = /t\(\{\s*id: '([^']+)', name: '([^']+)', tagline: '([^']*)'[\s\S]*?description: '([\s\S]*?)',\s*icon:[\s\S]*?category: '([^']+)'[\s\S]*?features: \[([\s\S]*?)\][\s\S]*?howTo: \[([\s\S]*?)\][\s\S]*?privacy: '([\s\S]*?)'/g;

const tools = [];
let tm;
while ((tm = toolRe.exec(source)) !== null) {
  const id = tm[1];
  const slug = id;
  const feats = [];
  const fr = /'([^']*)'/g;
  let f;
  while ((f = fr.exec(tm[6])) !== null) feats.push(f[1]);

  const howTo = [];
  const hr = /'([^']*)'/g;
  let h;
  while ((h = hr.exec(tm[7])) !== null) howTo.push({ title: h[1] });

  tools.push({
    id,
    name: tm[2],
    slug,
    tagline: tm[3],
    description: tm[4].replace(/\\n/g, ' '),
    category: tm[5],
    implementationId: implIds.has(slug) ? slug : undefined,
    tags: [],
    runsOn: 'Your Device',
    accountNeeded: 'None',
    availability: 'Public',
    features: feats,
    howTo,
    details: [],
    privacy: tm[8].replace(/\\n/g, ' '),
    privacyStatus: '',
    relatedToolIds: [],
    status: 'published',
    popular: false,
    isNew: false,
    featured: false,
    displayOrder: 0,
    createdAt: new Date().toISOString(),
  });
}

let db = { schemaVersion: 1, heroSlides: [], popular: { enabled: true, maxCards: 4, toolIds: [] }, tools: [], categories: [], media: [] };
if (existsSync(DB_FILE)) {
  try { db = { ...db, ...JSON.parse(readFileSync(DB_FILE, 'utf8')) }; } catch { /* fresh */ }
}

for (const cat of categories) {
  if (!db.categories.some(c => c.id === cat.id)) db.categories.push(cat);
}
for (const tool of tools) {
  if (!db.tools.some(t => t.slug === tool.slug)) db.tools.push(tool);
}

writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log(`Seeded ${tools.length} tools, ${categories.length} categories`);
console.log(`DB now: ${db.tools.length} tools, ${db.categories.length} categories`);
