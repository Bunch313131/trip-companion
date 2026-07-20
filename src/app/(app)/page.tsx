'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/nav/app-header';
import { Countdown } from '@/components/today/countdown';
import { NextUp } from '@/components/today/next-up';
import { WeatherCard } from '@/components/today/weather-card';
import { MorningBriefing } from '@/components/today/morning-briefing';
import { LocationBar } from '@/components/today/location-bar';
import { ScheduleRow, activityToEvent, reservationToEvent, type ScheduleEvent } from '@/components/schedule/schedule-row';
import { prettyScope } from '@/components/open-items/open-item-row';
import { useTrip } from '@/lib/trip-context';
import { useTripCollection, orderBy } from '@/lib/use-collection';
import { flag } from '@/lib/format';
import { toISODate, getCurrentStop, tripDayNumber, totalTripDays } from '@/lib/trip-logic';
import type { StopDoc, ReservationDoc, ActivityDoc, OpenItemDoc } from '@/types/domain';

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function fmtRange(startsOn?: string, endsOn?: string) {
  if (!startsOn || !endsOn) return '';
  const o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = new Date(`${startsOn}T00:00:00`).toLocaleDateString('en-US', o);
  const e = new Date(`${endsOn}T00:00:00`).toLocaleDateString('en-US', { ...o, year: 'numeric' });
  return `${s} – ${e}`;
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
  const { docs: activities } = useTripCollection<ActivityDoc>(tripId, 'activities');
  const { docs: openItems } = useTripCollection<OpenItemDoc>(tripId, 'openItems');

  // ?date=YYYY-MM-DD previews any trip day (great before departure).
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('date');
    if (p) setDateOverride(p);
  }, []);

  if (loading) {
    return (
      <>
        <AppHeader section="Today" />
        <main className="space-y-4 px-5 py-5">
          <div className="h-44 animate-pulse rounded-card bg-surface" />
          <div className="h-40 animate-pulse rounded-card bg-surface" />
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
            Once you&apos;re added as a member, your trip shows up here.
          </p>
        </main>
      </>
    );
  }

  const todayISO = dateOverride || toISODate(new Date());
  const phase = todayISO < trip.startsOn ? 'pre' : todayISO > trip.endsOn ? 'post' : 'during';

  const openTop = openItems
    .filter((i) => i.status !== 'resolved')
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1));

  const allEvents: ScheduleEvent[] = [
    ...reservations.filter((r) => r.status !== 'cancelled').map(reservationToEvent),
    ...activities.filter((a) => a.status !== 'cancelled').map(activityToEvent),
  ];
  const todayEvents = allEvents
    .filter((e) => e.dateISO === todayISO)
    .sort((a, b) => a.seconds - b.seconds);
  const nowMs = dateOverride ? new Date(`${todayISO}T00:00:00`).getTime() : Date.now();
  const nextEvent = allEvents
    .filter((e) => Number.isFinite(e.seconds) && e.seconds * 1000 >= nowMs)
    .sort((a, b) => a.seconds - b.seconds)[0];

  const currentStop = getCurrentStop(stops, todayISO);
  const dayNum = tripDayNumber(trip.startsOn, todayISO);
  const totalDays = totalTripDays(trip.startsOn, trip.endsOn);

  // Weather target: where you are today (or, before the trip / on travel days,
  // the next stop you're heading to). Only stops with real coordinates qualify.
  const geocoded = stops.filter(
    (s) => s.status !== 'cancelled' && typeof s.lat === 'number' && typeof s.lng === 'number'
  );
  const upcomingStop = geocoded
    .filter((s) => s.departOn >= todayISO)
    .sort((a, b) => a.arriveOn.localeCompare(b.arriveOn))[0];
  const weatherStop =
    currentStop && typeof currentStop.lat === 'number' ? currentStop : upcomingStop;
  const weatherDate =
    phase === 'during' ? todayISO : weatherStop ? weatherStop.arriveOn : todayISO;

  // Pre-trip status numbers.
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
        {dateOverride && (
          <Link
            href="/"
            className="block rounded-lg border border-primary/30 bg-primary-soft px-3 py-1.5 text-center text-[11px] font-medium text-primary"
          >
            Previewing {todayISO} · tap to exit preview
          </Link>
        )}

        {/* ───────────── PRE-TRIP ───────────── */}
        {phase === 'pre' && (
          <>
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

            {weatherStop && (
              <WeatherCard
                lat={weatherStop.lat}
                lng={weatherStop.lng}
                dateISO={weatherDate}
                label={weatherStop.city}
              />
            )}

            <section className="grid grid-cols-3 gap-3">
              <StatTile value={`${confirmedStops.length}`} label="Stops confirmed" tone="confirmed" />
              <StatTile value={`${booked.length}/${activeRes.length}`} label="Bookings" tone="primary" />
              <StatTile value={`${toBook.length}`} label="Still to book" tone="warning" />
            </section>

            <NeedsAttention openTop={openTop} />

            <section className="rounded-card border border-border bg-surface p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-text">Next to book</h2>
                <Link href="/reservations" className="text-xs font-medium text-primary">
                  All bookings →
                </Link>
              </div>
              {toBook.length === 0 ? (
                <p className="py-3 text-sm text-text-mute">Everything&apos;s booked. Nice.</p>
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
          </>
        )}

        {/* ───────────── DURING TRIP ───────────── */}
        {phase === 'during' && (
          <>
            <section className="rounded-card border border-border bg-surface p-5 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Day {dayNum} of {totalDays}
              </p>
              <p className="mt-0.5 font-display text-2xl font-bold tracking-tight text-text">
                {currentStop ? (
                  <>
                    {currentStop.city} <span className="text-lg">{flag(currentStop.country)}</span>
                  </>
                ) : (
                  'Travel day'
                )}
              </p>
              {currentStop?.region && (
                <p className="text-sm text-text-dim">{currentStop.region}</p>
              )}
            </section>

            {weatherStop && (
              <WeatherCard
                lat={weatherStop.lat}
                lng={weatherStop.lng}
                dateISO={weatherDate}
                label={currentStop ? undefined : weatherStop.city}
              />
            )}

            {tripId && <MorningBriefing tripId={tripId} dateISO={todayISO} />}

            <LocationBar stops={stops} nextNavQuery={nextEvent?.navQuery} />

            {nextEvent && <NextUp event={nextEvent} />}

            <section className="rounded-card border border-border bg-surface p-4 shadow-card">
              <h2 className="mb-2 font-display text-sm font-semibold text-text">Today&apos;s schedule</h2>
              {todayEvents.length === 0 ? (
                <p className="py-3 text-sm text-text-mute">Nothing scheduled — an open day.</p>
              ) : (
                <div>
                  {todayEvents.map((e) => <ScheduleRow key={e.id} event={e} />)}
                </div>
              )}
            </section>

            <NeedsAttention openTop={openTop} />
          </>
        )}

        {/* ───────────── POST TRIP ───────────── */}
        {phase === 'post' && (
          <section className="rounded-card border border-border bg-surface p-6 text-center shadow-card">
            <p className="font-display text-2xl font-bold text-text">You did it 🎉</p>
            <p className="mt-1 text-sm text-text-dim">
              {totalDays} days · {activeStops.length} stops across Germany, France & Switzerland.
            </p>
            <p className="mt-3 text-xs text-text-mute">
              Your trip is preserved here — searchable any time.
            </p>
          </section>
        )}

        {/* Companion CTA (all phases) */}
        <Link
          href="/chat"
          className="flex items-center justify-between rounded-card border border-primary/30 bg-primary-soft p-4 transition-colors hover:border-primary/50"
        >
          <div>
            <p className="font-display text-sm font-semibold text-text">Ask your trip companion</p>
            <p className="text-xs text-text-dim">
              {phase === 'during'
                ? 'Running behind? Reshuffle today, find dinner nearby.'
                : 'Plan a day, find a restaurant, check the weather.'}
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

function NeedsAttention({ openTop }: { openTop: { id: string; description: string; priority: string; scope: string }[] }) {
  if (openTop.length === 0) return null;
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-text">Needs attention</h2>
        <Link href="/open-items" className="text-xs font-medium text-primary">
          {openTop.length > 3 ? `View all ${openTop.length} →` : 'View all →'}
        </Link>
      </div>
      <ul className="space-y-2.5">
        {openTop.slice(0, 3).map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.priority === 'high' ? 'bg-warning' : 'bg-tentative'}`}
            />
            <div className="min-w-0">
              <p className="text-sm leading-snug text-text">{item.description}</p>
              {prettyScope(item.scope) && (
                <p className="text-[11px] text-text-mute">{prettyScope(item.scope)}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
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
    tone === 'confirmed' ? 'text-confirmed' : tone === 'warning' ? 'text-warning' : 'text-primary';
  return (
    <div className="rounded-card border border-border bg-surface p-3 shadow-card">
      <p className={`font-mono text-2xl font-semibold ${color}`}>{value}</p>
      <p className="mt-1 text-[11px] font-medium text-text-mute">{label}</p>
    </div>
  );
}
