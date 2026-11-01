# ToolNest

A professional, globally accessible collection of **free online tools** — converters, generators, calculators, text utilities, and developer helpers. Every tool runs entirely in the browser: no accounts, no uploads, no tracking.

## Tech Stack

- **React 19** + **TypeScript 5.8**
- **Vite 6** (dev server + build)
- **Tailwind CSS 4** (light/dark theme via the `dark` class)
- **Motion** for subtle interface animation
- **Lucide React** icons, **Sonner** toasts
- Hash-based routing (`#/tools`, `#/tool/<slug>`, `#/category/<id>`, `#/about`) so browser back/forward and shared links work without a backend

## Run Locally

**Prerequisite:** Node.js

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`
3. Open http://localhost:3000

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |

## Project Structure

```
src/
├── main.tsx                # App bootstrap
├── App.tsx                 # View switcher (home / tools / tool / category / bookmarks / about)
├── types.ts                # Tool, ToolCategory, context types
├── index.css               # Tailwind theme + mobile layout overrides
├── context/
│   └── ToolContext.tsx     # Hash router, theme, bookmarks, search state
├── data/
│   └── tools.tsx           # Tool catalog (6 categories, 21 tools) with metadata
├── components/             # Header, Hero, ToolCard, ToolPage, ToolsBrowser, etc.
└── tools/                  # One working client-side implementation per tool
    ├── ui.tsx              # Shared tool UI primitives (inputs, copy, stats)
    └── *.tsx               # Tool implementations grouped by category
```

## Privacy Model

All tools are client-side by design: text, files, and numbers are processed with standard browser APIs (Canvas, Web Crypto, FileReader) and never leave the device. Tool pages state this honestly, including each tool's limitations.
