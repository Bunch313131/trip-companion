import { adminDb } from '@/lib/firebase-admin';
import { buildSystemPrompt } from '@/lib/ai-tools';
import { weatherCode, cToF } from '@/lib/weather';

function todayISO(): string {
  // Server date; the trip is in Europe but day-granularity is fine here.
  return new Date().toISOString().slice(0, 10);
}

type StopLite = {
  id: string;
  city: string;
  arrive_on: string;
  depart_on: string;
  status: string;
  notes: string | null;
  lat?: number;
  lng?: number;
};

/**
 * Compact weather outlook for the current + upcoming stops (one multi-location
 * Open-Meteo call). Real data the model can plan around. Best-effort.
 */
async function weatherSummary(stops: StopLite[], today: string): Promise<string | null> {
  const geo = stops.filter(
    (s) =>
      s.status !== 'cancelled' &&
      typeof s.lat === 'number' &&
      typeof s.lng === 'number' &&
      s.depart_on >= today
  );
  if (!geo.length) return null;
  const params = new URLSearchParams({
    latitude: geo.map((s) => s.lat).join(','),
    longitude: geo.map((s) => s.lng).join(','),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '16',
  });
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [data];
    const lines = geo.map((s, i) => {
      const d = arr[i]?.daily;
      const date = s.arrive_on < today ? today : s.arrive_on;
      const idx = d?.time?.indexOf(date) ?? -1;
      const tmax = idx >= 0 ? d?.temperature_2m_max?.[idx] : null;
      const tmin = idx >= 0 ? d?.temperature_2m_min?.[idx] : null;
      if (!d || idx < 0 || tmax == null || tmin == null)
        return `- ${s.city} (${date}): forecast appears closer to the date`;
      const wx = weatherCode(d.weather_code[idx]);
      const hi = cToF(tmax);
      const lo = cToF(tmin);
      const pop = d.precipitation_probability_max?.[idx];
      return `- ${s.city} (${date}): ${wx.label}, ${hi}/${lo}°F${
        pop != null ? `, ${pop}% chance of rain` : ''
      }`;
    });
    return lines.join('\n');
  } catch {
    return null;
  }
}

/**
 * Gathers current trip context from Firestore and builds the system prompt
 * the chat model sees on every request. Called server-side per message.
 */
export async function buildTripSystemPrompt(tripId: string): Promise<string> {
  const db = adminDb();
  const [tripSnap, stopsSnap, resSnap, actSnap, openSnap, remSnap] = await Promise.all([
    db.doc(`trips/${tripId}`).get(),
    db.collection(`trips/${tripId}/stops`).orderBy('orderIdx').get(),
    db.collection(`trips/${tripId}/reservations`).get(),
    db.collection(`trips/${tripId}/activities`).get(),
    db.collection(`trips/${tripId}/openItems`).get(),
    db.collection(`trips/${tripId}/reminders`).get(),
  ]);

  const trip = tripSnap.data() ?? {};
  const today = todayISO();

  const stops: StopLite[] = stopsSnap.docs
    .map((d) => {
      const s = d.data();
      return {
        id: d.id,
        city: s.city as string,
        arrive_on: s.arriveOn as string,
        depart_on: s.departOn as string,
        status: s.status as string,
        notes: (s.notes as string) ?? null,
        lat: s.lat as number | undefined,
        lng: s.lng as number | undefined,
      };
    })
    .filter((s) => s.status !== 'cancelled');

  const currentStop = stops.find((s) => today >= s.arrive_on && today <= s.depart_on);

  const money = (cents?: number | null, cur?: string | null) =>
    cents == null
      ? null
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'EUR' }).format(
          cents / 100
        );

  const recent_reservations = resSnap.docs
    .map((d) => {
      const r = d.data();
      return {
        id: d.id,
        type: r.type as string,
        name: r.name as string,
        status: r.status as string,
        starts_at: r.startsAt?.toDate ? r.startsAt.toDate().toISOString() : null,
        confirmation: (r.confirmation as string) ?? null,
        address: (r.address as string) ?? null,
        provider: (r.provider as string) ?? null,
        cost: money(r.costCents, r.costCurrency),
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

  const open_items = openSnap.docs
    .map((d) => {
      const o = d.data();
      return {
        kind: o.kind as string,
        description: o.description as string,
        priority: o.priority as string,
        scope: o.scope as string,
        status: o.status as string,
      };
    })
    .filter((o) => o.status !== 'resolved');

  const reminders = remSnap.docs
    .map((d) => {
      const r = d.data();
      return {
        id: d.id,
        title: (r.title as string) ?? null,
        text: r.text as string,
        dateISO: (r.dateISO as string) ?? null,
        standing: !!r.standing,
        done: !!r.done,
      };
    })
    .filter((r) => !r.done);

  const weather = await weatherSummary(stops, today);

  return buildSystemPrompt({
    trip: {
      name: (trip.name as string) ?? 'Trip',
      starts_on: (trip.startsOn as string) ?? '',
      ends_on: (trip.endsOn as string) ?? '',
      status: (trip.status as string) ?? 'planning',
    },
    travelers: (trip.travelers as string) ?? null,
    stops,
    today,
    current_stop_id: currentStop?.id,
    recent_reservations,
    activities,
    open_items,
    reminders,
    weather,
  });
}
