import { randomUUID } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, adminStorage, requireTripAccess } from '@/lib/firebase-admin';
import { createProposalFromOps } from '@/lib/ai/create-proposal';
import type { ProposalOperation, ProposalDiffRow, ProposalEntity } from '@/types/domain';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = 'gemini-3.6-flash'; // reasoning over the doc + existing trip
const MAX_BYTES = 20 * 1024 * 1024;

const OP_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    operations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'update'] },
          entity: { type: 'string', enum: ['reservations', 'activities'] },
          match_id: { type: 'string' },
          type: {
            type: 'string',
            enum: ['flight', 'hotel', 'rail', 'car', 'ticket', 'restaurant', 'activity', 'other'],
          },
          name: { type: 'string' },
          title: { type: 'string' },
          provider: { type: 'string' },
          confirmation: { type: 'string' },
          starts_at: { type: 'string' },
          ends_at: { type: 'string' },
          cost_cents: { type: 'integer' },
          cost_currency: { type: 'string' },
          stop_id: { type: 'string' },
          location: { type: 'string' },
        },
      },
    },
  },
};

type ExtractedOp = {
  action: 'create' | 'update';
  entity: 'reservations' | 'activities';
  match_id?: string;
  type?: string;
  name?: string;
  title?: string;
  provider?: string;
  confirmation?: string;
  starts_at?: string;
  ends_at?: string;
  cost_cents?: number;
  cost_currency?: string;
  stop_id?: string;
  location?: string;
};

function toTs(iso?: string): Timestamp | null {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}

function opToData(
  op: ExtractedOp,
  entity: ProposalEntity,
  docFields: { documentUrl: string; documentMime: string }
) {
  const isRes = entity === 'reservations';
  const data: Record<string, unknown> = {};
  if (isRes) {
    if (op.type) data.type = op.type;
    if (op.name) data.name = op.name;
    if (op.provider) data.provider = op.provider;
    if (op.confirmation) data.confirmation = op.confirmation;
    if (op.cost_cents != null) data.costCents = op.cost_cents;
    if (op.cost_currency) data.costCurrency = op.cost_currency;
    data.documentUrl = docFields.documentUrl;
    data.documentMime = docFields.documentMime;
    if (op.action === 'create') data.status = 'booked';
  } else {
    if (op.title || op.name) data.title = op.title ?? op.name;
    if (op.type) data.kind = 'other';
    if (op.location) data.location = op.location;
    if (op.action === 'create') data.status = 'confirmed';
  }
  if (op.stop_id) data.stopId = op.stop_id;
  const s = toTs(op.starts_at);
  const e = toTs(op.ends_at);
  if (s) data.startsAt = s;
  if (e) data.endsAt = e;
  return data;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 });
  }
  const file = form.get('file');
  const tripId = String(form.get('tripId') ?? '');
  if (!(file instanceof File) || !tripId) {
    return Response.json({ error: 'file and tripId are required' }, { status: 400 });
  }

  try {
    await requireTripAccess(request, tripId, 'editor');
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 403 });
  }

  const KEY = process.env.GEMINI_API_KEY?.trim();
  if (!KEY) return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });

  const mime = file.type || 'application/octet-stream';
  if (!/^(image\/|application\/pdf)/.test(mime)) {
    return Response.json({ error: 'Only PDFs and images are supported' }, { status: 415 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    return Response.json({ error: 'File is larger than 20MB' }, { status: 413 });
  }

  const db = adminDb();

  // Store the document once; every created/updated booking references it.
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
  const bucket = adminStorage().bucket(bucketName);
  const safeName = file.name.replace(/[^\w.\-]+/g, '_') || 'document';
  const path = `reservations/${tripId}/import-${randomUUID().slice(0, 8)}/${safeName}`;
  const token = randomUUID();
  await bucket.file(path).save(buffer, {
    contentType: mime,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  const documentUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;

  // Context: existing reservations + stops, for matching.
  const [resSnap, stopsSnap] = await Promise.all([
    db.collection(`trips/${tripId}/reservations`).get(),
    db.collection(`trips/${tripId}/stops`).orderBy('orderIdx').get(),
  ]);
  const existing = resSnap.docs
    .map((d) => {
      const r = d.data();
      return {
        id: d.id,
        type: r.type,
        name: r.name,
        provider: r.provider ?? null,
        confirmation: r.confirmation ?? null,
        starts_at: r.startsAt?.toDate ? r.startsAt.toDate().toISOString() : null,
        stopId: r.stopId ?? null,
        status: r.status,
      };
    })
    .filter((r) => r.status !== 'cancelled');
  const stops = stopsSnap.docs.map((d) => {
    const s = d.data();
    return { id: d.id, city: s.city, arrive_on: s.arriveOn, depart_on: s.departOn };
  });

  const instructions = `You are importing a travel document into an existing trip.

CURRENT RESERVATIONS (JSON):
${JSON.stringify(existing)}

STOPS (JSON):
${JSON.stringify(stops)}

Read the attached document and extract EVERY booking or leg it contains. A round-trip flight is ONE operation PER leg. For each item:
- If it clearly matches an existing reservation (same flight number, or same route+date, or same hotel+dates), output action "update" with that reservation's match_id. On an update, ALWAYS include the confirmation/booking reference (PNR) and total cost when the document shows them — even if the existing record has a placeholder like "TBD" or is missing them — plus any corrected times. A round-trip ticket usually shares ONE confirmation/PNR across all legs; put that same confirmation on every leg. If there is a single ticket total (not per-leg), put it on the first outbound leg only and leave the other legs' cost empty. Do not duplicate existing bookings.
- Otherwise output action "create".
Assign stop_id by matching the item's date to the stop whose date range (arrive_on..depart_on) contains it. Flights/rental cars are trip-wide — leave stop_id empty. If the document implies a specific scheduled activity (a timed tour or entry) that isn't already a booking, you may create an activity (entity "activities") with a title, starts_at, and stop_id. Keep names concise (e.g. "Delta DL1701 SMF→MSP"). cost_cents is the total in minor units. Return only what the document supports.`;

  let extracted: { summary?: string; operations?: ExtractedOp[] } = {};
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { inline_data: { mime_type: mime, data: buffer.toString('base64') } },
                { text: instructions },
              ],
            },
          ],
          generationConfig: {
            thinkingConfig: { thinkingLevel: 'low' },
            responseMimeType: 'application/json',
            responseSchema: OP_SCHEMA,
          },
        }),
      }
    );
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) extracted = JSON.parse(text);
  } catch (err) {
    return Response.json({ error: `Could not read document: ${(err as Error).message}` }, { status: 502 });
  }

  const rawOps = extracted.operations ?? [];
  if (rawOps.length === 0) {
    return Response.json({ error: 'No bookings found in that document' }, { status: 422 });
  }

  const operations: ProposalOperation[] = [];
  const diff: ProposalDiffRow[] = [];
  for (const op of rawOps) {
    const entity = (op.entity === 'activities' ? 'activities' : 'reservations') as ProposalEntity;
    const data = opToData(op, entity, { documentUrl, documentMime: mime });
    if (op.action === 'update' && op.match_id) {
      operations.push({ op: 'update', entity, id: op.match_id, changes: data });
    } else {
      operations.push({ op: 'create', entity, data });
    }
    const label = op.name || op.title || 'item';
    const bits = [
      op.starts_at ? op.starts_at.slice(0, 10) : null,
      op.confirmation ? `#${op.confirmation}` : null,
      op.cost_cents != null ? `${(op.cost_cents / 100).toFixed(0)} ${op.cost_currency ?? ''}`.trim() : null,
    ].filter(Boolean);
    diff.push({
      field: op.action === 'update' ? 'Update' : 'Add',
      after: `${label}${bits.length ? ' · ' + bits.join(' · ') : ''}`,
    });
  }

  const creates = operations.filter((o) => o.op === 'create').length;
  const updates = operations.filter((o) => o.op === 'update').length;
  const summary =
    extracted.summary ||
    `Import ${file.name}: ${creates ? `add ${creates}` : ''}${creates && updates ? ', ' : ''}${updates ? `update ${updates}` : ''}`.trim();

  const proposalId = await createProposalFromOps(tripId, {
    proposalType: 'document_import',
    summary,
    rationale: `Read from ${file.name}. Review the changes before applying.`,
    operations,
    diff,
  });

  return Response.json({ proposalId, documentUrl });
}
