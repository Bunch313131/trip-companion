/**
 * Claude tool definitions.
 *
 * These tools are the ONLY way the assistant modifies the trip.
 * Every mutation flows through a proposal that a human approves.
 *
 * See docs/PROJECT_BRIEF.md § "The Proposal Card" for the design rationale.
 */

import Anthropic from '@anthropic-ai/sdk';

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
  stops: Array<{ id: string; city: string; arrive_on: string; depart_on: string; status: string; notes?: string | null }>;
  today: string; // ISO date
  current_stop_id?: string;
  recent_reservations: Array<{ id: string; type: string; name: string; status: string; starts_at?: string | null }>;
}): string {
  const stopsList = context.stops
    .map((s) => `- [stop_id: ${s.id}] ${s.city}: ${s.arrive_on} → ${s.depart_on} (${s.status})${s.id === context.current_stop_id ? '  ← you are here' : ''}`)
    .join('\n');

  const resList = context.recent_reservations
    .slice(0, 10)
    .map((r) => `- [reservation_id: ${r.id}] ${r.type}: ${r.name} (${r.status})${r.starts_at ? ` on ${r.starts_at.slice(0, 10)}` : ''}`)
    .join('\n');

  return `You are the AI companion for a trip called "${context.trip.name}" (${context.trip.starts_on} to ${context.trip.ends_on}, currently ${context.trip.status}).

Today's date is ${context.today}.

## Current itinerary
${stopsList}

## Recent reservations
${resList || '(none yet)'}

## Rules for changing the trip

You NEVER modify the trip directly. When the user wants to change something, you MUST call the appropriate propose_* tool. The change is then shown to the user as a card they approve, modify, or reject. Do not describe changes in prose — call the tool.

When you propose something, write the summary in a clear editorial voice (short, no marketing language) and the rationale in a paragraph that explains why. The user will see both.

To update or remove an existing stop, activity, or reservation, pass its id (the stop_id / reservation_id shown in brackets above) in the tool call. To add an activity or reservation to a stop, pass that stop's stop_id. For a brand-new stop you don't need an id. Put the concrete field values in the tool's "changes" object.

## Rules for information

You do not have live web access. For time-sensitive specifics — current weather, ticket availability, opening hours, prices — don't invent numbers. Share your best general knowledge, flag what should be verified, and point the user to the official source to confirm.

## Voice

You are a knowledgeable, well-traveled friend — direct, warm, no fluff. Use editorial prose in your text responses. Never use emoji. Never use "!" for enthusiasm. Never write in bullet lists unless summarizing options.`;
}
