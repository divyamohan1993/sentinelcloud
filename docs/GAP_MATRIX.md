# Research Gap Matrix

**Project:** SentinelCloud
**Author:** Rohit Kumar (BTech CSE, GF202220522)
**Mentor / Build Partner:** Divya Mohan, dmj.one
**Submission:** May 2026

This matrix walks through the twelve research gaps named in `ARCHITECTURE.md` section 1, and shows which SentinelCloud module closes each one. Every entry cites a concrete file and line so a reviewer can audit the claim against running code.

A note on honesty before we begin. Some claims are fully realised in code today; others are partially realised, with the remaining work named explicitly in the *Residual risk* line. We mark partial work as such rather than overstating the status. The capstone defends what is built, not what is promised.

---

### G1. Single-LLM tool calls hallucinate commands and fabricate flags

**Where reported:** Studies on LLM tool use and function-calling reliability (the AIOpsLab benchmark family, ITBench traces from 2024 to 2026, and a number of industry post-mortems on LLM-driven runbooks). The shared finding is that a sole generative model invents API names, drops required parameters, or produces shell flags that do not exist in the target tool's manual page.

**Symptom:** A planner LLM emits `kubectl rollout undo deploy/payments-api --revision=auto`, where `--revision=auto` is not a real flag. A naive runtime would execute it and either fail noisily or, worse, dispatch to a fallback path that does the wrong thing.

**Why prior work falls short:** Most planner-actuator pipelines treat the LLM's output as authoritative and rely on the actuator to reject malformed calls at runtime. By that point the action has been logged, costed, and sometimes acknowledged to the user. Schema validation on the call site catches type errors but not semantic mismatch (right shape, wrong meaning).

**Our module:** Tool Selector Critic. Code path: `web/lib/agents/agents.ts` (function `runCritic`) plus the tool registry `web/lib/actuators/index.ts`.

**How it closes the gap:** A second smaller LLM is invoked with a specialised system prompt that scores every proposed tool call against the tool card text rendered from the registry (`toolCardsAsText` at `web/lib/actuators/index.ts:29`). The Critic returns a list of violations and a confidence score; the orchestrator captures both and folds them into the policy gate (`web/lib/agents/orchestrator.ts:71`). The Critic runs on a faster cheaper model (`fast: true` at `web/lib/agents/agents.ts:120`) so the verifier overhead does not dominate run latency.

**Measurement:** Tool-Call Validity KPI surfaced in the run report (`web/lib/agents/orchestrator.ts:156`). Target above 99 percent. Verification is straightforward: replay every emitted action against the registered tool cards in CI, count mismatches.

**Residual risk:** The Critic is itself an LLM. Two-of-two failure modes (planner and Critic both wrong) are not eliminated, only made statistically rare. A future iteration should add a deterministic JSON-schema check on `paramSchema` before the Critic runs.

---

### G2. Brittle root-cause analysis: text correlation without topology grounding

**Where reported:** RCAEval and AIOpsLab papers, plus several incident-management vendor write-ups from 2024 and 2025. The recurring claim is that LLMs latch onto lexical co-occurrence in logs and miss the obvious story when the topology graph is added.

**Symptom:** The Analyst flags `auth-svc` because `auth` appears in many error lines, when in fact `payments-api` is the upstream cause and the auth errors are a downstream symptom of timeouts inside the payments pod.

**Why prior work falls short:** Pure text RAG over logs is blind to who calls whom. Without an adjacency graph the model cannot tell whether two services share a parent in the call tree, and so cannot prefer upstream causes over downstream symptoms.

**Our module:** Topology-Aware Reasoner. Code path: `web/lib/agents/agents.ts` (function `runAnalyst`) plus the graph traversal in `web/lib/agents/blast.ts`.

**How it closes the gap:** The Analyst receives the full topology JSON in its prompt (`web/lib/agents/agents.ts:40`), with nodes carrying `criticality`, `replicas`, and `region`, and edges carrying `rps` and relation kind. The Strategist's chosen target is then re-grounded in the same graph by `computeBlastRadius` at `web/lib/agents/blast.ts:24`, which performs a depth-bounded BFS up to depth 2 over neighbours. Decisions are filtered by graph reachability before the policy gate sees them.

**Measurement:** Root-cause precision against `groundTruthRootCause` per scenario (`web/lib/scenarios/index.ts:36`). Target above 80 percent on the seeded scenario suite. Verified by running the full scenario set and diffing the Analyst's named target against the fixture's ground truth.

**Residual risk:** Topology is supplied by the scenario today. Connector mode will need a live topology builder (planned: Cloud Service Mesh export plus eBPF socket-layer discovery). Until that lands, real-world precision is unproven.

---

### G3. Debate agents collapse into consensus (groupthink)

**Where reported:** Multi-agent LLM framework papers (the LangGraph, AutoGen, and CrewAI literature), plus broader work on multi-agent debate. A repeated observation is that debating agents converge after one or two turns even when the right answer is the minority position.

**Symptom:** A two-agent setup is asked to argue. After one round the second agent simply restates the first agent's hypothesis with hedging language, and the run reports high confidence on a wrong answer.

**Why prior work falls short:** Same base model, similar system prompts, and a shared context window encourage agreement. Reward signals tend to favour fluent agreement over substantive disagreement, so dissent is trained out.

**Our module:** Adversarial Debate. Code path: `web/lib/agents/agents.ts` (function `runDevil`), prompt `DEVIL_SYSTEM` in `web/lib/agents/prompts.ts`.

**How it closes the gap:** The Devil's Advocate is run with a separate system prompt that contractually requires dissent ("You MUST dissent" at `web/lib/agents/agents.ts:53`), a higher temperature (0.7 at `:54`) than the Analyst (0.3 at `:41`), and a structured `dissent` field in the return JSON. The episodic memory layer rewards the presence of dissent in `scoreRunQuality` at `web/lib/memory/episodic.ts:73`, so the system has a positive training signal toward disagreement rather than against it.

**Measurement:** Dissent-rate KPI (fraction of runs where `turn.dissent` is non-empty and longer than 10 chars). Target above 95 percent. Verifiable by reading the persisted episodes and counting dissent presence.

**Residual risk:** A model can fake dissent by producing a token-shaped objection that is semantically empty. We do not yet score the *quality* of dissent, only its presence. A future Critic-style scorer for dissent quality is an open item.

---

### G4. No blast-radius awareness: actions cascade

**Where reported:** Industry post-mortems published 2024 to 2026, plus the AIOpsLab paper's section on action safety. The shared lesson is that an action that looks local can take down half a region when the dependency graph is fanned out.

**Symptom:** An agent restarts pods on a critical service that sits at a fan-in node; downstream queues back up, retries amplify, and a small fix triggers a regional outage.

**Why prior work falls short:** Most autonomous remediation papers stop at action correctness. They check whether the action repairs the symptom, not whether it is safe to execute given the rest of the system. Where blast radius is mentioned it is a hand-coded heuristic against a service tier label, not a real graph traversal.

**Our module:** Blast Radius Calculator. Code path: `web/lib/agents/blast.ts`.

**How it closes the gap:** `computeBlastRadius` at `web/lib/agents/blast.ts:24` runs a BFS bounded at depth 2, summing per-node criticality weights inversely scaled by depth, then adds an action-kind base score from `ACTION_BASE` at `:11`. The resulting 0..100 score gates auto-execution: above 70 the run is forced into HITL pause (`web/lib/agents/calibration.ts:21`).

**Measurement:** Blast radius score is emitted on every run (`web/lib/agents/orchestrator.ts:68`). KPIs: count of actions auto-executed with blast above 70 (target zero) and blast-aware noise reduction (target above 90 percent at `web/lib/agents/orchestrator.ts:153`).

**Residual risk:** BFS weights are heuristic. They reflect a sensible default, not a measured impact distribution. A real production deployment should learn the weights from incident replay rather than hard-code them.

---

### G5. No counterfactual reasoning: what if we did X instead?

**Where reported:** Reinforcement-learning literature on counterfactual policy evaluation, plus several recent multi-agent post-mortems that highlight the inability of LLM agents to learn from rejected alternatives.

**Symptom:** The system picks action A, action A succeeds, and the rejected alternatives B and C are dropped on the floor. The next time a similar incident arrives, the system again debates A vs B vs C from scratch.

**Why prior work falls short:** Episode logs typically store the chosen action only. Without paired rejected alternatives there is no training signal on the comparative value of choices, and no retrieval handle for "we considered B last time and ruled it out for reason R".

**Our module:** Counterfactual Memory inside the episodic memory store. Code path: `web/lib/memory/episodic.ts`.

**How it closes the gap:** `recordEpisode` at `web/lib/memory/episodic.ts:32` writes the chosen `resolution` and a list of `rejectedAlternatives` taken from any agent turn that emitted dissent. The recall path at `:51` returns the top-k past episodes for a similar scenario, so the next run sees both the action that worked and the alternatives that were ruled out.

**Measurement:** Repeat-incident MTTR. For the same scenario id, runs 2..N should resolve faster than run 1 because relevant past dissents are retrieved up front. Verifiable by replaying scenarios in order and plotting MTTR per run number.

**Residual risk:** Recall is currently scenario-id keyed, not embedding-keyed. Cross-scenario generalisation (a memory leak on service A informing a leak on service B) requires the embedding column promised in the architecture. That column exists in Firestore writes but is not yet used at recall time.

---

### G6. Policy gates are regex; semantic violations slip through

**Where reported:** Policy-as-code work (OPA / Rego / Cedar) and a stream of papers on Constitutional AI. The shared point is that pattern matchers catch known-bad strings but miss intent-level violations.

**Symptom:** A regex policy denies the substring `DELETE FROM` but allows `TRUNCATE TABLE`, which has the same effect. Or it allows `replicas: 2` when a constitution clause says production must always run with at least 3.

**Why prior work falls short:** Pure regex / static policy languages cannot read intent. Pure-LLM policy review cannot be cached and cannot be audited deterministically. Neither alone is enough.

**Our module:** Semantic Policy Engine. Code path: `web/lib/policy/engine.ts` plus `runSafety` in `web/lib/agents/agents.ts`.

**How it closes the gap:** The constitution is plain English (clauses C1..C7 at `web/lib/policy/engine.ts:7`). For each clause that admits a deterministic check, `checkDeterministic` at `:68` runs that check first (e.g., C1 enforces `replicas >= 3` at `:74`, C4 caps mesh shift at 25 percent at `:88`). Anything not deterministically decidable is passed to the Safety LLM with the full constitution text rendered by `constitutionToText` at `:59`. The orchestrator merges the deterministic and LLM decisions at `web/lib/agents/orchestrator.ts:80` and refuses the action if either disagrees.

**Measurement:** Policy-coverage KPI: percentage of constitution clauses that have at least one deterministic check (today: C1, C3, C4, C5, C6 = 5 of 7). Plus violation-recall on a synthetic adversarial action set. Both can be computed from `engine.ts` and a small test corpus.

**Residual risk:** The LLM half of the gate is not signed or cached as a compiled rule yet. The architecture promises caching of judged decisions; that store is not wired in this revision.

---

### G7. Reproducibility crisis: benchmarks score below 40 percent on real traces

**Where reported:** AIOpsLab and RCAEval reproducibility appendices plus a number of community discussions on benchmark drift between paper-time and replication-time.

**Symptom:** A claim of 78 percent root-cause accuracy in a paper is reproduced at 31 percent two months later because the underlying telemetry generator drifted, or because the LLM weights shifted, or because the random seeds were not pinned.

**Why prior work falls short:** Most agent benchmarks ship a corpus but not a deterministic generator. Live tools and live LLMs change underneath the paper.

**Our module:** Deterministic Scenario Engine. Code path: `web/lib/scenarios/index.ts`.

**How it closes the gap:** Every scenario is a hard-coded TypeScript fixture with stable signal ids and ground-truth labels (e.g., `groundTruthRootCause` at `web/lib/scenarios/index.ts:36`). Timestamps are computed relative to `Date.now()` so wall-clock changes but inter-event spacing is fixed. The LLM gateway has a stub fallback (`web/lib/llm/gateway.ts`) so a reviewer without GCP credentials still gets a deterministic run.

**Measurement:** Byte-stable run report under stub mode. Diff two consecutive runs on the same scenario id with stub LLM. Target: identical action and identical KPIs.

**Residual risk:** Determinism under stub mode is full. Determinism under real Gemini or Claude is statistical only (temperature is set low but not zero). A pinned-weights mode for the paper run is on the to-do list.

---

### G8. FinOps recommendations ignore lifecycle and spot-eviction risk

**Where reported:** FinOps Foundation surveys 2024 to 2026, spot-instance reliability studies (Google, AWS internal data summarised in conference talks), and right-sizing literature.

**Symptom:** An agent recommends a 70 percent cost cut by moving a workload to spot, ignoring that the workload has no checkpointing and a 20-minute warm-up. Eviction halfway through a job costs more than the savings.

**Why prior work falls short:** Cost optimisers tend to treat the price column as the only objective. Eviction probability, warm-up time, and statefulness are second-class signals at best.

**Our module:** Cost-Risk Optimizer. Code path today: the cost-affecting branch of `web/lib/policy/engine.ts` (clause C5 at `:37`) plus the `right_size` actuator card at `web/lib/actuators/index.ts:20`.

**How it closes the gap:** Clause C5 forces any cost-affecting action above USD 500 into HITL pause (deterministic check at `web/lib/policy/engine.ts:93`). The `right_size` action card is risk-class `medium`, so the calibration gate at `web/lib/agents/calibration.ts:9` requires a fused confidence above 0.78 before auto-execution. The architecture's promised Pareto frontier (price by eviction probability by tolerance) is named in the spec and stubbed by these two gates today.

**Measurement:** Cost-saved per run (`web/lib/agents/orchestrator.ts:158`) plus a separate metric for actions blocked by C5. Target: zero auto-executed cost-affecting actions above the threshold.

**Residual risk:** This is the most partial of the twelve. The full Pareto optimiser is not in the May 2026 build. The current implementation is a guard, not an optimiser. Honest disclosure: this gap is named in the literature review and addressed structurally, but a paper that claims a Pareto solver should not cite this code.

---

### G9. No learning loop: the same incidents repeat

**Where reported:** Process Reward Model literature (LLM RLHF and step-level reward shaping) plus AIOps survey papers that point out the absence of cross-run memory.

**Symptom:** Run 1 of a memory-leak scenario takes 4 minutes. Run 50 takes 4 minutes. The system has not learned anything from the prior 49 runs.

**Why prior work falls short:** Most agent systems persist final outcomes only. Without per-step quality scores there is no training signal at the granularity where learning is possible.

**Our module:** Episodic Memory plus Process Reward Model. Code path: `web/lib/memory/episodic.ts`.

**How it closes the gap:** `scoreRunQuality` at `web/lib/memory/episodic.ts:68` produces a per-run quality score from outcome, presence of dissent, verifier agreement, and average blast radius. The score is written alongside the episode at `:42`. Recall returns top-k past episodes for the same scenario at `:51`, and the orchestrator emits the recalled ids before analysis begins (`web/lib/agents/orchestrator.ts:45`).

**Measurement:** Run-over-run KPI improvement on the same scenario id. Plot MTTR and tool-call validity as a function of run number. Target: monotone non-increasing MTTR for the first 10 repeats.

**Residual risk:** PRM is heuristic, not learned. A trained reward model on per-step traces is the right next step. The current shape is correct but the weights are guesses informed by the literature, not measurements.

---

### G10. Confidence is uncalibrated; agents act when they shouldn't

**Where reported:** LLM calibration papers (the broad post-2023 line of work on temperature scaling, expected calibration error, and over-confidence under distribution shift) plus AIOps action-safety surveys.

**Symptom:** An LLM reports 0.92 confidence on a hallucinated diagnosis. The auto-act gate fires and a wrong fix lands in production.

**Why prior work falls short:** A single agent's reported confidence is rarely calibrated against ground truth. Even when calibrated in lab, distribution shift in real telemetry breaks the calibration immediately.

**Our module:** Confidence Calibration Gate. Code path: `web/lib/agents/calibration.ts`.

**How it closes the gap:** `fuseConfidence` at `web/lib/agents/calibration.ts:29` takes the geometric mean of analyst and strategist confidences, then multiplies by safety confidence and a verifier-derived term `(0.5 + 0.5 * verifier)`. This penalises strategist over-confidence whenever the verifier disagrees. `shouldAutoAct` at `:15` then checks the fused score against a per-risk-class threshold (`THRESHOLD` table at `:7`). Critical-risk actions hit a threshold of 0.99, which is by design unreachable, so they always pause for HITL.

**Measurement:** Hallucination rate KPI at `web/lib/agents/orchestrator.ts:157`. Target below 1 percent. Plus auto-act-on-wrong-action count measured against scenario ground truth (target zero).

**Residual risk:** The fusion formula is hand-designed. A real calibration study would learn the weights from paired (confidence, correctness) traces. We do not have a labelled corpus large enough to fit this yet.

---

### G11. Shift-left security is reactive, not preventive

**Where reported:** Industry CVE response post-mortems and academic work on automated WAF rule synthesis.

**Symptom:** A new CVE drops at 2 a.m. The on-call writes a ModSecurity rule by hand at 4 a.m. Between 2 and 4, exploit attempts hit the edge.

**Why prior work falls short:** WAF rule generation is treated as a manual SOC task. LLM-generated rules are usually proposed without TTL bounds and without a CVE binding, which makes them dangerous to auto-deploy.

**Our module:** WAF Rule Synthesizer. Code path: `web/lib/actuators/index.ts` (kind `waf_rule`) plus the deterministic policy clause C3 in `web/lib/policy/engine.ts`.

**How it closes the gap:** The `waf_rule` actuator at `web/lib/actuators/index.ts:54` produces a ModSecurity directive bound to a CVE id, an expression, and a TTL in seconds (TTL is multiplied from days at `:56`). Constitution clause C3 at `web/lib/policy/engine.ts:23` enforces `0 < ttlDays <= 14` and a regex-validated CVE id (`/^CVE-\d{4}-\d+$/i` at `:84`); a missing CVE or oversize TTL blocks the action deterministically.

**Measurement:** Time-to-rule KPI (CVE alert ingestion to actuated rule). Target below 5 minutes on the `cve` scenario. Plus 100 percent of synthesised rules carrying both a CVE id and a bounded TTL.

**Residual risk:** The synthesised rule expression itself is not validated against a replay corpus in this build. The architecture calls for a replay-corpus validator; that loop is not wired yet.

---

### G12. Multimodal ingestion is talked about but rarely implemented

**Where reported:** OpenTelemetry semantic-conventions discussions plus AIOps survey papers that point out most systems handle one telemetry type well and the rest as second-class.

**Symptom:** An agent reasons over logs only and ignores traces, metrics, GitHub PR diffs, and chat transcripts. Half the signal is dropped on the floor.

**Why prior work falls short:** Each telemetry type has its own schema. Naive ingestion either keeps them separate (so the reasoner cannot cross-correlate) or flattens them lossily (so the structure is gone).

**Our module:** Multimodal Ingestor. Code path: the unified `Signal` envelope in `web/lib/types.ts`, populated by the scenario fixtures in `web/lib/scenarios/index.ts`.

**How it closes the gap:** Every input source produces a `Signal` with the same envelope: `id, ts, kind, source, service, severity, payload, tags`. The scenarios file exercises all the listed kinds (`metric`, `event`, `trace`, `log`, `alert`) in a single chronological list (e.g., `web/lib/scenarios/index.ts:41` through `:46`). The Analyst receives them as one sorted JSON blob (`web/lib/agents/agents.ts:40`), so cross-modal correlation is the default rather than the exception.

**Measurement:** Cross-modal correlation rate: fraction of correctly identified root causes that required evidence from at least two telemetry kinds. Target above 50 percent.

**Residual risk:** Real ingestion adapters (OTLP receiver, GitHub webhook, Slack adapter) are not yet wired. The envelope is right; the ingestion side is stubbed by the fixtures. Connector mode will need each adapter built and tested.

---

## Summary table

| Gap | Module | KPI moved | Residual risk |
|---|---|---|---|
| G1 | Tool Selector Critic (`agents/agents.ts:118`) | Tool-Call Validity > 99% | Two-of-two LLM failure not eliminated |
| G2 | Topology-Aware Reasoner (`agents/agents.ts:39` + `agents/blast.ts`) | Root-cause precision > 80% | Live topology builder not wired |
| G3 | Adversarial Debate (`agents/agents.ts:52`, `agents/prompts.ts`) | Dissent rate > 95% | Dissent quality not yet scored |
| G4 | Blast Radius Calculator (`agents/blast.ts:24`) | Blast-aware noise reduction > 90% | BFS weights are hand-tuned |
| G5 | Counterfactual Memory (`memory/episodic.ts:32`) | Repeat-incident MTTR drops | Embedding-keyed recall not active |
| G6 | Semantic Policy Engine (`policy/engine.ts:68` + `agents/agents.ts:66`) | Policy coverage 5 of 7 clauses | LLM-side decisions not cached as compiled rules |
| G7 | Deterministic Scenario Engine (`scenarios/index.ts`) | Byte-stable runs in stub mode | Real-LLM runs are statistically deterministic only |
| G8 | Cost-Risk Optimizer (`policy/engine.ts:93` + `actuators/index.ts:20`) | Auto-acted cost actions over $500 = 0 | Pareto solver not implemented |
| G9 | Episodic Memory + PRM (`memory/episodic.ts:68`) | Per-scenario MTTR monotone non-increasing | PRM weights are heuristic, not learned |
| G10 | Confidence Calibration Gate (`agents/calibration.ts:15`) | Hallucination rate < 1% | Fusion weights hand-designed |
| G11 | WAF Rule Synthesizer (`actuators/index.ts:54` + `policy/engine.ts:80`) | Time-to-rule < 5 min | No replay-corpus validator yet |
| G12 | Multimodal Ingestor (`types.ts` envelope + `scenarios/index.ts`) | Cross-modal correlation > 50% | Real ingestion adapters stubbed by fixtures |
