# OmniToolify

A professional, globally accessible collection of **free online tools** — converters, generators, calculators, text utilities, and developer helpers. Every tool runs entirely in the browser: no accounts, no uploads, no tracking.

## Production

- **Brand name:** OmniToolify
- **Intended production URL:** https://omnitoolify.hollowsmp.club
- Set `VITE_SITE_URL` at build time to override the default base URL used for canonical URLs, Open Graph tags, and sitemap generation.

### Deploying to Cloudflare (Workers / Pages)

The production build reads Firestore content through the Firebase web SDK. Vite
bakes `VITE_*` variables into the JS bundle **at build time** — if they are
missing when `npm run build` runs, the deployed site loads but every CMS-backed
homepage section (Featured Carousel, Most Popular, New & Noteworthy) fails with
“could not be loaded” errors while the Firestore rules and data are fine.

Required variables (values come from your local `.env` / Firebase Console for
project `omnitoolify`):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID   (optional)
```

Where to set them:

- **Cloudflare Pages** → project → **Settings → Environment variables** — they
  are injected into the build step (set them before kicking off a new build).
- **Cloudflare Workers (static assets / Workers Sites)** → build locally with
  the env vars present (they are in `.env`), then upload the generated `dist/`;
  or run the build in CI with the variables configured in the CI environment
  (Workers → Settings → Variables only applies to runtime, not builds — the
  bake must happen at build time).

Guard + verification:

```
npm run deploy:check   # fails if any required VITE_FIREBASE_* is missing
npm run build
```

After deploying, sanity-check that the bundle really contains the config:

```
find dist/assets -name '*.js' | xargs grep -l "omnitoolify" >/dev/null && echo "Firebase config baked in"
```

The login browser console during the page load should show **no**
`[firebase]` warning lines; if you see `[firebase] Firestore unavailable —
continuing with local fallback`, the deployed build was made without the env
variables.

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
| `npm run deploy:check` | Verify Firebase env vars exist before building for Cloudflare |

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
