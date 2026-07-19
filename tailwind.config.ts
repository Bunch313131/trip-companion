import type { Config } from 'tailwindcss';

/**
 * ─── DESIGN TOKENS ─────────────────────────────────────────────────
 * Palette: "Confident Blue" (dark), extracted from docs/mockups.
 * The app is dark-first — these values mirror the CSS variables defined
 * in src/app/globals.css. Prefer the CSS-variable form (bg-surface, etc.)
 * so runtime theming stays in one place.
 * ────────────────────────────────────────────────────────────────────
 */

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },

        // Borders
        border: 'var(--border)',

        // Text
        text: {
          DEFAULT: 'var(--text)',
          dim: 'var(--text-dim)',
          mute: 'var(--text-mute)',
        },

        // Primary (confident blue)
        primary: {
          DEFAULT: 'var(--primary)',
          soft: 'var(--primary-soft)',
          ink: 'var(--primary-ink)',
        },

        // Accent (warm gold)
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
        },

        // Entity status colors
        confirmed: {
          DEFAULT: 'var(--confirmed)',
          soft: 'var(--confirmed-soft)',
        },
        tentative: {
          DEFAULT: 'var(--tentative)',
          soft: 'var(--tentative-soft)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          soft: 'var(--warning-soft)',
        },

        // Per-stop pin colors (match seed + map pins)
        stop: {
          duisburg: '#2F5C8A',
          colmar: '#6B8E3F',
          lucerne: '#C28A3A',
          fussen: '#2D7559',
          konigssee: '#B85577',
          munich: '#6E5BAB',
        },
      },
      fontFamily: {
        sans: ['var(--ui)', 'system-ui', 'sans-serif'],
        display: ['var(--display)', 'sans-serif'],
        mono: ['var(--mono)', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -12px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
