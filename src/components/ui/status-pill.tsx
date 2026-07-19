/**
 * One status language across every screen (brief §"Status system").
 * Maps any entity status (stop / activity / reservation) to a consistent
 * label + color treatment.
 */

type Tone = 'confirmed' | 'tentative' | 'draft' | 'primary' | 'warning' | 'muted';

const TONE: Record<Tone, string> = {
  confirmed: 'bg-confirmed-soft text-confirmed',
  tentative: 'bg-tentative-soft text-tentative',
  draft: 'bg-surface-2 text-text-mute',
  primary: 'bg-primary-soft text-primary',
  warning: 'bg-warning-soft text-warning',
  muted: 'bg-surface-2 text-text-mute line-through',
};

const MAP: Record<string, { label: string; tone: Tone }> = {
  // stops / activities
  draft: { label: 'Draft', tone: 'draft' },
  idea: { label: 'Idea', tone: 'draft' },
  tentative: { label: 'Tentative', tone: 'tentative' },
  confirmed: { label: 'Confirmed', tone: 'confirmed' },
  completed: { label: 'Completed', tone: 'muted' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
  // reservations
  to_book: { label: 'To book', tone: 'warning' },
  booked: { label: 'Booked', tone: 'confirmed' },
  in_progress: { label: 'In progress', tone: 'primary' },
};

export function StatusPill({ status, className = '' }: { status: string; className?: string }) {
  const cfg = MAP[status] ?? { label: status, tone: 'draft' as Tone };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[cfg.tone]} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
