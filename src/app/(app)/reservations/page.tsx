'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/nav/app-header';
import { ReservationItem } from '@/components/reservations/reservation-item';
import { ReservationForm } from '@/components/reservations/reservation-form';
import { useTrip } from '@/lib/trip-context';
import { useAuth } from '@/lib/auth-context';
import { useTripCollection, orderBy } from '@/lib/use-collection';
import { patchReservation } from '@/lib/mutations';
import { flag } from '@/lib/format';
import type { StopDoc, ReservationDoc, WithId } from '@/types/domain';

function sortByStart(a: WithId<ReservationDoc>, b: WithId<ReservationDoc>) {
  return (a.startsAt?.seconds ?? Infinity) - (b.startsAt?.seconds ?? Infinity);
}

export default function ReservationsPage() {
  const { tripId, loading } = useTrip();
  const { user } = useAuth();
  const { docs: stops } = useTripCollection<StopDoc>(tripId, 'stops', orderBy('orderIdx'));
  const { docs: reservations, loading: resLoading } = useTripCollection<ReservationDoc>(
    tripId,
    'reservations'
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WithId<ReservationDoc> | null>(null);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(r: WithId<ReservationDoc>) {
    setEditing(r);
    setFormOpen(true);
  }

  if (loading || resLoading) {
    return (
      <>
        <AppHeader section="Bookings" />
        <main className="space-y-3 px-5 py-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-card bg-surface" />
          ))}
        </main>
      </>
    );
  }

  const active = reservations.filter((r) => r.status !== 'cancelled');
  const toBook = active.filter((r) => r.status === 'to_book').sort(sortByStart);
  const tripWide = active.filter((r) => !r.stopId && r.status !== 'to_book').sort(sortByStart);

  return (
    <>
      <AppHeader section="Bookings" />
      <main className="space-y-5 px-5 py-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-dim">
            {active.length} bookings · <span className="text-warning">{toBook.length} to book</span>
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-ink"
          >
            + Add
          </button>
        </div>

        {/* To book — surfaced first */}
        {toBook.length > 0 && (
          <Group title="Still to book" accent>
            {toBook.map((r) => (
              <ReservationItem
                key={r.id}
                res={r}
                onEdit={() => openEdit(r)}
                onMarkBooked={
                  user && tripId
                    ? () => patchReservation(tripId, r.id, user.uid, { status: 'booked' })
                    : undefined
                }
              />
            ))}
          </Group>
        )}

        {/* Trip-wide (flights, car) */}
        {tripWide.length > 0 && (
          <Group title="Trip-wide">
            {tripWide.map((r) => (
              <ReservationItem key={r.id} res={r} onEdit={() => openEdit(r)} />
            ))}
          </Group>
        )}

        {/* Per stop */}
        {stops
          .filter((s) => s.status !== 'cancelled')
          .map((stop) => {
            const items = active
              .filter((r) => r.stopId === stop.id && r.status !== 'to_book')
              .sort(sortByStart);
            if (items.length === 0) return null;
            return (
              <Group key={stop.id} title={`${stop.city} ${flag(stop.country)}`}>
                {items.map((r) => (
                  <ReservationItem key={r.id} res={r} onEdit={() => openEdit(r)} />
                ))}
              </Group>
            );
          })}

        {active.length === 0 && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <p className="font-display text-lg font-semibold text-text">No bookings yet</p>
            <p className="mt-1 text-sm text-text-dim">
              Flights, hotels, and tickets will show up here.
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-ink"
            >
              Add your first booking
            </button>
          </div>
        )}
      </main>

      {tripId && (
        <ReservationForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          tripId={tripId}
          stops={stops}
          existing={editing}
        />
      )}
    </>
  );
}

function Group({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${accent ? 'text-warning' : 'text-text-mute'}`}
      >
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
