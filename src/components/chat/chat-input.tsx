'use client';

import { useState } from 'react';

const PRE_TRIP_CHIPS = [
  'What are we missing?',
  'Kid-friendly things in Munich',
  'Check the weather for the trip',
];
const DURING_CHIPS = [
  "We're running late — reshuffle today",
  'Kid-friendly dinner nearby',
  "What's next today?",
];

export function ChatInput({
  onSend,
  busy,
  phase,
}: {
  onSend: (text: string) => void;
  busy: boolean;
  phase: 'pre' | 'during' | 'post';
}) {
  const [text, setText] = useState('');
  const chips = phase === 'during' ? DURING_CHIPS : PRE_TRIP_CHIPS;

  function submit(value: string) {
    const v = value.trim();
    if (!v || busy) return;
    onSend(v);
    setText('');
  }

  return (
    <div className="border-t border-border bg-bg/95 px-4 pb-3 pt-2 backdrop-blur-sm">

      <div className="mx-auto max-w-lg">
        {/* Suggestion chips */}
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy}
              onClick={() => submit(chip)}
              className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-dim transition-colors hover:text-text disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(text);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(text);
              }
            }}
            rows={1}
            placeholder="Ask your trip companion…"
            className="max-h-32 flex-1 resize-none rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-mute focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Send"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-ink transition-opacity disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
