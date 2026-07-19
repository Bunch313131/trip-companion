'use client';

import { useEffect, useRef, useState } from 'react';
import { StatusPill } from '@/components/ui/status-pill';

/**
 * Tap a status pill to change it. Renders the current status as a pill;
 * opening shows a small menu of the allowed values.
 */
export function StatusSelect({
  value,
  options,
  onSelect,
  editable = true,
}: {
  value: string;
  options: { value: string; label: string }[];
  onSelect: (next: string) => Promise<void>;
  editable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!editable) return <StatusPill status={value} />;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Change status">
        <StatusPill status={value} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-card">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={async () => {
                setOpen(false);
                if (opt.value !== value) await onSelect(opt.value);
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-2 ${
                opt.value === value ? 'text-text' : 'text-text-dim'
              }`}
            >
              {opt.label}
              {opt.value === value && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
