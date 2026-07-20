'use client';

import { Drawer } from 'vaul';
import { Timestamp } from 'firebase/firestore';
import { StatusPill } from '@/components/ui/status-pill';
import { NavigateButton } from '@/components/ui/navigate-button';
import { reservationNavQuery } from '@/lib/maps';
import { fmtTime, fmtDayLabel, isoDateOf } from '@/lib/trip-logic';
import type { ActivityDoc, ReservationDoc, WithId } from '@/types/domain';

export type EventSelection =
  | { type: 'reservation'; res: WithId<ReservationDoc> }
  | { type: 'activity'; act: WithId<ActivityDoc> };

function money(cents?: number | null, currency?: string | null): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(cents / 100);
}

function whenLabel(ts?: Timestamp | null): string | null {
  const iso = isoDateOf(ts);
  if (!iso) return null;
  const time = fmtTime(ts);
  return time ? `${fmtDayLabel(iso)} · ${time}` : fmtDayLabel(iso);
}

export function EventDetail({
  selection,
  onClose,
  onEditActivity,
}: {
  selection: EventSelection | null;
  onClose: () => void;
  onEditActivity?: (act: WithId<ActivityDoc>) => void;
}) {
  const open = !!selection;

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] max-w-lg flex-col rounded-t-2xl border border-border bg-bg outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-border" />
          <div className="overflow-y-auto px-5 pb-8 pt-3">
            {selection?.type === 'reservation' && (
              <ReservationDetail res={selection.res} />
            )}
            {selection?.type === 'activity' && (
              <ActivityDetail act={selection.act} onEdit={onEditActivity} onClose={onClose} />
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function ReservationDetail({ res }: { res: WithId<ReservationDoc> }) {
  const when = whenLabel(res.startsAt);
  const cost = money(res.costCents, res.costCurrency);
  const navQuery = reservationNavQuery(res.type, res.name);

  return (
    <div>
      <Drawer.Title className="flex items-start justify-between gap-3">
        <span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-mute">
            {res.type}
          </span>
          <span className="mt-0.5 block font-display text-lg font-semibold text-text">
            {res.name}
          </span>
        </span>
        <StatusPill status={res.status} />
      </Drawer.Title>

      <dl className="mt-4 space-y-2.5">
        {when && <Row label="When" value={when} />}
        {res.provider && <Row label="Provider" value={res.provider} />}
        {res.confirmation && <Row label="Confirmation" value={res.confirmation} mono />}
        {cost && <Row label="Cost" value={cost} />}
        {res.notes && <Row label="Notes" value={res.notes} />}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {res.documentUrl && (
          <a
            href={res.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16v4a2 2 0 000 4v4H4v-4a2 2 0 000-4z" />
            </svg>
            View ticket
          </a>
        )}
        {navQuery && <NavigateButton dest={{ query: navQuery }} variant="chip" />}
      </div>

      <p className="mt-4 text-[11px] text-text-mute">Edit this booking on the Bookings tab.</p>
    </div>
  );
}

function ActivityDetail({
  act,
  onEdit,
  onClose,
}: {
  act: WithId<ActivityDoc>;
  onEdit?: (act: WithId<ActivityDoc>) => void;
  onClose: () => void;
}) {
  const when = whenLabel(act.startsAt);
  const cost = money(act.costCents, act.costCurrency);
  const navQuery = act.location || act.title;

  return (
    <div>
      <Drawer.Title className="flex items-start justify-between gap-3">
        <span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-mute">
            {act.kind.replace('_', ' ')}
          </span>
          <span className="mt-0.5 block font-display text-lg font-semibold text-text">{act.title}</span>
        </span>
        <StatusPill status={act.status} />
      </Drawer.Title>

      <dl className="mt-4 space-y-2.5">
        {when && <Row label="When" value={when} />}
        {act.location && <Row label="Location" value={act.location} />}
        {cost && <Row label="Cost" value={cost} />}
        {act.notes && <Row label="Notes" value={act.notes} />}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {navQuery && <NavigateButton dest={{ query: navQuery }} variant="chip" />}
        {onEdit && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(act);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-dim transition-colors hover:text-text"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
            </svg>
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-xs font-medium text-text-mute">{label}</dt>
      <dd className={`min-w-0 flex-1 whitespace-pre-line text-sm text-text ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
