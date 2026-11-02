/**
 * OmniToolify — SEO metadata engine.
 *
 * Sets per-page title, meta description, canonical URL, robots directives,
 * Open Graph / Twitter cards, and JSON-LD structured data. Canonical URLs
 * are absolute; the production base URL is configurable via VITE_SITE_URL.
 *
 * IMPORTANT: VITE_SITE_URL defaults to the intended production domain
 * https://omnitoolify.hollowsmp.club. All canonical / social / sitemap URLs
 * flow through siteUrl(), so setting VITE_SITE_URL to the verified domain at
 * build time updates the whole site consistently.
 */
import { Tool } from '../types';

/** Production base URL. Operators must set VITE_SITE_URL to the real domain. */
export function siteUrl(): string {
  const custom = import.meta.env.VITE_SITE_URL as string | undefined;
  if (custom && custom.trim()) return custom.trim().replace(/\/$/, '');
  return 'https://omnitoolify.hollowsmp.club'; // intended production domain
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Default social sharing image (absolute). Replace with the verified production asset. */
export function socialImageUrl(): string {
  return `${siteUrl()}/og-cover.png`;
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
  ogImage?: string;
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

  // Open Graph
  const canonical = absoluteUrl(meta.canonicalPath);
  const ogImage = meta.ogImage || socialImageUrl();
  upsertProperty('og:site_name', 'OmniToolify');
  upsertProperty('og:locale', 'en_US');
  upsertProperty('og:type', meta.ogType || 'website');
  upsertProperty('og:title', meta.title);
  upsertProperty('og:description', meta.description);
  upsertProperty('og:url', canonical);
  upsertProperty('og:image', ogImage);
  upsertProperty('og:image:alt', 'OmniToolify — online tools in one place');
  upsertProperty('og:image:width', '1200');
  upsertProperty('og:image:height', '630');
  upsertProperty('og:image:type', 'image/png');

  // Twitter Card (summary_large_image)
  upsertProperty('twitter:card', 'summary_large_image');
  upsertProperty('twitter:title', meta.title);
  upsertProperty('twitter:description', meta.description);
  upsertProperty('twitter:image', ogImage);
  upsertProperty('twitter:image:alt', 'OmniToolify — online tools in one place');

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
    name: 'OmniToolify',
    alternateName: 'Omni Toolify',
    url: siteUrl(),
    description: 'OmniToolify is a global directory of online tools for everyday digital tasks — converters, generators, calculators, text utilities, and developer helpers.',
  };
}

export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OmniToolify',
    url: siteUrl(),
    logo: `${siteUrl()}/OmniToolify_Icon.png`,
    description: 'OmniToolify is a collection of online tools for everyday digital tasks.',
  };
}

/** CollectionPage for category listings. */
export function collectionPageJsonLd(name: string, description: string, path: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absoluteUrl(path),
  };
}

/**
 * WebPage schema for tool detail and informational pages.
 * Deliberately minimal — only factual, visible-page properties.
 */
export function webPageJsonLd(name: string, description: string, path: string, isPartOf?: string): JsonLd {
  const block: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url: absoluteUrl(path),
  };
  if (isPartOf) {
    block.isPartOf = { '@type': 'WebSite', name: 'OmniToolify', url: siteUrl() };
  }
  return block;
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
  return `${tool.name} — Free Online ${categoryLabel(tool.category)} | OmniToolify`;
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
