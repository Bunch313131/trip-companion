'use client';

import { fmtTime, isoDateOf } from '@/lib/trip-logic';
import { reservationNavQuery } from '@/lib/maps';
import { NavigateButton } from '@/components/ui/navigate-button';
import type { ActivityDoc, ReservationDoc, WithId } from '@/types/domain';

export type ScheduleEvent = {
  id: string;
  seconds: number; // for sorting within a day
  time: string | null;
  title: string;
  subtitle?: string | null;
  status: string;
  documentUrl?: string | null;
  isReservation: boolean;
  dateISO: string | null;
  navQuery?: string | null;
  kind?: string; // activity kind / reservation type, for the icon
};

const RES_ICON: Record<string, string> = {
  hotel: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6',
  flight: 'M2 12l9-2V4a1 1 0 012 0v6l9 2v2l-9-1.5V19l2 1.5V22l-4-1-4 1v-1.5L9 19v-4.5L2 14z',
  rail: 'M6 3h12v11H6zM6 14l-2 5m14-5l2 5M9 18h6',
  car: 'M4 12l2-5h12l2 5v6H4zM7 18v2M17 18v2',
  ticket: 'M4 6h16v4a2 2 0 000 4v4H4v-4a2 2 0 000-4z',
  restaurant: 'M5 3v8a2 2 0 004 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9',
  activity: 'M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z',
  other: 'M4 4h16v16H4z',
};

const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-confirmed',
  booked: 'bg-confirmed',
  tentative: 'bg-tentative',
  to_book: 'bg-warning',
  idea: 'bg-text-mute',
  in_progress: 'bg-primary',
};

export function reservationToEvent(r: WithId<ReservationDoc>): ScheduleEvent {
  const tz = r.tz ?? undefined;
  return {
    id: r.id,
    seconds: r.startsAt?.seconds ?? Infinity,
    time: fmtTime(r.startsAt, tz),
    title: r.name,
    subtitle: r.provider ?? null,
    status: r.status,
    documentUrl: r.documentUrl ?? null,
    isReservation: true,
    dateISO: isoDateOf(r.startsAt, tz),
    navQuery: reservationNavQuery(r.type, r.name, r.address),
    kind: r.type,
  };
}

export function activityToEvent(a: WithId<ActivityDoc>): ScheduleEvent {
  return {
    id: a.id,
    seconds: a.startsAt?.seconds ?? Infinity,
    time: fmtTime(a.startsAt),
    title: a.title,
    subtitle: a.location ?? null,
    status: a.status,
    documentUrl: null,
    isReservation: false,
    dateISO: isoDateOf(a.startsAt),
    navQuery: a.location || a.title,
    kind: a.kind,
  };
}

export function ScheduleRow({ event, onClick }: { event: ScheduleEvent; onClick?: () => void }) {
  const iconPath = event.isReservation
    ? RES_ICON[event.kind ?? 'other'] ?? RES_ICON.other
    : RES_ICON.activity;
  const dimmed = event.status === 'cancelled' || event.status === 'completed';

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-2.5 rounded-md py-1.5 ${dimmed ? 'opacity-60' : ''} ${
        onClick ? '-mx-1 cursor-pointer px-1 transition-colors hover:bg-surface-2' : ''
      }`}
    >
      {/* Time gutter */}
      <div className="w-14 shrink-0 whitespace-nowrap pt-0.5 text-right">
        {event.time ? (
          <span className="tnum text-[10.5px] font-medium text-text-dim">{event.time}</span>
        ) : (
          <span className="text-[11px] text-text-mute">—</span>
        )}
      </div>

      {/* Icon */}
      <span className="mt-0.5 shrink-0 text-text-mute">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d={iconPath} />
        </svg>
      </span>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <span
            className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[event.status] ?? 'bg-text-mute'}`}
          />
          <p className={`min-w-0 flex-1 text-sm leading-snug ${event.status === 'idea' ? 'text-text-dim' : 'text-text'}`}>
            {event.title}
          </p>
          <div className="flex shrink-0 items-center gap-1 pt-0.5">
            {event.documentUrl && (
              <a
                href={event.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary"
                title="Open document"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 6h16v4a2 2 0 000 4v4H4v-4a2 2 0 000-4z" />
                </svg>
                Ticket
              </a>
            )}
            {event.navQuery && <NavigateButton dest={{ query: event.navQuery }} variant="icon" />}
          </div>
        </div>
        {event.subtitle && <p className="pl-3 text-[11px] text-text-mute">{event.subtitle}</p>}
      </div>
    </div>
  );
}
