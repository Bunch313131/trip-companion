'use client';

import { useState } from 'react';
import { ScheduleRow, type ScheduleEvent } from '@/components/schedule/schedule-row';

/**
 * A collapsed peek at tomorrow's plan on the Today screen, so you can look
 * ahead and prep (early start, packing, weather) without leaving Today.
 * Expands to the full timed schedule.
 */
export function TomorrowPeek({
  events,
  dayLabel,
  onEventClick,
}: {
  events: ScheduleEvent[];
  dayLabel: string;
  onEventClick: (e: ScheduleEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  if (events.length === 0) return null;

  const firstTimed = events.find((e) => e.time);

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <div>
          <p className="font-display text-sm font-semibold text-text">Tomorrow · {dayLabel}</p>
          <p className="mt-0.5 text-xs text-text-mute">
            {events.length} {events.length === 1 ? 'thing' : 'things'}
            {firstTimed?.time ? ` · starts ${firstTimed.time}` : ''}
          </p>
        </div>
        <svg
          className={`shrink-0 text-text-mute transition-transform ${open ? 'rotate-180' : ''}`}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-border px-4 pb-2 pt-1">
          {events.map((e) => (
            <ScheduleRow key={e.id} event={e} onClick={() => onEventClick(e)} />
          ))}
        </div>
      )}
    </section>
  );
}
