import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireTripAccess } from '@/lib/firebase-admin';
import type { ProposalDoc, ProposalOperation } from '@/types/domain';

/**
 * Apply a pending proposal in a single Firestore transaction: replay every
 * operation atomically, then mark the proposal approved. Either the whole
 * change lands or none of it does. Requires editor access to the trip.
 *
 * POST /api/proposals/[id]/approve   body: { tripId }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;

  let tripId: string | undefined;
  try {
    ({ tripId } = await request.json());
  } catch {
    /* no body */
  }
  if (!tripId) {
    return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
  }

  let uid: string;
  try {
    ({ uid } = await requireTripAccess(request, tripId, 'editor'));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }

  const db = adminDb();
  const proposalRef = db.doc(`trips/${tripId}/proposals/${proposalId}`);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(proposalRef);
      if (!snap.exists) throw new Error('Proposal not found');
      const proposal = snap.data() as ProposalDoc;
      if (proposal.status !== 'pending') {
        throw new Error('Proposal is no longer pending');
      }

      const ops = proposal.operations as ProposalOperation[];

      // Firestore requires all reads before writes inside a transaction.
      // Pre-read every update/delete target up front so a missing record fails
      // with a clear message instead of tx.update throwing a raw Firestore
      // "no document to update" error — that raw error (the full document path)
      // is what leaked into the chat UI.
      const targets = ops.filter(
        (op): op is Extract<ProposalOperation, { op: 'update' | 'delete' }> =>
          op.op === 'update' || op.op === 'delete'
      );
      const targetSnaps = await Promise.all(
        targets.map((op) => tx.get(db.collection(`trips/${tripId}/${op.entity}`).doc(op.id)))
      );
      const missingIdx = targetSnaps.findIndex((s) => !s.exists);
      if (missingIdx !== -1) {
        const m = targets[missingIdx];
        throw new Error(
          `Couldn't apply this change — the ${m.entity.replace(/s$/, '')} it updates no longer exists. ` +
            `It may have been edited or removed since the suggestion was made; ask the companion to try again.`
        );
      }

      for (const op of ops) {
        const coll = db.collection(`trips/${tripId}/${op.entity}`);
        if (op.op === 'create') {
          tx.set(coll.doc(), {
            ...op.data,
            lastEditedBy: uid,
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (op.op === 'update') {
          tx.update(coll.doc(op.id), {
            ...op.changes,
            lastEditedBy: uid,
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (op.op === 'delete') {
          // Soft delete — never hard-delete records the AI may reference.
          tx.update(coll.doc(op.id), {
            status: 'cancelled',
            lastEditedBy: uid,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      tx.update(proposalRef, {
        status: 'approved',
        reviewedBy: uid,
        reviewedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, status: 'approved' });
}
