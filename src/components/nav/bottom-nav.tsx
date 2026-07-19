'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';

type Tab = {
  href: Route;
  label: string;
  match: (path: string) => boolean;
  icon: React.ReactNode;
};

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9 } as const;

const TABS: Tab[] = [
  {
    href: '/',
    label: 'Today',
    match: (p) => p === '/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
        <path d="M3 10l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" />
      </svg>
    ),
  },
  {
    href: '/itinerary',
    label: 'Trip',
    match: (p) => p.startsWith('/itinerary'),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
        <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
      </svg>
    ),
  },
  {
    href: '/reservations',
    label: 'Bookings',
    match: (p) => p.startsWith('/reservations'),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    href: '/map',
    label: 'Map',
    match: (p) => p.startsWith('/map'),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
        <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.4" />
      </svg>
    ),
  },
  {
    href: '/chat',
    label: 'Chat',
    match: (p) => p.startsWith('/chat'),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
        <path d="M4 5h16v11H9l-4 4z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg justify-around px-2 pt-2.5 pb-2">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-[9.5px] font-medium transition-colors ${
                active ? 'text-primary' : 'text-text-mute hover:text-text-dim'
              }`}
            >
              {tab.icon}
              <span className={active ? 'font-semibold' : ''}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
