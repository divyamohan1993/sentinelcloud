# SentinelCloud Architecture Specification

**Version:** 1.0 - May 2026
**Author:** Rohit Kumar (BTech CSE Cloud Computing, GF202220522)
**Capstone Mentor:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Live URL:** https://sentinelcloud.dmj.one

---

## 0. North Star

SentinelCloud is an AI-driven autonomous DevOps engineer. It turns the closed loop of *observe → diagnose → decide → act → verify → learn* into a measurable, audited, multi-agent system that demonstrably outperforms a single-LLM baseline on incident response, FinOps, and shift-left security.

The deployable artifact is a **publicly accessible showcase** that runs the full pipeline end-to-end on simulated-but-realistic telemetry, and exposes a **connector-mode** that can be pointed at a real GCP project, a real K8s cluster, or a real GitHub repo via service-account binding.

## 1. Research Gaps Addressed (April 2026 state of the art)

Each gap maps to a concrete module. The capstone defends every claim with a measurement.

| # | Gap reported in literature (AIOpsLab, ITBench, RCAEval, AutoSRE benchmarks) | SentinelCloud module |
|---|---|---|
| G1 | Single-LLM baselines hallucinate commands, fabricate flags. | **Tool Selector Critic** - smaller verifier LLM scores every tool call against a tool-card schema before dispatch. |
| G2 | Brittle root-cause analysis: LLMs correlate text but don't ground in topology. | **Topology-Aware Reasoner** - joins logs+metrics+traces over a service-graph (Neo4j-style adjacency in Firestore). |
| G3 | "Debate" agents collapse into consensus (groupthink). | **Adversarial Debate** - one agent is contractually pinned to *Devil's Advocate* role with a separate system prompt and a dissent quota. |
| G4 | No blast-radius awareness - agents propose changes that cascade. | **Blast Radius Calculator** - BFS over dependency graph; action is gated by max blast score. |
| G5 | No counterfactual reasoning - "what if we did X instead?" | **Counterfactual Memory** - every accepted action is paired with the rejected alternatives and outcome predictions; recalled by similarity for next incident. |
| G6 | Policy gates are regex; can't catch semantic violations. | **Semantic Policy Engine** - plain-English constitution; violations validated by a dedicated policy-judge LLM, then cached as compiled rules. |
| G7 | Reproducibility crisis - benchmarks score <40 % on real traces. | **Deterministic Scenario Engine** - every demo scenario is a seeded fixture; runs are reproducible byte-for-byte. |
| G8 | FinOps recommendations ignore lifecycle / spot-eviction risk. | **Cost-Risk Optimizer** - Pareto frontier over price × eviction-probability × workload tolerance. |
| G9 | No learning loop - same incidents repeat. | **Episodic Memory + PRM** - process-reward model logs per-step quality; future runs retrieve top-k past episodes. |
| G10 | Confidence is uncalibrated; agents act when they shouldn't. | **Confidence Calibration Gate** - actions auto-execute only above per-action-class threshold; below = human-in-the-loop summary. |
| G11 | Shift-left security is reactive, not preventive. | **WAF Rule Synthesizer** - given a CVE, drafts a ModSecurity / Cloud Armor rule and validates it against a replay corpus. |
| G12 | Multimodal ingestion is talked about but rarely implemented. | **Multimodal Ingestor** - OTLP traces, JSON logs, Prometheus metrics, GitHub PR diffs, Slack threads, all normalized to a unified `Signal` envelope. |

## 2. Three-Layer Brain (mapped to code)

```
┌──────────────────────────────────────────────────────────────────┐
│ PERCEPTION (web/lib/ingest, web/app/api/ingest)                  │
│  ├─ OTLP receiver (simulated)    ├─ Log shipper                  │
│  ├─ Metrics scraper              ├─ GitHub webhook receiver      │
│  └─ Slack/Teams transcript adapter                               │
│                          │ Signal envelope                       │
│                          ▼                                       │
│ REASONING (web/lib/agents)                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Orchestrator (LangGraph-style state machine)               │  │
│  │  ├─ Analyst agent                                          │  │
│  │  ├─ Devil's Advocate (adversarial)                         │  │
│  │  ├─ Safety / Compliance agent                              │  │
│  │  ├─ Strategist agent                                       │  │
│  │  └─ Verifier (predicts outcome of proposed action)         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                          │ Plan + confidence                     │
│                          ▼                                       │
│ ACTUATION (web/lib/actuators)                                    │
│  ├─ GitOps PR opener (simulated GitHub PR)                       │
│  ├─ Dynamic API caller (Cloud SDK shim)                          │
│  ├─ Service-mesh toggler (Istio shim)                            │
│  └─ WAF rule writer                                              │
└──────────────────────────────────────────────────────────────────┘
```

## 3. Stack

| Concern | Choice | Why |
|---|---|---|
| Runtime | Cloud Run, asia-east1, min-instances=0, max=10 | Free-tier scale-to-zero, low latency from India. |
| Web framework | Next.js 15 (App Router) + React 19 | Server actions, RSC, single deployable artifact. |
| Style | Tailwind CSS v4, shadcn-pattern components, framer-motion | Production polish, motion-reduced fallback. |
| Language | TypeScript 5.5 (strict) | Single-language stack reduces cold-start surface. |
| LLM gateway | Vertex AI Gemini 2.5 Pro (default), Anthropic Claude 4.7 Opus (optional), local-stub (fallback) | Vertex AI uses ADC - no key management on free tier. Claude optional via Secret Manager. Stub mode keeps the demo working when no LLM is reachable. |
| Embeddings | Vertex AI text-embedding-005 | Same auth path as Gemini. |
| Vector + Graph store | Firestore with embedding field + adjacency arrays | Single managed dependency. |
| Streaming | SSE (Server-Sent Events) | Stable on Cloud Run; simpler than WS. |
| Observability | Cloud Logging structured JSON + OpenTelemetry SDK | Required by CLAUDE.md observability rule. |
| Auth (admin actions) | Firebase Auth + Google sign-in (gated) | Demo is read-only public; admin-only routes for connector mode. |
| IaC | Dockerfile + `gcloud run deploy --source` | Reproducible without Terraform overhead for this scope. |
| Secrets | Secret Manager → injected as env at deploy | No secrets in repo. |
| CI | GitHub Actions: build → test → deploy on tag | One-button release. |

## 4. Key User Journeys

1. **Visitor lands on `/`** → sees a hero, a live counter of "incidents auto-resolved this hour", and a *Run a demo* button.
2. **Demo run** → user picks a scenario from a card grid (Memory leak, DB pool, CVE, Cost spike, Drift, Cascading failure, DDoS). Streams the full agent debate, the proposed action, the verifier's outcome prediction, the blast-radius score, the policy gate result, and the final resolution. End-of-run shows MTTR, noise reduction, drift latency, deployment-success score.
3. **Operator** opens `/console` → live incident feed, agent debate inspector, policy editor, knowledge-base search, FinOps savings tracker, security warden feed.
4. **Architect** opens `/architecture` → interactive system diagram, gap matrix, KPI dashboard, source-of-truth links to code.
5. **Reviewer** opens `/research` → literature review, gap matrix, methodology, results, repro instructions, BibTeX.

## 5. Page Map

```
/                       hero, value props, scenario gallery, live KPI tape
/demo/[scenario]        live multi-agent run with timeline + debate transcript
/console                operator workbench (incidents, debate inspector, policies, memory)
/architecture           three-layer brain, interactive diagram, gap matrix
/research               literature review, KPIs, methodology, results
/docs                   how to deploy / how to connect a real cluster
/api/scenarios          GET list, POST {id} to launch a run (SSE response)
/api/run/[runId]/stream SSE stream of agent events for a run
/api/run/[runId]        GET final report
/api/policies           CRUD for policy constitution
/api/memory/search      vector search over episodic memory
/api/health             liveness + dependency health
```

## 6. Agent Contract

Each agent is a pure function `(ctx, signals) -> AgentTurn`. `AgentTurn` is:

```ts
type AgentTurn = {
  agent: 'analyst' | 'devil' | 'safety' | 'strategist' | 'verifier' | 'critic';
  thought: string;            // chain-of-thought, redacted before client when sensitive
  evidence: SignalRef[];      // grounded references
  proposal?: Action;          // only Strategist / Verifier emit
  confidence: number;         // 0..1, calibrated
  dissent?: string;           // Devil's Advocate must populate
  policy_violations?: string[];
  blast_radius?: number;      // 0..100
  cost_delta_usd?: number;    // signed
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
};
```

Orchestrator state machine: `INGEST → ANALYZE → DEBATE → SAFETY → STRATEGIZE → VERIFY → POLICY_GATE → CONFIDENCE_GATE → (AUTO_ACT | HITL_PAUSE) → VERIFY_OUTCOME → LEARN`.

## 7. KPIs Surfaced in UI

- MTTR (target < 5 min autonomous)
- Noise Reduction (target > 90 %)
- Drift Latency (target < 60 s)
- Deployment Success (target > 99.9 %)
- Tool-Call Validity (Critic-verified, target > 99 %)
- Hallucination Rate (verifier disagreement, target < 1 %)
- Cost Saved (USD, cumulative since deploy)

## 8. Trust Guardrails (Kill Switch)

- **Semantic Validation** - Verifier predicts post-action state; Strategist must explain delta within tolerance.
- **Human-on-the-Loop** - every CRITICAL action emits a Slack-style summary; UI shows "Confirm / Deny / Modify".
- **Immutable Policy Gates** - constitution stored in Firestore, signed at write-time; cannot be overridden by an agent.
- **Tool Allowlist** - explicit registry; deny-by-default.
- **Rate limit** - agents may not run more than N actions / min on the same target.

## 9. Privacy / Security Posture

- Public demo = no PII; scenarios are synthetic.
- Connector mode = service-account-bound; least-privilege roles only.
- Secret Manager for all keys; never in repo, never in logs.
- TLS 1.3 from Cloud Run automatic; HSTS preload set on `dmj.one` apex.
- CSP, Referrer-Policy, X-Content-Type-Options shipped from `next.config.ts`.

## 10. Build Sequence (parallel tracks)

1. **Track A - UI** - pages, components, animations, dashboard.
2. **Track B - Orchestrator + Agents** - state machine, LLM gateway, agent prompts.
3. **Track C - Scenarios + Knowledge Base** - fixture incidents, RAG seed data, blast-radius graphs.
4. **Track D - Infra + Deploy** - Dockerfile, Cloud Run, domain mapping, GitHub Actions.
5. **Track E - Docs + Capstone Report** - README, architecture, gap matrix, results.

Tracks A–C share `web/`. Track D writes `Dockerfile`, `cloudbuild.yaml`, `.github/workflows/`. Track E writes `docs/` and `README.md`.
