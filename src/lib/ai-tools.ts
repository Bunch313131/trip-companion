/**
 * Claude tool definitions.
 *
 * These tools are the ONLY way the assistant modifies the trip.
 * Every mutation flows through a proposal that a human approves.
 *
 * See docs/PROJECT_BRIEF.md § "The Proposal Card" for the design rationale.
 */

import Anthropic from '@anthropic-ai/sdk';
import { EU_EMERGENCY, STATE_DEPT_247, POSTS, CARD_ISSUERS } from '@/lib/emergency';

export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'propose_stop_change',
    description:
      "Propose adding, removing, or modifying a stop on the trip. Use this whenever the user wants to change where they're going or how long they stay. Never modify stops directly — always propose.",
    input_schema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'update', 'remove', 'reorder'],
          description: 'The kind of change being proposed.',
        },
        stop_id: {
          type: 'string',
          description: 'For update/remove operations, the ID of the stop being changed.',
        },
        summary: {
          type: 'string',
          description: 'Short human-readable summary of the change (e.g. "Extend Colmar to 4 nights").',
        },
        rationale: {
          type: 'string',
          description: 'Why this change makes sense — will be shown to the user in italic serif.',
        },
        changes: {
          type: 'object',
          description: 'Fields to set. For add operations: city, country, arrive_on, depart_on, notes, color.',
          properties: {
            city: { type: 'string' },
            country: { type: 'string', description: 'ISO alpha-2 code' },
            arrive_on: { type: 'string', description: 'ISO date' },
            depart_on: { type: 'string', description: 'ISO date' },
            order_idx: { type: 'number' },
            status: { type: 'string', enum: ['draft', 'tentative', 'confirmed'] },
            notes: { type: 'string' },
          },
        },
      },
      required: ['operation', 'summary', 'rationale'],
    },
  },
  {
    name: 'propose_activity',
    description:
      "Propose adding or modifying an activity at a stop (day trip, sightseeing, meal, etc). Always propose — never modify directly.",
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['add', 'update', 'remove'] },
        activity_id: { type: 'string' },
        stop_id: { type: 'string', description: 'Required for add operations.' },
        summary: { type: 'string' },
        rationale: { type: 'string' },
        changes: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            kind: {
              type: 'string',
              enum: ['day_trip', 'sightseeing', 'meal', 'transit', 'entertainment', 'rest', 'idea', 'other'],
            },
            starts_at: { type: 'string', description: 'ISO datetime' },
            ends_at: { type: 'string', description: 'ISO datetime' },
            status: { type: 'string', enum: ['idea', 'tentative', 'confirmed'] },
            location: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
      required: ['operation', 'summary', 'rationale'],
    },
  },
  {
    name: 'propose_reservation',
    description:
      "Propose creating or updating a reservation (hotel, flight, ticket, etc). Use this after searching the web for a specific option or when the user shares booking info.",
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['add', 'update', 'remove'] },
        reservation_id: { type: 'string' },
        stop_id: { type: 'string' },
        summary: { type: 'string' },
        rationale: { type: 'string' },
        changes: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['flight', 'hotel', 'rail', 'car', 'ticket', 'restaurant', 'activity', 'other'],
            },
            name: { type: 'string' },
            starts_at: { type: 'string' },
            ends_at: { type: 'string' },
            confirmation: { type: 'string' },
            provider: { type: 'string' },
            cost_cents: { type: 'number' },
            cost_currency: { type: 'string' },
            status: {
              type: 'string',
              enum: ['to_book', 'booked', 'in_progress', 'completed', 'cancelled'],
            },
            notes: { type: 'string' },
          },
        },
      },
      required: ['operation', 'summary', 'rationale'],
    },
  },
  {
    name: 'propose_reminder',
    description:
      "Propose a reminder — a small thing to remember at the right moment (e.g. questions to ask at the rental-car desk, things to keep in the cabin bag). Use whenever the user says 'remind me', 'don't let me forget', or shares a tip to resurface later. Anchor it to a day (date) and/or a stop when relevant; use standing:true for trip-wide reminders with no single day. Always propose — never create directly.",
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['add', 'update', 'remove'] },
        reminder_id: { type: 'string' },
        stop_id: { type: 'string', description: 'Optional — anchor to a stop.' },
        summary: { type: 'string' },
        rationale: { type: 'string' },
        changes: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short label, e.g. "Rental car pickup".' },
            text: { type: 'string', description: 'The reminder detail or checklist.' },
            date: {
              type: 'string',
              description: 'YYYY-MM-DD — the day it should surface. Omit for a standing reminder.',
            },
            standing: {
              type: 'boolean',
              description: 'True for a trip-wide reminder with no single day (e.g. cabin-bag checklist).',
            },
          },
        },
      },
      required: ['operation', 'summary', 'rationale'],
    },
  },
  {
    name: 'web_search',
    description:
      'Search the web for current information (weather, opening hours, ticket availability, restaurant recommendations, etc.). Use aggressively — never assume; verify.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'A concise search query. 1-6 words works best.' },
      },
      required: ['query'],
    },
  },
];

/**
 * Builds a system prompt that includes the current trip state.
 * Call before every chat completion so the AI has fresh context.
 */
export function buildSystemPrompt(context: {
  trip: { name: string; starts_on: string; ends_on: string; status: string };
  travelers?: string | null;
  stops: Array<{ id: string; city: string; arrive_on: string; depart_on: string; status: string; notes?: string | null }>;
  today: string; // ISO date
  current_stop_id?: string;
  recent_reservations: Array<{
    id: string;
    type: string;
    name: string;
    status: string;
    starts_at?: string | null;
    confirmation?: string | null;
    address?: string | null;
    provider?: string | null;
    cost?: string | null;
  }>;
  activities?: Array<{ id: string; title: string; kind: string; status: string; starts_at?: string | null; stop_id?: string | null }>;
  open_items?: Array<{ kind: string; description: string; priority: string; scope: string }>;
  reminders?: Array<{ id: string; title?: string | null; text: string; dateISO?: string | null; standing?: boolean }>;
  weather?: string | null;
}): string {
  const stopsList = context.stops
    .map((s) => `- [stop_id: ${s.id}] ${s.city}: ${s.arrive_on} → ${s.depart_on} (${s.status})${s.id === context.current_stop_id ? '  ← you are here' : ''}${s.notes ? ` — ${s.notes}` : ''}`)
    .join('\n');

  // Show every booking, ordered by date (undated last), with the specifics the
  // model needs to actually answer (confirmation, cost, address).
  const resList = [...context.recent_reservations]
    .sort((a, b) => {
      if (!a.starts_at) return 1;
      if (!b.starts_at) return -1;
      return a.starts_at < b.starts_at ? -1 : 1;
    })
    .map((r) => {
      const bits = [`- [reservation_id: ${r.id}] ${r.type}: ${r.name} (${r.status})`];
      if (r.starts_at) bits.push(`on ${r.starts_at.slice(0, 10)}`);
      if (r.confirmation) bits.push(`conf ${r.confirmation}`);
      if (r.cost) bits.push(r.cost);
      if (r.provider) bits.push(r.provider);
      if (r.address) bits.push(`@ ${r.address}`);
      return bits.join(' · ');
    })
    .join('\n');

  const openList = (context.open_items ?? [])
    .map((o) => `- [${o.kind}] ${o.description} (${o.priority} priority · ${o.scope})`)
    .join('\n');

  const remList = (context.reminders ?? [])
    .map(
      (r) =>
        `- [reminder_id: ${r.id}] ${r.dateISO ? r.dateISO : r.standing ? 'anytime' : '—'}: ${r.title ? `${r.title} — ` : ''}${r.text}`
    )
    .join('\n');

  // The detailed day-by-day plan, grouped by date so the model can reason about
  // (and re-time) the flow of each day. Times shown in the trip's zone (CET).
  const acts = (context.activities ?? [])
    .filter((a) => a.starts_at)
    .sort((a, b) => (a.starts_at! < b.starts_at! ? -1 : 1));
  const byDay = new Map<string, string[]>();
  for (const a of acts) {
    const dt = new Date(a.starts_at!);
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dt);
    const time = dt.toLocaleTimeString('en-US', {
      timeZone: 'Europe/Berlin',
      hour: 'numeric',
      minute: '2-digit',
    });
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(`  - [activity_id: ${a.id}] ${time} ${a.title} (${a.kind}, ${a.status})`);
  }
  const schedule = [...byDay.entries()]
    .map(([day, lines]) => `${day}:\n${lines.join('\n')}`)
    .join('\n');

  return `You are the AI companion for a trip called "${context.trip.name}" (${context.trip.starts_on} to ${context.trip.ends_on}, currently ${context.trip.status}).

Today's date is ${context.today}.

## Who's traveling
${context.travelers || 'Not specified.'}
Tailor every suggestion to them — pacing, energy, meal timing, and what's realistic. Proactively flag when a plan looks too ambitious or poorly timed for the group.

## Current itinerary
${stopsList}

## Bookings (flights, hotels, tickets, car, restaurants — all of them)
${resList || '(none yet)'}

## Detailed daily schedule
This is the minute-by-minute plan (wake, meals, departures, drives, arrivals, activities). All times are Central European Time. When the user wants to re-time the day, add a step, or reshuffle around weather or delays, edit these via propose_activity using the activity_id.
${schedule || '(no detailed schedule yet)'}

## Weather outlook (real Open-Meteo forecast — use these numbers, don't invent them)
${context.weather || '(forecast not available right now)'}

## Needs attention (open to-dos on this trip)
${openList || '(nothing open)'}

## Reminders (small things to remember, surfaced at the right time)
${remList || '(none yet)'}
When the user says "remind me", "don't let me forget", or shares a tip to resurface (questions for the rental desk, what to pack in the cabin bag, etc.), capture it with propose_reminder — anchor it to the right day/stop, or standing:true if it has no single day.

## Emergency reference (for "what's the number for…" questions)
The app has a dedicated Emergency screen at /emergency. Use these facts to answer directly; point the user there for the tappable version.
- Europe-wide emergency (police/ambulance/fire): ${EU_EMERGENCY}
- U.S. citizens in trouble abroad (lost passport, arrest, medical), State Dept 24/7: ${STATE_DEPT_247.fromAbroad} from abroad, ${STATE_DEPT_247.fromUS} from the U.S.
- U.S. posts: ${POSTS.map((p) => `${p.name} (${p.serves}) ${p.phone}`).join('; ')}
- Lost/stolen card lines: ${CARD_ISSUERS.map((c) => `${c.issuer} ${c.intlPhone}`).join('; ')}. Advise freezing the card in its app first, then calling.
Sensitive details (passport numbers, full card numbers) are deliberately NOT stored in the app — if asked, tell the user those belong in their password manager or a locked note, not here.

## Rules for changing the trip

You NEVER modify the trip directly. When the user wants to change something, you MUST call the appropriate propose_* tool. The change is then shown to the user as a card they approve, modify, or reject. Do not describe changes in prose — call the tool.

When you propose something, write the summary in a clear editorial voice (short, no marketing language) and the rationale in a paragraph that explains why. The user will see both.

To update or remove an existing stop, activity, or reservation, pass its id (the stop_id / reservation_id shown in brackets above) in the tool call. To add an activity or reservation to a stop, pass that stop's stop_id. For a brand-new stop you don't need an id. Put the concrete field values in the tool's "changes" object.

## How to be genuinely useful (not just transactional)

You have the full picture above — who's traveling, the itinerary, every booking, the minute-by-minute plan, the weather, and what's still open. Use it. Reason like a sharp travel-planner friend: anticipate problems (tight connections, a rain window over an outdoor day, a wake-up that's too early for young kids, an over-packed afternoon), weigh trade-offs, and suggest concretely. When you spot something worth changing, propose it. Reference the actual data (a specific flight time, the forecast, an open item) rather than speaking in generalities.

## Rules for information

You DO have the weather forecast above (real data) and the trip's own records — use them directly. You do NOT have live web access for other time-sensitive specifics (ticket availability, opening hours, live prices). Don't invent those — share your best general knowledge, flag what to verify, and point to the official source.

## Voice

You are a knowledgeable, well-traveled friend — direct, warm, no fluff. Use editorial prose in your text responses. Never use emoji. Never use "!" for enthusiasm. Never write in bullet lists unless summarizing options.`;
}
