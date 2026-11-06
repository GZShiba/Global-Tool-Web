import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { Tool, View, ToolContextType } from '../types';
import { useCmsCatalog } from '../lib/cmsCatalog';

const ToolContext = createContext<ToolContextType | null>(null);

export const useToolStore = () => {
  const context = useContext(ToolContext);
  if (!context) throw new Error('useToolStore must be used within a ToolProvider');
  return context;
};

/* ------------------------------------------------------------------ */
/* Clean-URL router with legacy hash fallback                          */
/* ------------------------------------------------------------------ */

export const CLEAN_ROUTES = ['tools', 'categories', 'bookmarks', 'about', 'privacy', 'zx'] as const;
export const LEGACY_HASH_ROUTES = ['tools', 'tool', 'run', 'category', 'bookmarks', 'about'] as const;

interface Route {
  view: View;
  toolSlug: string | null;
  categoryId: string | null;
}

const HOME_ROUTE: Route = { view: 'home', toolSlug: null, categoryId: null };

/** Parse a clean pathname like /tools/word-counter/run */
function parsePathname(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return HOME_ROUTE;

  const [first, second, third] = parts;

  switch (first) {
    case 'tools':
      if (second) {
        // /tools/<slug> or /tools/<slug>/run
        if (third === 'run') return { view: 'run', toolSlug: second, categoryId: null };
        return { view: 'tool', toolSlug: second, categoryId: null };
      }
      return { view: 'tools', toolSlug: null, categoryId: null };
    case 'categories':
      return { view: 'category', toolSlug: null, categoryId: second || 'all' };
    case 'bookmarks':
      return { view: 'bookmarks', toolSlug: null, categoryId: null };
    case 'about':
      return { view: 'about', toolSlug: null, categoryId: null };
    case 'privacy':
      return { view: 'privacy', toolSlug: null, categoryId: null };
    case 'zx':
      if (second === 'adx') return { view: 'admin', toolSlug: null, categoryId: null };
      return { view: 'notfound', toolSlug: null, categoryId: null };
    default:
      // Unknown clean path → standard not-found handling.
      return { view: 'notfound', toolSlug: null, categoryId: null };
  }
}

/** Parse a legacy hash route like #/tool/<slug> */
function parseLegacyHash(hash: string): Route {
  const segment = hash.replace(/^#\/?/, '');
  const [first, param] = segment.split('/');
  switch (first) {
    case 'tools':
      return { view: 'tools', toolSlug: null, categoryId: null };
    case 'tool':
      return { view: 'tool', toolSlug: param || null, categoryId: null };
    case 'run':
      return { view: 'run', toolSlug: param || null, categoryId: null };
    case 'category':
      return { view: 'category', toolSlug: null, categoryId: param || 'all' };
    case 'bookmarks':
      return { view: 'bookmarks', toolSlug: null, categoryId: null };
    case 'about':
      return { view: 'about', toolSlug: null, categoryId: null };
    default:
      return HOME_ROUTE;
  }
}

function buildCleanPath(view: View, opts?: { tool?: Tool | null; category?: string }): string {
  switch (view) {
    case 'tools': return '/tools';
    case 'category': return `/categories/${opts?.category || 'all'}`;
    case 'tool': return opts?.tool ? `/tools/${opts.tool.slug}` : '/tools';
    case 'run': return opts?.tool ? `/tools/${opts.tool.slug}/run` : '/tools';
    case 'about': return '/about';
    case 'privacy': return '/privacy';
    case 'bookmarks': return '/bookmarks';
    case 'admin': return '/zx/adx';
    default: return '/';
  }
}

function containsCleanRoute(pathname: string): boolean {
  return CLEAN_ROUTES.some(route => pathname === `/${route}` || pathname.startsWith(`/${route}/`));
}

/** Resolve the current route from the browser, preferring clean paths. */
function resolveRoute(): Route {
  const { pathname, hash } = window.location;
  if (hash.startsWith('#/')) {
    const route = parseLegacyHash(hash);
    // Normalize a legacy hash URL into its equivalent clean URL once.
    const clean = buildCleanPath(route.view, {
      tool: route.toolSlug ? { slug: route.toolSlug } as Tool : undefined,
      category: route.categoryId || undefined,
    });
    if (clean !== pathname) {
      window.history.replaceState(null, '', clean);
    }
    return route;
  }
  if (containsCleanRoute(pathname) || pathname === '/') {
    return parsePathname(pathname);
  }
  // Unknown clean-looking path → standard not-found handling.
  return { view: 'notfound', toolSlug: null, categoryId: null };
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

interface ToolProviderProps {
  children: ReactNode;
}

export const ToolProvider = ({ children }: ToolProviderProps) => {
  const [route, setRoute] = useState<Route>(() =>
    typeof window !== 'undefined' ? resolveRoute() : HOME_ROUTE
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    // Keep the initial selection in sync with the route: a direct category URL
    // (e.g. /categories/text) or refresh must resolve to that category, not to
    // the default "all". Previously this always started at 'all', so a
    // refreshed category page silently rendered the full All-Tools list.
    if (typeof window !== 'undefined') {
      const r = resolveRoute();
      return r.categoryId || 'all';
    }
    return 'all';
  });
  const [activeSlug, setActiveSlug] = useState<string | null>(route.toolSlug);
  const catalog = useCmsCatalog();
  const { tools: catalogTools, categories: catalogCategories } = catalog;
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('toolnest-bookmarks');
        if (stored) return JSON.parse(stored);
      } catch { /* ignore malformed data */ }
    }
    return [];
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('toolnest-theme');
      if (stored === 'dark' || stored === 'light') return stored;
    }
    return 'dark';
  });

  const selectedTool = activeSlug
    ? catalogTools.find(t => t.slug === activeSlug) || null
    : null;

  const applyRoute = useCallback((next: Route) => {
    if (typeof window !== 'undefined' && window.location.search.includes('debug=cat')) {
      console.info('[cat] applyRoute', { categoryId: next.categoryId, nextSelected: next.categoryId || 'all' });
    }
    setRoute(next);
    setActiveSlug(next.toolSlug);
    if (next.categoryId) setSelectedCategory(next.categoryId);
  }, []);

  // Respond to browser navigation: back/forward (popstate) and legacy hash links.
  useEffect(() => {
    const onPopState = () => applyRoute(resolveRoute());
    const onHashChange = () => applyRoute(resolveRoute());
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [applyRoute]);

  const navigate = useCallback((view: View, opts?: { tool?: Tool | null; category?: string } | string) => {
    // Contract: callers should pass `{ category: <id> }`. A raw string (the
    // legacy hand-off) is normalized to `{ category: <string> }` so the
    // category id always reaches the route builder unchanged — never `all`.
    const resolvedOpts = typeof opts === 'string' ? { category: opts } : opts;
    const path = buildCleanPath(view, resolvedOpts);
    if (typeof window !== 'undefined' && window.location.search.includes('debug=cat')) {
      console.info('[cat] navigate', { view, category: resolvedOpts?.category, path });
    }
    if (window.location.pathname === path) {
      // Same route: reset state (e.g. clicking the logo while at home)
      const next = resolveRoute();
      applyRoute(next);
    } else {
      window.history.pushState(null, '', path);
      applyRoute(resolveRoute());
    }
    if (view === 'tools' || view === 'home' || view === 'category' || view === 'bookmarks') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [applyRoute]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('toolnest-theme', next);
      return next;
    });
  };

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => {
      const next = prev.includes(id)
        ? prev.filter(bid => bid !== id)
        : [...prev, id];
      localStorage.setItem('toolnest-bookmarks', JSON.stringify(next));
      toast.success(prev.includes(id) ? 'Removed from My Tools' : 'Saved to My Tools');
      return next;
    });
  };

  const value: ToolContextType = {
    view: route.view,
    selectedTool,
    selectedCategory,
    searchQuery,
    setSearchQuery,
    navigate,
    bookmarks,
    toggleBookmark,
    theme,
    toggleTheme,
    tools: catalogTools,
    categories: catalogCategories,
    cmsState: catalog.state,
  };

  return <ToolContext.Provider value={value}>{children}</ToolContext.Provider>;
};
