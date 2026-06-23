import type { Metadata } from 'next';
import { Sora, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers/providers';

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
    default: 'Agaseke for Organizations',
    template: '%s | Agaseke for Organizations',
  },
  description:
    'Agaseke helps nonprofits, churches, schools, and associations manage memberships, collect donations, and connect with their community. Simple tools for African organizations.',
  metadataBase: new URL('https://agaseke.co'),
  keywords: ['membership management', 'donation platform', 'nonprofit tools', 'Africa', 'organization management', 'member engagement'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Agaseke for Organizations',
    title: 'Agaseke for Organizations',
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
