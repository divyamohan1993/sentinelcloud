export function Section({ kicker, title, sub, children }: {
  kicker?: string; title: string; sub?: string; children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:py-20">
      {kicker && <div className="text-[11.5px] uppercase tracking-[0.18em] text-[var(--color-accent)] mb-3">{kicker}</div>}
      <h2 className="text-[28px] md:text-[34px] font-semibold tracking-tight">{title}</h2>
      {sub && <p className="mt-3 max-w-3xl text-[14.5px] md:text-[15.5px] text-[var(--color-fg-2)] leading-relaxed">{sub}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}
