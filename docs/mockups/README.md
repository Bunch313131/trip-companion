# Handoff: Trip Companion — Family Trip Planning PWA

## Overview
Trip Companion is a collaborative trip-planning app that becomes a live companion during the trip, for **two adults co-planning a 15-day Europe family road trip** (twin 6-year-olds along, but not app users). An AI proposes itinerary changes that either adult reviews and approves. Deployed as an installable PWA (iOS/Android home screen).

This handoff covers the **"Confident Blue"** visual direction, chosen after a palette exploration round. It documents the full screen set: Today (pre-trip + during-trip), Itinerary, Reservations, Map, Chat (with the hero Proposal Card), Open Items, Notes, Settings, empty states, PWA install prompts, and light + dark mode.

## About the Design Files
The files in this bundle are **design references authored in HTML** (as streaming "Design Component" `.dc.html` files — a prototype format). They show the intended look, layout, and behavior. **They are not production code to copy directly.**

The task is to **recreate these designs in the target codebase's environment** using its established patterns and libraries. This app is specified as a **PWA**, so a React (or similar) SPA with a service worker for offline caching is the natural target — but use whatever the team's environment dictates. If no environment exists yet, a React + Vite PWA with a component library of your choice is a reasonable default.

To view the `.dc.html` files, open them in the design tool they were made in, or read the markup directly — each is plain inline-styled HTML and is legible as a spec. `support.js` is the prototype runtime and is **not** part of the app to build.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, and interaction states are all specified below and present in the files. Recreate the UI faithfully using the codebase's libraries. The one deliberate placeholder: the **Map** screen uses a styled backdrop, not live tiles — implement it with **MapLibre GL + MapTiler** raster/vector tiles (see Map section).

---

## Design Tokens

### Color — Light mode (default)
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F1EEE7` | App background (warm neutral) |
| `--surface` | `#FFFFFF` | Cards, sheets, nav |
| `--surface-2` | `#F4F1EA` | Subtle raised / inset fills |
| `--text` | `#17212C` | Primary text |
| `--text-dim` | `#56626F` | Secondary text |
| `--text-mute` | `#8A93A0` | Tertiary / metadata |
| `--border` | `#E6E1D8` | Hairline borders, dividers |
| `--primary` | `#1E4E80` | Primary blue — buttons, active nav, accents |
| `--primary-ink` | `#FFFFFF` | Text/icons on primary |
| `--primary-soft` | `#E7EFF6` | Primary tint (proposal header, chips) |
| `--accent` | `#E0A43B` | Amber accent — surprise / warm highlight |
| `--accent-soft` | `#FBF1DE` | Amber tint (kid-callout bg) |

### Status colors (used app-wide — do NOT invent per-screen variants)
| Status | Token | Hex (light) | Treatment |
|---|---|---|---|
| Confirmed | `--confirmed` | `#2E7D5B` | success green + check |
| Confirmed tint | `--confirmed-soft` | `#E3F1EA` | pill background |
| Tentative | `--tentative` | `#C08A2E` | solid outline + "?" |
| Draft | (uses `--text-mute`) | `#8A93A0` | muted, **dashed** border |
| In progress | `--primary` | `#1E4E80` | primary + subtle pulse |
| Completed | `--text-mute` | `#8A93A0` | muted, check, strike-through |
| Warning / attention | `--warning` | `#C25A3B` | attention |
| Warning tint | `--warning-soft` | `#F8E9E2` | pill background |

### Color — Dark mode (elevated warm-grey, NOT inverted black)
| Token | Hex |
|---|---|
| `--bg` | `#14181D` |
| `--surface` | `#1C222A` |
| `--surface-2` | `#232A33` |
| `--text` | `#E7EAEE` |
| `--text-dim` | `#9BA6B2` |
| `--text-mute` | `#6E7883` |
| `--border` | `#2C333C` |
| `--primary` | `#4E90D9` (lifted so it still reads as the primary) |
| `--primary-ink` | `#0C1116` |
| `--primary-soft` | `#1E2E3E` |
| `--accent` | `#E7B25A` |
| `--confirmed` | `#4FB488` · soft `#16271F` |
| `--tentative` | `#D9A94E` |
| `--warning` | `#E07E5C` · soft `#2E211C` |

Theme is light by default; dark is toggled in Settings and also follows `prefers-color-scheme`. Implement as CSS custom properties on a root wrapper; every screen consumes the tokens, so a class/attribute swap flips the whole app.

### Per-stop accent colors (map pins, timeline dots, stop tags)
Stop 1 Duisburg `#2F5C8A` · Stop 2 Colmar `#6B8E3F` · Stop 3 Lucerne `#C28A3A` · Stop 4 Füssen `#2D7559` · Stop 5 Königssee `#B85577` · Stop 6 Munich `#6E5BAB`.

### Typography
- **Display / headers:** Manrope (700–800). Used for hero numbers, screen titles, card summaries.
- **Body / UI:** Inter (400/500/600). Everything else. Body ≥ 13.5px on mobile; large numbers much bigger.
- **Mono:** JetBrains Mono (500/600). All numbers — times, dates, temperatures, distances, confirmation numbers, IATA codes.
- Weights used: regular / medium / semibold / bold-for-display. Tight leading. Negative letter-spacing (~-.01 to -.02em) on display sizes.

### Spacing / shape
- Screen gutter: 18–22px. Card padding: 12–18px. Inter-card gap: 9–16px.
- Radii: pills 20px; cards 14–18px; hero 20–24px; buttons 11–13px; phone screen 38px.
- Shadows: purposeful only — floating elements (sheets, toasts, chat input, next-up card). E.g. cards `0 10px 26px -16px rgba(20,25,35,.4)`; sheets `0 -18px 44px -20px rgba(15,20,28,.4)`. Not on every card.
- Icons: single line-icon family, ~1.8–2.0 stroke weight (Phosphor / Lucide / Iconoir — pick one). 44px minimum tap targets.

---

## Screens / Views

### Bottom nav (all main screens)
5 tabs, `--surface` bar, 1px top border, safe-area bottom padding (~22px). Icons + 9.5px labels. Active tab = `--primary`; inactive = `--text-mute`. Tabs: **Today** (home), **Trip** (itinerary), **Bookings** (reservations), **Map**, **Chat**. Open Items, Notes, and Settings are reached from within Today / headers / avatars (they are the "6 primary screens" of the brief; Notes+Open Items surface contextually — confirm final nav with product).

### 1. Today — pre-trip (`TodayScreen.dc.html`)
Default screen. **Single narrative column, not a dashboard grid.**
- **Hero countdown card** (`--primary` bg, `--primary-ink` text, decorative translucent circles): eyebrow "COUNTDOWN", giant Manrope number ("6"), "days to departure", route `SMF —— DUS` with mono codes, date/summary line.
- **Status strip:** 3 stat cards — stops confirmed (`6`, `--confirmed`), bookings secured (`18/21`), open items (`31`, `--warning`).
- **AI proposal banner:** `--surface` card with `--primary` border, pulsing dot, "1 suggestion awaiting review" + summary, chevron. Tapping opens Chat at that card.
- **Open items surface:** section "Needs your attention" + "See all 31". Top 4 items; high-priority get a 3px `--primary` left border. Each: kind-icon chip, title, meta line `KIND · scope · Priority`.
- **Weather outlook:** row of cities with temp (mono) + simple weather dot; caption about the cool/wet pattern.
- **Next to book:** card — eyebrow, "Pilatus Golden Round Trip", mono date/time, **Book** button (`--primary`).

### 2. Today — during-trip (`TodayDuringScreen.dc.html`)
- Header: "Friday · Jul 31", "Day 7 of 15", "On schedule" pill, partner avatars.
- **"You are here" hero** (`--primary`): pulsing live dot, "Lucerne 🇨🇭", "Stop 3 of 6 · Night 1 of 2", three inline stats (weather now / tomorrow / car "Parked ✓").
- **Next-up card** (elevated, `--primary` border): eyebrow "NEXT UP", mono countdown pill "in 2h 10m", title, mono detail, actions **Directions to Pier 2** (deep-links to native maps) + **Tickets**.
- **Kid-pacing callout** (`--accent` border, `--accent-soft` bg): reset-moment guidance.
- **Today's plan:** vertical timeline, dots colored by status (completed strike-through, in-progress ring, idea dashed).
- **Running ahead/behind:** card → **Reshuffle** opens Chat with a reshuffle prompt.

### 3. Itinerary (`ItineraryScreen.dc.html`)
Living document. Vertical timeline; each stop a card with a numbered stop-color node.
- **Normal stop card** (Colmar): city + flag, mono dates/nights/region, status pill (Confirmed = `--confirmed` + check), lodging line + parking line (line icons), activity tags (idea tags use dashed border), footer: open-item count pill + "last edited by [avatar] · 2h ago".
- **Editing state** (Lucerne): 2px `--primary` border + elevation; header "[avatar] Jordan is editing" + "autosaving…"; inline fields — Nights (stepper), Dates, **Status segmented control** (Confirmed/Tentative/Draft); **Done** / **Cancel**. This is the inline-edit pattern — no heavy modals.
- **Tentative stop** (Füssen): tentative outline pill, "name only" lodging, "Parking — needs resolving" in `--warning`, open-item pill.
- **"+" insert affordance** between stops (dashed circle) to add a stop/day-trip. Drag handle for reorder; delete = single click + undo toast.

### 4. Reservations (`ReservationsScreen.dc.html`)
Grouped by stop (+ "Trip-wide" for flights), chronological within group. Tabs: **All** / **To book (3)** / **By stop**.
- **Flight-leg group** (expandable): summary row "Outbound · SMF → DUS", "Jul 24 · 3 legs · Delta", Booked pill; expanded legs each show mono `SMF→MSP`, flight no., and per-field status (`time TBD` in `--warning`). Connecting legs grouped but never hidden.
- **Reservation row:** type icon (mono, consistent set), name, mono date/time, status pill. "To book" items get a `--warning` border. (Full detail row also carries: confirmation number mono + copy-on-click, cost+currency mono, attached-doc preview, notes.)
- **Add-reservation slide-in panel** (bottom sheet, NOT modal) — shown open here with the **hero AI shortcut**: "Paste a confirmation email" (pulsing dot), a mono raw-email preview, "Found 5 fields — review below" in `--confirmed`, extracted field chips (Type / Confirmation / Name·Dates·Stop with the stop in `--primary`), and **Confirm & save** / **Edit**.

### 5. Map (`MapScreen.dc.html`) — implement with real tiles
Full-screen map, collapsible bottom sheet.
- **Tiles:** MapLibre GL JS + MapTiler style. (The prototype shows a styled placeholder backdrop — replace with a real map.)
- **Route:** solid `--primary` line for the confirmed drive; **dashed** for day-trips; dotted for tentative.
- **Pins:** numbered 1–6 in the per-stop accent colors (teardrop shape, white stroke, drop shadow); selected pin enlarges. Secondary smaller pins for day-trip destinations (Heidelberg, Strasbourg, Haut-Koenigsbourg, Skywalk, Linderhof, Oberammergau). During-trip: system-blue current-location dot.
- Floating: trip label chip (top-left, "6 stops · 1,180 km"), zoom/recenter controls (top-right), legend chip.
- **Bottom sheet (expanded on tap):** drag handle, stop number+name+flag, mono dates/nights, status pill, 3 stat tiles (Weather / Bookings / Open), description, **Open stop** + **Directions** (native maps handoff).

### 6. Chat (`ChatScreen.dc.html`) — the showpiece
Conversation view, input pinned bottom.
- Header: AI avatar, "Trip Companion", "Knows your whole itinerary" (green dot), date.
- **Message types:** user text = right-aligned `--primary` bubble; **AI text = left-aligned, NO bubble** (letter-like), markdown; system confirmations = small check-mark log lines ("… ✓").
- **Suggestion chips** above input (context-aware): pre-trip "What are we missing?" / "Kid activities in Munich" / "Weather"; during-trip "We're running late — reshuffle today" etc.
- Input: rounded field + circular `--primary` send button. Streaming tokens should feel calm (no jitter/overshoot).

### ⭐ The Proposal Card (in `ChatScreen.dc.html`) — hero pattern
**Every AI-driven itinerary change routes through this. It must read as a distinct object in the stream — its own frame, different padding, mono details, like a document handed to you.**
- Header bar (`--primary-soft`): pulsing `--primary` dot + "SUGGESTED CHANGE" (uppercase, tracked) + right-aligned scope ("Itinerary").
- **Summary** line, prominent (Manrope 16px): "Extend Colmar to 4 nights, cut Lucerne to 1".
- **Diff:** two columns Before / After (grid `1fr 22px 1fr` with a center arrow). Before = `--surface-2`, changed values struck-through/muted. After = `--confirmed` border + `--confirmed-soft` bg, changed values bold `--confirmed`. Only changed fields highlighted.
- **Rationale** in smaller `--text-dim`, with a `--warning` "Heads up:" inline caveat.
- **Actions:** **Approve** (primary), **Modify** (opens change as editable form), **Reject** (subtle ✕), **Discuss in chat** (text link).
- **States** to build: Pending (full, active) · Approved (success border, "Applied [date] by [user]", actions collapsed) · Modified (muted border, "Modified before applying") · Rejected (muted, collapsed, expandable) · Superseded (very muted, "Replaced by later suggestion").

### 7. Open Items (`OpenItemsScreen.dc.html`)
Filterable/sortable list of the 31 items. Filter chips: All 31 / High 6 / Verify / Decide / Resolve. Grouped by priority (High header in `--warning`, then Medium).
- **Kind icons (consistent):** verify = ⚡ bolt (`--accent`), resolve = ? (`--primary`), decide = fork/split (`--text-dim`), confirm = check.
- Each row: checkbox (tap to resolve), title, meta `KIND · scope · Priority`. High priority = 3px `--primary` left border. Low = muted text.
- **Resolved item:** filled `--confirmed` check, strike-through title, resolution note ("Resolved · '…'"). Checklist behavior with optional note on resolve.

### 8. Notes (`NotesScreen.dc.html`)
Freeform journal (Tiptap-style rich text, markdown-friendly). No AI in this view.
- Back chevron, "Saved · just now" (green), editor avatar.
- **Pinned-to-stop chip** (`--primary-soft`): "📍 Pinned to Colmar 🇫🇷".
- Manrope title, "Edited by Jordan · 12 min ago" (mono).
- Body with inline checklist rows (checked = `--confirmed` + strike), inline highlight for a to-verify phrase.
- **Convert quick action** (contextual on selection): "Selected: '…'" card + **→ Activity** / **→ Reservation** buttons.
- Bottom **format toolbar** (B / i / U / list / ordered-list) + add button. Autosaves; shows last editor.

### 9. Settings (`SettingsScreen.dc.html`)
- **Travel party:** owner row (Miriam, "Active now"), editor row (Jordan, "last seen 12 min ago"); **Invite** card (dashed `--primary` border) — share link, instant co-edit.
- **Appearance:** Theme selector — Light (selected, 2px `--primary`) / Dark / System, each a mini preview swatch.
- **App:** "Add to Home Screen" row (chevron → PWA prompt), "AI & API keys" row (Anthropic key connected, toggle).

### 10. Empty states (`EmptyReservationsScreen`, `EmptyNotesScreen`, `EmptyChatScreen`)
Line-based spot illustration (monochrome + one `--accent` element), heading, warm one-line explanation, one primary action. Never feel like an error.
- Reservations empty → **Add a reservation** + **Paste a confirmation email**.
- Notes empty → **Start a note**.
- Chat empty → three starter suggestion cards + input; sets the "every change comes back as a card you approve" promise.

### 11. PWA install prompts (`PwaIosScreen`, `PwaAndroidScreen`)
- **iOS Safari:** app dimmed behind, Safari bottom toolbar, native share sheet with **Add to Home Screen** highlighted, plus a coach caption ("Tap Share, then Add to Home Screen…").
- **Android Chrome:** Chrome URL bar, native install bottom sheet with branded icon, app name, "Install" (`--primary`) / "Not now".

---

## Interactions & Behavior
- **Editing everywhere:** tap any date/city/activity/note to edit inline; no modal-heavy flows. Delete = single click + undo toast. Add-stop "+" between cards; add-reservation via slide-in bottom sheet.
- **AI is never autonomous:** every itinerary mutation is a Proposal Card the user Approves / Modifies / Rejects / Discusses. Approve applies + stamps "Applied [date] by [user]".
- **Motion:** quiet but present, 200–300ms ease-out max. Card entrances, sheet slides, chat token streaming, gentle status transitions, button-press feedback, copy-to-clipboard confirmation, "saved" toast. The pulsing dot (AI/live) is a `scale + fade` keyframe (~2s loop).
- **Two-user awareness:** last-editor avatar on recently-edited fields; live cursors on the itinerary when both are open (Notion-style); "your partner is here" indicator; conflict = last-write-wins for text, explicit approval for proposals.
- **Mode shift:** Today renders differently pre-trip / during / post-trip.
- **Copy-on-click** for confirmation numbers (mono), with a confirmation micro-interaction.

## State Management
- **Trip data** (single trip): stops[], activities[], reservations[], open_items[] — see `trip-seed.json` (real seed content).
- **Status enum** per entity: `draft | tentative | confirmed | in_progress | completed | cancelled`. One rendering function → status pill; reused everywhere.
- **Proposal state machine:** `pending → approved | modified | rejected | superseded`; approving mutates the itinerary and records actor + timestamp.
- **Presence/collab:** current-user, partner presence, per-field last-editor, live cursors (realtime channel, e.g. WebSocket/CRDT).
- **Theme:** `light | dark | system`, persisted + `prefers-color-scheme` listener.
- **Trip phase:** derived from today's date vs trip start/end → drives Today layout.
- **Offline (PWA):** service worker caches shell + trip data; show an "offline" indicator in nav and disable network-only actions (chat) while everything else works from cache. Loading = shimmer, not spinners (except chat streaming). Sync complete = brief success pulse on affected cards.

## Assets
- **Icons:** one line-icon set (Phosphor / Lucide / Iconoir). Prototype uses inline SVGs as stand-ins — swap for the chosen library.
- **Illustrations:** empty-state spots are simple line + one-accent SVGs; keep the style (Notion/Stripe-like, not cutesy).
- **Flags:** emoji flags in prototype; a flag set is fine.
- **Map tiles:** MapTiler account/style + MapLibre GL JS.
- **Fonts:** Manrope, Inter, JetBrains Mono (Google Fonts).
- No raster brand assets required.

## Files
Design references (open/read as spec). Canvas files import the individual screen files:
- `Round 2 — Confident Blue.dc.html` — the full chosen-direction gallery (imports all screens below, incl. dark-mode parity).
- `Round 1 — Palette Exploration.dc.html` — the three explored directions (blue chosen); shows the rejected alternatives for context.
- Screen files: `TodayScreen.dc.html` (pre-trip), `TodayDuringScreen.dc.html`, `ItineraryScreen.dc.html`, `ReservationsScreen.dc.html`, `MapScreen.dc.html`, `ChatScreen.dc.html`, `OpenItemsScreen.dc.html`, `NotesScreen.dc.html`, `SettingsScreen.dc.html`, `EmptyReservationsScreen.dc.html`, `EmptyNotesScreen.dc.html`, `EmptyChatScreen.dc.html`, `PwaIosScreen.dc.html`, `PwaAndroidScreen.dc.html`.
- `trip-seed.json` — the real trip data to build against (6 stops, activities, 21 reservations, 31 open items).
- `DESIGN_BRIEF.md` — the original product/design brief (source of truth for intent).
- `support.js` — prototype runtime only; **not** part of the app to build.

> Note: the `.dc.html` files use CSS-variable tokens with light-mode hex fallbacks baked in, so each renders standalone. The variable names map 1:1 to the Design Tokens table above — a clean starting point for your theme layer.
