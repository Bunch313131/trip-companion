/** Shared formatting helpers for dates, nights, flags, and money. */

/** ISO alpha-2 country code → flag emoji (e.g. "FR" → 🇫🇷). */
export function flag(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const cc = countryCode.toUpperCase();
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}

function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** "Jul 27 – 30" or "Jul 30 – Aug 1" from two ISO dates. */
export function dateRange(startISO: string, endISO: string): string {
  const s = parseISODate(startISO);
  const e = parseISODate(endISO);
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
  const sDay = s.getDate();
  const eDay = e.getDate();
  if (sMonth === eMonth) return `${sMonth} ${sDay} – ${eDay}`;
  return `${sMonth} ${sDay} – ${eMonth} ${eDay}`;
}

/** Whole nights between two ISO dates. */
export function nights(startISO: string, endISO: string): number {
  const ms = parseISODate(endISO).getTime() - parseISODate(startISO).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** A Firestore Timestamp-ish value → "Jul 26, 2:30 PM" (date + optional time). */
export function fmtDateTime(
  ts?: { toDate: () => Date } | null,
  opts: { time?: boolean } = {}
): string | null {
  if (!ts) return null;
  try {
    const d = ts.toDate();
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!opts.time) return date;
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${time}`;
  } catch {
    return null;
  }
}

/** Cents + currency → "€1,240" / "$85". */
export function money(cents?: number | null, currency?: string | null): string | null {
  if (cents == null) return null;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency ?? ''}`.trim();
  }
}
