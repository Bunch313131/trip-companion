import Link from 'next/link';
import { AppHeader } from '@/components/nav/app-header';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { TRIP } from '@/lib/constants';

export default function SettingsPage() {
  return (
    <>
      <AppHeader section="Settings" />
      <main className="space-y-4 px-5 py-5">
        <section className="rounded-card border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-3 font-display text-sm font-semibold text-text">Trip</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={TRIP.name} />
            <Row label="Dates" value={`${TRIP.startsOn} → ${TRIP.endsOn}`} />
            <Row label="Slug" value={TRIP.slug} mono />
          </dl>
        </section>

        <section className="flex items-center justify-between rounded-card border border-border bg-surface p-4 shadow-card">
          <div>
            <h2 className="font-display text-sm font-semibold text-text">Appearance</h2>
            <p className="text-xs text-text-mute">Light default · dark follows your system</p>
          </div>
          <ThemeToggle />
        </section>

        <section className="rounded-card border border-border bg-surface p-4 shadow-card">
          <h2 className="mb-3 font-display text-sm font-semibold text-text">Members</h2>
          <p className="text-sm text-text-dim">
            Invite flow arrives in Phase 3. For now, you and your partner are
            placeholders in the header.
          </p>
        </section>

        <SignOutButton />

        <Link
          href="/"
          className="block text-center text-xs font-medium text-primary"
        >
          ← Back to Today
        </Link>
      </main>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-mute">{label}</dt>
      <dd className={`text-text ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
