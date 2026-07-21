/**
 * Small helpers for member avatars: a stable color per person (hashed from
 * their uid) and an initial from their name.
 */

const PALETTE = [
  '#1E4E80', // blue
  '#2E7D5B', // green
  '#C08A2E', // gold
  '#8E3F6B', // plum
  '#3F6B8E', // steel
  '#6B8E3F', // olive
  '#B0543B', // terracotta
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initialOf(name: string): string {
  const c = name.trim()[0];
  return c ? c.toUpperCase() : '?';
}
