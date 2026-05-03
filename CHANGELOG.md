# Changelog

All notable changes to SentinelCloud are documented here.
The format is loosely based on Keep a Changelog and the project follows
semantic versioning.

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
School of Computing Science and Engineering, Galgotias University.
Mentor and build partner: Divya Mohan, dmj.one.
