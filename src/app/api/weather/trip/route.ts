import { NextResponse } from 'next/server';

/**
 * Forecast for several stops in a single Open-Meteo call (comma-separated
 * coordinates → array response). For each stop we return the forecast on the
 * given `date` (the first day you'll be there), when it's within the ~16-day
 * horizon. Powers the "across your trip" outlook.
 *
 * POST { stops: [{ id, city, lat, lng, date }] }  →  { stops: [{ id, city, date, day|null }] }
 */
export async function POST(request: Request) {
  let body: { stops?: Array<{ id: string; city: string; lat: number; lng: number; date: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ stops: [] });
  }
  const stops = (body.stops ?? []).filter(
    (s) => typeof s.lat === 'number' && typeof s.lng === 'number'
  );
  if (!stops.length) return NextResponse.json({ stops: [] });

  const params = new URLSearchParams({
    latitude: stops.map((s) => s.lat).join(','),
    longitude: stops.map((s) => s.lng).join(','),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '16',
  });

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return NextResponse.json({ stops: stops.map((s) => ({ ...s, day: null })) });
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [data];

    const out = stops.map((s, i) => {
      const d = arr[i]?.daily;
      let day = null;
      const idx = d?.time?.indexOf(s.date) ?? -1;
      const tmax = idx >= 0 ? d?.temperature_2m_max?.[idx] : null;
      const tmin = idx >= 0 ? d?.temperature_2m_min?.[idx] : null;
      // At the edge of the forecast horizon the date can appear with null
      // values — treat that as "no data yet" rather than a bogus 0°.
      if (d && idx >= 0 && tmax != null && tmin != null) {
        day = {
          date: s.date,
          code: d.weather_code[idx],
          tempMax: Math.round(tmax),
          tempMin: Math.round(tmin),
          precipProb: d.precipitation_probability_max?.[idx] ?? null,
        };
      }
      return { id: s.id, city: s.city, date: s.date, day };
    });
    return NextResponse.json({ stops: out });
  } catch {
    return NextResponse.json({ stops: stops.map((s) => ({ id: s.id, city: s.city, date: s.date, day: null })) });
  }
}
