import { useState } from 'react';
import type { ReactNode } from 'react';
import { LayoutDashboard, Image as ImageIcon, Star, Wrench, Plus, FolderTree, KeyRound, LogOut, PanelLeftClose, PanelLeft, Sun, Moon } from 'lucide-react';
import { adminLogout } from '../../lib/adminApi';
import { useAdminTheme } from './adminTheme';
import HeroSlidesManager from './HeroSlidesManager';
import PopularToolsManager from './PopularToolsManager';
import ToolsManager from './ToolsManager';
import CategoriesManager from './CategoriesManager';
import MediaLibrary from './MediaLibrary';
import ChangePin from './ChangePin';

type AdminSection = 'home' | 'hero' | 'popular' | 'tools' | 'add' | 'categories' | 'media' | 'security';

const NAV: { id: AdminSection; label: string; icon: ReactNode; group: string }[] = [
  { id: 'home', label: 'Content Home', icon: <LayoutDashboard size={16} />, group: 'Home Content' },
  { id: 'hero', label: 'Hero Slides', icon: <ImageIcon size={16} />, group: 'Home Content' },
  { id: 'popular', label: 'Popular Tools', icon: <Star size={16} />, group: 'Home Content' },
  { id: 'tools', label: 'All Tools', icon: <Wrench size={16} />, group: 'Tool Management' },
  { id: 'add', label: 'Add New Tool', icon: <Plus size={16} />, group: 'Tool Management' },
  { id: 'categories', label: 'Categories', icon: <FolderTree size={16} />, group: 'Categories' },
  { id: 'media', label: 'Media Library', icon: <ImageIcon size={16} />, group: 'Media Library' },
  { id: 'security', label: 'Admin Security', icon: <KeyRound size={16} />, group: 'Admin Security' },
];

export default function AdminApp({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState<AdminSection>('home');
  const [collapsed, setCollapsed] = useState(false);
  const { adminTheme, toggleAdminTheme } = useAdminTheme();

  const handleLogout = async () => {
    await adminLogout();
    onLogout();
  };

  const title = NAV.find(n => n.id === section)?.label || 'Admin';

  return (
    <div className="min-h-screen bg-app flex">
      {/* Sidebar */}
      <aside className={`bg-card border-r border-subtle shrink-0 transition-all duration-200 flex flex-col ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className={`h-16 flex items-center gap-2.5 px-4 border-b border-subtle ${collapsed ? 'justify-center px-0' : ''}`}>
          {!collapsed && (
            <>
              <div className="w-8 h-8 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center shrink-0">
                <span className="text-white dark:text-neutral-900 font-extrabold text-xs">OM</span>
              </div>
              <span className="font-extrabold text-sm text-neutral-900 dark:text-white tracking-tight">OmniToolify</span>
            </>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white dark:text-neutral-900 font-extrabold text-xs">OM</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {(['Home Content', 'Tool Management', 'Categories', 'Media Library', 'Admin Security'] as const).map(group => {
            const items = NAV.filter(n => n.group === group);
            return (
              <div key={group}>
                {!collapsed && <p className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-faint">{group}</p>}
                <div className="flex flex-col gap-0.5">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSection(item.id)}
                      title={item.label}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                        section === item.id
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                          : 'text-secondary hover:bg-inset hover:text-neutral-900 dark:hover:text-white'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      {item.icon}
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-subtle flex flex-col gap-1">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-secondary hover:bg-inset hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && <span>{collapsed ? '' : 'Collapse'}</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-secondary hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-card border-b border-subtle flex items-center justify-between px-5 sticky top-0 z-20">
          <div>
            <p className="text-[10px] text-faint font-bold uppercase tracking-widest">Admin / {title}</p>
            <h1 className="text-sm font-extrabold text-neutral-900 dark:text-white tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAdminTheme}
              className="w-9 h-9 rounded-full bg-inset text-secondary hover:text-neutral-900 dark:hover:text-white flex items-center justify-center transition-colors"
              aria-label={adminTheme === 'dark' ? 'Switch admin to light mode' : 'Switch admin to dark mode'}
              title={adminTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {adminTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-widest border border-emerald-200/60 dark:border-emerald-900/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Authenticated
            </span>
          </div>
        </header>

        <main className="flex-1 p-5 overflow-y-auto">
          {section === 'home' && <AdminLanding go={setSection} />}
          {section === 'hero' && <HeroSlidesManager />}
          {section === 'popular' && <PopularToolsManager />}
          {section === 'tools' && <ToolsManager mode="list" />}
          {section === 'add' && <ToolsManager mode="add" />}
          {section === 'categories' && <CategoriesManager />}
          {section === 'media' && <MediaLibrary />}
          {section === 'security' && <ChangePin />}
        </main>
      </div>
    </div>
  );
}

function AdminLanding({ go }: { go: (s: AdminSection) => void }) {
  const cards: { id: AdminSection; title: string; desc: string; icon: ReactNode }[] = [
    { id: 'hero', title: 'Hero Slides', desc: 'Manage the homepage carousel slides, order, and visibility.', icon: <ImageIcon size={18} /> },
    { id: 'popular', title: 'Popular Tools', desc: 'Choose which tools appear in Most Popular on the homepage.', icon: <Star size={18} /> },
    { id: 'tools', title: 'All Tools', desc: 'Create, edit, publish, archive, or delete tools.', icon: <Wrench size={18} /> },
    { id: 'categories', title: 'Categories', desc: 'Manage tool categories, slugs, and ordering.', icon: <FolderTree size={18} /> },
    { id: 'media', title: 'Media Library', desc: 'Upload and manage images used across the site.', icon: <ImageIcon size={18} /> },
    { id: 'security', title: 'Change PIN', desc: 'Update your six-digit admin security PIN.', icon: <KeyRound size={18} /> },
  ];
  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-1">Content Management</h2>
      <p className="text-sm text-secondary font-normal mb-6">Choose an area to manage OmniToolify content.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <button
            key={c.id}
            onClick={() => go(c.id)}
            className="text-left bg-card border border-subtle rounded-2xl p-5 hover:border-neutral-400 dark:hover:border-neutral-600 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center mb-3">{c.icon}</div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-1">{c.title}</h3>
            <p className="text-xs text-secondary font-normal leading-relaxed">{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
