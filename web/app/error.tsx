'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('app_error_boundary', error);
  }, [error]);
  return (
    <section className="mx-auto max-w-3xl px-5 py-32 text-center">
      <div className="text-[12px] uppercase tracking-widest text-[var(--color-bad)]">Something went sideways</div>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight">A page-level boundary caught this.</h1>
      <p className="mt-2 text-[13.5px] text-[var(--color-fg-3)] font-mono">{error?.message || 'unknown error'}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="rounded-md bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-accent-2)] px-4 py-2 text-[14px] font-medium text-white">Retry</button>
        <Link href="/" className="rounded-md border border-[var(--color-line-strong)] bg-white/[0.04] px-4 py-2 text-[14px]">Home</Link>
      </div>
    </section>
  );
}
