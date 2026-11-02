import { useEffect, useState } from 'react';
import { useToolStore } from '../../context/ToolContext';

const ADMIN_THEME_KEY = 'omnitoolify-admin-theme';
export type AdminTheme = 'dark' | 'light';

/**
 * Independent admin theme. Persisted under its own key, applied while the
 * admin panel is mounted, and the public theme is restored on unmount.
 * The public website's theme behavior is untouched.
 */
export function useAdminTheme() {
  const { theme: publicTheme } = useToolStore();
  const [adminTheme, setAdminTheme] = useState<AdminTheme>(() => {
    try {
      const stored = localStorage.getItem(ADMIN_THEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch { /* ignore */ }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', adminTheme === 'dark');
    return () => {
      document.documentElement.classList.toggle('dark', publicTheme === 'dark');
    };
  }, [adminTheme, publicTheme]);

  const toggleAdminTheme = () => {
    setAdminTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(ADMIN_THEME_KEY, next);
      } catch { /* ignore */ }
      return next;
    });
  };

  return { adminTheme, toggleAdminTheme };
}
