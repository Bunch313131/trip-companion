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
export function ChatMessage({
  message,
  proposalsById,
  tripId,
}: {
  message: WithId<ChatMessageDoc>;
  proposalsById: Map<string, WithId<ProposalDoc>>;
  tripId: string;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary-soft px-3.5 py-2 text-sm text-text">
          {message.content}
        </div>
      </div>
    );
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

/** Live streaming assistant bubble (before the message is persisted). */
export function StreamingMessage({ text }: { text: string }) {
  return (
    <div className="prose-chat max-w-none text-sm leading-relaxed text-text">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-primary align-middle" />
    </div>
  );
}
