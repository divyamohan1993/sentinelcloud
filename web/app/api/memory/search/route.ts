import { NextResponse } from 'next/server';
import { recallEpisodes } from '@/lib/memory/episodic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const scenarioId = u.searchParams.get('scenario') || '';
  const k = Math.min(Math.max(Number(u.searchParams.get('k') || 5), 1), 20);
  if (!scenarioId) return NextResponse.json({ error: 'scenario required' }, { status: 400 });
  const items = await recallEpisodes(scenarioId, k);
  return NextResponse.json({ items });
}
