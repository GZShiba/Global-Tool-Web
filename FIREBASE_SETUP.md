# Firebase Setup — OmniToolify (Spark Plan, No Backend)

This document covers the **free Spark-plan** Firebase architecture for the
public website and the Admin Panel.

## Architecture

```
Browser (React + Vite)
 ├─ Firebase Auth (Email/Password) ──────► admin login/logout/session restore
 ├─ Cloud Firestore (direct reads/writes) ─► CMS content (tools, categories,
 │                                          slides, popular config)
 └─ Firestore Security Rules ─────────────► public reads only for published /
                                           enabled / active records; writes
                                           only from allowlisted admin emails
```

There is **no Cloud Function, no custom backend, no Firebase Storage, no
Firebase CLI, and no Secret Manager**. Everything runs in the browser against
Firestore, with authorization enforced by security rules.

## Required Firebase Console steps (manual)

1. Open https://console.firebase.google.com/project/omnitoolify/overview and
   confirm the project is on the **Spark (free)** plan.
2. **Authentication → Sign-in method → enable Email/Password**.
3. Create the admin account(s) under **Authentication → Users → Add user**
   (the single approved admin is `gzshiba99329@gmail.com`). Confirm the email
   if the project enforces email verification.
4. **Cloud Firestore → Create database** (production mode, default location).
5. Edit the rules: **Firestore → Rules**, paste the contents of
   `firestore.rules` from this repo, replacing the emails in the `isAdmin()`
   function with the exact approved admin emails. Click **Publish**.
   - The rules require: signed-in user, verified email, email in allowlist.
   - Public reads only for `status == 'published'` tools, `enabled == true`
     categories, `active == true` slides.
   - Unknown collections are denied by default.
6. **Do not** set up Firebase Storage (not used; media is URL-based).

## Environment variables

`.env` (never commit real values; see `.env.example`):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

No server secrets exist; never add `ADMIN_*` secrets to `VITE_` vars.

## Production (Cloudflare) build — CRITICAL

Vite bakes `VITE_*` variables into the JS bundle **at build time**. If the
deployed Cloudflare build was made without them, Firebase is unconfigured in
the browser and the homepage CMS sections fail with “could not be loaded”
(Featured Carousel, Most Popular, New & Noteworthy) even though rules and data
are fine.

- Set all `VITE_FIREBASE_*` above in the **build environment**:
  - Cloudflare Pages → Settings → Environment variables (they are injected
    into the build step).
  - Cloudflare Workers → build locally with `.env` present, then upload
    `dist/` (runtime Variables do NOT bake into the bundle).
- Run `npm run deploy:check` before building to verify.
- After deploy: confirm the served JS contains the project id
  (`grep -l omnitoolify dist/assets/*.js`) and that the browser console shows
  no `[firebase] Firestore unavailable` warning.

## How it works

- Public website: reads published CMS content from Firestore when configured;
  falls back to the local Admin API / static catalog otherwise.
- Admin Panel: sign-in via Firebase Auth (Email/Password). CMS writes go
  directly to Firestore; Firestore rules authorize the admin allowlist. If
  Firebase is unconfigured or the user is not signed in, writes fail with a
  clear message.
- Media: images are referenced by URL (local `/admin-media/…` paths or any
  http(s) URL). No uploads on the Spark plan; existing local media is preserved
  and still served from `public/admin-media/`.

## Media limitations

Browser uploads cannot write files into a static website's `public/` directory
without a backend or storage service. On the Spark plan, use image URLs:

- Add an image by URL in Admin → Media Library (label + URL).
- Use the resulting URL in hero slides, tool thumbnails, and categories.

## Verification

- `npm install`
- `npx tsc --noEmit`
- `npm run build`
- In the browser: navigate to `/zx/adx`, sign in with the allowlisted admin,
  create/edit/publish a tool, and verify the public site shows published
  content and hides drafts. Confirm an unapproved account cannot write.
