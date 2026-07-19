'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  type QueryConstraint,
} from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase-client';
import type { WithId } from '@/types/domain';

/**
 * Live subscription to a trip subcollection. Returns docs (with ids) and a
 * loading flag. Pass query constraints (where/orderBy) as needed.
 */
export function useTripCollection<T>(
  tripId: string | null,
  sub: string,
  ...constraints: QueryConstraint[]
): { docs: WithId<T>[]; loading: boolean } {
  const [docs, setDocs] = useState<WithId<T>[]>([]);
  const [loading, setLoading] = useState(true);

  // Serialize constraints for the dependency array.
  const key = `${tripId}/${sub}/${constraints.length}`;

  useEffect(() => {
    if (!tripId) {
      setDocs([]);
      setLoading(false);
      return;
    }
    const db = getClientDb();
    const q = query(collection(db, 'trips', tripId, sub), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }) as WithId<T>)
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { docs, loading };
}

export { orderBy };
