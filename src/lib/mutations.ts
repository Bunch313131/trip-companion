'use client';

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase-client';

/**
 * Client-side writes for trip-scoped docs. Governed by Firestore security
 * rules (editors only). Every write stamps lastEditedBy + updatedAt so the
 * UI can show provenance and presence.
 */

function stamp<T extends Record<string, unknown>>(changes: T, uid: string) {
  return { ...changes, lastEditedBy: uid, updatedAt: serverTimestamp() };
}

export function patchStop(
  tripId: string,
  stopId: string,
  uid: string,
  changes: Record<string, unknown>
) {
  return updateDoc(doc(getClientDb(), 'trips', tripId, 'stops', stopId), stamp(changes, uid));
}

export function patchActivity(
  tripId: string,
  activityId: string,
  uid: string,
  changes: Record<string, unknown>
) {
  return updateDoc(
    doc(getClientDb(), 'trips', tripId, 'activities', activityId),
    stamp(changes, uid)
  );
}

export function patchReservation(
  tripId: string,
  reservationId: string,
  uid: string,
  changes: Record<string, unknown>
) {
  return updateDoc(
    doc(getClientDb(), 'trips', tripId, 'reservations', reservationId),
    stamp(changes, uid)
  );
}
