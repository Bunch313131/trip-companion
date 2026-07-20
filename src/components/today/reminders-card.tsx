'use client';

import { useState } from 'react';
import { patchReminder } from '@/lib/mutations';
import { useAuth } from '@/lib/auth-context';
import type { ReminderDoc, WithId } from '@/types/domain';

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * "Heads up" reminders on the Today screen. Surfaces what to remember today
 * plus standing (anytime) reminders; upcoming and done are tucked away. Check
 * one off and it's handled. Add manually or via the chatbot.
 */
export function RemindersCard({
  tripId,
  reminders,
  todayISO,
  onAdd,
  onEdit,
}: {
  tripId: string;
  reminders: WithId<ReminderDoc>[];
  todayISO: string;
  onAdd: () => void;
  onEdit: (r: WithId<ReminderDoc>) => void;
}) {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const active = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);
  const heads = active.filter((r) => (r.dateISO && r.dateISO <= todayISO) || r.standing);
  const upcoming = active
    .filter((r) => r.dateISO && r.dateISO > todayISO)
    .sort((a, b) => (a.dateISO! < b.dateISO! ? -1 : 1));

  const toggle = (r: WithId<ReminderDoc>) =>
    uid && patchReminder(tripId, r.id, uid, { done: !r.done });

  // Nothing at all — a slim entry point so it's easy to start capturing.
  if (reminders.length === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface px-4 py-2.5 text-xs font-medium text-text-dim transition-colors hover:border-primary/50 hover:text-primary"
      >
        <PlusIcon /> Add a reminder
      </button>
    );
  }

  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text">
          <span>📌</span> Reminders
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-soft"
        >
          <PlusIcon /> Add
        </button>
      </div>

      {heads.length === 0 && upcoming.length === 0 && (
        <p className="py-1 text-xs text-text-mute">Nothing to remember right now.</p>
      )}

      <div className="space-y-1.5">
        {heads.map((r) => (
          <Row key={r.id} r={r} onToggle={() => toggle(r)} onEdit={() => onEdit(r)} />
        ))}
      </div>

      {upcoming.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowUpcoming((v) => !v)}
            className="text-[11px] font-medium text-text-mute transition-colors hover:text-text-dim"
          >
            {showUpcoming ? 'Hide' : `Show ${upcoming.length} upcoming`}
          </button>
          {showUpcoming && (
            <div className="mt-1.5 space-y-1.5">
              {upcoming.map((r) => (
                <Row key={r.id} r={r} onToggle={() => toggle(r)} onEdit={() => onEdit(r)} showDate />
              ))}
            </div>
          )}
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
    </section>
  );
}

function Row({
  r,
  onToggle,
  onEdit,
  showDate,
  dim,
}: {
  r: WithId<ReminderDoc>;
  onToggle: () => void;
  onEdit: () => void;
  showDate?: boolean;
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
        <p className="text-[11px] text-text-mute">
          {r.standing ? 'Anytime' : r.dateISO ? (showDate ? shortDate(r.dateISO) : 'Today') : ''}
        </p>
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
