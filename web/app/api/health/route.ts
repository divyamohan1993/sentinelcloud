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
  // Project id is intentionally omitted from the public health response.
  // Operators with IAM access can read it from the Cloud Run service config.
  return NextResponse.json({
    ok: true,
    service: 'sentinelcloud',
    release: env.RELEASE,
    region: env.REGION,
    deps,
    ts: Date.now(),
  });
}
