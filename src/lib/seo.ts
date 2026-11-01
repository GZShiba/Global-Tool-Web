/**
 * ToolNest — SEO metadata engine.
 *
 * Sets per-page title, meta description, canonical URL, robots directives,
 * Open Graph / Twitter cards, and JSON-LD structured data. Canonical URLs
 * are absolute; the production base URL is configurable via VITE_SITE_URL
 * (defaults to a placeholder that must be replaced before launch).
 */
import { Tool } from '../types';

/** Production base URL. Operators must set VITE_SITE_URL to the real domain. */
export function siteUrl(): string {
  const custom = import.meta.env.VITE_SITE_URL as string | undefined;
  if (custom && custom.trim()) return custom.trim().replace(/\/$/, '');
  return 'https://toolnest.app'; // placeholder — replace at deployment
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Canonical path for each route (clean, crawlable URLs). */
export function canonicalPath(view: string, tool?: Tool | null, categoryId?: string): string {
  switch (view) {
    case 'home': return '/';
    case 'tools': return '/tools';
    case 'category': return `/categories/${categoryId || 'all'}`;
    case 'tool': return tool ? `/tools/${tool.slug}` : '/tools';
    case 'run': return tool ? `/tools/${tool.slug}/run` : '/tools';
    case 'about': return '/about';
    case 'privacy': return '/privacy';
    case 'bookmarks': return '/bookmarks';
    default: return '/';
  }
}

export interface JsonLd {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

export interface PageMeta {
  title: string;
  description: string;
  canonicalPath: string;
  noindex?: boolean;
  ogType?: string;
  jsonLd?: JsonLd[];
}

function upsertMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertProperty(property: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setRobots(noindex: boolean) {
  const value = noindex ? 'noindex, follow' : 'index, follow';
  upsertMeta('robots', value);
}

function setJsonLd(blocks: JsonLd[]) {
  let el = document.getElementById('seo-jsonld');
  if (!el) {
    el = document.createElement('script');
    el.id = 'seo-jsonld';
    el.setAttribute('type', 'application/ld+json');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(blocks);
}

/**
 * Apply full page metadata. Safe to call on every route change; missing
 * keys are replaced with the provided values. Structured data blocks are
 * replaced wholesale so stale schemas never linger.
 */
export function applyPageMeta(meta: PageMeta) {
  document.title = meta.title;
  upsertMeta('description', meta.description);
  upsertCanonical(absoluteUrl(meta.canonicalPath));
  setRobots(!!meta.noindex);

  // Open Graph / Twitter
  const canonical = absoluteUrl(meta.canonicalPath);
  upsertProperty('og:site_name', 'ToolNest');
  upsertProperty('og:title', meta.title);
  upsertProperty('og:description', meta.description);
  upsertProperty('og:url', canonical);
  upsertProperty('og:type', meta.ogType || 'website');
  upsertProperty('twitter:card', 'summary');
  upsertProperty('twitter:title', meta.title);
  upsertProperty('twitter:description', meta.description);

  setJsonLd(meta.jsonLd || []);
}

/* ---------- Reusable structured-data builders ---------- */

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function webSiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ToolNest',
    url: siteUrl(),
    description: 'Free online tools that run entirely in your browser — converters, generators, calculators, text utilities, and developer helpers.',
  };
}

export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ToolNest',
    url: siteUrl(),
    description: 'ToolNest is a collection of free, browser-based online tools.',
  };
}

/** Factual SoftwareApplication schema — no ratings, prices, or fabricated data. */
export function softwareApplicationJsonLd(tool: Tool): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.description,
    url: absoluteUrl(`/tools/${tool.slug}`),
    operatingSystem: 'Web browser',
    applicationCategory: 'UtilityApplication',
  };
}

/** Shared title/description builders used across pages. */
export function toolTitle(tool: Tool): string {
  return `${tool.name} — Free Online ${categoryLabel(tool.category)} | ToolNest`;
}

export function toolDescription(tool: Tool): string {
  const base = tool.tagline || tool.description;
  const clipped = base.length > 150 ? `${base.slice(0, 147).trimEnd()}…` : base;
  return clipped;
}

function categoryLabel(categoryId: string): string {
  const map: Record<string, string> = {
    text: 'Text Tool',
    converters: 'Converter',
    generators: 'Generator',
    'web-dev': 'Developer Tool',
    calculators: 'Calculator',
    files: 'File Tool',
  };
  return map[categoryId] || 'Tool';
}
