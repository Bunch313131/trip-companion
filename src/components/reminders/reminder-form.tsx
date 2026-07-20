'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
import { addToCollection, patchReminder, deleteReminder } from '@/lib/mutations';
import { useAuth } from '@/lib/auth-context';
import { flag } from '@/lib/format';
import type { ReminderDoc, StopDoc, WithId } from '@/types/domain';

function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ReminderForm({
  open,
  onClose,
  tripId,
  stops,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  tripId: string;
  stops: WithId<StopDoc>[];
  existing?: WithId<ReminderDoc> | null;
}) {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const editing = !!existing;

  const [text, setText] = useState(existing?.text ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [standing, setStanding] = useState(existing?.standing ?? !existing?.dateISO);
  const [dateISO, setDateISO] = useState(existing?.dateISO ?? todayISO());
  const [stopId, setStopId] = useState(existing?.stopId ?? '');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !uid) return;
    setBusy(true);
    try {
      const data: Record<string, unknown> = {
        text: text.trim(),
        title: title.trim() || null,
        standing,
        dateISO: standing ? null : dateISO || null,
        stopId: stopId || null,
      };
      if (editing) {
        await patchReminder(tripId, existing!.id, uid, data);
        toast.success('Reminder updated');
      } else {
        await addToCollection(tripId, 'reminders', uid, { ...data, done: false });
        toast.success('Reminder added');
      }
      onClose();
    } catch (err) {
      toast.error((err as Error).message || 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setBusy(true);
    try {
      await deleteReminder(tripId, existing!.id);
      toast.success('Reminder removed');
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-2xl border border-border bg-bg outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-border" />
          <div className="overflow-y-auto px-5 pb-8 pt-3">
            <Drawer.Title className="font-display text-lg font-semibold text-text">
              {editing ? 'Edit reminder' : 'New reminder'}
            </Drawer.Title>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <Field label="Reminder">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="At the rental desk, ask: winter equipment? cross-border fee? fuel policy?"
                  autoFocus
                />
              </Field>

              <Field label="Label (optional)">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                  placeholder="Rental car pickup"
                />
              </Field>

              <div>
                <span className="mb-1 block text-xs font-medium text-text-mute">When</span>
                <div className="flex rounded-lg border border-border bg-surface p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setStanding(false)}
                    className={`flex-1 rounded-md py-1.5 transition-colors ${
                      !standing ? 'bg-primary text-primary-ink' : 'text-text-dim'
                    }`}
                  >
                    On a day
                  </button>
                  <button
                    type="button"
                    onClick={() => setStanding(true)}
                    className={`flex-1 rounded-md py-1.5 transition-colors ${
                      standing ? 'bg-primary text-primary-ink' : 'text-text-dim'
                    }`}
                  >
                    Anytime
                  </button>
                </div>
                {!standing && (
                  <input
                    type="date"
                    value={dateISO}
                    onChange={(e) => setDateISO(e.target.value)}
                    className={`${inputCls} mt-2`}
                  />
                )}
                {standing && (
                  <p className="mt-1.5 text-[11px] text-text-mute">
                    Shows in your reminders throughout the trip.
                  </p>
                )}
              </div>

              <Field label="Stop (optional)">
                <select value={stopId} onChange={(e) => setStopId(e.target.value)} className={inputCls}>
                  <option value="">None</option>
                  {stops
                    .filter((s) => s.status !== 'cancelled')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.city} {flag(s.country)}
                      </option>
                    ))}
                </select>
              </Field>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-ink disabled:opacity-60"
                >
                  {busy ? 'Saving…' : editing ? 'Save changes' : 'Add reminder'}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={busy}
                    className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-text-dim transition-colors hover:text-warning disabled:opacity-60"
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-mute focus:border-primary focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-mute">{label}</span>
      {children}
    </label>
  );
}
