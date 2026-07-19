/**
 * TypeScript shapes for Firestore documents. These mirror the schemas in
 * docs/PROJECT_BRIEF.md. Timestamps are the Firestore client `Timestamp`
 * type on read; ISO date strings (arriveOn, startsOn, …) are plain strings.
 */

import type { Timestamp } from 'firebase/firestore';

export type TripStatus = 'planning' | 'active' | 'completed' | 'archived';

export type TripDoc = {
  name: string;
  slug: string;
  createdBy: string;
  startsOn: string;
  endsOn: string;
  originIata: string;
  returnIata: string;
  status: TripStatus;
  description?: string | null;
  memberIds?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type StopStatus =
  | 'draft'
  | 'tentative'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type StopDoc = {
  orderIdx: number;
  city: string;
  country: string;
  region?: string | null;
  arriveOn: string;
  departOn: string;
  status: StopStatus;
  color: string;
  lat: number;
  lng: number;
  notes?: string | null;
  lastEditedBy: string;
  updatedAt?: Timestamp;
};

export type ActivityKind =
  | 'day_trip'
  | 'sightseeing'
  | 'meal'
  | 'transit'
  | 'entertainment'
  | 'rest'
  | 'idea'
  | 'other';

export type ActivityStatus =
  | 'idea'
  | 'tentative'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type ActivityDoc = {
  stopId: string;
  title: string;
  kind: ActivityKind;
  startsAt?: Timestamp | null;
  endsAt?: Timestamp | null;
  status: ActivityStatus;
  location?: string | null;
  costCents?: number | null;
  costCurrency?: string | null;
  notes?: string | null;
  lastEditedBy: string;
  updatedAt?: Timestamp;
};

export type ReservationType =
  | 'flight'
  | 'hotel'
  | 'rail'
  | 'car'
  | 'ticket'
  | 'restaurant'
  | 'activity'
  | 'other';

export type ReservationStatus =
  | 'to_book'
  | 'booked'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ReservationDoc = {
  stopId?: string | null;
  type: ReservationType;
  name: string;
  startsAt?: Timestamp | null;
  endsAt?: Timestamp | null;
  confirmation?: string | null;
  provider?: string | null;
  costCents?: number | null;
  costCurrency?: string | null;
  status: ReservationStatus;
  documentUrl?: string | null;
  documentMime?: string | null;
  notes?: string | null;
  lastEditedBy: string;
  updatedAt?: Timestamp;
};

// ─── Proposals (the hero pattern) ──────────────────────────────────
export type ProposalEntity = 'stops' | 'activities' | 'reservations';

export type ProposalOperation =
  | { op: 'create'; entity: ProposalEntity; data: Record<string, unknown> }
  | { op: 'update'; entity: ProposalEntity; id: string; changes: Record<string, unknown> }
  | { op: 'delete'; entity: ProposalEntity; id: string };

export type ProposalStatus = 'pending' | 'approved' | 'modified' | 'rejected' | 'superseded';

/** A single field's before/after, for the diff view. */
export type ProposalDiffRow = { field: string; before?: string | null; after?: string | null };

export type ProposalDoc = {
  chatMessageId?: string;
  proposalType: string; // 'stop_add' | 'stop_update' | 'activity_add' | ...
  summary: string;
  rationale: string;
  diff?: ProposalDiffRow[]; // human-readable before→after for display
  operations: ProposalOperation[];
  status: ProposalStatus;
  reviewedBy?: string | null;
  reviewedAt?: Timestamp | null;
  createdBy?: string; // 'assistant'
  createdAt?: Timestamp;
};

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageDoc = {
  role: ChatRole;
  userId?: string | null;
  content: string;
  citations?: Array<{ title?: string; url: string }> | null;
  proposalIds?: string[] | null;
  createdAt?: Timestamp;
};

/** A document plus its Firestore id. */
export type WithId<T> = T & { id: string };
