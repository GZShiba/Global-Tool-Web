import { ReactNode } from 'react';

export interface ToolCategory {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
}

export interface Tool {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: ReactNode;
  category: string; // ToolCategory id
  tags: string[];
  features: string[];
  useCases: string[];
  howTo: string[];
  notes?: { label: string; value: string }[];
  privacy: string;
  popular?: boolean;
  isNew?: boolean;
}

export type View = 'home' | 'tools' | 'tool' | 'run' | 'category' | 'bookmarks' | 'about' | 'privacy' | 'notfound';

export interface ToolContextType {
  view: View;
  selectedTool: Tool | null;
  selectedCategory: string; // 'all' or ToolCategory id
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  navigate: (view: View, opts?: { tool?: Tool | null; category?: string }) => void;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
