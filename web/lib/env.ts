// Read-once environment with safe defaults so the demo runs even when secrets are unset.

const truthy = (v: string | undefined) => v != null && /^(1|true|yes|on)$/i.test(v);

export const env = {
  PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || 'dmjone',
  REGION: process.env.SENTINEL_REGION || 'asia-east1',
  GEMINI_MODEL: process.env.SENTINEL_GEMINI_MODEL || 'gemini-2.5-pro',
  GEMINI_FAST_MODEL: process.env.SENTINEL_GEMINI_FAST_MODEL || 'gemini-2.5-flash',
  CLAUDE_MODEL: process.env.SENTINEL_CLAUDE_MODEL || 'claude-opus-4-7',
  CLAUDE_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ALLOW_VERTEX: !truthy(process.env.SENTINEL_DISABLE_VERTEX),
  ALLOW_CLAUDE: !!process.env.ANTHROPIC_API_KEY && !truthy(process.env.SENTINEL_DISABLE_CLAUDE),
  FORCE_STUB: truthy(process.env.SENTINEL_FORCE_STUB),
  FIRESTORE_DB: process.env.SENTINEL_FIRESTORE_DB || '(default)',
  ADMIN_EMAILS: (process.env.SENTINEL_ADMIN_EMAILS || 'divyamohan1993@gmail.com').split(',').map(s => s.trim()).filter(Boolean),
  RELEASE: process.env.K_REVISION || process.env.SENTINEL_RELEASE || 'dev',
  LOG_LEVEL: process.env.SENTINEL_LOG_LEVEL || 'info',
} as const;

export type SentinelEnv = typeof env;
