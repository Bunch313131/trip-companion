'use client';

const TYPE_EMOJI: Record<string, string> = {
  flight: '✈️',
  hotel: '🏨',
  rail: '🚆',
  car: '🚗',
  ticket: '🎫',
  restaurant: '🍽️',
  activity: '🎟️',
  other: '📄',
};

export type TicketRef = {
  id: string;
  name: string;
  type: string;
  time: string | null;
  documentUrl: string;
  note?: string | null;
};

/**
 * The right ticket, at the right time. Surfaces every document you'll need
 * today as a big tap target — a boat ticket, a museum pass, a hotel
 * confirmation — so it's one tap away when you're standing at the gate.
 */
export function TodayTickets({ tickets }: { tickets: TicketRef[] }) {
  if (tickets.length === 0) return null;

  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text">
        <span>🎫</span> Tickets &amp; documents for today
      </h2>
      <div className="space-y-2">
        {tickets.map((t) => (
          <a
            key={t.id}
            href={t.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5 transition-colors hover:border-primary/50"
          >
            <span className="text-xl leading-none" aria-hidden>
              {TYPE_EMOJI[t.type] ?? '📄'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{t.name}</p>
              <p className="text-[11px] text-text-mute">
                {t.time ? `${t.time} · ` : ''}
                {t.note ?? 'Tap to open'}
              </p>
            </div>
            <span className="shrink-0 text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
