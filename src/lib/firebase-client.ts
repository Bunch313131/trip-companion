/**
 * Firebase Client SDK.
 *
 * Use in Client Components ONLY. For server-side operations (API routes,
 * Server Components with writes), use `lib/firebase/admin.ts`.
 *
 * Reads and writes here are subject to Firestore security rules.
 * Offline persistence is enabled for read paths.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

function initFirebase() {
  if (getApps().length > 0) {
    app = getApps()[0]!;
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
    return;
  }

  app = initializeApp(firebaseConfig);

  // Firestore with persistent local cache (offline reads work out of the box)
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  auth = getAuth(app);
  storage = getStorage(app);
}

// Lazy init on first access (safe for both SSR and CSR)
export function getClientApp(): FirebaseApp {
  if (!app) initFirebase();
  return app;
}

export function getClientDb(): Firestore {
  if (!db) initFirebase();
  return db;
}

export function getClientAuth(): Auth {
  if (!auth) initFirebase();
  return auth;
}

export function getClientStorage(): FirebaseStorage {
  if (!storage) initFirebase();
  return storage;
}
