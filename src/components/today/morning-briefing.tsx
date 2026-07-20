'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

type Briefing = { narrative: string; leaveBy: string | null; eventCount: number };

/**
 * The companion's morning briefing — a warm, practical rundown of the day
 * ("here's your day, aim to leave by ~9:15"). Generated server-side from the
 * live schedule + weather, with a deterministic fallback so it's never blank.
 */
export function MorningBriefing({ tripId, dateISO }: { tripId: string; dateISO: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<Briefing | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const token = await user.getIdToken();
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch('/api/briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tripId, date: dateISO, tz }),
        });
        if (!res.ok) throw new Error('briefing failed');
        const json = (await res.json()) as Briefing;
        if (alive) setData(json);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, tripId, dateISO]);

  if (failed) return null;

  return (
    <section className="rounded-card border border-primary/30 bg-gradient-to-br from-primary-soft to-surface p-4 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-ink">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7L5.6 5.6" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </span>
        <h2 className="font-display text-sm font-semibold text-text">Your morning briefing</h2>
        {data?.leaveBy && (
          <span className="ml-auto rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-ink">
            Leave by ~{data.leaveBy}
          </span>
        )}
      </div>
      {data ? (
        <p className="text-sm leading-relaxed text-text">{data.narrative}</p>
      ) : (
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-surface-2" />
        </div>
      )}
    </section>
  );
}
