import { requireTripAccess, adminDb } from '@/lib/firebase-admin';
import { weatherCode, cToF } from '@/lib/weather';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'gemini-flash-lite-latest';

type AdminTs = { toDate: () => Date; seconds: number } | null | undefined;

// The trip is in central Europe; default there so times read correctly even
// if the client doesn't pass its zone. The Vercel server itself runs in UTC,
// so we must never format in the server's local zone.
const DEFAULT_TZ = 'Europe/Berlin';

function toDate(ts: AdminTs): Date | null {
  try {
    return ts?.toDate ? ts.toDate() : null;
  } catch {
    return null;
  }
}
// ISO date (YYYY-MM-DD) as seen in the given timezone — so events bucket to the
// same calendar day the traveler experiences.
function isoDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
function fmtTime(d: Date, tz: string): string {
  return d.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
}
/** Today's date in the given timezone. */
function todayISO(tz: string): string {
  return isoDate(new Date(), tz);
}

// Lead time before the first event you should leave / start getting ready.
function leadMinutes(type: string): number {
  if (type === 'flight') return 150;
  if (type === 'rail') return 45;
  if (type === 'ticket' || type === 'restaurant') return 30;
  return 25;
}

type Ev = { time: Date; title: string; type: string; isRes: boolean; hasDoc: boolean };

export async function POST(request: Request) {
  let body: { tripId?: string; date?: string; tz?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { tripId, date } = body;
  const tz = body.tz || DEFAULT_TZ;
  if (!tripId) return Response.json({ error: 'tripId is required' }, { status: 400 });

  try {
    await requireTripAccess(request, tripId, 'viewer');
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 403 });
  }

  const db = adminDb();
  const targetISO = date || todayISO(tz);

  const [stopsSnap, resSnap, actSnap] = await Promise.all([
    db.collection(`trips/${tripId}/stops`).get(),
    db.collection(`trips/${tripId}/reservations`).get(),
    db.collection(`trips/${tripId}/activities`).get(),
  ]);

  const stops = stopsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Record<string, unknown> & { id: string }
  );
  const currentStop = stops.find((s) => {
    const a = s.arriveOn as string;
    const dep = s.departOn as string;
    return s.status !== 'cancelled' && a && dep && a <= targetISO && targetISO < dep;
  });

  const events: Ev[] = [];
  for (const d of resSnap.docs) {
    const r = d.data();
    if (r.status === 'cancelled') continue;
    const dt = toDate(r.startsAt as AdminTs);
    if (dt && isoDate(dt, tz) === targetISO) {
      events.push({ time: dt, title: r.name, type: r.type, isRes: true, hasDoc: !!r.documentUrl });
    }
  }
  for (const d of actSnap.docs) {
    const a = d.data();
    if (a.status === 'cancelled') continue;
    const dt = toDate(a.startsAt as AdminTs);
    if (dt && isoDate(dt, tz) === targetISO) {
      events.push({ time: dt, title: a.title, type: a.kind, isRes: false, hasDoc: false });
    }
  }
  events.sort((a, b) => a.time.getTime() - b.time.getTime());

  // Deterministic "leave by".
  let leaveBy: string | null = null;
  const first = events[0];
  if (first) {
    const lead = leadMinutes(first.type);
    leaveBy = fmtTime(new Date(first.time.getTime() - lead * 60_000), tz);
  }

  // Weather for the stop (best effort; ignored on failure / out of range).
  let weatherLine = '';
  const lat = currentStop?.lat as number | undefined;
  const lng = currentStop?.lng as number | undefined;
  if (typeof lat === 'number' && typeof lng === 'number') {
    try {
      const wParams = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'auto',
        start_date: targetISO,
        end_date: targetISO,
      });
      const wr = await fetch(`https://api.open-meteo.com/v1/forecast?${wParams}`, {
        next: { revalidate: 1800 },
      });
      if (wr.ok) {
        const wd = (await wr.json()).daily;
        if (wd?.time?.length) {
          const wx = weatherCode(wd.weather_code[0]);
          const hi = cToF(wd.temperature_2m_max[0]);
          const lo = cToF(wd.temperature_2m_min[0]);
          const pop = wd.precipitation_probability_max?.[0];
          weatherLine = `Weather: ${wx.label}, ${hi}°/${lo}°F${
            pop != null && pop >= 20 ? `, ${pop}% chance of rain` : ''
          }.`;
        }
      }
    } catch {
      /* weather is optional */
    }
  }

  // Deterministic fallback narrative — always correct, no AI required.
  const stopName = (currentStop?.city as string) || 'your destination';
  const fallback = buildFallback(stopName, events, leaveBy, weatherLine, tz);

  const KEY = process.env.GEMINI_API_KEY?.trim();
  if (!KEY || events.length === 0) {
    return Response.json({ narrative: fallback, leaveBy, eventCount: events.length });
  }

  // Ask Gemini to phrase a warm, concise briefing from the facts.
  const scheduleText = events
    .map((e) => `- ${fmtTime(e.time, tz)} ${e.title} (${e.type})${e.hasDoc ? ' [ticket attached]' : ''}`)
    .join('\n');
  const prompt = `You are a family's trip companion. Write a warm, concise morning briefing (2-3 short sentences, no bullet points, no greeting header) for a family of four (two adults, twin 6-year-olds) in ${stopName}.

Today's plan (${targetISO}):
${scheduleText || '- Open day, nothing scheduled'}

${weatherLine}
${leaveBy ? `They should aim to head out by about ${leaveBy} for the first item.` : ''}

Mention the leave-by time naturally if there is one, note the weather briefly if relevant (umbrella/sunscreen for the kids), and remind them if a ticket is attached for something. Keep it friendly and practical. Plain text only.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
    if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? '')
      .join('')
      .trim();
    return Response.json({
      narrative: text || fallback,
      leaveBy,
      eventCount: events.length,
    });
  } catch {
    return Response.json({ narrative: fallback, leaveBy, eventCount: events.length });
  }
}

function buildFallback(
  stopName: string,
  events: Ev[],
  leaveBy: string | null,
  weatherLine: string,
  tz: string
): string {
  if (events.length === 0) {
    return `An open day in ${stopName} — nothing scheduled yet. ${weatherLine} A good chance to wander, rest, or find something spontaneous.`.trim();
  }
  const first = events[0];
  const parts: string[] = [];
  parts.push(
    `You've got ${events.length} thing${events.length === 1 ? '' : 's'} on today in ${stopName}, starting with ${first.title} at ${fmtTime(first.time, tz)}.`
  );
  if (leaveBy) parts.push(`Aim to head out by about ${leaveBy}.`);
  if (weatherLine) parts.push(weatherLine);
  const ticket = events.find((e) => e.hasDoc);
  if (ticket) parts.push(`Your ticket for ${ticket.title} is saved and ready to pull up.`);
  return parts.join(' ');
}
