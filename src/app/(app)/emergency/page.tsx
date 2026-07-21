'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/nav/app-header';
import { useTrip } from '@/lib/trip-context';
import { useTripCollection, orderBy } from '@/lib/use-collection';
import { appleMapsDirections } from '@/lib/maps';
import {
  EU_EMERGENCY,
  STATE_DEPT_247,
  POSTS,
  CARD_ISSUERS,
  KEEP_SECURE,
} from '@/lib/emergency';
import type { ReservationDoc, StopDoc, WithId } from '@/types/domain';

const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;

export default function EmergencyPage() {
  const { tripId } = useTrip();
  const { docs: stops } = useTripCollection<StopDoc>(tripId, 'stops', orderBy('orderIdx'));
  const { docs: reservations } = useTripCollection<ReservationDoc>(tripId, 'reservations');

  const orderById = new Map(stops.map((s) => [s.id, s.orderIdx]));
  const cityById = new Map(stops.map((s) => [s.id, s.city]));
  const hotels = reservations
    .filter((r) => r.type === 'hotel' && r.status !== 'cancelled')
    .sort(
      (a, b) =>
        (orderById.get(a.stopId ?? '') ?? 99) - (orderById.get(b.stopId ?? '') ?? 99)
    );

  return (
    <>
      <AppHeader section="Emergency" />
      <main className="space-y-5 px-5 py-5">
        {/* ── Call now ── */}
        <section className="grid grid-cols-2 gap-3">
          <a
            href={`tel:${EU_EMERGENCY}`}
            className="flex flex-col items-center justify-center rounded-card border border-warning/40 bg-warning-soft px-3 py-4 text-center shadow-card transition-transform active:scale-[0.98]"
          >
            <span className="font-display text-3xl font-bold text-warning">{EU_EMERGENCY}</span>
            <span className="mt-0.5 text-[11px] font-medium text-text-dim">
              Europe-wide emergency
            </span>
            <span className="text-[10px] text-text-mute">Police · Ambulance · Fire</span>
          </a>
          <a
            href={telHref(STATE_DEPT_247.fromAbroad)}
            className="flex flex-col items-center justify-center rounded-card border border-primary/40 bg-primary-soft px-3 py-4 text-center shadow-card transition-transform active:scale-[0.98]"
          >
            <span className="font-display text-lg font-bold text-primary">U.S. citizens</span>
            <span className="mt-0.5 text-sm font-semibold text-text">
              {STATE_DEPT_247.fromAbroad}
            </span>
            <span className="text-[10px] text-text-mute">State Dept · 24/7 from abroad</span>
          </a>
        </section>

        <p className="-mt-2 text-center text-[11px] text-text-mute">
          Lost passport, arrest, medical, or safety emergency — the State Department line is
          answered around the clock and routes to the right consulate.
        </p>

        {/* ── U.S. posts ── */}
        <Group title="U.S. Embassy & Consulates" hint="Whoever's closest to where you are">
          {POSTS.map((p) => {
            const maps = appleMapsDirections({ query: p.mapsQuery });
            return (
              <div key={p.name} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-text">
                    <span className="mr-1">{p.flag}</span>
                    {p.name}
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-primary">{p.serves}</p>
                <p className="mt-1 text-xs text-text-dim">{p.address}</p>
                {p.phoneNote && <p className="mt-0.5 text-[11px] text-text-mute">{p.phoneNote}</p>}
                <div className="mt-2 flex gap-2">
                  <a
                    href={telHref(p.phone)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-ink"
                  >
                    <PhoneIcon /> {p.phone}
                  </a>
                  {maps && (
                    <a
                      href={maps}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-dim"
                    >
                      <PinIcon /> Directions
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </Group>

        {/* ── Cards ── */}
        <Group
          title="If a card is lost or stolen"
          hint="Freeze it in the app first, then call to confirm"
        >
          {CARD_ISSUERS.map((c) => (
            <div key={c.issuer} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-text">{c.issuer}</p>
                <span className="text-[11px] text-text-mute">{c.cards}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-text-mute">{c.note}</p>
              <a
                href={telHref(c.intlPhone)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-ink"
              >
                <PhoneIcon /> {c.intlPhone}
              </a>
            </div>
          ))}
        </Group>

        {/* ── Hotels (live) ── */}
        {hotels.length > 0 && (
          <Group title="Where we're staying" hint="Tap for directions back">
            {hotels.map((h) => {
              const maps = appleMapsDirections({ query: h.address || h.name });
              return (
                <div key={h.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-text">{h.name}</p>
                    {h.stopId && cityById.get(h.stopId) && (
                      <span className="shrink-0 text-[11px] font-medium text-primary">
                        {cityById.get(h.stopId)}
                      </span>
                    )}
                  </div>
                  {h.address && <p className="mt-0.5 text-xs text-text-dim">{h.address}</p>}
                  {maps && (
                    <a
                      href={maps}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-dim"
                    >
                      <PinIcon /> Directions
                    </a>
                  )}
                </div>
              );
            })}
          </Group>
        )}

        {/* ── Keep secure ── */}
        <section className="rounded-card border border-border bg-surface-2 p-4">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text">
            <span>🔒</span> Keep these somewhere safe — not here
          </h2>
          <p className="mt-1 text-xs text-text-dim">
            This screen holds only public numbers on purpose. Keep anything sensitive in a password
            manager or a locked note, with a paper copy separate from the originals:
          </p>
          <ul className="mt-2 space-y-1">
            {KEEP_SECURE.map((k) => (
              <li key={k} className="flex gap-2 text-xs text-text-dim">
                <span className="text-text-mute">•</span>
                {k}
              </li>
            ))}
          </ul>
        </section>

        <Link href="/" className="block text-center text-xs font-medium text-primary">
          ← Back to Today
        </Link>
      </main>
    </>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-card">
      <h2 className="font-display text-sm font-semibold text-text">{title}</h2>
      {hint && <p className="mt-0.5 text-[11px] text-text-mute">{hint}</p>}
      <div className="mt-1 divide-y divide-border">{children}</div>
    </section>
  );
}

function PhoneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8 9.6a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}
