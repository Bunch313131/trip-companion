'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/nav/app-header';
import { CountdownHero, PresenceHero } from '@/components/today/today-hero';
import { NextUp } from '@/components/today/next-up';
import { WeatherCard } from '@/components/today/weather-card';
import { MorningBriefing } from '@/components/today/morning-briefing';
import { LocationBar } from '@/components/today/location-bar';
import { TodayTickets, type TicketRef } from '@/components/today/today-tickets';
import { TomorrowPeek } from '@/components/today/tomorrow-peek';
import { RemindersCard } from '@/components/today/reminders-card';
import { ReminderForm } from '@/components/reminders/reminder-form';
import { ScheduleRow, activityToEvent, reservationToEvent, type ScheduleEvent } from '@/components/schedule/schedule-row';
import { EventDetail, type EventSelection } from '@/components/schedule/event-detail';
import { prettyScope } from '@/components/open-items/open-item-row';
import { useTrip } from '@/lib/trip-context';
import { useTripCollection, orderBy } from '@/lib/use-collection';
import { flag } from '@/lib/format';
import { toISODate, getCurrentStop, tripDayNumber, totalTripDays, fmtTime, fmtDayLabel } from '@/lib/trip-logic';
import type { StopDoc, ReservationDoc, ActivityDoc, OpenItemDoc, ReminderDoc, WithId } from '@/types/domain';

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

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
  const { docs: reminders } = useTripCollection<ReminderDoc>(tripId, 'reminders');

  // ?date=YYYY-MM-DD previews any trip day (great before departure).
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  // Drill-in detail sheet for a tapped schedule row.
  const [selection, setSelection] = useState<EventSelection | null>(null);
  // Reminder add/edit sheet.
  const [reminderForm, setReminderForm] = useState<{ existing: WithId<ReminderDoc> | null } | null>(
    null
  );
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
  const tomorrowISO = toISODate(new Date(new Date(`${todayISO}T00:00:00`).getTime() + 86_400_000));
  const tomorrowEvents = allEvents
    .filter((e) => e.dateISO === tomorrowISO)
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
  const upcomingStops = geocoded
    .filter((s) => s.departOn >= todayISO)
    .sort((a, b) => a.arriveOn.localeCompare(b.arriveOn));
  const upcomingStop = upcomingStops[0];
  // Forecast each upcoming stop on the first day you'll be there (from today).
  const tripOutlookStops = upcomingStops.map((s) => ({
    id: s.id,
    city: s.city,
    lat: s.lat,
    lng: s.lng,
    date: s.arriveOn < todayISO ? todayISO : s.arriveOn,
  }));
  const weatherStop =
    currentStop && typeof currentStop.lat === 'number' ? currentStop : upcomingStop;
  const weatherDate =
    phase === 'during' ? todayISO : weatherStop ? weatherStop.arriveOn : todayISO;

  // Drill-in lookups + today's retrievable documents (tickets front-and-center).
  const resById = new Map(reservations.map((r) => [r.id, r]));
  const actById = new Map(activities.map((a) => [a.id, a]));
  function openEvent(e: ScheduleEvent) {
    if (e.isReservation) {
      const res = resById.get(e.id);
      if (res) setSelection({ type: 'reservation', res });
    } else {
      const act = actById.get(e.id);
      if (act) setSelection({ type: 'activity', act });
    }
  }

  const todayTickets: TicketRef[] = reservations
    .filter((r) => r.status !== 'cancelled' && r.documentUrl && todayEvents.some((e) => e.id === r.id))
    .map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      time: fmtTime(r.startsAt),
      documentUrl: r.documentUrl!,
      note: r.provider ?? null,
    }));
  // Include the current stop's lodging doc (needed throughout the stay).
  if (currentStop) {
    for (const r of reservations) {
      if (
        r.type === 'hotel' &&
        r.stopId === currentStop.id &&
        r.status !== 'cancelled' &&
        r.documentUrl &&
        !todayTickets.some((t) => t.id === r.id)
      ) {
        todayTickets.push({
          id: r.id,
          name: r.name,
          type: r.type,
          time: null,
          documentUrl: r.documentUrl,
          note: 'Where you’re staying',
        });
      }
    }
  }

  // Pre-trip status numbers.
  const activeStops = stops.filter((s) => s.status !== 'cancelled');
  const confirmedStops = activeStops.filter((s) => s.status === 'confirmed');
  const activeRes = reservations.filter((r) => r.status !== 'cancelled');
  const booked = activeRes.filter((r) => r.status === 'booked' || r.status === 'completed');
  const toBook = activeRes
    .filter((r) => r.status === 'to_book')
    .sort((a, b) => (a.startsAt?.seconds ?? Infinity) - (b.startsAt?.seconds ?? Infinity));
  const stopById = new Map(stops.map((s) => [s.id, s.city]));

  // Hero details.
  const countryCount = new Set(activeStops.map((s) => s.country)).size;
  const startLabel = new Date(`${trip.startsOn}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const orderedStops = [...activeStops].sort((a, b) => a.orderIdx - b.orderIdx);
  const stopIndex = currentStop ? orderedStops.findIndex((s) => s.id === currentStop.id) + 1 : 0;
  const presenceSubtitle = currentStop
    ? [
        `Day ${dayNum} of ${totalDays}`,
        stopIndex ? `Stop ${stopIndex} of ${orderedStops.length}` : null,
        currentStop.region,
      ]
        .filter(Boolean)
        .join(' · ')
    : `Day ${dayNum} of ${totalDays} · On the road`;

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
            <CountdownHero
              startsOn={trip.startsOn}
              originIata={trip.originIata}
              returnIata={trip.returnIata}
              startLabel={startLabel}
              totalDays={totalDays}
              stopCount={activeStops.length}
              countryCount={countryCount}
            />

            {weatherStop && (
              <WeatherCard
                lat={weatherStop.lat}
                lng={weatherStop.lng}
                dateISO={weatherDate}
                label={weatherStop.city}
                tripStops={tripOutlookStops}
              />
            )}

            <section className="grid grid-cols-3 gap-3">
              <StatTile value={`${confirmedStops.length}`} label="Stops confirmed" tone="confirmed" />
              <StatTile value={`${booked.length}/${activeRes.length}`} label="Bookings" tone="primary" />
              <StatTile value={`${toBook.length}`} label="Still to book" tone="warning" />
            </section>

            <NeedsAttention openTop={openTop} />

            <RemindersCard
              tripId={tripId!}
              reminders={reminders}
              todayISO={todayISO}
              onAdd={() => setReminderForm({ existing: null })}
              onEdit={(r) => setReminderForm({ existing: r })}
            />

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
            <PresenceHero
              city={currentStop ? currentStop.city : 'Travel day'}
              flagEmoji={currentStop ? flag(currentStop.country) : ''}
              subtitle={presenceSubtitle}
              lat={weatherStop?.lat}
              lng={weatherStop?.lng}
              dateISO={todayISO}
              weatherLabel={currentStop?.city ?? weatherStop?.city}
              tripStops={tripOutlookStops}
            />

            {tripId && <MorningBriefing tripId={tripId} dateISO={todayISO} />}

            <LocationBar stops={stops} nextNavQuery={nextEvent?.navQuery} />

            {nextEvent && <NextUp event={nextEvent} />}

            {todayEvents.length >= 3 && (
              <section className="flex items-center gap-3 rounded-[16px] border border-accent bg-accent-soft p-3.5">
                <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-base text-white">
                  ☺
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-text">Kid pacing today</p>
                  <p className="text-xs text-text-dim">
                    A full day — {todayEvents.length} things on. Pack snacks and plan a mid-afternoon
                    reset for the twins.
                  </p>
                </div>
              </section>
            )}

            <TodayTickets tickets={todayTickets} />

            <RemindersCard
              tripId={tripId!}
              reminders={reminders}
              todayISO={todayISO}
              onAdd={() => setReminderForm({ existing: null })}
              onEdit={(r) => setReminderForm({ existing: r })}
            />

            <section className="rounded-card border border-border bg-surface p-4 shadow-card">
              <h2 className="mb-2 font-display text-sm font-semibold text-text">Today&apos;s schedule</h2>
              {todayEvents.length === 0 ? (
                <p className="py-3 text-sm text-text-mute">Nothing scheduled — an open day.</p>
              ) : (
                <div>
                  {todayEvents.map((e) => (
                    <ScheduleRow key={e.id} event={e} onClick={() => openEvent(e)} />
                  ))}
                </div>
              )}
            </section>

            <TomorrowPeek
              events={tomorrowEvents}
              dayLabel={fmtDayLabel(tomorrowISO)}
              onEventClick={openEvent}
            />

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

      <EventDetail selection={selection} onClose={() => setSelection(null)} />

      {reminderForm && tripId && (
        <ReminderForm
          open
          onClose={() => setReminderForm(null)}
          tripId={tripId}
          stops={stops}
          existing={reminderForm.existing}
        />
      )}
    </>
  );
}

const KIND_ICON: Record<string, string> = {
  verify: 'M13 3L4 14h7l-1 7 9-11h-7z',
  resolve: 'M9.5 9a2.5 2.5 0 113.5 2.3c-.9.4-1.5 1-1.5 2M12 17h.01',
  confirm: 'M20 6L9 17l-5-5',
  decide: 'M12 4v6l3 4M8 20l4-4 4 4',
};
const KIND_TONE: Record<string, string> = {
  verify: 'bg-warning-soft text-warning',
  resolve: 'bg-primary-soft text-primary',
  confirm: 'bg-confirmed-soft text-confirmed',
  decide: 'bg-surface-2 text-text-dim',
};

function NeedsAttention({
  openTop,
}: {
  openTop: { id: string; description: string; priority: string; scope: string; kind: string }[];
}) {
  if (openTop.length === 0) return null;
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <h2 className="font-display text-[15px] font-semibold text-text">Needs your attention</h2>
        <Link href="/open-items" className="text-xs font-semibold text-primary">
          See all {openTop.length}
        </Link>
      </div>
      <div className="space-y-2.5">
        {openTop.slice(0, 4).map((item) => {
          const high = item.priority === 'high';
          return (
            <Link
              key={item.id}
              href="/open-items"
              className={`flex items-start gap-3 rounded-[14px] border border-border bg-surface p-3.5 shadow-card transition-colors hover:border-primary/40 ${
                high ? 'border-l-[3px] border-l-primary' : ''
              }`}
            >
              <span
                className={`mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] ${KIND_TONE[item.kind] ?? 'bg-surface-2 text-text-dim'}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                  <path d={KIND_ICON[item.kind] ?? KIND_ICON.decide} />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium leading-snug text-text">{item.description}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-text-mute">
                  <span className="font-mono uppercase tracking-wide">{item.kind}</span>
                  {prettyScope(item.scope) && (
                    <>
                      <span>·</span>
                      <span>{prettyScope(item.scope)}</span>
                    </>
                  )}
                  <span className={high ? 'font-semibold text-primary' : ''}>
                    · {high ? 'High' : item.priority === 'medium' ? 'Medium' : 'Low'}
                  </span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
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
