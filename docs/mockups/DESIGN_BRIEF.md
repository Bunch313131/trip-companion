# Design Brief — Trip Companion App

> A living, collaborative trip-planning tool that becomes a companion during the trip. Built for **a family of four — two adults and twin 6-year-olds** — planning a 15-day Europe trip. Both adults co-edit; an AI proposes changes they approve. Deployed as a PWA for iOS/Android home-screen install.

---

## The essential design premise

This is **not** a trip guidebook that got made into an app.

It's a **collaborative surface for two parents planning and living a family road trip together**, with an AI that suggests changes both can weigh in on. Everything else follows from that.

Concretely:

- **Editability everywhere.** Click any date, city, activity, or note to change it.
- **State is visible.** Draft, tentative, confirmed, in-progress, completed — the design communicates these constantly.
- **Two adults, one canvas.** You always know who last touched a thing, and can see when your partner is editing.
- **The AI proposes; humans approve.** Every AI-driven change lands as a reviewable card. Never a silent mutation.
- **It shifts modes over the trip.** Pre-trip: planning surface. During trip: companion. Post-trip: memory.
- **Kid-aware without being childish.** The app is for the adults. But because there are 6-year-olds along, pacing, energy, and family logistics are first-class concerns.

---

## Who's using this

**Two adults**, ages 30–40, running the family trip. Comfortable with tech (they're building this app themselves). One does more of the planning; both edit during the trip.

**Twin 6-year-olds** are on the trip but not users of the app. They shape *everything* the app suggests — pacing, activities, meal choices, mid-day resets, weather flexibility. The interface itself is adult. The Rick Steves influence is real: **big meaningful experiences without over-scheduling.**

---

## Aesthetic direction

The target is a **clean modern app with real personality.** Think somewhere between Linear's clarity, Notion's editorial confidence, and Airbnb's warmth — but with a distinctive voice of its own, not derivative of any of them.

**Not this:**
- Not a paper document. Not a guidebook trying to be an app. Not italic-serif flourishes as UI chrome. Not roman numerals in navigation.
- Not corporate SaaS blandness. Not endless whitespace with grey buttons.
- Not childish. No cartoon suitcases, no confetti.

**Yes this:**
- Confident color used sparingly. One primary that means something, one accent that surprises.
- Type-forward. Real typographic hierarchy. Sans-first, with restraint.
- Generous whitespace where the eye needs to rest; dense where the content earns it.
- Small moments of personality — a great empty state, a warm microcopy line, a nice hover, a tasteful animation. The kind of details that make you smile when you notice them but never get in the way.
- Cards with real shape — subtle shadows are fine, borders too. Not everything needs to be a flat outline.
- Modern PWA feel. Feels like an app you'd actually keep on your home screen.

### The vibe check

Someone opens the app on their phone. Within two seconds, they should think: "this is well-made" — not "this looks like a template."

---

## Color exploration

**Palette is intentionally unlocked.** Please explore several directions in the first round of mockups and let us pick.

Explore at least three directions on the Today (pre-trip) screen:

1. **A confident blue direction** — deep primary blue, warm neutral background, one bright accent. Feels traveled, trustworthy, calm.
2. **A warm coral / terracotta direction** — a real coral or terracotta primary, cream neutral, forest or ink secondary. Feels warm, family-friendly, distinctive.
3. **A green direction** — sage or forest primary, off-white neutral, one warm accent (amber?). Feels outdoors, calm, alpine.
4. **A dealer's choice** — if you have a fourth direction you think would surprise us pleasantly, propose it.

For each color direction, define:
- One primary (10% of surface — buttons, accents, active states)
- One or two neutrals (backgrounds, text — 80% of surface)
- One meaningful accent (used for status: success, attention, or a moment of surprise)
- Status colors (confirmed / tentative / draft / warning) that harmonize

**Constraints on whichever direction we pick:**
- Must have a light mode and a dark mode. Both need to feel considered — dark mode is not "invert everything."
- The primary color should feel travel-adjacent — no cold silicon-valley greys, no aggressive corporate reds.
- Contrast passes WCAG AA at minimum.

Per-stop accent colors (used for map pins, timeline dots, and small stop-color tags) will need to be defined against the final palette. Keep them distinguishable and harmonious — like a set of good travel stamps, not a rainbow.

---

## Typography

**Sans-first, with real hierarchy.**

Recommendation:
- **Display / headers:** something with warmth and personality. Consider Söhne, General Sans, GT America, Manrope, or (if going more expressive) Instrument Serif for hero moments only.
- **Body / UI:** Inter is the safe answer. If you want more character, Söhne or Suisse Int'l are strong. Pick one and use it everywhere.
- **Mono:** JetBrains Mono or Berkeley Mono for numbers — times, temperatures, distances, confirmation numbers.

Serif is optional and reserved for **occasional moments** — a hero title, a section quote. Not for UI chrome. Not italic Garamond as page decoration.

Type sizing should feel modern-app, not modern-print: relatively large body (16px+), tight leading, real weight variation (regular / medium / semibold — probably skip bold).

---

## Motion, materiality, dark mode

- **Shadows** are OK, used purposefully — small elevation on floating elements (chat input, sheets, toasts), not on everything.
- **Motion is quiet but present.** 200–300ms ease-out max. Meaningful, not decorative. Card entrances, sheet slides, chat token streaming, gentle status transitions.
- **Micro-interactions matter.** The button press, the copy-to-clipboard confirmation, the "saved" toast. Get these right and the whole app feels considered.
- **Dark mode** is a real design, not an afterthought.
  - Light default. Dark toggle in settings; also respects system preference.
  - Backgrounds shift, but color relationships stay intentional. The primary color should still feel like the primary color.
  - Consider whether dark mode is "true dark" (near-black) or "elevated dark" (rich grey with warmth). Whichever you pick, commit.

---

## Illustration & visual character

**Some — tasteful, minimal.** Not "illustrate everything" but not "sterile either."

Where illustration adds real value:
- **Empty states** — a small spot illustration in a warm empty state ("No reservations yet — let's add your first one") is worth 100 words.
- **Onboarding moments** — first-run, install-PWA prompt, invite-partner flow.
- **Post-trip screen** — a small "you did it" illustration at the end.
- **Occasional flourishes** — a decorative element on the Today hero when appropriate.

Where illustration does NOT add value:
- Every card doesn't need a mascot
- Weather doesn't need custom cloud drawings (system icons or a nice icon set works)
- Stops don't need cartoon landmarks

**Style suggestion:** if illustrations are used, keep them line-based, monochrome-plus-one-accent, warm but not cutesy. Think Notion or Stripe illustrations, not Duolingo.

Iconography should be a single consistent set — Phosphor, Iconoir, or Lucide are strong choices. One family, one weight.

---

## The screens

**Six primary screens.** Bottom nav on mobile; left sidebar on desktop.

1. **Today / What's Next** — the dashboard
2. **Itinerary** — the full trip, editable
3. **Reservations** — flights, hotels, tickets, tables
4. **Map** — geographic view of the route + stops
5. **Chat** — AI travel companion
6. **Notes** — freeform trip journal

Plus **settings** (invite partner, PWA install, theme toggle, API keys).

---

### 1. Today / What's Next

**The most important screen.** Opens by default. Different content pre-trip vs. during vs. post-trip.

**Pre-trip:**
- Hero: countdown to departure (quiet, confident)
- Trip-status strip: X confirmed / Y draft stops · Z reservations booked · N open items
- **Open items surface** — top 3–5 highest priority, tappable. Critical for the pre-trip experience.
- Any pending AI proposals awaiting review
- Weather outlook for the trip window
- Next reservation to book

**During trip:**
- Big card: **where you are right now** (current stop, day X of Y)
- **Next thing on the timeline** — always visible, with countdown ("Check-in Hotel Sonne · in 3 hrs")
- Weather right here + tomorrow
- Today's reservations
- Kid-relevant callouts — meal times, next reset moment
- "Running ahead / behind?" — quick action that opens chat with a reshuffle prompt

**Post-trip:**
- Photo/journal collage
- Trip stats

**Design notes:**
- **Single narrative column** that reads like a page — not a dashboard grid.
- The "next up" card is the single most-viewed element in the app. Give it real weight.
- Countdowns are quiet numbers, not big flashing timers.

---

### 2. Itinerary

The full trip as a **living document.** Where most editing happens.

**Layout:** vertical timeline. Each stop is a card. Cards are editable in-place.

**Per stop:**
- City + country + flag
- Arrival → departure dates
- Nights (auto-computed, editable)
- Status pill (single status system — see below)
- **Open-item badge** — small count near top if any RESOLVE / VERIFY / DECIDE items are attached. Tap to expand.
- Lodging line (hotel name + address, small)
- Parking line (primary + backup)
- Activities list (each with its own status)
- "Ideas" section — softer styling for stuff being weighed
- Weather range (mini strip)
- "Last edited by X, 2 hrs ago" metadata line

**Editing:**
- Click any field to edit inline. No modal-heavy design.
- "+" between stops on hover (mobile: floating "+" button)
- Drag handle to reorder
- Delete = single click with undo toast

**Legibility test:** someone glancing at the screen should see "5 confirmed, 1 draft, 3 open items" without reading a word.

---

### 3. Reservations

Every booking in one searchable list. Attached to stops or trip-wide.

**Real content:** the trip has 5 Delta flight legs, 6 hotels, Hertz rental car, Linderhof / Eagle's Nest / Salt Mine tickets, Batorama tour, two Munich dinner reservations. Design against this real data.

**Layout:** grouped by stop (or "Trip-wide" for flights). Chronological within each group.

**Per reservation:**
- Type icon (small, monochrome, consistent set)
- Name / title
- Date + time (mono)
- Confirmation number (mono, copy-on-click)
- Cost + currency (mono)
- Status pill
- Attached document (PDF/image preview if uploaded)
- Notes

**Add reservation flow:**
- Button opens a slide-in panel — not a modal
- Fields: type (segmented control), name, date, time, confirmation, cost, notes, attach doc, associate with stop
- **AI shortcut:** "Paste a confirmation email" → text area → AI extracts fields → user confirms. **Huge feature.**

**Flight legs:** design a way to visually group connecting legs without hiding them. "Outbound: SMF → MSP → AMS → DUS" expandable.

**"To book" tab:** actionable list of things still open. Slightly urgent styling with quick "mark booked" action.

---

### 4. Map

**Layout:** full-screen map with route drawn, pins per stop, collapsible bottom sheet.

- Real map tiles (MapLibre + MapTiler) — this is spatial reasoning, not a stylized diagram
- Numbered pins (1–6) in stop colors
- Route lines: solid confirmed, dashed day-trips, dotted tentative
- Tap pin → bottom sheet with stop details, weather, reservations
- Day-trip destinations (Heidelberg, Strasbourg, Haut-Koenigsbourg, Skywalk, Linderhof, Oberammergau) as smaller secondary pins
- **During trip:** current location marker (system blue dot)

---

### 5. Chat — the AI companion

**The showpiece.** Where the AI earns its keep.

**Layout:** conversation view, message input pinned to bottom with quick suggestion chips.

**Message types:**

1. **User text** — right-aligned bubble
2. **AI text** — left-aligned, no bubble (feels more like a letter), markdown-formatted
3. **AI proposal card** — the KEY interaction (see below)
4. **AI search-result card** — small link previews with photo + source
5. **System / action confirmations** — small check-mark log lines ("Colmar extended to 4 nights ✓")

**Suggestion chips** above input: context-aware.
- Pre-trip: "What are we missing?" · "Suggest kid activities for Munich" · "Check the weather"
- During trip: "We're running late — reshuffle today" · "Kid-friendly dinner nearby" · "Add tomorrow's tickets"

**Chat history persists per trip.** Long convos get date-section headers.

**Streaming tokens** should feel alive but calm — no jitter, no overshoot.

---

### The Proposal Card ⭐

**The hero pattern.** The design that makes the AI genuinely useful without ever being autonomous.

Every AI-driven change to the itinerary flows through this card. If Design finds itself simplifying it away, redirect back to this section — it's the interaction that makes this app meaningfully different from every other trip planner.

**Anatomy:**
- Small header: **"Suggested change"** with a small pulsing dot in the primary color
- Summary line, prominent — the "what" ("Extend Colmar to 4 nights, cut Lucerne to 1 night")
- **Diff view** — two-column before/after with only changed fields highlighted. Additions and removals visually distinct.
- Rationale in slightly smaller type — the "why" ("You'd have more time for the Alsace wine route, and Lucerne is easier to see in a full day if you skip Mt. Pilatus.")
- Actions: **Approve** (primary button), **Modify** (opens the change as an editable form), **Reject** (subtle), **Discuss** (returns to chat)

**States:**
- **Pending** — full card, active buttons
- **Approved** — success border, "Applied [date] by [user]" footer, actions collapsed
- **Modified** — muted border, "Modified before applying" footer
- **Rejected** — muted, collapsed, "Rejected" footer, expandable
- **Superseded** — very muted, "Replaced by later suggestion"

**Design the card so it's clearly a distinct object in the chat stream.** Different padding, its own frame, mono for the details. It should feel like a *document* the AI is handing you, not a message.

---

### 6. Notes

**Purpose:** freeform journal, brainstorm space, catch-all. Both adults can edit.

- Rich-text editor (Tiptap-style), markdown-friendly
- Optional pin-to-stop association
- "Convert to activity" / "Convert to reservation" quick actions
- Autosaves, shows who edited last
- No AI in this view — human writing space

---

## Cross-cutting patterns

### Open Items system

The seed data has 31 open items. RESOLVE / VERIFY / DECIDE / CONFIRM issues that need working through. **First-class design treatment required.**

Shown:
1. **Dashboard** — top 3–5 priority, tappable
2. **Stop cards** — badge with count for that stop
3. **Dedicated "Open Items" view** — filterable, sortable by priority
4. **As checklist items** — tap to mark resolved with an optional note

Priority: `high` (primary color left border), `medium` (default), `low` (muted).
Kind icons: `resolve` (?), `verify` (⚡), `decide` (fork), `confirm` (check). Choose consistently.

### Two-user awareness

- Avatar next to recently-edited fields (last editor)
- Live cursors on itinerary when both users have it open (Notion-style)
- Small "your partner is here" indicator when they're active
- Conflict resolution: last-write-wins for text; proposals require explicit approval

### Status system (used everywhere)

Every entity has a status. One visual language across all screens:

- **Draft** — muted, dashed
- **Tentative** — solid outline, "?" affordance
- **Confirmed** — success color, check
- **In progress** — primary color, subtle pulse
- **Completed** — muted, check, sometimes strike-through
- **Cancelled** — muted, strike-through, ×

Do NOT invent per-screen status treatments.

### Empty states

Every list needs a real empty state. This is a mostly-empty app at first.
- Explain what belongs here
- Suggest one action
- **Small spot illustration where appropriate** — this is one of the best places for personality
- Never feel like an error

### Loading & offline

- **PWA offline mode:** small "offline" indicator in nav, disable network-required actions (chat), everything else works from cached data
- Loading: shimmer, not spinners (except for chat streaming)
- Sync completes: brief success pulse on affected cards

### Mobile-first, but design desktop too

- **Mobile:** bottom nav, single column, fullscreen sheets for editing, tap targets ≥ 44px
- **Desktop:** left sidebar nav, two-column where useful (itinerary + chat side-by-side is a killer feature), keyboard shortcuts

---

## Screens to mock, in priority order

**Round 1 — palette exploration (do these in 2-3 color directions each):**
1. **Today / What's Next** — pre-trip state
2. **Chat with a proposal card** visible mid-conversation

**Round 2 — after palette lands, mock these in the chosen direction:**

3. Today / What's Next — during-trip state
4. Itinerary — inline editing state, mixed statuses
5. Reservations — with flight-leg group + "paste confirmation email" AI shortcut open
6. Map — bottom sheet expanded on a stop
7. Open Items — filterable list
8. Notes — entry pinned to a stop
9. Settings — invite partner + theme toggle
10. Empty states — reservations empty, notes empty, chat empty
11. Dark mode — Today + Chat as parity checks
12. PWA install prompts — iOS Safari + Android Chrome

---

## Reference material

- **`trip-seed.json`** — the real trip data. **Design against this content, not lorem ipsum.** Real stop names, real dates, real reservation counts, real open items make for better mockups.

**Note:** I've been generating printed PDFs of this trip in a different visual language (warm editorial guidebook style). Those PDFs are the wrong reference for this app — please **do not** use them as visual inspiration. This app is a different medium and calls for a different visual language.

---

## What NOT to design

- No landing page (personal app, no marketing surface)
- No trips-list screen (only one trip exists)
- No admin dashboards
- No onboarding tutorial screens — good empty states + inline tips handle it
- No child-facing screens or "kid mode" — kids aren't users; they're a factor

---

## Non-negotiables

- Every AI-driven change to the itinerary MUST route through a proposal card
- The status system MUST be consistent across all screens
- The design MUST accommodate pre-trip (mostly-empty) and during-trip (mostly-full) states
- Open items MUST be surfaced prominently
- Both light and dark mode MUST feel intentional
- The app MUST feel modern, warm, and considered — not print, not corporate

---

Ready to make it feel great.
