import { randomUUID } from 'crypto';
import { adminStorage, requireTripAccess } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = 'gemini-3.6-flash';
const MAX_BYTES = 20 * 1024 * 1024;

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['flight', 'hotel', 'rail', 'car', 'ticket', 'restaurant', 'activity', 'other'],
    },
    name: { type: 'string' },
    address: {
      type: 'string',
      description: 'Full street address of the venue/hotel/pickup, incl. city and country if present',
    },
    provider: { type: 'string' },
    confirmation: { type: 'string' },
    starts_at: { type: 'string', description: 'ISO 8601 datetime, e.g. 2026-08-05T15:00' },
    ends_at: { type: 'string' },
    cost_cents: { type: 'integer' },
    cost_currency: { type: 'string' },
  },
};

/**
 * Upload a reservation document (PDF/image) server-side (avoids browser→Storage
 * CORS) and have Gemini extract structured reservation fields from it.
 *
 * POST multipart form: file, tripId, docId  →  { documentUrl, documentMime, extracted }
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const file = form.get('file');
  const tripId = String(form.get('tripId') ?? '');
  const docId = String(form.get('docId') ?? '');
  if (!(file instanceof File) || !tripId || !docId) {
    return Response.json({ error: 'file, tripId and docId are required' }, { status: 400 });
  }

  try {
    await requireTripAccess(request, tripId, 'editor');
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 403 });
  }

  const mime = file.type || 'application/octet-stream';
  if (!/^(image\/|application\/pdf)/.test(mime)) {
    return Response.json({ error: 'Only PDFs and images are supported' }, { status: 415 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    return Response.json({ error: 'File is larger than 20MB' }, { status: 413 });
  }

  // Store the file (admin write — no browser CORS involved).
  let documentUrl: string | null = null;
  try {
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
    const bucket = adminStorage().bucket(bucketName);
    const safeName = file.name.replace(/[^\w.\-]+/g, '_') || 'document';
    const path = `reservations/${tripId}/${docId}/${safeName}`;
    const token = randomUUID();
    await bucket.file(path).save(buffer, {
      contentType: mime,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });
    documentUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  } catch (err) {
    return Response.json({ error: `Upload failed: ${(err as Error).message}` }, { status: 500 });
  }

  // Extract fields with Gemini (best-effort — upload already succeeded).
  let extracted: Record<string, unknown> | null = null;
  const KEY = process.env.GEMINI_API_KEY?.trim();
  if (KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { inline_data: { mime_type: mime, data: buffer.toString('base64') } },
                  {
                    text: 'Extract the reservation/booking details from this document. Only include fields you can find; omit anything uncertain. cost_cents is the total in minor units.',
                  },
                ],
              },
            ],
            generationConfig: {
              thinkingConfig: { thinkingLevel: 'low' },
              responseMimeType: 'application/json',
              responseSchema: EXTRACT_SCHEMA,
            },
          }),
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) extracted = JSON.parse(text);
    } catch {
      /* extraction is best-effort; the document is still attached */
    }
  }

  return Response.json({ documentUrl, documentMime: mime, extracted });
}
