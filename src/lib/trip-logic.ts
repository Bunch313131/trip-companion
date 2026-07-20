/**
 * Date/schedule helpers for the day-by-day itinerary and during-trip mode.
 * All day math is done in local time on ISO date strings (YYYY-MM-DD).
 */

type Timestampish = { toDate: () => Date; seconds?: number } | null | undefined;

/**
 * The trip's timezone. Germany, France, and Switzerland are all Central
 * European Time, so every scheduled time is shown in this zone regardless of
 * where the phone is — a 9:38 boat reads "9:38 AM" whether you're viewing from
 * California or standing in Lucerne. Without this, times render in the device
 * zone and look hours off when planning from home.
 */
export const TRIP_TZ = 'Europe/Berlin';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Inclusive list of ISO dates a stop spans (arrival through departure). */
export function stopDays(arriveOn: string, departOn: string): string[] {
  const days: string[] = [];
  const end = new Date(`${departOn}T00:00:00`);
  const d = new Date(`${arriveOn}T00:00:00`);
  while (d <= end) {
    days.push(toISODate(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** ISO date of a Firestore Timestamp, as seen in the trip's timezone — so an
 *  event buckets to the calendar day the traveler actually experiences it. */
export function isoDateOf(ts: Timestampish): string | null {
  if (!ts?.toDate) return null;
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TRIP_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(ts.toDate());
  } catch {
    return null;
  }
}

export function fmtTime(ts: Timestampish): string | null {
  if (!ts?.toDate) return null;
  try {
    return ts.toDate().toLocaleTimeString('en-US', {
      timeZone: TRIP_TZ,
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

/** "Sat, Jul 27" */
export function fmtDayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getCurrentStop<T extends { arriveOn: string; departOn: string; status?: string }>(
  stops: T[],
  todayISO: string
): T | undefined {
  const matches = stops.filter(
    (s) => s.status !== 'cancelled' && todayISO >= s.arriveOn && todayISO <= s.departOn
  );
  // On a transition day (leaving one stop, arriving at the next), prefer the
  // stop you're arriving at — that's where the day ends.
  return matches.sort((a, b) => b.arriveOn.localeCompare(a.arriveOn))[0];
}

function dayDiff(fromISO: string, toISO: string): number {
  const ms =
    new Date(`${toISO}T00:00:00`).getTime() - new Date(`${fromISO}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

/** Day X of the trip (1-based) for a given date. */
export function tripDayNumber(startsOn: string, todayISO: string): number {
  return dayDiff(startsOn, todayISO) + 1;
}

export function totalTripDays(startsOn: string, endsOn: string): number {
  return dayDiff(startsOn, endsOn) + 1;
}
