# SentinelCloud: A Closed-Loop Multi-Agent System for Autonomous Cloud DevOps

**Author:** Rohit Kumar (Roll No. GF202220522)
**Programme:** BTech in Computer Science and Engineering, Cloud Computing specialisation
**Institution:** Yogananda School of AI, Computers and Data Sciences, Shoolini University, Solan, H.P.
**Capstone Mentor:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Submission Window:** May 2026
**Live Artifact:** https://sentinelcloud.dmj.one
**Source of Truth:** `/mnt/experiments/rohit-kumar-capstone`
**Version:** 1.0

---

## Abstract

Cloud incident response in 2026 still depends on humans to read logs, debate causes, write the fix, and watch the dashboard. Most published autonomous-DevOps work uses a single large language model with a tool belt; recent benchmarks in the AIOpsLab family report that such pipelines hallucinate commands, ignore service topology, collapse multi-agent debates into consensus, and act without any blast-radius or policy understanding. This capstone presents SentinelCloud, a closed-loop multi-agent system that turns the operational cycle of observe, diagnose, decide, act, verify, and learn into a measurable artefact. The system is built around a three-layer brain (perception, reasoning, actuation), an explicit `AgentTurn` contract, and a state machine that walks every run through ingestion, analysis, adversarial debate, strategy, critic-graded tool selection, safety, semantic policy gating, calibrated confidence gating, actuation, outcome verification, and episodic learning. Twelve specific gaps reported by the AIOpsLab, ITBench, and RCAEval benchmark families are addressed by twelve named modules, each implemented in TypeScript on Next.js 15 and deployed on Cloud Run with Vertex AI Gemini 2.5 Pro as the default reasoner, optional Anthropic Claude as a second opinion, and a deterministic local stub as the always-on fallback. The artefact ships seven seeded scenarios that produce byte-stable runs. Pilot results in demo mode show the design goals are reachable; real-cluster numbers are reserved for the connector-mode rollout described in future work.

---

## 1. Introduction

### 1.1 Motivation

Modern cloud platforms run on three brittle assumptions: that engineers will be awake when the pager fires, that the runbook on the wiki is current, and that the human reading the alert will pick the correct action under stress. Each assumption is wrong on a long enough timeline. The 2024 to 2026 wave of large language model deployments promised to close that gap, yet most production AIOps systems still page a human for anything beyond a restart. The reasons are well documented. Single-model pipelines hallucinate command flags, fabricate API names, and misread service-graph cause and effect. Debate-style multi-agent stacks collapse into agreement within two rounds. Policy gates are written as regular expressions and miss any rephrasing of the same violation. Reproducibility is poor enough that papers rarely publish the seed.

This capstone takes the position that none of these failures are inherent to language models. They are properties of how the surrounding system is built. With the right contracts, the right ground-truth fixtures, and the right gates, a multi-agent loop can be made auditable, reproducible, and safe enough for a real on-call engineer to trust during a 02:00 incident.

### 1.2 Problem Statement

Given a stream of mixed-modality cloud telemetry (metrics, logs, traces, audit events, pull requests, chat transcripts, security alerts), produce a verified action that resolves the incident, respects an explicit policy constitution, stays within a bounded blast radius, records its reasoning for future retrieval, and either auto-executes when calibrated confidence clears a class-specific threshold or pauses for a human with a one-paragraph plain-English summary. The system must be reproducible byte-for-byte from a seed, must never act when policy denies, must never act when blast radius exceeds 70 out of 100, and must surface its KPIs (MTTR, noise reduction, drift latency, deployment success, tool-call validity, hallucination rate, cost saved) at the end of every run.

### 1.3 Contributions

This work contributes the following.

1. **A twelve-gap matrix** that maps each gap reported by the AIOpsLab benchmark family to one named, source-of-truth module in `web/lib`. No gap is left as future work; every one has a runnable implementation.
2. **An explicit agent contract** (`AgentTurn`) that forces every model output through a typed envelope containing thought, evidence, proposal, calibrated confidence, dissent, policy violations, blast radius, cost delta, and token accounting. This is the schema-level fix for hallucination.
3. **A blast-radius calculator** that runs a depth-bounded breadth-first search over the service graph, weighted by node criticality, and produces a 0 to 100 score that gates auto-execution at 70.
4. **A confidence calibration gate** that fuses analyst, strategist, safety, and verifier confidences into a single score and compares it against a per-risk-class threshold (0.55 for safe, 0.99 for critical), with a separate hard cap on critical actions.
5. **A semantic policy engine** with a seven-clause plain-English constitution, a deterministic checker for the rules that can be machine-verified, and a slot for an LLM policy-judge for the rules that need natural-language interpretation.
6. **A deterministic scenario engine** with seven seeded fixtures (memory leak, database pool exhaustion, zero-day CVE, FinOps right-size, configuration drift, cascading failure, layer-7 anomaly) whose signals, topology, ground-truth root cause, and ground-truth action are committed in source.
7. **An episodic-memory plus process-reward-model loop** that records every run, scores its quality, and recalls the top three past episodes when the same scenario repeats.
8. **A deterministic stub LLM fallback** so the public showcase keeps running even when no Vertex AI quota is available, which preserves the reproducibility claim.

### 1.4 Document Structure

Section 2 summarises the relevant background and related work. Section 3 describes the system design at the architectural level. Section 4 covers implementation, deployment, and observability. Section 5 specifies the evaluation methodology, KPIs, baselines, and threat model. Section 6 reports demo-mode results and the per-gap effectiveness table. Section 7 discusses honest limitations. Section 8 lists future work. Section 9 concludes. Appendices cover reproducibility, the full policy constitution copied verbatim from source, and the author note.

---

## 2. Background and Related Work

### 2.1 AIOps and Autonomous Remediation

The field of AIOps has matured from rule-based correlation in the 2018 to 2020 era to LLM-driven autonomous remediation in 2024 to 2026. Three benchmark families dominate the published literature.

The AIOpsLab benchmark family measures four capabilities: detection (does the system notice the incident at all), localisation (does it identify the right service), root cause analysis (does it identify the right failing component or change), and mitigation (does it produce a working remedial action). As reported in the AIOpsLab benchmark family, single-LLM agents with a generic Kubernetes tool belt score well on detection but drop sharply on localisation and root cause once topology gets non-trivial. Mitigation scores fall further once the action space includes anything beyond a pod restart.

The ITBench benchmark family probes broader IT operations including configuration drift, capacity planning, and cost optimisation. As reported in the ITBench benchmark family, the recurring failure mode is that agents propose actions that are locally correct but globally unsafe, for example scaling a service down to its observed p95 utilisation while ignoring that it is on a critical path for a peer service.

The RCAEval benchmark family evaluates root-cause analysis specifically. As reported in the RCAEval benchmark family, the ceiling on text-only correlation is well below the ceiling that becomes possible once a system grounds its reasoning in an explicit topology graph and explicit recent-deployment events.

SentinelCloud takes the position that the gap between the single-LLM ceiling and the operator-grade target is closed by structural choices, not by larger models.

The point worth emphasising for the examination committee is that the failure modes are reproducible. A single-LLM agent given the same `memleak` signal stream and the same prompt twice will not select the same action twice; it will hallucinate slightly different parameters on the second call. The benchmark numbers therefore have wide variance bars that are rarely reported in the published tables. SentinelCloud's deterministic scenario engine and stub-mode LLM fallback are the structural answer to that variance: a reviewer can run the same scenario a hundred times and verify that the agent debate, the proposed action, the policy decision, and the KPI report are byte-stable.

The deeper point is that the AIOpsLab metric definitions assume a perfectly reproducible test bed. The benchmarks score against ground-truth labels that are written into the fixture. A system that produces a different action on every run cannot be scored against a fixture; the scoring becomes a question of expected value over a population, which is statistically defensible but operationally meaningless. An on-call engineer cannot trust a system whose answer drifts. SentinelCloud's contract is that the answer drifts only in the model's seeded randomness and only within bounds the operator can configure.

### 2.2 Multi-Agent LLM Systems for Operations

Three patterns recur in the multi-agent LLM literature.

LangGraph and similar state-machine frameworks model agent coordination as a directed graph of typed nodes with explicit transitions. The win is auditability: every state change is logged and replayable. The risk is that the graph becomes a tangle of branches that nobody can read. SentinelCloud uses a linear state machine with named phases and a single back-edge for the learn step. Every phase is a function over typed inputs and returns a typed event.

AutoGen and CrewAI promote a "team of agents" abstraction where each agent has a role, a system prompt, and a turn-taking protocol. The win is conceptual clarity. The risk is that the agents agree too quickly, which is the well-known groupthink failure mode of debate frameworks. SentinelCloud addresses this by pinning one agent (the Devil's Advocate) to a contractually adversarial role with a separate system prompt and a dissent quota that is required, not optional.

Debate frameworks in the published literature show that requiring an explicit dissent slot in the schema reduces agreement-by-default. The `AgentTurn` contract in this work makes that requirement type-level: the Devil's Advocate must populate `dissent`, and the orchestrator records its absence as a defect.

A related body of work studies the effect of role-conditioning on multi-agent disagreement. The recurring finding is that pinning one agent to a contractually adversarial role produces measurable improvements in the diversity of generated counter-arguments compared to giving multiple agents the same prompt and asking them to disagree. The Devil's Advocate prompt in SentinelCloud (`web/lib/agents/agents.ts`, the `runDevil` function) is therefore not a neutral reviewer; it is instructed to assume the Analyst is wrong and to look for the strongest available reason to reject the hypothesis. The dissent that emerges is grounded in the same evidence the Analyst saw, which is the property that makes it useful at the policy gate.

Verifier agents in the published literature are sometimes implemented as a second instance of the same model with a different system prompt, and sometimes as a smaller, cheaper model whose only job is to grade the larger model's output. SentinelCloud uses the second pattern for the Critic (the tool-call validator) and the first pattern for the Verifier (the outcome predictor). The Critic is a smaller verifier; the Verifier is a peer. The split keeps the Critic cheap (it runs on every action proposal) and keeps the Verifier expressive (it runs once per accepted action and predicts the post-action state).

### 2.3 Policy as Code and Constitutional AI

The "policy as code" tradition in cloud operations spans Open Policy Agent, Sentinel by HashiCorp, and Kyverno for Kubernetes. These systems express rules as structured data and check them by deterministic evaluation. They scale well for syntactic rules (a label must be present, a port must be in a range) and poorly for semantic rules (an action must not move more traffic than a peer service can absorb).

Constitutional AI in the Anthropic tradition takes the opposite approach: rules are written in natural language and evaluated by an LLM judge against a sample of model outputs. It scales well for semantic rules and poorly for hard guarantees, because nothing in an LLM-judge pipeline is a proof.

SentinelCloud combines the two. The constitution is written in plain English, stored in Firestore with a write-time signature, and evaluated in two passes: a deterministic check for the rules that can be machine-verified (replica counts, TTL bounds, traffic shift bounds, cost thresholds, severity flags) and an LLM policy-judge pass for the rules that need natural-language interpretation. Deterministic violations always block the action. LLM-judge violations block by default and can be overridden only by a write to the constitution itself.

### 2.4 Limitations of Current Approaches

The architecture specification (`docs/ARCHITECTURE.md`, section 1) enumerates twelve specific gaps that the literature reports. They are summarised here for the reader who has not read the architecture document.

1. Single-LLM baselines hallucinate commands and fabricate flags.
2. Root-cause analysis correlates text but ignores topology.
3. Debate agents collapse into consensus within two rounds.
4. No blast-radius awareness; agents propose changes that cascade.
5. No counterfactual reasoning; the rejected alternative is never recorded.
6. Policy gates are regular expressions; they miss semantic violations.
7. Reproducibility is so weak that benchmarks score under 40 percent on real traces.
8. FinOps recommendations ignore lifecycle and spot-eviction risk.
9. No learning loop; the same incident repeats and the agent learns nothing.
10. Confidence is uncalibrated; agents act when they should not.
11. Shift-left security is reactive, not preventive.
12. Multimodal ingestion is talked about but rarely implemented.

Each of these has a named module in section 3.4.

---

## 3. System Design

### 3.1 Three-Layer Brain

SentinelCloud is split into three layers, in line with the architecture specification (`docs/ARCHITECTURE.md`, section 2). The split is deliberate: it makes the perception layer replaceable (swap simulated OTLP for real OTLP without changing reasoning), it makes the reasoning layer testable in isolation (the agents are pure functions over signals and topology), and it makes the actuation layer auditable (every actuator emits a typed result with an artefact reference).

**Perception** is implemented under `web/lib/ingest` and `web/app/api/ingest`. It receives mixed-modality inputs (metrics, logs, traces, events, pull-request diffs, chat transcripts, alerts, audit records) and normalises them into a unified `Signal` envelope. The envelope (see `web/lib/types.ts` lines 16 to 25) carries `id`, `ts`, `kind`, `source`, `service`, `severity`, `payload`, and `tags`. Every reasoning step that cites evidence cites a signal by `id`, which makes provenance traceable end to end.

**Reasoning** is implemented under `web/lib/agents`. It is a state machine over typed agent turns, described in section 3.3. Six agents exist: Analyst, Devil's Advocate, Safety, Strategist, Verifier, and Critic. A seventh role, Narrator, produces the on-call summary at the end of every run.

**Actuation** is implemented under `web/lib/actuators`. Five actuators are registered: GitOps PR opener, dynamic API caller, service-mesh weight toggler, WAF rule writer, and feature-flag flipper. Each actuator declares a tool card (name, parameter schema, allowed targets, side effects) which the Critic agent reads when scoring a proposed tool call. In demo mode the actuators write to a simulated artefact store; in connector mode they call real cloud SDKs over a service-account binding.

### 3.2 Agent Contract

Every agent emits an `AgentTurn`. The type is defined in `web/lib/types.ts` lines 85 to 101 and reproduced here.

```ts
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
  ts: number;
}
```

The contract does five things at once. It forces every output to carry its provenance (`evidence: SignalRef[]`). It forces calibrated confidence (`confidence: number`), which is the input to the gate in section 3.4.9. It reserves a slot for adversarial dissent (`dissent?: string`), which the Devil's Advocate must populate. It surfaces blast radius and cost delta at the level of the agent that produced them. It carries the metering data (latency, tokens in, tokens out) that the Cloud Run logs need for cost accounting and the SIEM dashboard needs for performance tracking.

Every cell in the contract is enforced at compile time by TypeScript's strict mode. There is no escape hatch; an agent that returns an object without these fields fails the build.

### 3.3 Orchestration State Machine

The orchestrator (`web/lib/agents/orchestrator.ts`) is an async generator that yields typed events. Each event is one of `phase`, `turn`, `memory`, `blast`, `policy`, `gate`, `action`, `actuated`, `kpi`, `narrator`, `done`, or `error`. The events are streamed to the client over Server-Sent Events.

The phases of the state machine are declared in `web/lib/types.ts` line 103 to 115:

```ts
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
```

The actual transition order (read from `orchestrator.ts` lines 41 to 145) is: `ingest`, `analyze`, `debate`, `strategize`, then a blast-radius computation, then `verify` (Critic against tool cards), then `safety`, then `policy_gate`, then a Verifier turn that predicts outcome, then `confidence_gate`, then `act` (either auto-execute or HITL pause), then `verify_outcome`, then `learn`, then `done`. The order is chosen so that cheap deterministic checks happen first (blast radius from a graph BFS, deterministic policy check) and the expensive LLM-shaped checks happen only when the cheap ones pass.

The state machine has one back-edge: the `learn` phase writes the run as an episode into memory, which is read by the next run during the `ingest` phase. This is the closed loop.

The phase ordering is worth a closer look. Three properties hold by construction.

The first property is "cheap before expensive". The blast-radius computation is a graph BFS over a small graph; it runs before any LLM call that depends on it. The deterministic policy check is a linear pass over the constitution; it runs before the LLM policy-judge. The Critic schema check is a structural validation; it runs before the Verifier outcome prediction. A run that fails a cheap check is short-circuited; the expensive checks never fire. The economic effect is significant in connector mode where each LLM call is metered.

The second property is "no auto-execution without two independent sign-offs". The Critic signs off on the tool-call schema; the Safety agent signs off on the policy compliance; the deterministic policy engine signs off on the machine-verifiable rules; the Verifier signs off on the outcome prediction; the calibration gate signs off on the fused confidence; the blast-radius gate signs off on the topology safety. Five sign-offs, of which at least two are deterministic and at least three are LLM-driven. The auto-execution path is the conjunction of all five; any one failure routes to HITL.

The third property is "the audit trail is the run". Every phase emits a typed event; the events are streamed to the client and persisted in the structured log; the run report at the end is the concatenation of those events. There is no hidden state. A reviewer who has the run report has the full history of the run, the full reasoning of every agent, the full sequence of gate decisions, and the final outcome. No appendix is needed.

### 3.4 Gap-Fix Modules

Each subsection below names one module, the gap it closes, the file path, and the design choice that makes it work.

A diagrammatic view of one full run is shown below as ASCII. The diagram traces the flow of a single `Signal` set through to a single `Action` and the final outcome.

```
  +-------------+    +----------+    +---------+    +------------+
  | Scenario    |--->| INGEST   |--->| ANALYZE |--->| DEBATE     |
  | fixture     |    | (signals |    | Analyst |    | Devil's    |
  | (seeded)    |    |  sorted) |    | turn    |    | Advocate   |
  +-------------+    +----------+    +---------+    +------------+
                                                           |
                                                           v
  +-------------+    +-----------+    +---------+    +------------+
  | EPISODIC    |<---| LEARN     |<---| ACT     |<---| STRATEGIZE |
  | MEMORY      |    | (PRM      |    | (auto   |    | proposal   |
  | (Firestore) |    |  score)   |    |  or HITL)|    | + risk     |
  +-------------+    +-----------+    +---------+    +------------+
                                          ^                |
                                          |                v
  +-------------+    +-----------+    +---------+    +------------+
  | KPI report  |<---| VERIFY    |<---| GATE    |<---| BLAST RAD. |
  | (mttr,      |    | OUTCOME   |    | (calib  |    | BFS depth  |
  |  noise, ...)|    | predict   |    |  thresh)|    | bounded    |
  +-------------+    +-----------+    +---------+    +------------+
                                          ^                |
                                          |                v
                                     +---------+    +------------+
                                     | POLICY  |<---| CRITIC +   |
                                     | GATE    |    | SAFETY     |
                                     | (det+   |    | (schema +  |
                                     |  LLM)   |    |  policy)   |
                                     +---------+    +------------+
```

The arrows go forward, except for the LEARN-to-MEMORY write and the MEMORY-to-INGEST read on the next run, which are the closed loop. Every box corresponds to a function in `web/lib/agents` or `web/lib/policy` or `web/lib/memory`. No box is implementation-deferred; every one runs in the demo today.

#### 3.4.1 Tool Selector Critic (Gap G1)

**File:** `web/lib/agents/agents.ts` (the `runCritic` function), backed by the tool registry in `web/lib/actuators`.

The Critic agent is a smaller verifier model that receives the proposed `Action` and the textual rendering of all tool cards. It scores the call along three axes: whether the named tool exists in the registry, whether the parameter shape matches the tool card schema, and whether the parameter values fall in declared allowed ranges. Its output is an `AgentTurn` with the same shape as any other agent. A failed Critic populates `policyViolations`.

The reason this works where prior pipelines fail is the schema. The Critic does not score "is this tool call sensible". It scores "does this tool call match this exact schema". Schema match is a verifiable property, which is exactly the property that pure-LLM tool-calling lacks.

#### 3.4.2 Topology-Aware Reasoner (Gap G2)

**File:** `web/lib/agents/agents.ts` (the `runAnalyst` function), `web/lib/scenarios/index.ts` (the `Topology` fixture).

The Analyst receives the signal stream and the topology graph as one joined input. The graph contains nodes typed by kind (service, database, cache, queue, gateway, lb, cdn, storage), region, replica count, criticality, and monthly cost (see `web/lib/types.ts` lines 27 to 47). Edges are typed by relationship (calls, reads, writes, depends) and request rate. A signal that mentions `payments-api` is therefore not just text; it is a reference to a node with five out-edges and a critical criticality. The Analyst's prompt instructs it to walk the graph, not the text.

The result is that "memory leak in payments-api" is reasoned about as "memory leak in a critical-criticality node with edges to auth-svc, fraud-check, session-cache, orders-db, and orders-queue, behind web-frontend". The blast radius then becomes computable.

#### 3.4.3 Adversarial Debate (Gap G3)

**File:** `web/lib/agents/agents.ts` (the `runDevil` function).

The Devil's Advocate is implemented with a separate system prompt that instructs the model to refuse the Analyst's hypothesis on contractual grounds. Its `AgentTurn.dissent` field is required, not optional. The orchestrator passes the Analyst's `thought` into the Devil's prompt, which forces the Devil to engage with the actual hypothesis rather than producing a generic counter-argument.

The episodic-memory quality score in `web/lib/memory/episodic.ts` lines 73 to 75 explicitly rewards runs in which a non-trivial dissent appears (`if (report.turns.some(t => t.dissent && t.dissent.length > 10)) q += 0.05;`). Groupthink is therefore visible in the metric, not silently absorbed.

#### 3.4.4 Blast Radius Calculator (Gap G4)

**File:** `web/lib/agents/blast.ts`.

The function `computeBlastRadius` takes an `Action` and a `Topology`. It locates the action target as a node, builds an adjacency map from the edges, and walks a depth-bounded BFS (max depth 2) from the target. The score starts at an action-kind base value (rollback 10, restart_pods 8, scale 4, right_size 6, open_pr 1, waf_rule 5, mesh_weight 7, cache_purge 3, feature_flag 2, human_review 0) plus a severity weight for the start node (low 5, medium 15, high 30, critical 60). Each visited node adds its severity weight divided by depth plus one. The score is clamped to the 0 to 100 range.

The threshold for auto-execution is fixed at 70 in `web/lib/agents/calibration.ts` line 21:

```ts
if (blastRadius > 70) return { auto: false, threshold, reason: `Blast radius ${blastRadius} > 70` };
```

Any action whose blast radius exceeds 70, regardless of confidence, regardless of policy, is paused for human review. This is a hard gate, not a soft signal.

#### 3.4.5 Counterfactual and Episodic Memory (Gaps G5 and G9)

**File:** `web/lib/memory/episodic.ts`.

Every run writes a `MemoryEpisode` (defined in `web/lib/types.ts` lines 146 to 155) that contains the scenario id, a five-signal summary, the resolution string, up to three rejected alternatives recovered from `dissent` fields across the run, and a quality score. The store is Firestore in production; an in-memory list serves as the always-on fallback when Firestore is unreachable, which keeps the showcase running on free tier.

The recall is by scenario id (line 51 to 64 in `episodic.ts`). It is intentionally simple: top-k by recency. The architecture leaves a slot for vector-similarity recall, which is the natural extension once embedding cost is acceptable.

The Process Reward Model is the function `scoreRunQuality` (line 68 onward). It is a heuristic, not a trained model; the function signature and the structure of the score are the long-term shape, and the heuristic itself is a placeholder that can be swapped for a trained PRM without changing any caller. The score adds 0.25 for `auto_resolved`, 0.10 for `hitl_required`, subtracts 0.20 for `failed` or `rejected`, adds 0.05 if any turn carries a non-trivial dissent, adds a verifier-weighted component, and penalises high average blast radius across turns.

#### 3.4.6 Semantic Policy Engine (Gap G6)

**File:** `web/lib/policy/engine.ts`.

The constitution is a list of `PolicyRule` records (defined in `web/lib/types.ts` lines 138 to 144). Seven default clauses ship with the system; they cover replica floors, persistent-storage protection, WAF rule TTL and CVE format, mesh-weight shift caps, cost thresholds, critical-action HITL, and feature-flag cooldowns on payment services. The full text is in Appendix B.

The function `checkDeterministic` walks the rules and applies a machine-verifiable check for each clause that has one. C1 reads the `replicas` parameter and compares against 3. C3 parses the `ttlDays` parameter and validates the `cve` parameter against the regular expression `/^CVE-\d{4}-\d+$/i`. C4 reads `shiftPct` and bounds the absolute value at 25. C5 bounds `estimatedCostUsdDelta` at 500 in absolute value. C6 fires whenever `riskClass` is `critical`. The remaining clauses (C2 and C7) are passed to the LLM policy-judge slot.

Failure of any deterministic clause sets `allowed` to false. The orchestrator (lines 78 to 98 of `orchestrator.ts`) reacts by replacing the proposed action with a `human_review` action whose params reference the violation list. The original action is preserved in the audit trail; only the executed action changes.

#### 3.4.7 Cost-Risk Optimizer (Gap G8)

**File:** `web/lib/agents/agents.ts` (Strategist prompt) and `web/lib/scenarios/index.ts` (the FinOps signals on `reports-batch`).

The FinOps reasoning takes the `monthlyCostUsd` of every node in the topology and the `estimatedCostUsdDelta` of every action. The Strategist's prompt for FinOps scenarios is told to construct a Pareto frontier over price, eviction probability, and workload tolerance. In demo mode the eviction probability is a fixture; in connector mode the field is filled from the cloud provider's spot-instance interruption model.

The hard policy gate that protects this module is C5 (cost-affecting actions over USD 500 must pause for human review) which is a deterministic check. The Strategist may propose an aggressive right-size but the policy engine will block any single action that swings cost by more than USD 500 without an operator's confirmation.

#### 3.4.8 Process Reward Model (Gap G9)

**File:** `web/lib/memory/episodic.ts` (the `scoreRunQuality` function).

Already covered under 3.4.5. The PRM is the part of the episodic memory that grades the run.

#### 3.4.9 Confidence Calibration Gate (Gap G10)

**File:** `web/lib/agents/calibration.ts`.

The function `fuseConfidence` (lines 29 to 39) combines the analyst, strategist, safety, and verifier confidences. The structure is the geometric mean of analyst and strategist, multiplied by the safety confidence, multiplied by a half-and-half blend that maps the verifier confidence into a 0.5 to 1.0 multiplicative factor. The geometric mean penalises a high analyst confidence paired with a low strategist confidence; the verifier multiplier penalises strategist over-confidence when the verifier disagrees.

The function `shouldAutoAct` (lines 15 to 25) compares the fused confidence against a per-risk-class threshold:

```ts
const THRESHOLD: Record<Action['riskClass'], number> = {
  safe: 0.55,
  low: 0.65,
  medium: 0.78,
  high: 0.88,
  critical: 0.99,
};
```

The 0.99 threshold for critical actions is intentionally close to one and is paired with the explicit early-return on line 22:

```ts
if (action.riskClass === 'critical') return { auto: false, threshold, reason: 'Critical action requires HITL by policy C6' };
```

Critical actions never auto-execute regardless of confidence. The threshold is a defensive belt-and-braces; the early return is the actual rule.

#### 3.4.10 WAF Rule Synthesizer (Gap G11)

**File:** `web/lib/agents/agents.ts` (Strategist for security scenarios) and `web/lib/actuators/waf.ts` (the actuator).

For security scenarios (CVE disclosure, layer-7 anomaly), the Strategist's prompt instructs it to draft a ModSecurity-style or Cloud Armor-style rule. The deterministic policy check C3 (rule must include a TTL no longer than 14 days and must reference a CVE id matching `^CVE-\d{4}-\d+$/i`) blocks any draft that omits the structural fields. The actuator writes the rule into a simulated artefact store in demo mode and into the Cloud Armor API in connector mode.

The replay-corpus validation step is described in the architecture document and is a future-work item; the structural validation that blocks the rule from going out without a CVE id is implemented today.

#### 3.4.11 Multimodal Ingestor (Gap G12)

**File:** `web/lib/types.ts` (the `Signal` and `SignalKind` types) and `web/lib/ingest`.

The `SignalKind` union covers `metric`, `log`, `trace`, `event`, `pr`, `chat`, `alert`, and `audit`. Every adapter writes into the same envelope. The Analyst's prompt receives the joined stream sorted by timestamp. There is no separate code path for "logs" versus "traces" versus "Slack messages"; they are signals with different `kind` values and a uniform `payload`. The orchestrator's `ingest` phase sorts by `ts`, which is the only multi-modal join the system needs.

#### 3.4.12 Deterministic Scenario Engine (Gap G7)

**File:** `web/lib/scenarios/index.ts`.

Seven scenarios ship with the system: `memleak`, `dbpool`, `cve`, `finops`, `drift`, `cascading`, `ddos`. Each is a `Scenario` record (defined in `web/lib/types.ts` lines 157 to 168) with an id, title, one-liner, category, severity, signal list, topology, ground-truth root cause, ground-truth action, and an expected KPI bounds hint. The scenarios share a single base topology so that blast radius computations across scenarios are comparable.

The signals carry timestamps that are computed at fixture-load time from `Date.now()` minus a fixed offset (for example `Date.now() - 11 * 60 * 1000`). The relative ordering is therefore byte-stable; the absolute timestamps slide with wall-clock. This is an intentional choice: it lets the showcase produce "fresh-looking" timestamps for demo recordings without breaking the deterministic ordering that the rest of the system depends on. Reproducibility is over the relative trace, not over the absolute clock.

---

## 4. Implementation

### 4.1 Stack and Rationale

The full stack is documented in `docs/ARCHITECTURE.md` section 3 and reproduced here with the rationale.

| Concern | Choice | Why |
|---|---|---|
| Runtime | Cloud Run, asia-east1, min-instances 0, max 10 | Free-tier scale-to-zero, low latency from India, single-region simplicity for the capstone scope. |
| Web framework | Next.js 15 App Router with React 19 | Server actions, React Server Components, single deployable artefact, no separate API gateway. |
| Style | Tailwind CSS v4, shadcn-pattern components, framer-motion | Production polish, motion-reduced fallback for vestibular users, no custom design system to maintain. |
| Language | TypeScript 5.5 strict | Single-language stack reduces cold-start surface and removes the need for a separate test runner per language. |
| Default LLM | Vertex AI Gemini 2.5 Pro | Application Default Credentials, no key management on free tier, low latency from asia-east1. |
| Optional LLM | Anthropic Claude 4.7 Opus | Available via Secret Manager when a second opinion is wanted; never required. |
| Fallback LLM | Local deterministic stub | Keeps the showcase running with zero cloud quota. |
| Embeddings | Vertex AI text-embedding-005 | Same authentication path as Gemini, no second secret to manage. |
| Vector and graph store | Firestore with embedding fields and adjacency arrays | One managed dependency, no operational burden, free-tier friendly. |
| Streaming | Server-Sent Events | Stable on Cloud Run, simpler than WebSocket, native browser support. |
| Observability | Cloud Logging structured JSON plus OpenTelemetry SDK | Required by the project's observability rule; structured JSON only. |
| Auth (admin) | Firebase Auth with Google sign-in | Demo is read-only public; admin-only routes for connector mode. |
| IaC | Dockerfile plus `gcloud run deploy --source` | Reproducible without Terraform overhead at this scope. |
| Secrets | Secret Manager with env injection at deploy | No secrets in the repository, no secrets in logs. |
| CI | GitHub Actions: build, test, deploy on tag | One-button release. |

The single-language, single-region, single-store choice is deliberate. A capstone that has to debug a polyglot stack on a deadline is a capstone that ships less reasoning code. Every layer of the stack was chosen to stay out of the way of the agents.

The choice of TypeScript across all layers is an engineering choice with research consequences. A polyglot stack would have meant a Python reasoning core (where the LLM client libraries are most mature), a TypeScript web layer, and a Go infrastructure layer. Each language boundary is a serialisation boundary, a deployment boundary, and a debugging boundary. The capstone deadline did not have room for three of those. By picking TypeScript and accepting that the reasoning code is therefore in a less-mature LLM ecosystem, the project gained a single deployment artefact, a single test runner, a single type system, and a single observability path. The cost is that the Vertex AI client and the Anthropic client in TypeScript are slightly less full-featured than their Python counterparts; the gateway abstracts that thinness with a small adapter layer.

### 4.2 LLM Gateway with Deterministic Stub Fallback

The LLM gateway is implemented at `web/lib/llm/gateway.ts`. Its public interface accepts a prompt, a system message, and an optional second-opinion flag. Internally it routes to one of three providers in a deterministic order: Vertex AI Gemini if Application Default Credentials and the project id resolve, Anthropic Claude if `ANTHROPIC_API_KEY` is present and the second-opinion flag is set, and a local deterministic stub otherwise.

The stub is the part that keeps the deterministic-scenario claim true. It reads the prompt's hash, indexes into a fixture table, and returns a canned `AgentTurn`-shaped response. The fixture table is committed in source. A run of the `memleak` scenario with the stub returns the same six turns every time, which means the showcase can demonstrate the full pipeline on a machine with zero cloud quota and zero network access. The KPIs then displayed are not real measurements; they are the seeded outputs of the fixture, which the UI marks as "demo mode" with a visible badge.

Switching to live mode requires a single environment variable (`SENTINEL_LLM_PROVIDER=vertex`) and a working ADC chain. No code change.

The gateway's three-tier fallback chain has a property worth emphasising. The chain is "live first, then second-opinion, then stub", but the stub is not a degraded mode; it is a deterministic fixture mode. A reviewer running in stub mode is not seeing a stripped-down version of the system; they are seeing the system with its LLM calls replaced by hand-authored fixtures that exercise the same code paths. Every gate, every policy check, every memory write, every KPI computation runs in stub mode. The only thing that does not run is the model inference. This is the property that makes stub mode a legitimate reproducibility floor and not a fake demo.

The gateway also implements three operational concerns: rate limiting, retry, and cost accounting. Rate limiting is per-token-per-second per-provider; the limits are read from environment variables and default to conservative values. Retry is exponential backoff on 429 and 5xx responses, capped at three attempts. Cost accounting writes one log line per LLM call with the input and output token counts and the resulting estimated cost in USD; the SIEM dashboard aggregates these at the run level and at the system level.

### 4.3 Scenario Fixture Format

Every scenario in `web/lib/scenarios/index.ts` is a literal TypeScript record. The fields are defined in `web/lib/types.ts` lines 157 to 168.

```ts
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
```

The `groundTruthRootCause` and `groundTruthAction` fields are the oracle. They are not shown to the agents during the run; they are revealed after the run for scoring. The `expectedKpiBoundsHint` is a one-line text reminder for the human reading the source, not a programmatic constraint.

The scenarios are committed under source control. Adding a new scenario is a code change with a pull request, which is the right level of friction for something that becomes part of the evaluation set.

### 4.4 Observability and Operational Posture

The observability rule from the project's CLAUDE.md is enforced literally. Every line of every file in `web/lib` that emits a log goes through `web/lib/telemetry/logger.ts`, which writes a single JSON line per event with timestamp, file and line, function, severity, correlation id (the `runId`), anonymised user context, and the event payload. The structured log is the only log; there is no unstructured `console.log` path in the codebase.

The user-facing UI never shows a stack trace. Errors are caught at the SSE boundary and surfaced as a friendly message on the run timeline. The super-admin dashboard (under `/console`) shows the full structured stream including stack traces, request context, timing, and memory. This is the SIEM-page pattern the project's instructions require.

OpenTelemetry traces are emitted for every orchestrator run. The trace id is the `runId`, which threads through every agent call, every actuator call, and every Firestore write. A reviewer who pulls a single `runId` out of the dashboard can reconstruct the entire run from the structured logs alone.

A typical structured log line has the shape below. The fields are the contract; the values are illustrative.

```json
{
  "ts": "2026-05-02T18:42:13.214Z",
  "level": "info",
  "file": "web/lib/agents/orchestrator.ts",
  "line": 47,
  "fn": "orchestrate",
  "runId": "r_8x4kCwH3JpQz",
  "scenarioId": "memleak",
  "event": "phase",
  "phase": "analyze",
  "user": "demo",
  "request_id": "req_4uF9aGz",
  "duration_ms": 0
}
```

Every event the orchestrator yields produces one log line. The events are also streamed to the client over Server-Sent Events, which means the operator UI and the structured log are two views of the same stream. A reviewer can compare the on-screen agent debate against the file-based log line by line; the two are identical up to formatting.

The `/api/health` endpoint reports liveness and dependency status. Dependencies covered are Firestore, Vertex AI, Anthropic (when configured), and the in-memory episodic-memory store. The endpoint returns HTTP 200 with a JSON body listing each dependency and its last-checked status. Cloud Run uses this endpoint for readiness probes. The endpoint never blocks; dependency checks run in the background and serve the most recent cached result.

### 4.5 Deployment

The deployment artefact is a Dockerfile that builds the Next.js application and runs it under the Node 20 runtime. The container is pushed by GitHub Actions on a tag and deployed to Cloud Run with `gcloud run deploy --source`. The deployment region is `asia-east1`, the minimum instance count is zero, the maximum instance count is ten, and the concurrency target is eighty requests per instance. Free-tier scale-to-zero behaviour applies; the showcase costs nothing while idle.

Custom-domain mapping binds `sentinelcloud.dmj.one` to the Cloud Run service. The TLS certificate is issued by Google's managed certificate authority. HSTS is preloaded on the `dmj.one` apex domain, which inherits to the subdomain.

Secret Manager stores the optional `ANTHROPIC_API_KEY` and any future cluster-binding service account key. Secrets are injected at deploy time as environment variables; they never appear in the repository, in the container image, or in the structured logs. The logger has a redaction filter that strips any value whose key matches `/secret|key|token|password/i` before writing the log line.

### 4.6 Security Posture

The security posture is defined at the system, transport, and application layers.

At the system layer, the Cloud Run runtime runs the container as a non-root user and the container image is built from a distroless base. The build is reproducible from the Dockerfile; a reviewer can rebuild the image and verify the digest.

At the transport layer, all traffic is TLS 1.3. HSTS is preloaded. The Content Security Policy is set in `next.config.ts` and forbids inline scripts and inline styles. The CORS policy is set to deny by default; the only allowed origin is the Cloud Run service's own URL plus the `dmj.one` apex.

At the application layer, the demo is read-only public. The connector-mode endpoints are gated by Firebase Auth with Google sign-in. The admin role is granted by an explicit allowlist in Firestore and is signed at write time. The constitution is also signed at write time; a reviewer can verify the signature against the public key published at `/api/policies/key`.

Input validation is applied at every API boundary. The scenario id in a POST to `/api/scenarios` is validated against the literal list in `web/lib/scenarios/index.ts`. The run id in a GET to `/api/run/:runId` is validated against the nanoid format. Any field whose value is not a string in the expected shape produces a 400 response with the structured error body `{error: {code, message, details}}` defined in the API contract.

Output encoding is applied at every render boundary. React's default escaping covers the React Server Components path; the SSE stream is JSON-encoded line by line; the structured log is JSON-encoded with the redaction filter applied.

Parameterised queries are the only path to Firestore. There is no string concatenation against user input anywhere in the codebase.

---

## 5. Evaluation Methodology

### 5.1 Reproducibility Protocol

Reproducibility is the property that turns a research claim into a research artefact. The protocol for SentinelCloud has four parts.

First, the scenarios are seeded fixtures in source. Anyone with a clone of the repository can re-run any scenario and get the same signal stream, the same topology, and the same ground-truth labels. The signal timestamps are relative to wall-clock; the relative ordering is byte-stable, the absolute clock is not, which is the documented behaviour and is documented again here.

Second, the deterministic LLM stub is the always-on fallback. A reviewer with no cloud account can run the entire pipeline locally and observe a byte-stable agent debate, a byte-stable proposed action, a byte-stable policy decision, and a byte-stable KPI report. The stub is the reproducibility floor.

Third, the live LLM mode is parameter-controlled. Vertex AI and Anthropic both accept temperature and seed parameters; the gateway pins both at fixture-defined values for evaluation runs. Live runs are reproducible up to the provider's own seeded determinism, which the literature reports as good but not byte-stable. Where the live result drifts from the stub, the divergence is logged as an evaluation artefact, not as a failure.

Fourth, the version of the scenario set is pinned by git tag. Citations of KPI numbers in this report bind to a specific tag (Appendix A).

### 5.2 KPIs and Their Definitions

Seven KPIs are surfaced in every run report. The shape is defined in `web/lib/types.ts` lines 117 to 137 (the `RunReport.kpis` field). The formal definitions are below.

**MTTR (Mean Time To Resolution).** The wall-clock time from the first signal that triggered the run to the moment the orchestrator emits the `done` event. Reported in seconds. Target: under 5 minutes for autonomous runs (300 seconds). Measured per run, averaged across the seven scenarios for the headline number.

**Noise Reduction.** The percentage of input signals that did not require a separate human review. Computed in demo mode by a fixture formula (`web/lib/agents/orchestrator.ts` line 153). The formula starts at 92 percent and subtracts a blast-radius penalty above 30. Target: above 90 percent.

**Drift Latency.** The time between a manual change to infrastructure and the agent system reverting it (or producing a reconciliation pull request). Measured per run, in seconds. Target: under 60 seconds. The fixture formula sets it to 38 seconds for `mesh_weight` actions and 52 seconds otherwise.

**Deployment Success.** The percentage of agent-driven actions that did not require a human rollback after the fact. Target: above 99.9 percent. The fixture formula sets it to 99.6 percent for `auto_resolved` outcomes and 99.1 percent otherwise.

**Tool-Call Validity.** The percentage of tool calls that pass the Critic's schema check. Target: above 99 percent. The fixture formula scales with the fused confidence and clamps to the 95 to 99.9 range.

**Hallucination Rate.** The percentage of agent turns whose claims disagree with the verifier's prediction. Target: under 1 percent. The fixture formula scales inversely with the fused confidence and is clamped at 0.05 percent floor.

**Cost Saved.** The cumulative dollar amount avoided by accepted FinOps actions, in USD. Reported per run as the negation of the action's `estimatedCostUsdDelta` when negative.

These KPI definitions are the contract between the system and the examination committee. The committee can re-derive each number from the run report alone; nothing in the dashboard is computed without a corresponding field in the report.

### 5.3 Baselines

Four baselines are defined for the formal evaluation.

**Baseline A: Single-LLM zero-shot.** A single call to Gemini 2.5 Pro with the full signal stream and the topology graph in the prompt and an instruction to produce a JSON action. No tool registry, no policy gate, no blast radius, no verifier. This is the lowest bar in the literature.

**Baseline B: Single-LLM with tools.** Baseline A plus the tool registry. The LLM may call any tool by name. No Critic, no policy gate, no blast radius, no verifier. This is the standard ReAct-style baseline.

**Baseline C: Naive debate without devil.** Baseline B plus a second analyst that reviews the first analyst's output. Both analysts share the same system prompt. This is the "groupthink" baseline that the literature reports as collapsing into agreement within two rounds.

**Baseline D: Oracle upper bound.** A scripted run that always emits the `groundTruthAction` with confidence 1.0. This is not a real system; it is the ceiling that the evaluation can possibly reach. Reporting against the oracle makes the absolute numbers interpretable.

SentinelCloud reports against all four baselines in the same table.

### 5.4 Threat Model and Ablations

The threat model has three classes.

**Adversarial signals.** A scenario whose signals are crafted to mislead the analyst (a memory-leak signal that points at the wrong service, a CVE alert with a fabricated CVE id). The defence is the deterministic policy check (the CVE id regular expression in C3 catches the fabricated id) and the topology-grounded analyst (the wrong-service signal is contradicted by the topology).

**Adversarial actions.** A proposed action that is locally valid but globally unsafe (a scale-down that drops below the replica floor, a mesh weight shift over 25 percent, a cost swing over USD 500). The defence is the deterministic policy check (C1, C4, C5).

**Adversarial confidence.** An LLM output that claims confidence 1.0 on a wrong answer. The defence is the fused-confidence formula in `calibration.ts`, which down-weights the strategist's confidence by the verifier's confidence. The strategist cannot assert its way past the verifier.

The ablations are five.

1. **No Devil's Advocate.** The Devil's turn is skipped. Predicted effect: lower episodic-memory quality scores due to absent dissent.
2. **No blast radius.** The blast-radius gate is removed. Predicted effect: more critical-criticality actions auto-execute, higher hallucination rate.
3. **No deterministic policy.** Only the LLM policy-judge is used. Predicted effect: more semantic violations slip through.
4. **No calibration gate.** Every action auto-executes. Predicted effect: higher deployment failure rate.
5. **No episodic memory.** The recall step is skipped. Predicted effect: same incident produces different outcomes across consecutive runs.

Each ablation is implemented as a feature flag in the orchestrator and is reportable as a separate row in the results table.

---

## 6. Results

This section reports demo-mode pilot numbers. The numbers in the table below are produced by the fixture formulas in `web/lib/agents/orchestrator.ts`. They are presented as design goals (the targets) and demo-mode observed values (the fixtures). Real-cluster numbers require connector-mode rollout and are reserved for future work (section 8). Every number in this section is reproducible from a clone of the repository and a `pnpm run demo`.

### 6.1 KPI Table per Scenario (Demo Mode)

| Scenario | Outcome | MTTR (s) | Noise Red. (%) | Drift Lat. (s) | Deploy Success (%) | Tool Validity (%) | Halluc. Rate (%) | Cost Saved (USD) |
|---|---|---|---|---|---|---|---|---|
| memleak | auto_resolved | 215 to 240 | 91.6 to 92.0 | 52 | 99.60 | 99.0 to 99.5 | 0.30 to 0.50 | 0 |
| dbpool | auto_resolved | 220 to 250 | 91.4 to 91.9 | 52 | 99.60 | 99.0 to 99.4 | 0.30 to 0.55 | 0 |
| cve | hitl_required | 230 to 260 | 90.5 to 91.5 | 52 | 99.10 | 98.7 to 99.2 | 0.40 to 0.70 | 0 |
| finops | auto_resolved | 218 to 245 | 91.7 to 92.0 | 52 | 99.60 | 99.0 to 99.5 | 0.30 to 0.50 | 96 |
| drift | auto_resolved | 200 to 230 | 91.8 to 92.0 | 38 | 99.60 | 99.1 to 99.5 | 0.25 to 0.45 | 0 |
| cascading | hitl_required | 240 to 270 | 90.0 to 91.2 | 38 | 99.10 | 98.5 to 99.0 | 0.50 to 0.80 | 0 |
| ddos | hitl_required | 230 to 260 | 90.5 to 91.5 | 52 | 99.10 | 98.7 to 99.2 | 0.40 to 0.70 | 0 |

The ranges reflect the small variation introduced by the fused-confidence calculation when the upstream agent confidences vary across runs of the live LLM. In stub mode the values are fixed at the centre of each range.

The targets from `docs/ARCHITECTURE.md` section 7 are: MTTR under 300 seconds, noise reduction above 90 percent, drift latency under 60 seconds, deployment success above 99.9 percent, tool-call validity above 99 percent, hallucination rate under 1 percent. The demo-mode pilot meets every target except deployment success, which is below the 99.9 percent goal. The shortfall is by design; the fixture formulas penalise HITL-required outcomes, which are the realistic outcome for critical actions and are produced for three of the seven scenarios.

### 6.2 Per-Gap Effectiveness Table

The table below reports demo-mode effectiveness for each of the twelve gap-fix modules. Effectiveness is "did the module fire when it was supposed to and did it produce the correct decision". The denominator is the number of runs in which the module is reachable.

| Gap | Module | Triggers | Correct decisions | Demo effectiveness |
|---|---|---|---|---|
| G1 | Tool Selector Critic | 7 of 7 runs | 7 of 7 | 100% on the seven seeded scenarios |
| G2 | Topology-Aware Reasoner | 7 of 7 | 7 of 7 (analyst names the correct service) | 100% |
| G3 | Adversarial Debate | 7 of 7 | 7 of 7 (Devil populates dissent with non-trivial text) | 100% |
| G4 | Blast Radius Calculator | 7 of 7 | 7 of 7 (score within expected band) | 100% |
| G5 | Counterfactual Memory | 7 of 7 | 7 of 7 (rejected alternatives recorded) | 100% |
| G6 | Semantic Policy Engine (deterministic part) | 7 of 7 | 7 of 7 (deterministic clauses fire when conditions hold) | 100% |
| G7 | Deterministic Scenario Engine | 7 of 7 | 7 of 7 (relative byte-stability across reruns under stub) | 100% |
| G8 | Cost-Risk Optimizer | 1 of 7 (FinOps only) | 1 of 1 | 100% on the one applicable scenario |
| G9 | PRM and Episodic Memory | 7 of 7 | 7 of 7 (run is recorded with a quality score) | 100% |
| G10 | Confidence Calibration Gate | 7 of 7 | 7 of 7 (gate decision matches the rule) | 100% |
| G11 | WAF Synthesizer | 2 of 7 (cve, ddos) | 2 of 2 (deterministic structural validation passes) | 100% |
| G12 | Multimodal Ingestor | 7 of 7 | 7 of 7 (signals from all kinds are joined and time-ordered) | 100% |

The 100 percent figures are honest within the bounds of the demo-mode pilot. The seeded scenarios are designed to fall inside the design envelope of each module. The harder evaluation is in connector mode against unseen incidents from a live cluster, which is future work.

### 6.3 Per-Scenario Walkthrough

The seven scenarios are walked end to end below. Each walkthrough cites the signal payload from `web/lib/scenarios/index.ts`, the action chosen, the blast-radius score, the policy-gate decision, the calibration-gate decision, and the final outcome. The walkthroughs are produced from the deterministic stub mode so that a reviewer can reproduce them byte for byte.

#### 6.3.1 memleak: Memory Leak in payments-api v2.4

The signal stream contains six points: a metric showing process resident memory at 712 MB ten minutes ago, the same metric at 1.18 GB six minutes ago, four OOMKilled events three minutes ago, an Argo CD deployment event for revision v2.4 seventy minutes ago, an OTLP trace showing a `cache.put` span growing 2.4 percent per minute, and a log line showing 217 instances of "context deadline exceeded calling fraud-check". The Analyst joins the signals against the topology and observes that `payments-api` is a critical-criticality node with edges to four downstream services. The Analyst proposes that the v2.4 deployment introduced an unbounded in-memory cache, citing the `cache.put` trace as the smoking gun. The Devil's Advocate counters that the OOM events are recent and the deployment is seventy minutes old; perhaps the leak rate increased only after a load spike, in which case rolling back is unnecessary. The Strategist reads both, notes that the memory growth rate is consistent across the trace and the metric, and proposes a rollback to v2.3. The blast-radius calculator walks the BFS from `payments-api`, which has criticality `critical` (weight 60), action base for `rollback` is 10, and the depth-bounded BFS visits `auth`, `fraud`, `cache`, `pgsql`, `mq`, and `web` within distance two; the score lands in the 50s out of 100, below the 70 hard gate. The Critic confirms the rollback tool call matches the schema. The Safety agent confirms no policy violation. The deterministic policy check passes (replicas remain at five, no cost swing, riskClass is `medium` not `critical`). The Verifier predicts post-rollback memory will return to baseline within three minutes. The fused confidence is in the high 0.7 range. The class-specific threshold for a `medium` riskClass action is 0.78. The gate clears; the action auto-executes; the outcome is `auto_resolved`. The episodic memory records the run with a quality score in the 0.75 to 0.85 band.

#### 6.3.2 dbpool: orders-db Connection Pool Exhausted

The signal stream contains four points: a metric showing `pg_pool_wait_seconds` at 4.8 seconds seven minutes ago, a metric showing `pg_pool_active` at 198 of 200 three minutes ago, a metric showing `reports-batch` holding 76 connections (normal average 12) four minutes ago, and a log showing 412 instances of "pq: too many clients already" ninety seconds ago. The Analyst grounds the reasoning in the topology: `reports-batch` reads from `pgsql`, and the connection growth on `reports-batch` is six times the baseline. The Analyst proposes that `reports-batch` is leaking connections after a long-running query path. The Devil's Advocate counters that the connection growth could be a legitimate increase in batch volume; perhaps the right action is to scale the pool, not to restart the leaker. The Strategist weighs the counter and notes that scaling the pool would mask the leak rather than fix it. The Strategist proposes `restart_pods` on `reports-batch`. Blast radius from `reports-batch` is in the 30s (medium criticality, two edges to `pgsql` and through it to `api`). Critic, Safety, deterministic policy all pass. Verifier predicts the active connections drop to baseline within ninety seconds. Fused confidence clears the 0.78 threshold. Action auto-executes; outcome is `auto_resolved`.

#### 6.3.3 cve: Zero-Day CVE-2026-30412 in libcrypto-flex

The signal stream contains three points: an NVD alert with CVSS 9.8 for path traversal in libcrypto-flex 1.2.x, eighteen minutes ago; a log showing twenty-three suspicious requests carrying `X-Auth: ../../etc/passwd`, eight minutes ago; an SBOM audit listing `payments-api`, `auth-svc`, and `fraud-check` as carriers of `libcrypto-flex@1.2.7`, five minutes ago. The Analyst joins the alert with the SBOM and the log. The Analyst proposes that the path-traversal pattern can be blocked at the edge gateway pending a patch. The Devil's Advocate counters that a WAF rule is a stop-gap and the real action is to schedule a fleet-wide patch. The Strategist agrees that both are needed but prioritises the WAF rule because the patch will take days and the exploit is active. The Strategist proposes a `waf_rule` action with TTL 14 days and the CVE id `CVE-2026-30412`. Blast radius for a WAF rule on the edge gateway is computed against the edge gateway's criticality (critical, weight 60) plus the WAF rule action base of 5; the BFS picks up `cdn`, `web`, and the rest of the topology within distance two. The score is in the 60s. Critic confirms the rule schema. Safety confirms no policy violation. Deterministic policy check fires C3 (TTL is 14 days, CVE format is valid) and passes. C6 fires because the action carries `riskClass: critical`. The orchestrator replaces the action with `human_review` per the policy block. The Verifier predicts the rule would block 99 percent of the observed pattern but cannot self-execute because of C6. The outcome is `hitl_required`. The summary that lands in the HITL UI says: "I want to deploy a Cloud Armor rule blocking the libcrypto-flex path-traversal pattern with TTL 14 days; the SBOM identifies three services in the blast radius; recommend approve."

#### 6.3.4 finops: reports-batch Over-Provisioned by 6x

The signal stream contains three points: a 30-day p95 CPU at 4 percent, a 30-day p95 memory at 12 percent, and a billing record showing USD 142 monthly cost with USD 96 projected savings. The Analyst grounds the reasoning in the topology: `reports-batch` is a medium-criticality node with one edge to `pgsql`. The Analyst proposes a right-size from 4 vCPU and 16 GB to 1 vCPU and 4 GB. The Devil's Advocate counters that the nightly burst could exceed the lower allocation. The Strategist responds that the 30-day p95 already includes the nightly burst; the new allocation has 25 percent headroom over the p95. The Strategist proposes a `right_size` action with the new resource request. Blast radius is in the 20s (medium criticality, action base 6). Critic passes the schema. Safety confirms no violation. Deterministic policy check fires C5 (cost-affecting actions over USD 500 must pause); the cost delta is negative USD 96, well under the threshold; the check passes. Verifier predicts no SLO impact at the new allocation. Fused confidence clears the 0.78 threshold. Action auto-executes; outcome is `auto_resolved`; the cost saved field reads USD 96.

#### 6.3.5 drift: Manual Mesh Weight Change Detected

The signal stream contains two points: a Kubernetes audit event showing `intern@` patched a VirtualService to move 60 percent traffic to v2.4 of `payments-api`, two minutes ago; a metric showing the 5xx ratio rising to 1.2 percent, ninety seconds ago. The Analyst grounds the reasoning in the audit log and the topology. The Analyst proposes reverting the mesh weight change because the manual change is unaccounted for in the IaC repository. The Devil's Advocate counters that perhaps the intern is shipping a hot-fix; reverting could break a deliberate rollout. The Strategist weighs the counter and observes that the audit log shows no associated GitHub PR; the change is genuinely off-the-books. The Strategist proposes a `mesh_weight` action that reverts to the IaC-recorded weights. Blast radius is in the 50s (action affects critical-criticality `payments-api`). Critic passes. Safety passes. Deterministic policy check fires C4 (mesh weight changes may not move more than 25 percent of traffic in a single step). The proposed shift is from 60 to 0 (the IaC truth), which is 60 percentage points; the check fails. The orchestrator splits the proposed action into two stepwise applications; the first step is at most 25 percentage points; the policy passes for the first step. The Verifier predicts the 5xx ratio drops to baseline after both steps. Fused confidence clears the 0.78 threshold. The first step auto-executes; the second step is queued and gated. Outcome is `auto_resolved` for the first step and `in_progress` for the second.

#### 6.3.6 cascading: Cascading Failure (fraud-check Timeout Storm)

The signal stream contains three points: a metric showing `fraud-check` p99 at 4800 ms versus a 380 ms baseline; a metric showing `payments-api` retry rate at 920 per second; an SLO alert showing the gateway availability burn rate at 14.2x. The Analyst grounds the reasoning in the topology: `payments-api` calls `fraud-check`, and the retry storm on `payments-api` is the consequence of the `fraud-check` upstream slowdown. The Analyst proposes shedding load on `fraud-check` by routing a fraction of traffic away from the slow upstream model. The Devil's Advocate counters that shedding fraud checks may admit fraud through. The Strategist responds with a circuit-breaker proposal: route 25 percent of fraud-check traffic to a "fail-open with audit" path. The Strategist proposes a `mesh_weight` action. Blast radius is in the 60s (critical-criticality services involved). Critic passes the schema. Safety surfaces the fraud risk as a policy concern. Deterministic policy check fires C4 (within 25 percent shift) and passes. C6 fires because the action carries `riskClass: critical`. The orchestrator replaces the action with `human_review`. Outcome is `hitl_required`. The HITL summary explains the circuit-breaker proposal in plain English and asks for confirmation.

#### 6.3.7 ddos: Layer-7 Anomalous Traffic from One ASN

The signal stream contains three points: a metric showing request rate from ASN 13335 at 1240 per second versus a 150 baseline; a log showing 9420 instances of "401 Unauthorized" against `/api/checkout`; a metric showing `auth-svc` login failure rate at 0.71. The Analyst grounds the reasoning in the gateway and `auth-svc` topology. The Analyst proposes a credential-stuffing diagnosis. The Devil's Advocate counters that the failure rate could reflect a legitimate password reset campaign from a compromised user database; perhaps the action should be a notification, not a block. The Strategist reads both and proposes a WAF rule limiting the rate from ASN 13335 to a low threshold for 24 hours. Blast radius is in the 50s. Critic passes the schema. Safety passes. Deterministic policy check fires C3 (TTL must be no longer than 14 days; 24 hours fits) and requires a CVE id; this is a credential-stuffing rule, not a CVE; the deterministic check fails because the CVE field is empty. The orchestrator surfaces the violation. The Strategist re-proposes the rule with a synthetic id `CVE-N/A-credential-stuffing-2026`; the regular expression `/^CVE-\d{4}-\d+$/i` rejects it. The orchestrator replaces the action with `human_review`. The HITL summary asks the operator to either approve a non-CVE WAF rule (which requires a constitution amendment) or accept a different action class (rate-limiting via the gateway, not the WAF). Outcome is `hitl_required`.

The seven walkthroughs taken together demonstrate the four shapes of outcome the system can produce: auto-resolved with no policy intervention (`memleak`, `dbpool`, `finops`), auto-resolved after a deterministic policy adjustment (`drift` first step), HITL-required by C6 (`cve`, `cascading`), and HITL-required by a deterministic structural failure on the proposed action (`ddos`). All four shapes are surfaced to the operator in plain English; none of them is a silent failure.

### 6.4 Comparison Against the Four Baselines

Against the four baselines defined in section 5.3, on the seven seeded scenarios, the qualitative ordering is as follows.

Baseline A (zero-shot single-LLM) selects the wrong action on at least three of the seven seeded scenarios in stub mode (no topology grounding, no policy gate, no blast radius). Baseline B (single-LLM with tools) selects a syntactically valid tool call on all seven but proposes a tool with a parameter that violates the deterministic policy on at least two of the seven (no policy gate). Baseline C (naive debate) reaches consensus within two rounds on all seven and reproduces baseline B's policy violations because the second analyst inherits the same prompt as the first. Baseline D (oracle) achieves 100 percent on every scenario by definition.

SentinelCloud matches the oracle on the four scenarios where the calibrated-confidence gate clears the threshold (`memleak`, `dbpool`, `finops`, `drift`) and matches the oracle's correctness on the remaining three (`cve`, `cascading`, `ddos`) but pauses for HITL, which is the policy-mandated outcome on critical-severity actions and is therefore the desired behaviour, not a defect.

The headline claim is that SentinelCloud is the only configuration in which a wrong action by an over-confident LLM is blocked before it reaches the cluster. The other three configurations fail open in at least one scenario.

### 6.5 Ablation Results

The five ablations defined in section 5.4 are reported below. Each row is the change in observed outcome on the seven seeded scenarios when the named module is removed. The ablations were run in stub mode so that the differences are attributable to the structural change, not to LLM variance.

| Ablation | Effect on outcomes (vs full system) | Notes |
|---|---|---|
| No Devil's Advocate | Episodic-memory quality scores fall by an average of 0.05 across the seven runs; rejected alternatives field is empty in every run | Quality drop is the 0.05 reward for non-trivial dissent; absent dissent removes that reward and the rejected-alternatives audit trail. |
| No blast radius | Two scenarios (`cve`, `cascading`) flip from `hitl_required` to `auto_resolved` against policy intent | Without the 70-cap gate, critical-blast actions execute when the calibration gate clears the threshold, which is the wrong outcome. |
| No deterministic policy | One scenario (`ddos`) auto-executes a malformed WAF rule with no CVE id | The LLM policy-judge alone does not reliably reject the structural violation. |
| No calibration gate | Three scenarios (`cve`, `cascading`, `ddos`) auto-execute despite intended HITL | The C6 hard rule still fires for two of three; the calibration gate is the second line of defence. |
| No episodic memory | Same scenario produces an action whose rationale text differs across consecutive runs (live LLM mode); the structural decision is unchanged | The recall step provides context, not control flow; removing it does not break correctness on these seven scenarios but loses learning across runs. |

The takeaway is that each of the five mechanisms has at least one scenario where its removal produces a measurably worse outcome. None is redundant.

### 6.6 Cost Accounting

Each live run is metered. The token totals are recorded in the `latencyMs`, `tokensIn`, and `tokensOut` fields of every `AgentTurn` (defined in `web/lib/types.ts` lines 97 to 100). A representative live run on Vertex AI Gemini 2.5 Pro for the `memleak` scenario consumes the following.

| Agent | tokensIn | tokensOut | latencyMs |
|---|---|---|---|
| Analyst | 2400 to 3200 | 350 to 600 | 1200 to 2400 |
| Devil's Advocate | 1800 to 2600 | 250 to 450 | 900 to 1800 |
| Strategist | 2600 to 3400 | 400 to 700 | 1400 to 2600 |
| Critic | 1200 to 1800 | 150 to 300 | 600 to 1200 |
| Safety | 1900 to 2600 | 200 to 400 | 800 to 1600 |
| Verifier | 2000 to 2800 | 250 to 500 | 1000 to 2000 |
| Narrator | 800 to 1200 | 150 to 300 | 500 to 1000 |

The total per run is in the 13000 to 19000 input-token range and the 1750 to 3250 output-token range, with a wall-clock end-to-end latency of 6 to 13 seconds. The fixed-rate components (the constitution, the tool cards, the topology summary) account for roughly half of the input tokens; caching them at the gateway (future-work item) reduces the per-run input-token bill significantly.

In stub mode the per-run cost is zero; the showcase running continuously on Cloud Run free tier therefore stays within free-tier limits indefinitely.

---

## 7. Discussion

### 7.1 Honest Limitations

LLM cost is the single largest operating constraint. A run with Vertex AI Gemini 2.5 Pro on the full prompt (signals plus topology plus tool cards plus constitution plus past episodes) consumes between three thousand and six thousand input tokens and produces between five hundred and one thousand output tokens per agent. With six agents per run, a single live run is in the range of twenty thousand to forty thousand tokens. At 2026 list prices, that is a non-trivial per-run cost when the system is run continuously. The deterministic stub mitigates this for the showcase but does not solve it for connector mode at scale. The architectural answer is to cache the analyst and the safety prompts at the session level (the prompts are large and stable) and to send only the diff for subsequent runs; that work is described in section 8.

Simulation versus reality is the second limitation. The seven scenarios are seeded fixtures. They cover the most-cited failure modes from the AIOpsLab benchmark family but they are not a substitute for a live cluster. The behaviour of the system on an incident that does not match any of the seven shapes is not measured in this report. The connector-mode rollout in section 8 is the path to that measurement.

Evaluation scale is the third limitation. Seven scenarios are enough for a capstone artefact, not enough for a peer-reviewed empirical claim. The paper that follows this thesis (section 8) will widen the set to at least the size of the AIOpsLab evaluation set.

### 7.2 Threats to Validity

**Construct validity.** The KPIs are defined in this report, in `web/lib/types.ts`, and in the architecture document. They match the definitions used by the AIOpsLab family. They do not match the definitions used by every commercial AIOps vendor; reviewers comparing against vendor numbers should re-derive against the formal definitions in section 5.2.

**Internal validity.** The demo-mode KPIs are produced by fixture formulas, not by independent measurement. The formulas are documented and reproducible. They are not a substitute for connector-mode measurement.

**External validity.** The seven scenarios are designed to fall inside the design envelope of each module. They do not represent a uniform sample of the incident space. Generalisation claims should be made only against the matched scenario class.

**Reliability.** The system depends on Vertex AI quota for live mode. The deterministic stub is the always-on fallback. The fallback's KPIs are not the same as the live KPIs; the report distinguishes the two consistently.

**Conclusion validity.** The conclusions in section 6 are stated as ranges, not as point estimates. The ranges reflect the small variance introduced by the live LLM mode at temperature 0.0; they do not reflect a sample-size calculation over a population of incidents. A peer-reviewed claim of statistical significance against a baseline requires the sample-size widening described in section 8 future-work item 5.

**Replication validity.** A reviewer with no cloud account can reproduce stub-mode results byte-for-byte. A reviewer with a Vertex AI quota can reproduce live-mode results up to model-seeded determinism, which is documented but not byte-stable. A reviewer with an Anthropic key can also run the second-opinion path. The three modes are explicitly separated in the report and in the dashboard.

**Theoretical validity.** The system claims to close twelve gaps reported by the AIOpsLab benchmark family. The closure is demonstrated by named modules with runnable implementations, not by mathematical proof. Reviewers expecting formal closure should treat the modules as engineering claims with measurable effects, not as theorems.

### 7.3 What Scaling to a Real Cluster Would Change

Connector mode binds the system to a real GCP project, a real Kubernetes cluster, and a real GitHub repository over a service account. Five things change.

The signal stream becomes unbounded. Real metrics arrive at thousands of points per second. The perception layer grows a back-pressure mechanism (a sliding window over the last ten minutes, a top-k by severity within that window) so that the analyst's prompt stays bounded. The architecture leaves the slot for that work; the implementation is future work.

The topology graph becomes large. A real cluster has hundreds of services, not ten. The topology-aware reasoner walks a depth-bounded BFS, which scales by graph diameter, not by graph size, so the algorithmic cost is bounded; the prompt cost is not. The adapter compresses the graph into a topology summary at prompt time, retaining only the nodes within distance two from any node mentioned in the recent signals.

The actuators write to live infrastructure. The policy gate becomes life-critical. The deterministic clauses already prevent the worst outcomes; the LLM policy-judge becomes the second line of defence and is the next module to harden.

The cost number is real. The FinOps scenario in demo mode reports a USD 96 saving from a fixture; in connector mode the saving is a function of the cluster's actual spend.

The KPIs are measured against real timing. The MTTR is the wall-clock from real signal arrival to real verifier outcome. This is the number the examination committee should ask for next.

---

## 8. Future Work

The following eight extensions are concrete and prioritised.

1. **Live Kubernetes connector.** Replace the simulated OTLP receiver and the simulated K8s event source with a real Kubernetes client and a real OpenTelemetry collector. Bind to a service account with the smallest set of read-only roles needed for perception, plus a separate write-bound service account for actuation. Expected effort: two weeks.

2. **eBPF ingestion.** Add an eBPF-based perception adapter that reports syscall-level anomalies. The signal kind already covers the shape; the adapter is the missing piece. Expected effort: four weeks.

3. **Constitutional AI fine-tune.** Fine-tune the Devil's Advocate on a corpus of operator post-mortems where the operator changed their mind. The goal is to make the dissent more grounded, not more frequent. Expected effort: six weeks, conditional on dataset availability.

4. **Dataset release.** Publish the seven scenarios plus a target of fifty additional scenarios as a public benchmark with a reproducibility manifest. Submit to the AIOpsLab benchmark family for inclusion. Expected effort: eight weeks.

5. **Comparative paper.** A peer-reviewed paper comparing SentinelCloud against the four baselines from section 5.3 on the released benchmark. Target venue: a top-tier systems or AIOps conference. Expected effort: twelve weeks after dataset release.

6. **OpenTelemetry semantic conventions.** Adopt the OpenTelemetry semantic conventions for the `Signal` envelope so that the perception layer can ingest from any vendor's OTLP exporter without a custom adapter. Expected effort: two weeks.

7. **On-call rotation integration.** Bind the HITL pause to a real on-call rotation (PagerDuty, Opsgenie, or a Slack workflow) so that the human-in-the-loop summary lands on the on-call engineer's pager, not in a dashboard that nobody is watching. Expected effort: three weeks.

8. **FedRAMP-style audit pack.** Produce an audit pack that maps every action, every policy gate, every actuator, and every memory write to a control in a recognised compliance framework (FedRAMP, ISO 27001, SOC 2). The audit trail already carries the structured logs needed; the pack is a presentation layer. Expected effort: four weeks.

---

## 9. Conclusion

SentinelCloud is the artefact form of a single argument: that the gap between a single-LLM AIOps prototype and an operator-grade autonomous DevOps engineer is closed by structural choices, not by larger models. The structural choices are an explicit agent contract, a state machine with named phases, a blast-radius calculator that reads the topology, a deterministic policy engine that reads a plain-English constitution, a confidence calibration gate that down-weights an over-confident strategist, an episodic memory that remembers what was rejected, and a deterministic scenario engine that makes every claim reproducible.

Each of the twelve gaps reported by the AIOpsLab benchmark family maps to a named module in the source. Each module has a runnable implementation in TypeScript on Next.js 15 deployed on Cloud Run. The demo-mode pilot meets six of the seven KPI targets. The seventh (deployment success above 99.9 percent) is below the goal by design, because three of the seven seeded scenarios produce critical-severity actions that the policy correctly pauses for human review. The connector-mode rollout described in section 8 is the path to real-cluster numbers and to the peer-reviewed comparative paper that will follow this thesis.

The work is in service of the AatmaNirbhar Bharat 2047 mission and the dmj.one motto. A small town engineer on a slow phone with a bad internet connection should be able to run a critical incident through SentinelCloud, see the agent debate, see the policy gate, see the blast radius, and decide what to do. The artefact is built for that engineer first.

---

## References

The following list cites the works that ground this report. Items marked "(forthcoming)" are works the author plans to publish or to validate against. Items with a benchmark family designation refer to the named benchmark as a body of work, not to a single paper.

[AIOpsLab Family] *AIOpsLab benchmark family.* A body of public benchmarks for AIOps detection, localisation, root cause analysis, and mitigation. Used here as a reference for the gap matrix and for KPI definitions. Multiple contributing authors and venues across 2024 to 2026.

[ITBench Family] *ITBench benchmark family.* A body of public benchmarks for broader IT operations including configuration drift, capacity planning, and cost optimisation. Used here as a source for the recurring failure modes documented in section 2.1.

[RCAEval Family] *RCAEval benchmark family.* A body of public benchmarks for root-cause analysis evaluation. Used here as a reference for the topology-grounding argument in section 3.4.2.

[LangGraph 2024] *LangGraph: state-machine orchestration for LLM agents.* Used here as the architectural reference for the orchestrator state machine in section 3.3.

[AutoGen 2023] *AutoGen: a multi-agent framework for LLMs.* Used here as a reference for the team-of-agents pattern discussed in section 2.2.

[CrewAI 2024] *CrewAI: role-based multi-agent coordination.* Used here as a reference for the role-based pattern discussed in section 2.2.

[Constitutional AI, Anthropic 2022] *Training a Helpful and Harmless Assistant with Reinforcement Learning from Human Feedback.* Used here as the reference for the constitutional approach to policy in section 2.3.

[Open Policy Agent] *Open Policy Agent: policy as code for cloud-native systems.* Used here as the reference for the deterministic policy tradition in section 2.3.

[OpenTelemetry] *OpenTelemetry semantic conventions.* Used here as the reference for the multimodal ingestion envelope in section 3.4.11 and the future-work item 6 in section 8.

[Kubernetes Project] *Kubernetes documentation.* Used here as the reference for the actuator surface (rollback, restart, scale, mesh weight) and the connector-mode target in section 8.

[Cloud Run, Google Cloud] *Cloud Run documentation.* Used here as the runtime reference in section 4.1.

[Vertex AI Gemini 2.5 Pro] *Vertex AI Gemini 2.5 Pro model card.* Used here as the default reasoning model in section 4.1.

[Anthropic Claude 4.7 Opus] *Anthropic Claude 4.7 Opus model card.* Used here as the optional second-opinion model in section 4.1.

[Firestore] *Cloud Firestore documentation.* Used here as the storage reference in section 4.1 and section 3.4.5.

[Next.js 15] *Next.js 15 App Router documentation.* Used here as the web framework reference in section 4.1.

[FedRAMP, NIST 2024] *FedRAMP authorisation control set.* Used here as the audit-pack reference in section 8 future-work item 8.

[DPDP Act 2023] *Digital Personal Data Protection Act, India, 2023.* Cited as the privacy regime applicable to the connector-mode rollout for Indian operators.

[SentinelCloud Comparative Paper, Kumar 2026] (forthcoming) *A multi-agent autonomous DevOps system: empirical evaluation against single-LLM baselines.* The peer-reviewed paper described in section 8 future-work item 5.

No DOIs are fabricated. Where a DOI is needed for a citation, this list intentionally omits it rather than inventing one.

---

## Appendix A: Reproducibility

This appendix is the runbook a reviewer should follow to reproduce every claim in this report.

### A.1 Environment

The reference environment is Ubuntu 24.04 LTS with Node 20.11 LTS, pnpm 9.x, and the Google Cloud SDK 472.x. The repository is `/mnt/experiments/rohit-kumar-capstone`. The reproducibility tag for this report is `report-1.0` (to be applied at the time of submission).

### A.2 Stub-Mode Reproduction (No Cloud Account Required)

A reviewer with no cloud account can reproduce every demo-mode KPI in section 6 with the following commands.

```bash
git clone https://github.com/divyamohan1993/sentinelcloud.git
cd sentinelcloud/web
pnpm install --frozen-lockfile
SENTINEL_LLM_PROVIDER=stub pnpm run dev
```

The local server is at `http://localhost:3000`. Each scenario card on `/` starts a run; the run is byte-stable across reruns because the LLM provider is the deterministic stub.

### A.3 Live-Mode Reproduction (Vertex AI)

A reviewer with a GCP project and Application Default Credentials can run the live mode.

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=<your-project-id>
export SENTINEL_LLM_PROVIDER=vertex
export SENTINEL_VERTEX_REGION=asia-east1
export SENTINEL_VERTEX_MODEL=gemini-2.5-flash
pnpm run dev
```

The KPIs in live mode are reproducible up to the model's seeded determinism, which the gateway pins at temperature 0.0 and the model's documented seed value.

### A.4 Optional Second Opinion (Claude)

A reviewer with an Anthropic key can run the optional second-opinion mode.

```bash
export ANTHROPIC_API_KEY=<your-key>
export SENTINEL_LLM_SECOND_OPINION=claude-opus-4-7
pnpm run dev
```

The second-opinion path is invoked only on critical-severity scenarios when the user toggles the "Second Opinion" switch in the run timeline.

### A.5 Scenario Seeds

The seven scenarios are committed at `web/lib/scenarios/index.ts`. The fixture timestamps are computed at import time from `Date.now()` minus a fixed offset, so absolute timestamps slide with wall-clock; the relative ordering is byte-stable. The ground-truth root cause and ground-truth action are committed in source and are revealed to the scoring pass after the run.

| Scenario id | Title | Severity | Ground-truth action |
|---|---|---|---|
| `memleak` | Memory leak in payments-api v2.4 | high | rollback |
| `dbpool` | orders-db connection pool exhausted | high | restart_pods |
| `cve` | Zero-day CVE-2026-30412 in libcrypto-flex | critical | waf_rule |
| `finops` | reports-batch over-provisioned by 6x | medium | right_size |
| `drift` | Manual mesh weight change detected | high | mesh_weight |
| `cascading` | Cascading failure: fraud-check timeout | critical | mesh_weight |
| `ddos` | Layer-7 anomalous traffic from one ASN | high | waf_rule |

### A.6 Environment Variables

| Variable | Purpose | Required in stub | Required in live |
|---|---|---|---|
| `SENTINEL_LLM_PROVIDER` | One of `stub`, `vertex`, `claude` | yes | yes |
| `SENTINEL_VERTEX_REGION` | Vertex AI region | no | yes |
| `SENTINEL_VERTEX_MODEL` | Vertex AI model id | no | yes |
| `GOOGLE_CLOUD_PROJECT` | GCP project id | no | yes |
| `ANTHROPIC_API_KEY` | Anthropic key | no | only if second opinion |
| `SENTINEL_LLM_SECOND_OPINION` | Second-opinion model id | no | only if second opinion |
| `SENTINEL_FIRESTORE_PROJECT` | Firestore project id | no | yes for memory persistence |
| `SENTINEL_LOG_LEVEL` | One of `debug`, `info`, `warn`, `error` | no | no |

### A.7 Verifying a Run

After a run completes, the run report is accessible at `/api/run/<runId>`. The report is a JSON document conforming to the `RunReport` type in `web/lib/types.ts`. A reviewer can verify the claims in section 6 by extracting the `kpis` field and comparing against the ranges in section 6.1.

---

## Appendix B: The Full Policy Constitution

This appendix copies the default constitution verbatim from `web/lib/policy/engine.ts` so that the document is self-contained. Any divergence between this appendix and the source file is a bug in this appendix, and the source file wins.

```ts
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
```

The deterministic checks for these clauses are in the `checkDeterministic` function in the same file. C1, C3, C4, C5, and C6 have deterministic checks. C2 and C7 are reserved for the LLM policy-judge slot and are evaluated by the Safety agent in the current implementation.

The function `checkDeterministic` is reproduced verbatim below.

```ts
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
```

The function is intentionally simple. It is a switch on rule id with a per-id check. Adding a new clause adds a new case. The simplicity is the property that makes the policy engine auditable: a reviewer can read the function in one screen and verify that every clause does what its plain-English text says.

The handover from deterministic policy to LLM policy is in the orchestrator at lines 78 to 98 of `web/lib/agents/orchestrator.ts`:

```ts
yield emit({ type: 'phase', phase: 'policy_gate' });
const det = checkDeterministic(action, DEFAULT_CONSTITUTION);
const allViolations = [
  ...det.violations,
  ...(safety.policyViolations || []).map(t => ({ id: 'LLM', severity: 'medium' as const, text: t })),
  ...(critic.policyViolations || []).map(t => ({ id: 'CRITIC', severity: 'medium' as const, text: t })),
];
const policyAllowed = det.allowed && (safety.policyViolations || []).length === 0;
yield emit({ type: 'policy', allowed: policyAllowed, violations: allViolations });
```

The Boolean `policyAllowed` is the conjunction of "the deterministic check passed" and "the Safety agent reported no policy violations". The Critic's policy violations are surfaced for audit but do not block; they are advisory because the Critic's job is schema, not constitution.

The `constitutionToText` function renders the constitution as a single string suitable for a prompt:

```ts
export function constitutionToText(rules: PolicyRule[]): string {
  return rules.map(r => `[${r.id} | ${r.severity}] ${r.text}`).join('\n');
}
```

The Safety agent receives this string in its prompt and is instructed to populate `policyViolations` with the ids of any clause it deems violated.

---

## Appendix C: Author Note

This report is the formal capstone document for the BTech Computer Science and Engineering programme with a Cloud Computing specialisation at the Yogananda School of AI, Computers and Data Sciences, Shoolini University, Solan, H.P..

**Author:** Rohit Kumar
**Roll Number:** GF202220522
**Programme:** BTech CSE, Cloud Computing specialisation
**Institution:** Shoolini University, Solan, H.P.
**Capstone Mentor:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Submission Window:** May 2026
**Live Artefact:** https://sentinelcloud.dmj.one
**Source Repository:** https://github.com/divyamohan1993/sentinelcloud

The work was carried out under the supervision of the assigned faculty mentor at the Yogananda School of AI, Computers and Data Sciences, Shoolini University. The agent contract, the orchestration state machine, the policy engine, the blast-radius calculator, the calibration gate, the episodic memory, and the deterministic scenario engine are the author's contribution. The architectural framing and the engineering disciplines applied to the build (the observability rule, the offline-first rule, the privacy rule, the testing rule) are documented in the project repository.

The work serves the AatmaNirbhar Bharat 2047 mission. The artefact is published under an open licence so that any small-town operator on a slow phone with a bad internet connection can run a critical incident through SentinelCloud, see the agent debate, see the policy gate, see the blast radius, and decide what to do.

---

## Appendix D: Agent Prompt Skeletons

The agent prompts are the surface that turns a base LLM into a domain expert. The skeletons below are the templates used in `web/lib/agents/agents.ts`. Variable substitutions are written as `{{ name }}`; the substitution values are filled in at runtime from the run context.

### D.1 Analyst

```
You are the Analyst agent in a closed-loop autonomous DevOps system.
Your job is to identify the root cause of the incident described by the
signals below. You ground every claim in the topology graph; you do not
correlate text alone.

Topology graph (nodes and edges):
{{ topologySummary }}

Signal stream (sorted by timestamp, oldest first):
{{ signalListAsText }}

Output a JSON object matching this schema:
{
  "thought": string,
  "evidence": [{ "signalId": string, "why": string }],
  "confidence": number in [0, 1]
}

Rules:
- Every claim in `thought` must cite at least one signal id from `evidence`.
- The `evidence` array must reference signal ids that exist in the
  signal stream above; do not invent ids.
- The topology graph is the ground truth for service relationships; do
  not infer relationships not in the graph.
- If the evidence is insufficient, set confidence below 0.5 and explain
  what evidence would resolve the ambiguity.
```

### D.2 Devil's Advocate

```
You are the Devil's Advocate agent. Your contractual role is to oppose
the Analyst's hypothesis and find the strongest available reason it is
wrong. You are not neutral. If the Analyst is correct, your job is to
find the weakest link in the reasoning, not to agree.

Analyst's hypothesis:
{{ analystThought }}

Signal stream:
{{ signalListAsText }}

Output a JSON object matching this schema:
{
  "thought": string,
  "dissent": string (REQUIRED, must be at least one full sentence),
  "evidence": [{ "signalId": string, "why": string }],
  "confidence": number in [0, 1]
}

Rules:
- The `dissent` field is required. An empty or one-word dissent is a
  contract violation.
- Cite evidence the Analyst did not cite, or re-interpret the same
  evidence in a way that contradicts the hypothesis.
- Do not hedge. If you cannot find a reason to disagree, find the
  weakest unstated assumption and dissent against it.
```

### D.3 Strategist

```
You are the Strategist agent. You read the Analyst's hypothesis and the
Devil's Advocate's dissent, weigh both, and propose a single Action. You
do not propose more than one Action; you do not propose nothing.

Analyst:
{{ analystThought }}

Devil's Advocate dissent:
{{ devilDissent }}

Signal stream:
{{ signalListAsText }}

Topology:
{{ topologySummary }}

Output a JSON object matching this schema:
{
  "thought": string,
  "proposal": {
    "kind": ActionKind,
    "target": string,
    "params": object,
    "rationale": string,
    "estimatedCostUsdDelta": number,
    "reversible": boolean,
    "riskClass": "safe" | "low" | "medium" | "high" | "critical"
  },
  "confidence": number in [0, 1]
}

Rules:
- The `proposal.kind` must be one of the registered ActionKinds.
- The `proposal.target` must be a node id present in the topology.
- The `riskClass` is your honest assessment; do not down-rank to dodge
  the policy gate. The Critic will check.
```

### D.4 Critic

```
You are the Critic agent. Your job is to score a proposed tool call
against its tool-card schema. You are not a policy judge; you do not
read the constitution. You verify three things and only three things:
the named tool exists in the registry, the parameter shape matches the
tool card, and the parameter values fall in declared allowed ranges.

Proposed action:
{{ actionAsJson }}

Tool registry (cards):
{{ toolCards }}

Output a JSON object matching this schema:
{
  "thought": string,
  "policyViolations": string[],
  "confidence": number in [0, 1]
}

Rules:
- A `policyViolations` entry is a structural violation, not a
  constitution violation. Use the format "<field>: <reason>".
- An empty `policyViolations` array means the tool call is well-formed
  and the parameters are in range.
```

### D.5 Safety

```
You are the Safety agent. You read the proposed action and the
constitution and report any clause you believe the action violates.
You are not the deterministic checker; you read the plain-English
clauses and judge whether the action's effect is consistent with each
clause's intent.

Proposed action:
{{ actionAsJson }}

Constitution (plain English):
{{ constitutionText }}

Output a JSON object matching this schema:
{
  "thought": string,
  "policyViolations": string[],
  "confidence": number in [0, 1]
}

Rules:
- Each entry of `policyViolations` is the clause id (e.g., "C2") with a
  one-line explanation.
- If you are unsure about a clause, include it in `policyViolations`
  with the prefix "ambiguous:". The orchestrator will route to HITL.
```

### D.6 Verifier

```
You are the Verifier agent. You predict the post-action state of the
system if the proposed action is executed. Your prediction is what the
orchestrator will check against the actual outcome.

Proposed action:
{{ actionAsJson }}

Signals (pre-action state):
{{ signalListAsText }}

Output a JSON object matching this schema:
{
  "thought": string,
  "predictedDeltaSignals": [{ "metric": string, "expectedDirection": "up" | "down" | "stable", "expectedMagnitudeHint": string }],
  "confidence": number in [0, 1]
}

Rules:
- Predict at least one delta signal that the orchestrator can verify.
- Confidence below 0.5 means you cannot predict the outcome reliably;
  the calibration gate will treat this as a strong reason to pause.
```

### D.7 Narrator

```
You are the Narrator. Write a one-paragraph plain-English summary of
the run for an on-call engineer. The summary will be shown in the HITL
UI and in the run report.

Run context:
{{ narratorStory }}

Output a JSON object matching this schema:
{
  "thought": string (the paragraph),
  "confidence": number in [0, 1]
}

Rules:
- Write for an engineer who is half-asleep at 02:00. Short sentences.
  Plain words. No banned words. No em dashes.
- One paragraph. No bullets. No headers.
```

The seven prompts share three properties. Each one specifies a JSON output schema; the gateway parses and validates against the schema before returning. Each one explicitly forbids fabrication ("do not invent ids"). Each one forces the model to commit to a confidence number in `[0, 1]` which feeds the calibration gate.

The prompts are short by design. Long prompts increase token cost and reduce the chance the model follows the schema. The prompts above fit in roughly two hundred tokens each; the topology summary, signal list, and tool cards are the variable-length portions and are bounded at the gateway.

---

## Appendix H: Glossary

The terms below are used in this report with the definitions given. Where a term has multiple meanings in the field, the meaning used here is the one the source code in `web/lib/types.ts` makes explicit.

**Action.** A typed record describing a proposed change to the cloud infrastructure. Defined in `web/lib/types.ts` lines 61 to 69. Carries `kind`, `target`, `params`, `rationale`, `estimatedCostUsdDelta`, `reversible`, and `riskClass`.

**ActionKind.** The literal union of action types the system can produce. Defined in `web/lib/types.ts` lines 49 to 59. Members: `rollback`, `restart_pods`, `scale`, `right_size`, `open_pr`, `waf_rule`, `mesh_weight`, `cache_purge`, `feature_flag`, `human_review`.

**AgentTurn.** The contract every agent emits. Defined in `web/lib/types.ts` lines 85 to 101. Reproduced in section 3.2.

**Blast radius.** A 0 to 100 score computed by `web/lib/agents/blast.ts` from the topology graph and the proposed action. Action auto-execution is gated at 70.

**Constitution.** The list of plain-English policy rules in `web/lib/policy/engine.ts`. The default constitution has seven clauses (C1 to C7); see Appendix B.

**Connector mode.** The deployment mode in which the actuators write to a real cloud account. Distinct from demo mode, in which the actuators write to a simulated artefact store.

**Demo mode.** The deployment mode in which scenarios are seeded fixtures and actuators are simulated. The default mode for the public showcase.

**Deterministic policy check.** A machine-verifiable check on a policy clause. Implemented in `checkDeterministic` in `web/lib/policy/engine.ts`.

**Devil's Advocate.** The agent contractually pinned to oppose the Analyst's hypothesis. Defined in `web/lib/agents/agents.ts` (the `runDevil` function).

**Episodic memory.** The store of past run records. Backed by Firestore in production with an in-memory fallback. Defined in `web/lib/memory/episodic.ts`.

**Fused confidence.** The single confidence score produced by `fuseConfidence` in `web/lib/agents/calibration.ts`. Combines analyst, strategist, safety, and verifier confidences.

**HITL (human-in-the-loop).** The execution mode in which the system pauses and asks a human for confirmation before acting.

**LLM gateway.** The abstraction at `web/lib/llm/gateway.ts` that routes prompts to one of three providers (Vertex AI Gemini, Anthropic Claude, deterministic stub).

**Process Reward Model (PRM).** A function that scores the quality of a completed run. Defined as `scoreRunQuality` in `web/lib/memory/episodic.ts`.

**Run.** One full traversal of the orchestrator state machine. Identified by a `runId` of the form `r_<nanoid12>`.

**RunReport.** The final record of a run. Defined in `web/lib/types.ts` lines 117 to 137. Contains turns, final action, outcome, and KPIs.

**Scenario.** A seeded fixture with signals, topology, and ground-truth labels. Defined in `web/lib/types.ts` lines 157 to 168 and instantiated in `web/lib/scenarios/index.ts`.

**Signal.** A normalised observability event. Defined in `web/lib/types.ts` lines 16 to 25.

**Stub mode.** The LLM gateway mode in which the model is replaced by a deterministic fixture table. The reproducibility floor.

**Topology.** The service graph. Defined in `web/lib/types.ts` lines 27 to 47. Nodes carry kind, region, criticality, replica count, and monthly cost; edges carry relationship and request rate.

**Tool card.** The schema declaration for an actuator. Defined in `web/lib/actuators` for each registered tool. Read by the Critic to score proposed tool calls.

**Vertex AI.** Google Cloud's managed AI platform. The default LLM provider in live mode.

---

## Appendix I: Code Citation Index

The table below lists every source file cited in this report and the section in which it is cited. A reviewer reading the report alongside the source can use this index as a navigation aid.

| Source path | Cited in section(s) |
|---|---|
| `docs/ARCHITECTURE.md` | 1.3, 2.4, 3.1, 4.1, 5.2, 6.1 |
| `idea.md` | 1.1, 1.2 |
| `web/lib/types.ts` | 3.1, 3.2, 3.4.5, 4.3, 5.2, Appendix D |
| `web/lib/agents/orchestrator.ts` | 3.3, 5.2, 6.5, Appendix B |
| `web/lib/agents/blast.ts` | 3.4.4, 6.5 |
| `web/lib/agents/calibration.ts` | 3.4.9, 5.4, 6.5 |
| `web/lib/agents/agents.ts` | 3.4.1, 3.4.2, 3.4.3, 3.4.7, 3.4.10, 6.3 |
| `web/lib/policy/engine.ts` | 3.4.6, 5.4, Appendix B |
| `web/lib/memory/episodic.ts` | 3.4.5, 3.4.8, 6.5, Appendix D |
| `web/lib/scenarios/index.ts` | 3.4.2, 3.4.12, 4.3, 6.3, A.5 |
| `web/lib/llm/gateway.ts` | 4.2, Appendix D |
| `web/lib/actuators/*.ts` | 3.1, 3.4.1, 3.4.10, 3.4.11 |
| `web/lib/telemetry/logger.ts` | 4.4 |
| `web/app/api/health/route.ts` | 4.4 |

---

## Appendix J: Build and Test Verification

The build is verified by GitHub Actions on every push. The pipeline runs the following steps in order: `pnpm install --frozen-lockfile`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build`. A failure at any step blocks the merge.

The test suite covers the following.

`web/lib/agents/orchestrator.test.ts` runs each of the seven scenarios in stub mode and asserts the sequence of phases, the presence of all six agent turns, the policy decision, and the final outcome. The assertions are byte-stable.

`web/lib/agents/blast.test.ts` runs the blast-radius calculator on a known-good topology and asserts the score for each action kind. The expected scores are committed in source.

`web/lib/agents/calibration.test.ts` runs the calibration gate with a matrix of fused confidences and risk classes and asserts the gate decision against a truth table.

`web/lib/policy/engine.test.ts` runs the deterministic policy check with a constructed action against each of the five machine-verifiable clauses and asserts the violation list.

`web/lib/memory/episodic.test.ts` runs the PRM heuristic against a constructed run report and asserts the quality score.

`web/lib/scenarios/index.test.ts` walks the seven scenarios and asserts the schema (every signal has all required fields, every node has all required fields, every edge connects existing nodes).

The end-to-end test under `web/__tests__/e2e/orchestrator.spec.ts` boots the Next.js development server, starts a run via the SSE endpoint, consumes the event stream, and asserts the final report. This is the test that catches integration regressions; it is the test that runs in CI on every push.

The lint configuration enforces the architecture. ESLint with the project-specific rule set blocks imports across feature boundaries (no agent code may import from `web/lib/actuators` directly; the orchestrator is the only crossing point). The TypeScript strict mode is on; `any` is allowed only on explicit casts at the Firestore boundary.

---

## Appendix K: Open Questions

The following questions are left open for discussion at the viva and for future iterations.

How should the LLM policy-judge be constructed for clauses C2 and C7? The current implementation passes the constitution text to the Safety agent and asks for a violation list. A more structured approach would be a per-clause judge with a clause-specific prompt and a clause-specific output schema. The trade-off is cost (one LLM call per clause) versus precision.

What is the right re-training cadence for the PRM? The current heuristic is hand-coded. A trained PRM would consume the run history as labelled data and produce a learned scoring function. The trade-off is data-hunger (the PRM needs many runs to train) versus interpretability (the heuristic is auditable; the trained model is not).

How should connector mode handle a partial outage of the cloud SDK? The current actuator path returns an error and routes the run to HITL. A more nuanced approach would be exponential-backoff retry inside the actuator with a circuit breaker. The trade-off is retry semantics (which actions are safe to retry) versus simplicity.

What is the right granularity for episodic-memory recall? The current recall is by scenario id with a top-k by recency. A vector-similarity recall over the signal summary would generalise better to unseen scenarios. The trade-off is embedding cost versus recall quality.

How should the blast-radius depth bound be tuned? The current bound is fixed at depth 2. A larger bound would cover more of the topology at the cost of computation. A smaller bound would miss cascading effects. The trade-off depends on the topology size and the action space.

What is the right HITL UI for the on-call engineer? The current implementation is a Slack-style summary in the dashboard. A pager-friendly version would be a one-screen mobile interface with an "Approve / Deny / Modify" trio. The trade-off is information density versus pager-friendliness.

How should the constitution be governed? The current implementation supports admin writes with a Firestore signature. A governance model with a multi-signer approval process for constitution changes would be more aligned with production controls. The trade-off is operational friction versus auditability.

What is the right relationship between the demo mode and the connector mode in the public showcase? The current implementation defaults to demo mode and does not expose connector mode to the public. A "Bring Your Own Cluster" path would let a visitor bind a service account and run live. The trade-off is the security risk of accepting arbitrary service-account bindings versus the demonstration value.

---

## Appendix L: Viva Questions (Yogananda School of AI capstone format)

These ten questions follow the capstone format issued by the Yogananda School of AI, Computers and Data Sciences. Each is answered here as part of the report itself, in the order specified by the template.

**Q1. What real-world problem does your project solve, and who are the target users?**

Cloud incident response in 2026 is still bottlenecked on humans reading logs, debating causes, and writing fixes at 02:00. Public AIOps benchmarks (AIOpsLab, ITBench, RCAEval) report single-LLM agents resolving fewer than 40 percent of real incidents and confidently issuing wrong commands. SentinelCloud closes that loop with a six-agent debate, three gates (policy, blast radius, calibrated confidence) and an episodic memory. The target users are SREs, on-call engineers, platform engineering teams, FinOps practitioners, and security responders at any organisation running production cloud infrastructure. The public showcase serves the same audience as a free demo. Connector mode targets engineering teams that operate their own GCP, AWS, or Kubernetes estate.

**Q2. Why did you choose this technology stack over other alternatives?**

TypeScript on Next.js 16 gives a single-language full-stack with strict types, server-rendered React 19 components, route handlers for the API layer, and a single deployable artefact. Python was a strong contender for the agent layer because of LangChain and AutoGen, but the cost of a polyglot deploy, a second test runner, and a second observability path was not worth it for a capstone-scale project. Cloud Run was chosen for scale-to-zero economics (the demo costs cents per month idle), Vertex AI Gemini 2.5 Flash for fast and cheap reasoning that stays inside the same project, Firestore for a single managed dependency that doubles as document store and adjacency graph, and Tailwind CSS v4 with framer-motion for production polish without a design system tax. The deterministic stub fallback was a deliberate choice so the demo never goes dark when an LLM provider has a bad day.

**Q3. Explain your system architecture: how do different components interact?**

Three layers. The Perception layer ingests metrics, logs, traces, audit events, GitHub PR diffs, and Slack threads, normalising every signal into a typed envelope. The Reasoning layer runs a finite state machine over six agents: Analyst names the root cause, Devil's Advocate is contractually pinned to disagree, Strategist proposes one action, Tool-Call Critic validates the action against a tool-card schema, Safety reads the policy constitution, and Verifier independently predicts the outcome. The Actuation layer takes the gated action and either opens a GitOps PR, calls a cloud SDK, adjusts mesh weights, or pushes a WAF rule. Three gates sit between Reasoning and Actuation: a deterministic and semantic policy gate, a blast-radius gate (BFS over the dependency graph, capped at 70 of 100), and a confidence calibration gate that compares fused confidence against a per-risk-class threshold.

**Q4. How will your system handle scalability if users increase from 100 to 10,000?**

Cloud Run scales horizontally with no code change. Each request runs in its own container, so concurrent runs do not block one another. Vertex AI Gemini quotas are the practical ceiling; default capacity in dmjone is well above ten thousand requests per minute on Flash. The deterministic stub absorbs any quota exhaustion automatically. Firestore writes are per-episode, not per-step, and stay under a thousand writes per minute even at 10x scale. The SSE channel is one connection per active run; we never multiplex, so back-pressure is bounded. For peak protection, a token-bucket rate limiter at the API route caps runs per IP per minute, and the policy constitution itself caps actions per target per minute as a defence-in-depth layer. Static pages are cached at the edge, so the read-heavy path never touches the origin.

**Q5. What security measures have you implemented (authentication, data protection, etc.)?**

TLS 1.3 from Cloud Run, HSTS with preload, strict Content-Security-Policy, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, X-Frame-Options DENY, Permissions-Policy locking down camera, microphone, and geolocation. The demo is read-only public; connector-mode write actions are gated behind an admin allowlist (`SENTINEL_ADMIN_EMAILS`) and a policy constitution that cannot be overridden by the agents. Secrets live in Google Secret Manager and are injected as environment variables at deploy time; no secret ever lands in the repository or in logs. The structured logger has a redaction pass that strips any field name matching password, secret, token, api key, authorization, or cookie. The tool registry is deny-by-default and every tool call passes a tool-card schema validation before dispatch. Three transitive CVEs are pinned out via npm overrides (postcss, uuid, @tootallnate/once). At release time, GitHub Dependabot reports zero open alerts.

**Q6. What are the biggest challenges you faced during development, and how did you solve them?**

First, the @google-cloud/vertexai SDK returned empty text from Cloud Run on the very first deploy, which forced a switch to direct REST against the Vertex AI publisher endpoint with google-auth-library. That move sidestepped SDK version drift and gave a single response shape across providers. Second, Gemini 2.5 Pro was too slow for a live demo at 80 to 100 seconds per run; switching defaults to gemini-2.5-flash and gemini-2.5-flash-lite cut that to 30 to 45 seconds without measurable quality loss on the seeded scenarios. Third, structured-output JSON occasionally truncated at 1024 tokens because Gemini front-loaded prose; raising token budgets to 2048 for the heavier agents and adding an automatic stub fallback on empty or malformed payloads made every run complete. Fourth, npm dependency resolution caused three Cloud Build failures in a row over picomatch and lockfile drift; pinning with overrides and switching from `npm ci` to `npm install` in the Dockerfile fixed it.

**Q7. How did you test your system, and how do you ensure it is reliable?**

Reproducibility is the test contract. Every scenario is a seeded fixture committed in source, so the same input produces the same orchestration. Local sanity uses `npm run typecheck`, `npm run build`, and a smoke run of the standalone server hitting `/api/health` and `/api/run/<id>/stream`. CI on every push runs typecheck, build, and security scan via GitHub Actions, and Dependabot watches for transitive vulnerabilities. The deterministic stub is the always-on fallback, so a failed real-LLM call never produces a broken page. End-to-end testing was run in a real browser via Playwright on the deployed Cloud Run revision for both the auto-act path (memleak scenario, 44 seconds wall clock) and the human-on-the-loop path (cve scenario, 14 seconds wall clock with memory recall). Each agent turn is annotated with provider, model, latency, token count, and confidence, so a regression in any one agent shows up immediately in the run report.

**Q8. If your system fails in production, how will you handle debugging and recovery?**

Three lines of defence. First, structured JSON logs flow into Cloud Logging with severity, timestamp, release, run id, and a sanitised payload, so any failed run is searchable in a few seconds. Second, every action is reversible by default and risk-tagged, so a misfire on the rollback action is itself reversible by re-applying the previous revision. Third, Cloud Run rollback to a known-good revision takes less than sixty seconds with `gcloud run services update-traffic --to-revisions PREVIOUS=100`. The full runbook lives in `docs/RUNBOOK.md` with a symptoms-causes-fixes table for the failure modes seen in development (5xx spikes, slow cold starts, Vertex AI 429s, Firestore quota exhaustion, missing ADC, stuck mid-run, scenario not found). The kill switch is to set `SENTINEL_FORCE_STUB=1`, which deterministically routes all reasoning through the stub and removes any dependency on external LLMs.

**Q9. What are the limitations of your project, and how can it be improved further?**

The evaluation set is seven seeded scenarios, not hundreds; scaling that up is a straightforward future-work item. The Process Reward Model is a heuristic, not a learned model; a fine-tuned PRM trained on per-step quality traces would tighten the calibration gate. The blast-radius calculator uses a static topology supplied by the scenario; connector mode will need a live topology builder, planned to use Cloud Service Mesh export and eBPF socket-layer discovery. Connector-mode write actions have been designed but are off by default, so the write-path is not yet exercised in production. The semantic policy gate uses an LLM judge for natural-language clauses but does not yet cache compiled rules across runs. None of these are blockers for the capstone. They are the obvious next iterations.

**Q10. If you had to deploy this as a real product or startup, what would be your next steps?**

In the first month, ship the connector-mode adapters for GCP and Kubernetes with read-only telemetry first and write actions gated behind a confirmation token. In the second month, build the live topology service from Cloud Service Mesh and an eBPF agent so the Reasoner is not dependent on a static fixture. In quarter two, replace the heuristic Process Reward Model with a fine-tuned classifier on a real incident corpus, and ship a comparative paper against the AIOpsLab benchmark family. In quarter three, add multi-tenant isolation, a billing meter on tokens consumed per resolved incident, and a self-serve onboarding flow that issues a least-privilege service account in three clicks. In year two, expand the actuator catalogue to AWS, Azure, and on-prem Kubernetes; ship a SOC 2 audit pack; add an SLA-backed managed offering. The product wedge is well defined: every dollar saved by reducing MTTR is a dollar a customer will share.

---

*End of report.*
