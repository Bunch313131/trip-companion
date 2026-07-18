import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trip Companion',
  description: 'Your living itinerary.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Trip',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // TODO: replace with the surface color chosen from mockups
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

/*
 * NOTE for Claude Code:
 * Add font preconnects and font imports here based on the fonts chosen in mockups.
 * Common examples:
 *   - Google Fonts: <link rel="preconnect"> + <link href="fonts.googleapis.com/...">
 *   - next/font (preferred for perf): import { Inter } from 'next/font/google'
 * See DESIGN_BRIEF.md for typography direction.
 */

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
