'use client';

import { toast } from 'sonner';
import { StatusPill } from '@/components/ui/status-pill';
import { fmtDateTime, money } from '@/lib/format';
import type { ReservationDoc, WithId } from '@/types/domain';

const ICON: Record<string, string> = {
  hotel: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6',
  flight: 'M2 12l9-2V4a1 1 0 012 0v6l9 2v2l-9-1.5V19l2 1.5V22l-4-1-4 1v-1.5L9 19v-4.5L2 14z',
  rail: 'M6 3h12v11H6zM6 14l-2 5m14-5l2 5M9 18h6',
  car: 'M4 12l2-5h12l2 5v6H4zM7 18v2M17 18v2',
  ticket: 'M4 6h16v4a2 2 0 000 4v4H4v-4a2 2 0 000-4z',
  restaurant: 'M5 3v8a2 2 0 004 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9',
  activity: 'M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z',
  other: 'M4 4h16v16H4z',
};

export function ReservationItem({ res }: { res: WithId<ReservationDoc> }) {
  const when = fmtDateTime(res.startsAt, { time: res.type !== 'hotel' });
  const cost = money(res.costCents, res.costCurrency);
  const dimmed = res.status === 'cancelled' || res.status === 'completed';

  async function copyConfirmation() {
    if (!res.confirmation) return;
    try {
      await navigator.clipboard.writeText(res.confirmation);
      toast.success('Confirmation copied');
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <div className={`rounded-card border border-border bg-surface p-3.5 shadow-card ${dimmed ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-text-dim">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d={ICON[res.type] ?? ICON.other} />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-text">{res.name}</p>
            <StatusPill status={res.status} className="shrink-0" />
          </div>
          {res.provider && <p className="text-xs text-text-mute">{res.provider}</p>}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-dim">
            {when && <span className="tnum">{when}</span>}
            {cost && <span className="tnum font-medium text-text">{cost}</span>}
            {res.confirmation && (
              <button
                type="button"
                onClick={copyConfirmation}
                className="tnum inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-text-dim transition-colors hover:text-text"
                title="Copy confirmation number"
              >
                {res.confirmation}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a2 2 0 012-2h10" />
                </svg>
              </button>
            )}
          </div>

          {res.notes && <p className="mt-1.5 text-xs text-text-mute">{res.notes}</p>}
        </div>
      </div>
    </div>
  );
}
