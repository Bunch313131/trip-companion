'use client';

import { useEffect, useState } from 'react';
import { weatherCode, cToF, type WeatherResponse } from '@/lib/weather';

/**
 * The signature element of the app. A bold, filled-primary hero with soft
 * decorative geometry — confident and traveled, per the design brief. Two
 * variants: pre-trip countdown, and the during-trip "you are here" card with
 * live weather tiles inset on the color.
 */

const RINGS = (
  <>
    <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.08]" />
    <span className="pointer-events-none absolute -bottom-8 right-4 h-28 w-28 rounded-full border border-white/15" />
  </>
);

export function CountdownHero({
  startsOn,
  originIata,
  returnIata,
  startLabel,
  totalDays,
  stopCount,
  countryCount,
}: {
  startsOn: string;
  originIata: string;
  returnIata: string;
  startLabel: string;
  totalDays: number;
  stopCount: number;
  countryCount: number;
}) {
  // Lazy initializer computes on both server and client so the number is in the
  // initial HTML (robust even if hydration is delayed); the interval keeps it
  // fresh. Day-granularity tolerates any server/client midnight skew.
  const [days, setDays] = useState<number>(() =>
    Math.max(0, Math.ceil((new Date(`${startsOn}T00:00:00`).getTime() - Date.now()) / 86_400_000))
  );
  useEffect(() => {
    const target = new Date(`${startsOn}T00:00:00`).getTime();
    const calc = () => Math.max(0, Math.ceil((target - Date.now()) / 86_400_000));
    setDays(calc());
    const id = setInterval(() => setDays(calc()), 60_000);
    return () => clearInterval(id);
  }, [startsOn]);

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1E4E80] to-[#163A60] px-6 py-6 text-white shadow-card">
      {RINGS}
      <span className="text-xs font-semibold uppercase tracking-[0.1em] opacity-80">Countdown</span>
      <div className="mt-1.5 flex items-baseline gap-2.5" suppressHydrationWarning>
        <span className="font-display text-[64px] font-bold leading-[0.9] tracking-tight tnum">
          {days}
        </span>
        <span className="pb-1.5 text-[19px] font-semibold leading-tight opacity-90">
          days to
          <br />
          departure
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[13px] opacity-90">
        <span className="font-mono font-semibold">{originIata}</span>
        <span className="relative h-px flex-1 bg-white/35">
          <span className="absolute -top-[2px] right-0 h-[5px] w-[5px] rounded-full bg-white" />
        </span>
        <span className="font-mono font-semibold">{returnIata}</span>
      </div>
      <p className="mt-2 text-[12.5px] opacity-75">
        {startLabel} · {totalDays} days · {stopCount} stops across {countryCount} countries
      </p>
    </section>
  );
}

type Tile = { label: string; value: string };

export function PresenceHero({
  city,
  flagEmoji,
  subtitle,
  lat,
  lng,
  dateISO,
}: {
  city: string;
  flagEmoji: string;
  subtitle: string;
  lat?: number | null;
  lng?: number | null;
  dateISO: string;
}) {
  const [tiles, setTiles] = useState<Tile[] | null>(null);

  useEffect(() => {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      setTiles([]);
      return;
    }
    let alive = true;
    // Fetch today + tomorrow so we can show "now" and "tomorrow".
    const d = new Date(`${dateISO}T00:00:00`);
    const tmrw = new Date(d.getTime() + 86_400_000);
    const p = (n: number) => String(n).padStart(2, '0');
    const tmrwISO = `${tmrw.getFullYear()}-${p(tmrw.getMonth() + 1)}-${p(tmrw.getDate())}`;
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      start: dateISO,
      end: tmrwISO,
    });
    fetch(`/api/weather?${params}`)
      .then((r) => r.json() as Promise<WeatherResponse>)
      .then((data) => {
        if (!alive) return;
        const today = data.days.find((x) => x.date === dateISO);
        const tomorrow = data.days.find((x) => x.date === tmrwISO);
        const t: Tile[] = [];
        if (today) t.push({ label: 'Weather now', value: `${cToF(today.tempMax)}° ${weatherCode(today.code).emoji}` });
        if (tomorrow) t.push({ label: 'Tomorrow', value: `${cToF(tomorrow.tempMax)}° ${weatherCode(tomorrow.code).emoji}` });
        setTiles(t);
      })
      .catch(() => alive && setTiles([]));
    return () => {
      alive = false;
    };
  }, [lat, lng, dateISO]);

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1E4E80] to-[#163A60] px-6 py-5 text-white shadow-card">
      <span className="pointer-events-none absolute -right-8 -top-10 h-[150px] w-[150px] rounded-full bg-white/[0.08]" />
      <div className="flex items-center gap-2">
        <span className="relative h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-white" />
          <span className="absolute -inset-[5px] animate-ping rounded-full bg-white/40" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.1em] opacity-80">You are here</span>
      </div>
      <h2 className="mt-2 font-display text-[30px] font-bold tracking-tight">
        {city} <span className="align-middle">{flagEmoji}</span>
      </h2>
      <p className="mt-0.5 text-[13px] opacity-80">{subtitle}</p>

      {tiles && tiles.length > 0 && (
        <div className="mt-4 flex gap-2">
          {tiles.map((t) => (
            <span key={t.label} className="flex-1 rounded-[11px] bg-white/[0.14] px-3 py-2.5">
              <span className="block text-[11px] opacity-75">{t.label}</span>
              <span className="mt-0.5 block font-mono text-[15px] font-semibold">{t.value}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
