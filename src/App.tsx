import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { ToolProvider, useToolStore } from './context/ToolContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Hero from './components/Hero';
import FeaturedTools from './components/FeaturedTools';
import NewAndNoteworthy from './components/NewAndNoteworthy';
import WhyToolNest from './components/WhyToolNest';
import Categories from './components/Categories';
import ToolsBrowser from './components/ToolsBrowser';
import ToolPage from './components/ToolPage';
import ToolRunPage from './components/ToolRunPage';
import AboutPage from './components/AboutPage';
import PrivacyPage from './components/PrivacyPage';
import NotFoundPage from './components/NotFoundPage';
import HomepageSeoContent from './components/HomepageSeoContent';
import FaqSection from './components/FaqSection';
import AdminApp from './components/admin/AdminApp';
import AdminLogin from './components/admin/AdminLogin';
import { useFirebaseAuth } from './lib/firebaseAuth';
import {
  applyPageMeta, canonicalPath, toolTitle, toolDescription,
  breadcrumbJsonLd, webSiteJsonLd, organizationJsonLd, softwareApplicationJsonLd,
  collectionPageJsonLd, webPageJsonLd,
} from './lib/seo';
import { getCategory } from './data/tools';
import { findCategory } from './lib/cmsCatalog';
import type { ToolCategory } from './types';

function buildPageMeta(view: string, tool: ReturnType<typeof useToolStore>['selectedTool'], categoryId: string, categories: ToolCategory[]) {
  const category = categoryId !== 'all' ? findCategory(categories, categoryId) : undefined;
  const path = canonicalPath(view, tool, categoryId);

  switch (view) {
    case 'home':
      return {
        title: 'OmniToolify — Discover and Use Online Tools in One Place',
        description: 'Discover OmniToolify, a global directory of online tools for everyday digital tasks. Explore multiple tool categories, find useful utilities, and get things done in one place.',
        canonicalPath: path,
        jsonLd: [webSiteJsonLd(), organizationJsonLd()],
      };

    case 'tools':
      return {
        title: 'All Tools — Browse Every Online Tool | OmniToolify',
        description: 'Browse the full OmniToolify directory: text utilities, converters, generators, calculators, developer helpers, and file tools — all in one place.',
        canonicalPath: path,
        jsonLd: [webSiteJsonLd()],
      };

    case 'category': {
      // `/categories/all` is the All-Tools view — never a missing category.
      if (categoryId === 'all') {
        return {
          title: 'All Tools — Browse Every Online Tool | OmniToolify',
          description: 'Browse the full OmniToolify directory: text utilities, converters, generators, calculators, developer helpers, and file tools — all in one place.',
          canonicalPath: path,
          jsonLd: [webSiteJsonLd()],
        };
      }
      if (!category) {
        return { title: 'Category Not Found | OmniToolify', description: 'This category does not exist.', canonicalPath: path, noindex: true, jsonLd: [] };
      }
      return {
        title: `${category.name} Tools — ${category.description} | OmniToolify`,
        description: `${category.description}. Browse and use ${category.name.toLowerCase()} tools on OmniToolify — no sign-up, no uploads.`,
        canonicalPath: path,
        jsonLd: [
          collectionPageJsonLd(category.name, category.description, path),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'All Tools', path: '/tools' },
            { name: category.name, path: `/categories/${categoryId}` },
          ]),
        ],
      };
    }

    case 'tool': {
      if (!tool) {
        return { title: 'Tool Not Found | OmniToolify', description: 'The requested tool does not exist.', canonicalPath: path, noindex: true, jsonLd: [] };
      }
      const cat = getCategory(tool.category);
      return {
        title: toolTitle(tool),
        description: toolDescription(tool),
        canonicalPath: path,
        ogType: 'website',
        jsonLd: [
          webPageJsonLd(tool.name, toolDescription(tool), `/tools/${tool.slug}`),
          softwareApplicationJsonLd(tool),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'All Tools', path: '/tools' },
            ...(cat ? [{ name: cat.name, path: `/categories/${cat.id}` }] : []),
            { name: tool.name, path: `/tools/${tool.slug}` },
          ]),
        ],
      };
    }

    case 'run': {
      if (!tool) {
        return { title: 'Tool Not Found | OmniToolify', description: 'The requested tool does not exist.', canonicalPath: path, noindex: true, jsonLd: [] };
      }
      // Working interface: intentionally not indexed (details page is the canonical entry).
      return {
        title: `${tool.name} — Use Tool | OmniToolify`,
        description: `Open and use ${tool.name} right in your browser.`,
        canonicalPath: path,
        noindex: true,
        jsonLd: [],
      };
    }

    case 'about':
      return {
        title: 'About OmniToolify — Free Browser-Based Tools',
        description: 'Learn what OmniToolify is, the types of browser-based tools it offers, and the privacy and usability principles behind the product.',
        canonicalPath: path,
        jsonLd: [organizationJsonLd()],
      };

    case 'privacy':
      return {
        title: 'Privacy Policy | OmniToolify',
        description: 'OmniToolify processes data locally in your browser. Read about local storage, cookies, and analytics.',
        canonicalPath: path,
        jsonLd: [],
      };

    case 'bookmarks':
      return {
        title: 'My Tools — Bookmarked Tools | OmniToolify',
        description: 'Your bookmarked OmniToolify tools, stored privately in this browser.',
        canonicalPath: path,
        noindex: true,
        jsonLd: [],
      };

    case 'notfound':
      return {
        title: 'Page Not Found | OmniToolify',
        description: 'The page you are looking for does not exist.',
        canonicalPath: path,
        noindex: true,
        jsonLd: [],
      };

    case 'admin':
      return {
        title: 'Admin Panel | OmniToolify',
        description: 'OmniToolify content management.',
        canonicalPath: path,
        noindex: true,
        jsonLd: [],
      };

    default:
      return { title: 'OmniToolify', description: 'Free online tools that run in your browser.', canonicalPath: path };
  }
}

function MainAppContent() {
  const { view, selectedTool, selectedCategory, categories: catalogCategories } = useToolStore();
  const { status: authStatus, signOut } = useFirebaseAuth();
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  useEffect(() => {
    applyPageMeta(buildPageMeta(view, selectedTool, selectedCategory, catalogCategories));
  }, [view, selectedTool, selectedCategory, catalogCategories]);

  const invalidTool = (view === 'tool' || view === 'run') && !selectedTool;
  const invalidCategory = view === 'category' && selectedCategory !== 'all' && !findCategory(catalogCategories, selectedCategory);

  // The Admin Panel is fully independent of the public layout: no public
  // header/footer/build prompt are rendered on any admin screen.
  if (view === 'admin') {
    return (
      <div className="bg-app min-h-screen">
        <Toaster position="top-center" />
        {authStatus === 'loading' ? null : authStatus === 'authenticated' ? (
          <AdminApp onLogout={async () => { await signOut(); setAdminNotice(null); }} />
        ) : (
          <AdminLogin notice={adminNotice} />
        )}
      </div>
    );
  }

  return (
    <div className="bg-app min-h-screen font-sans text-neutral-900 dark:text-neutral-100 selection:bg-gray-200 dark:selection:bg-neutral-800">
      <Toaster position="top-center" />

      <Header />

      <main className="pt-[116px] sm:pt-[124px] md:pt-0">
        {invalidTool || invalidCategory ? (
          <NotFoundPage />
        ) : view === 'home' ? (
          <>
            <Hero />
            <FeaturedTools />
            <NewAndNoteworthy />
            <WhyToolNest />
            <Categories />
            <HomepageSeoContent />
            <FaqSection />
          </>
        ) : view === 'tools' ? (
          <ToolsBrowser mode="all" />
        ) : view === 'category' ? (
          <ToolsBrowser mode="category" />
        ) : view === 'bookmarks' ? (
          <ToolsBrowser mode="bookmarks" />
        ) : view === 'tool' ? (
          <ToolPage />
        ) : view === 'run' ? (
          <ToolRunPage />
        ) : view === 'about' ? (
          <AboutPage />
        ) : view === 'privacy' ? (
          <PrivacyPage />
        ) : view === 'notfound' ? (
          <NotFoundPage />
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ToolProvider>
      <MainAppContent />
    </ToolProvider>
  );
}
