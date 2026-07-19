'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * Install-to-home-screen affordance.
 * Android/Chrome fires `beforeinstallprompt`, so we can trigger the native
 * sheet. iOS Safari has no such API — we show Share → Add to Home Screen
 * instructions instead.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <div className="rounded-card border border-border bg-surface p-4 shadow-card">
        <h2 className="font-display text-sm font-semibold text-text">Installed</h2>
        <p className="mt-1 text-xs text-text-dim">
          You&apos;re running Trip Companion from your home screen. Nice.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <h2 className="font-display text-sm font-semibold text-text">
        Add to home screen
      </h2>
      <p className="mt-1 text-xs text-text-dim">
        Install the app so it opens full-screen and works offline on the trip.
      </p>

      {deferred ? (
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
          className="mt-3 w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-ink"
        >
          Install app
        </button>
      ) : ios ? (
        <ol className="mt-3 space-y-1.5 text-xs text-text-dim">
          <li>
            1. Tap the <span className="font-medium text-text">Share</span> icon in
            Safari&apos;s toolbar
          </li>
          <li>
            2. Choose{' '}
            <span className="font-medium text-text">Add to Home Screen</span>
          </li>
          <li>
            3. Tap <span className="font-medium text-text">Add</span>
          </li>
        </ol>
      ) : (
        <p className="mt-3 text-xs text-text-mute">
          Open this site on your phone (or use your browser&apos;s menu →
          &quot;Install app&quot;) to add it to your home screen.
        </p>
      )}
    </div>
  );
}
