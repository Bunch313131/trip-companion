import Anthropic from '@anthropic-ai/sdk';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireTripAccess } from '@/lib/firebase-admin';
import { AI_TOOLS } from '@/lib/ai-tools';
import { buildTripSystemPrompt } from '@/lib/ai/system-prompt';
import { createProposalFromTool } from '@/lib/ai/create-proposal';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = 'claude-sonnet-4-6'; // per PROJECT_BRIEF; override to claude-opus-4-8 for max quality

// The propose_* tools are handled server-side (they create proposal docs);
// web search is Anthropic's server tool (Claude runs it).
const PROPOSE_TOOLS = AI_TOOLS.filter((t) => t.name.startsWith('propose_'));
const TOOLS = [
  ...PROPOSE_TOOLS,
  { type: 'web_search_20260209', name: 'web_search' },
] as Anthropic.ToolUnion[];

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

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 503 });
  }

  const db = adminDb();
  const chatRef = db.collection(`trips/${tripId}/chatMessages`);

  // Persist the user's message.
  await chatRef.add({
    role: 'user',
    userId: uid,
    content: message,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Recent history (last 20 messages, chronological) as plain text turns.
  const histSnap = await chatRef.orderBy('createdAt', 'desc').limit(20).get();
  const history: Anthropic.MessageParam[] = histSnap.docs
    .reverse()
    .map((d) => d.data())
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }));

  const system = await buildTripSystemPrompt(tripId);
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      const messages: Anthropic.MessageParam[] = [...history];
      const proposalIds: string[] = [];
      let assistantText = '';

      try {
        for (let turn = 0; turn < 6; turn++) {
          const s = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 8000,
            thinking: { type: 'adaptive' },
            system,
            tools: TOOLS,
            messages,
          });
          s.on('text', (delta: string) => {
            assistantText += delta;
            send('delta', { text: delta });
          });

          const msg = await s.finalMessage();
          messages.push({ role: 'assistant', content: msg.content });

          const proposeCalls = msg.content.filter(
            (b): b is Anthropic.ToolUseBlock =>
              b.type === 'tool_use' && String(b.name).startsWith('propose_')
          );

          if (proposeCalls.length > 0) {
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const call of proposeCalls) {
              try {
                const pid = await createProposalFromTool(
                  tripId,
                  call.name,
                  call.input as never
                );
                proposalIds.push(pid);
                send('proposal', { proposalId: pid });
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: call.id,
                  content: 'Proposal created and shown to the user for approval.',
                });
              } catch (e) {
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: call.id,
                  content: `Could not create proposal: ${(e as Error).message}`,
                  is_error: true,
                });
              }
            }
            messages.push({ role: 'user', content: toolResults });
            continue;
          }

          if (msg.stop_reason === 'pause_turn') continue; // server tool (web search) paused
          break;
        }

        // Persist the assembled assistant message.
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
