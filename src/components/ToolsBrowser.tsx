import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X, Search, Grid, List, ArrowUpDown, Bookmark, ArrowUpRight } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { getCategory as getStaticCategory } from '../data/tools';
import ToolCard from './ToolCard';
import { Tool } from '../types';

interface ToolsBrowserProps {
  mode: 'all' | 'category' | 'bookmarks';
}

const EMPTY: Record<string, { title: string; message: string }> = {
  all: { title: 'No tools found', message: 'We couldn\'t find any tools matching your current filters. Try adjusting your search or category.' },
  category: { title: 'Nothing to see here yet', message: 'Try a different search or category — the catalog grows regularly.' },
  bookmarks: { title: 'No saved tools yet', message: 'Bookmark any tool with the bookmark icon on its card, and it will appear here for quick access. Saved tools stay in your browser.' },
};

export default function ToolsBrowser({ mode }: ToolsBrowserProps) {
  const {
    navigate, searchQuery, setSearchQuery, selectedCategory, bookmarks,
    tools: catalogTools, categories: catalogCategories,
  } = useToolStore();
  const [sortBy, setSortBy] = useState('Name A–Z');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const getCategory = (id: string) => getStaticCategory(id) || catalogCategories.find(c => c.id === id);

  const activeCategory = mode === 'category' ? selectedCategory : 'all';
  const activeCategoryData = activeCategory !== 'all' ? getCategory(activeCategory) : undefined;

  const matchesQuery = (tool: Tool, q: string) => {
    if (!q) return true;
    const hay = `${tool.name} ${tool.tagline} ${tool.description}`.toLowerCase();
    return hay.includes(q);
  };

  let baseTools: Tool[] = [];
  if (mode === 'bookmarks') {
    baseTools = catalogTools.filter(tool => bookmarks.includes(tool.id));
  } else if (activeCategory !== 'all') {
    baseTools = catalogTools.filter(tool => tool.category === activeCategory && matchesQuery(tool, searchQuery.trim().toLowerCase()));
  } else {
    baseTools = catalogTools.filter(tool => matchesQuery(tool, searchQuery.trim().toLowerCase()));
  }

  const sortedTools = [...baseTools].sort((a, b) => {
    if (sortBy === 'Name Z–A') return b.name.localeCompare(a.name);
    if (sortBy === 'Popular first') return Number(b.popular ?? false) - Number(a.popular ?? false);
    return a.name.localeCompare(b.name);
  });

  const empty = EMPTY[mode];

  const sidebar = (
    <>
      {mode !== 'bookmarks' && (
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-faint mb-3">Categories</h2>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => { navigate('tools'); setIsMobileFilterOpen(false); }}
              className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all tap-feedback ${mode !== 'category' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-secondary hover:bg-inset hover:text-neutral-900 dark:hover:text-white'}`}
            >
              All Tools
            </button>
            {catalogCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { navigate('category', cat.id); setIsMobileFilterOpen(false); }}
                className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all tap-feedback ${mode === 'category' && activeCategory === cat.id ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-secondary hover:bg-inset hover:text-neutral-900 dark:hover:text-white'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode !== 'bookmarks' && (
        <div className="bg-neutral-950 rounded-3xl p-6 text-white relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-[0.08] pointer-events-none">
            <Bookmark size={90} />
          </div>
          <h3 className="font-bold text-sm mb-1.5 text-white">My Tools</h3>
          <p className="text-[11px] text-neutral-400 mb-4 font-normal leading-relaxed">Bookmark the tools you use often and find them here — saved privately in your browser.</p>
          <button
            onClick={() => { navigate('bookmarks'); setIsMobileFilterOpen(false); }}
            className="w-full bg-white hover:bg-neutral-200 text-neutral-900 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors tap-feedback"
          >
            Open My Tools {bookmarks.length > 0 ? `(${bookmarks.length})` : ''}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
        <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-secondary font-medium">
          <button onClick={() => navigate('home')} className="hover:text-neutral-900 dark:hover:text-white transition-colors">Home</button>
          <ChevronRight size={13} className="text-faint" />
          {mode === 'category' && activeCategoryData ? (
            <>
              <button onClick={() => navigate('tools')} className="hover:text-neutral-900 dark:hover:text-white transition-colors">Tools</button>
              <ChevronRight size={13} className="text-faint" />
              <span className="text-neutral-900 dark:text-white font-semibold">{activeCategoryData.name}</span>
            </>
          ) : (
            <span className="text-neutral-900 dark:text-white font-semibold">{mode === 'bookmarks' ? 'My Tools' : 'All Tools'}</span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Page heading */}
        <div className="mb-7">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            {mode === 'bookmarks' ? 'My Tools' : mode === 'category' && activeCategoryData ? activeCategoryData.name : 'All Tools'}
          </h1>
          <p className="text-xs sm:text-sm text-secondary font-normal mt-2">
            {mode === 'bookmarks'
              ? 'Your bookmarked tools, saved in this browser.'
              : mode === 'category' && activeCategoryData
                ? activeCategoryData.description
                : `${sortedTools.length} free tools that run entirely in your browser.`}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Mobile filter drawer */}
          <AnimatePresence>
            {isMobileFilterOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] lg:hidden"
                />
                <motion.div
                  initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed left-0 top-0 bottom-0 w-[280px] bg-card border-r border-subtle z-[160] lg:hidden overflow-y-auto p-6 shadow-2xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-7">
                      <h2 className="text-lg font-extrabold uppercase tracking-tight text-neutral-900 dark:text-white">Categories</h2>
                      <button
                        onClick={() => setIsMobileFilterOpen(false)}
                        className="w-9 h-9 rounded-full bg-inset text-neutral-900 dark:text-white flex items-center justify-center hover:opacity-80 transition-opacity"
                        aria-label="Close categories"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="space-y-8">{sidebar}</div>
                  </div>
                  <p className="pt-6 border-t border-subtle text-[10px] text-center text-faint font-bold uppercase tracking-widest">OmniToolify</p>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block w-60 space-y-8 shrink-0">{sidebar}</aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="bg-card border border-subtle rounded-2xl sm:rounded-3xl p-3.5 mb-7 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-inset hover:opacity-80 rounded-xl text-xs font-bold text-neutral-900 dark:text-white transition-all shrink-0 tap-feedback"
                >
                  Categories
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${mode === 'category' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-900/10 dark:bg-white/10'}`}>{mode === 'category' && activeCategoryData ? activeCategoryData.name : 'All'}</span>
                </button>

                <div className="relative flex-1 md:w-72 lg:w-96">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" size={15} />
                  <input
                    type="text"
                    placeholder="Search tools…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    aria-label="Search tools"
                    className="w-full pl-10 pr-4 py-2.5 bg-inset text-neutral-900 dark:text-white border border-subtle focus:bg-card focus:border-neutral-400 dark:focus:border-neutral-600 rounded-xl outline-none text-[13px] font-medium transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-1 bg-inset p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card text-neutral-900 dark:text-white shadow-sm' : 'text-faint hover:text-secondary'}`}
                    aria-label="Grid view"
                    aria-pressed={viewMode === 'grid'}
                  >
                    <Grid size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card text-neutral-900 dark:text-white shadow-sm' : 'text-faint hover:text-secondary'}`}
                    aria-label="List view"
                    aria-pressed={viewMode === 'list'}
                  >
                    <List size={15} />
                  </button>
                </div>

                <div className="relative flex-1 md:flex-none">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    aria-label="Sort tools"
                    className="appearance-none bg-inset border border-subtle rounded-xl pl-4 pr-9 py-2.5 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-all w-full cursor-pointer text-secondary"
                  >
                    <option>Name A–Z</option>
                    <option>Name Z–A</option>
                    <option>Popular first</option>
                  </select>
                  <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" size={13} />
                </div>
              </div>
            </div>

            {/* Tools grid / list */}
            {sortedTools.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 justify-items-stretch' : 'flex flex-col gap-3'}>
                <AnimatePresence mode="popLayout">
                  {sortedTools.map(tool => (
                    <motion.div
                      layout
                      key={tool.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="w-full flex justify-center"
                    >
                      {viewMode === 'grid' ? (
                        <ToolCard tool={tool} />
                      ) : (
                        <div
                          onClick={() => navigate('tool', { tool })}
                          role="link"
                          tabIndex={0}
                          onKeyDown={e => { if (e.key === 'Enter') navigate('tool', { tool }); }}
                          className="w-full bg-card border border-subtle rounded-2xl p-4 flex items-center gap-4 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all cursor-pointer group tap-feedback focus-visible:outline-2 focus-accent"
                        >
                          <div className="w-12 h-12 bg-icon rounded-xl flex items-center justify-center text-secondary group-hover:scale-105 transition-transform shrink-0">
                            {tool.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-faint">{getCategory(tool.category)?.name}</span>
                            <h3 className="font-bold text-[15px] text-neutral-900 dark:text-white truncate tracking-tight mt-0.5 group-hover:underline decoration-1 underline-offset-2">{tool.name}</h3>
                            <p className="text-xs text-secondary font-normal mt-0.5 line-clamp-1">{tool.tagline}</p>
                          </div>

                          <div className="w-8 h-8 bg-inset group-hover:bg-accent rounded-full flex items-center justify-center text-faint transition-all shrink-0 group-hover:rotate-45" aria-hidden="true">
                            <ArrowUpRight size={14} />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-card border border-dashed border-gray-300 dark:border-neutral-800 rounded-[24px] p-12 sm:p-16 text-center">
                <div className="w-14 h-14 bg-inset rounded-full flex items-center justify-center mx-auto mb-5 border border-subtle">
                  {mode === 'bookmarks' ? <Bookmark size={24} className="text-faint" /> : <Search size={24} className="text-faint" />}
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white mb-1.5">{empty.title}</h2>
                <p className="text-xs sm:text-sm text-secondary font-normal max-w-xs mx-auto leading-relaxed">{empty.message}</p>
                <button
                  onClick={() => { setSearchQuery(''); navigate('tools'); }}
                  className="mt-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-5 py-2.5 rounded-xl font-bold text-xs hover:opacity-90 transition-opacity tap-feedback"
                >
                  {mode === 'bookmarks' ? 'Browse All Tools' : 'Clear Search'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
