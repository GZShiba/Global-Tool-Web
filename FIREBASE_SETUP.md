# Firebase Integration — OmniToolify

## Architecture

```
┌─────────────────────────┐    existing login (email+password+PIN)
│  Local Admin API        │──────────────► Admin Panel (local writes)
│  (.admin-data/, sessions│─────────────────────┐
└──────────┬──────────────┘                     │ short-lived HMAC ticket
           │ authenticated admin session        │ (ADMIN_BRIDGE_SECRET)
           │ POST /api/admin/firebase-ticket     ▼
           └──────────────────────────────► ┌──────────────────────────┐
                                            │ Cloud Function: adminCms │
                                            │ (Firebase Functions +     │
                                            │  Admin SDK)               │
                                            │ verifies ticket, then     │
                                            │ writes Firestore (rules   │
                                            │ also enforce admin-only)  │
                                            └────────────┬─────────────┘
                                                         ▼
                                              Cloud Firestore CMS docs
```

- The existing Admin Panel still authenticates through the **local Admin API**
  (unchanged: email+password → PIN → session, rate limits, max 2 admins).
- When Firebase + the hosted function are configured, admin writes are sent to
  the Cloud Function with a **short-lived HMAC ticket**; otherwise they fall
  back to the local API.
- The public website reads published/enabled/active CMS content from Firestore
  (when configured) with the local API/static catalog as fallback.

## What is implemented in this repository

- `src/lib/firebase.ts` — lazy Firebase init (env-driven, graceful when missing).
- `src/lib/firestoreCms.ts` — Firestore access layer + admin write helpers.
- `src/lib/firebaseStorage.ts` — Storage upload helper.
- `src/lib/cloudCms.ts` — client for the hosted adminCms function.
- `src/lib/adminWriteLayer.ts` — unified cloud/local write wrapper used by the
  Admin Panel managers (tools, categories, slides, popular).
- `src/lib/cmsPure.ts` — pure helpers (doc ids, sanitization, visibility).
- `functions/admin-cms/` — Cloud Function (Admin SDK) performing ticket-verified
  Firestore writes.
- `scripts/bridge-ticket.mjs` — HMAC mint/verify used by the local server.
- `scripts/migrate-local-to-firestore.mjs` — idempotent local→Firestore import.
- `firestore.rules`, `storage.rules`, `firebase.json`.

## Administrator authorization

- **Local server** remains the identity/authorization authority for admins.
- The **Cloud Function** never trusts client roles: it only accepts a bearer
  ticket whose signature and expiry it verifies with the shared
  `ADMIN_BRIDGE_SECRET`; the ticket can only be minted by an authenticated
  admin session.
- Firestore/Storage rules additionally require `request.auth.token.admin ==
  true` for writes (for direct SDK access) and expose only published/enabled/
  active records to public reads.

## Environment variables

Frontend (`.env` — never commit real values):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_FUNCTIONS_URL=   # e.g. https://<region>-<project>.cloudfunctions.net/adminCms
```

Server-side (local admin server environment):
```
ADMIN_BRIDGE_SECRET=            # long random string, shared with the function
```
The function's environment must set the same `ADMIN_BRIDGE_SECRET`.

## Firebase Console steps (manual)

1. Create a Firebase project; add a web app and copy its public config into the
   env vars above.
2. Enable **Cloud Firestore** (production mode) and **Storage**.
3. Deploy rules + function:
   ```
   cd functions/admin-cms && npm install
   cd ../..
   firebase deploy --only firestore:rules,storage:rules,functions:adminCms
   ```
4. Set the function environment secret:
   ```
   firebase functions:secrets:set ADMIN_BRIDGE_SECRET
   ```
   (or configure the equivalent runtime env), and set the same value on the
   local admin server.
5. (Optional) If using Firebase Auth for direct admin SDK access, assign the
   `admin` custom claim with the Admin SDK — never from the client.

## Importing existing local CMS data

```
node scripts/migrate-local-to-firestore.mjs --dry-run   # preview
node scripts/migrate-local-to-firestore.mjs             # perform import
```
- Reads only `.admin-data/db.json` (tools, categories, slides, popular).
- Uses deterministic doc ids → repeated runs update in place, no duplicates.
- Never exports auth data (passwords/PINs/sessions).

## Media uploads

- `MediaLibrary` uses **Firebase Storage** when configured (`uploadCmsFile`),
  then records the returned URL locally via the media API. Otherwise it falls
  back to the existing local `public/admin-media/` upload.
- Existing local media is preserved; nothing is deleted after upload.

## Commands

```
npm install
npx tsc --noEmit
npm run build
node scripts/_test-cms-pure.mjs    # (if present) pure helper tests
node scripts/migrate-local-to-firestore.mjs --dry-run
```

## Not yet verified (requires a real Firebase project + deployment)

- Live Firestore reads/writes against an actual project (no project configured
  in this repository).
- Function deployment and secrets (must be done in the Firebase Console/CLI).
- End-to-end admin→function→Firestore→public-site flow.
