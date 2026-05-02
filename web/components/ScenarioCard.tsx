import Link from 'next/link';

const sevTone: Record<string, string> = {
  low: 'border-[#3a7a6a]/40 text-[#5ce1c7] bg-[#5ce1c7]/[0.06]',
  medium: 'border-[#7a6f3a]/40 text-[#ffc857] bg-[#ffc857]/[0.06]',
  high: 'border-[#7a4a3a]/40 text-[#ff9c64] bg-[#ff9c64]/[0.06]',
  critical: 'border-[#7a3a4a]/40 text-[#ff6770] bg-[#ff6770]/[0.06]',
};

const catLabel: Record<string, string> = {
  reliability: 'Reliability', finops: 'FinOps', security: 'Security', drift: 'Drift', capacity: 'Capacity',
};

export function ScenarioCard({
  id, title, oneLiner, severity, category, signalCount, groundTruthAction,
}: {
  id: string; title: string; oneLiner: string; severity: string; category: string;
  signalCount: number; groundTruthAction: string;
}) {
  return (
    <Link href={`/demo/${id}`} className="group block">
      <article className="glass p-5 transition-all duration-300 hover:border-[var(--color-line-strong)] hover:bg-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10.5px] uppercase tracking-wider px-2 py-0.5 rounded border ${sevTone[severity] || ''}`}>
            {severity}
          </span>
          <span className="text-[11px] text-[var(--color-fg-3)] font-mono">{catLabel[category] ?? category}</span>
        </div>
        <h3 className="text-[15.5px] font-semibold tracking-tight mb-1 text-[var(--color-fg)]">{title}</h3>
        <p className="text-[13.5px] text-[var(--color-fg-2)] leading-relaxed">{oneLiner}</p>
        <div className="mt-4 flex items-center justify-between text-[11.5px] text-[var(--color-fg-3)]">
          <span>{signalCount} signals</span>
          <span>→ {groundTruthAction.replace('_', ' ')}</span>
        </div>
      </article>
    </Link>
  );
}
