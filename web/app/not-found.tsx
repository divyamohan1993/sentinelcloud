import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-32 text-center">
      <div className="text-[12px] uppercase tracking-widest text-[var(--color-accent)]">404</div>
      <h1 className="mt-2 text-[34px] font-semibold tracking-tight">This route is not in the registry.</h1>
      <p className="mt-3 text-[14.5px] text-[var(--color-fg-2)]">
        Either the link is stale or this is connector-mode terrain we have not deployed yet.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-md bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-accent-2)] px-4 py-2 text-[14px] font-medium text-white">Home</Link>
        <Link href="/demo" className="rounded-md border border-[var(--color-line-strong)] bg-white/[0.04] px-4 py-2 text-[14px]">Run a demo</Link>
      </div>
    </section>
  );
}
