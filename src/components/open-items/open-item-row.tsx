'use client';

import type { OpenItemDoc, WithId } from '@/types/domain';

const KIND_LABEL: Record<string, string> = {
  verify: 'Verify',
  decide: 'Decide',
  resolve: 'Resolve',
  confirm: 'Confirm',
};

const PRIORITY_ACCENT: Record<string, string> = {
  high: 'border-l-warning',
  medium: 'border-l-tentative',
  low: 'border-l-border',
};

export function prettyScope(scope: string): string {
  if (!scope || scope === 'general') return '';
  if (scope.startsWith('stop:')) {
    const s = scope.slice(5);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

export function OpenItemRow({
  item,
  onToggle,
}: {
  item: WithId<OpenItemDoc>;
  onToggle: (resolved: boolean) => void | Promise<void>;
}) {
  const resolved = item.status === 'resolved';
  const scope = prettyScope(item.scope);

  return (
    <div
      className={`flex items-start gap-3 border-l-2 bg-surface px-3 py-2.5 ${
        resolved ? 'border-l-border opacity-55' : PRIORITY_ACCENT[item.priority] ?? 'border-l-border'
      }`}
    >
      <button
        type="button"
        aria-label={resolved ? 'Reopen' : 'Mark resolved'}
        onClick={() => onToggle(!resolved)}
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
          resolved
            ? 'border-confirmed bg-confirmed text-white'
            : 'border-text-mute hover:border-confirmed'
        }`}
      >
        {resolved && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-mute">
            {KIND_LABEL[item.kind] ?? item.kind}
          </span>
          {scope && <span className="text-[11px] text-text-mute">{scope}</span>}
          {item.priority === 'high' && !resolved && (
            <span className="text-[11px] font-medium text-warning">High</span>
          )}
        </div>
        <p className={`text-sm leading-snug ${resolved ? 'text-text-mute line-through' : 'text-text'}`}>
          {item.description}
        </p>
      </div>
    </div>
  );
}
