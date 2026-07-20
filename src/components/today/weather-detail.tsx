'use client';

import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import {
  weatherCode,
  cToF,
  kmhToMph,
  fmtHour,
  fmtDow,
  type WeatherDetailResponse,
  type TripStopForecast,
  type TripStopInput,
  type TripWeatherResponse,
} from '@/lib/weather';

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtClock(iso?: string | null): string | null {
  if (!iso) return null;
  const hh = Number(iso.slice(11, 13));
  const mm = iso.slice(14, 16);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm} ${ampm}`;
}

function nowHourKey(tz: string): string {
  // Current time at the location, as "YYYY-MM-DDTHH" to compare with hourly.
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour') === '24' ? '00' : get('hour')}`;
}

export function WeatherDetail({
  open,
  onClose,
  lat,
  lng,
  label,
  tripStops,
}: {
  open: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  label?: string;
  /** Upcoming stops to show in the "across your trip" outlook. */
  tripStops?: TripStopInput[];
}) {
  const [data, setData] = useState<WeatherDetailResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [trip, setTrip] = useState<TripStopForecast[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setData(null);
    setFailed(false);
    fetch(`/api/weather?lat=${lat}&lng=${lng}&detail=1`)
      .then((r) => r.json() as Promise<WeatherDetailResponse>)
      .then((d) => {
        if (!alive) return;
        if (!d.days?.length) setFailed(true);
        else setData(d);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [open, lat, lng]);

  useEffect(() => {
    if (!open || !tripStops?.length) {
      setTrip(null);
      return;
    }
    let alive = true;
    fetch('/api/weather/trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stops: tripStops }),
    })
      .then((r) => r.json() as Promise<TripWeatherResponse>)
      .then((d) => alive && setTrip(d.stops ?? []))
      .catch(() => alive && setTrip([]));
    return () => {
      alive = false;
    };
    // Re-run only when the set of stops changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(tripStops)]);

  const today = data?.days[0];
  const wx = weatherCode(data?.current?.code ?? today?.code);
  const heroTemp = data?.current?.temp ?? today?.tempMax;
  const feels = data?.current?.feels ?? today?.feelsMax;

  const upcomingHours = (() => {
    if (!data?.hours?.length) return [];
    const key = nowHourKey(data.timezone);
    return data.hours.filter((h) => h.time.slice(0, 13) >= key).slice(0, 18);
  })();

  // Temperature range across the week, for the mini bars.
  const weekLo = data ? Math.min(...data.days.map((d) => d.tempMin)) : 0;
  const weekHi = data ? Math.max(...data.days.map((d) => d.tempMax)) : 1;
  const span = Math.max(1, weekHi - weekLo);

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-2xl border border-border bg-bg outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-border" />
          <div className="overflow-y-auto px-5 pb-8 pt-3">
            <Drawer.Title className="font-display text-lg font-semibold text-text">
              {label ? `${label} weather` : 'Weather'}
            </Drawer.Title>

            {failed ? (
              <p className="mt-4 text-sm text-text-mute">
                Forecast isn&apos;t available for this spot yet — it appears as the day gets closer.
              </p>
            ) : !data || !today ? (
              <div className="mt-4 space-y-3">
                <div className="h-20 animate-pulse rounded-card bg-surface" />
                <div className="h-24 animate-pulse rounded-card bg-surface" />
              </div>
            ) : (
              <>
                {/* Hero */}
                <div className="mt-4 flex items-center gap-4">
                  <span className="text-5xl leading-none" aria-hidden>
                    {wx.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-3xl font-bold text-text">
                      {heroTemp != null ? cToF(heroTemp) : '—'}°
                    </p>
                    <p className="text-sm text-text-dim">
                      {wx.label}
                      {feels != null ? ` · feels ${cToF(feels)}°` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="font-semibold text-text">H {cToF(today.tempMax)}°</p>
                    <p className="text-text-mute">L {cToF(today.tempMin)}°</p>
                  </div>
                </div>

                {/* Metric tiles */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Metric emoji="💧" label="Rain" value={today.precipProb != null ? `${today.precipProb}%` : '—'} />
                  <Metric emoji="💨" label="Wind" value={today.windMax != null ? `${kmhToMph(today.windMax)} mph` : '—'} />
                  <Metric emoji="☀️" label="UV" value={today.uvMax != null ? String(Math.round(today.uvMax)) : '—'} />
                </div>
                {(today.sunrise || today.sunset) && (
                  <p className="mt-2 text-center text-xs text-text-mute">
                    🌅 {fmtClock(today.sunrise) ?? '—'} &nbsp;·&nbsp; 🌇 {fmtClock(today.sunset) ?? '—'}
                  </p>
                )}

                {/* Hourly */}
                {upcomingHours.length > 0 && (
                  <div className="mt-5">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-mute">
                      Next hours
                    </h3>
                    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
                      {upcomingHours.map((h) => (
                        <div
                          key={h.time}
                          className="flex w-14 shrink-0 flex-col items-center gap-1 rounded-xl bg-surface py-2"
                        >
                          <span className="text-[11px] text-text-mute">{fmtHour(h.time)}</span>
                          <span className="text-lg leading-none">{weatherCode(h.code).emoji}</span>
                          <span className="text-sm font-semibold text-text">{cToF(h.temp)}°</span>
                          <span className="text-[10px] text-primary">
                            {h.precipProb != null && h.precipProb >= 10 ? `${h.precipProb}%` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7-day */}
                <div className="mt-5">
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-mute">
                    7-day outlook
                  </h3>
                  <div className="space-y-1">
                    {data.days.map((d, i) => {
                      const loPct = ((d.tempMin - weekLo) / span) * 100;
                      const hiPct = ((d.tempMax - weekLo) / span) * 100;
                      return (
                        <div key={d.date} className="flex items-center gap-3 py-1">
                          <span className="w-9 shrink-0 text-sm font-medium text-text">
                            {i === 0 ? 'Today' : fmtDow(d.date)}
                          </span>
                          <span className="w-6 shrink-0 text-center text-base">
                            {weatherCode(d.code).emoji}
                          </span>
                          <span className="w-9 shrink-0 text-right text-[11px] text-primary">
                            {d.precipProb != null && d.precipProb >= 10 ? `${d.precipProb}%` : ''}
                          </span>
                          <span className="w-8 shrink-0 text-right text-sm text-text-mute">
                            {cToF(d.tempMin)}°
                          </span>
                          <span className="relative h-1.5 flex-1 rounded-full bg-surface-2">
                            <span
                              className="absolute top-0 h-1.5 rounded-full bg-gradient-to-r from-primary/60 to-accent"
                              style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
                            />
                          </span>
                          <span className="w-8 shrink-0 text-sm font-semibold text-text">
                            {cToF(d.tempMax)}°
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Across your trip */}
                {trip && trip.some((s) => s.day) && (
                  <div className="mt-5">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-mute">
                      Across your trip
                    </h3>
                    <div className="space-y-1">
                      {trip.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 py-1">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                            {s.city}
                          </span>
                          <span className="shrink-0 text-xs text-text-mute">{shortDate(s.date)}</span>
                          {s.day ? (
                            <>
                              <span className="w-6 shrink-0 text-center text-base">
                                {weatherCode(s.day.code).emoji}
                              </span>
                              <span className="w-9 shrink-0 text-right text-[11px] text-primary">
                                {s.day.precipProb != null && s.day.precipProb >= 10
                                  ? `${s.day.precipProb}%`
                                  : ''}
                              </span>
                              <span className="w-16 shrink-0 text-right text-sm">
                                <span className="font-semibold text-text">{cToF(s.day.tempMax)}°</span>
                                <span className="text-text-mute"> / {cToF(s.day.tempMin)}°</span>
                              </span>
                            </>
                          ) : (
                            <span className="shrink-0 text-xs text-text-mute">check closer</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mt-5 text-center text-[10px] text-text-mute">
                  Forecast by Open-Meteo · updates through the day
                </p>
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Metric({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-surface py-2.5">
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-sm font-semibold text-text">{value}</span>
      <span className="text-[10px] text-text-mute">{label}</span>
    </div>
  );
}
