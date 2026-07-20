'use client';

import { useGeolocation, distanceKm } from '@/lib/use-geolocation';
import { NavigateButton } from '@/components/ui/navigate-button';
import { flag } from '@/lib/format';
import type { StopDoc, WithId } from '@/types/domain';

/**
 * Opt-in location awareness. Until the user taps to enable it, this is just a
 * quiet prompt — no auto geolocation. Once granted, it orients you ("you're in
 * Munich") and offers one-tap navigation to your next stop.
 */
export function LocationBar({
  stops,
  nextNavQuery,
}: {
  stops: WithId<StopDoc>[];
  /** Place name to navigate to next (an activity/booking location). */
  nextNavQuery?: string | null;
}) {
  const geo = useGeolocation();

  const geocoded = stops.filter(
    (s) => s.status !== 'cancelled' && typeof s.lat === 'number' && typeof s.lng === 'number'
  );

  if (geo.status === 'unavailable' || geocoded.length === 0) return null;

  if (geo.status !== 'granted') {
    return (
      <button
        type="button"
        onClick={geo.request}
        disabled={geo.status === 'prompting'}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface px-4 py-2.5 text-xs font-medium text-text-dim transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-60"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        {geo.status === 'prompting'
          ? 'Getting your location…'
          : geo.status === 'denied'
            ? 'Location off — tap to try again'
            : 'Use my location'}
      </button>
    );
  }

  // Nearest geocoded stop to the user.
  const nearest = geocoded
    .map((s) => ({ stop: s, km: distanceKm(geo.lat!, geo.lng!, s.lat, s.lng) }))
    .sort((a, b) => a.km - b.km)[0];

  const near = nearest.km < 25;

  return (
    <section className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-2.5 shadow-card">
      <span className="text-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-text">
        {near ? (
          <>
            You&apos;re in {nearest.stop.city} {flag(nearest.stop.country)}
          </>
        ) : (
          <>
            {Math.round(nearest.km)} km from {nearest.stop.city} {flag(nearest.stop.country)}
          </>
        )}
      </p>
      {nextNavQuery && <NavigateButton dest={{ query: nextNavQuery }} variant="icon" />}
    </section>
  );
}
