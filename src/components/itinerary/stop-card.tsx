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
}: {
  stop: WithId<StopDoc>;
  index: number;
  activities: WithId<ActivityDoc>[];
  reservations: WithId<ReservationDoc>[];
  tripId: string;
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

  // Build the day-by-day schedule.
  const days = stopDays(stop.arriveOn, stop.departOn);
  const events: ScheduleEvent[] = [
    ...reservations.filter((r) => r.status !== 'cancelled').map(reservationToEvent),
    ...activities.filter((a) => a.status !== 'cancelled').map(activityToEvent),
  ];
  const byDay: Record<string, ScheduleEvent[]> = {};
  const unscheduled: ScheduleEvent[] = [];
  for (const e of events) {
    if (e.dateISO && days.includes(e.dateISO)) (byDay[e.dateISO] ??= []).push(e);
    else unscheduled.push(e);
  }
  Object.values(byDay).forEach((list) => list.sort((a, b) => a.seconds - b.seconds));
  unscheduled.sort((a, b) => a.title.localeCompare(b.title));

  return (
    <article
      className={`relative rounded-card border border-border bg-surface p-4 shadow-card ${dimmed ? 'opacity-70' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: stop.color }}
          >
            {index}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-text">
              <EditableText
                value={stop.city}
                onSave={(v) => save({ city: v })}
                editable={editable}
                ariaLabel="City"
                displayClassName="font-display text-base font-semibold"
                placeholder="City"
              />
              <span className="ml-0.5">{flag(stop.country)}</span>
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-text-dim">
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
              <span>
                · <span className="tnum">{nights(stop.arriveOn, stop.departOn)}</span> nights ·
              </span>
              <EditableText
                value={stop.region ?? ''}
                onSave={(v) => save({ region: v })}
                editable={editable}
                ariaLabel="Region"
                placeholder="Region"
              />
            </div>
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

      {/* Notes */}
      <div className="mt-3 text-xs leading-relaxed text-text-dim">
        <EditableText
          value={stop.notes ?? ''}
          onSave={(v) => save({ notes: v })}
          variant="textarea"
          editable={editable}
          ariaLabel="Notes"
          placeholder="Add notes — lodging, parking, reminders…"
          displayClassName="block whitespace-pre-line"
          className="text-xs"
        />
      </div>

      {/* Day-by-day schedule */}
      {days.map((day, i) => {
        const evs = byDay[day] ?? [];
        return (
          <div key={day} className="mt-2.5 border-t border-border pt-2">
            <div className="mb-0.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-mute">
                Day {i + 1} · {fmtDayLabel(day)}
              </p>
              {editable && (
                <button
                  type="button"
                  onClick={() => setActivityForm({ existing: null, date: day })}
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-soft"
                >
                  + Add
                </button>
              )}
            </div>
            {evs.length > 0 ? (
              evs.map((e) => <ScheduleRow key={e.id} event={e} onClick={() => openEvent(e)} />)
            ) : (
              <p className="py-1 pl-1 text-xs text-text-mute">Open day</p>
            )}
          </div>
        );
      })}

      {/* Unscheduled ideas */}
      {unscheduled.length > 0 && (
        <div className="mt-2.5 border-t border-border pt-2">
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-mute">
            Ideas &amp; unscheduled
          </p>
          {unscheduled.map((e) => (
            <ScheduleRow key={e.id} event={e} onClick={() => openEvent(e)} />
          ))}
        </div>
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
  );
}

export { StatusPill };
