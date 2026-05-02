// Semantic Policy Engine (Gap G6).
// Constitution clauses are plain English, signed at write time, read-only at runtime.
// Compiled rules cache deterministic checks where possible.

import type { Action, PolicyRule, Severity } from '../types';

export const DEFAULT_CONSTITUTION: PolicyRule[] = [
  {
    id: 'C1',
    text: 'Production services must always have at least 3 replicas at the end of any action.',
    severity: 'critical',
    appliesTo: ['rollback', 'scale', 'right_size', 'restart_pods'],
    createdAt: Date.now(),
  },
  {
    id: 'C2',
    text: 'No action may delete persistent storage without an explicit human "DELETE" confirmation.',
    severity: 'critical',
    appliesTo: ['open_pr', 'right_size'],
    createdAt: Date.now(),
  },
  {
    id: 'C3',
    text: 'WAF rules must include a TTL no longer than 14 days and must reference a CVE id.',
    severity: 'high',
    appliesTo: ['waf_rule'],
    createdAt: Date.now(),
  },
  {
    id: 'C4',
    text: 'Mesh weight changes may not move more than 25% of traffic in a single step.',
    severity: 'high',
    appliesTo: ['mesh_weight'],
    createdAt: Date.now(),
  },
  {
    id: 'C5',
    text: 'Cost-affecting actions over USD 500 must be paused for human review.',
    severity: 'high',
    appliesTo: ['scale', 'right_size', 'open_pr'],
    createdAt: Date.now(),
  },
  {
    id: 'C6',
    text: 'Critical-severity actions always pause for human-on-the-loop confirmation.',
    severity: 'critical',
    appliesTo: ['rollback', 'scale', 'right_size', 'open_pr', 'waf_rule', 'mesh_weight', 'cache_purge', 'feature_flag', 'restart_pods'],
    createdAt: Date.now(),
  },
  {
    id: 'C7',
    text: 'Feature flag flips on payment-related services require a 5-minute cooldown between toggles.',
    severity: 'medium',
    appliesTo: ['feature_flag'],
    createdAt: Date.now(),
  },
];

export function constitutionToText(rules: PolicyRule[]): string {
  return rules.map(r => `[${r.id} | ${r.severity}] ${r.text}`).join('\n');
}

export interface PolicyDecision {
  allowed: boolean;
  violations: { id: string; severity: Severity; text: string }[];
}

export function checkDeterministic(action: Action, rules: PolicyRule[]): PolicyDecision {
  const violations: PolicyDecision['violations'] = [];

  for (const rule of rules) {
    if (!rule.appliesTo.includes(action.kind)) continue;

    if (rule.id === 'C1') {
      const replicasAfter = (action.params as any)?.replicas;
      if (typeof replicasAfter === 'number' && replicasAfter < 3) {
        violations.push({ id: rule.id, severity: rule.severity, text: rule.text });
      }
    }
    if (rule.id === 'C3' && action.kind === 'waf_rule') {
      const p = action.params as any;
      const ttlDays = Number(p?.ttlDays ?? 0);
      const cve = String(p?.cve ?? '');
      if (ttlDays <= 0 || ttlDays > 14 || !/^CVE-\d{4}-\d+$/i.test(cve)) {
        violations.push({ id: rule.id, severity: rule.severity, text: rule.text });
      }
    }
    if (rule.id === 'C4' && action.kind === 'mesh_weight') {
      const p = action.params as any;
      const shift = Math.abs(Number(p?.shiftPct ?? 0));
      if (shift > 25) violations.push({ id: rule.id, severity: rule.severity, text: rule.text });
    }
    if (rule.id === 'C5') {
      if (Math.abs(action.estimatedCostUsdDelta) > 500) {
        violations.push({ id: rule.id, severity: rule.severity, text: rule.text });
      }
    }
    if (rule.id === 'C6') {
      if (action.riskClass === 'critical') {
        violations.push({ id: rule.id, severity: rule.severity, text: rule.text });
      }
    }
  }

  return { allowed: violations.length === 0, violations };
}
