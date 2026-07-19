/**
 * App-wide constants.
 *
 * NOTE (Phase 1): the trip window is hard-coded here so the Today dashboard
 * can render a real countdown before Firebase is wired up. In Phase 2 this is
 * replaced by the live trip doc read via `onSnapshot`.
 */

export const TRIP = {
  name: 'Europe Family Trip 2026',
  slug: 'family-europe-2026',
  startsOn: '2026-07-24',
  endsOn: '2026-08-07',
} as const;

export type TripPhase = 'pre' | 'during' | 'post';

export function getTripPhase(todayISO: string): TripPhase {
  if (todayISO < TRIP.startsOn) return 'pre';
  if (todayISO > TRIP.endsOn) return 'post';
  return 'during';
}
