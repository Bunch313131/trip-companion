# Code Handoff — Trip Companion App

The design is done. Time to build.

## What's in this bundle

```
CLAUDE_CODE_PROMPTS.md       ← Suggested prompts (start here)

docs/
  PROJECT_BRIEF.md           ← Full technical spec (stack, data model, features)
  DESIGN_BRIEF.md            ← Visual language + screen intent

seed/
  trip-seed.json             ← The real trip data (v4, current as of Jul 18)
  seed.ts                    ← Firebase Admin SDK seed script

scaffold/
  package.json               ← All deps locked (Firebase + Anthropic + Next 15)
  tailwind.config.ts         ← ⚠ Placeholder tokens — Claude Code fills from mockups
  tsconfig.json
  next.config.mjs
  postcss.config.mjs
  .env.example               ← Every env var you need
  .gitignore
  firebase.json              ← Points Firebase CLI at rules/indexes
  firebase/
    firestore.rules          ← Security rules
    firestore.indexes.json   ← Composite indexes
    storage.rules
  public-manifest.json       ← PWA manifest (rename to public/manifest.json)
  src/
    app/
      layout.tsx             ← ⚠ Placeholder — fonts from mockups
      globals.css            ← ⚠ Placeholder tokens — Claude Code fills from mockups
    lib/
      firebase-client.ts     ← Firebase client SDK setup
      firebase-admin.ts      ← Firebase Admin SDK + auth verification
      ai-tools.ts            ← Claude tool definitions (the proposal pattern)
```

## Setup path (5 minutes)

1. **Create a new GitHub repo** — anything reasonable, e.g. `trip-companion`.
2. **Copy `scaffold/*` into the repo root.** Rename `public-manifest.json` → `public/manifest.json`.
3. **Copy `docs/` and `seed/` folders into the repo.**
4. **Add your Claude Design mockups** to `docs/mockups/` — screenshots, exports, whatever you have.
5. **Open the repo in Claude Code.**
6. **Paste the first prompt from `CLAUDE_CODE_PROMPTS.md`** — that kicks off the whole build.
7. **Ship after each phase** — the app should be deployable at each of the 5 checkpoints, not just at the end.

## Prerequisites

You already have:
- ✅ GitHub with Claude Code integration
- ✅ Firebase account
- ✅ Anthropic API key
- ✅ Design mockups

You'll need to sign up for (during Phase 1 or 2):
- MapTiler (free tier) — https://cloud.maptiler.com
- Vercel (free tier) — https://vercel.com — link your GitHub repo

## The 5 phases at a glance

**Phase 1 — Foundation**
Next.js + Firebase + auth + trip seeded + nav. Ship it.

**Phase 2 — Read-only itinerary**
Display everything via `onSnapshot`. PWA installable. Ship it.

**Phase 3 — Editable itinerary + multi-user**
Inline editing, reservations CRUD, notes, invite flow, presence. Ship it.

**Phase 4 — The AI**
Streaming chat, web search, Proposal Card, approval flow. Ship it.

**Phase 5 — Polish**
Full realtime, offline mode, PDF export, post-trip state. Ship it.

## What matters most

- **The Proposal Card is the product.** Don't let it get watered down.
- **Ship after each phase.** Don't build to Phase 5 before deploying.
- **Match the mockups exactly.** Extract palette, type, and spacing from them — not from any prior scaffold defaults.
- **The trip is real and starts Jul 24, 2026.** Every day of build progress makes the app more useful when you're actually in Duisburg.

## Common Claude Code interactions

Everything you need is in `CLAUDE_CODE_PROMPTS.md`. Prompt 1 kicks off the build; prompts 2-5 are checkpoint transitions; bonus prompts handle stuck-on-Firebase, mockup clarification, status reports, and common issues.

## Coming back to this Claude chat

Whenever the trip itself changes (new booking, canceled reservation, restaurant find, day-of change), come back here and I'll regenerate `trip-seed.json`. You can either:

- Drop the new JSON in the repo and reseed (safe — the seed script is idempotent), OR
- Use the running app to make the change directly (once Phase 3 ships)

Whichever is easier at the moment.

Good building.
