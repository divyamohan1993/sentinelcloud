<!--
  SentinelCloud
  BTech CSE Cloud Computing Capstone, Shoolini University, GF202220522
  Author: Rohit Kumar
  Mentor: Divya Mohan, dmj.one
  Live: https://sentinelcloud.dmj.one
-->

## SentinelCloud, AI-Driven Autonomous DevOps Engineer

**One closed loop. Five agents. Seven scenarios. Zero hallucinated kubectl.**

- Live demo: https://sentinelcloud.dmj.one
- Source: https://github.com/divyamohan1993/sentinelcloud
- Capstone artifact: BTech CSE (Cloud Computing), Shoolini University, GF202220522
- Mentor and build partner: Divya Mohan, [dmj.one](https://dmj.one)

SentinelCloud closes the SRE loop end to end: *observe, diagnose, debate, decide, act, verify, learn*. It is a multi-agent system that runs on Cloud Run, ships in one Docker image, and proves every claim with a measurable KPI. The public site runs the full pipeline on simulated-but-realistic telemetry so a reviewer can press one button and watch agents argue, gate, act, and then write their own post-mortem.

---

## Why this project exists

**On-call is broken, and a single LLM does not fix it.** Production SRE in 2026 still drowns in alert noise, page fatigue, and Sunday-night rollbacks. The 2024 to 2026 wave of AIOps benchmarks (AIOpsLab, ITBench, RCAEval, AutoSRE) reports the same pattern over and over: a single large language model wired to a tool registry hits 30 to 40 percent on real incident traces, fabricates flags it has never seen, and confidently deletes the wrong pod when given write access. That is not an engineer. That is a junior intern with a credit card.

**The gap is not raw model capability. It is structure.** A working autonomous engineer needs five things at once: grounded reasoning over a service graph, an adversarial second opinion, a policy gate that understands intent (not regex), a calibrated confidence score before any action runs, and a memory of what worked last time. Most published agents have one or two of these. None ship all five with measurement. Every paper benchmarks a different way, on a different fixture, with a different LLM, so claims do not compose. Reproducibility on production traces sits below 40 percent.

**SentinelCloud picks the boring fight: build the missing structure, measure everything, and keep the demo deterministic.** Every scenario is a seeded fixture that runs byte for byte. Every agent turn is a typed object with a confidence, a token count, and a latency. Every action passes a deterministic policy check, then a semantic policy check, then a blast-radius gate, then a calibration gate before it touches anything. The result is small, auditable, and provably better than a single-LLM baseline on the same fixtures. That is the contribution.

---

## The twelve research gaps SentinelCloud closes

Each gap is grounded in the public AIOps literature and mapped to a concrete module in this repository. Code paths are shown so a reviewer can verify the claim in under a minute.

1. **G1, hallucinated tool calls.** A smaller verifier LLM scores every proposed tool call against a typed tool-card schema before dispatch (`web/lib/agents/critic`).
2. **G2, ungrounded root-cause analysis.** A topology-aware reasoner joins logs, metrics, and traces over a service graph stored as adjacency arrays in Firestore (`web/lib/agents/analyst`).
3. **G3, debate collapse into groupthink.** One agent is contractually pinned to a Devil's Advocate role with its own system prompt and a dissent quota that the orchestrator enforces (`web/lib/agents/devil`).
4. **G4, no blast-radius awareness.** A breadth-first search over the dependency graph computes a 0 to 100 blast score that gates every action (`web/lib/agents/blast.ts`).
5. **G5, no counterfactual reasoning.** Every accepted action is paired with the rejected alternatives and stored in episodic memory, recalled by similarity for the next incident (`web/lib/memory/episodic.ts`).
6. **G6, regex-only policy gates.** A plain-English constitution is judged by a dedicated policy-judge LLM, then compiled rules are cached for hot paths (`web/lib/policy/engine.ts`).
7. **G7, irreproducible benchmarks.** Every scenario is a seeded fixture; runs are reproducible byte for byte across hosts and models (`web/lib/scenarios/index.ts`).
8. **G8, FinOps recommendations that ignore eviction risk.** A cost-risk optimiser walks a Pareto frontier over price, eviction probability, and workload tolerance (`web/lib/agents/strategist`, `right_size`).
9. **G9, no learning loop.** A process-reward model logs per-step quality and the next run retrieves the top-k most similar past episodes (`web/lib/memory/episodic.ts`).
10. **G10, uncalibrated confidence.** Actions auto-execute only above a per-action-class threshold; below threshold, the run pauses and writes a human-on-the-loop summary (`web/lib/agents/calibration.ts`).
11. **G11, reactive, not preventive, security.** A WAF rule synthesiser drafts a ModSecurity or Cloud Armor rule from a CVE description and validates it against a replay corpus (`web/lib/actuators` + the `cve` and `ddos` scenarios).
12. **G12, multimodal ingestion is talked about, rarely shipped.** Traces, logs, metrics, GitHub PR diffs, and chat transcripts are normalised to a single `Signal` envelope before any agent sees them (`web/lib/ingest`, `web/lib/types.ts`).

Every gap maps to a code path. Every code path maps to a KPI on the live dashboard. That is the contract.

---

## Architecture at a glance

SentinelCloud is a three-layer brain. Perception turns the world into typed signals. Reasoning runs five agents and three gates. Actuation talks to GitOps, the Cloud SDK, the service mesh, and the WAF.

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

The orchestrator state machine, defined in `web/lib/agents/orchestrator.ts`, walks every run through the same path:

```
INGEST -> ANALYZE -> DEBATE -> STRATEGIZE -> CRITIC ->
SAFETY -> VERIFY -> POLICY_GATE -> CONFIDENCE_GATE ->
(AUTO_ACT | HITL_PAUSE) -> VERIFY_OUTCOME -> LEARN -> DONE
```

Six lines of stack, six decisions defended:

| Concern | Choice |
|---|---|
| Runtime | Cloud Run, `asia-east1`, `min-instances=0`, `max=10`, free-tier scale-to-zero. |
| Web stack | Next.js 15 (App Router) + React 19 + TypeScript 5.5 strict, single deployable artifact. |
| UI | Tailwind CSS v4, shadcn-pattern components, framer-motion with reduced-motion fallback. |
| LLM gateway | Vertex AI Gemini 2.5 Pro by default, Anthropic Claude Opus 4.7 optional, deterministic stub when no key. |
| Storage | Firestore for embeddings and adjacency, Secret Manager for keys, no secrets in repo. |
| Observability | Structured JSON to Cloud Logging, OpenTelemetry traces, p50/p95/p99 dashboards from day one. |

---

## The seven demo scenarios

Every scenario is a seeded fixture from `web/lib/scenarios/index.ts`. Ground-truth root cause and ground-truth action are encoded in the fixture so the orchestrator's choice can be scored against an oracle. The same topology graph (`baseTopology`) is reused so blast-radius numbers are comparable across runs.

| ID | Title | Category | Severity | Ground-truth Action |
|---|---|---|---|---|
| `memleak` | Memory leak in payments-api v2.4 | reliability | high | `rollback` |
| `dbpool` | orders-db connection pool exhausted | reliability | high | `restart_pods` |
| `cve` | Zero-day CVE-2026-30412 in libcrypto-flex | security | critical | `waf_rule` |
| `finops` | reports-batch over-provisioned by 6x | finops | medium | `right_size` |
| `drift` | Manual mesh weight change detected | drift | high | `mesh_weight` |
| `cascading` | Cascading failure: fraud-check timeout | reliability | critical | `mesh_weight` |
| `ddos` | Layer-7 anomalous traffic from one ASN | security | high | `waf_rule` |

Each scenario carries a `Signal[]` time series (metrics, logs, traces, audit events, alerts) and an `expectedKpiBoundsHint` so a reviewer can sanity-check the live KPIs against the fixture's published bounds.

---

## Run it locally

You need Node.js 22, npm, and a clone of this repository. No Google Cloud account required. The stub LLM keeps the demo working without any API keys.

```bash
git clone https://github.com/divyamohan1993/sentinelcloud.git
cd sentinelcloud/web
npm install
npm run dev
```

The dev server starts on http://localhost:3000. Open it, pick any of the seven scenarios from the gallery, and watch the agent debate stream over Server-Sent Events. The first run hits the stub gateway, so it is deterministic and free.

To run with a real LLM:

```bash
# Option A, Vertex AI Gemini (recommended on a workstation with gcloud installed)
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=your-project-id
npm run dev

# Option B, Anthropic Claude (works anywhere)
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev

# Force the stub even when keys exist (useful for reproducibility tests)
export SENTINEL_FORCE_STUB=1
npm run dev
```

To run the production build locally:

```bash
cd web
npm run build
npm start
```

To run the type checker, the linter, and the tests in one go:

```bash
cd web
npm run check
```

---

## Deploy your own

The repository ships a single Dockerfile at the repo root that builds a Next.js standalone artifact and runs it on Cloud Run. One command deploys to Cloud Run in Mumbai-adjacent `asia-east1` with scale-to-zero so the free tier covers the demo cost.

Prerequisites:

```bash
gcloud auth login
gcloud config set project dmjone
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com firestore.googleapis.com \
  secretmanager.googleapis.com aiplatform.googleapis.com
```

Build and deploy from source. Cloud Build picks up the root Dockerfile automatically:

```bash
gcloud run deploy sentinelcloud \
  --source . \
  --region asia-east1 \
  --project dmjone \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --cpu 1 \
  --memory 1Gi \
  --concurrency 80 \
  --timeout 300 \
  --port 8080 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=dmjone,SENTINEL_REGION=asia-east1"
```

Map a custom domain (the live deployment uses `sentinelcloud.dmj.one`):

```bash
gcloud run domain-mappings create \
  --service sentinelcloud \
  --domain sentinelcloud.dmj.one \
  --region asia-east1
```

Wire admin access for write actions:

```bash
gcloud run services update sentinelcloud \
  --region asia-east1 \
  --update-env-vars "SENTINEL_ADMIN_EMAILS=you@example.com"
```

To inject an Anthropic key as a secret instead of an env var:

```bash
echo -n "sk-ant-..." | gcloud secrets create anthropic-api-key --data-file=-
gcloud run services update sentinelcloud \
  --region asia-east1 \
  --update-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest
```

Rollback any release in under 60 seconds:

```bash
gcloud run services update-traffic sentinelcloud \
  --to-revisions PREVIOUS_REVISION=100 --region asia-east1
```

The included GitHub Actions workflow (`.github/workflows/deploy.yml`) does the same thing on every tag push.

---

## Connector mode

The default deployment is the showcase. Every action is simulated against a fixture so the public site can stay open without risk. **Connector mode** points the same agents at a real GCP project, a real Kubernetes cluster, or a real GitHub repository. Connector mode is gated by service-account binding and is read-only by default; write actions require an admin sign-in plus a confirmation token.

Required environment variables:

| Variable | Purpose | Default |
|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | Target GCP project for Vertex AI, Firestore, Cloud Logging, and the connector. | `dmjone` |
| `SENTINEL_REGION` | Cloud Run region and Vertex AI region. | `asia-east1` |
| `ANTHROPIC_API_KEY` | Optional Claude key. Pulled from Secret Manager in production. Empty disables Claude. | unset |
| `SENTINEL_FORCE_STUB` | When truthy, bypasses all LLM providers and runs the deterministic stub. Useful for CI and reproducibility tests. | unset |
| `SENTINEL_ADMIN_EMAILS` | Comma-separated list of Google sign-in emails allowed to trigger write actions in connector mode. | `divyamohan1993@gmail.com` |
| `SENTINEL_DISABLE_VERTEX` | Set truthy to disable Vertex AI even when ADC is present. | unset |
| `SENTINEL_DISABLE_CLAUDE` | Set truthy to disable Claude even when a key is present. | unset |
| `SENTINEL_GEMINI_MODEL` | Vertex Gemini model id. | `gemini-2.5-flash` |
| `SENTINEL_GEMINI_FAST_MODEL` | Cheaper Gemini variant for the Critic agent. | `gemini-2.5-flash` |
| `SENTINEL_CLAUDE_MODEL` | Anthropic model id. | `claude-opus-4-7` |
| `SENTINEL_FIRESTORE_DB` | Firestore database id. | `(default)` |

Bind a least-privilege service account before turning on writes:

```bash
gcloud iam service-accounts create sentinelcloud-runner \
  --display-name "SentinelCloud Cloud Run runner"

# Vertex AI for LLM calls
gcloud projects add-iam-policy-binding dmjone \
  --member "serviceAccount:sentinelcloud-runner@dmjone.iam.gserviceaccount.com" \
  --role roles/aiplatform.user

# Firestore for memory and policies
gcloud projects add-iam-policy-binding dmjone \
  --member "serviceAccount:sentinelcloud-runner@dmjone.iam.gserviceaccount.com" \
  --role roles/datastore.user

# Cloud Logging and Trace for observability
gcloud projects add-iam-policy-binding dmjone \
  --member "serviceAccount:sentinelcloud-runner@dmjone.iam.gserviceaccount.com" \
  --role roles/logging.logWriter

gcloud projects add-iam-policy-binding dmjone \
  --member "serviceAccount:sentinelcloud-runner@dmjone.iam.gserviceaccount.com" \
  --role roles/cloudtrace.agent

gcloud run services update sentinelcloud \
  --region asia-east1 \
  --service-account sentinelcloud-runner@dmjone.iam.gserviceaccount.com
```

Connector mode follows the four-phase rollout from the project plan:

1. **Observer.** Read-only access. Agents propose actions, never run them.
2. **Collaborator.** Agents open pull requests on Terraform or Helm charts. Humans click merge.
3. **Autonomous.** Low-risk actions (pod restarts, scaling, cache purges) run without a human.
4. **Sentinel.** Full lifecycle, including security response, with the kill switches always live.

The kill switches stay on at every phase: deterministic policy gate, semantic policy judge, blast-radius cap, calibrated confidence threshold, action allow-list, per-target rate limit, and an immutable Firestore audit log signed at write time.

---

## KPIs and measurement methodology

Seven KPIs are surfaced on the live dashboard. Every number is computed from the typed `RunReport` returned by the orchestrator (see `RunReport.kpis` in `web/lib/types.ts`). No KPI is a vanity metric. Each one has a target, a definition, and a measurement path.

| KPI | Target | Definition | How it is measured |
|---|---|---|---|
| **MTTR (autonomous)** | < 5 min | Wall-clock from the first signal to the verifier confirming the action restored the service. | `finishedAt - startedAt` on the `RunReport`, in seconds, computed in `computeKpis`. |
| **Noise Reduction** | > 90% | Percent of incoming alerts that the system either suppresses or auto-resolves without a page. | Suppressed and auto-resolved fixture alerts as a fraction of total alerts ingested in the run, adjusted by blast score. |
| **Drift Latency** | < 60 s | Time between a manual change to the cluster and the agent reverting it through GitOps. | Timestamp delta between the `audit` signal that detected the drift and the `mesh_weight` or `open_pr` actuation event. |
| **Deployment Success** | > 99.9% | Percent of automated deployments that do not require a human rollback. | Rolling 30-day count of deployments without a follow-up rollback or hotfix, persisted in Firestore episodes. |
| **Tool-Call Validity** | > 99% | Percent of agent-emitted tool calls that pass the Critic's schema and parameter check. | Critic verdicts per turn, divided by total tool calls in the run, fused from `AgentTurn.policyViolations`. |
| **Hallucination Rate** | < 1% | Percent of runs where the Verifier's predicted post-action state disagreed with the Strategist's claimed state. | Verifier disagreement count over total verified runs, sampled at the confidence-gate phase. |
| **Cost Saved** | cumulative USD | Sum of `right_size`, `spot_migrate`, and `feature_flag` actions, signed against the projected baseline. | Negative `Action.estimatedCostUsdDelta` summed across all auto-resolved runs since deploy. |

**Why these seven, and not the usual four.** MTTR, noise reduction, drift latency, and deployment success are the standard SRE quartet. They do not, on their own, distinguish a working agent from one that confidently does the wrong thing. Tool-call validity, hallucination rate, and cost saved close that loop. Together they answer three questions a reviewer should always ask: did the agent run a real command, did it predict the right outcome, and did the action actually pay off in dollars or in availability.

**Reproducibility.** Every KPI is computed on a seeded fixture. Set `SENTINEL_FORCE_STUB=1`, run a scenario twice, and the numbers match. That is gap G7, defended in code, not in a slide.

---

## Project structure

A clean tree of the top-level directories. Every directory has one responsibility.

```
sentinelcloud/
├── README.md                  Public-facing project overview (this file).
├── Dockerfile                 Multi-stage Next.js standalone build for Cloud Run.
├── .gcloudignore              Files excluded from gcloud source uploads.
├── api/                       OpenAPI specs for connector-mode integrations.
├── docs/                      ARCHITECTURE.md and capstone-report assets.
├── infra/                     Cloud Build YAML, IAM policies, GitHub Actions wiring.
├── knowledge/                 Seed RAG corpus: golden paths, post-mortem templates, runbooks.
├── scenarios/                 External fixture extensions (the seven demo scenarios live in code).
└── web/                       Next.js 15 application, the only deployable artifact.
    ├── app/                   App Router pages and API routes.
    │   ├── api/               REST + SSE endpoints (scenarios, run stream, policies, memory, health).
    │   ├── architecture/      Interactive three-layer brain page.
    │   ├── console/           Operator workbench.
    │   ├── demo/              Live agent debate visualiser.
    │   ├── docs/              Public-facing how-to.
    │   └── research/          Literature review, gap matrix, KPIs, BibTeX.
    ├── components/            Reusable UI primitives (shadcn-pattern, motion-aware).
    ├── lib/
    │   ├── actuators/         GitOps PR, Cloud SDK shim, mesh toggler, WAF writer.
    │   ├── agents/            Analyst, Devil, Safety, Strategist, Verifier, Critic, orchestrator.
    │   ├── ingest/            Multimodal `Signal` envelope normalisers.
    │   ├── llm/               Vertex AI, Anthropic, and stub gateways behind one interface.
    │   ├── memory/            Episodic memory, process-reward model, vector recall.
    │   ├── policy/            Plain-English constitution and the deterministic + LLM judges.
    │   ├── scenarios/         The seven seeded fixtures and their topology graph.
    │   ├── telemetry/         Structured logger, OpenTelemetry hooks.
    │   ├── env.ts             Read-once typed environment.
    │   └── types.ts           Single source of truth for the domain model.
    ├── public/                Static assets, OG images, manifest, robots.txt, sitemap.
    ├── styles/                Tailwind v4 entry and design tokens.
    ├── next.config.ts         Standalone output, security headers, image config.
    ├── package.json           Scripts: dev, build, start, check, test.
    └── tsconfig.json          Strict TypeScript settings.
```

Every directory has a single owner module so the import graph stays a tree, not a soup.

---

## Author and citation

**Rohit Kumar** (GF202220522), BTech Computer Science and Engineering, specialisation in Cloud Computing, Shoolini University, Solan, H.P., India. Capstone submission, May 2026.

**Mentor and build partner.** Divya Mohan, [dmj.one](https://dmj.one), `contact@dmj.one`. Architecture, multi-agent design, and production engineering review.

If you use SentinelCloud in your own research or coursework, please cite the capstone:

```bibtex
@misc{kumar2026sentinelcloud,
  author       = {Rohit Kumar and Divya Mohan},
  title        = {{SentinelCloud}: An {AI}-Driven Autonomous {DevOps} Engineer with
                  Adversarial Debate, Blast-Radius Gating, and Calibrated Confidence},
  howpublished = {BTech CSE (Cloud Computing) Capstone, Shoolini University,
                  Roll No.\ GF202220522},
  year         = {2026},
  month        = may,
  url          = {https://sentinelcloud.dmj.one},
  note         = {Source code: \url{https://github.com/divyamohan1993/sentinelcloud};
                  mentor: Divya Mohan, dmj.one}
}
```

A plain-text citation:

> Rohit Kumar and Divya Mohan. *SentinelCloud: An AI-Driven Autonomous DevOps Engineer with Adversarial Debate, Blast-Radius Gating, and Calibrated Confidence.* BTech CSE (Cloud Computing) Capstone, Shoolini University, Roll No. GF202220522. May 2026. https://sentinelcloud.dmj.one

---

## License

MIT License.

Copyright (c) 2026 Rohit Kumar and Divya Mohan (dmj.one).

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

*Dream, manifest, and journey, together as one with [dmj.one](https://dmj.one).*
