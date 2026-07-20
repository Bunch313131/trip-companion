'use client';

import { useCallback, useEffect, useState } from 'react';

export type GeoState = {
  status: 'idle' | 'prompting' | 'granted' | 'denied' | 'unavailable';
  lat: number | null;
  lng: number | null;
};

/**
 * Permission-gated geolocation. We never auto-prompt — the browser prompt only
 * fires when the user taps to enable it, so location stays opt-in. If a prior
 * grant exists (Permissions API says 'granted'), we read the position quietly.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle', lat: null, lng: null });

  const read = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'unavailable', lat: null, lng: null });
      return;
    }
    setState((s) => ({ ...s, status: 'prompting' }));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({ status: 'granted', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        setState({
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
          lat: null,
          lng: null,
        }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }, []);

  // If already granted from a previous session, read silently (no prompt).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
    let alive = true;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((res) => {
        if (alive && res.state === 'granted') read();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [read]);

  return { ...state, request: read };
}

/** Great-circle distance in kilometers between two lat/lng points. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
