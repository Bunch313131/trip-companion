'use client';

import { appleMapsDirections, type NavDest } from '@/lib/maps';

/**
 * "Navigate" affordance — opens Apple Maps driving directions (→ CarPlay on
 * iOS). Renders nothing if we have no usable destination.
 */
export function NavigateButton({
  dest,
  variant = 'chip',
  label = 'Navigate',
}: {
  dest: NavDest;
  variant?: 'chip' | 'icon';
  label?: string;
}) {
  const url = appleMapsDirections(dest);
  if (!url) return null;

  if (variant === 'icon') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label={label}
        title={label}
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-surface-2 p-1.5 text-primary transition-colors hover:bg-primary hover:text-primary-ink"
      >
        <NavIcon />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-ink transition-opacity hover:opacity-90"
    >
      <NavIcon />
      {label}
    </a>
  );
}

function NavIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}
