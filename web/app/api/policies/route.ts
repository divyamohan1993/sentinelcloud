import { NextResponse } from 'next/server';
import { DEFAULT_CONSTITUTION } from '@/lib/policy/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({ rules: DEFAULT_CONSTITUTION });
}
