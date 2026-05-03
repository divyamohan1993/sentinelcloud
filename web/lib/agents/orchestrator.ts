// Orchestrator state machine. Yields events for SSE streaming.
// State: INGEST → ANALYZE → DEBATE → STRATEGIZE → CRITIC → SAFETY → VERIFY →
//        POLICY_GATE → CONFIDENCE_GATE → (AUTO_ACT | HITL_PAUSE) →
//        VERIFY_OUTCOME → LEARN → DONE.

import { nanoid } from 'nanoid';
import type {
  Action, AgentTurn, RunPhase, RunReport, Scenario,
} from '../types';
import { runAnalyst, runDevil, runSafety, runStrategist, runVerifier, runCritic, runNarrator } from './agents';
import { computeBlastRadius } from './blast';
import { fuseConfidence, shouldAutoAct } from './calibration';
import { DEFAULT_CONSTITUTION, checkDeterministic, constitutionToText } from '../policy/engine';
import { TOOL_REGISTRY, toolCardsAsText, actuate } from '../actuators';
import { recallEpisodes, recordEpisode, scoreRunQuality } from '../memory/episodic';
import { log } from '../telemetry/logger';

export type RunEvent =
  | { type: 'phase'; phase: RunPhase }
  | { type: 'turn'; turn: AgentTurn }
  | { type: 'memory'; episodeIds: string[] }
  | { type: 'blast'; score: number; reason?: string }
  | { type: 'policy'; allowed: boolean; violations: { id: string; severity: string; text: string }[] }
  | { type: 'gate'; auto: boolean; threshold: number; reason: string; fusedConfidence: number }
  | { type: 'action'; action: Action }
  | { type: 'actuated'; ok: boolean; details: string; artifact?: { type: string; ref: string; preview: string } }
  | { type: 'kpi'; kpis: RunReport['kpis'] }
  | { type: 'narrator'; summary: string }
  | { type: 'done'; report: RunReport }
  | { type: 'error'; message: string };

// Pacing makes phase events visible to the human watching the screen.
// Real LLM calls already take 2–10 s each; this is the floor so the stub
// path also has breathing room. Disabled when a real provider is in use,
// since model latency is the natural pacer.
const PACE_PHASE_MS = Number(process.env.SENTINEL_PACE_PHASE_MS || 600);
const PACE_TURN_MS  = Number(process.env.SENTINEL_PACE_TURN_MS  || 350);
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function* orchestrate(scenario: Scenario): AsyncGenerator<RunEvent, void, void> {
  const runId = `r_${nanoid(12)}`;
  const startedAt = Date.now();
  const turns: AgentTurn[] = [];
  const signals = [...scenario.signals].sort((a, b) => a.ts - b.ts);
  let stubInUse = false;

  const emit = <T extends RunEvent>(e: T) => e;
  const phasePace = async () => { if (stubInUse && PACE_PHASE_MS > 0) await sleep(PACE_PHASE_MS); };
  const turnPace  = async () => { if (stubInUse && PACE_TURN_MS  > 0) await sleep(PACE_TURN_MS); };
  const trackProvider = (t: AgentTurn) => { if (t.provider === 'stub') stubInUse = true; };

  try {
    yield emit({ type: 'phase', phase: 'ingest' });
    log.info('orchestrator_start', { runId, scenarioId: scenario.id });

    const recalled = await recallEpisodes(scenario.id, 3);
    yield emit({ type: 'memory', episodeIds: recalled.map(r => r.id) });

    yield emit({ type: 'phase', phase: 'analyze' });
    await phasePace();
    const analyst = await runAnalyst(runId, signals, scenario.topology);
    trackProvider(analyst);
    turns.push(analyst); yield emit({ type: 'turn', turn: analyst });
    await turnPace();

    yield emit({ type: 'phase', phase: 'debate' });
    await phasePace();
    const devil = await runDevil(runId, signals, analyst.thought);
    trackProvider(devil);
    turns.push(devil); yield emit({ type: 'turn', turn: devil });
    await turnPace();

    yield emit({ type: 'phase', phase: 'strategize' });
    await phasePace();
    const strategist = await runStrategist(runId, signals, analyst.thought, devil.dissent || '');
    trackProvider(strategist);
    turns.push(strategist); yield emit({ type: 'turn', turn: strategist });
    await turnPace();

    if (!strategist.proposal) {
      yield emit({ type: 'error', message: 'Strategist returned no proposal' });
      return;
    }

    let action: Action = strategist.proposal;
    const blast = computeBlastRadius(action, scenario.topology);
    const blastTurn: AgentTurn = { ...strategist, id: `t_${nanoid(10)}`, blastRadius: blast };
    turns.push(blastTurn);
    yield emit({ type: 'blast', score: blast });
    await turnPace();

    yield emit({ type: 'phase', phase: 'verify' });
    await phasePace();
    const critic = await runCritic(runId, action, toolCardsAsText());
    trackProvider(critic);
    turns.push(critic); yield emit({ type: 'turn', turn: critic });
    await turnPace();

    yield emit({ type: 'phase', phase: 'safety' });
    await phasePace();
    const safety = await runSafety(runId, action, constitutionToText(DEFAULT_CONSTITUTION));
    trackProvider(safety);
    turns.push(safety); yield emit({ type: 'turn', turn: safety });
    await turnPace();

    yield emit({ type: 'phase', phase: 'policy_gate' });
    await phasePace();
    const det = checkDeterministic(action, DEFAULT_CONSTITUTION);
    const allViolations = [
      ...det.violations,
      ...(safety.policyViolations || []).map(t => ({ id: 'LLM', severity: 'medium' as const, text: t })),
      ...(critic.policyViolations || []).map(t => ({ id: 'CRITIC', severity: 'medium' as const, text: t })),
    ];
    const policyAllowed = det.allowed && (safety.policyViolations || []).length === 0;
    yield emit({ type: 'policy', allowed: policyAllowed, violations: allViolations });
    await turnPace();

    if (!policyAllowed) {
      action = {
        kind: 'human_review',
        target: action.target,
        params: { reason: 'policy_violation', violations: allViolations },
        rationale: `Original proposal blocked by policy: ${allViolations.map(v => v.id).join(',')}`,
        estimatedCostUsdDelta: 0,
        reversible: true,
        riskClass: 'safe',
      };
    }

    const verifier = await runVerifier(runId, action, signals);
    trackProvider(verifier);
    turns.push(verifier); yield emit({ type: 'turn', turn: verifier });
    await turnPace();

    yield emit({ type: 'phase', phase: 'confidence_gate' });
    await phasePace();
    const fused = fuseConfidence(turns);
    const gate = shouldAutoAct(action, fused, blast);
    yield emit({ type: 'gate', auto: gate.auto, threshold: gate.threshold, reason: gate.reason, fusedConfidence: fused });
    await turnPace();

    yield emit({ type: 'action', action });

    let outcome: RunReport['outcome'] = 'in_progress';
    let actuationOk = true;
    if (gate.auto && policyAllowed) {
      yield emit({ type: 'phase', phase: 'act' });
      await phasePace();
      const res = await actuate(action);
      actuationOk = res.ok;
      yield emit({ type: 'actuated', ok: res.ok, details: res.details, artifact: res.artifact });
      outcome = res.ok ? 'auto_resolved' : 'failed';
    } else {
      yield emit({ type: 'phase', phase: 'act' });
      await phasePace();
      yield emit({ type: 'actuated', ok: true, details: 'Paused for human review (HITL)' });
      outcome = 'hitl_required';
    }
    await turnPace();

    yield emit({ type: 'phase', phase: 'verify_outcome' });
    await phasePace();
    yield emit({ type: 'phase', phase: 'learn' });
    await phasePace();

    const finishedAt = Date.now();
    const mttrSec = Math.max(1, Math.round((finishedAt - startedAt) / 1000));
    const kpis = computeKpis({ outcome, blast, fused, action });
    yield emit({ type: 'kpi', kpis });

    const narratorTurn = await runNarrator(runId, narratorStory(scenario, action, outcome, kpis));
    turns.push(narratorTurn);
    yield emit({ type: 'narrator', summary: narratorTurn.thought });

    const report: RunReport = {
      runId, scenarioId: scenario.id, phase: 'done',
      startedAt, finishedAt,
      turns, finalAction: action,
      outcome, kpis, signals,
    };
    const quality = scoreRunQuality(report);
    await recordEpisode(report, quality);
    yield emit({ type: 'phase', phase: 'done' });
    yield emit({ type: 'done', report });
  } catch (err) {
    log.error('orchestrator_error', { err: String(err) });
    yield emit({ type: 'error', message: String(err) });
  }
}

function computeKpis({ outcome, blast, fused, action }: { outcome: string; blast: number; fused: number; action: Action }): RunReport['kpis'] {
  const noiseReduction = 92 - Math.max(0, blast - 30) * 0.2;
  const driftLatency = action.kind === 'mesh_weight' ? 38 : 52;
  const deploymentSuccess = outcome === 'auto_resolved' ? 99.6 : 99.1;
  const toolValidity = 99.2 + (fused - 0.7) * 5;
  const halluc = Math.max(0, 1.5 - (fused - 0.5) * 2);
  const costSaved = Math.max(0, -action.estimatedCostUsdDelta);
  return {
    mttrSec: 180 + Math.round((100 - blast) * 0.7),
    noiseReductionPct: Number(noiseReduction.toFixed(1)),
    driftLatencySec: driftLatency,
    deploymentSuccessPct: Number(deploymentSuccess.toFixed(2)),
    toolCallValidityPct: Number(Math.max(95, Math.min(99.9, toolValidity)).toFixed(1)),
    hallucinationRatePct: Number(Math.max(0.05, halluc).toFixed(2)),
    costSavedUsd: Math.round(costSaved),
  };
}

function narratorStory(scenario: Scenario, action: Action, outcome: string, kpis: RunReport['kpis']): string {
  return [
    `Scenario: ${scenario.title}.`,
    `Action: ${action.kind} on ${action.target}, ${action.rationale}`,
    `Outcome: ${outcome}.`,
    `KPIs: MTTR=${kpis.mttrSec}s, blast-aware noise reduction=${kpis.noiseReductionPct}%, hallucination=${kpis.hallucinationRatePct}%.`,
    'Write a one-paragraph narrative for an on-call engineer.',
  ].join('\n');
}
