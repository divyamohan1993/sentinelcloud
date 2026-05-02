import { NextResponse } from 'next/server';
import { SCENARIOS } from '@/lib/scenarios';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    scenarios: SCENARIOS.map(s => ({
      id: s.id, title: s.title, oneLiner: s.oneLiner,
      category: s.category, severity: s.severity,
      groundTruthAction: s.groundTruthAction,
      signalCount: s.signals.length,
    })),
  });
}
