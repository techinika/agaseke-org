import type { Metadata } from 'next';
import { Sora, JetBrains_Mono } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { Providers } from '@/providers/providers';
import { GoogleAnalytics } from '@/components/shared/google-analytics';
import { PWARegister } from '@/components/shared/pwa-register';

const sora = Sora({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Quorum.',
    template: '%s | Quorum.',
  },
  description:
    'Quorum helps nonprofits, churches, schools, and associations manage memberships, collect donations, and connect with their community. Simple tools for African organizations.',
  metadataBase: new URL('https://quorum.app'),
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg' },
  keywords: ['membership management', 'donation platform', 'nonprofit tools', 'Africa', 'organization management', 'member engagement'],
  appleWebApp: {
    capable: true,
    title: 'Quorum',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Quorum.',
    title: 'Quorum.',
    description: 'Manage memberships, collect donations, and connect with your community. Built for African nonprofits and associations.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <Providers>{children}</Providers>
        <Suspense fallback={null}>
          <PWARegister />
        </Suspense>
      </body>
    </html>
  );
}
