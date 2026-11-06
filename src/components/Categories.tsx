import { ArrowRight } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { CategoryCardsSkeleton, CmsErrorNote } from './skeletons';

export default function Categories() {
  const { navigate, cmsState, categories: catalogCategories, tools: catalogTools } = useToolStore();

  return (
    <section id="categories-section" className="categories-section max-w-7xl mx-auto px-4 md:px-8 mt-8 sm:mt-10 scroll-mt-24">
      <div className="mb-6 sm:mb-8 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl md:text-[28px] font-extrabold text-neutral-900 dark:text-white tracking-tight">Browse Categories</h2>
        <p className="text-xs sm:text-sm text-secondary font-normal mt-1.5">Find the right tool by what you are working on</p>
      </div>

      {cmsState === 'loading' ? (
        <CategoryCardsSkeleton count={6} />
      ) : cmsState === 'error' ? (
        <CmsErrorNote
          message="We couldn't reach the content service, so categories can't be shown right now."
          onRetry={() => window.location.reload()}
        />
      ) : catalogCategories.length === 0 ? (
        <div className="bg-card border border-dashed border-gray-300 dark:border-neutral-800 rounded-[24px] py-12 text-center">
          <p className="text-sm font-bold text-neutral-900 dark:text-white">No categories enabled yet</p>
          <p className="text-xs text-secondary font-normal mt-1">Enabled categories from the CMS will appear here.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
        {catalogCategories.map(cat => {
          const count = catalogTools.filter(t => t.category === cat.id && t.isNew !== undefined ? t.category === cat.id : t.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => navigate('category', { category: cat.id })}
              className="category-card group relative overflow-hidden bg-card border-2 border-neutral-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex items-center justify-between gap-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/70 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/[0.06] dark:hover:shadow-blue-500/10 tap-feedback focus-visible:outline-2 focus-accent w-full min-w-0"
              aria-label={`Browse ${cat.name} tools`}
            >
              {/* Spotlight overlay on hover */}
              <span
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'radial-gradient(240px circle at 88% -8%, rgba(59,130,246,0.12), transparent 65%)' }}
              />

              <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 relative">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/10 text-blue-600 dark:text-blue-400 shadow-sm transition-all duration-300 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white dark:group-hover:from-blue-500 dark:group-hover:to-indigo-500 group-hover:scale-110 group-hover:-rotate-3 shrink-0">
                  {cat.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white tracking-tight leading-tight">{cat.name}</h3>
                  <p className="text-[11px] sm:text-xs text-secondary font-normal truncate mt-0.5">{cat.description}</p>
                  <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full border border-subtle bg-inset/70 text-faint group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-[9px] font-bold uppercase tracking-[0.14em]">
                    <span className="w-1 h-1 rounded-full bg-accent/50 group-hover:bg-accent transition-colors" />
                    {count} tool{count === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-inset border border-subtle text-faint flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-neutral-900 group-hover:border-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:border-white dark:group-hover:text-neutral-900 group-hover:translate-x-1 group-hover:-rotate-45" aria-hidden="true">
                <ArrowRight size={14} />
              </div>
            </button>
          );
        })}
      </div>
      )}
    </section>
  );
}
