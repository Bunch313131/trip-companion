import { adminDb } from '@/lib/firebase-admin';
import { buildSystemPrompt } from '@/lib/ai-tools';

function todayISO(): string {
  // Server date; the trip is in Europe but day-granularity is fine here.
  return new Date().toISOString().slice(0, 10);
}

/**
 * Gathers current trip context from Firestore and builds the system prompt
 * the chat model sees on every request. Called server-side per message.
 */
export async function buildTripSystemPrompt(tripId: string): Promise<string> {
  const db = adminDb();
  const [tripSnap, stopsSnap, resSnap, actSnap] = await Promise.all([
    db.doc(`trips/${tripId}`).get(),
    db.collection(`trips/${tripId}/stops`).orderBy('orderIdx').get(),
    db.collection(`trips/${tripId}/reservations`).get(),
    db.collection(`trips/${tripId}/activities`).get(),
  ]);

  const trip = tripSnap.data() ?? {};
  const today = todayISO();

  const stops = stopsSnap.docs
    .map((d) => {
      const s = d.data();
      return {
        id: d.id,
        city: s.city as string,
        arrive_on: s.arriveOn as string,
        depart_on: s.departOn as string,
        status: s.status as string,
        notes: (s.notes as string) ?? null,
      };
    })
    .filter((s) => s.status !== 'cancelled');

  const currentStop = stops.find((s) => today >= s.arrive_on && today <= s.depart_on);

  const recent_reservations = resSnap.docs
    .map((d) => {
      const r = d.data();
      return {
        id: d.id,
        type: r.type as string,
        name: r.name as string,
        status: r.status as string,
        starts_at: r.startsAt?.toDate ? r.startsAt.toDate().toISOString() : null,
      };
    })
    .filter((r) => r.status !== 'cancelled');

  const activities = actSnap.docs
    .map((d) => {
      const a = d.data();
      return {
        id: d.id,
        title: a.title as string,
        kind: a.kind as string,
        status: a.status as string,
        starts_at: a.startsAt?.toDate ? a.startsAt.toDate().toISOString() : null,
        stop_id: (a.stopId as string) ?? null,
      };
    })
    .filter((a) => a.status !== 'cancelled');

  return buildSystemPrompt({
    trip: {
      name: (trip.name as string) ?? 'Trip',
      starts_on: (trip.startsOn as string) ?? '',
      ends_on: (trip.endsOn as string) ?? '',
      status: (trip.status as string) ?? 'planning',
    },
    stops,
    today,
    current_stop_id: currentStop?.id,
    recent_reservations,
    activities,
  });
}
