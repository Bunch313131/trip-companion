'use client';

import { useEffect, useState } from 'react';
import { NavigateButton } from '@/components/ui/navigate-button';
import type { ScheduleEvent } from '@/components/schedule/schedule-row';

function relative(targetMs: number, nowMs: number): string {
  const diff = targetMs - nowMs;
  if (diff <= 0) return 'now';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 24) return rem ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
  const days = Math.round(hrs / 24);
  return `in ${days}d`;
}

/**
 * The single most-viewed element during the trip: what's next, with a live
 * countdown that ticks each minute.
 */
export function NextUp({ event }: { event: ScheduleEvent }) {
  const targetMs = Number.isFinite(event.seconds) ? event.seconds * 1000 : null;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="rounded-card border border-primary/30 bg-primary-soft p-4 shadow-card">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Next up</p>
        {targetMs && now !== null && (
          <span className="tnum text-xs font-semibold text-primary">{relative(targetMs, now)}</span>
        )}
      </div>
      <p className="font-display text-base font-semibold text-text">{event.title}</p>
      <div className="mt-0.5 flex items-center gap-2 text-xs text-text-dim">
        {event.time && <span className="tnum">{event.time}</span>}
        {event.subtitle && <span>· {event.subtitle}</span>}
        {event.documentUrl && (
          <a
            href={event.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-primary"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16v4a2 2 0 000 4v4H4v-4a2 2 0 000-4z" />
            </svg>
            Ticket
          </a>
        )}
      </div>
      {event.navQuery && (
        <div className="mt-2.5">
          <NavigateButton dest={{ query: event.navQuery }} variant="chip" />
        </div>
      )}
    </section>
  );
}
