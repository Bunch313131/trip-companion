import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type { ProposalDiffRow, ProposalEntity, ProposalOperation } from '@/types/domain';

/**
 * Maps a Claude propose_* tool call into a Firestore proposal document.
 * The AI tools use snake_case field names (arrive_on); our documents use
 * camelCase (arriveOn), so we translate here. Nothing is applied to the
 * itinerary — the proposal sits pending until a human approves it.
 */

type ToolInput = {
  operation: 'add' | 'update' | 'remove' | 'reorder';
  stop_id?: string;
  activity_id?: string;
  reservation_id?: string;
  reminder_id?: string;
  summary: string;
  rationale: string;
  changes?: Record<string, unknown>;
};

// snake_case tool field → { camelCase doc field, timestamp? }
const FIELD_MAP: Record<string, { key: string; ts?: boolean }> = {
  city: { key: 'city' },
  country: { key: 'country' },
  region: { key: 'region' },
  arrive_on: { key: 'arriveOn' },
  depart_on: { key: 'departOn' },
  order_idx: { key: 'orderIdx' },
  status: { key: 'status' },
  notes: { key: 'notes' },
  title: { key: 'title' },
  kind: { key: 'kind' },
  location: { key: 'location' },
  starts_at: { key: 'startsAt', ts: true },
  ends_at: { key: 'endsAt', ts: true },
  type: { key: 'type' },
  name: { key: 'name' },
  confirmation: { key: 'confirmation' },
  provider: { key: 'provider' },
  cost_cents: { key: 'costCents' },
  cost_currency: { key: 'costCurrency' },
  // reminders
  text: { key: 'text' },
  date: { key: 'dateISO' },
  standing: { key: 'standing' },
};

function mapChanges(changes: Record<string, unknown> = {}): {
  data: Record<string, unknown>;
  diff: ProposalDiffRow[];
} {
  const data: Record<string, unknown> = {};
  const diff: ProposalDiffRow[] = [];
  for (const [rawKey, value] of Object.entries(changes)) {
    if (value == null || value === '') continue;
    const map = FIELD_MAP[rawKey];
    if (!map) continue;
    if (map.ts && typeof value === 'string') {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        data[map.key] = Timestamp.fromDate(d);
        diff.push({ field: map.key, after: value });
      }
      continue;
    }
    data[map.key] = value;
    diff.push({ field: map.key, after: String(value) });
  }
  return { data, diff };
}

const TOOL_ENTITY: Record<string, ProposalEntity> = {
  propose_stop_change: 'stops',
  propose_activity: 'activities',
  propose_reservation: 'reservations',
  propose_reminder: 'reminders',
};

/** Create a proposal directly from a set of operations (e.g. document import). */
export async function createProposalFromOps(
  tripId: string,
  input: {
    proposalType: string;
    summary: string;
    rationale: string;
    operations: ProposalOperation[];
    diff?: ProposalDiffRow[];
  }
): Promise<string> {
  const ref = await adminDb()
    .collection(`trips/${tripId}/proposals`)
    .add({
      proposalType: input.proposalType,
      summary: input.summary,
      rationale: input.rationale,
      diff: input.diff ?? [],
      operations: input.operations,
      status: 'pending',
      createdBy: 'assistant',
      createdAt: FieldValue.serverTimestamp(),
    });
  return ref.id;
}

/**
 * Create a pending proposal from a tool call. Returns the new proposal id.
 */
export async function createProposalFromTool(
  tripId: string,
  toolName: string,
  input: ToolInput
): Promise<string> {
  const entity = TOOL_ENTITY[toolName] ?? 'stops';
  const idField =
    entity === 'stops'
      ? input.stop_id
      : entity === 'activities'
        ? input.activity_id
        : entity === 'reminders'
          ? input.reminder_id
          : input.reservation_id;

  const { data, diff } = mapChanges(input.changes);

  // For add operations on activities/reservations/reminders, carry the stopId link.
  if (input.operation === 'add' && entity !== 'stops' && input.stop_id) {
    data.stopId = input.stop_id;
  }
  // New reminders start not-done.
  if (input.operation === 'add' && entity === 'reminders') {
    data.done = false;
  }

  let operations: ProposalOperation[];
  if (input.operation === 'add') {
    operations = [{ op: 'create', entity, data }];
  } else if (input.operation === 'remove') {
    operations = idField ? [{ op: 'delete', entity, id: idField }] : [];
  } else {
    // update / reorder
    operations = idField ? [{ op: 'update', entity, id: idField, changes: data }] : [];
  }

  const proposalType = `${entity.replace(/s$/, '')}_${input.operation}`;

  const ref = await adminDb()
    .collection(`trips/${tripId}/proposals`)
    .add({
      proposalType,
      summary: input.summary,
      rationale: input.rationale,
      diff,
      operations,
      status: 'pending',
      createdBy: 'assistant',
      createdAt: FieldValue.serverTimestamp(),
    });
  return ref.id;
}
