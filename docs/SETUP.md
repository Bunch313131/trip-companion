# Phase 1 Setup — Trip Companion

Everything you need to take the app from "runs locally with a preview" to
"real auth + seeded data." Work top to bottom.

## 0. Local dev (already done for you)

- Node is installed, dependencies are installed, `scaffold/` was flattened
  into the repo root, and the design tokens are filled from the mockups.
- Run the app any time with:

  ```bash
  npm run dev
  ```

  Open http://localhost:3000 — you'll see the Today dashboard and can tab
  around. Auth, live data, map, and AI light up as we complete the steps below.

## 1. Create the Firebase project (~5 min)

1. Go to https://console.firebase.google.com → **Add project**.
2. Name it (e.g. `trip-companion`). Google Analytics is optional — you can
   turn it off.
3. Once created, in the left sidebar:
   - **Build → Firestore Database → Create database** → Start in
     **production mode** → pick a region close to you (e.g. `us-west1`).
   - **Build → Authentication → Get started → Email/Password → enable
     "Email link (passwordless sign-in)"**. (Optionally enable Google too.)
   - **Build → Storage → Get started** → production mode → same region.

## 2. Get the client config (public keys)

1. Project Settings (gear icon) → **General** → scroll to **Your apps** →
   click the **Web** icon (`</>`) → register an app (nickname `trip-web`).
2. Firebase shows a `firebaseConfig` object. Copy each value into
   `.env.local` (create it by copying `.env.example`):

   ```bash
   cp .env.example .env.local
   ```

   Map the fields:
   - `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `NEXT_PUBLIC_FIREBASE_APP_ID`

## 3. Get the Admin credentials (secret)

1. Project Settings → **Service accounts** → **Generate new private key** →
   downloads a JSON file.
2. Open it, collapse it to a single line, and paste it as the value of
   `FIREBASE_ADMIN_CREDENTIALS` in `.env.local` (wrap it in single quotes).
   - Tip: `node -e "console.log(JSON.stringify(require('./path-to-key.json')))"`
     prints a single-line version.
3. **Do not commit this file.** `.gitignore` already excludes
   `*-service-account*.json` and `.env*.local`.

## 4. Deploy security rules + indexes

```bash
npx firebase login          # opens a browser to authenticate
npx firebase use --add      # pick the project you just created
npm run firebase:deploy:rules
npm run firebase:deploy:indexes
```

## 5. Seed the trip data

You can seed now and attach yourself as owner after you first sign in:

```bash
npm run db:seed             # writes the trip with empty memberIds
```

Then, after you sign in once (so Firebase Auth creates your user):

1. Firebase Console → **Authentication → Users** → copy your **User UID**.
2. Re-run the seed with yourself as owner:

   ```bash
   OWNER_UID=your-uid OWNER_EMAIL=bunch3131@gmail.com npm run db:seed
   ```

   It's idempotent — this just fills in your membership.

## 6. Other keys (needed in later phases, grab them now)

- **Anthropic** (Phase 4 chat): https://console.anthropic.com/settings/keys →
  `ANTHROPIC_API_KEY`
- **MapTiler** (Phase 2 map): https://cloud.maptiler.com → Account → Keys →
  `NEXT_PUBLIC_MAPTILER_KEY`

## 7. Deploy to Vercel (end of Phase 1)

1. Push to GitHub (already the `trip-companion` repo).
2. https://vercel.com → **New Project** → import the repo.
3. Add every variable from `.env.local` into Vercel → Project → Settings →
   **Environment Variables**.
4. Deploy. Update `NEXT_PUBLIC_APP_URL` to the Vercel URL and add that URL to
   Firebase Auth → Settings → **Authorized domains**.

---

When steps 1–3 are done, tell me and I'll wire the magic-link auth flow and
the live Firestore reads.
