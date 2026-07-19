'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { ProposalDoc, WithId } from '@/types/domain';

/**
 * The Proposal Card — every AI-driven change to the itinerary lands here as
 * a reviewable object. It reads like a document the AI hands you, not a chat
 * bubble: its own frame, a before→after diff, and explicit Approve / Reject.
 * Status is driven live by Firestore (onSnapshot), so both users see the
 * same state.
 */
export function ProposalCard({
  proposal,
  tripId,
}: {
  proposal: WithId<ProposalDoc>;
  tripId: string;
}) {
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const status = proposal.status;
  const pending = status === 'pending';

  async function act(kind: 'approve' | 'reject') {
    setBusy(kind);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ tripId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      toast.success(kind === 'approve' ? 'Applied to your trip' : 'Proposal rejected');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const frame =
    status === 'approved'
      ? 'border-confirmed/50'
      : status === 'rejected' || status === 'superseded'
        ? 'border-border opacity-70'
        : 'border-primary/40';

  return (
    <div className={`rounded-card border bg-surface p-4 shadow-card ${frame}`}>
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        {pending && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        )}
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-mute">
          {status === 'approved'
            ? 'Applied change'
            : status === 'rejected'
              ? 'Rejected change'
              : status === 'superseded'
                ? 'Superseded'
                : 'Suggested change'}
        </span>
      </div>

      {/* Summary */}
      <p className="font-display text-[15px] font-semibold leading-snug text-text">
        {proposal.summary}
      </p>

      {/* Diff */}
      {proposal.diff && proposal.diff.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          {proposal.diff.map((row, i) => (
            <div
              key={`${row.field}-${i}`}
              className={`flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <span className="w-20 shrink-0 text-text-mute">{row.field}</span>
              {row.before != null && row.before !== '' && (
                <span className="text-warning line-through">{row.before}</span>
              )}
              {row.before != null && row.after != null && (
                <span className="text-text-mute">→</span>
              )}
              {row.after != null && <span className="text-confirmed">{row.after}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Rationale */}
      {proposal.rationale && (
        <p className="mt-3 text-xs leading-relaxed text-text-dim">{proposal.rationale}</p>
      )}

      {/* Actions / footer */}
      {pending ? (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => act('approve')}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-ink transition-opacity disabled:opacity-60"
          >
            {busy === 'approve' ? 'Applying…' : 'Approve'}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => act('reject')}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-dim transition-colors hover:text-warning disabled:opacity-60"
          >
            {busy === 'reject' ? '…' : 'Reject'}
          </button>
        </div>
      ) : (
        <p className="mt-3 border-t border-border pt-2 text-[11px] text-text-mute">
          {status === 'approved'
            ? 'Applied to your itinerary'
            : status === 'rejected'
              ? 'Rejected'
              : status === 'modified'
                ? 'Modified before applying'
                : 'Replaced by a later suggestion'}
        </p>
      )}
    </div>
  );
}
