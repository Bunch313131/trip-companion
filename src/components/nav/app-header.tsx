'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

function initial(user: { displayName?: string | null; email?: string | null } | null) {
  const source = user?.displayName || user?.email || '?';
  return source.charAt(0).toUpperCase();
}

/**
 * Shared top header for app screens: an uppercase section eyebrow over the
 * trip name, plus the signed-in member's avatar and a settings link.
 * The second (partner) avatar arrives with the members list in Phase 3.
 */
export function AppHeader({ section }: { section: string }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div
        className="mx-auto flex max-w-lg items-center justify-between px-5 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-mute">
            {section}
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-text">
            Europe Family Trip
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            title={user?.email ?? undefined}
            className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-bg bg-primary text-xs font-semibold text-primary-ink"
          >
            {initial(user)}
          </span>
          <Link
            href="/settings"
            aria-label="Settings"
            className="grid h-[34px] w-[34px] place-items-center rounded-full border border-border bg-surface text-text-dim transition-colors hover:text-text"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
