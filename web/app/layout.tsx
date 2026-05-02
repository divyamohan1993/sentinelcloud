import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://sentinelcloud.dmj.one'),
  title: {
    default: 'SentinelCloud — AI-Driven Autonomous DevOps Engineer',
    template: '%s · SentinelCloud',
  },
  description:
    'A closed-loop multi-agent system that observes, debates, decides, acts and learns — turning incident response, FinOps and shift-left security into measured KPIs.',
  applicationName: 'SentinelCloud',
  authors: [{ name: 'Rohit Kumar' }, { name: 'Divya Mohan' }],
  creator: 'Rohit Kumar',
  publisher: 'dmj.one',
  keywords: [
    'AIOps', 'autonomous DevOps', 'multi-agent', 'incident response',
    'FinOps', 'cloud security', 'capstone', 'BTech CSE',
  ],
  openGraph: {
    type: 'website',
    url: 'https://sentinelcloud.dmj.one',
    siteName: 'SentinelCloud',
    title: 'SentinelCloud — AI-Driven Autonomous DevOps Engineer',
    description:
      'Multi-agent debate, blast-radius gating, semantic policy, episodic memory. Capstone build by Rohit Kumar with Divya Mohan, dmj.one.',
  },
  twitter: { card: 'summary_large_image', title: 'SentinelCloud', creator: '@dmj_one' },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#060713',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TopNav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
