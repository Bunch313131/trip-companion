import { PhasePlaceholder } from '@/components/ui/phase-placeholder';

export default function ItineraryPage() {
  return (
    <PhasePlaceholder
      section="Trip"
      title="Your itinerary"
      body="Six stops across Germany, France, and Switzerland. The live, editable timeline lands in Phase 2."
      phase="Phase 2 · Read-only itinerary"
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
        </svg>
      }
    />
  );
}
