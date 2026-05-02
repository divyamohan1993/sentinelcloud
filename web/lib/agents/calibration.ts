// Confidence Calibration Gate (Gap G10).
// Action auto-executes only above a class-specific threshold.
// Below threshold => human-in-the-loop pause.

import type { Action } from '../types';

const THRESHOLD: Record<Action['riskClass'], number> = {
  safe: 0.55,
  low: 0.65,
  medium: 0.78,
  high: 0.88,
  critical: 0.99, // effectively never auto
};

export function shouldAutoAct(action: Action, fusedConfidence: number, blastRadius: number): {
  auto: boolean;
  threshold: number;
  reason: string;
} {
  const threshold = THRESHOLD[action.riskClass] ?? 0.85;
  if (blastRadius > 70) return { auto: false, threshold, reason: `Blast radius ${blastRadius} > 70` };
  if (action.riskClass === 'critical') return { auto: false, threshold, reason: 'Critical action requires HITL by policy C6' };
  if (fusedConfidence < threshold) return { auto: false, threshold, reason: `Confidence ${fusedConfidence.toFixed(2)} < threshold ${threshold}` };
  return { auto: true, threshold, reason: `Confidence ${fusedConfidence.toFixed(2)} ≥ threshold ${threshold} and blast radius ${blastRadius} ≤ 70` };
}

// Fuse turn confidences into one score with the verifier acting as a multiplicative downweight.
// This penalises strategist over-confidence when the verifier disagrees.
export function fuseConfidence(turns: { agent: string; confidence: number }[]): number {
  const get = (a: string) => turns.find(t => t.agent === a)?.confidence ?? 0.5;
  const analyst = get('analyst');
  const safety = get('safety');
  const strategist = get('strategist');
  const verifier = get('verifier');
  // Geometric mean of analyst and strategist, gated by safety and verifier.
  const geo = Math.sqrt(analyst * strategist);
  const gated = geo * safety * (0.5 + 0.5 * verifier);
  return Math.max(0, Math.min(1, gated));
}
