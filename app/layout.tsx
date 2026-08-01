import type { Metadata, Viewport } from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Jelajah Solo Technopark',
  description: 'Aplikasi Jelajah Solo Technopark',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
