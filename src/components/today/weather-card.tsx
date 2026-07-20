'use client';

import { useEffect, useState } from 'react';
import { weatherCode, cToF, type WeatherResponse, type WeatherDay } from '@/lib/weather';

/**
 * Weather front-and-center on Today. Fetches Open-Meteo (free, key-less) for a
 * stop's coordinates and shows the forecast for `dateISO`. Renders nothing
 * until data arrives; shows a gentle note if the date is beyond the forecast
 * horizon (Open-Meteo only reaches ~16 days out).
 */
export function WeatherCard({
  lat,
  lng,
  dateISO,
  label,
}: {
  lat: number;
  lng: number;
  dateISO: string;
  label?: string;
}) {
  const [state, setState] = useState<{ day: WeatherDay | null; outOfRange: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      start: dateISO,
      end: dateISO,
    });
    fetch(`/api/weather?${params}`)
      .then((r) => r.json() as Promise<WeatherResponse>)
      .then((data) => {
        if (!alive) return;
        const day = data.days.find((d) => d.date === dateISO) ?? null;
        setState({ day, outOfRange: !!data.outOfRange || (!day && data.days.length === 0) });
      })
      .catch(() => alive && setState({ day: null, outOfRange: true }));
    return () => {
      alive = false;
    };
  }, [lat, lng, dateISO]);

  if (!state) {
    return <div className="h-20 animate-pulse rounded-card bg-surface" />;
  }

  if (!state.day) {
    // Beyond forecast range — don't clutter; a quiet note only.
    return (
      <section className="rounded-card border border-border bg-surface px-4 py-3 shadow-card">
        <p className="text-xs text-text-mute">
          Forecast for {label ?? 'your destination'} appears as the day gets closer.
        </p>
      </section>
    );
  }

  const { day } = state;
  const wx = weatherCode(day.code);

  return (
    <section className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-card">
      <span className="text-4xl leading-none" aria-hidden>
        {wx.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="font-display text-2xl font-bold text-text">
            {cToF(day.tempMax)}°
            <span className="ml-1 align-middle text-sm font-medium text-text-mute">
              / {cToF(day.tempMin)}°F
            </span>
          </p>
        </div>
        <p className="text-sm text-text-dim">
          {wx.label}
          {label ? ` · ${label}` : ''}
        </p>
      </div>
      {day.precipProb != null && day.precipProb >= 20 && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-primary">💧 {day.precipProb}%</p>
          <p className="text-[10px] text-text-mute">rain</p>
        </div>
      )}
    </section>
  );
}
