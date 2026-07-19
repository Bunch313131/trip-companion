import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireTripAccess } from '@/lib/firebase-admin';
import type { ProposalDoc } from '@/types/domain';

/**
 * Mark a pending proposal as rejected. Applies nothing to the itinerary.
 * POST /api/proposals/[id]/reject   body: { tripId }
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

  const proposalRef = adminDb().doc(`trips/${tripId}/proposals/${proposalId}`);
  const snap = await proposalRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }
  if ((snap.data() as ProposalDoc).status !== 'pending') {
    return NextResponse.json({ error: 'Proposal is no longer pending' }, { status: 409 });
  }

  await proposalRef.update({
    status: 'rejected',
    reviewedBy: uid,
    reviewedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, status: 'rejected' });
}
