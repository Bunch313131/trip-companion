import type { Config } from 'tailwindcss';

/**
 * ─── DESIGN TOKENS ─────────────────────────────────────────────────
 *
 * IMPORTANT: The color palette below is PLACEHOLDER only. Claude Code
 * should replace these tokens with the actual palette derived from the
 * mockups the user has attached to this repo.
 *
 * Extraction workflow:
 *  1. Open the mockups (in the repo or provided via Claude Design export)
 *  2. Identify the palette: 1 primary, 1-2 neutrals, 1 accent, status colors
 *  3. Define per-stop pin colors that harmonize
 *  4. Configure both `light` and `dark` mode (using Tailwind's `dark:` variant
 *     or CSS variables — either works; pick whichever Claude Design used)
 *  5. Match typography choices from the mockups (Inter, Söhne, General Sans, etc.)
 *
 * Do NOT keep these placeholder values. Every one should be replaced.
 *
 * ────────────────────────────────────────────────────────────────────
 */

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class', // toggle-based dark mode; switch to 'media' if using system-only
  theme: {
    extend: {
      colors: {
        // ─── PLACEHOLDER PALETTE — REPLACE FROM MOCKUPS ─────────────
        // Primary — the app's main accent color
        primary: {
          50:  '#TBD',
          100: '#TBD',
          500: '#TBD', // default primary
          600: '#TBD', // hover / pressed
          900: '#TBD',
        },

        // Neutrals — backgrounds, text, borders
        surface: {
          DEFAULT: '#TBD',      // primary background
          raised:  '#TBD',      // cards, elevated
          sunken:  '#TBD',      // subtle recessed areas
        },
        text: {
          DEFAULT:   '#TBD',    // primary text
          secondary: '#TBD',    // body
          muted:     '#TBD',    // metadata, labels
        },
        border: {
          DEFAULT: '#TBD',
          strong:  '#TBD',
        },

        // Status — used across all screens for entity states
        status: {
          confirmed:  '#TBD',   // success green (or whatever Design chose)
          tentative:  '#TBD',   // amber / gold
          draft:      '#TBD',   // muted
          warning:    '#TBD',
          error:      '#TBD',
        },

        // Per-stop accent colors (map pins, timeline dots, tags)
        // 6 stops + 1 day-trip color
        stop: {
          duisburg:    '#TBD',
          colmar:      '#TBD',
          strasbourg:  '#TBD',  // day trip pin
          lucerne:     '#TBD',
          fussen:      '#TBD',
          konigssee:   '#TBD',
          munich:      '#TBD',
        },
      },
      fontFamily: {
        // Replace with fonts chosen in mockups.
        // Common good picks: Inter, Söhne, General Sans, Manrope, Suisse Int'l
        sans:    ['<TBD>', 'system-ui', 'sans-serif'],
        display: ['<TBD>', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
