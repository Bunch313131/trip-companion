import { PhasePlaceholder } from '@/components/ui/phase-placeholder';

export default function NotesPage() {
  return (
    <PhasePlaceholder
      section="Notes"
      title="Trip notes"
      body="A Tiptap editor with autosave for packing lists, ideas, and day-of thoughts — optionally tied to a stop. Arrives in Phase 3."
      phase="Phase 3 · Notes"
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M4 4h16v16H4z" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      }
    />
  );
}
