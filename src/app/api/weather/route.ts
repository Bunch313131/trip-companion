import { NextResponse } from 'next/server';
import type { WeatherResponse, WeatherDetailResponse } from '@/lib/weather';

/**
 * Free, key-less weather via Open-Meteo. Two modes:
 *  - default: a daily forecast for a lat/lng (optionally a date range) — the
 *    lightweight payload the Today card uses.
 *  - detail=1: current conditions + hourly + a 7-day daily forecast with
 *    extras (feels-like, wind, UV, sunrise/sunset) for the tap-through view.
 * Cached for 30 min.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const detail = searchParams.get('detail') === '1';

  if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    timezone: 'auto',
    daily: detail
      ? 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max,sunrise,sunset,apparent_temperature_max,apparent_temperature_min'
      : 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  });

  if (detail) {
    params.set('forecast_days', '7');
    params.set('hourly', 'temperature_2m,precipitation_probability,weather_code');
    params.set('current', 'temperature_2m,apparent_temperature,weather_code');
  } else if (start && end) {
    params.set('start_date', start);
    params.set('end_date', end);
  } else {
    params.set('forecast_days', '7');
  }

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) {
      return NextResponse.json({ days: [], outOfRange: true } as WeatherResponse);
    }
    const data = await res.json();
    const d = data.daily;
    const round = (v: unknown) => (v == null ? null : Math.round(Number(v)));

    const days = (d?.time ?? [])
      // Drop edge-of-horizon days whose temperature comes back null (they'd
      // otherwise render as a bogus 0°/32°F).
      .map((date: string, i: number) => ({ date, i }))
      .filter(({ i }: { i: number }) => d.temperature_2m_max?.[i] != null && d.temperature_2m_min?.[i] != null)
      .map(({ date, i }: { date: string; i: number }) => ({
        date,
        code: d.weather_code[i],
        tempMax: Math.round(d.temperature_2m_max[i]),
        tempMin: Math.round(d.temperature_2m_min[i]),
        precipProb: d.precipitation_probability_max?.[i] ?? null,
        ...(detail
          ? {
              precipSum: d.precipitation_sum?.[i] ?? null,
              windMax: round(d.wind_speed_10m_max?.[i]),
              uvMax: d.uv_index_max?.[i] ?? null,
              sunrise: d.sunrise?.[i] ?? null,
              sunset: d.sunset?.[i] ?? null,
              feelsMax: round(d.apparent_temperature_max?.[i]),
              feelsMin: round(d.apparent_temperature_min?.[i]),
            }
          : {}),
      }));

    if (!detail) {
      return NextResponse.json({ days } as WeatherResponse);
    }

    const h = data.hourly;
    const hours = (h?.time ?? []).map((time: string, i: number) => ({
      time,
      temp: Math.round(h.temperature_2m[i]),
      precipProb: h.precipitation_probability?.[i] ?? null,
      code: h.weather_code[i],
    }));
    const current = data.current
      ? {
          temp: Math.round(data.current.temperature_2m),
          feels: Math.round(data.current.apparent_temperature),
          code: data.current.weather_code,
        }
      : null;

    return NextResponse.json({
      days,
      hours,
      current,
      timezone: data.timezone,
    } as WeatherDetailResponse);
  } catch {
    return NextResponse.json({ days: [], outOfRange: true } as WeatherResponse);
  }
}
