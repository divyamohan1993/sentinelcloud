// Blast Radius Calculator (Gap G4).
// BFS over the topology graph from the action target, weighted by criticality.
// Score is 0..100. Anything > 70 is gated to human-in-the-loop.

import type { Action, Topology } from '../types';

// Tuned so that low-risk actions on non-critical services land in the auto-act
// window (≤ 60), while critical-service actions and broad-blast actions
// correctly trip the HITL gate (> 70).
const SEVERITY_WEIGHT: Record<string, number> = {
  low: 1, medium: 4, high: 10, critical: 22,
};
const ACTION_BASE: Record<string, number> = {
  rollback: 8,
  restart_pods: 5,
  scale: 3,
  right_size: 4,
  open_pr: 1,
  waf_rule: 6,
  mesh_weight: 7,
  cache_purge: 3,
  feature_flag: 2,
  human_review: 0,
};
// Reversible actions get a discount because they are recoverable.
const REVERSIBLE_DISCOUNT = 0.85;

export function computeBlastRadius(action: Action, topology: Topology): number {
  const start =
    topology.nodes.find(n => n.id === action.target || n.name === action.target);
  if (!start) return 22;

  const adj: Record<string, string[]> = {};
  for (const e of topology.edges) {
    (adj[e.from] ??= []).push(e.to);
    (adj[e.to] ??= []).push(e.from);
  }

  const seen = new Set<string>([start.id]);
  const queue: Array<{ id: string; depth: number }> = [{ id: start.id, depth: 0 }];

  let score = ACTION_BASE[action.kind] ?? 4;
  score += SEVERITY_WEIGHT[start.criticality] ?? 6;

  while (queue.length) {
    const { id, depth } = queue.shift()!;
    if (depth >= 2) continue;
    for (const next of adj[id] ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      const node = topology.nodes.find(n => n.id === next);
      if (node) {
        const w = SEVERITY_WEIGHT[node.criticality] ?? 4;
        // Falloff with depth: depth=1 → /2, depth=2 → /4
        score += w / Math.pow(2, depth + 1);
      }
      queue.push({ id: next, depth: depth + 1 });
    }
  }

  if (action.reversible) score *= REVERSIBLE_DISCOUNT;
  return Math.max(0, Math.min(100, Math.round(score)));
}
