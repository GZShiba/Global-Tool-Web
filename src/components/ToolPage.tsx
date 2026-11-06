import { useState, ReactNode, Fragment } from 'react';
import {
  ChevronRight, Bookmark, ShieldCheck, ChevronUp, ChevronDown, Play,
  ListChecks, Info, AlertCircle, Wrench, LayoutGrid, Check,
} from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { getCategory } from '../data/tools';
import { resolveToolAction } from '../lib/toolRouting';
import ToolCard from './ToolCard';
import ToolVisual from './ToolVisual';
import ToolRedirectCountdown from './ToolRedirectCountdown';

/* ---------- Accordion item (mobile pattern from the original detail page) ---------- */
function AccordionItem({ title, isOpen, onClick, children }: { title: string; isOpen: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <div className="border border-subtle rounded-2xl overflow-hidden bg-card">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-inset transition-colors text-left"
        aria-expanded={isOpen}
      >
        <span className="font-bold text-[15px] text-neutral-900 dark:text-white">{title}</span>
        {isOpen ? <ChevronUp size={18} className="text-neutral-900 dark:text-white shrink-0" /> : <ChevronDown size={18} className="text-faint shrink-0" />}
      </button>
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-subtle animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------- Section content ---------- */
function OverviewSection({ description }: { description: string }) {
  return <p className="text-sm sm:text-[15px] text-secondary font-normal leading-relaxed">{description}</p>;
}

function FeaturesSection({ features }: { features: string[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      {features.map((f, idx) => (
        <div key={idx} className="flex items-center gap-3 p-3.5 bg-inset rounded-xl border border-subtle">
          <div className="w-6 h-6 bg-card border border-subtle rounded-full flex items-center justify-center shrink-0">
            <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-[13px] font-medium text-neutral-800 dark:text-gray-200">{f}</span>
        </div>
      ))}
    </div>
  );
}

function HowItWorksSection({ howTo }: { howTo: string[] }) {
  return (
    <ol className="space-y-2.5">
      {howTo.map((step, idx) => (
        <li key={idx} className="flex items-start gap-3">
          <span className="w-6 h-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
          <span className="text-[13px] sm:text-sm text-secondary font-normal leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function DetailsSection({ tool }: { tool: { notes?: { label: string; value: string }[] } }) {
  if (!tool.notes?.length) {
    return (
      <p className="text-sm text-secondary font-normal leading-relaxed">
        This tool has no special requirements or limitations beyond what is described above.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {tool.notes.map((note, idx) => (
        <div key={idx} className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-500 block mb-1">{note.label}</span>
          <p className="text-[13px] text-neutral-800 dark:text-gray-300 font-normal leading-relaxed">{note.value}</p>
        </div>
      ))}
    </div>
  );
}

function PrivacySection({ privacy }: { privacy: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 rounded-xl flex items-center justify-center shrink-0">
        <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
      </div>
      <p className="text-[13px] sm:text-sm text-secondary font-normal leading-relaxed">{privacy}</p>
    </div>
  );
}

/* ---------- Main details page ---------- */
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'features', label: 'Features' },
  { id: 'how', label: 'How It Works' },
  { id: 'details', label: 'Details' },
  { id: 'privacy', label: 'Privacy' },
] as const;

export default function ToolPage() {
  const { selectedTool, navigate, bookmarks, toggleBookmark, tools: catalogTools } = useToolStore();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('overview');
  const [expanded, setExpanded] = useState<string[]>(['overview']);

  if (!selectedTool) return null;
  const tool = selectedTool;
  const category = getCategory(tool.category);
  const related = catalogTools
    .filter(t => t.id !== tool.id && (t.tags.some(tag => tool.tags.includes(tag)) || t.category === tool.category))
    .slice(0, 4);
  const isBookmarked = bookmarks.includes(tool.id);
  const action = resolveToolAction(tool);

  const toggleSection = (id: string) =>
    setExpanded(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]));

  const tabContent: Record<string, ReactNode> = {
    overview: <OverviewSection description={tool.description} />,
    features: <FeaturesSection features={tool.features} />,
    how: <HowItWorksSection howTo={tool.howTo} />,
    details: <DetailsSection tool={tool} />,
    privacy: <PrivacySection privacy={tool.privacy} />,
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-secondary overflow-x-auto no-scrollbar whitespace-nowrap">
        <button onClick={() => navigate('home')} className="hover:text-neutral-900 dark:hover:text-white transition-colors font-medium">Home</button>
        <ChevronRight size={13} className="shrink-0 text-faint" />
        <button onClick={() => navigate('tools')} className="hover:text-neutral-900 dark:hover:text-white transition-colors font-medium">Tools</button>
        <ChevronRight size={13} className="shrink-0 text-faint" />
        <button
          onClick={() => navigate('category', { category: tool.category })}
          className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors font-medium"
        >
          {category?.name}
        </button>
        <ChevronRight size={13} className="shrink-0 text-faint" />
        <span className="text-neutral-900 dark:text-white font-semibold truncate">{tool.name}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-10 mt-2">

        {/* Main visual (desktop: left column row 1 · mobile: directly after breadcrumbs) */}
        <div className="lg:col-span-2 lg:row-start-1 min-w-0">
          <ToolVisual icon={tool.icon} tint={tool.category} size="detail" className="aspect-[16/9] sm:aspect-[16/8]" />

          {/* Desktop tabs */}
          <div className="hidden lg:block mt-8">
            <div className="flex border-b border-subtle gap-1 overflow-x-auto no-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white'
                      : 'border-transparent text-faint hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="py-7 animate-in fade-in duration-300">{tabContent[activeTab]}</div>
          </div>

        </div>

        {/* Right Column: Action sidebar (desktop: sticky right column · mobile: rendered right after the visual, before the accordions) */}
        <div className="lg:col-start-3 lg:row-start-1 lg:row-span-2 min-w-0">
          <div className="lg:sticky lg:top-24 space-y-5">

            {/* Title + CTA card */}
            <div className="bg-card border border-subtle rounded-[24px] p-6 sm:p-7 shadow-sm">
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-tight">{tool.name}</h1>
                  <button
                    onClick={() => navigate('category', { category: tool.category })}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary bg-inset border border-subtle px-2.5 py-1 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-600 transition-all"
                  >
                    <LayoutGrid size={11} /> {category?.name}
                  </button>
                </div>
                <button
                  onClick={() => toggleBookmark(tool.id)}
                  className={`p-2.5 rounded-xl border transition-all shrink-0 ${
                    isBookmarked
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/50 text-amber-500'
                      : 'bg-transparent border-subtle text-faint hover:text-amber-500 hover:border-amber-200/60'
                  }`}
                  aria-label={isBookmarked ? 'Remove from My Tools' : 'Save to My Tools'}
                  title={isBookmarked ? 'Remove from My Tools' : 'Save to My Tools'}
                >
                  <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                </button>
              </div>

              <p className="text-[13px] text-secondary font-normal leading-relaxed mb-6 line-clamp-3">{tool.description}</p>

              {/* Primary action — one authoritative routing decision */}
              <button
                onClick={() => {
                  if (action.kind === 'external') {
                    window.location.href = action.url;
                    return;
                  }
                  if (action.kind === 'internal') {
                    navigate('run', { tool });
                    return;
                  }
                  navigate('run', { tool });
                }}
                className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Play size={14} fill="currentColor" /> Open Tool
              </button>

              {action.kind === 'unavailable' && action.reason === 'invalid-external-url' && (
                <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-3">
                  External redirect is enabled but the URL is missing or invalid — fix it in Admin → Add/Edit Tool.
                </p>
              )}
              {action.kind === 'unavailable' && action.reason === 'no-implementation' && (
                <p className="mt-3 text-[11px] text-secondary font-normal bg-inset border border-subtle rounded-xl p-3">
                  This tool has no working implementation yet — the interface is not available.
                </p>
              )}

              {/* At a glance */}
              <div className="mt-6 pt-5 border-t border-subtle space-y-3.5 text-xs font-medium">
                <div className="flex justify-between items-center">
                  <span className="text-faint uppercase tracking-wider text-[10px] font-bold">Runs on</span>
                  <span className="text-neutral-900 dark:text-white font-semibold">Your device</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-faint uppercase tracking-wider text-[10px] font-bold">Account needed</span>
                  <span className="text-neutral-900 dark:text-white font-semibold">None</span>
                </div>
                <div className="flex justify-between items-start gap-3">
                  <span className="text-faint uppercase tracking-wider text-[10px] font-bold shrink-0 pt-0.5">Tags</span>
                  <span className="flex flex-wrap gap-1.5 justify-end">
                    {tool.tags.map(tag => (
                      <span key={tag} className="text-secondary bg-inset px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest">#{tag}</span>
                    ))}
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy card — desktop only; the Privacy accordion covers mobile */}
            <div className="hidden lg:block bg-card border border-subtle rounded-[24px] p-6">
              <h2 className="font-bold text-[15px] text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" /> Privacy
              </h2>
              <p className="text-xs text-secondary font-normal leading-relaxed mb-4">{tool.privacy}</p>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> No uploads · No tracking · Free
              </div>
            </div>
          </div>
        </div>

        {/* Mobile accordion — rendered after the tool info card (desktop uses the tabs above) */}
        <div className="lg:hidden space-y-3">
          {TABS.map(tab => (
            <Fragment key={tab.id}>
              <AccordionItem
                title={tab.label}
                isOpen={expanded.includes(tab.id)}
                onClick={() => toggleSection(tab.id)}
              >
                {tabContent[tab.id]}
              </AccordionItem>
            </Fragment>
          ))}
        </div>
      </div>

      {/* Related tools */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Related Tools</h2>
            <p className="text-xs sm:text-sm text-secondary font-normal mt-1">Alternatives and tools often used together</p>
          </div>
          <button
            onClick={() => navigate('tools')}
            className="text-neutral-900 dark:text-white font-bold text-[11px] uppercase tracking-wider hover:underline underline-offset-4 shrink-0"
          >
            View All
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 justify-items-stretch">
          {related.map(relatedTool => (
            <div key={relatedTool.id} className="w-full flex justify-center">
              <ToolCard tool={relatedTool} />
            </div>
          ))}
        </div>
      </div>

      {/* Auto-redirect countdown — only when an external redirect is configured
          WITH a delay. Keyed so switching tools resets it; hidden entirely when
          the CMS disables the corner timer for this tool. Never runs for
          internal/unavailable actions. */}
      {action.kind === 'external' && action.delaySeconds > 0 && tool.cornerTimerEnabled !== false && (
        <div key={tool.id}>
          <ToolRedirectCountdown tool={tool} />
        </div>
      )}
    </div>
  );
}
