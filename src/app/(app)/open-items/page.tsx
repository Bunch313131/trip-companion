'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/nav/app-header';
import { OpenItemRow } from '@/components/open-items/open-item-row';
import { useTrip } from '@/lib/trip-context';
import { useAuth } from '@/lib/auth-context';
import { useTripCollection } from '@/lib/use-collection';
import { patchOpenItem } from '@/lib/mutations';
import type { OpenItemDoc, WithId } from '@/types/domain';

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function OpenItemsPage() {
  const { tripId, loading } = useTrip();
  const { user } = useAuth();
  const { docs: items, loading: itemsLoading } = useTripCollection<OpenItemDoc>(
    tripId,
    'openItems'
  );
  const [showResolved, setShowResolved] = useState(false);

  const openCount = items.filter((i) => i.status !== 'resolved').length;

  const visible = items
    .filter((i) => (showResolved ? true : i.status !== 'resolved'))
    .sort((a, b) => {
      // Open before resolved, then by priority.
      const ar = a.status === 'resolved' ? 1 : 0;
      const br = b.status === 'resolved' ? 1 : 0;
      if (ar !== br) return ar - br;
      return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
    });

  function toggle(item: WithId<OpenItemDoc>, resolved: boolean) {
    if (!tripId || !user) return;
    return patchOpenItem(tripId, item.id, user.uid, {
      status: resolved ? 'resolved' : 'open',
      resolvedBy: resolved ? user.uid : null,
    });
  }

  return (
    <>
      <AppHeader section="Open items" />
      <main className="px-5 py-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-text-dim">
            {loading || itemsLoading
              ? 'Loading…'
              : openCount === 0
                ? 'All clear — nothing open'
                : `${openCount} open`}
          </p>
          <button
            type="button"
            onClick={() => setShowResolved((v) => !v)}
            className="text-xs font-medium text-primary"
          >
            {showResolved ? 'Hide resolved' : 'Show resolved'}
          </button>
        </div>

        {!loading && !itemsLoading && visible.length === 0 ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
            <p className="font-display text-lg font-semibold text-text">Nothing to sort out</p>
            <p className="mt-1 text-sm text-text-dim">
              Everything that needed a decision is resolved.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-card border border-border shadow-card">
            {visible.map((item) => (
              <OpenItemRow key={item.id} item={item} onToggle={(r) => toggle(item, r)} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
