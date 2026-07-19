import { StatusPill } from '@/components/ui/status-pill';
import { flag, dateRange, nights, fmtDateTime, money } from '@/lib/format';
import type { StopDoc, ActivityDoc, ReservationDoc, WithId } from '@/types/domain';

const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-confirmed',
  tentative: 'bg-tentative',
  idea: 'bg-text-mute',
  draft: 'bg-text-mute',
  completed: 'bg-text-mute',
  cancelled: 'bg-text-mute',
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

export function StopCard({
  stop,
  index,
  activities,
  reservations,
}: {
  stop: WithId<StopDoc>;
  index: number;
  activities: WithId<ActivityDoc>[];
  reservations: WithId<ReservationDoc>[];
}) {
  const visibleActs = activities
    .filter((a) => a.status !== 'cancelled')
    .sort((a, b) => (a.startsAt?.seconds ?? Infinity) - (b.startsAt?.seconds ?? Infinity));
  const visibleRes = reservations.filter((r) => r.status !== 'cancelled');
  const dimmed = stop.status === 'cancelled' || stop.status === 'completed';

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
          <div>
            <h3 className="font-display text-base font-semibold text-text">
              {stop.city} <span className="ml-0.5">{flag(stop.country)}</span>
            </h3>
            <p className="mt-0.5 text-xs text-text-dim">
              {dateRange(stop.arriveOn, stop.departOn)} ·{' '}
              <span className="tnum">{nights(stop.arriveOn, stop.departOn)}</span> nights
              {stop.region ? ` · ${stop.region}` : ''}
            </p>
          </div>
        </div>
        <StatusPill status={stop.status} />
      </div>

      {/* Notes (lodging / parking often live here) */}
      {stop.notes && (
        <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-text-dim">
          {stop.notes}
        </p>
      )}

      {/* Reservations for this stop */}
      {visibleRes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {visibleRes.map((r) => {
            const when = fmtDateTime(r.startsAt, { time: r.type === 'restaurant' });
            const cost = money(r.costCents, r.costCurrency);
            return (
              <li key={r.id} className="flex items-center gap-2 text-xs">
                <svg
                  className="shrink-0 text-text-mute"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={RES_ICON[r.type] ?? RES_ICON.other} />
                </svg>
                <span className="truncate font-medium text-text">{r.name}</span>
                {when && <span className="tnum text-text-mute">{when}</span>}
                {cost && <span className="tnum ml-auto text-text-mute">{cost}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {/* Activities */}
      {visibleActs.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <ul className="space-y-1.5">
            {visibleActs.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-xs">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[a.status] ?? 'bg-text-mute'}`}
                />
                <span className={`truncate ${a.status === 'idea' ? 'text-text-dim' : 'text-text'}`}>
                  {a.title}
                </span>
                {fmtDateTime(a.startsAt, { time: true }) && (
                  <span className="tnum ml-auto shrink-0 text-text-mute">
                    {fmtDateTime(a.startsAt, { time: true })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
