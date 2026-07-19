import { AppHeader } from '@/components/nav/app-header';

/**
 * A styled "not built yet" state used for screens that arrive in later
 * phases. Keeps navigation coherent and on-brand during Phase 1.
 */
export function PhasePlaceholder({
  section,
  title,
  body,
  phase,
  icon,
}: {
  section: string;
  title: string;
  body: string;
  phase: string;
  icon: React.ReactNode;
}) {
  return (
    <>
      <AppHeader section={section} />
      <main className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-border bg-surface text-primary shadow-card">
          {icon}
        </div>
        <h1 className="font-display text-xl font-semibold text-text">{title}</h1>
        <p className="mt-2 max-w-xs text-sm text-text-dim">{body}</p>
        <span className="mt-5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-text-mute">
          {phase}
        </span>
      </main>
    </>
  );
}
