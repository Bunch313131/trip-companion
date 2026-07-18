# Claude Code — Opening Prompts

Copy-paste these prompts into Claude Code in order. The first one is the main kickoff; the others are for common checkpoints.

---

## 🚀 Prompt 1 — The main kickoff (paste this first)

```
This repo is a handoff kit for a family Europe trip companion app. My goal is
to have a working, deployed PWA by the end of your session.

Please start by reading these files in order:
1. docs/PROJECT_BRIEF.md — full technical spec (stack, data model, features)
2. docs/DESIGN_BRIEF.md — visual language and screen intent
3. seed/trip-seed.json — the real trip data that will seed the app

I've also attached mockups from Claude Design to this conversation. Use them
as the visual truth — extract colors, typography, spacing, and component
patterns from them. The tokens in scaffold/tailwind.config.ts and
scaffold/src/app/globals.css are placeholders (marked TBD) that you should
replace with values from the mockups.

Your job:
1. Set up the Next.js project from the scaffold/ directory into the repo root.
2. Create the Firebase project setup — I have a Firebase account, walk me
   through creating the project, enabling services, and deploying rules.
3. Fill in the design tokens from my mockups.
4. Build the app end-to-end following the 5 phases in PROJECT_BRIEF.md.
5. Deploy to Vercel when the app is functional.
6. Keep it living — commit and push after each phase so I can see progress.

Ground rules:
- Ship after Phase 1 (foundation) so I can verify auth + Firebase before you
  keep going. Same after each subsequent phase.
- Ask questions ANY time something is ambiguous. Don't guess at design decisions.
- Every AI-driven change to the itinerary MUST flow through a Proposal Card —
  this is non-negotiable per the brief.
- Use my mockups as the visual source of truth. When in doubt, match them.

Start by reading the briefs and confirming your understanding of the scope
before writing code. Ask me anything you need before Phase 1.
```

---

## Prompt 2 — After Phase 1 (Foundation) is deployed

Verify:
- I can sign in with a magic link
- I can see the seeded trip data
- Firebase security rules are working (try to access another trip — should fail)

Then:

```
Phase 1 looks good. Proceed to Phase 2 (read-only itinerary display).

Focus especially on:
- The Today dashboard should already show the right pre-trip vs during-trip
  variant based on today's date and the trip's start/end dates.
- Match the mockups exactly for the dashboard, itinerary, and map screens.
- Enable Firestore offline persistence so the app works without wifi.
- Get the PWA installable (manifest + icons + basic service worker).

Ship after Phase 2 as well. I want to test PWA install on my phone before you
add editing.
```

---

## Prompt 3 — After Phase 2 (Read-only) is deployed

Verify:
- Every stop, activity, and reservation displays correctly
- Map shows the route with pins
- Dashboard shows what's next
- PWA installs on iOS/Android

Then:

```
Phase 2 looks good. Proceed to Phase 3 (editable itinerary + multi-user).

Priorities:
- Inline editing on stops (click to edit dates, city, notes, etc.)
- Reservations CRUD with the file upload for confirmation documents
- Notes editor (Tiptap)
- Multi-user invite flow — I need to be able to invite my wife via email
- Presence indicators when we're both online

Ship after Phase 3. I want to hand my wife the invite link and see her edits
appear in real time before we build the AI.
```

---

## Prompt 4 — After Phase 3 is deployed

Verify:
- Editing works and syncs in real time
- Invite flow works end-to-end
- Both users can see each other's presence

Then:

```
Phase 3 looks good. Now the big one — Phase 4 (the AI companion).

Build the chat with streaming Claude responses, the web search tool, and the
Proposal Card component. The Proposal Card is the hero pattern; make sure it
matches the mockup exactly and that the approval flow uses a real Firestore
transaction.

Also build the "paste a confirmation email" AI shortcut on the reservations
screen — that's a huge quality-of-life feature.

Ship after Phase 4. I want to test the chatbot end-to-end before polish.
```

---

## Prompt 5 — After Phase 4 is deployed

Verify:
- Chat streams responses smoothly
- Proposal cards render with all state variants (pending / approved / rejected)
- Approving a proposal actually mutates the itinerary
- Paste-a-confirmation-email works and pre-fills the reservation form

Then:

```
Phase 4 looks good. Final polish — Phase 5.

Priorities:
- Full realtime sync on every screen via onSnapshot
- Offline mode via service worker + Firestore cache
- PDF export (the trip companion should be able to regenerate a printable
  trip summary from live data)
- Trip completion → post-trip state on the dashboard
- Final PWA icons + install prompts polished
- Any accessibility passes, keyboard shortcuts on desktop, etc.

Deploy the final version and give me a summary of what's working, what's
known-incomplete, and any recommended next steps.
```

---

## Bonus prompts for common scenarios

### If Claude Code gets stuck on Firebase setup

```
Walk me through the Firebase console step by step. Assume I have never used
Firebase before. Tell me exactly which buttons to click and what to copy.
When I paste back credentials, help me put them in the right .env variables.
```

### If mockups need clarification during build

```
This screen from the mockups shows [describe]. Interpret it in the current
implementation and, if any spacing / color / behavior isn't obvious, tell me
what you're assuming and ask if I want you to change it before committing.
```

### To pause and get a status report

```
Give me a status report:
- What phase are we in?
- What's committed to the repo?
- What's deployed to Vercel?
- What's not yet working?
- What decisions are you waiting on from me?
- What did you decide that I might want to revisit?
```

### To adjust something the app is generating

```
The [feature] feels [problem]. Here's what I want instead: [describe].
Update the code, commit, and push. Don't over-scope this — just fix this
one thing.
```

### When something breaks in production

```
Something's broken. Here's what I see: [description or screenshot].
Diagnose it, fix it, commit, push, and confirm it's resolved. If you need
me to check Vercel logs or Firebase logs, tell me exactly where to look.
```

---

## Two important reminders

**The Proposal Card is the product.** If Claude Code ever suggests simplifying it away or replacing it with "the AI just edits directly," push back. That interaction is what makes this app meaningfully different.

**The trip is real and starts Jul 24, 2026.** Every day of build progress makes the app more useful on the trip. Ship early, ship often, don't perfect Phase 5 before you've shipped Phase 1.

Good building.
