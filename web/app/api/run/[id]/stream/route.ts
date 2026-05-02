import { sseStream } from '@/lib/sse';
import { orchestrate } from '@/lib/agents/orchestrator';
import { getScenario } from '@/lib/scenarios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scenario = getScenario(id);
  if (!scenario) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }
  return sseStream(orchestrate(scenario));
}
