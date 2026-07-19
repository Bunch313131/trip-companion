'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker. Only in production — in dev the SW would
 * cache Next's HMR assets and cause confusing stale reloads.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failures shouldn't break the app */
      });
    };

    // This effect usually runs *after* window 'load' has already fired, in
    // which case the listener would never trigger — so register immediately
    // when the document is already complete.
    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
