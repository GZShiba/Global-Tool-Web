import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { getPopularTools } from '../data/tools';
import ToolCard from './ToolCard';

export default function FeaturedTools() {
  const { navigate } = useToolStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const featured = getPopularTools();

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-8 sm:mt-10">
      <div className="flex justify-between items-center mb-6 sm:mb-7">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-[28px] font-extrabold text-neutral-900 dark:text-white tracking-tight">Most Popular Tools</h2>
          <p className="text-xs sm:text-sm text-secondary font-normal mt-1.5">The tools our users reach for every day</p>
        </div>
        <button
          onClick={() => navigate('tools')}
          className="border-2 border-neutral-900 dark:border-white text-neutral-900 dark:text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] sm:text-xs hover:bg-accent hover:border-accent dark:hover:bg-accent dark:hover:border-accent transition-all active:scale-95 shrink-0 tap-feedback"
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 justify-items-stretch">
        {featured.map((tool, index) => (
          <div key={tool.id} className={`${!isExpanded && index >= 4 ? 'hidden lg:block' : 'block'}`}>
            <ToolCard tool={tool} />
          </div>
        ))}
      </div>

      <div className="text-center mt-7 lg:hidden">
        <button
          className="border border-subtle bg-card hover:border-neutral-400 dark:hover:border-neutral-600 px-5 py-2.5 rounded-xl font-bold text-xs text-neutral-900 dark:text-white transition-colors inline-flex items-center gap-2 tap-feedback"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'View Less' : 'View More Tools'}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
    </section>
  );
}
