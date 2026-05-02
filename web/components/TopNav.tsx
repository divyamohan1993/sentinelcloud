import Link from 'next/link';
import { Brand } from './Brand';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/demo', label: 'Demo' },
  { href: '/console', label: 'Console' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/research', label: 'Research' },
  { href: '/docs', label: 'Docs' },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] backdrop-blur-md bg-[rgba(6,7,19,0.7)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded focus:bg-[var(--color-accent)] focus:text-white">Skip to content</a>
      <nav className="mx-auto max-w-7xl px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Brand />
        </Link>
        <ul className="hidden md:flex items-center gap-1 text-[13.5px] text-[var(--color-fg-2)]">
          {links.map(l => (
            <li key={l.href}>
              <Link href={l.href}
                className="px-3 py-1.5 rounded-md hover:bg-white/[0.04] hover:text-[var(--color-fg)] transition-colors">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/divyamohan1993/sentinelcloud"
            target="_blank" rel="noreferrer noopener"
            className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] text-[var(--color-fg-2)] hover:text-white px-2.5 py-1 rounded-md border border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
          >GitHub</a>
          <Link href="/demo"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-md bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-accent-2)] text-white shadow-[0_0_20px_rgba(124,92,255,0.35)]">
            Run a demo
          </Link>
        </div>
      </nav>
    </header>
  );
}
