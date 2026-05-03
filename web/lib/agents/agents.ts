// Individual agent calls. Each returns an AgentTurn.
// If the configured LLM provider returns a malformed or empty payload, we
// retry the same prompt against the deterministic stub so the orchestrator
// always has a usable turn to feed the next phase. The stub responses are
// scenario-aware enough to keep the demo flowing while real-LLM hiccups
// (truncated JSON, safety blocks, transient timeouts) are absorbed silently.

import { llm, safeJson, type LlmCallOpts } from '../llm/gateway';
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
    provider: partial.provider,
    model: partial.model,
    ts: partial.ts ?? Date.now(),
  };
}

const evidenceBlob = (signals: Signal[]) =>
  JSON.stringify(signals.map(s => ({
    id: s.id, ts: s.ts, kind: s.kind, source: s.source, service: s.service,
    severity: s.severity, payload: s.payload, tags: s.tags,
  })), null, 0);

// Call the LLM, parse JSON, and if the parse is empty or missing the
// required key, retry against the stub so the run never stalls on a
// transient model failure.
async function callJson<T = any>(
  opts: LlmCallOpts,
  requireKey?: keyof T | (keyof T)[],
): Promise<{ result: T; r: Awaited<ReturnType<typeof llm>> }> {
  let r = await llm(opts);
  let parsed = safeJson<T>(r.text) as T | null;
  const required = Array.isArray(requireKey) ? requireKey : (requireKey ? [requireKey] : []);
  const missing = !parsed || required.some(k => (parsed as any)?.[k] == null || (parsed as any)?.[k] === '');
  if (missing && r.provider !== 'stub') {
    r = await llm({ ...opts, allowedProviders: ['stub'] });
    parsed = safeJson<T>(r.text) as T | null;
  }
  return { result: (parsed ?? ({} as T)), r };
}

export async function runAnalyst(runId: string, signals: Signal[], topology: unknown): Promise<AgentTurn> {
  const user = `Signals (chronological JSON):\n${evidenceBlob(signals)}\n\nTopology:\n${JSON.stringify(topology)}\n\nTask: Identify the single most likely root cause grounded in these signals.`;
  const { result: j, r } = await callJson<any>(
    { system: ANALYST_SYSTEM, user, json: true, temperature: 0.3, maxOutputTokens: 2048 },
    'thought',
  );
  return turn({
    runId, agent: 'analyst',
    thought: j.thought ?? '',
    evidence: Array.isArray(j.evidence) ? j.evidence : [],
    confidence: clamp01(j.confidence),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
    provider: r.provider, model: r.model,
  });
}

export async function runDevil(runId: string, signals: Signal[], analystThought: string): Promise<AgentTurn> {
  const user = `Signals JSON:\n${evidenceBlob(signals)}\n\nAnalyst said:\n${analystThought}\n\nTask: Disagree. Offer a reasonable alternative hypothesis. You MUST dissent.`;
  const { result: j, r } = await callJson<any>(
    { system: DEVIL_SYSTEM, user, json: true, temperature: 0.7, maxOutputTokens: 1536 },
    'thought',
  );
  return turn({
    runId, agent: 'devil',
    thought: j.thought ?? '',
    dissent: j.dissent ?? j.alternativeHypothesis ?? '',
    evidence: Array.isArray(j.evidenceForAlternative) ? j.evidenceForAlternative : [],
    confidence: clamp01(j.confidence),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
    provider: r.provider, model: r.model,
  });
}

export async function runSafety(
  runId: string, proposal: Action, policyText: string,
): Promise<AgentTurn> {
  const user = `Proposed action:\n${JSON.stringify(proposal)}\n\nPolicy constitution:\n${policyText}\n\nList violations or return [].`;
  const { result: j, r } = await callJson<any>(
    { system: SAFETY_SYSTEM, user, json: true, temperature: 0.1, maxOutputTokens: 1024 },
    'thought',
  );
  return turn({
    runId, agent: 'safety',
    thought: j.thought ?? '',
    policyViolations: Array.isArray(j.policyViolations) ? j.policyViolations : [],
    confidence: clamp01(j.confidence),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
    provider: r.provider, model: r.model,
  });
}

export async function runStrategist(
  runId: string, signals: Signal[], analystThought: string, dissent: string,
): Promise<AgentTurn> {
  const user = `Signals JSON:\n${evidenceBlob(signals)}\n\nAnalyst:\n${analystThought}\n\nDevil's Advocate:\n${dissent}\n\nTask: Propose ONE action with full proposal payload.`;
  const { result: j, r } = await callJson<any>(
    { system: STRATEGIST_SYSTEM, user, json: true, temperature: 0.3, maxOutputTokens: 2048 },
    ['proposal', 'thought'],
  );
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
    provider: r.provider, model: r.model,
  });
}

export async function runVerifier(runId: string, proposal: Action, signals: Signal[]): Promise<AgentTurn> {
  const user = `Proposal:\n${JSON.stringify(proposal)}\n\nPre-action signals:\n${evidenceBlob(signals)}\n\nIndependently predict the outcome. Disagree if warranted.`;
  const { result: j, r } = await callJson<any>(
    { system: VERIFIER_SYSTEM, user, json: true, temperature: 0.2, maxOutputTokens: 1536 },
    'thought',
  );
  return turn({
    runId, agent: 'verifier',
    thought: `${j.thought ?? ''} | predicted=${JSON.stringify(j.predictedKpis ?? {})} | disagreement=${j.disagreementPct ?? '?'}%`,
    confidence: clamp01(j.confidence),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
    provider: r.provider, model: r.model,
  });
}

export async function runCritic(runId: string, proposal: Action, toolCards: string): Promise<AgentTurn> {
  const user = `Proposal:\n${JSON.stringify(proposal)}\n\nRegistered tool cards:\n${toolCards}\n\nValidate kind/params against the matching tool card.`;
  const { result: j, r } = await callJson<any>(
    { system: CRITIC_SYSTEM, user, json: true, temperature: 0.1, fast: true, maxOutputTokens: 768 },
    'thought',
  );
  return turn({
    runId, agent: 'critic',
    thought: j.thought ?? '',
    policyViolations: Array.isArray(j.violations) ? j.violations : [],
    confidence: clamp01(j.confidence),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
    provider: r.provider, model: r.model,
  });
}

export async function runNarrator(runId: string, story: string): Promise<AgentTurn> {
  const { result: j, r } = await callJson<any>(
    { system: NARRATOR_SYSTEM, user: story, json: true, temperature: 0.5, fast: true, maxOutputTokens: 1024 },
    'summary',
  );
  return turn({
    runId, agent: 'narrator',
    thought: j.summary ?? '',
    confidence: clamp01(j.confidence ?? 0.8),
    latencyMs: r.latencyMs, tokensIn: r.tokensIn, tokensOut: r.tokensOut,
    provider: r.provider, model: r.model,
  });
}

function clamp01(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}
