'use client';

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type DocumentReference,
} from 'firebase/firestore';
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

/** A fresh doc ref (with an id) in a trip subcollection — lets us know the id
 *  before writing, e.g. for a Storage upload path. */
export function newDocRef(tripId: string, sub: string): DocumentReference {
  return doc(collection(getClientDb(), 'trips', tripId, sub));
}

/** Create a doc at a known ref, stamping created/updated + editor. */
export function createDoc(
  ref: DocumentReference,
  uid: string,
  data: Record<string, unknown>
) {
  return setDoc(ref, {
    ...data,
    lastEditedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Soft-delete: never hard-delete records the AI may reference. */
export function softDelete(tripId: string, sub: string, id: string, uid: string) {
  return updateDoc(doc(getClientDb(), 'trips', tripId, sub, id), stamp({ status: 'cancelled' }, uid));
}

export function patchOpenItem(
  tripId: string,
  id: string,
  uid: string,
  changes: Record<string, unknown>
) {
  return updateDoc(doc(getClientDb(), 'trips', tripId, 'openItems', id), stamp(changes, uid));
}

/** Generic create helper for a new doc in any subcollection (returns id). */
export async function addToCollection(
  tripId: string,
  sub: string,
  uid: string,
  data: Record<string, unknown>
) {
  const ref = newDocRef(tripId, sub);
  await createDoc(ref, uid, data);
  return ref.id;
}
