// Shared domain types for SentinelCloud.
// Every layer (perception, reasoning, actuation) is wired through these.

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type SignalKind =
  | 'metric'
  | 'log'
  | 'trace'
  | 'event'
  | 'pr'
  | 'chat'
  | 'alert'
  | 'audit';

export interface Signal {
  id: string;
  ts: number;
  kind: SignalKind;
  source: string;
  service: string;
  severity: Severity;
  payload: Record<string, unknown>;
  tags?: Record<string, string>;
}

export interface ServiceNode {
  id: string;
  name: string;
  kind: 'service' | 'database' | 'cache' | 'queue' | 'gateway' | 'lb' | 'cdn' | 'storage';
  region: string;
  replicas?: number;
  criticality: Severity;
  monthlyCostUsd: number;
}

export interface ServiceEdge {
  from: string;
  to: string;
  rel: 'calls' | 'reads' | 'writes' | 'depends';
  rps?: number;
}

export interface Topology {
  nodes: ServiceNode[];
  edges: ServiceEdge[];
}

export type ActionKind =
  | 'rollback'
  | 'restart_pods'
  | 'scale'
  | 'right_size'
  | 'open_pr'
  | 'waf_rule'
  | 'mesh_weight'
  | 'cache_purge'
  | 'feature_flag'
  | 'human_review';

export interface Action {
  kind: ActionKind;
  target: string;
  params: Record<string, unknown>;
  rationale: string;
  estimatedCostUsdDelta: number;
  reversible: boolean;
  riskClass: 'safe' | 'low' | 'medium' | 'high' | 'critical';
}

export type AgentRole =
  | 'analyst'
  | 'devil'
  | 'safety'
  | 'strategist'
  | 'verifier'
  | 'critic'
  | 'narrator';

export interface SignalRef {
  signalId: string;
  why: string;
}

export interface AgentTurn {
  id: string;
  runId: string;
  agent: AgentRole;
  thought: string;
  evidence: SignalRef[];
  proposal?: Action;
  confidence: number; // 0..1, calibrated
  dissent?: string;
  policyViolations?: string[];
  blastRadius?: number; // 0..100
  costDeltaUsd?: number;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  provider?: 'vertex' | 'anthropic' | 'stub';
  model?: string;
  ts: number;
}

export type RunPhase =
  | 'ingest'
  | 'analyze'
  | 'debate'
  | 'safety'
  | 'strategize'
  | 'verify'
  | 'policy_gate'
  | 'confidence_gate'
  | 'act'
  | 'verify_outcome'
  | 'learn'
  | 'done';

export interface RunReport {
  runId: string;
  scenarioId: string;
  phase: RunPhase;
  startedAt: number;
  finishedAt?: number;
  turns: AgentTurn[];
  finalAction?: Action;
  outcome: 'auto_resolved' | 'hitl_required' | 'rejected' | 'failed' | 'in_progress';
  kpis: {
    mttrSec: number;
    noiseReductionPct: number;
    driftLatencySec: number;
    deploymentSuccessPct: number;
    toolCallValidityPct: number;
    hallucinationRatePct: number;
    costSavedUsd: number;
  };
  signals: Signal[];
}

export interface PolicyRule {
  id: string;
  text: string; // plain-English constitution clause
  severity: Severity;
  appliesTo: ActionKind[];
  createdAt: number;
}

export interface MemoryEpisode {
  id: string;
  scenarioId: string;
  signalSummary: string;
  resolution: string;
  rejectedAlternatives: string[];
  outcomeQualityScore: number; // 0..1
  embedding?: number[];
  ts: number;
}

export interface Scenario {
  id: string;
  title: string;
  oneLiner: string;
  category: 'reliability' | 'finops' | 'security' | 'drift' | 'capacity';
  severity: Severity;
  signals: Signal[];
  topology: Topology;
  groundTruthRootCause: string;
  groundTruthAction: ActionKind;
  expectedKpiBoundsHint?: string;
}
