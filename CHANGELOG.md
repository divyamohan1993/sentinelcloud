# Changelog

All notable changes to SentinelCloud are documented here.
The format is loosely based on Keep a Changelog and the project follows
semantic versioning.

## v1.0.1 — 2026-05-03

### Performance
- Default Gemini models switched to `gemini-2.5-flash` for the heavier
  reasoning agents (analyst, devil, strategist, safety, verifier) and
  `gemini-2.5-flash-lite` for the fast lane (tool-call critic, narrator).
  Model names verified against Vertex AI publisher endpoint in
  `us-central1` returning HTTP 200.
- Full multi-agent run latency drops from roughly 80 to 100 seconds on
  Pro to roughly 12 to 20 seconds on Flash, with no measurable quality
  regression on the seeded scenarios.

### Reliability
- Auto-fallback to the deterministic stub when an LLM call returns an
  empty or malformed JSON payload, so the run never stalls on a
  transient model failure.
- Token budgets raised across the board (analyst 2048, strategist 2048,
  safety 2048, verifier 2048, devil 1536, narrator 1024, critic 768) to
  avoid `MAX_TOKENS` truncation.

## v1.0.0 — 2026-05-03

First public release.

### Architecture
- Three-layer brain: perception, reasoning, actuation. Source paths cited
  in `docs/ARCHITECTURE.md`.
- Six-agent state machine with a contractually pinned Devil's Advocate.
- Twelve gap-fix modules covering tool-call validation, blast radius,
  semantic policy, episodic memory, calibrated confidence, deterministic
  scenarios, multimodal ingestion, FinOps cost-risk tradeoffs, WAF
  synthesis, and a process reward model.

### Reasoning
- Gemini 2.5 Pro on Vertex AI as the default reasoner.
- Anthropic Claude as an optional second opinion.
- Deterministic scenario-aware stub as the always-on fallback.
- Provider and model surfaced on every agent turn so the demo never lies
  about who wrote the line.

### Scenarios
- Seven seeded fixtures: memory leak, database pool exhaustion, zero-day
  CVE, FinOps right-size, configuration drift, cascading failure,
  layer-7 anomaly. Each fixture is byte-stable.

### Deployment
- Cloud Run, asia-east1, project dmjone, min-instances 0.
- Production domain mapping for sentinelcloud.dmj.one (DNS pending).
- GitHub Actions CI for typecheck, build, and security scan.
- Zero open Dependabot alerts at release.
- npm overrides pinning postcss >= 8.5.10, uuid >= 14, and
  @tootallnate/once >= 3.0.1 to close known transitive CVEs.

### Documentation
- README (409 lines) for the public face.
- CAPSTONE_REPORT (1345 lines) for the examination committee.
- ARCHITECTURE, GAP_MATRIX, LITERATURE_REVIEW, DEPLOY, RUNBOOK, SECURITY.

### Author
Rohit Kumar (GF202220522), BTech CSE Cloud Computing,
Yogananda School of AI, Computers and Data Sciences, Shoolini University.
Capstone Mentor: _____________________.
