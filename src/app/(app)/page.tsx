'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/nav/app-header';
import { Countdown } from '@/components/today/countdown';
import { useTrip } from '@/lib/trip-context';
import { useTripCollection, orderBy } from '@/lib/use-collection';
import type { StopDoc, ReservationDoc } from '@/types/domain';

/**
 * Today / Dashboard — pre-trip variant, live from Firestore.
 * Counts and the "next to book" list are derived from the seeded trip via
 * onSnapshot, so edits by either user show up in real time.
 */

function fmtRange(startsOn?: string, endsOn?: string) {
  if (!startsOn || !endsOn) return '';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = new Date(`${startsOn}T00:00:00`).toLocaleDateString('en-US', opts);
  const end = new Date(`${endsOn}T00:00:00`).toLocaleDateString('en-US', {
    ...opts,
    year: 'numeric',
  });
  return `${start} – ${end}`;
}

function fmtDue(startsAt?: { toDate: () => Date } | null) {
  if (!startsAt) return null;
  try {
    return startsAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

export default function TodayPage() {
  const { trip, tripId, loading, empty } = useTrip();
  const { docs: stops } = useTripCollection<StopDoc>(tripId, 'stops', orderBy('orderIdx'));
  const { docs: reservations } = useTripCollection<ReservationDoc>(tripId, 'reservations');

  if (loading) {
    return (
      <>
        <AppHeader section="Today" />
        <main className="space-y-4 px-5 py-5">
          <div className="h-44 animate-pulse rounded-card bg-surface" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-surface" />
            ))}
          </div>
          <div className="h-56 animate-pulse rounded-card bg-surface" />
        </main>
      </>
    );
  }

  if (empty || !trip) {
    return (
      <>
        <AppHeader section="Today" />
        <main className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
          <h1 className="font-display text-xl font-semibold text-text">No trip yet</h1>
          <p className="mt-2 max-w-xs text-sm text-text-dim">
            Your account isn&apos;t linked to a trip. Once you&apos;re added as a
            member, it&apos;ll show up here.
          </p>
        </main>
      </>
    );
  }

  const activeStops = stops.filter((s) => s.status !== 'cancelled');
  const confirmedStops = activeStops.filter((s) => s.status === 'confirmed');
  const activeRes = reservations.filter((r) => r.status !== 'cancelled');
  const booked = activeRes.filter((r) => r.status === 'booked' || r.status === 'completed');
  const toBook = activeRes
    .filter((r) => r.status === 'to_book')
    .sort((a, b) => (a.startsAt?.seconds ?? Infinity) - (b.startsAt?.seconds ?? Infinity));

  const stopById = new Map(stops.map((s) => [s.id, s.city]));

  return (
    <>
      <AppHeader section="Today" />

      <main className="space-y-4 px-5 py-5">
        {/* Countdown hero */}
        <section className="rounded-card border border-border bg-surface p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Departure
              </p>
              <p className="mt-0.5 font-display text-lg font-semibold text-text">
                Germany · France · Switzerland
              </p>
            </div>
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary">
              {fmtRange(trip.startsOn, trip.endsOn)}
            </span>
          </div>
          <Countdown startsOn={trip.startsOn} />
        </section>

        {/* Trip status strip */}
        <section className="grid grid-cols-3 gap-3">
          <StatTile
            value={`${confirmedStops.length}`}
            label="Stops confirmed"
            tone="confirmed"
          />
          <StatTile
            value={`${booked.length}/${activeRes.length}`}
            label="Bookings"
            tone="primary"
          />
          <StatTile value={`${toBook.length}`} label="Still to book" tone="warning" />
        </section>

        {/* Next to book */}
        <section className="rounded-card border border-border bg-surface p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-text">Next to book</h2>
            <Link href="/reservations" className="text-xs font-medium text-primary">
              All bookings →
            </Link>
          </div>
          {toBook.length === 0 ? (
            <p className="py-3 text-sm text-text-mute">
              Everything&apos;s booked. Nice.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {toBook.slice(0, 4).map((item) => {
                const due = fmtDue(item.startsAt);
                return (
                  <li key={item.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{item.name}</p>
                      <p className="text-xs text-text-mute">
                        {(item.stopId && stopById.get(item.stopId)) || 'Trip-wide'}
                      </p>
                    </div>
                    {due && (
                      <span className="ml-3 shrink-0 rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-medium text-warning">
                        {due}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Ask the companion */}
        <Link
          href="/chat"
          className="flex items-center justify-between rounded-card border border-primary/30 bg-primary-soft p-4 transition-colors hover:border-primary/50"
        >
          <div>
            <p className="font-display text-sm font-semibold text-text">
              Ask your trip companion
            </p>
            <p className="text-xs text-text-dim">
              Plan a day, find a restaurant, check the weather.
            </p>
          </div>
          <span className="text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </Link>
      </main>
    </>
  );
}

function StatTile({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: 'confirmed' | 'primary' | 'warning';
}) {
  const color =
    tone === 'confirmed'
      ? 'text-confirmed'
      : tone === 'warning'
        ? 'text-warning'
        : 'text-primary';
  return (
    <div className="rounded-card border border-border bg-surface p-3 shadow-card">
      <p className={`font-mono text-2xl font-semibold ${color}`}>{value}</p>
      <p className="mt-1 text-[11px] font-medium text-text-mute">{label}</p>
    </div>
  );
}
