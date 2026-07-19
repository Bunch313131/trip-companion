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
      </TripProvider>
    </AuthGuard>
  );
}
