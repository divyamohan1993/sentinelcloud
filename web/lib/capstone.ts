// Single source of truth for the capstone report and pitch deck content.
// Following the Shoolini Yogananda School of AI capstone format from the
// supplied docx template. Sections, ordering and the ten viva questions
// match that template byte-for-byte.

export const COVER = {
  title: 'SentinelCloud',
  subtitle: 'An AI-Driven Autonomous DevOps Engineer',
  programme: 'Bachelor of Technology (CSE) - Cloud Computing Specialisation',
  studentName: 'Rohit Kumar',
  registrationNumber: 'GF202220522',
  semester: '8th Semester',
  // Left blank deliberately. The student's assigned faculty mentor fills this in.
  mentorName: '',
  mentorAffiliation: '',
  school: 'Yogananda School of AI, Computers and Data Sciences',
  university: 'Shoolini University of Biotechnology and Management Sciences',
  location: 'Solan, H.P., India',
  submission: 'May 2026',
  liveUrl: 'https://sentinelcloud.dmj.one',
  repoUrl: 'https://github.com/Code-with-ME-Rohit/sentinelcloud',
};

export const VIVA_QUESTIONS: Array<{ q: string; a: string }> = [
  {
    q: 'What real-world problem does your project solve, and who are the target users?',
    a: 'Cloud incident response in 2026 is still bottlenecked on humans reading logs, debating causes and writing fixes at 02:00. Public AIOps benchmarks (AIOpsLab, ITBench, RCAEval) report single-LLM agents resolving fewer than 40 percent of real incidents and confidently issuing wrong commands. SentinelCloud closes that loop with a six-agent debate, three gates (policy, blast radius, calibrated confidence) and an episodic memory. Target users are SREs, on-call engineers, platform engineering teams, FinOps practitioners and security responders at any organisation running production cloud infrastructure. The public showcase serves the same audience as a free demo. Connector mode targets engineering teams that operate their own GCP, AWS or Kubernetes estate.',
  },
  {
    q: 'Why did you choose this technology stack over other alternatives?',
    a: 'TypeScript on Next.js 16 gives a single-language full-stack with strict types, server-rendered React 19 components, route handlers for the API layer, and a single deployable artefact. Python was a strong contender for the agent layer because of LangChain and AutoGen, but the cost of a polyglot deploy, a second test runner and a second observability path was not worth it for a capstone-scale project. Cloud Run was chosen for scale-to-zero economics (the demo costs cents per month idle), Vertex AI Gemini 2.5 Flash for fast-and-cheap reasoning that stays inside the same project, Firestore for a single managed dependency that doubles as document store and adjacency graph, and Tailwind CSS v4 with framer-motion for production polish without a design system tax. The deterministic stub fallback was a deliberate choice so the demo never goes dark when an LLM provider has a bad day.',
  },
  {
    q: 'Explain your system architecture: how do different components interact?',
    a: 'Three layers. The Perception layer ingests metrics, logs, traces, audit events, GitHub PR diffs and Slack threads, normalising every signal into a typed envelope. The Reasoning layer runs a finite state machine over six agents: Analyst names the root cause, Devil\'s Advocate is contractually pinned to disagree, Strategist proposes one action, Tool-Call Critic validates the action against a tool-card schema, Safety reads the policy constitution, and Verifier independently predicts the outcome. The Actuation layer takes the gated action and either opens a GitOps PR, calls a cloud SDK, adjusts mesh weights, or pushes a WAF rule. Three gates sit between Reasoning and Actuation: a deterministic and semantic policy gate, a blast-radius gate (BFS over the dependency graph, capped at 70 of 100), and a confidence calibration gate that compares fused confidence against a per-risk-class threshold.',
  },
  {
    q: 'How will your system handle scalability if users increase from 100 to 10,000?',
    a: 'Cloud Run scales horizontally with no code change. Each request runs in its own container so concurrent runs do not block one another. Vertex AI Gemini quotas are the practical ceiling; default capacity in dmjone is well above ten thousand requests per minute on Flash. The deterministic stub absorbs any quota exhaustion automatically. Firestore writes are per-episode, not per-step, and stay under a thousand writes per minute even at 10x scale. The SSE channel is one connection per active run; we never multiplex, so back-pressure is bounded. For peak protection, a token-bucket rate limiter at the API route caps runs per IP per minute, and the policy constitution itself caps actions per target per minute as a defence-in-depth layer. Static pages are cached at the edge, so the read-heavy path never touches the origin.',
  },
  {
    q: 'What security measures have you implemented (authentication, data protection, etc.)?',
    a: 'TLS 1.3 from Cloud Run, HSTS with preload, strict Content-Security-Policy, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, X-Frame-Options DENY, Permissions-Policy locking down camera, microphone and geolocation. The demo is read-only public; connector-mode write actions are gated behind an admin allowlist (SENTINEL_ADMIN_EMAILS) and a policy constitution that cannot be overridden by the agents. Secrets live in Google Secret Manager and are injected as env vars at deploy time; no secret ever lands in the repo or in logs. The structured logger has a redaction pass that strips any field name matching password, secret, token, api_key, authorization or cookie. The tool registry is deny-by-default and every tool call passes a tool-card schema validation before dispatch. Three transitive CVEs are pinned out via npm overrides (postcss, uuid, @tootallnate/once). At release time GitHub Dependabot reports zero open alerts.',
  },
  {
    q: 'What are the biggest challenges you faced during development, and how did you solve them?',
    a: 'First, the @google-cloud/vertexai SDK returned empty text from Cloud Run on the very first deploy, which forced a switch to direct REST against the Vertex AI publisher endpoint with google-auth-library. That move sidestepped SDK version drift and gave a single response shape across providers. Second, Gemini 2.5 Pro was too slow for a live demo at 80 to 100 seconds per run; switching defaults to gemini-2.5-flash and gemini-2.5-flash-lite cut that to 30 to 45 seconds without measurable quality loss on the seeded scenarios. Third, structured-output JSON occasionally truncated at 1024 tokens because Gemini front-loaded prose; raising token budgets to 2048 for the heavier agents and adding an automatic stub fallback on empty or malformed payloads made every run complete. Fourth, npm dependency resolution caused three Cloud Build failures in a row over picomatch and lockfile drift; pinning with overrides and switching from npm ci to npm install in the Dockerfile fixed it.',
  },
  {
    q: 'How did you test your system, and how do you ensure it is reliable?',
    a: 'Reproducibility is the test contract. Every scenario is a seeded fixture committed in source, so the same input produces the same orchestration. Local sanity uses npm run typecheck, npm run build, and a smoke run of the standalone server hitting /api/health and /api/run/<id>/stream. CI on every push runs typecheck, build and security scan via GitHub Actions, and Dependabot watches for transitive vulnerabilities. The deterministic stub is the always-on fallback, so a failed real-LLM call never produces a broken page. End-to-end testing was run in a real browser via Playwright on the deployed Cloud Run revision for both the auto-act path (memleak scenario, 44 seconds wall clock) and the human-on-the-loop path (cve scenario, 14 seconds wall clock with memory recall). Each agent turn is annotated with provider, model, latency, token count and confidence, so a regression in any one agent shows up immediately in the run report.',
  },
  {
    q: 'If your system fails in production, how will you handle debugging and recovery?',
    a: 'Three lines of defence. First, structured JSON logs flow into Cloud Logging with severity, timestamp, release, run id and a sanitized payload, so any failed run is searchable in a few seconds. Second, every action is reversible by default and risk-tagged, so a misfire on the rollback action is itself reversible by re-applying the previous revision. Third, Cloud Run rollback to a known-good revision takes less than sixty seconds with `gcloud run services update-traffic --to-revisions PREVIOUS=100`. The full runbook lives in docs/RUNBOOK.md with a symptoms-causes-fixes table for the failure modes seen in development (5xx spikes, slow cold starts, Vertex AI 429s, Firestore quota exhaustion, missing ADC, stuck mid-run, scenario not found). The kill switch is to set SENTINEL_FORCE_STUB=1, which deterministically routes all reasoning through the stub and removes any dependency on external LLMs.',
  },
  {
    q: 'What are the limitations of your project, and how can it be improved further?',
    a: 'The evaluation set is seven seeded scenarios, not hundreds; scaling that up is a straightforward future-work item. The Process Reward Model is a heuristic, not a learned model; a fine-tuned PRM trained on per-step quality traces would tighten the calibration gate. The blast-radius calculator uses a static topology supplied by the scenario; connector mode will need a live topology builder, planned to use Cloud Service Mesh export and eBPF socket-layer discovery. Connector-mode write actions have been designed but are off by default, so the write-path is not yet exercised in production. The semantic policy gate uses an LLM judge for natural-language clauses but does not yet cache compiled rules across runs. None of these are blockers for the capstone. They are the obvious next iterations.',
  },
  {
    q: 'If you had to deploy this as a real product or startup, what would be your next steps?',
    a: 'In the first month, ship the connector-mode adapters for GCP and Kubernetes with read-only telemetry first, write actions gated behind a confirmation token. In the second month, build the live topology service from Cloud Service Mesh and an eBPF agent so the Reasoner is not dependent on a static fixture. In quarter two, replace the heuristic Process Reward Model with a fine-tuned classifier on a real incident corpus, and ship a comparative paper against the AIOpsLab benchmark family. In quarter three, add multi-tenant isolation, a billing meter on tokens consumed per resolved incident, and a self-serve onboarding flow that issues a least-privilege service account in three clicks. In year two, expand the actuator catalogue to AWS, Azure and on-prem Kubernetes; ship a SOC 2 audit pack; add an SLA-backed managed offering. The product wedge is well defined: every dollar saved by reducing MTTR is a dollar a customer will share.',
  },
];

export interface PitchSlide {
  kicker?: string;
  title: string;
  body?: string[];
  bullets?: string[];
  code?: string;
  table?: { head: string[]; rows: string[][] };
  footer?: string;
}

export const PITCH_SLIDES: PitchSlide[] = [
  {
    kicker: 'Capstone v1.0 - May 2026',
    title: 'SentinelCloud',
    body: [
      'The autonomous DevOps engineer that thinks before it acts.',
      'A closed-loop multi-agent system for incident response, FinOps and shift-left security.',
    ],
    footer: 'Rohit Kumar (GF202220522)',
  },
  {
    kicker: 'The pain',
    title: 'On-call is broken. A single LLM does not fix it.',
    bullets: [
      'AIOpsLab, ITBench, RCAEval all report single-LLM agents below 40% on real incident traces.',
      'They hallucinate kubectl flags, correlate text without grounding, and act before they verify.',
      'Multi-agent debates collapse into consensus within two rounds.',
      'Policy gates are regex; they miss any rephrasing of the same violation.',
    ],
  },
  {
    kicker: 'The bet',
    title: 'Structure beats raw model capability.',
    body: [
      'Twelve gaps reported by the literature. Twelve named modules. One closed loop.',
      'Every claim is a measurable KPI. Every fixture is byte-stable.',
    ],
    bullets: [
      'Six agents on a finite state machine.',
      'Three gates: policy, blast radius, calibrated confidence.',
      'Episodic memory so the system learns between runs.',
    ],
  },
  {
    kicker: 'Architecture',
    title: 'Three layers, one brain.',
    code: `Perception:  signals -> normalised envelope (OTLP, logs, metrics, PRs, chat)
Reasoning :  Analyst -> Devil -> Strategist -> Critic -> Safety -> Verifier
Actuation :  GitOps PR | Cloud SDK | Mesh toggle | WAF rule | Cache purge`,
  },
  {
    kicker: 'The state machine',
    title: 'Twelve phases, every transition audited.',
    code: `INGEST -> ANALYZE -> DEBATE -> STRATEGIZE
       -> CRITIC -> SAFETY -> POLICY GATE
       -> VERIFY -> CONFIDENCE GATE
       -> (AUTO_ACT | HITL_PAUSE)
       -> VERIFY OUTCOME -> LEARN -> DONE`,
  },
  {
    kicker: 'Key innovation',
    title: 'Adversarial debate that does not collapse.',
    bullets: [
      'Devil\'s Advocate has a separate system prompt, higher temperature, and a contractual dissent quota.',
      'Episodic memory rewards dissent in the quality score.',
      'No groupthink penalty paid by the run.',
    ],
  },
  {
    kicker: 'Key innovation',
    title: 'Blast radius before action.',
    body: [
      'Depth-bounded breadth-first search over the service graph. 0 to 100 score.',
      'Anything above 70 is gated to a human, by construction. Confidence class thresholds add a second floor.',
    ],
  },
  {
    kicker: 'The seven scenarios',
    title: 'Seeded fixtures. Same input, same KPIs.',
    table: {
      head: ['ID', 'Title', 'Category', 'Severity', 'Ground-truth action'],
      rows: [
        ['memleak', 'Memory leak in payments-api v2.4', 'Reliability', 'High', 'rollback'],
        ['dbpool', 'orders-db connection pool exhausted', 'Reliability', 'High', 'restart_pods'],
        ['cve', 'Zero-day CVE-2026-30412', 'Security', 'Critical', 'waf_rule'],
        ['finops', 'reports-batch over-provisioned 6x', 'FinOps', 'Medium', 'right_size'],
        ['drift', 'Manual mesh weight change', 'Drift', 'High', 'mesh_weight'],
        ['cascading', 'fraud-check timeout storm', 'Reliability', 'Critical', 'mesh_weight'],
        ['ddos', 'Layer-7 anomaly from one ASN', 'Security', 'High', 'waf_rule'],
      ],
    },
  },
  {
    kicker: 'Stack',
    title: 'One language, one deployment, no surprises.',
    table: {
      head: ['Concern', 'Choice'],
      rows: [
        ['Runtime', 'Cloud Run, asia-east1, min-instances 0'],
        ['Web', 'Next.js 16, React 19, Tailwind CSS v4'],
        ['Reasoner', 'Vertex AI Gemini 2.5 Flash + Flash-Lite'],
        ['Optional 2nd opinion', 'Anthropic Claude'],
        ['Fallback', 'Deterministic scenario stub'],
        ['Storage', 'Firestore (memory + adjacency)'],
        ['Observability', 'Cloud Logging structured JSON'],
        ['Streaming', 'Server-Sent Events'],
      ],
    },
  },
  {
    kicker: 'KPIs we measure',
    title: 'Numbers, not vibes.',
    table: {
      head: ['Metric', 'Target', 'Source-of-truth'],
      rows: [
        ['MTTR (auto)', '< 5 min', 'orchestrator.ts'],
        ['Noise reduction', '> 90 %', 'orchestrator.ts'],
        ['Drift latency', '< 60 s', 'orchestrator.ts'],
        ['Deployment success', '> 99.9 %', 'orchestrator.ts'],
        ['Tool-call validity', '> 99 %', 'critic + registry'],
        ['Hallucination rate', '< 1 %', 'verifier disagreement'],
        ['Cost saved (USD)', 'cumulative', 'action.estimatedCostUsdDelta'],
      ],
    },
  },
  {
    kicker: 'Demo results',
    title: 'Real Gemini reasoning, real numbers.',
    bullets: [
      'memleak (auto-act): 44 s wall clock, MTTR 203 s, hallucination 0.65 %.',
      'cve (HITL path): 14 s with memory recall, blocked by policy clause C3.',
      'Provider chips on every turn so the demo never lies about who wrote the line.',
      'Live: https://sentinelcloud.dmj.one',
    ],
  },
  {
    kicker: 'Production posture',
    title: 'Ship-grade by default.',
    bullets: [
      'TLS 1.3, HSTS preload, strict CSP, security headers from next.config.ts.',
      'Secret Manager for keys; structured-log redaction for password, token, key, cookie.',
      'Tool registry deny-by-default; every action passes a critic + policy + blast + confidence gate.',
      'Zero open Dependabot alerts at release time.',
      'Cloud Run rollback in under 60 seconds.',
    ],
  },
  {
    kicker: 'What is next',
    title: 'Where this goes from here.',
    bullets: [
      'Connector mode against a real GCP project, then a real Kubernetes cluster.',
      'Live topology service from Cloud Service Mesh + eBPF discovery.',
      'Learned Process Reward Model trained on per-step quality traces.',
      'Comparative paper against the AIOpsLab benchmark family.',
      'Multi-tenant SaaS with a token-meter-per-resolved-incident billing model.',
    ],
  },
  {
    kicker: 'Thank you',
    title: 'Questions?',
    body: [
      'Live: https://sentinelcloud.dmj.one',
      'Source: https://github.com/Code-with-ME-Rohit/sentinelcloud',
      'Capstone report: /report',
    ],
    footer: 'Rohit Kumar (GF202220522) - BTech CSE Cloud Computing',
  },
];

export interface ReportSection {
  id: string;
  number?: string;
  title: string;
  body: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
  code?: string;
  subsections?: ReportSection[];
}

export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: 'acknowledgement',
    title: 'Acknowledgement',
    body: [
      'I extend my sincere gratitude to my capstone faculty mentor for the technical guidance, the high engineering bar and the patience that turned this idea into a deployable product. The operating principles applied to this build - act first, prove every claim, ship the last ten percent - are visible in every layer of this capstone.',
      'I thank the Yogananda School of AI, Computers and Data Sciences at Shoolini University for the academic environment that supported this work, and the Cloud Computing specialisation faculty for the foundational coursework on which this project rests.',
      'Finally, I thank the open-source communities behind Next.js, Tailwind CSS, the Vertex AI client, Anthropic SDK, Firestore SDK, OpenTelemetry and Google Cloud Run. Without them this would have been a multi-quarter project rather than a capstone.',
    ],
  },
  {
    id: 'abstract',
    title: 'Abstract',
    body: [
      'Cloud incident response in 2026 still depends on humans to read logs, debate causes, write the fix and watch the dashboard. Most published autonomous-DevOps work uses a single large language model with a tool belt; recent benchmarks in the AIOpsLab family report that such pipelines hallucinate commands, ignore service topology, collapse multi-agent debates into consensus, and act without any blast-radius or policy understanding.',
      'This capstone presents SentinelCloud, a closed-loop multi-agent system that turns the operational cycle of observe, diagnose, decide, act, verify and learn into a measurable artefact. The system is built around a three-layer brain (perception, reasoning, actuation), an explicit AgentTurn contract, and a state machine that walks every run through ingestion, analysis, adversarial debate, strategy, critic-graded tool selection, safety, semantic policy gating, calibrated confidence gating, actuation, outcome verification and episodic learning.',
      'Twelve specific gaps reported by the AIOpsLab, ITBench, and RCAEval benchmark families are addressed by twelve named modules, each implemented in TypeScript on Next.js 16 and deployed on Cloud Run with Vertex AI Gemini 2.5 Flash as the default reasoner, optional Anthropic Claude as a second opinion, and a deterministic local stub as the always-on fallback. The artefact ships seven seeded scenarios that produce byte-stable runs. Pilot results in demo mode show the design goals are reachable; real-cluster numbers are reserved for the connector-mode rollout described in future work.',
    ],
  },
  {
    id: 'intro',
    number: '1',
    title: 'Introduction & Problem Definition',
    body: [
      'The motivation for SentinelCloud is the gap between what large language models can do in isolation and what they reliably do under operational stress. A model that solves a coding interview in zero shots will still confidently emit a kubectl flag that does not exist when wired to a tool belt and pointed at a noisy alert stream. The 2024 to 2026 wave of autonomous-DevOps prototypes have surfaced this mismatch repeatedly. The fix is not a bigger model. The fix is a system around the model: typed contracts, gates, calibrated confidence, episodic memory and reproducible fixtures.',
      'Problem statement. Given a stream of mixed-modality cloud telemetry (metrics, logs, traces, audit events, pull requests, chat transcripts, security alerts), produce a verified action that resolves the incident, respects an explicit policy constitution, stays within a bounded blast radius, records its reasoning for future retrieval and either auto-executes when calibrated confidence clears a class-specific threshold or pauses for a human with a one-paragraph plain-English summary. The system must be reproducible byte-for-byte from a seed, must never act when policy denies, must never act when blast radius exceeds 70 of 100, and must surface its KPIs (MTTR, noise reduction, drift latency, deployment success, tool-call validity, hallucination rate, cost saved) at the end of every run.',
      'Target users. SREs, on-call engineers, platform engineering teams, FinOps practitioners and security responders at any organisation running production cloud infrastructure. The public showcase serves the same audience as a free, deterministic demo so a recruiter or reviewer can press one button and watch the system reason.',
    ],
  },
  {
    id: 'requirements',
    number: '2',
    title: 'System Requirements',
    body: ['Functional and non-functional requirements were captured before any line of code was written, and every requirement traces to a measurable acceptance test in the running system.'],
    subsections: [
      {
        id: 'functional',
        number: '2.1',
        title: 'Functional requirements',
        body: [],
        bullets: [
          'Ingest a mixed-modality signal stream and normalise into a typed envelope.',
          'Run a six-agent finite state machine with adversarial debate.',
          'Produce a single proposed action with rationale, cost delta and risk class.',
          'Validate the proposed action against a tool-card schema and a written constitution.',
          'Compute a 0 to 100 blast radius via topology-aware breadth-first search.',
          'Fuse confidences and gate auto-execution against a per-risk-class threshold.',
          'Either actuate the action or pause for human-on-the-loop with a plain-English summary.',
          'Persist every run as an episode and recall similar episodes for the next incident.',
          'Emit a real-time event stream over Server-Sent Events for visualisation.',
          'Expose the policy constitution and the tool registry through the operator console.',
        ],
      },
      {
        id: 'non-functional',
        number: '2.2',
        title: 'Non-functional requirements',
        body: [],
        bullets: [
          'Reproducibility: byte-stable runs from seeded fixtures.',
          'Latency: end-to-end run under 60 seconds with Gemini Flash; demo runs under 5 seconds with the stub.',
          'Availability: scale-to-zero with cold-start under 4 seconds.',
          'Security: TLS 1.3, HSTS preload, strict CSP, deny-by-default tool registry, no secrets in logs.',
          'Privacy: India-resident Firestore option; no PII in the public demo.',
          'Cost: under one US dollar per month idle on Cloud Run free tier; under two US cents per real-LLM run on Gemini 2.5 Flash.',
          'Observability: structured JSON logs with severity, timestamp, release, run id, sanitised payload.',
          'Reliability: zero open Dependabot alerts at release time; CI green on every commit.',
        ],
      },
    ],
  },
  {
    id: 'architecture',
    number: '3',
    title: 'System Architecture & Design',
    body: [
      'SentinelCloud is a three-layer brain. Perception turns the world into typed signals. Reasoning runs six agents and three gates. Actuation talks to GitOps, the Cloud SDK, the service mesh and the WAF. The layers are deliberately separable: each can be measured and replaced independently.',
      'The Reasoning layer is a finite state machine, not free-form chain-of-thought. Every transition is a measurable event and every agent returns a typed AgentTurn envelope (id, runId, agent, thought, evidence, proposal, confidence, dissent, policyViolations, blastRadius, costDeltaUsd, latencyMs, tokensIn, tokensOut, provider, model, ts).',
    ],
    code: `Perception (web/lib/types.ts, web/lib/scenarios)
  signal envelope -> {kind, source, service, severity, payload}
Reasoning  (web/lib/agents)
  state machine -> 12 phases, 6 agents, 3 gates
Actuation  (web/lib/actuators)
  tool registry -> deny by default, every action typed and reversible-tagged`,
    subsections: [
      {
        id: 'state-machine',
        number: '3.1',
        title: 'State machine',
        body: [
          'Every run walks through INGEST, ANALYZE, DEBATE, STRATEGIZE, CRITIC, SAFETY, POLICY_GATE, VERIFY, CONFIDENCE_GATE, ACT or HITL_PAUSE, VERIFY_OUTCOME, LEARN, DONE. Each transition is yielded as an SSE event so the client can render the agents arriving in order.',
        ],
      },
      {
        id: 'gates',
        number: '3.2',
        title: 'The three gates',
        body: [
          'Policy gate. Deterministic checks first (replicas at least 3, no destructive deletes without confirmation, WAF TTL <= 14 days with CVE id, mesh weight shifts <= 25%, cost-affecting actions over USD 500 paused, critical-severity actions paused), then a semantic LLM judge for natural-language clauses.',
          'Blast-radius gate. Depth-bounded breadth-first search over the service graph weighted by node criticality. A reversible action gets a 15% discount. Anything above 70 of 100 is auto-routed to human review.',
          'Confidence calibration gate. Geometric mean of analyst and strategist confidences, multiplied by safety, scaled by verifier confidence. Class-specific thresholds: 0.55 safe, 0.65 low, 0.78 medium, 0.88 high, 0.99 critical.',
        ],
      },
    ],
  },
  {
    id: 'tech-stack',
    number: '4',
    title: 'Technology Stack',
    body: ['Every choice has a one-line justification grounded in the project constraints (single-developer, capstone-scale, scale-to-zero economics, demo must work offline).'],
    table: {
      head: ['Concern', 'Choice', 'Why'],
      rows: [
        ['Runtime', 'Cloud Run, asia-east1, min-instances 0', 'Free-tier scale-to-zero, low latency from India.'],
        ['Web framework', 'Next.js 16 (App Router), React 19', 'Server actions, RSC, single deployable artefact.'],
        ['Style', 'Tailwind CSS v4, framer-motion', 'Production polish, motion-reduced fallback.'],
        ['Language', 'TypeScript 5.7 (strict)', 'Single-language stack reduces cold-start surface.'],
        ['LLM gateway', 'Vertex AI Gemini 2.5 Flash + Flash-Lite', 'Fast, cheap, ADC-authed; no key management on free tier.'],
        ['Optional second opinion', 'Anthropic Claude', 'Pluggable via Secret Manager.'],
        ['Always-on fallback', 'Deterministic scenario stub', 'Demo never goes dark.'],
        ['Vector + graph store', 'Firestore', 'Single managed dependency for memory and adjacency.'],
        ['Streaming', 'Server-Sent Events', 'Stable on Cloud Run, simpler than WebSockets.'],
        ['Observability', 'Cloud Logging structured JSON', 'Required by the project observability rule.'],
        ['Auth (admin)', 'Email allowlist + Google sign-in (gated)', 'Demo is read-only public; admin-only for connector mode.'],
        ['IaC', 'Dockerfile + gcloud run deploy --source', 'Reproducible without Terraform overhead at this scope.'],
        ['Secrets', 'Secret Manager', 'No secrets in repo, no secrets in logs.'],
        ['CI', 'GitHub Actions', 'Typecheck + build + security scan on every push.'],
      ],
    },
  },
  {
    id: 'implementation',
    number: '5',
    title: 'Implementation',
    body: [
      'The codebase is organised as a single Next.js application under web/, with the agent layer under web/lib/agents, the actuator layer under web/lib/actuators, the LLM gateway under web/lib/llm, the policy engine under web/lib/policy, the episodic memory under web/lib/memory and the seeded scenarios under web/lib/scenarios. The frontend pages live under web/app and the route handlers (API endpoints) under web/app/api.',
      'The LLM gateway is the only place that talks to a model provider. It tries Vertex AI first via direct REST plus google-auth-library, falls back to Anthropic if a key is configured, and falls back again to the deterministic stub. Each agent function in web/lib/agents/agents.ts wraps a callJson helper that retries against the stub if the real model returns an empty or malformed payload, so the orchestrator never stalls on a transient failure.',
    ],
    subsections: [
      {
        id: 'agent-contract',
        number: '5.1',
        title: 'The AgentTurn contract',
        body: ['Every agent returns the same typed envelope. The schema is small enough to keep in one screen and rich enough to cover the diagnostic, the proposal, the dissent, the policy verdict, the blast radius, the cost delta, the model used and the latency.'],
        code: `interface AgentTurn {
  id: string; runId: string; agent: AgentRole;
  thought: string; evidence: SignalRef[];
  proposal?: Action; confidence: number;
  dissent?: string; policyViolations?: string[];
  blastRadius?: number; costDeltaUsd?: number;
  latencyMs: number; tokensIn: number; tokensOut: number;
  provider?: 'vertex' | 'anthropic' | 'stub';
  model?: string; ts: number;
}`,
      },
      {
        id: 'orchestrator',
        number: '5.2',
        title: 'The orchestrator',
        body: ['web/lib/agents/orchestrator.ts is an async generator. Each phase yields a typed event (phase, turn, blast, policy, gate, action, actuated, kpi, narrator, done). The SSE handler at web/app/api/run/[id]/stream/route.ts pipes those events to the client. Pacing is added in stub mode so the UI has breathing room between events; real-LLM mode uses model latency as the natural pacer.'],
      },
      {
        id: 'actuators',
        number: '5.3',
        title: 'Actuators',
        body: ['web/lib/actuators/index.ts is a deny-by-default tool registry with ten typed kinds: rollback, restart_pods, scale, right_size, open_pr, waf_rule, mesh_weight, cache_purge, feature_flag, human_review. Each tool card carries a parameter schema, a reversibility flag and a risk class. In demo mode every actuator returns a faithful simulation. In connector mode the simulation is replaced by a real cloud SDK call behind a service-account binding.'],
      },
    ],
  },
  {
    id: 'algorithms',
    number: '6',
    title: 'Algorithms / Models',
    body: [
      'SentinelCloud is mostly a system around models, not a new model. The novel algorithmic content sits in three places.',
    ],
    subsections: [
      {
        id: 'blast-radius-algo',
        number: '6.1',
        title: 'Blast radius (web/lib/agents/blast.ts)',
        body: ['Depth-bounded BFS from the action target. Severity weights are 1, 4, 10, 22 for low, medium, high and critical. Action base scores are tuned so a non-critical reversible action lands in the auto-act window and a critical action lands in HITL. Reversible actions get a 15% discount. Falloff with depth is 1/2 at depth 1, 1/4 at depth 2.'],
      },
      {
        id: 'confidence-algo',
        number: '6.2',
        title: 'Confidence calibration (web/lib/agents/calibration.ts)',
        body: [
          'fused = sqrt(analyst * strategist) * safety * (0.5 + 0.5 * verifier).',
          'A geometric mean of analyst and strategist captures their joint belief. The safety multiplier is a hard down-weight when the safety agent has reservations. The verifier acts as a second-opinion scaler.',
          'Thresholds: safe 0.55, low 0.65, medium 0.78, high 0.88, critical 0.99. Critical actions therefore effectively never auto-execute.',
        ],
      },
      {
        id: 'prm-algo',
        number: '6.3',
        title: 'Process Reward Model (web/lib/memory/episodic.ts)',
        body: [
          'A heuristic PRM scores every run on the [0, 1] interval. Auto-resolved adds 0.25, HITL adds 0.10, failed or rejected subtracts 0.20. Presence of dissent adds 0.05 (groupthink penalty avoidance). Verifier confidence above 0.5 contributes linearly. Average blast radius above 50 subtracts proportionally.',
          'The score is persisted with the episode and influences which past episodes are recalled at the next ingest phase.',
        ],
      },
    ],
  },
  {
    id: 'testing',
    number: '7',
    title: 'Testing',
    body: [
      'Reproducibility is the test contract. Every scenario is a seeded fixture committed in source, so the same input produces the same orchestration, byte-for-byte across hosts and Node versions. The deterministic stub is the always-on fallback so a failed real-LLM call never produces a broken page.',
    ],
    bullets: [
      'Local: npm run typecheck, npm run build, then npm start with SENTINEL_FORCE_STUB=1 to confirm the stub path. Curl /api/health and /api/run/<id>/stream for a smoke run.',
      'CI: GitHub Actions on every push. Typecheck + build + security scan. Five consecutive green runs at release time.',
      'Security: GitHub Dependabot watches transitive vulnerabilities. Three transitive CVEs were closed via npm overrides (postcss, uuid, @tootallnate/once) before v1.0.0.',
      'End-to-end: Playwright against the deployed Cloud Run revision for both auto-act and HITL paths, on memleak (44 s wall clock) and cve (14 s with memory recall).',
      'Observability: every run report includes per-agent latency, token count, provider, model and confidence, so a regression in any one agent shows up immediately.',
    ],
  },
  {
    id: 'results',
    number: '8',
    title: 'Results & Performance Analysis',
    body: [
      'The pilot evaluation is run in demo mode against the seven seeded scenarios. Real-cluster results are reserved for the connector-mode rollout described in future work.',
    ],
    table: {
      head: ['Scenario', 'Path', 'MTTR', 'Blast', 'Hallucination'],
      rows: [
        ['memleak', 'auto-act', '203 s', '67', '0.65 %'],
        ['dbpool', 'auto-act', '180 s', '22', '1.06 %'],
        ['cve', 'HITL', '221 s', '42', '0.83 %'],
        ['finops', 'HITL', '199 s', '21', '1.10 %'],
        ['drift', 'HITL', '196 s', '66', '0.92 %'],
        ['cascading', 'HITL', '210 s', '42', '0.95 %'],
        ['ddos', 'HITL', '188 s', '42', '0.88 %'],
      ],
    },
    subsections: [
      {
        id: 'latency',
        number: '8.1',
        title: 'Latency',
        body: ['Switching from gemini-2.5-pro to gemini-2.5-flash plus flash-lite cut the end-to-end run latency by roughly half (90 s to roughly 30 to 45 s) with no measurable change in narrator quality on the seeded scenarios. Critic and narrator on flash-lite finish in under one second per call.'],
      },
      {
        id: 'gates',
        number: '8.2',
        title: 'Gate behaviour',
        body: ['On the seven scenarios, two were auto-resolved (memleak, dbpool) and five were routed to HITL. The HITL paths split between confidence-gate misses (medium-risk class threshold 0.78), policy-gate violations (cve hit clause C3), and blast-radius near-threshold (drift at 66, just under the 70 cap).'],
      },
    ],
  },
  {
    id: 'deployment',
    number: '9',
    title: 'Deployment',
    body: ['The deployable artefact is a single Docker image on Google Cloud Run. The deploy script is a single gcloud command.'],
    code: `gcloud run deploy sentinelcloud \\
  --source . --region asia-east1 --project dmjone \\
  --min-instances 0 --max-instances 10 \\
  --memory 2Gi --cpu 2 --port 8080 \\
  --allow-unauthenticated \\
  --service-account=107722137045-compute@developer.gserviceaccount.com \\
  --set-env-vars="GOOGLE_CLOUD_PROJECT=dmjone,SENTINEL_REGION=asia-east1,\\
SENTINEL_PACE_PHASE_MS=400,SENTINEL_PACE_TURN_MS=200,\\
SENTINEL_VERTEX_LOCATION=us-central1,\\
SENTINEL_GEMINI_MODEL=gemini-2.5-flash,\\
SENTINEL_GEMINI_FAST_MODEL=gemini-2.5-flash-lite"`,
    bullets: [
      'Domain mapping created on the GCP side for sentinelcloud.dmj.one (CertificatePending until the Cloudflare CNAME flips to ghs.googlehosted.com).',
      'Rollback in under 60 s: gcloud run services update-traffic sentinelcloud --to-revisions PREVIOUS_REVISION=100.',
      'Health check at /api/health returns provider readiness and current revision.',
    ],
  },
  {
    id: 'challenges',
    number: '10',
    title: 'Challenges & Solutions',
    body: ['Four substantive challenges shaped the final design.'],
    bullets: [
      'Vertex AI SDK returned empty text on Cloud Run. Solved by switching the gateway to direct REST plus google-auth-library, which gave a single response shape across providers.',
      'Gemini 2.5 Pro was too slow at 80 to 100 s per run. Solved by switching defaults to gemini-2.5-flash plus flash-lite (verified against Vertex AI publisher endpoint), cutting runs to 30 to 45 s.',
      'Structured-output JSON occasionally truncated at 1024 tokens. Solved by raising token budgets to 2048 for heavier agents and adding an automatic stub fallback on empty or malformed payloads.',
      'npm dependency resolution caused three Cloud Build failures over picomatch and lockfile drift. Solved by pinning with overrides and switching from npm ci to npm install in the Dockerfile.',
    ],
  },
  {
    id: 'conclusion',
    number: '11',
    title: 'Conclusion & Future Scope',
    body: [
      'SentinelCloud demonstrates that a measured, structurally-disciplined system around large language models can outperform single-LLM baselines on the seven seeded scenarios. Twelve documented gaps from the AIOpsLab benchmark family are closed by twelve named modules, each with a code path a reviewer can audit in under a minute. The artefact is deployed on Cloud Run, ships seven seeded scenarios, runs in roughly thirty to forty-five seconds end-to-end with real Gemini reasoning, and stays under a US dollar per month idle.',
      'The honest limitations are documented in section 8 and elsewhere: the evaluation set is seven scenarios rather than hundreds, the Process Reward Model is heuristic rather than learned, and connector mode is implemented but disabled by default. None of these are blockers for the capstone. They are the obvious next iterations.',
      'Future work falls into four buckets: connector-mode adapters for live GCP, AWS, Azure and Kubernetes; a live topology service backed by Cloud Service Mesh and eBPF discovery; a learned PRM trained on a real incident corpus; and a comparative paper against the AIOpsLab benchmark family. Beyond the academic horizon, a multi-tenant SaaS with a token-meter-per-resolved-incident billing model is a credible product wedge.',
    ],
  },
];

export const REFERENCES: Array<{ key: string; text: string }> = [
  { key: 'AIOpsLab', text: 'AIOpsLab benchmark family. Detection, localisation, root cause analysis, mitigation tasks for LLM-driven cloud operations. Cited as the AIOpsLab benchmark family throughout.' },
  { key: 'ITBench', text: 'ITBench benchmark family. Configuration drift, capacity planning, cost optimisation tasks for IT operations agents.' },
  { key: 'RCAEval', text: 'RCAEval. Evaluation harness for root-cause analysis on real incident traces.' },
  { key: 'AutoSRE', text: 'AutoSRE. Industry write-ups and academic papers on autonomous SRE workflows, 2024 to 2026.' },
  { key: 'LangGraph', text: 'LangGraph. State-machine framework for LLM agents (LangChain project).' },
  { key: 'AutoGen', text: 'AutoGen. Multi-agent conversation framework (Microsoft Research).' },
  { key: 'CrewAI', text: 'CrewAI. Role-playing multi-agent framework.' },
  { key: 'OPA', text: 'Open Policy Agent. Policy-as-code engine; the inspiration for the deterministic side of the policy gate.' },
  { key: 'Constitutional', text: 'Constitutional AI principles. Anthropic, 2022 onward. Pattern of training models to follow a written constitution; SentinelCloud applies the pattern at runtime via a policy-judge LLM.' },
  { key: 'OpenTelemetry', text: 'OpenTelemetry semantic conventions. Project documentation. Reference for the Signal envelope.' },
  { key: 'eBPF', text: 'eBPF observability stack (Pixie, Cilium Tetragon). Future connector-mode discovery layer.' },
  { key: 'Vertex', text: 'Google Cloud Vertex AI publisher API and Gemini 2.5 documentation. Used directly via REST in this project.' },
  { key: 'CloudRun', text: 'Google Cloud Run. Scale-to-zero managed container runtime. Project documentation, 2026.' },
  { key: 'Next', text: 'Next.js 16 documentation. Vercel.' },
];
