/**
 * Seeds the pre-trip prep checklist and per-stop safety reminders.
 *
 * Idempotent: each reminder has a deterministic ID and is only created if it
 * doesn't already exist — so re-running never duplicates and never resets a
 * reminder the family has already checked off.
 *
 * Usage:  node seed/seed-reminders.mjs
 */

import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

const cred = process.env.FIREBASE_ADMIN_CREDENTIALS;
if (!cred) {
  console.error('❌ FIREBASE_ADMIN_CREDENTIALS not set');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(cred)) });
const db = getFirestore();

const idFrom = (t) => createHash('sha256').update(t).digest('hex').slice(0, 20);
const TRIP_SLUG = 'family-europe-2026';
const tripId = idFrom(TRIP_SLUG);

// ── Prep checklist (before you go) ─────────────────────────────────
const PREP = [
  {
    title: 'Passports',
    text: 'Photocopy all 4 passports and save a scan to 1Password/iCloud. Keep the paper copies in a different bag from the real passports.',
  },
  {
    title: 'Emergency sheet',
    text: 'Put together the one-page emergency sheet — card issuer numbers + last 4, passport numbers, hotel list, emergency contacts. (The Emergency screen has the reference numbers.)',
  },
  {
    title: 'Bank & travel apps',
    text: 'Install and log into every app you might need abroad: Amex, Capital One, Bank of America, Delta, and VRBO/Booking.',
  },
  {
    title: 'Transaction alerts',
    text: 'Turn on card transaction push alerts, and confirm your phone number + email are current on each account so they can reach you about fraud.',
  },
  {
    title: 'Know how to freeze a card',
    text: 'Find the lock/freeze control in each banking app now, so you can kill a card in seconds if it goes missing.',
  },
  {
    title: 'Split your cards',
    text: 'Pack primary cards separate from backups. A daily wallet with one card + cash; the rest stays back at the hotel.',
  },
];

// ── Safety habits (surface during the trip) ────────────────────────
// stopCity: null = always-on throughout the trip; otherwise pinned to that stop.
const SAFETY = [
  {
    stopCity: null,
    text: 'Wallet out of back pockets — front pocket or a zipped crossbody bag. One daily card plus cash; keep backups separate.',
  },
  {
    stopCity: null,
    text: 'Passports stay on you or in the hotel safe — never in the rental car or a backpack outer pocket.',
  },
  {
    stopCity: 'Colmar',
    text: 'Strasbourg day: crowds at the cathedral and on the boat tour. Bag zipped and in front, and no phone left on the café table.',
  },
  {
    stopCity: 'Lucerne',
    text: 'Lakefront, the train station and the boat pier draw pickpockets. Bag crossbody, valuables zipped away.',
  },
  {
    stopCity: 'Füssen',
    text: 'Packed Neuschwanstein shuttle and viewpoints — keep passports on you, never in a backpack outer pocket.',
  },
  {
    stopCity: 'Munich',
    text: 'Marienplatz, Viktualienmarkt and the station area are pickpocket hotspots. Daily wallet zipped, backups back at the hotel.',
  },
];

async function upsertIfAbsent(id, data) {
  const ref = db.doc(`trips/${tripId}/reminders/${id}`);
  const snap = await ref.get();
  if (snap.exists) return false;
  await ref.set({
    ...data,
    done: false,
    lastEditedBy: '__seed__',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

async function main() {
  console.log(`\n🌱 Seeding reminders → trip ${tripId}\n`);

  // Map stop city → id from live Firestore (robust to any manual edits).
  const stopsSnap = await db.collection(`trips/${tripId}/stops`).get();
  const stopIdByCity = new Map();
  stopsSnap.docs.forEach((d) => stopIdByCity.set(d.data().city, d.id));
  if (stopsSnap.empty) {
    console.error('❌ No stops found — is the trip seeded?');
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const p of PREP) {
    const id = idFrom(`${tripId}:prep:${p.title}`);
    const made = await upsertIfAbsent(id, {
      title: p.title,
      text: p.text,
      category: 'prep',
      standing: false,
      dateISO: null,
      stopId: null,
    });
    made ? created++ : skipped++;
  }

  for (const s of SAFETY) {
    const stopId = s.stopCity ? stopIdByCity.get(s.stopCity) ?? null : null;
    if (s.stopCity && !stopId) {
      console.warn(`⚠  No stop found for "${s.stopCity}" — seeding as trip-wide.`);
    }
    const id = idFrom(`${tripId}:safety:${s.stopCity ?? 'all'}:${s.text.slice(0, 24)}`);
    const made = await upsertIfAbsent(id, {
      title: null,
      text: s.text,
      category: 'safety',
      standing: true,
      dateISO: null,
      stopId,
    });
    made ? created++ : skipped++;
  }

  console.log(`✅ Done. Created ${created}, left ${skipped} existing untouched.\n`);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
