'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/nav/app-header';
import { ChatMessage, StreamingMessage, UserBubble, type Sender } from '@/components/chat/message';
import { ChatInput } from '@/components/chat/chat-input';
import { useTrip } from '@/lib/trip-context';
import { useAuth } from '@/lib/auth-context';
import { useKeyboardOpen } from '@/lib/use-keyboard';
import { useTripCollection, orderBy } from '@/lib/use-collection';
import { getTripPhase } from '@/lib/constants';
import { avatarColor, initialOf } from '@/lib/avatar';
import type { ChatMessageDoc, ProposalDoc, WithId } from '@/types/domain';

type MemberLite = { role?: string; email?: string | null; displayName?: string | null };

export default function ChatPage() {
  const { trip, tripId } = useTrip();
  const { user } = useAuth();
  const { docs: messages } = useTripCollection<ChatMessageDoc>(
    tripId,
    'chatMessages',
    orderBy('createdAt', 'asc')
  );
  const { docs: proposals } = useTripCollection<ProposalDoc>(tripId, 'proposals');
  const { docs: members } = useTripCollection<MemberLite>(tripId, 'members');

  const proposalsById = useMemo(
    () => new Map(proposals.map((p) => [p.id, p] as const)),
    [proposals]
  );

  // uid → display name (fall back to the email's local part).
  const memberName = useMemo(() => {
    const m = new Map<string, string>();
    for (const mem of members) {
      m.set(mem.id, mem.displayName || mem.email?.split('@')[0] || 'Traveler');
    }
    return m;
  }, [members]);

  const senderFor = (userId?: string | null): Sender => {
    const uid = userId ?? '';
    const name = memberName.get(uid) ?? 'Traveler';
    return {
      label: uid && uid === user?.uid ? 'You' : name,
      initial: initialOf(name),
      color: avatarColor(uid || 'x'),
    };
  };

  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [deepMode, setDeepMode] = useState(false);
  const [optimisticUser, setOptimisticUser] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const keyboardOpen = useKeyboardOpen();

  const today = new Date().toISOString().slice(0, 10);
  const phase = getTripPhase(today);

  // Auto-scroll to the newest content.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, streamingText, optimisticUser]);

  // Hide the optimistic user bubble once its persisted copy arrives.
  const showOptimistic =
    optimisticUser !== null &&
    !messages.some((m) => m.role === 'user' && m.content === optimisticUser);

  async function sendMessage(text: string) {
    if (!tripId || !user) return;
    setOptimisticUser(text);
    setStreaming(true);
    setStreamingText('');
    setDeepMode(false);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tripId, message: text }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Chat failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const chunk of events) {
          const evLine = chunk.split('\n').find((l) => l.startsWith('event:'));
          const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'));
          if (!evLine || !dataLine) continue;
          const event = evLine.slice(6).trim();
          const data = JSON.parse(dataLine.slice(5).trim());
          if (event === 'delta') setStreamingText((t) => t + data.text);
          else if (event === 'mode') setDeepMode(data.effort === 'deep');
          else if (event === 'error') throw new Error(data.message);
          // 'proposal' + 'done': the docs arrive via onSnapshot
        }
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setStreaming(false);
      setStreamingText('');
      setDeepMode(false);
      setOptimisticUser(null);
    }
  }

  const empty = messages.length === 0 && !streaming && !optimisticUser;

  return (
    <>
      <AppHeader section="Chat" />
      <div
        className="fixed inset-x-0 z-20 flex flex-col transition-[bottom] duration-200"
        style={{
          // Pin between the header and the bottom. `bottom: 0` reliably sits
          // above the on-screen keyboard (same anchor the nav uses); when the
          // keyboard is closed we lift it to clear the shrunk bottom nav.
          top: 'calc(3.4rem + env(safe-area-inset-top))',
          bottom: keyboardOpen ? '0px' : 'calc(3rem + env(safe-area-inset-bottom))',
        }}
      >
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="mx-auto w-full max-w-lg space-y-4">
            {empty ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
                <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-ink shadow-card">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
                    <path d="M4 5h16v11H9l-4 4z" />
                  </svg>
                </div>
                <h1 className="font-display text-lg font-semibold text-text">
                  Your trip companion
                </h1>
                <p className="mt-1 max-w-xs text-sm text-text-dim">
                  Ask me to plan a day, find a restaurant, or check the weather. Every
                  change I suggest lands as a card you approve.
                </p>
              </div>
            ) : (
              <>
                {messages.map((m: WithId<ChatMessageDoc>) => (
                  <ChatMessage
                    key={m.id}
                    message={m}
                    proposalsById={proposalsById}
                    tripId={tripId!}
                    sender={m.role === 'user' ? senderFor(m.userId) : undefined}
                  />
                ))}
                {showOptimistic && (
                  <UserBubble content={optimisticUser!} sender={senderFor(user?.uid)} />
                )}
                {streaming &&
                  (streamingText ? (
                    <StreamingMessage text={streamingText} />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-text-mute">
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-mute [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-mute [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-mute" />
                      </span>
                      {deepMode && <span>Thinking it through…</span>}
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>

        <ChatInput onSend={sendMessage} busy={streaming} phase={phase} />
      </div>
    </>
  );
}
