// Individual agent calls. Each returns an AgentTurn.
// Errors are absorbed into low-confidence turns rather than thrown — the
// orchestrator should always be able to make forward progress for the demo.

import { llm, safeJson } from '../llm/gateway';
import type { AgentTurn, Action, Signal } from '../types';
import {
  ANALYST_SYSTEM, DEVIL_SYSTEM, SAFETY_SYSTEM, STRATEGIST_SYSTEM,
  VERIFIER_SYSTEM, CRITIC_SYSTEM, NARRATOR_SYSTEM,
} from './prompts';
import { nanoid } from 'nanoid';

function turn(partial: Partial<AgentTurn> & Pick<AgentTurn, 'agent' | 'runId'>): AgentTurn {
  return {
    id: `t_${nanoid(10)}`,
    runId: partial.runId,
    agent: partial.agent,
    thought: partial.thought ?? '',
    evidence: partial.evidence ?? [],
    proposal: partial.proposal,
    confidence: partial.confidence ?? 0.5,
    dissent: partial.dissent,
    policyViolations: partial.policyViolations,
    blastRadius: partial.blastRadius,
    costDeltaUsd: partial.costDeltaUsd,
    latencyMs: partial.latencyMs ?? 0,
    tokensIn: partial.tokensIn ?? 0,
    tokensOut: partial.tokensOut ?? 0,
    ts: partial.ts ?? Date.now(),
  };
}

const evidenceBlob = (signals: Signal[]) =>
  JSON.stringify(signals.map(s => ({
    id: s.id, ts: s.ts, kind: s.kind, source: s.source, service: s.service,
    severity: s.severity, payload: s.payload, tags: s.tags,
  })), null, 0);

export async function runAnalyst(runId: string, signals: Signal[], topology: unknown): Promise<AgentTurn> {
  const user = `Signals (chronological JSON):\n${evidenceBlob(signals)}\n\nTopology:\n${JSON.stringify(topology)}\n\nTask: Identify the single most likely root cause grounded in these signals.`;
  const r = await llm({ system: ANALYST_SYSTEM, user, json: true, temperature: 0.3 });
  const j = safeJson<any>(r.text) ?? {};
  return turn({
    runId, agent: 'analyst',
    thought: j.thought ?? '',
    evidence: Array.isArray(j.evidence) ? j.evidence : [],
    confidence: clamp01(j.confidence),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
  });
}

export async function runDevil(runId: string, signals: Signal[], analystThought: string): Promise<AgentTurn> {
  const user = `Signals JSON:\n${evidenceBlob(signals)}\n\nAnalyst said:\n${analystThought}\n\nTask: Disagree. Offer a reasonable alternative hypothesis. You MUST dissent.`;
  const r = await llm({ system: DEVIL_SYSTEM, user, json: true, temperature: 0.7 });
  const j = safeJson<any>(r.text) ?? {};
  return turn({
    runId, agent: 'devil',
    thought: j.thought ?? '',
    dissent: j.dissent ?? j.alternativeHypothesis ?? '',
    evidence: Array.isArray(j.evidenceForAlternative) ? j.evidenceForAlternative : [],
    confidence: clamp01(j.confidence),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
  });
}

export async function runSafety(
  runId: string, proposal: Action, policyText: string,
): Promise<AgentTurn> {
  const user = `Proposed action:\n${JSON.stringify(proposal)}\n\nPolicy constitution:\n${policyText}\n\nList violations or return [].`;
  const r = await llm({ system: SAFETY_SYSTEM, user, json: true, temperature: 0.1 });
  const j = safeJson<any>(r.text) ?? {};
  return turn({
    runId, agent: 'safety',
    thought: j.thought ?? '',
    policyViolations: Array.isArray(j.policyViolations) ? j.policyViolations : [],
    confidence: clamp01(j.confidence),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
  });
}

export async function runStrategist(
  runId: string, signals: Signal[], analystThought: string, dissent: string,
): Promise<AgentTurn> {
  const user = `Signals JSON:\n${evidenceBlob(signals)}\n\nAnalyst:\n${analystThought}\n\nDevil's Advocate:\n${dissent}\n\nTask: Propose ONE action with full proposal payload.`;
  const r = await llm({ system: STRATEGIST_SYSTEM, user, json: true, temperature: 0.3 });
  const j = safeJson<any>(r.text) ?? {};
  const proposal: Action | undefined = j?.proposal ? {
    kind: j.proposal.kind ?? 'human_review',
    target: j.proposal.target ?? 'unknown',
    params: j.proposal.params ?? {},
    rationale: j.proposal.rationale ?? '',
    estimatedCostUsdDelta: Number(j.proposal.estimatedCostUsdDelta ?? 0),
    reversible: !!j.proposal.reversible,
    riskClass: j.proposal.riskClass ?? 'medium',
  } : undefined;
  return turn({
    runId, agent: 'strategist',
    thought: j.thought ?? '',
    proposal,
    costDeltaUsd: proposal?.estimatedCostUsdDelta,
    confidence: clamp01(j.confidence),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
  });
}

export async function runVerifier(runId: string, proposal: Action, signals: Signal[]): Promise<AgentTurn> {
  const user = `Proposal:\n${JSON.stringify(proposal)}\n\nPre-action signals:\n${evidenceBlob(signals)}\n\nIndependently predict the outcome. Disagree if warranted.`;
  const r = await llm({ system: VERIFIER_SYSTEM, user, json: true, temperature: 0.2 });
  const j = safeJson<any>(r.text) ?? {};
  return turn({
    runId, agent: 'verifier',
    thought: `${j.thought ?? ''} | predicted=${JSON.stringify(j.predictedKpis ?? {})} | disagreement=${j.disagreementPct ?? '?'}%`,
    confidence: clamp01(j.confidence),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
  });
}

export async function runCritic(runId: string, proposal: Action, toolCards: string): Promise<AgentTurn> {
  const user = `Proposal:\n${JSON.stringify(proposal)}\n\nRegistered tool cards:\n${toolCards}\n\nValidate kind/params against the matching tool card.`;
  const r = await llm({ system: CRITIC_SYSTEM, user, json: true, temperature: 0.1, fast: true });
  const j = safeJson<any>(r.text) ?? {};
  return turn({
    runId, agent: 'critic',
    thought: j.thought ?? '',
    policyViolations: Array.isArray(j.violations) ? j.violations : [],
    confidence: clamp01(j.confidence),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
  });
}

export async function runNarrator(runId: string, story: string): Promise<AgentTurn> {
  const r = await llm({
    system: NARRATOR_SYSTEM, user: story, json: true, temperature: 0.5, fast: true,
  });
  const j = safeJson<any>(r.text) ?? {};
  return turn({
    runId, agent: 'narrator',
    thought: j.summary ?? '',
    confidence: clamp01(j.confidence ?? 0.8),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
  });
}

function clamp01(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}
