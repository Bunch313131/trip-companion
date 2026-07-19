'use client';

import { useEffect, useState } from 'react';
import { TRIP } from '@/lib/constants';

type CountdownProps = { startsOn?: string };

function diffParts(target: number, now: number) {
  const ms = Math.max(0, target - now);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

const Unit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="tnum font-mono text-3xl font-semibold text-text">
      {String(value).padStart(2, '0')}
    </span>
    <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-mute">
      {label}
    </span>
  </div>
);

export function Countdown({ startsOn = TRIP.startsOn }: CountdownProps) {
  // Departure at local midnight of the start date.
  const target = new Date(`${startsOn}T00:00:00`).getTime();
  // Start null so server and first client render match (avoids hydration
  // mismatch); fill in on mount, then tick every second.
  const [parts, setParts] = useState<ReturnType<typeof diffParts> | null>(null);

  useEffect(() => {
    setParts(diffParts(target, Date.now()));
    const id = setInterval(() => setParts(diffParts(target, Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);

  const p = parts ?? { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return (
    <div className="flex items-end justify-between gap-2" suppressHydrationWarning>
      <Unit value={p.days} label="Days" />
      <span className="pb-2 text-2xl text-text-mute">:</span>
      <Unit value={p.hours} label="Hrs" />
      <span className="pb-2 text-2xl text-text-mute">:</span>
      <Unit value={p.minutes} label="Min" />
      <span className="pb-2 text-2xl text-text-mute">:</span>
      <Unit value={p.seconds} label="Sec" />
    </div>
  );
}
