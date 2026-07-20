'use client';

import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { doc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { getClientDb } from '@/lib/firebase-client';
import { useAuth } from '@/lib/auth-context';
import { ProposalCard } from '@/components/chat/proposal-card';
import type { ProposalDoc, WithId } from '@/types/domain';

/**
 * Import a travel document: upload it, let the AI read it and reconcile against
 * the current trip (update existing bookings, create new ones), then review the
 * result as a Proposal Card and approve.
 */
export function ImportDoc({
  open,
  onClose,
  tripId,
}: {
  open: boolean;
  onClose: () => void;
  tripId: string;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<WithId<ProposalDoc> | null>(null);

  // Subscribe to the generated proposal so the card reflects approve/reject.
  useEffect(() => {
    if (!proposalId) return;
    const unsub = onSnapshot(doc(getClientDb(), 'trips', tripId, 'proposals', proposalId), (snap) => {
      if (snap.exists()) setProposal({ id: snap.id, ...(snap.data() as ProposalDoc) });
    });
    return unsub;
  }, [proposalId, tripId]);

  function reset() {
    setProposalId(null);
    setProposal(null);
    setBusy(false);
  }

  async function handleImport(file: File | null) {
    if (!file || !user) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tripId', tripId);
      const token = await user.getIdToken();
      const res = await fetch('/api/documents/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setProposalId(data.proposalId);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] max-w-lg flex-col rounded-t-2xl border border-border bg-bg outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-border" />
          <div className="overflow-y-auto px-5 pb-8 pt-3">
            <Drawer.Title className="font-display text-lg font-semibold text-text">
              Import from a document
            </Drawer.Title>
            <p className="mt-1 text-xs text-text-dim">
              Upload a flight receipt, hotel confirmation, or ticket. The AI reads it, matches it
              against your trip, and proposes the changes — you approve.
            </p>

            {!proposal && (
              <div className="mt-4 rounded-lg border border-dashed border-primary/40 bg-primary-soft/40 p-4 text-center">
                <input
                  id="import-file"
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={busy}
                  onChange={(e) => handleImport(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                {busy ? (
                  <p className="flex items-center justify-center gap-2 py-3 text-sm text-primary">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
                    Reading &amp; matching to your trip…
                  </p>
                ) : (
                  <label
                    htmlFor="import-file"
                    className="inline-block cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink"
                  >
                    Choose a PDF or photo
                  </label>
                )}
              </div>
            )}

            {proposal && (
              <div className="mt-4 space-y-3">
                <ProposalCard proposal={proposal} tripId={tripId} />
                {proposal.status !== 'pending' && (
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      onClose();
                    }}
                    className="w-full rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-text"
                  >
                    Done
                  </button>
                )}
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
