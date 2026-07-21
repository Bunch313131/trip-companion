/**
 * Emergency reference data for the trip. Deliberately holds only public,
 * non-sensitive information: the pan-EU emergency number, the U.S. diplomatic
 * posts serving each leg, and each card issuer's published international line.
 *
 * We intentionally do NOT store card numbers, PINs, or passport numbers here —
 * those belong in a password manager / secure note, never in app data that
 * rides along on a phone that could be lost or stolen.
 *
 * Sources (verified Jul 2026):
 * - travel.state.gov 24/7 line; de/fr/ch.usembassy.gov post pages
 * - americanexpress.com, capitalone.com, bankofamerica.com international/contact
 */

export type EmergencyPost = {
  country: string;
  flag: string;
  name: string;
  serves: string; // which stops this post covers
  address: string;
  phone: string;
  phoneNote?: string;
  mapsQuery: string;
};

export type CardIssuer = {
  issuer: string;
  cards: string; // which of the family's cards this covers
  intlPhone: string;
  note: string;
};

/** Pan-European emergency services — police / ambulance / fire, any country. */
export const EU_EMERGENCY = '112';

/**
 * U.S. State Department 24/7 line for citizens in trouble abroad (lost passport,
 * arrest, medical, etc). Works from anywhere and routes to the right post.
 */
export const STATE_DEPT_247 = {
  fromAbroad: '+1 202 501 4444',
  fromUS: '+1 888 407 4747',
};

export const POSTS: EmergencyPost[] = [
  {
    country: 'Germany',
    flag: '🇩🇪',
    name: 'U.S. Consulate General Munich',
    serves: 'Bavaria — Munich, Füssen, Königssee',
    address: 'Königinstraße 5, 80539 München',
    phone: '+49 89 2888 0',
    mapsQuery: 'U.S. Consulate General Munich, Königinstraße 5, 80539 München',
  },
  {
    country: 'France',
    flag: '🇫🇷',
    name: 'U.S. Consulate General Strasbourg',
    serves: 'Alsace — Colmar & Strasbourg',
    address: "15 Avenue d'Alsace, 67000 Strasbourg",
    phone: '+33 1 43 12 22 22',
    phoneNote: 'Answered 24/7 for U.S.-citizen emergencies · USAStrasbourg@state.gov',
    mapsQuery: "U.S. Consulate General Strasbourg, 15 Avenue d'Alsace, Strasbourg",
  },
  {
    country: 'Switzerland',
    flag: '🇨🇭',
    name: 'U.S. Embassy Bern',
    serves: 'Switzerland — Lucerne',
    address: 'Sulgeneckstrasse 19, 3007 Bern',
    phone: '+41 31 357 70 11',
    mapsQuery: 'U.S. Embassy Bern, Sulgeneckstrasse 19, 3007 Bern',
  },
];

export const CARD_ISSUERS: CardIssuer[] = [
  {
    issuer: 'American Express',
    cards: 'Amex Platinum · Delta Reserve',
    intlPhone: '+1 336 393 1111',
    note: 'Call collect from abroad — reverse charges via a local operator.',
  },
  {
    issuer: 'Capital One',
    cards: 'Venture',
    intlPhone: '+1 804 934 2001',
    note: 'Line for U.S. cardholders calling from outside the U.S.',
  },
  {
    issuer: 'Bank of America',
    cards: 'Debit / ATM',
    intlPhone: '+1 315 724 4022',
    note: 'Call collect from abroad to report a lost or stolen card.',
  },
];

/**
 * Personal details we deliberately keep OUT of the app — a checklist reminding
 * the family where these actually belong (a password manager / secure note).
 */
export const KEEP_SECURE = [
  'Passport numbers & expiry — plus a photo of each passport',
  'Full card numbers and the last 4 of each',
  'A scan of travel insurance / EHIC-equivalent coverage',
];
