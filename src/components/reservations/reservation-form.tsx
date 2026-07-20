'use client';

import { useEffect, useRef, useState } from 'react';
import { Drawer } from 'vaul';
import { Timestamp, type DocumentReference } from 'firebase/firestore';
import { toast } from 'sonner';
import { newDocRef, createDoc, patchReservation, softDelete } from '@/lib/mutations';
import { useAuth } from '@/lib/auth-context';
import { flag } from '@/lib/format';
import type { ReservationDoc, StopDoc, WithId } from '@/types/domain';

const TYPES: ReservationDoc['type'][] = [
  'flight', 'hotel', 'rail', 'car', 'ticket', 'restaurant', 'activity', 'other',
];
const STATUSES: { value: ReservationDoc['status']; label: string }[] = [
  { value: 'to_book', label: 'To book' },
  { value: 'booked', label: 'Booked' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];
const CURRENCIES = ['EUR', 'USD', 'CHF'];

function tsToLocalInput(ts?: Timestamp | null): string {
  if (!ts?.toDate) return '';
  return dateToInput(ts.toDate());
}
function isoToLocalInput(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? '' : dateToInput(d);
}
function dateToInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ReservationForm({
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
  existing?: WithId<ReservationDoc> | null;
}) {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const editing = !!existing;

  const [type, setType] = useState<ReservationDoc['type']>(existing?.type ?? 'hotel');
  const [name, setName] = useState(existing?.name ?? '');
  const [stopId, setStopId] = useState(existing?.stopId ?? '');
  const [startsAt, setStartsAt] = useState(tsToLocalInput(existing?.startsAt));
  const [confirmation, setConfirmation] = useState(existing?.confirmation ?? '');
  const [provider, setProvider] = useState(existing?.provider ?? '');
  const [cost, setCost] = useState(existing?.costCents != null ? String(existing.costCents / 100) : '');
  const [currency, setCurrency] = useState(existing?.costCurrency ?? 'EUR');
  const [status, setStatus] = useState<ReservationDoc['status']>(existing?.status ?? 'to_book');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [documentUrl, setDocumentUrl] = useState<string | null>(existing?.documentUrl ?? null);
  const [documentMime, setDocumentMime] = useState<string | null>(existing?.documentMime ?? null);
  const [parsing, setParsing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // Auto-disarm the delete confirmation if the user doesn't follow through.
  useEffect(() => {
    if (!confirmDel) return;
    const id = setTimeout(() => setConfirmDel(false), 3500);
    return () => clearTimeout(id);
  }, [confirmDel]);

  // Stable ref for a new reservation so the doc + its storage path share an id.
  const newRef = useRef<DocumentReference | null>(null);
  function docRef(): DocumentReference | null {
    if (editing) return null;
    if (!newRef.current) newRef.current = newDocRef(tripId, 'reservations');
    return newRef.current;
  }
  const currentDocId = editing ? existing!.id : docRef()!.id;

  async function handleFile(file: File | null) {
    if (!file || !user) return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tripId', tripId);
      fd.append('docId', currentDocId);
      const token = await user.getIdToken();
      const res = await fetch('/api/reservations/parse-doc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setDocumentUrl(data.documentUrl);
      setDocumentMime(data.documentMime);

      const ex = data.extracted as Record<string, string | number> | null;
      if (ex) {
        if (typeof ex.type === 'string' && TYPES.includes(ex.type as ReservationDoc['type'])) {
          setType(ex.type as ReservationDoc['type']);
        }
        if (ex.name && !name.trim()) setName(String(ex.name));
        if (ex.provider && !provider.trim()) setProvider(String(ex.provider));
        if (ex.confirmation && !confirmation.trim()) setConfirmation(String(ex.confirmation));
        if (ex.starts_at && !startsAt) setStartsAt(isoToLocalInput(String(ex.starts_at)));
        if (ex.cost_cents && !cost) setCost(String(Number(ex.cost_cents) / 100));
        if (ex.cost_currency && !cost) setCurrency(String(ex.cost_currency));
        toast.success('Filled from your document');
      } else {
        toast.success('Document attached');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !uid) return;
    setBusy(true);
    try {
      const data: Record<string, unknown> = {
        type,
        name: name.trim(),
        stopId: stopId || null,
        startsAt: startsAt ? Timestamp.fromDate(new Date(startsAt)) : null,
        confirmation: confirmation.trim() || null,
        provider: provider.trim() || null,
        costCents: cost ? Math.round(parseFloat(cost) * 100) : null,
        costCurrency: cost ? currency : null,
        status,
        notes: notes.trim() || null,
        ...(documentUrl ? { documentUrl, documentMime } : {}),
      };
      if (editing) {
        await patchReservation(tripId, existing!.id, uid, data);
        toast.success('Booking updated');
      } else {
        await createDoc(docRef()!, uid, data);
        toast.success('Booking added');
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
      await softDelete(tripId, 'reservations', existing!.id, uid);
      toast.success('Booking removed');
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
              {editing ? 'Edit booking' : 'Add booking'}
            </Drawer.Title>

            {/* Upload & auto-fill — first, so it can populate the rest */}
            <div className="mt-4 rounded-lg border border-dashed border-primary/40 bg-primary-soft/40 p-3">
              <p className="text-xs font-medium text-text">Upload a ticket or confirmation</p>
              <p className="mb-2 text-[11px] text-text-mute">
                PDF or photo — the AI reads it and fills in the details below.
              </p>
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={parsing}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-text-dim file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-ink disabled:opacity-60"
              />
              {parsing && (
                <p className="mt-2 flex items-center gap-2 text-xs text-primary">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
                  Reading document…
                </p>
              )}
              {documentUrl && !parsing && (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-confirmed"
                >
                  ✓ Document attached — view
                </a>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      type === t ? 'bg-primary text-primary-ink' : 'border border-border bg-surface text-text-dim'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <Field label="Name">
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Hotel Sonne, Delta DL123…" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Stop">
                  <select value={stopId} onChange={(e) => setStopId(e.target.value)} className={inputCls}>
                    <option value="">Trip-wide</option>
                    {stops.filter((s) => s.status !== 'cancelled').map((s) => (
                      <option key={s.id} value={s.id}>{s.city} {flag(s.country)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={status} onChange={(e) => setStatus(e.target.value as ReservationDoc['status'])} className={inputCls}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Date & time">
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Confirmation #">
                  <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Provider">
                  <input value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Field label="Cost">
                  <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={inputCls} placeholder="0.00" />
                </Field>
                <Field label="Currency">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
              </Field>

              <div className="flex items-center gap-2 pt-1">
                <button type="submit" disabled={busy || parsing} className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-ink disabled:opacity-60">
                  {busy ? 'Saving…' : editing ? 'Save changes' : 'Add booking'}
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
