'use client';

import { useState } from 'react';
import { StatusSelect } from '@/components/ui/status-select';
import { StatusPill } from '@/components/ui/status-pill';
import { EditableText } from '@/components/ui/editable-text';
import { flag, nights } from '@/lib/format';
import { stopDays, fmtDayLabel } from '@/lib/trip-logic';
import {
  ScheduleRow,
  activityToEvent,
  reservationToEvent,
  type ScheduleEvent,
} from '@/components/schedule/schedule-row';
import { EventDetail, type EventSelection } from '@/components/schedule/event-detail';
import { ActivityForm } from '@/components/schedule/activity-form';
import { NavigateButton } from '@/components/ui/navigate-button';
import { patchStop } from '@/lib/mutations';
import { useAuth } from '@/lib/auth-context';
import type { StopDoc, ActivityDoc, ReservationDoc, WithId } from '@/types/domain';

const STOP_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'tentative', label: 'Tentative' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function StopCard({
  stop,
  index,
  activities,
  reservations,
  tripId,
  isLast = false,
  showFullDetail = false,
}: {
  stop: WithId<StopDoc>;
  index: number;
  activities: WithId<ActivityDoc>[];
  reservations: WithId<ReservationDoc>[];
  tripId: string;
  isLast?: boolean;
  showFullDetail?: boolean;
}) {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const editable = !!uid;
  const save = (changes: Record<string, unknown>) => patchStop(tripId, stop.id, uid, changes);

  // Drill-in detail + activity add/edit.
  const [selection, setSelection] = useState<EventSelection | null>(null);
  const [activityForm, setActivityForm] = useState<
    { existing: WithId<ActivityDoc> | null; date: string | null } | null
  >(null);

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

  const dimmed = stop.status === 'cancelled' || stop.status === 'completed';

  // Build the day-by-day schedule. Hotels are surfaced in the lodging line
  // above, so keep them out of the per-day rows to avoid duplication.
  const days = stopDays(stop.arriveOn, stop.departOn);
  // In "highlights" mode, hide the granular logistics (wake, drives, resets) —
  // keep bookings and the substantive activities. Full detail shows everything.
  const LOGISTICS = new Set(['transit', 'rest']);
  let events: ScheduleEvent[] = [
    ...reservations
      .filter((r) => r.status !== 'cancelled' && r.type !== 'hotel')
      .map(reservationToEvent),
    ...activities.filter((a) => a.status !== 'cancelled').map(activityToEvent),
  ];
  if (!showFullDetail) {
    events = events.filter((e) => e.isReservation || !LOGISTICS.has(e.kind ?? ''));
  }
  const byDay: Record<string, ScheduleEvent[]> = {};
  const unscheduled: ScheduleEvent[] = [];
  for (const e of events) {
    if (e.dateISO && days.includes(e.dateISO)) (byDay[e.dateISO] ??= []).push(e);
    else unscheduled.push(e);
  }
  Object.values(byDay).forEach((list) => list.sort((a, b) => a.seconds - b.seconds));
  unscheduled.sort((a, b) => a.title.localeCompare(b.title));

  // Lodging summary line — the hotel booking for this stop, if any.
  const hotel = reservations.find((r) => r.type === 'hotel' && r.status !== 'cancelled');
  const scheduledCount = Object.values(byDay).reduce((n, l) => n + l.length, 0);

  return (
    <div className={`flex gap-3 ${dimmed ? 'opacity-70' : ''}`}>
      {/* Timeline spine — colored node + connecting line */}
      <div className="flex w-7 shrink-0 flex-col items-center pt-1">
        <span
          className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: stop.color }}
        >
          {index}
        </span>
        {!isLast && <span className="mt-1.5 w-[2px] flex-1 rounded-full bg-border" />}
      </div>

      <article className="mb-3 min-w-0 flex-1 rounded-2xl border border-border bg-surface p-4 shadow-card">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-[17px] font-semibold text-text">
              <EditableText
                value={stop.city}
                onSave={(v) => save({ city: v })}
                editable={editable}
                ariaLabel="City"
                displayClassName="font-display text-[17px] font-semibold"
                placeholder="City"
              />
              <span className="ml-1 text-sm">{flag(stop.country)}</span>
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-1 font-mono text-xs text-text-dim">
              <EditableText
                value={stop.arriveOn}
                displayValue={shortDate(stop.arriveOn)}
                variant="date"
                onSave={(v) => save({ arriveOn: v })}
                editable={editable}
                ariaLabel="Arrival date"
                className="text-xs"
              />
              <span>–</span>
              <EditableText
                value={stop.departOn}
                displayValue={shortDate(stop.departOn)}
                variant="date"
                onSave={(v) => save({ departOn: v })}
                editable={editable}
                ariaLabel="Departure date"
                className="text-xs"
              />
              <span className="text-text-mute">
                · <span className="tnum">{nights(stop.arriveOn, stop.departOn)}</span> nights ·
              </span>
              <EditableText
                value={stop.region ?? ''}
                onSave={(v) => save({ region: v })}
                editable={editable}
                ariaLabel="Region"
                placeholder="Region"
                className="text-xs"
              />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusSelect
              value={stop.status}
              options={STOP_STATUS_OPTIONS}
              onSelect={(v) => save({ status: v })}
              editable={editable}
            />
            <NavigateButton dest={{ lat: stop.lat, lng: stop.lng, query: stop.city }} variant="icon" />
          </div>
        </div>

        {/* Lodging line */}
        {hotel && (
          <button
            type="button"
            onClick={() => setSelection({ type: 'reservation', res: hotel })}
            className="mt-3 flex w-full items-center gap-2 text-left text-[12.5px] text-text-dim transition-colors hover:text-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="shrink-0 text-primary">
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M15 9h.01M15 13h.01" />
            </svg>
            <span className="truncate">{hotel.name}</span>
            {hotel.documentUrl && (
              <span className="ml-auto shrink-0 rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Ticket
              </span>
            )}
          </button>
        )}

        {/* Notes */}
        {(editable || stop.notes) && (
          <div className="mt-2.5 text-xs leading-relaxed text-text-dim">
            <EditableText
              value={stop.notes ?? ''}
              onSave={(v) => save({ notes: v })}
              variant="textarea"
              editable={editable}
              ariaLabel="Notes"
              placeholder="Add notes — parking, reminders…"
              displayClassName="block whitespace-pre-line"
              className="text-xs"
            />
          </div>
        )}

        {/* Day-by-day schedule */}
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {days.map((day, i) => {
            const evs = byDay[day] ?? [];
            return (
              <div key={day}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-mute">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: stop.color }}
                    />
                    Day {i + 1} · {fmtDayLabel(day)}
                  </p>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setActivityForm({ existing: null, date: day })}
                      className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-soft"
                    >
                      + Add
                    </button>
                  )}
                </div>
                {evs.length > 0 ? (
                  evs.map((e) => <ScheduleRow key={e.id} event={e} onClick={() => openEvent(e)} />)
                ) : (
                  <p className="pl-3.5 text-xs text-text-mute">Open day</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Unscheduled ideas — as chips, not a text list */}
        {unscheduled.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-mute">
              Ideas &amp; unscheduled
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unscheduled.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => openEvent(e)}
                  className={`rounded-lg px-2.5 py-1 text-[11.5px] transition-colors ${
                    e.status === 'idea'
                      ? 'border border-dashed border-border text-text-mute hover:border-primary/50 hover:text-text'
                      : 'bg-surface-2 text-text hover:bg-primary-soft'
                  }`}
                >
                  {e.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer meta */}
        {scheduledCount === 0 && unscheduled.length === 0 && editable && (
          <button
            type="button"
            onClick={() => setActivityForm({ existing: null, date: days[0] ?? null })}
            className="mt-3 w-full rounded-lg border border-dashed border-border py-2 text-xs font-medium text-primary transition-colors hover:border-primary/50"
          >
            + Add the first activity
          </button>
        )}

        {/* Drill-in detail + activity add/edit */}
        <EventDetail
          selection={selection}
          onClose={() => setSelection(null)}
          onEditActivity={(act) => setActivityForm({ existing: act, date: null })}
        />
        {activityForm && (
          <ActivityForm
            open
            onClose={() => setActivityForm(null)}
            tripId={tripId}
            stopId={stop.id}
            defaultDateISO={activityForm.date}
            existing={activityForm.existing}
          />
        )}
      </article>
    </div>
  );
}

export { StatusPill };
