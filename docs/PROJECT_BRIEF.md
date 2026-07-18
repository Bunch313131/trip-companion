# Project Brief — Trip Companion App (Firebase edition)

> Collaborative trip-planning + companion app. Two users co-edit a live itinerary; a Claude-powered chatbot proposes changes they approve. Built as a Next.js PWA on Firebase (Auth + Firestore + Storage). Read this brief in full before writing code.

---

## The mission

Build a **living itinerary tool** that:

1. Works as a planning surface *before* the trip (mostly empty, gets filled in)
2. Becomes a companion *during* the trip (real-time countdowns, what's next, chat)
3. Preserves the trip *after* (searchable memory, exportable)

**Not a static trip guide.** Every stop, activity, reservation, and note is editable. The AI never modifies the itinerary silently — it proposes, humans approve.

---

## Stack (locked)

- **Framework:** Next.js 15 (App Router, TypeScript, Server Components)
- **Styling:** Tailwind CSS + CSS variables for design tokens (see `DESIGN_BRIEF.md`)
- **Auth:** Firebase Auth (email link + optional Google)
- **Database:** Firestore (NoSQL document store, native realtime)
- **Storage:** Firebase Storage (reservation documents, uploads)
- **AI:** `@anthropic-ai/sdk` — Claude Sonnet 4.6 for the chatbot, tool use for proposals
- **Realtime:** Firestore `onSnapshot` listeners (built-in, no extra glue)
- **Maps:** MapLibre GL JS + MapTiler tiles (free tier)
- **Rich text (Notes):** Tiptap
- **PWA:** manual service worker + manifest
- **Deploy:** Vercel via GitHub integration
  - *Alternative: Firebase Hosting + Cloud Functions for a fully-Google stack. Vercel is recommended because Next.js runs natively there with no cold-start.*

**Why Firebase for this app:**
- You have existing Firebase familiarity — no ramp-up cost
- Firestore realtime (`onSnapshot`) is best-in-class for multi-user editing
- Firebase Auth is dead-simple to wire up
- Deploys on Vercel just as easily as any other stack

**Where we have to work harder because Firestore is NoSQL:**
- Multi-document mutations (like applying a proposal that touches stops + activities + reservations) require Firestore **batched writes or transactions** — we handle this in a single server route
- No SQL joins — we denormalize where sensible, query in parallel where not
- Security rules use their own DSL — templated below

---

## Firestore data model

Firestore is a document store. We use a hybrid of subcollections (for tightly-scoped data) and top-level collections (for cross-cutting reads).

### Structure

```
trips/{tripId}                          # trip doc
  members/{userId}                      # subcollection: who has access
  stops/{stopId}                        # subcollection: itinerary stops
  activities/{activityId}               # subcollection: activities (with stopId field)
  reservations/{reservationId}          # subcollection: reservations
  proposals/{proposalId}                # subcollection: AI proposals
  chatMessages/{messageId}              # subcollection: chat history
  notes/{noteId}                        # subcollection: freeform notes

invitations/{token}                     # top-level: invite lookup by token
userTrips/{userId}                      # top-level: user → trip list
  trips/{tripId}                        # subcollection: which trips this user is in
```

**Design decisions:**
- **All trip-scoped data lives under `trips/{tripId}/...`.** Makes security rules trivial ("must be a member of this trip"). Deleting a trip cascades cleanly via delete triggers.
- **Activities are trip-scoped, not stop-scoped.** They carry a `stopId` field. Reason: the "Today" view needs to query activities across all stops by date — easy at trip scope, awkward with nested subcollections.
- **`userTrips` is denormalized for fast "which trips am I in?" queries.** Written atomically whenever a member joins/leaves.
- **`invitations` is top-level and keyed by token.** Anyone with the token URL can look it up (before signing in).

### Document schemas (TypeScript)

```typescript
// trips/{tripId}
type TripDoc = {
  name: string;
  slug: string;                      // URL-safe unique
  createdBy: string;                 // uid
  startsOn: string;                  // ISO date "2026-07-24"
  endsOn: string;
  originIata: string;                // "SMF"
  returnIata: string;                // "SMF"
  status: 'planning' | 'active' | 'completed' | 'archived';
  description?: string;
  memberIds?: string[];              // denormalized for O(1) rule checks
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// trips/{tripId}/members/{userId}
type MemberDoc = {
  userId: string;
  email: string;
  displayName?: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Timestamp;
};

// trips/{tripId}/stops/{stopId}
type StopDoc = {
  orderIdx: number;                  // sortable, gaps allowed for reorder
  city: string;
  country: string;                   // ISO alpha-2
  region?: string;
  arriveOn: string;                  // ISO date
  departOn: string;
  status: 'draft' | 'tentative' | 'confirmed' | 'completed' | 'cancelled';
  color: string;                     // hex, matches map pin
  lat: number;
  lng: number;
  notes?: string;
  lastEditedBy: string;
  updatedAt: Timestamp;
};

// trips/{tripId}/activities/{activityId}
type ActivityDoc = {
  stopId: string;                    // denormalized ref
  title: string;
  kind: 'day_trip' | 'sightseeing' | 'meal' | 'transit' | 'entertainment' | 'rest' | 'idea' | 'other';
  startsAt?: Timestamp;
  endsAt?: Timestamp;
  status: 'idea' | 'tentative' | 'confirmed' | 'completed' | 'cancelled';
  location?: string;
  costCents?: number;
  costCurrency?: string;             // 'EUR', 'USD', 'CHF'
  notes?: string;
  lastEditedBy: string;
  updatedAt: Timestamp;
};

// trips/{tripId}/reservations/{reservationId}
type ReservationDoc = {
  stopId?: string;                   // null for trip-wide (e.g., flights)
  type: 'flight' | 'hotel' | 'rail' | 'car' | 'ticket' | 'restaurant' | 'activity' | 'other';
  name: string;
  startsAt?: Timestamp;
  endsAt?: Timestamp;
  confirmation?: string;
  provider?: string;
  costCents?: number;
  costCurrency?: string;
  status: 'to_book' | 'booked' | 'in_progress' | 'completed' | 'cancelled';
  documentUrl?: string;              // Firebase Storage URL
  documentMime?: string;
  notes?: string;
  lastEditedBy: string;
  updatedAt: Timestamp;
};

// trips/{tripId}/chatMessages/{messageId}
type ChatMessageDoc = {
  role: 'user' | 'assistant' | 'system';
  userId?: string;                   // for user messages
  content: string;
  toolCalls?: any[];                 // raw Claude tool_use blocks
  citations?: any[];                 // web search citations
  proposalIds?: string[];            // links to any proposals this message spawned
  createdAt: Timestamp;
};

// trips/{tripId}/proposals/{proposalId}
type ProposalDoc = {
  chatMessageId: string;
  proposalType: string;              // 'stop_add' | 'stop_update' | 'activity_add' | ...
  summary: string;                   // short display string
  rationale: string;                 // AI's reasoning
  beforeState: any;                  // snapshot of affected entities
  afterState: any;                   // proposed state
  operations: ProposalOperation[];   // array of atomic ops (see below)
  status: 'pending' | 'approved' | 'modified' | 'rejected' | 'superseded';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  createdAt: Timestamp;
};

type ProposalOperation =
  | { op: 'create'; entity: 'stops' | 'activities' | 'reservations'; data: any }
  | { op: 'update'; entity: 'stops' | 'activities' | 'reservations'; id: string; changes: any }
  | { op: 'delete'; entity: 'stops' | 'activities' | 'reservations'; id: string };

// trips/{tripId}/notes/{noteId}
type NoteDoc = {
  stopId?: string;
  title?: string;
  content: any;                      // Tiptap doc JSON
  createdBy: string;
  lastEditedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// invitations/{token}
type InvitationDoc = {
  tripId: string;
  email: string;
  role: 'editor' | 'viewer';
  invitedBy: string;
  acceptedBy?: string;
  acceptedAt?: Timestamp;
  expiresAt: Timestamp;
  createdAt: Timestamp;
};

// userTrips/{userId}/trips/{tripId}
type UserTripDoc = {
  tripId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Timestamp;
  tripName: string;                  // denormalized for list view
  startsOn: string;
};
```

### Composite indexes needed

Firestore requires explicit composite indexes for compound queries. Ship these in `firestore.indexes.json`:

- `activities` — `stopId` asc + `startsAt` asc (for stop's schedule)
- `activities` — `startsAt` asc + `status` asc (for Today view)
- `reservations` — `status` asc + `startsAt` asc (for "to book" sorted by date)
- `reservations` — `stopId` asc + `startsAt` asc (for stop details)
- `proposals` — `status` asc + `createdAt` desc (for pending proposals list)
- `chatMessages` — `createdAt` asc (single field, auto-indexed)
- `stops` — `orderIdx` asc (single field, auto-indexed)

### Security rules

Full rules in `scaffold/firestore.rules`. Key patterns:

**Membership check via denormalized `memberIds` array** on trip doc → O(1) rule evaluation, no doc-per-check cost.

```
match /trips/{tripId} {
  allow read: if isMember(tripId);
  allow update: if isEditor(tripId);
  allow delete: if isOwner(tripId);
  allow create: if request.auth != null
                && request.resource.data.createdBy == request.auth.uid;

  match /members/{userId} {
    allow read: if isMember(tripId);
    allow write: if isOwner(tripId);
  }

  match /{subcoll}/{docId} {
    allow read: if isMember(tripId);
    allow write: if isEditor(tripId);
  }
}

function tripData(tripId) {
  return get(/databases/$(database)/documents/trips/$(tripId)).data;
}
function isMember(tripId) {
  return request.auth != null && request.auth.uid in tripData(tripId).memberIds;
}
function isEditor(tripId) {
  return isMember(tripId) &&
    get(/databases/$(database)/documents/trips/$(tripId)/members/$(request.auth.uid)).data.role in ['owner','editor'];
}
function isOwner(tripId) {
  return isMember(tripId) &&
    get(/databases/$(database)/documents/trips/$(tripId)/members/$(request.auth.uid)).data.role == 'owner';
}
```

`isEditor`/`isOwner` still do one `get()` per rule evaluation, but only for writes (rare) and Firestore caches within a request. `isMember` is O(1) via the array — this is the common case (all reads).

---

## Feature specs

### 1. Auth & multi-user

- Firebase Auth email link (passwordless magic link)
- Optional Google sign-in
- User creates a trip via `/api/trips/create` — server route uses Admin SDK to write trip doc + member doc + userTrips mirror in a batched write
- Owner invites partner via email → server generates `invitations/{token}` doc → sends email with `/invite/[token]` link
- Invitee lands on invite page → signs in → server route creates `members/{uid}` doc + updates `memberIds` array + adds `userTrips/{uid}/trips/{tripId}` mirror
- Presence: lightweight `trips/{tripId}/presence/{userId}` doc with a heartbeat (client updates every 30s)

### 2. Today / Dashboard (`/`)

Three variants selected by trip status + current date:

**Pre-trip:**
- Departure countdown
- Trip-status strip (confirmed vs draft stops, reservations booked)
- Pending proposals count (deep-link to chat)
- Weather outlook (call `/api/weather` for trip window)
- Next reservation to book (soonest `to_book`)
- "Needs attention" derived list

**During trip** (when `today >= startsOn AND today <= endsOn`):
- Current stop (which stop's date range includes today)
- Next event (soonest activity/reservation with `startsAt > now()`)
- Weather now + tomorrow for current stop's `lat/lng`
- Today's schedule
- Quick action: "Reshuffle today" → opens chat with prompt

**Post-trip:**
- Summary + "plan another" CTA

**Implementation:** all three states in one page component, switched by a `getTripStatus(trip, today)` helper. Use `onSnapshot` for live data.

### 3. Itinerary (`/itinerary`)

- Client-rendered list of stops with `onSnapshot` subscription on `trips/{tripId}/stops` ordered by `orderIdx`
- Each stop is a `<StopCard>` — click-to-edit fields
- Optimistic updates via Firestore's local cache
- Drag-to-reorder (`@dnd-kit`, updates `orderIdx` in a batched write)
- Inline "+" between stops to add
- Delete = soft delete (set status to `cancelled`, hide by default)

### 4. Reservations (`/reservations`)

- Grouped by stop, using `where('stopId', '==', ...)` queries
- Add/edit via slide-in panel
- File upload → Firebase Storage bucket `reservations/{tripId}/{reservationId}/...` (protected by Storage rules)
- "Paste a confirmation email" flow:
  1. User pastes text
  2. Client sends to `/api/reservations/parse-email`
  3. Server calls Claude with a "parse this into structured reservation JSON" prompt
  4. Client renders response as pre-filled form for user to confirm

### 5. Map (`/map`)

- MapLibre GL JS with MapTiler streets style
- Pins with numbered SVG icons matching stop colors
- Bottom sheet slides up on pin tap (Vaul)
- During-trip: current-location marker (browser geolocation, permission-gated)

### 6. Chat (`/chat`) — the centerpiece

**Server route:** `/api/chat/route.ts` — streams Claude responses via Server-Sent Events.

**System prompt:** built dynamically per request. Includes:
- Current trip summary (stops, dates, status)
- Today's date + current stop (if during trip)
- Active reservations
- Recent chat context (last 20 messages, fetched from Firestore)
- Tool definitions

**Tools the AI can call:** defined in `src/lib/ai-tools.ts` — `propose_stop_change`, `propose_activity`, `propose_reservation`, `web_search`.

**When AI calls a `propose_*` tool:**
1. Server creates a `trips/{tripId}/proposals/{id}` doc with `status: 'pending'`, `operations` populated
2. Server writes the corresponding assistant chat message with `proposalIds` array
3. Client renders the message with an embedded `<ProposalCard>` via `onSnapshot`
4. User taps Approve → client calls `/api/proposals/[id]/approve`
5. Server runs a **Firestore transaction** that applies all `operations` atomically + marks proposal `approved`
6. `onSnapshot` pushes the state change to both users

**Firestore transaction for proposal approval:**

```typescript
await adminDb.runTransaction(async (tx) => {
  const proposalRef = adminDb.doc(`trips/${tripId}/proposals/${proposalId}`);
  const proposalSnap = await tx.get(proposalRef);
  const proposal = proposalSnap.data() as ProposalDoc;

  if (proposal.status !== 'pending') {
    throw new Error('Proposal is no longer pending');
  }

  for (const op of proposal.operations) {
    const collRef = adminDb.collection(`trips/${tripId}/${op.entity}`);
    if (op.op === 'create') {
      tx.set(collRef.doc(), {
        ...op.data,
        lastEditedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (op.op === 'update') {
      tx.update(collRef.doc(op.id), {
        ...op.changes,
        lastEditedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (op.op === 'delete') {
      tx.update(collRef.doc(op.id), {
        status: 'cancelled',
        lastEditedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  tx.update(proposalRef, {
    status: 'approved',
    reviewedBy: uid,
    reviewedAt: FieldValue.serverTimestamp(),
  });
});
```

**Firestore transactions are capped at 500 doc operations.** A single proposal shouldn't touch more than a dozen; if it ever does, chunk it or use batched writes.

**Streaming:** raw SSE from `@anthropic-ai/sdk`. Show tokens as they arrive. Persist the final assembled message to Firestore only after the stream completes.

### 7. Notes (`/notes`)

- Tiptap editor
- Autosaves via debounced Firestore updates (500ms)
- List view + detail view
- Optional stop association

### 8. PWA

- `public/manifest.json` — full config with icons
- Service worker — cache app shell, offline-first for read paths, network-first for writes
- Firestore local persistence gives offline reads for free — enable via `enableIndexedDbPersistence()` on client init
- Install prompt handler for Android; instructions modal for iOS

---

## API routes

```
POST   /api/chat                        Stream a Claude response (SSE)
GET    /api/weather?lat=&lng=           Current + 5-day forecast (Open-Meteo)
POST   /api/proposals/[id]/approve      Apply pending proposal in a transaction
POST   /api/proposals/[id]/reject       Mark as rejected
POST   /api/reservations/parse-email    AI-extract fields from pasted email
GET    /api/trip/[slug]/export.pdf      Regenerate the printable PDF
POST   /api/trips/create                Create trip + owner member + userTrips mirror
POST   /api/invite/create               Generate invitation + send email
POST   /api/invite/[token]/accept       Accept invitation → add member + mirror
```

**All routes use Firebase Admin SDK on the server** (service account credentials from env). They:
1. Verify the caller's ID token via `getAuth(app).verifyIdToken(token)` from the auth cookie
2. Check membership/role for the trip
3. Perform admin-privileged writes

**Client-side reads and simple writes** use the Firebase Client SDK directly (governed by security rules). Only cross-document mutations and invitation flows need to go through the server.

---

## File structure

```
trip-companion/
├── README.md
├── docs/
│   ├── DESIGN_BRIEF.md
│   └── PROJECT_BRIEF.md               # this file
├── seed/
│   ├── trip-seed.json                 # Germany trip data
│   └── seed.ts                        # Admin SDK script that writes to Firestore
├── firebase/
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── storage.rules
├── public/
│   ├── manifest.json
│   ├── icons/                         # PWA icons (Design deliverable)
│   └── sw.js                          # service worker
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Today / dashboard
│   │   ├── itinerary/page.tsx
│   │   ├── reservations/page.tsx
│   │   ├── map/page.tsx
│   │   ├── chat/page.tsx
│   │   ├── notes/[[...slug]]/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── login/page.tsx
│   │   ├── invite/[token]/page.tsx
│   │   └── api/
│   │       ├── chat/route.ts
│   │       ├── weather/route.ts
│   │       ├── proposals/[id]/approve/route.ts
│   │       ├── proposals/[id]/reject/route.ts
│   │       ├── reservations/parse-email/route.ts
│   │       ├── trip/[slug]/export/route.ts
│   │       ├── trips/create/route.ts
│   │       └── invite/create/route.ts
│   ├── components/
│   │   ├── nav/{bottom-nav,sidebar}.tsx
│   │   ├── today/{next-up,countdown,status-strip,needs-attention}.tsx
│   │   ├── itinerary/{stop-card,editable-field,add-stop-button}.tsx
│   │   ├── reservations/{reservation-item,reservation-form,paste-email}.tsx
│   │   ├── map/{route-map,stop-pin,bottom-sheet}.tsx
│   │   ├── chat/{message,input,proposal-card,search-result-card}.tsx
│   │   ├── ui/{button,sheet,dialog,toast,status-pill,editable-text}.tsx
│   │   └── presence/{online-indicator,cursor}.tsx
│   ├── lib/
│   │   ├── firebase/{client.ts,admin.ts,auth.ts}
│   │   ├── ai/{system-prompt.ts,tools.ts,streaming.ts}
│   │   ├── trip-logic/{get-status.ts,get-current-stop.ts,get-next-event.ts}
│   │   ├── format/{date.ts,currency.ts,duration.ts}
│   │   └── constants.ts
│   ├── types/
│   │   └── domain.ts                  # TypeScript types for Firestore docs
│   └── middleware.ts                  # Auth check on protected routes
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── .env.example
├── .firebaserc                        # if using Firebase CLI locally
└── .gitignore
```

---

## Environment variables

```
# ─── Firebase (Client SDK — public) ─────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ─── Firebase Admin SDK (server-only) ───────────────────
# Get from Firebase Console → Project Settings → Service Accounts → Generate new private key
# Store the whole JSON as a single-line string (escape newlines in private_key)
FIREBASE_ADMIN_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# ─── Anthropic ──────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-your-key

# ─── MapTiler (free tier) ───────────────────────────────
NEXT_PUBLIC_MAPTILER_KEY=your-maptiler-key

# ─── App URL (for magic link callbacks) ─────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Development order (recommended)

Build in this sequence — each phase is deployable:

**Phase 1 — Foundation**
1. Scaffold Next.js + Tailwind + design tokens
2. Create Firebase project, enable Firestore + Auth (email link) + Storage
3. Deploy `firestore.rules`, `firestore.indexes.json`, `storage.rules`
4. Wire up Firebase Client SDK + Admin SDK
5. Auth flow (magic link login → callback → session cookie)
6. Seed the trip from `trip-seed.json` via Admin SDK script (`npm run db:seed`)
7. Basic layout + nav

**Phase 2 — Read-only itinerary**
8. Itinerary page — display stops, activities, reservations via `onSnapshot`
9. Map page
10. Today dashboard (during-trip variant works with today's date)
11. PWA manifest + basic service worker
12. Enable Firestore offline persistence

**Phase 3 — Editable itinerary**
13. Inline editing of stops (client-side Firestore writes)
14. Reservations CRUD + Storage uploads
15. Notes
16. Multi-user invite flow (server routes with Admin SDK)
17. Presence indicators

**Phase 4 — The AI**
18. Chat page with streaming Claude responses
19. Web search tool
20. Proposal card component
21. Proposal approval flow (Firestore transaction)
22. "Paste confirmation email" AI shortcut

**Phase 5 — Polish**
23. Real-time sync everywhere via `onSnapshot`
24. Offline mode via service worker + Firestore cache
25. PDF export (reuse the printed itinerary generator)
26. Trip completion → post-trip state
27. Icons + install prompts

**Ship after each phase.** Don't try to build the whole thing before deploying.

---

## Non-obvious decisions worth flagging

- **Proposals store operations as JSON arrays.** The AI outputs `[{op: 'update', entity: 'stops', id: '...', changes: {...}}, ...]` so approval = replaying operations in a Firestore transaction. This is what makes it safe.
- **Soft delete via status.** Never hard-delete records the AI may reference. Set `status: 'cancelled'` and hide from UI.
- **Every AI message that changes state has a linked proposal.** No exceptions.
- **`memberIds` array on trip doc.** Denormalized for O(1) rule checks. Kept in sync via server routes on member add/remove.
- **`userTrips` is denormalized.** Kept in sync on join/leave. Worth the write amplification for O(1) "my trips" queries (future-proofing).
- **Firestore transactions cap at 500 doc operations.** Chunk if ever exceeded.
- **Server timestamps for `createdAt`/`updatedAt`.** Use `FieldValue.serverTimestamp()`, never `new Date()` client-side.
- **`FIREBASE_ADMIN_CREDENTIALS` is a JSON blob.** Vercel env UI accepts this; use `JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS!)` on the server.
- **Seed script is idempotent.** Uses fixed UUIDs from the seed JSON so reseeding is safe — later runs upsert instead of duplicating.

---

## What NOT to build

- No admin panel
- No trip-switcher UI (data model supports it via `userTrips`; UI doesn't need it now)
- No payment / billing
- No native mobile apps — PWA only
- No SMS or push notifications v1
- No trip templates / marketplace
- No social features
- No AI voice interface

---

## Definition of done for v1

- Both users can sign in with magic link and see the same trip in real time
- Every stop, activity, and reservation is editable in-place
- The chatbot works with streaming responses
- The proposal card + approval flow is fully functional (server transaction verified)
- The PWA installs on iOS and Android from the deployed URL
- The Today dashboard shows the right variant based on trip status
- The Germany trip data is seeded and looks like the printed PDF equivalent
- Deployed on Vercel with GitHub CI
- Firestore security rules enforce membership on all trip data

---

## References in this repo

- `docs/DESIGN_BRIEF.md` — visual language and screen mockups (for Claude Design)
- `seed/trip-seed.json` — starter trip data
- `firebase/firestore.rules` — full security rules
- `firebase/firestore.indexes.json` — composite indexes
- `firebase/storage.rules` — Storage rules for reservation docs
- `README.md` — quick-start setup

Ready to build. Start with Phase 1, get it deployed, then iterate.
