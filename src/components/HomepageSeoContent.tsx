import { Compass, Search, Globe2, LayoutGrid, Sparkles, ListChecks } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import ExpandableSection from './ExpandableSection';

/**
 * Homepage informational SEO section — real, visible content that explains
 * what OmniToolify is and how to use it. Written for humans first.
 */
export default function HomepageSeoContent() {
  const { navigate, categories: catalogCategories, tools: catalogTools } = useToolStore();
  const categoryCount = catalogCategories.length;
  const toolCount = catalogTools.length;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-8 sm:mt-10" aria-labelledby="homepage-seo-h2">
      <div className="bg-card border border-subtle rounded-[28px] sm:rounded-[32px] p-6 sm:p-10 lg:p-12">
        <ExpandableSection
          id="homepage-seo-preview"
          collapsedMaxHeightClass="max-h-[200px] sm:max-h-[260px] md:max-h-[320px] lg:max-h-[360px]"
          expandedLabel="Read More"
          collapsedLabel="Show Less"
        >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left column: core explanation */}
          <div>
            <h2 id="homepage-seo-h2" className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-tight">
              What Is OmniToolify?
            </h2>
            <p className="text-secondary text-sm sm:text-base font-normal leading-relaxed mt-4">
              OmniToolify is an online tools directory built around one simple idea: when you need a digital utility,
              it should take seconds to find and open — not a dozen browser tabs and a long search. Everything on this
              platform is a multi-tool collection covering everyday tasks with text, numbers, code, and files.
            </p>

            <h3 className="font-bold text-[15px] text-neutral-900 dark:text-white mt-7 mb-2 flex items-center gap-2">
              <LayoutGrid size={16} className="text-accent" /> What Is OmniToolify?
            </h3>
            <p className="text-secondary text-sm font-normal leading-relaxed">
              OmniToolify is a global online tools directory. Instead of hunting for separate websites for each task,
              you get many online tools in one place. The platform is organized into {categoryCount} categories spanning{' '}
              {toolCount} tools, so whether you need a quick calculation, a text transformation, a format conversion, or a
              developer helper, the right utility is a short browse away.
            </p>
            <p className="text-secondary text-sm font-normal leading-relaxed mt-3">
              Because the tools are grouped by what you are trying to do, the directory works well for students,
              designers, developers, marketers, and anyone with a one-off job to finish. A single visit can cover
              several unrelated tasks.
            </p>

            <h3 className="font-bold text-[15px] text-neutral-900 dark:text-white mt-7 mb-2 flex items-center gap-2">
              <Search size={16} className="text-accent" /> Find the Right Tool for Your Needs
            </h3>
            <p className="text-secondary text-sm font-normal leading-relaxed">
              You can get to a tool three ways: the search bar in the header, the category cards on this page, or the
              complete listing under <strong className="text-neutral-900 dark:text-white">All Tools</strong>. Search
              matches tool names and descriptions live, so typing “JSON” or “password” returns the relevant utilities
              immediately. Category pages list every tool in that area, and each tool has its own page with
              instructions, features, and related options.
            </p>
            <p className="text-secondary text-sm font-normal leading-relaxed mt-3">
              That structure means you rarely need to browse unrelated pages to find what you want — you can jump
              straight from a category to a specific tool and start working.
            </p>
          </div>

          {/* Right column: categories + global platform */}
          <div>
            <h3 className="font-bold text-[15px] text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <Compass size={16} className="text-accent" /> Explore Multiple Types of Online Tools
            </h3>
            <p className="text-secondary text-sm font-normal leading-relaxed">
              The catalog covers the most frequently needed digital utilities:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-secondary font-normal">
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> <span><strong className="text-neutral-900 dark:text-white">Text tools</strong> — counting words, converting case, generating slugs, and placeholder text.</span></li>
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> <span><strong className="text-neutral-900 dark:text-white">Converters</strong> — JSON formatting, encoding/decoding, unit and number-system conversions.</span></li>
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> <span><strong className="text-neutral-900 dark:text-white">Generators</strong> — passwords, UUIDs, and secure hashes.</span></li>
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> <span><strong className="text-neutral-900 dark:text-white">Developer helpers</strong> — regex testing, color math, and HTML/URL utilities.</span></li>
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> <span><strong className="text-neutral-900 dark:text-white">Calculators</strong> — BMI, percentages, and other everyday math.</span></li>
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> <span><strong className="text-neutral-900 dark:text-white">File & media tools</strong> — resizing and converting images directly in the browser.</span></li>
            </ul>

            <div className="mt-5 flex flex-wrap gap-2">
              {catalogCategories.slice(0, 6).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => navigate('category', { category: cat.id })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-inset border border-subtle text-secondary hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors text-[11px] font-bold uppercase tracking-wider"
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <h3 className="font-bold text-[15px] text-neutral-900 dark:text-white mt-7 mb-2 flex items-center gap-2">
              <Globe2 size={16} className="text-accent" /> A Global Multi-Tool Platform
            </h3>
            <p className="text-secondary text-sm font-normal leading-relaxed">
              Online tools are language-neutral — the same text, number, and file tasks come up for people everywhere.
              OmniToolify is structured as a global online tools directory: utility names, categories, and search are
              consistent, so the platform is useful to an international audience working with modern web browsers.
            </p>
            <p className="text-secondary text-sm font-normal leading-relaxed mt-3">
              No sign-up is required, and the interface is designed to be quick to learn from any starting point.
            </p>
          </div>
        </div>

        {/* Bottom row: benefits + FAQ */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 border-t border-subtle pt-8">
          <div>
            <h3 className="font-bold text-[15px] text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-accent" /> Designed for Everyday Digital Tasks
            </h3>
            <p className="text-secondary text-sm font-normal leading-relaxed">
              The tools are chosen for real, frequent tasks: preparing text for publishing, checking a calculation,
              generating a secure password, validating a snippet, or preparing an image. Each tool page explains what
              the utility does, how to use it, and what it supports — so you can decide in seconds whether it fits.
            </p>
            <p className="text-secondary text-sm font-normal leading-relaxed mt-3">
              Because every tool runs in the browser, there is nothing to install and no account to create. You can
              bookmark the tools you use often and return to them later.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-[15px] text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
              <ListChecks size={16} className="text-accent" /> Frequently Asked Questions
            </h3>
            <div className="space-y-3">
              <div className="bg-inset border border-subtle rounded-xl p-4">
                <p className="text-[13px] font-bold text-neutral-900 dark:text-white">What kinds of tools are available?</p>
                <p className="text-xs text-secondary font-normal leading-relaxed mt-1">
                  Text utilities, converters, generators, calculators, developer helpers, and file/media tools — grouped
                  into {categoryCount} categories with {toolCount} tools total.
                </p>
              </div>
              <div className="bg-inset border border-subtle rounded-xl p-4">
                <p className="text-[13px] font-bold text-neutral-900 dark:text-white">Do I need an account or payment?</p>
                <p className="text-xs text-secondary font-normal leading-relaxed mt-1">
                  No account and no payment are needed to open and use the tools. Bookmarked tools are saved in your
                  browser.
                </p>
              </div>
              <div className="bg-inset border border-subtle rounded-xl p-4">
                <p className="text-[13px] font-bold text-neutral-900 dark:text-white">How do I find a specific tool?</p>
                <p className="text-xs text-secondary font-normal leading-relaxed mt-1">
                  Use the header search, browse the category cards, or open All Tools for the full list. Each tool has
                  its own page with instructions and related tools.
                </p>
              </div>
            </div>
          </div>
        </div>
        </ExpandableSection>
      </div>
    </section>
  );
}
