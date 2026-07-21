import Link from 'next/link';

/** Compact, always-available entry point to the offline Emergency Info screen. */
export function EmergencyLink() {
  return (
    <Link
      href="/emergency"
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-3.5 shadow-card transition-colors hover:border-warning/50"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-warning-soft text-lg">
        🆘
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">Emergency info</p>
        <p className="text-xs text-text-mute">
          112, embassies, card lines & hotels — works offline
        </p>
      </div>
      <span className="text-text-mute">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
