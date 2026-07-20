import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireTripAccess } from '@/lib/firebase-admin';
import { AI_TOOLS } from '@/lib/ai-tools';
import { buildTripSystemPrompt } from '@/lib/ai/system-prompt';
import { createProposalFromTool } from '@/lib/ai/create-proposal';
import { classifyEffort, effortConfig, modelFor } from '@/lib/ai/effort';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Gemini free tier: function calling works; Google Search grounding needs a
// paid tier, so it's omitted. Model + thinking are chosen per message by the
// effort router: quick = gemini-flash-latest (fast, no thinking), deep =
// gemini-pro-latest with dynamic thinking (real planning/reasoning).

// propose_* tools become Gemini function declarations; they create proposals.
const FUNCTION_DECLARATIONS = AI_TOOLS.filter((t) => t.name.startsWith('propose_')).map((t) => ({
  name: t.name,
  description: t.description,
  parameters: t.input_schema,
}));

type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  // Gemini 3.x attaches a thought signature to function-call parts that MUST
  // be echoed back verbatim when continuing the turn.
  thoughtSignature?: string;
};

export async function POST(request: Request) {
  let body: { tripId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { tripId, message } = body;
  if (!tripId || !message?.trim()) {
    return Response.json({ error: 'tripId and message are required' }, { status: 400 });
  }

  let uid: string;
  try {
    ({ uid } = await requireTripAccess(request, tripId, 'viewer'));
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 403 });
  }

  // Trim: env values pasted into dashboards often carry a trailing newline,
  // which makes the API key invalid.
  const KEY = process.env.GEMINI_API_KEY?.trim();
  if (!KEY) return Response.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 503 });

  const db = adminDb();
  const chatRef = db.collection(`trips/${tripId}/chatMessages`);

  await chatRef.add({ role: 'user', userId: uid, content: message, createdAt: FieldValue.serverTimestamp() });

  // Recent history as Gemini contents (assistant → 'model').
  const histSnap = await chatRef.orderBy('createdAt', 'desc').limit(20).get();
  const history = histSnap.docs
    .reverse()
    .map((d) => d.data())
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && String(m.content).trim())
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }],
    }));

  const systemText = await buildTripSystemPrompt(tripId);
  const effort = classifyEffort(message);
  const generationConfig = effortConfig(effort);
  const model = modelFor(effort);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${KEY}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      const contents: Array<{ role: string; parts: GeminiPart[] }> = [...history];
      const proposalIds: string[] = [];
      let assistantText = '';

      // Tell the client which effort level we chose (drives the indicator).
      send('mode', { effort });

      try {
        for (let turn = 0; turn < 6; turn++) {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemText }] },
              tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
              generationConfig,
              contents,
            }),
          });
          if (!resp.ok || !resp.body) {
            const errText = await resp.text().catch(() => '');
            throw new Error(`Gemini ${resp.status}: ${errText.slice(0, 160)}`);
          }

          // Parse the SSE stream, accumulating text + function calls for this turn.
          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          let turnText = '';
          // Store whole parts so the thoughtSignature rides along.
          const functionCallParts: GeminiPart[] = [];

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const json = line.slice(5).trim();
              if (!json) continue;
              let chunk;
              try {
                chunk = JSON.parse(json);
              } catch {
                continue;
              }
              const parts: GeminiPart[] = chunk?.candidates?.[0]?.content?.parts ?? [];
              for (const p of parts) {
                if (p.text) {
                  turnText += p.text;
                  assistantText += p.text;
                  send('delta', { text: p.text });
                } else if (p.functionCall) {
                  functionCallParts.push(p); // whole part, incl. thoughtSignature
                }
              }
            }
          }

          if (functionCallParts.length > 0) {
            // Echo the model turn (text + function-call parts incl. their
            // thoughtSignatures) before returning the function responses.
            contents.push({
              role: 'model',
              parts: [...(turnText ? [{ text: turnText }] : []), ...functionCallParts],
            });
            const responseParts: GeminiPart[] = [];
            for (const part of functionCallParts) {
              const fc = part.functionCall!;
              try {
                const pid = await createProposalFromTool(tripId, fc.name, fc.args as never);
                proposalIds.push(pid);
                send('proposal', { proposalId: pid });
                responseParts.push({
                  functionResponse: {
                    name: fc.name,
                    response: { result: 'Proposal created and shown to the user for approval.' },
                  },
                });
              } catch (e) {
                responseParts.push({
                  functionResponse: { name: fc.name, response: { error: (e as Error).message } },
                });
              }
            }
            contents.push({ role: 'user', parts: responseParts });
            continue;
          }
          break;
        }

        await chatRef.add({
          role: 'assistant',
          content: assistantText,
          proposalIds,
          createdAt: FieldValue.serverTimestamp(),
        });
        send('done', { proposalIds });
      } catch (err) {
        send('error', { message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
