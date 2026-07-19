'use client';

import dynamic from 'next/dynamic';
import { AppHeader } from '@/components/nav/app-header';
import { useTrip } from '@/lib/trip-context';
import { useTripCollection, orderBy } from '@/lib/use-collection';
import type { StopDoc, ReservationDoc } from '@/types/domain';

// MapLibre reads `window` on import, so load the map client-only.
const RouteMap = dynamic(
  () => import('@/components/map/route-map').then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    ),
  }
);

export default function MapPage() {
  const { tripId } = useTrip();
  const { docs: stops } = useTripCollection<StopDoc>(tripId, 'stops', orderBy('orderIdx'));
  const { docs: reservations } = useTripCollection<ReservationDoc>(tripId, 'reservations');

  const bookingCounts = reservations.reduce<Record<string, number>>((acc, r) => {
    if (r.stopId && r.status !== 'cancelled') acc[r.stopId] = (acc[r.stopId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <AppHeader section="Map" />
      {/* Fill the space between the sticky header and fixed nav. The -mb-24
          cancels the app column's pb-24 so the map doesn't overflow. */}
      <div className="-mb-24 h-[calc(100dvh-8.5rem)] w-full overflow-hidden">
        <RouteMap stops={stops} bookingCounts={bookingCounts} />
      </div>
    </>
  );
}
