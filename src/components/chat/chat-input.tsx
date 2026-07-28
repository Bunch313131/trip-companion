'use client';

import { useRef, useState } from 'react';

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

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export function ChatInput({
  onSend,
  busy,
  phase,
}: {
  onSend: (text: string, image?: File | null) => void;
  busy: boolean;
  phase: 'pre' | 'during' | 'post';
}) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chips = phase === 'during' ? DURING_CHIPS : PRE_TRIP_CHIPS;

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function pickImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_IMAGE_BYTES) return;
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function submit(value: string) {
    const v = value.trim();
    // A photo can be sent on its own (no text required); text can send alone too.
    if ((!v && !image) || busy) return;
    onSend(v, image);
    setText('');
    clearImage();
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

        {/* Attached-photo preview */}
        {preview && (
          <div className="mb-2 flex items-center gap-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Attached"
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-text text-bg shadow"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <span className="text-xs text-text-mute">Photo attached</span>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(text);
          }}
          className="flex items-end gap-2"
        >
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            aria-label="Attach photo"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-text-dim transition-colors hover:text-text disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
              <path d="M4 16l4.5-4.5a2 2 0 0 1 2.8 0L16 16m-2-2 1.5-1.5a2 2 0 0 1 2.8 0L20 14M4 6h16v12H4z" />
              <circle cx="9" cy="9" r="1.4" />
            </svg>
          </button>
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
            disabled={busy || (!text.trim() && !image)}
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
