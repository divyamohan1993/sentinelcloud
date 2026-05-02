import Link from 'next/link';
import { SCENARIOS } from '@/lib/scenarios';
import { ScenarioCard } from '@/components/ScenarioCard';
import { Section } from '@/components/Section';

export const dynamic = 'force-static';

export default function DemoIndex() {
  return (
    <Section
      kicker="Live demo"
      title="Pick a scenario to run."
      sub="Each run streams the agents' reasoning as it happens. Refresh and re-run any time — fixtures are deterministic."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCENARIOS.map(s => (
          <ScenarioCard
            key={s.id}
            id={s.id}
            title={s.title}
            oneLiner={s.oneLiner}
            severity={s.severity}
            category={s.category}
            signalCount={s.signals.length}
            groundTruthAction={s.groundTruthAction}
          />
        ))}
      </div>
      <p className="mt-6 text-[13px] text-[var(--color-fg-3)]">
        Want to run against a real cluster? See <Link href="/docs" className="underline">connector mode</Link>.
      </p>
    </Section>
  );
}
