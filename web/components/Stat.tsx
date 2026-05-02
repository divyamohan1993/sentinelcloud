export function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: 'good' | 'warn' | 'bad' | 'accent' }) {
  const accentColor = {
    good: 'var(--color-good)',
    warn: 'var(--color-warn)',
    bad: 'var(--color-bad)',
    accent: 'var(--color-accent)',
  }[accent ?? 'accent'];
  return (
    <div className="glass p-4">
      <div className="text-[11px] uppercase tracking-wider text-[var(--color-fg-3)]">{label}</div>
      <div className="mt-1.5 text-[24px] font-semibold tabular-nums" style={{ color: accentColor }}>{value}</div>
      {hint && <div className="mt-1 text-[12px] text-[var(--color-fg-3)]">{hint}</div>}
    </div>
  );
}
