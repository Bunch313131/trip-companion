'use client';

import { useEffect, useState } from 'react';

/**
 * Registers the service worker and surfaces an "update ready" banner when a new
 * deploy is available. iOS PWAs often keep running old cached JS across
 * relaunches; this checks for a new SW on load and each time the app is
 * foregrounded, and lets the user apply it with one tap instead of reinstalling.
 */
export function ServiceWorkerRegistrar() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;

    const watch = (r: ServiceWorkerRegistration) => {
      reg = r;
      // A worker already waiting (installed while an old one controls) = update.
      if (r.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
      r.addEventListener('updatefound', () => {
        const nw = r.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    };

    const register = () =>
      navigator.serviceWorker
        .register('/sw.js')
        .then(watch)
        .catch(() => {});

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    // Re-check for a new version whenever the app is brought back to the front.
    const onVisible = () => {
      if (document.visibilityState === 'visible') reg?.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('load', register);
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div
      className="fixed inset-x-0 z-[60] mx-auto flex max-w-lg items-center justify-between gap-3 px-4"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary px-4 py-2.5 text-primary-ink shadow-card">
        <span className="text-sm font-medium">A new version is ready</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-lg bg-primary-ink/15 px-3 py-1 text-sm font-semibold"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
