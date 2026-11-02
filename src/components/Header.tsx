import { useState, useEffect, useRef } from 'react';
import { Search, Menu, X, Bookmark, Sun, Moon, ArrowRight } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { View } from '../types';

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const {
    navigate, searchQuery, setSearchQuery, bookmarks, theme, toggleTheme, view,
    tools: catalogTools, categories: catalogCategories,
  } = useToolStore();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = searchQuery.trim() ? catalogTools.filter(t => `${t.name} ${t.tagline}`.toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 5) : [];
  const navItems: { label: string; target: View; active: boolean }[] = [
    { label: 'Home', target: 'home', active: view === 'home' },
    { label: 'All Tools', target: 'tools', active: view === 'tools' || view === 'category' },
    { label: 'My Tools', target: 'bookmarks', active: view === 'bookmarks' },
    { label: 'About', target: 'about', active: view === 'about' },
  ];

  const go = (target: View) => {
    navigate(target);
    setIsMobileMenuOpen(false);
  };

  const openTool = (toolSlug: string) => {
    // Resolve by slug from the catalog via hash — reuse navigate with the tool object
    const tool = catalogTools.find(t => t.slug === toolSlug);
    if (tool) navigate('tool', { tool });
    setIsSearchOpen(false);
  };

  const suggestionList = (closeOnSelect: boolean) => (
    suggestions.length > 0 ? (
      <div className="mt-2 flex flex-col gap-0.5">
        {suggestions.map(tool => (
          <button
            key={tool.id}
            onClick={() => { openTool(tool.slug); if (closeOnSelect) setIsSearchOpen(false); }}
            className="text-left text-xs p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center gap-2.5 transition-colors group"
          >
            <span className="w-6 h-6 bg-gray-100 dark:bg-neutral-800 rounded-md flex items-center justify-center shrink-0 text-secondary group-hover:text-neutral-900 dark:group-hover:text-white">{tool.icon}</span>
            <span className="min-w-0">
              <span className="block font-bold text-neutral-900 dark:text-white truncate text-[11px]">{tool.name}</span>
              <span className="block text-[9px] text-faint font-medium uppercase tracking-widest truncate">{tool.category.replace('-', ' & ')}</span>
            </span>
            <ArrowRight size={12} className="ml-auto shrink-0 text-gray-300 dark:text-gray-600" />
          </button>
        ))}
        <button
          onClick={() => { go('tools'); setIsSearchOpen(false); }}
          className="text-[10px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white p-2 hover:underline underline-offset-4 text-left"
        >
          See all results →
        </button>
      </div>
    ) : searchQuery.trim() ? (
      <p className="mt-2 p-2 text-xs text-faint font-medium">No tools match “{searchQuery}”.</p>
    ) : (
      <div className="mt-2 flex flex-col gap-0.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-faint px-2 py-1">Popular categories</span>
        {catalogCategories.slice(0, 3).map(cat => (
          <button
            key={cat.id}
            onClick={() => { navigate('category', { category: cat.id }); setIsSearchOpen(false); }}
            className="text-left text-xs text-secondary p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors font-medium"
          >
            {cat.name}
          </button>
        ))}
      </div>
    )
  );

  return (
    <header className="fixed top-0 left-0 right-0 w-full md:sticky bg-header border-b border-subtle z-50 px-4 md:px-8">
      <div className="max-w-7xl mx-0 md:mx-auto md:my-0 h-[60px] sm:h-[68px] flex items-center justify-between gap-4">

        {/* Logo */}
        <div
          className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2 cursor-pointer tracking-tight shrink-0"
          onClick={() => { navigate('home'); setSearchQuery(''); }}
          role="link"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') navigate('home'); }}
        >
          <span className="w-8 h-8 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center shrink-0">
            <img src="/OmniToolify_Icon.png" alt="" aria-hidden="true" className="w-5 h-5 object-contain" />
          </span>
          <span>OmniToolify</span>
        </div>

        {/* Desktop search bar */}
        <div className="hidden lg:block relative w-full max-w-md" ref={searchRef}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" size={15} />
          <input
            type="text"
            placeholder="Search tools…"
            aria-label="Search tools"
            className="w-full pl-10 pr-4 py-2.5 bg-inset text-neutral-900 dark:text-white border border-subtle focus:bg-card focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl outline-none text-[13px] font-medium transition-all"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) { navigate('tools'); setIsSearchOpen(false); } }}
          />
          {isSearchOpen && (
            <div className="absolute top-[46px] left-0 right-0 bg-card shadow-xl rounded-2xl border border-subtle p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {suggestionList(false)}
            </div>
          )}
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 shrink-0">
          {navItems.map(item => (
            <button
              key={item.label}
              onClick={() => go(item.target)}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors ${
                item.active
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-secondary hover:text-neutral-900 dark:hover:text-white hover:bg-inset'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={toggleTheme}
            className="p-2.5 text-secondary hover:text-neutral-900 dark:hover:text-white hover:bg-inset rounded-full transition-colors ml-1"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </nav>

        {/* Mobile actions */}
        <div className="flex lg:hidden items-center gap-1 shrink-0">
          <button
            onClick={toggleTheme}
            className="p-2.5 text-secondary hover:bg-inset rounded-full transition-colors"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 text-secondary hover:bg-inset rounded-full transition-colors"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* Mobile search bar — always visible below lg */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" size={15} />
          <input
            type="text"
            placeholder="Search tools…"
            aria-label="Search tools"
            className="w-full pl-10 pr-4 py-2.5 bg-inset text-neutral-900 dark:text-white border border-subtle focus:bg-card focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl outline-none text-[13px] font-medium transition-all"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) { navigate('tools'); setIsSearchOpen(false); } }}
          />
          {isSearchOpen && (
            <div className="absolute top-[46px] left-0 right-0 bg-card shadow-xl rounded-2xl border border-subtle p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {suggestionList(false)}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Panel */}
      {isMobileMenuOpen && (
        <nav className="lg:hidden border-t border-subtle bg-page px-4 py-3 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {navItems.map(item => (
            <button
              key={item.label}
              onClick={() => go(item.target)}
              className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-colors flex items-center justify-between tap-feedback ${
                item.active
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-secondary hover:bg-inset hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {item.label}
              {item.label === 'My Tools' && bookmarks.length > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${item.active ? 'bg-white/20' : 'bg-inset'}`}>{bookmarks.length}</span>
              )}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
