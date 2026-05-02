import { NextResponse } from 'next/server';
import { getScenario } from '@/lib/scenarios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = getScenario(id);
  if (!s) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(s);
}
