// Tool registry + actuator shims.
// In demo mode every actuator is a deterministic simulation that returns
// the same shape a real actuator would. Connector mode would replace these
// with real Cloud SDK calls behind a service account binding.

import type { Action } from '../types';

export interface ToolCard {
  kind: Action['kind'];
  description: string;
  paramSchema: string;
  reversible: boolean;
  riskClass: Action['riskClass'];
}

export const TOOL_REGISTRY: ToolCard[] = [
  { kind: 'rollback', description: 'Roll a service back to a previous revision', paramSchema: '{from: string, to: string, memoryBumpPct?: number}', reversible: true, riskClass: 'low' },
  { kind: 'restart_pods', description: 'Rolling restart a deployment', paramSchema: '{deployment: string, batchSize?: number}', reversible: true, riskClass: 'low' },
  { kind: 'scale', description: 'Adjust replica count', paramSchema: '{deployment: string, replicas: number}', reversible: true, riskClass: 'low' },
  { kind: 'right_size', description: 'Adjust CPU/memory requests-limits', paramSchema: '{deployment: string, cpu: string, memory: string}', reversible: true, riskClass: 'medium' },
  { kind: 'open_pr', description: 'Open a GitHub PR with an IaC change', paramSchema: '{repo: string, branch: string, files: object, title: string, body: string}', reversible: true, riskClass: 'safe' },
  { kind: 'waf_rule', description: 'Insert a WAF rule', paramSchema: '{cve: string, ruleExpr: string, ttlDays: number}', reversible: true, riskClass: 'medium' },
  { kind: 'mesh_weight', description: 'Adjust mesh traffic weights', paramSchema: '{vs: string, dest: string, shiftPct: number}', reversible: true, riskClass: 'medium' },
  { kind: 'cache_purge', description: 'Purge a cache namespace', paramSchema: '{cache: string, namespace: string}', reversible: false, riskClass: 'low' },
  { kind: 'feature_flag', description: 'Flip a feature flag', paramSchema: '{flag: string, value: boolean}', reversible: true, riskClass: 'low' },
  { kind: 'human_review', description: 'Pause for human review', paramSchema: '{reason: string}', reversible: true, riskClass: 'safe' },
];

export function toolCardsAsText(): string {
  return TOOL_REGISTRY.map(c =>
    `- ${c.kind}: ${c.description} | params=${c.paramSchema} | reversible=${c.reversible} | risk=${c.riskClass}`,
  ).join('\n');
}

export interface ActuationResult {
  ok: boolean;
  details: string;
  artifact?: { type: 'pr' | 'patch' | 'rule' | 'log'; ref: string; preview: string };
}

export async function actuate(action: Action): Promise<ActuationResult> {
  // Deterministic shims. Each returns a believable artifact.
  switch (action.kind) {
    case 'rollback':
      return { ok: true, details: `Rolled ${action.target} back`, artifact: { type: 'patch', ref: 'argocd/rollback', preview: `kubectl rollout undo deploy/${action.target}` } };
    case 'restart_pods':
      return { ok: true, details: `Rolling restart of ${action.target}`, artifact: { type: 'log', ref: 'k8s', preview: `kubectl rollout restart deploy/${action.target}` } };
    case 'scale':
      return { ok: true, details: `Scaled ${action.target}`, artifact: { type: 'log', ref: 'k8s', preview: `kubectl scale deploy/${action.target} --replicas=${(action.params as any)?.replicas ?? '?'}` } };
    case 'right_size':
      return { ok: true, details: `Right-sized ${action.target}`, artifact: { type: 'pr', ref: 'gh:helm/values.yaml', preview: `resources:\n  requests:\n    cpu: ${(action.params as any)?.cpu}\n    memory: ${(action.params as any)?.memory}` } };
    case 'open_pr':
      return { ok: true, details: 'Opened PR', artifact: { type: 'pr', ref: 'gh:autocommit/123', preview: (action.params as any)?.title || '' } };
    case 'waf_rule': {
      const p = action.params as any;
      const rule = `SecRule REQUEST_HEADERS|ARGS|REQUEST_URI "@rx ${p?.ruleExpr || '\\.\\./'}" "id:90${Math.floor(Math.random()*900+100)},phase:1,deny,log,msg:'${p?.cve || 'CVE'}',expirevar:tx.${p?.cve || 'rule'}=${(p?.ttlDays || 14) * 86400}"`;
      return { ok: true, details: 'WAF rule pushed', artifact: { type: 'rule', ref: 'cloudarmor', preview: rule } };
    }
    case 'mesh_weight':
      return { ok: true, details: 'Mesh weights updated', artifact: { type: 'patch', ref: 'istio:vs', preview: `weights: ${JSON.stringify((action.params as any))}` } };
    case 'cache_purge':
      return { ok: true, details: 'Cache purged', artifact: { type: 'log', ref: 'redis', preview: 'FLUSHDB' } };
    case 'feature_flag':
      return { ok: true, details: 'Flag flipped', artifact: { type: 'log', ref: 'flagd', preview: JSON.stringify(action.params) } };
    case 'human_review':
      return { ok: true, details: 'Awaiting human review' };
  }
}
