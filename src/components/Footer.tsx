import { MouseEvent } from 'react';
import { Mail } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { categories, tools } from '../data/tools';

export default function Footer() {
  const { navigate } = useToolStore();

  const handleNav = (e: MouseEvent, target: Parameters<typeof navigate>[0], category?: string) => {
    e.preventDefault();
    navigate(target, category ? { category } : undefined);
  };

  const popularTools = tools.filter(t => t.popular).slice(0, 4);

  return (
    <footer className="bg-neutral-950 text-white mt-12 border-t border-neutral-800/60">
      {/* Compact horizontal link groups */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10 grid grid-cols-2 md:grid-cols-[auto_1fr_1fr_1fr] gap-8 md:gap-12 items-start">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white"
            aria-label="OmniToolify home"
          >
            <span className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shrink-0">
              <img src="/OmniToolify_Icon.png" alt="" aria-hidden="true" className="w-5 h-5 object-contain" />
            </span>
            OmniToolify
          </button>
          <p className="text-neutral-500 text-[11px] font-normal leading-relaxed mt-3 max-w-[220px] hidden md:block">
            Free online tools that run entirely in your browser.
          </p>
        </div>

        {/* Platform */}
        <nav aria-label="Platform">
          <h3 className="text-[10px] font-bold mb-3 text-neutral-400 uppercase tracking-[0.18em]">Platform</h3>
          <ul className="flex flex-col gap-2">
            <li><a href="/tools" onClick={e => handleNav(e, 'tools')} className="text-neutral-400 hover:text-white transition-colors text-[13px] font-medium">All Tools</a></li>
            <li><a href="/bookmarks" onClick={e => handleNav(e, 'bookmarks')} className="text-neutral-400 hover:text-white transition-colors text-[13px] font-medium">My Tools</a></li>
            <li><a href="/about" onClick={e => handleNav(e, 'about')} className="text-neutral-400 hover:text-white transition-colors text-[13px] font-medium">About</a></li>
            <li><a href="/privacy" onClick={e => handleNav(e, 'privacy')} className="text-neutral-400 hover:text-white transition-colors text-[13px] font-medium">Privacy</a></li>
          </ul>
        </nav>

        {/* Categories */}
        <nav aria-label="Categories">
          <h3 className="text-[10px] font-bold mb-3 text-neutral-400 uppercase tracking-[0.18em]">Categories</h3>
          <ul className="flex flex-col gap-2">
            {categories.slice(0, 4).map(cat => (
              <li key={cat.id}>
                <a
                  href={`#/category/${cat.id}`}
                  onClick={e => handleNav(e, 'category', cat.id)}
                  className="text-neutral-400 hover:text-white transition-colors text-[13px] font-medium"
                >
                  {cat.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Popular Tools */}
        <nav aria-label="Popular tools">
          <h3 className="text-[10px] font-bold mb-3 text-neutral-400 uppercase tracking-[0.18em]">Popular Tools</h3>
          <ul className="flex flex-col gap-2">
            {popularTools.map(tool => (
              <li key={tool.id}>
                <a
                  href={`/tools/${tool.slug}`}
                  onClick={e => { e.preventDefault(); navigate('tool', { tool }); }}
                  className="text-neutral-400 hover:text-white transition-colors text-[13px] font-medium"
                >
                  {tool.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-neutral-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-neutral-500 text-[10px] font-medium tracking-wide text-center sm:text-left">
            © 2026 OmniToolify. All tools run in your browser.
          </div>
          <div className="flex items-center gap-4 text-neutral-500">
            <a href="/privacy" onClick={e => handleNav(e, 'privacy')} aria-label="Privacy policy" className="hover:text-white transition-all">
              <Mail size={15} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
