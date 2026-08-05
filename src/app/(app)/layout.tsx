import { BottomNav } from '@/components/nav/bottom-nav';
import { AuthGuard } from '@/components/auth/auth-guard';
import { TripProvider } from '@/lib/trip-context';

/**
 * App shell for the primary authenticated screens. Wraps content in a
 * centered mobile column, reserves space for the fixed bottom nav, and
 * renders the tab bar. Login / invite routes live outside this group.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <TripProvider>
        <div className="min-h-screen bg-bg">
          <div className="mx-auto max-w-lg pb-24">{children}</div>
          <BottomNav />
        </div>

        {/* Phone-landscape guard — this UI is portrait-only. */}
        <div className="rotate-lock" aria-hidden>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="text-text-dim">
            <rect x="7" y="3" width="10" height="18" rx="2" />
            <path d="M11 18h2" />
          </svg>
          <p className="font-display text-base font-semibold text-text">Rotate to portrait</p>
          <p className="max-w-xs text-sm text-text-dim">Trip Companion works best held upright.</p>
        </div>
      </TripProvider>
    </AuthGuard>
  );
}
