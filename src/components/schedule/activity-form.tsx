'use client';

import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { addToCollection, patchActivity, softDelete } from '@/lib/mutations';
import { useAuth } from '@/lib/auth-context';
import type { ActivityDoc, WithId } from '@/types/domain';

const KINDS: { value: ActivityDoc['kind']; label: string }[] = [
  { value: 'sightseeing', label: 'Sightseeing' },
  { value: 'day_trip', label: 'Day trip' },
  { value: 'meal', label: 'Meal' },
  { value: 'entertainment', label: 'Fun' },
  { value: 'transit', label: 'Transit' },
  { value: 'rest', label: 'Rest' },
  { value: 'idea', label: 'Idea' },
  { value: 'other', label: 'Other' },
];
const STATUSES: { value: ActivityDoc['status']; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'tentative', label: 'Tentative' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
];
const CURRENCIES = ['EUR', 'USD', 'CHF'];

function tsToLocalInput(ts?: Timestamp | null): string {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ActivityForm({
  open,
  onClose,
  tripId,
  stopId,
  defaultDateISO,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  tripId: string;
  stopId: string;
  /** Prefill the date (a stop day) when adding a fresh activity. */
  defaultDateISO?: string | null;
  existing?: WithId<ActivityDoc> | null;
}) {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const editing = !!existing;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [kind, setKind] = useState<ActivityDoc['kind']>(existing?.kind ?? 'sightseeing');
  const [status, setStatus] = useState<ActivityDoc['status']>(existing?.status ?? 'idea');
  const [startsAt, setStartsAt] = useState(
    existing ? tsToLocalInput(existing.startsAt) : defaultDateISO ? `${defaultDateISO}T09:00` : ''
  );
  const [location, setLocation] = useState(existing?.location ?? '');
  const [cost, setCost] = useState(existing?.costCents != null ? String(existing.costCents / 100) : '');
  const [currency, setCurrency] = useState(existing?.costCurrency ?? 'EUR');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // Auto-disarm the delete confirmation if the user doesn't follow through.
  useEffect(() => {
    if (!confirmDel) return;
    const id = setTimeout(() => setConfirmDel(false), 3500);
    return () => clearTimeout(id);
  }, [confirmDel]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !uid) return;
    setBusy(true);
    try {
      const data: Record<string, unknown> = {
        stopId,
        title: title.trim(),
        kind,
        status,
        startsAt: startsAt ? Timestamp.fromDate(new Date(startsAt)) : null,
        location: location.trim() || null,
        costCents: cost ? Math.round(parseFloat(cost) * 100) : null,
        costCurrency: cost ? currency : null,
        notes: notes.trim() || null,
      };
      if (editing) {
        await patchActivity(tripId, existing!.id, uid, data);
        toast.success('Activity updated');
      } else {
        await addToCollection(tripId, 'activities', uid, data);
        toast.success('Activity added');
      }
      onClose();
    } catch (err) {
      toast.error((err as Error).message || 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!editing || !uid) return;
    setBusy(true);
    try {
      await softDelete(tripId, 'activities', existing!.id, uid);
      toast.success('Activity removed');
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
              {editing ? 'Edit activity' : 'Add activity'}
            </Drawer.Title>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <Field label="What">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                  placeholder="Rhine Falls, dinner at…"
                  autoFocus
                />
              </Field>

              <div>
                <span className="mb-1 block text-xs font-medium text-text-mute">Kind</span>
                <div className="flex flex-wrap gap-1.5">
                  {KINDS.map((k) => (
                    <button
                      key={k.value}
                      type="button"
                      onClick={() => setKind(k.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        kind === k.value
                          ? 'bg-primary text-primary-ink'
                          : 'border border-border bg-surface text-text-dim'
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date & time">
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ActivityDoc['status'])}
                    className={inputCls}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Address / location — used for Navigate">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputCls}
                  placeholder="Street + city, or a place Apple Maps knows"
                />
              </Field>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Field label="Cost">
                  <input
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className={inputCls}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Currency">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
              </Field>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-ink disabled:opacity-60"
                >
                  {busy ? 'Saving…' : editing ? 'Save changes' : 'Add activity'}
                </button>
                {editing &&
                  (confirmDel ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={busy}
                      className="rounded-lg border border-warning bg-warning-soft px-3 py-2.5 text-sm font-semibold text-warning disabled:opacity-60"
                    >
                      {busy ? 'Deleting…' : 'Confirm delete'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDel(true)}
                      disabled={busy}
                      className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-text-dim transition-colors hover:text-warning disabled:opacity-60"
                    >
                      Delete
                    </button>
                  ))}
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
