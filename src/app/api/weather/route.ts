import { NextResponse } from 'next/server';
import type { WeatherResponse } from '@/lib/weather';

/**
 * Free, key-less weather via Open-Meteo. Returns a daily forecast for a
 * lat/lng, optionally bounded to a date range. Cached for 30 min so repeated
 * Today-screen loads don't hammer the upstream.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const start = searchParams.get('start'); // YYYY-MM-DD (optional)
  const end = searchParams.get('end'); // YYYY-MM-DD (optional)

  if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
  });
  if (start && end) {
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
      // Out-of-range dates return a 400 from Open-Meteo; treat as "no forecast".
      return NextResponse.json({ days: [], outOfRange: true } satisfies WeatherResponse);
    }
    const data = await res.json();
    const d = data.daily;
    const days = (d?.time ?? []).map((date: string, i: number) => ({
      date,
      code: d.weather_code[i],
      tempMax: Math.round(d.temperature_2m_max[i]),
      tempMin: Math.round(d.temperature_2m_min[i]),
      precipProb: d.precipitation_probability_max?.[i] ?? null,
    }));
    return NextResponse.json({ days } satisfies WeatherResponse);
  } catch {
    return NextResponse.json({ days: [], outOfRange: true } satisfies WeatherResponse);
  }
}
