'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ProposalCard } from '@/components/chat/proposal-card';
import type { ChatMessageDoc, ProposalDoc, WithId } from '@/types/domain';

/**
 * One chat turn. User messages are right-aligned bubbles; assistant messages
 * read like a letter (left-aligned, no bubble, markdown), with any proposal
 * cards they spawned embedded inline.
 */
export type Sender = { label: string; initial: string; color: string };

export function ChatMessage({
  message,
  proposalsById,
  tripId,
  sender,
}: {
  message: WithId<ChatMessageDoc>;
  proposalsById: Map<string, WithId<ProposalDoc>>;
  tripId: string;
  sender?: Sender;
}) {
  if (message.role === 'user') {
    return <UserBubble content={message.content} imageUrl={message.imageUrl} sender={sender} />;
  }

  const proposals = (message.proposalIds ?? [])
    .map((id) => proposalsById.get(id))
    .filter((p): p is WithId<ProposalDoc> => !!p);

  return (
    <div className="space-y-3">
      {message.content && (
        <div className="prose-chat max-w-none text-sm leading-relaxed text-text">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
      )}
      {proposals.map((p) => (
        <ProposalCard key={p.id} proposal={p} tripId={tripId} />
      ))}
    </div>
  );
}

/** A human message: right-aligned bubble with the sender's avatar + name.
 *  May carry an attached photo shown above the text. */
export function UserBubble({
  content,
  imageUrl,
  sender,
}: {
  content: string;
  imageUrl?: string | null;
  sender?: Sender;
}) {
  return (
    <div className="flex items-end justify-end gap-2">
      <div className="flex min-w-0 max-w-[80%] flex-col items-end">
        {sender && (
          <span className="mb-0.5 mr-1 text-[10px] font-medium text-text-mute">{sender.label}</span>
        )}
        {imageUrl && (
          <a href={imageUrl} target="_blank" rel="noreferrer" className="mb-1 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Attached photo"
              className="max-h-56 max-w-full rounded-2xl rounded-br-sm border border-border object-cover"
            />
          </a>
        )}
        {content && (
          <div className="max-w-full rounded-2xl rounded-br-sm bg-primary-soft px-3.5 py-2 text-sm text-text">
            {content}
          </div>
        )}
      </div>
      {sender && <Avatar initial={sender.initial} color={sender.color} />}
    </div>
  );
}

export function Avatar({ initial, color }: { initial: string; color: string }) {
  return (
    <span
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white shadow-sm"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

/** Streaming assistant bubble. Shows a blinking caret while live; the caret is
 *  dropped once the answer is complete but its persisted copy hasn't arrived. */
export function StreamingMessage({ text, showCaret = true }: { text: string; showCaret?: boolean }) {
  return (
    <div className="prose-chat max-w-none text-sm leading-relaxed text-text">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      {showCaret && (
        <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-primary align-middle" />
      )}
    </div>
  );
}
