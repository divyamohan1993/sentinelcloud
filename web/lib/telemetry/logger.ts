// Structured JSON logger that follows Cloud Logging severity conventions.
// Required by the CLAUDE.md observability rule: timestamp, file:line equivalent,
// severity, correlation ID, sanitized payload.

import { env } from '../env';

type Severity = 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';

const levelOrder: Record<Severity, number> = {
  DEBUG: 10, INFO: 20, NOTICE: 25, WARNING: 30, ERROR: 40, CRITICAL: 50,
};
const minLevel = (env.LOG_LEVEL || 'info').toUpperCase() as keyof typeof levelOrder;
const minOrder = levelOrder[minLevel] ?? 20;

const REDACT_KEYS = /password|secret|token|api[-_]?key|authorization|cookie/i;

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 6) return '[depth-limit]';
  if (obj == null) return obj;
  if (typeof obj === 'string') return obj.length > 4000 ? obj.slice(0, 4000) + '…[truncated]' : obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.slice(0, 64).map(v => sanitize(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACT_KEYS.test(k)) { out[k] = '[redacted]'; continue; }
    out[k] = sanitize(v, depth + 1);
  }
  return out;
}

function emit(severity: Severity, message: string, fields: Record<string, unknown> = {}) {
  if (levelOrder[severity] < minOrder) return;
  const entry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    release: env.RELEASE,
    ...sanitize(fields) as Record<string, unknown>,
  };
  // Cloud Logging picks up structured JSON from stdout.
  // eslint-disable-next-line no-console
  (severity === 'ERROR' || severity === 'CRITICAL' ? console.error : console.log)(JSON.stringify(entry));
}

export const log = {
  debug: (m: string, f?: Record<string, unknown>) => emit('DEBUG', m, f),
  info: (m: string, f?: Record<string, unknown>) => emit('INFO', m, f),
  warn: (m: string, f?: Record<string, unknown>) => emit('WARNING', m, f),
  error: (m: string, f?: Record<string, unknown>) => emit('ERROR', m, f),
  critical: (m: string, f?: Record<string, unknown>) => emit('CRITICAL', m, f),
};

export function newCorrelationId(): string {
  // Cheap correlation id; Cloud Run already injects a trace id, but this is portable.
  return `cid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
