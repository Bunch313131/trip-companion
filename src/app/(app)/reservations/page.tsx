import { PhasePlaceholder } from '@/components/ui/phase-placeholder';

export default function ReservationsPage() {
  return (
    <PhasePlaceholder
      section="Bookings"
      title="Reservations"
      body="Flights, hotels, rail, and tickets — grouped by stop, with confirmation docs. CRUD and the paste-an-email shortcut arrive in Phases 3–4."
      phase="Phase 3 · Reservations"
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      }
    />
  );
}
