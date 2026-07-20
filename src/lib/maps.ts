/**
 * Deep links into Apple Maps for driving directions (hands off to CarPlay on
 * iOS). Falls back gracefully: exact coordinates when we have them, otherwise
 * a place-name search query.
 */

export type NavDest = { lat?: number | null; lng?: number | null; query?: string | null };

export function appleMapsDirections(dest: NavDest): string | null {
  if (typeof dest.lat === 'number' && typeof dest.lng === 'number') {
    return `https://maps.apple.com/?daddr=${dest.lat},${dest.lng}&dirflg=d`;
  }
  if (dest.query && dest.query.trim()) {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(dest.query.trim())}&dirflg=d`;
  }
  return null;
}

/**
 * The best thing to hand Apple Maps for a reservation: a real street address
 * when we have one (geocodes reliably), otherwise the name for place-type
 * bookings only (a famous POI like a castle resolves; a flight/car does not).
 */
export function reservationNavQuery(
  type: string,
  name: string,
  address?: string | null
): string | null {
  if (address && address.trim()) return address.trim();
  return ['hotel', 'restaurant', 'ticket', 'activity', 'rail'].includes(type) ? name : null;
}
