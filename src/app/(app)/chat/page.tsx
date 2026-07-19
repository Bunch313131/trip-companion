import { PhasePlaceholder } from '@/components/ui/phase-placeholder';

export default function ChatPage() {
  return (
    <PhasePlaceholder
      section="Chat"
      title="Trip companion"
      body="Streaming Claude chat with web search and the Proposal Card — every AI change lands as a card you approve. The centerpiece, built in Phase 4."
      phase="Phase 4 · The AI"
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M4 5h16v11H9l-4 4z" />
        </svg>
      }
    />
  );
}
