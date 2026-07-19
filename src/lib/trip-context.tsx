'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase-client';
import { useAuth } from '@/lib/auth-context';
import type { TripDoc, WithId } from '@/types/domain';

type TripState = {
  trip: WithId<TripDoc> | null;
  tripId: string | null;
  loading: boolean;
  /** True once we've resolved and found no trip for this user. */
  empty: boolean;
};

const TripContext = createContext<TripState>({
  trip: null,
  tripId: null,
  loading: true,
  empty: false,
});

/**
 * Resolves the user's active trip by querying trips where memberIds
 * array-contains their uid (the "my trips" query — satisfies the isMember
 * rule). Subscribes live so membership/ownership changes propagate.
 */
export function TripProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<TripState>({
    trip: null,
    tripId: null,
    loading: true,
    empty: false,
  });

  useEffect(() => {
    if (!user) return;
    const db = getClientDb();
    const q = query(
      collection(db, 'trips'),
      where('memberIds', 'array-contains', user.uid),
      limit(1)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const doc = snap.docs[0];
        if (!doc) {
          setState({ trip: null, tripId: null, loading: false, empty: true });
          return;
        }
        setState({
          trip: { id: doc.id, ...(doc.data() as TripDoc) },
          tripId: doc.id,
          loading: false,
          empty: false,
        });
      },
      () => setState((s) => ({ ...s, loading: false }))
    );
    return unsub;
  }, [user]);

  return <TripContext.Provider value={state}>{children}</TripContext.Provider>;
}

export function useTrip() {
  return useContext(TripContext);
}
