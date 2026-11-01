#!/usr/bin/env node
/**
 * Generates public/sitemap.xml from the actual route + tool registry.
 *
 * Usage: node scripts/generate-sitemap.mjs
 * Env:   VITE_SITE_URL or SEO_SITE_URL sets the production base URL.
 *         Defaults to https://toolnest.app (centralized placeholder — replace before launch).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS_SOURCE = path.join(ROOT, 'src', 'data', 'tools.tsx');
const OUT_DIR = path.join(ROOT, 'public');
const OUT_FILE = path.join(OUT_DIR, 'sitemap.xml');

// Centralized default placeholder — same value as src/lib/seo.ts. Set
// VITE_SITE_URL at build time to the verified production domain.
const base = (process.env.VITE_SITE_URL || process.env.SEO_SITE_URL || 'https://toolnest.app').replace(/\/$/, '');

function extractIds(source) {
  const ids = [];
  const re = /(?:id|slug):\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(source)) !== null) ids.push(m[1]);
  return [...new Set(ids)];
}

function buildXml() {
  const source = fs.readFileSync(TOOLS_SOURCE, 'utf8');
  const toolsStart = source.indexOf('export const tools');
  const categoriesBlock = toolsStart > -1 ? source.slice(0, toolsStart) : source;
  const toolsBlock = toolsStart > -1 ? source.slice(toolsStart) : '';
  const categoryIds = extractIds(categoriesBlock);
  const toolSlugs = extractIds(toolsBlock);

  const staticRoutes = ['/', '/tools', '/about', '/privacy'];
  const toolRoutes = toolSlugs.map(s => `/tools/${s}`);
  const categoryRoutes = categoryIds.map(c => `/categories/${c}`);

  const urls = [
    ...staticRoutes.map(p => `  <url>\n    <loc>${base}${p}</loc>\n  </url>`),
    ...categoryRoutes.map(p => `  <url>\n    <loc>${base}${p}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`),
    ...toolRoutes.map(p => `  <url>\n    <loc>${base}${p}</loc>\n    <changefreq>monthly</changefreq>\n  </url>`),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, buildXml(), 'utf8');
console.log(`Sitemap written: ${OUT_FILE}`);
console.log(`Base URL: ${base}`);
