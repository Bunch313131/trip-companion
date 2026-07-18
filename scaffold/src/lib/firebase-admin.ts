/**
 * Firebase Admin SDK — server-only.
 *
 * Use in API routes and server-side functions that need:
 * - To bypass security rules
 * - To perform multi-document transactions (proposal apply)
 * - To verify user ID tokens from cookies
 *
 * NEVER import this from a Client Component.
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

function getCredentials() {
  const raw = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!raw) {
    throw new Error(
      'FIREBASE_ADMIN_CREDENTIALS is not set. Download the service account JSON ' +
        'from Firebase Console → Project Settings → Service Accounts → Generate ' +
        'new private key, and set it as a single-line env var.'
    );
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      'FIREBASE_ADMIN_CREDENTIALS is not valid JSON. Ensure private_key newlines are escaped as \\n.'
    );
  }
}

let app: App;

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;
  if (!app) {
    app = initializeApp({
      credential: cert(getCredentials()),
    });
  }
  return app;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminStorage(): Storage {
  return getStorage(getAdminApp());
}

/**
 * Verify the caller's Firebase ID token from a Next.js Request.
 * Reads the token from either the `Authorization: Bearer` header or
 * a `firebase-auth-token` cookie.
 */
export async function verifyRequest(request: Request): Promise<{
  uid: string;
  email?: string;
}> {
  const authHeader = request.headers.get('authorization');
  let token: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    const cookie = request.headers.get('cookie');
    const match = cookie?.match(/firebase-auth-token=([^;]+)/);
    token = match?.[1];
  }
  if (!token) throw new Error('No auth token provided');

  const decoded = await adminAuth().verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email };
}

/**
 * Verify caller is a member of the trip (or optionally an editor/owner).
 * Throws if not. Returns the caller's role.
 */
export async function requireTripAccess(
  request: Request,
  tripId: string,
  minRole: 'viewer' | 'editor' | 'owner' = 'viewer'
): Promise<{ uid: string; role: 'owner' | 'editor' | 'viewer' }> {
  const { uid } = await verifyRequest(request);
  const memberSnap = await adminDb()
    .doc(`trips/${tripId}/members/${uid}`)
    .get();
  if (!memberSnap.exists) throw new Error('Not a member of this trip');
  const role = memberSnap.data()!.role as 'owner' | 'editor' | 'viewer';

  const ranks = { viewer: 0, editor: 1, owner: 2 };
  if (ranks[role] < ranks[minRole]) {
    throw new Error(`Requires ${minRole} role; caller is ${role}`);
  }
  return { uid, role };
}
