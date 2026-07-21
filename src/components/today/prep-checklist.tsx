'use client';

import { useState } from 'react';
import { patchReminder } from '@/lib/mutations';
import { useAuth } from '@/lib/auth-context';
import type { ReminderDoc, WithId } from '@/types/domain';

/**
 * "Before you go" checklist, shown only in the pre-trip phase. Backed by the
 * reminders collection (category: 'prep'), so items are checkable and the
 * chatbot can add to them. Done items collapse to the bottom.
 */
export function PrepChecklist({
  tripId,
  reminders,
  onEdit,
}: {
  tripId: string;
  reminders: WithId<ReminderDoc>[];
  onEdit: (r: WithId<ReminderDoc>) => void;
}) {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [showDone, setShowDone] = useState(false);

  const prep = reminders.filter((r) => r.category === 'prep');
  if (prep.length === 0) return null;

  const todo = prep.filter((r) => !r.done);
  const done = prep.filter((r) => r.done);
  const toggle = (r: WithId<ReminderDoc>) =>
    uid && patchReminder(tripId, r.id, uid, { done: !r.done });

  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text">
          <span>✈️</span> Before you go
        </h2>
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
          {todo.length} left
        </span>
      </div>

      {todo.length === 0 ? (
        <p className="py-1 text-xs text-confirmed">All set — nice work. 🎉</p>
      ) : (
        <div className="space-y-1.5">
          {todo.map((r) => (
            <Row key={r.id} r={r} onToggle={() => toggle(r)} onEdit={() => onEdit(r)} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="text-[11px] font-medium text-text-mute transition-colors hover:text-text-dim"
          >
            {showDone ? 'Hide done' : `${done.length} done`}
          </button>
          {showDone && (
            <div className="mt-1.5 space-y-1.5">
              {done.map((r) => (
                <Row key={r.id} r={r} onToggle={() => toggle(r)} onEdit={() => onEdit(r)} dim />
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-3 flex gap-1.5 rounded-lg bg-surface-2 px-2.5 py-2 text-[11px] leading-snug text-text-mute">
        <span aria-hidden>💡</span>
        <span>
          No need to call Amex, Capital One, or Bank of America before you fly — none of your cards
          require a travel notice anymore. Just make sure their apps are installed and transaction
          alerts are on.
        </span>
      </p>
    </section>
  );
}

function Row({
  r,
  onToggle,
  onEdit,
  dim,
}: {
  r: WithId<ReminderDoc>;
  onToggle: () => void;
  onEdit: () => void;
  dim?: boolean;
}) {
  return (
    <div className={`flex items-start gap-2.5 ${dim ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={r.done ? 'Mark not done' : 'Mark done'}
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors ${
          r.done ? 'border-confirmed bg-confirmed text-white' : 'border-text-mute hover:border-primary'
        }`}
      >
        {r.done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className={`text-sm leading-snug text-text ${r.done ? 'line-through' : ''}`}>
          {r.title && <span className="font-semibold">{r.title} — </span>}
          {r.text}
        </p>
      </button>
    </div>
  );
}
