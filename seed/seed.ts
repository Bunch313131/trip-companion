/**
 * Seed script.
 *
 * Loads seed/trip-seed.json into Firestore under a stable, idempotent
 * document layout. Safe to re-run — it upserts using deterministic IDs
 * derived from the seed content, so running it twice doesn't duplicate.
 *
 * Usage:
 *   npm run db:seed
 *
 * Requires FIREBASE_ADMIN_CREDENTIALS to be set (see .env.example).
 *
 * Assumptions:
 * - A "creator" user exists you want to make the trip owner. Set OWNER_UID
 *   below, or pass it as an env var: OWNER_UID=xxx npm run db:seed
 * - Alternatively, run this WITHOUT an owner and add yourself via the app UI
 *   after signing up (the seed writes a placeholder-memberIds trip; you'll
 *   need to update memberIds after signup — see the notes at the bottom).
 */

import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, 'trip-seed.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf-8')) as any;

const OWNER_UID = process.env.OWNER_UID ?? '';
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? '';

if (!process.env.FIREBASE_ADMIN_CREDENTIALS) {
  console.error('❌ FIREBASE_ADMIN_CREDENTIALS not set');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS)) });
const db = getFirestore();

/** Deterministic ID from a string (for idempotent upserts) */
function idFrom(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 20);
}

function toTimestamp(iso?: string): Timestamp | null {
  if (!iso) return null;
  return Timestamp.fromDate(new Date(iso));
}

async function seedTrip() {
  const tripId = idFrom(seed.trip.slug);
  console.log(`\n🌱 Seeding trip "${seed.trip.name}" → ${tripId}\n`);

  const tripRef = db.doc(`trips/${tripId}`);

  await tripRef.set(
    {
      name: seed.trip.name,
      slug: seed.trip.slug,
      startsOn: seed.trip.starts_on,
      endsOn: seed.trip.ends_on,
      originIata: seed.trip.origin_iata,
      returnIata: seed.trip.return_iata,
      status: seed.trip.status,
      description: seed.trip.description ?? null,
      createdBy: OWNER_UID || '__seed__',
      memberIds: OWNER_UID ? [OWNER_UID] : [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`✓ trip`);

  // Add owner member if provided
  if (OWNER_UID) {
    await tripRef.collection('members').doc(OWNER_UID).set(
      {
        userId: OWNER_UID,
        email: OWNER_EMAIL,
        role: 'owner',
        joinedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await db
      .doc(`userTrips/${OWNER_UID}/trips/${tripId}`)
      .set(
        {
          tripId,
          role: 'owner',
          joinedAt: FieldValue.serverTimestamp(),
          tripName: seed.trip.name,
          startsOn: seed.trip.starts_on,
        },
        { merge: true }
      );
    console.log(`✓ owner member (${OWNER_EMAIL || OWNER_UID})`);
  } else {
    console.log(`⚠  No OWNER_UID set — trip has empty memberIds.`);
    console.log(`   Add yourself after signup with:  npm run db:add-owner <UID> <email>`);
  }

  // Stops — keyed by slug of city
  const stopIdByOrder = new Map<number, string>();
  for (const stop of seed.stops) {
    const stopId = idFrom(`${tripId}:stop:${stop.city}`);
    stopIdByOrder.set(stop.order_idx, stopId);
    await tripRef
      .collection('stops')
      .doc(stopId)
      .set(
        {
          orderIdx: stop.order_idx,
          city: stop.city,
          country: stop.country,
          region: stop.region ?? null,
          arriveOn: stop.arrive_on,
          departOn: stop.depart_on,
          status: stop.status,
          color: stop.color,
          lat: stop.lat,
          lng: stop.lng,
          notes: stop.notes ?? null,
          lastEditedBy: OWNER_UID || '__seed__',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }
  console.log(`✓ ${seed.stops.length} stops`);

  // Activities
  for (const act of seed.activities) {
    const stopId = stopIdByOrder.get(act.stop_order_idx)!;
    const actId = idFrom(`${tripId}:act:${stopId}:${act.title}:${act.starts_at ?? ''}`);
    await tripRef
      .collection('activities')
      .doc(actId)
      .set(
        {
          stopId,
          title: act.title,
          kind: act.kind,
          startsAt: toTimestamp(act.starts_at),
          endsAt: toTimestamp(act.ends_at),
          status: act.status,
          location: act.location ?? null,
          notes: act.notes ?? null,
          lastEditedBy: OWNER_UID || '__seed__',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }
  console.log(`✓ ${seed.activities.length} activities`);

  // Reservations
  for (const res of seed.reservations) {
    const stopId = res.stop_order_idx ? stopIdByOrder.get(res.stop_order_idx) : null;
    const resId = idFrom(
      `${tripId}:res:${res.type}:${res.name}:${res.starts_at ?? ''}`
    );
    await tripRef
      .collection('reservations')
      .doc(resId)
      .set(
        {
          stopId: stopId ?? null,
          type: res.type,
          name: res.name,
          startsAt: toTimestamp(res.starts_at),
          endsAt: toTimestamp(res.ends_at),
          confirmation: res.confirmation ?? null,
          provider: res.provider ?? null,
          costCents: res.cost_cents ?? null,
          costCurrency: res.cost_currency ?? null,
          status: res.status,
          notes: res.notes ?? null,
          lastEditedBy: OWNER_UID || '__seed__',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }
  console.log(`✓ ${seed.reservations.length} reservations`);

  console.log(`\n✅ Seed complete. Trip ID: ${tripId}\n`);
}

seedTrip().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

/*
 * ─── Follow-up: adding yourself as owner after signup ────────────
 *
 * If you ran the seed without OWNER_UID:
 *   1. Sign up in the app to get your UID (Firebase Console → Auth → Users)
 *   2. Set OWNER_UID and OWNER_EMAIL in your env and re-run this script.
 *   3. It's idempotent — just fills in the missing membership.
 */
