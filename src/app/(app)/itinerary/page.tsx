'use client';

import { AppHeader } from '@/components/nav/app-header';
import { StopCard } from '@/components/itinerary/stop-card';
import { useTrip } from '@/lib/trip-context';
import { useTripCollection, orderBy } from '@/lib/use-collection';
import { dateRange } from '@/lib/format';
import type { StopDoc, ActivityDoc, ReservationDoc } from '@/types/domain';

export default function ItineraryPage() {
  const { trip, tripId, loading } = useTrip();
  const { docs: stops, loading: stopsLoading } = useTripCollection<StopDoc>(
    tripId,
    'stops',
    orderBy('orderIdx')
  );
  const { docs: activities } = useTripCollection<ActivityDoc>(tripId, 'activities');
  const { docs: reservations } = useTripCollection<ReservationDoc>(tripId, 'reservations');

  const visibleStops = stops.filter((s) => s.status !== 'cancelled');
  const confirmedCount = visibleStops.filter((s) => s.status === 'confirmed').length;

  if (loading || stopsLoading) {
    return (
      <>
        <AppHeader section="Trip" />
        <main className="space-y-4 px-5 py-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-card bg-surface" />
          ))}
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader section="Trip" />
      <main className="px-5 py-5">
        {/* Summary line */}
        {trip && visibleStops.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-text-dim">
              {visibleStops.length} stops · {dateRange(trip.startsOn, trip.endsOn)} ·{' '}
              <span className="text-confirmed">{confirmedCount} confirmed</span>
            </p>
            <p className="mt-0.5 text-[11px] text-text-mute">
              Tap any underlined field or the status pill to edit.
            </p>
          </div>
        )}

        {visibleStops.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <p className="font-display text-lg font-semibold text-text">No stops yet</p>
            <p className="mt-1 text-sm text-text-dim">
              Your itinerary will appear here as stops are added.
            </p>
          </div>
        ) : (
          <div className="relative">
            {visibleStops.map((stop, i) => (
              <StopCard
                key={stop.id}
                stop={stop}
                index={i + 1}
                tripId={tripId!}
                activities={activities.filter((a) => a.stopId === stop.id)}
                reservations={reservations.filter((r) => r.stopId === stop.id)}
                isLast={i === visibleStops.length - 1}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
