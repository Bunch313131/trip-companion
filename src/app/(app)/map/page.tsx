import { PhasePlaceholder } from '@/components/ui/phase-placeholder';

export default function MapPage() {
  return (
    <PhasePlaceholder
      section="Map"
      title="The route"
      body="Numbered pins for every stop with a bottom sheet of details. Rendered with MapLibre + MapTiler once the key is set (Phase 2)."
      phase="Phase 2 · Map"
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      }
    />
  );
}
