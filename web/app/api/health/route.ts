import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const deps: Record<string, string> = {
    vertex: env.ALLOW_VERTEX ? 'configured' : 'disabled',
    anthropic: env.ALLOW_CLAUDE ? 'configured' : 'absent',
    firestore: env.PROJECT_ID ? 'configured' : 'absent',
    stub: env.FORCE_STUB ? 'forced' : 'fallback',
  };
  return NextResponse.json({
    ok: true,
    service: 'sentinelcloud',
    release: env.RELEASE,
    region: env.REGION,
    project: env.PROJECT_ID,
    deps,
    ts: Date.now(),
  });
}
