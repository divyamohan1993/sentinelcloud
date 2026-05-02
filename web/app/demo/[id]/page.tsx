import { notFound } from 'next/navigation';
import { getScenario, SCENARIOS } from '@/lib/scenarios';
import { RunStage } from '@/components/RunStage';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return SCENARIOS.map(s => ({ id: s.id }));
}

export default async function DemoRun({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scenario = getScenario(id);
  if (!scenario) notFound();
  return <RunStage scenarioId={scenario.id} scenarioTitle={scenario.title} scenarioOneLiner={scenario.oneLiner} severity={scenario.severity} signals={scenario.signals} topology={scenario.topology} />;
}
