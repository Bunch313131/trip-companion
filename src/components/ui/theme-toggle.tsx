'use client';

import { useEffect, useState } from 'react';

type Mode = 'light' | 'dark';

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('light');

  useEffect(() => {
    setMode(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  function set(next: Mode) {
    setMode(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {(['light', 'dark'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => set(m)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
            mode === m
              ? 'bg-surface text-text shadow-sm'
              : 'text-text-mute hover:text-text-dim'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
