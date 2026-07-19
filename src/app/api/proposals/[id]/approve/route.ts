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

      for (const op of proposal.operations as ProposalOperation[]) {
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
