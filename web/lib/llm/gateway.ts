// LLM gateway with three providers and a deterministic local stub.
// Order of preference: Vertex (Gemini) → Anthropic (Claude) → Stub.
// All callers go through this module so we can swap models from one place.
//
// Vertex AI is called via direct REST against the publishers/google/models
// endpoint, using Application Default Credentials from google-auth-library.
// This sidesteps SDK version drift and gives us a single response shape.

import { env } from '../env';
import { log } from '../telemetry/logger';

export interface LlmCallOpts {
  system: string;
  user: string;
  json?: boolean;          // ask the model to return strict JSON
  temperature?: number;
  maxOutputTokens?: number;
  fast?: boolean;          // use the cheap model
  allowedProviders?: ProviderId[];
}

export interface LlmResult {
  text: string;
  provider: ProviderId;
  model: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  stub?: boolean;
}

export type ProviderId = 'vertex' | 'anthropic' | 'stub';

const VERTEX_LOCATION = process.env.SENTINEL_VERTEX_LOCATION || 'us-central1';

let vertexAuth: any = null;
let vertexAuthBroken = false;
let anthropicClient: any = null;

async function getVertexAccessToken(): Promise<string | null> {
  if (vertexAuthBroken) return null;
  if (!vertexAuth) {
    try {
      const mod = await import('google-auth-library');
      vertexAuth = new mod.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    } catch (err) {
      log.warn('vertex_auth_init_failed', { err: String(err) });
      vertexAuthBroken = true;
      return null;
    }
  }
  try {
    const client = await vertexAuth.getClient();
    const tokenRes = await client.getAccessToken();
    return tokenRes?.token || null;
  } catch (err) {
    log.warn('vertex_auth_token_failed', { err: String(err) });
    vertexAuthBroken = true;
    return null;
  }
}

async function callVertex(opts: LlmCallOpts): Promise<LlmResult> {
  const t0 = Date.now();
  const token = await getVertexAccessToken();
  if (!token) throw new Error('vertex_no_token');
  const modelName = opts.fast ? env.GEMINI_FAST_MODEL : env.GEMINI_MODEL;
  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${modelName}:generateContent`;

  const body: any = {
    systemInstruction: { role: 'system', parts: [{ text: opts.system }] },
    contents: [{ role: 'user', parts: [{ text: opts.user }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      responseMimeType: opts.json ? 'application/json' : 'text/plain',
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 45_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`vertex_http_${res.status}: ${errBody.slice(0, 200)}`);
  }
  const json: any = await res.json();
  const candidate = json?.candidates?.[0];
  const finish = candidate?.finishReason as string | undefined;
  const text = candidate?.content?.parts?.map((p: any) => p?.text || '').join('') || '';
  const usage = json?.usageMetadata || {};
  if (!text && finish && finish !== 'STOP') {
    throw new Error(`vertex_empty_finish_${finish}`);
  }
  return {
    text,
    provider: 'vertex',
    model: modelName,
    latencyMs: Date.now() - t0,
    tokensIn: usage.promptTokenCount ?? 0,
    tokensOut: usage.candidatesTokenCount ?? 0,
  };
}

async function getAnthropic() {
  if (anthropicClient !== null) return anthropicClient;
  if (!env.ALLOW_CLAUDE) { anthropicClient = false; return false; }
  try {
    const mod = await import('@anthropic-ai/sdk');
    anthropicClient = new mod.default({ apiKey: env.CLAUDE_API_KEY });
    return anthropicClient;
  } catch (err) {
    log.warn('anthropic_init_failed', { err: String(err) });
    anthropicClient = false;
    return false;
  }
}

async function callAnthropic(opts: LlmCallOpts): Promise<LlmResult> {
  const t0 = Date.now();
  const client = await getAnthropic();
  if (!client) throw new Error('anthropic_unavailable');
  const res = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: opts.maxOutputTokens ?? 1024,
    temperature: opts.temperature ?? 0.4,
    system: opts.system + (opts.json ? '\nReturn ONLY a single JSON object. No prose.' : ''),
    messages: [{ role: 'user', content: opts.user }],
  });
  const text = (res.content?.[0]?.type === 'text' ? res.content[0].text : '') || '';
  return {
    text,
    provider: 'anthropic',
    model: env.CLAUDE_MODEL,
    latencyMs: Date.now() - t0,
    tokensIn: res.usage?.input_tokens ?? 0,
    tokensOut: res.usage?.output_tokens ?? 0,
  };
}

// Deterministic stub. Mirrors agent-shaped JSON so the demo works offline.
function callStub(opts: LlmCallOpts): LlmResult {
  const seed = (opts.system.length + opts.user.length) % 997;
  const role = detectRole(opts.system);
  const ctx = sniffScenario(opts.user);
  const text = opts.json
    ? JSON.stringify(stubJson(role, ctx, seed))
    : stubProse(role, ctx, seed);
  return {
    text,
    provider: 'stub',
    model: 'sentinel-stub-v1',
    latencyMs: 50 + (seed % 350),
    tokensIn: Math.max(1, Math.round(opts.user.length / 4)),
    tokensOut: Math.max(1, Math.round(text.length / 4)),
    stub: true,
  };
}

type StubRole = 'analyst' | 'devil' | 'safety' | 'strategist' | 'verifier' | 'critic' | 'narrator';

function detectRole(systemPrompt: string): StubRole {
  // Match the "You are the X agent" line, not bare keyword mentions
  // (every prompt may name other agents in passing).
  const s = systemPrompt.toUpperCase();
  if (/YOU ARE THE NARRATOR/.test(s) || /\bNARRATOR\b/.test(s.split('\n')[1] || s)) return 'narrator';
  if (/YOU ARE THE DEVIL'S ADVOCATE/.test(s)) return 'devil';
  if (/YOU ARE THE SAFETY/.test(s)) return 'safety';
  if (/YOU ARE THE VERIFIER/.test(s)) return 'verifier';
  if (/YOU ARE THE STRATEGIST/.test(s)) return 'strategist';
  if (/YOU ARE THE TOOL-CALL CRITIC/.test(s) || /YOU ARE THE CRITIC/.test(s)) return 'critic';
  if (/YOU ARE THE ANALYST/.test(s)) return 'analyst';
  if (s.includes('NARRATOR')) return 'narrator';
  if (s.includes("DEVIL'S ADVOCATE")) return 'devil';
  if (s.includes('SAFETY / COMPLIANCE')) return 'safety';
  if (s.includes('VERIFIER')) return 'verifier';
  if (s.includes('TOOL-CALL CRITIC')) return 'critic';
  if (s.includes('STRATEGIST AGENT')) return 'strategist';
  if (s.includes('ANALYST AGENT')) return 'analyst';
  return 'analyst';
}

type ScenarioCtx =
  | 'memleak' | 'dbpool' | 'cve' | 'finops' | 'drift' | 'cascading' | 'ddos' | 'generic';

function sniffScenario(userPrompt: string): ScenarioCtx {
  const u = userPrompt.toLowerCase();
  if (u.includes('cve-2026') || u.includes('libcrypto-flex')) return 'cve';
  if (u.includes('zero-day') || u.includes('libcrypto')) return 'cve';
  if (u.includes('credential-stuff') || u.includes('credential stuff') || u.includes('layer-7') || (u.includes('asn') && u.includes('checkout'))) return 'ddos';
  if (u.includes('manual mesh weight') || u.includes('out-of-band') || (u.includes('virtualservice') && u.includes('weights'))) return 'drift';
  if (u.includes('over-provisioned') || u.includes('right_size') || u.includes('right-size') || u.includes('cpu_p95_30d_pct')) return 'finops';
  if (u.includes('cascading failure') || u.includes('fraud-check timeout') || (u.includes('http_p99_ms') && u.includes('retry_rate_per_sec'))) return 'cascading';
  if (u.includes('connection pool') || u.includes('orders-db connection') || u.includes('pg_pool_active') || u.includes('pg_pool_wait_seconds')) return 'dbpool';
  if (u.includes('memory leak') || (u.includes('payments-api') && (u.includes('oomkilled') || u.includes('memory')))) return 'memleak';
  return 'generic';
}

function stubProse(role: StubRole, ctx: ScenarioCtx, seed: number): string {
  if (role === 'narrator') return narratorByCtx(ctx);
  return 'Acknowledged. Drafting an evidence-grounded response based on available signals.';
}

function narratorByCtx(ctx: ScenarioCtx): string {
  switch (ctx) {
    case 'memleak':
      return 'On-call summary: payments-api v2.4 introduced an unbounded in-memory cache. Heap climbed 5%/min on v2.4 pods, OOMKilled events triggered downstream timeouts to fraud-check. Rolled back to v2.3 with a 25% temporary memory bump; error rate returned to baseline within ninety seconds.';
    case 'dbpool':
      return 'On-call summary: orders-db connection pool reached saturation. Root cause traced to reports-batch leaking connections after long-running queries. Performed a rolling restart of reports-batch; pool wait time dropped below threshold within sixty seconds.';
    case 'cve':
      return 'On-call summary: CVE-2026-30412 path traversal in libcrypto-flex confirmed exploitable across payments-api, auth-svc and fraud-check. No upstream patch available. Pushed a Cloud Armor WAF rule with fourteen-day TTL referencing the CVE; suspicious header patterns now blocked at the edge.';
    case 'finops':
      return 'FinOps summary: reports-batch was over-provisioned 6x against thirty-day p95 utilisation. Right-sized requests/limits with reversibility preserved; projected savings ninety-six dollars per month with no observed performance regression.';
    case 'drift':
      return 'Drift summary: an out-of-band kubectl patch by user "intern@" had moved sixty percent of payments-api traffic to v2.4. SentinelCloud reverted the VirtualService weights through GitOps and opened an audit ticket; mean drift latency under sixty seconds.';
    case 'cascading':
      return 'On-call summary: fraud-check upstream latency spiked twelve-fold, triggering a payments-api retry storm and rapid SLO burn. Reduced mesh weight to fraud-check by twenty percent and enabled circuit-breaking; gateway error budget stabilised before depletion.';
    case 'ddos':
      return 'Security summary: anomalous eight-fold spike in /api/checkout requests from ASN 13335 with a seventy-one percent login-failure rate identified as credential stuffing. Pushed a rate-limit WAF rule scoped to that ASN with a fourteen-day TTL; auth-svc failure rate normalised within minutes.';
    default:
      return 'Run completed. SentinelCloud routed through six agents, validated the proposed action against the constitution, and either auto-actuated or paused for human-on-the-loop review.';
  }
}

function stubJson(role: StubRole, ctx: ScenarioCtx, seed: number): unknown {
  if (role === 'analyst') return analystByCtx(ctx, seed);
  if (role === 'devil')   return devilByCtx(ctx, seed);
  if (role === 'safety')  return { thought: 'Replicas remain >= 3; constitution clauses applicable returned no violations.', policyViolations: [], blastRadiusJustification: 'within tolerance for risk class', confidence: 0.9 };
  if (role === 'strategist') return strategistByCtx(ctx);
  if (role === 'verifier')   return verifierByCtx(ctx);
  if (role === 'critic')     return { thought: 'Tool kind matches registry; params satisfy schema.', valid: true, violations: [], confidence: 0.95 };
  if (role === 'narrator')   return { summary: narratorByCtx(ctx), confidence: 0.9 };
  return { thought: 'Acknowledged.', confidence: 0.7 };
}

function analystByCtx(ctx: ScenarioCtx, seed: number): unknown {
  switch (ctx) {
    case 'memleak': return {
      thought: 'Memory growth is restricted to v2.4 pods, beginning right after the deploy. Downstream timeouts to fraud-check follow the OOMKilled spikes.',
      hypothesis: 'Unbounded in-memory cache introduced in payments-api v2.4',
      evidence: [
        { signalId: 'sig-mem-1', why: 'memory.rss climbing 5%/min only on v2.4 pods' },
        { signalId: 'sig-restart-1', why: 'OOMKilled events restricted to v2.4 pods' },
        { signalId: 'sig-deploy-1', why: 'v2.4 rollout precedes the slope change' },
      ],
      confidence: 0.78 + ((seed % 17) / 100),
    };
    case 'dbpool': return {
      thought: 'orders-db pool saturation matches a connection count anomaly on reports-batch. payments-api errors are the symptom, not the source.',
      hypothesis: 'reports-batch is leaking pgsql connections after a long-running query path',
      evidence: [
        { signalId: 'sig-pool-2', why: 'active connections at 198/200' },
        { signalId: 'sig-conn-1', why: 'reports-batch open conns 76 vs normal 12' },
      ],
      confidence: 0.81,
    };
    case 'cve': return {
      thought: 'NVD advisory aligns with header parser path traversal observed in edge logs. SBOM lists three affected services.',
      hypothesis: 'CVE-2026-30412 exposure in libcrypto-flex 1.2.7 across payments-api, auth-svc, fraud-check',
      evidence: [
        { signalId: 'sig-cve-1', why: 'CVSS 9.8 advisory' },
        { signalId: 'sig-cve-2', why: 'matching exploit pattern in edge logs' },
        { signalId: 'sig-sbom-1', why: 'SBOM enumerates affected services' },
      ],
      confidence: 0.92,
    };
    case 'finops': return {
      thought: 'Thirty-day p95 utilisation is well under reservation; reports-batch consistently over-provisioned.',
      hypothesis: 'Static allocation greatly exceeds historical demand',
      evidence: [
        { signalId: 'sig-fin-1', why: 'cpu_p95_30d_pct = 4' },
        { signalId: 'sig-fin-2', why: 'mem_p95_30d_pct = 12' },
      ],
      confidence: 0.86,
    };
    case 'drift': return {
      thought: 'Audit log shows a manual VirtualService patch that drifted from IaC, then 5xx ratio increased.',
      hypothesis: 'Manual mesh weight change moved 60% traffic to a less-tested revision',
      evidence: [
        { signalId: 'sig-drift-1', why: 'kubectl patch by user intern@ on virtualservice' },
        { signalId: 'sig-drift-2', why: '5xx ratio rising post-change' },
      ],
      confidence: 0.83,
    };
    case 'cascading': return {
      thought: 'fraud-check p99 spike preceded the retry storm; SLO burn followed within minutes.',
      hypothesis: 'fraud-check upstream slowness amplified by payments-api retries',
      evidence: [
        { signalId: 'sig-casc-1', why: 'p99 4800ms vs baseline 380ms' },
        { signalId: 'sig-casc-2', why: 'retry rate 920/s' },
        { signalId: 'sig-casc-3', why: 'SLO burn rate 14.2x' },
      ],
      confidence: 0.84,
    };
    case 'ddos': return {
      thought: 'Single ASN dominates the request rate, paired with a high login-failure rate at auth-svc.',
      hypothesis: 'Credential-stuffing campaign from ASN 13335 targeting /api/checkout',
      evidence: [
        { signalId: 'sig-ddos-1', why: 'req rate 1240 vs baseline 150 from one ASN' },
        { signalId: 'sig-ddos-2', why: '9420 401s on /api/checkout' },
        { signalId: 'sig-ddos-3', why: 'login failure rate 0.71' },
      ],
      confidence: 0.88,
    };
    default: return {
      thought: 'Signals indicate a localised regression; root-cause grounded in topology adjacency.',
      hypothesis: 'See evidence and topology', evidence: [], confidence: 0.6 + ((seed % 9) / 100),
    };
  }
}

function devilByCtx(ctx: ScenarioCtx, _seed: number): unknown {
  switch (ctx) {
    case 'memleak': return { thought: 'Could also be downstream backpressure from fraud-check; verify queue depth before rollback.', alternativeHypothesis: 'fraud-check slowness creating apparent payments-api leak', dissent: 'Before rollback, confirm queue depth and fraud-check p99.', evidenceForAlternative: [{ signalId: 'sig-log-1', why: 'context deadline exceeded calling fraud-check' }], confidence: 0.55 };
    case 'dbpool': return { thought: 'Could be a single rogue query rather than a leak; review reports-batch slow-query log.', alternativeHypothesis: 'rogue long-running query holding connections', dissent: 'Restarting pods will mask the underlying query; capture EXPLAIN first.', evidenceForAlternative: [{ signalId: 'sig-log-2', why: '"too many clients" pattern is consistent with hot query, not leak' }], confidence: 0.5 };
    case 'cve': return { thought: 'Edge requests may be probes from a benign scanner; over-blocking risks legitimate traffic.', alternativeHypothesis: 'security scanner false positive', dissent: 'Pair WAF block with monitoring for false-positive rate before TTL extension.', evidenceForAlternative: [{ signalId: 'sig-cve-2', why: 'low absolute count, may be scanner noise' }], confidence: 0.4 };
    case 'finops': return { thought: 'Right-sizing now risks the nightly burst window where current allocation is barely sufficient.', alternativeHypothesis: 'p95 hides bursty p99 demand', dissent: 'Right-size against p99 burst, not p95.', evidenceForAlternative: [{ signalId: 'sig-fin-3', why: 'projected savings only worth it if p99 holds' }], confidence: 0.55 };
    case 'drift': return { thought: 'Reverting could undo a deliberate canary by another team; verify intent in change calendar.', alternativeHypothesis: 'unannounced canary by a peer team', dissent: 'Confirm with on-call before reverting; could be a coordinated experiment.', evidenceForAlternative: [{ signalId: 'sig-drift-1', why: 'intern@ may be acting on behalf of an SRE' }], confidence: 0.5 };
    case 'cascading': return { thought: 'Reducing mesh weight risks downstream fraud-tolerant payments accepting fraud.', alternativeHypothesis: 'partial outage masking real fraud signals', dissent: 'Couple weight reduction with stricter fraud heuristics on the remaining path.', evidenceForAlternative: [{ signalId: 'sig-casc-1', why: 'fraud-check still partially functional' }], confidence: 0.55 };
    case 'ddos': return { thought: 'Blocking an ASN risks blackholing legitimate users on a major CDN.', alternativeHypothesis: 'ASN includes legitimate CDN egress', dissent: 'Use a path-scoped rate limit rather than full ASN block.', evidenceForAlternative: [{ signalId: 'sig-ddos-2', why: 'requests are concentrated on one path' }], confidence: 0.6 };
    default: return { thought: 'A second hypothesis fits the evidence; consider it before acting.', alternativeHypothesis: 'alt cause', dissent: 'Confirm before acting.', evidenceForAlternative: [], confidence: 0.5 };
  }
}

function strategistByCtx(ctx: ScenarioCtx): unknown {
  switch (ctx) {
    case 'memleak': return {
      thought: 'Roll back v2.4 to v2.3, bump memory limit 25% temporarily, open a PR for cache eviction.',
      proposal: { kind: 'rollback', target: 'payments-api', params: { from: 'v2.4', to: 'v2.3', memoryBumpPct: 25 }, rationale: 'Restores known-good binary while a cache fix is authored.', estimatedCostUsdDelta: -120, reversible: true, riskClass: 'low' },
      confidence: 0.86,
    };
    case 'dbpool': return {
      thought: 'Rolling restart of reports-batch frees leaked connections without impacting pgsql writers.',
      proposal: { kind: 'restart_pods', target: 'reports-batch', params: { deployment: 'reports-batch', batchSize: 1 }, rationale: 'Clears leaked connections; safe for a non-critical batch service.', estimatedCostUsdDelta: 0, reversible: true, riskClass: 'low' },
      confidence: 0.88,
    };
    case 'cve': return {
      thought: 'Push a Cloud Armor WAF rule blocking the path-traversal pattern with a 14-day TTL referencing CVE.',
      proposal: { kind: 'waf_rule', target: 'edge-gateway', params: { cve: 'CVE-2026-30412', ruleExpr: '\\\\.\\\\./|%2e%2e/', ttlDays: 14 }, rationale: 'Holds the line until upstream patch lands.', estimatedCostUsdDelta: 0, reversible: true, riskClass: 'medium' },
      confidence: 0.9,
    };
    case 'finops': return {
      thought: 'Right-size reports-batch to 1 vCPU / 4 GB requests, 2 vCPU / 6 GB limits.',
      proposal: { kind: 'right_size', target: 'reports-batch', params: { deployment: 'reports-batch', cpu: '1000m', memory: '4Gi' }, rationale: 'Matches 30-day p99 with headroom.', estimatedCostUsdDelta: -96, reversible: true, riskClass: 'medium' },
      confidence: 0.83,
    };
    case 'drift': return {
      thought: 'Revert the VirtualService weights via GitOps and open an audit issue.',
      proposal: { kind: 'mesh_weight', target: 'payments-api', params: { vs: 'payments-api', dest: 'v23/v24', shiftPct: 10 }, rationale: 'Restores IaC-defined weights gradually within policy bound.', estimatedCostUsdDelta: 0, reversible: true, riskClass: 'medium' },
      confidence: 0.81,
    };
    case 'cascading': return {
      thought: 'Reduce mesh weight to fraud-check by 20% and turn on circuit-breaking.',
      proposal: { kind: 'mesh_weight', target: 'fraud-check', params: { vs: 'fraud-check', dest: 'primary', shiftPct: 20 }, rationale: 'Stops the retry storm without dropping fraud detection entirely.', estimatedCostUsdDelta: 0, reversible: true, riskClass: 'medium' },
      confidence: 0.82,
    };
    case 'ddos': return {
      thought: 'Push a path-scoped rate-limit WAF rule for ASN 13335 on /api/checkout.',
      proposal: { kind: 'waf_rule', target: 'edge-gateway', params: { cve: 'CVE-0000-0000', ruleExpr: 'asn:13335 path:/api/checkout', ttlDays: 14 }, rationale: 'Throttles credential stuffing without blocking legitimate users.', estimatedCostUsdDelta: 0, reversible: true, riskClass: 'medium' },
      confidence: 0.78,
    };
    default: return {
      thought: 'Pause for human review until evidence concentrates.',
      proposal: { kind: 'human_review', target: 'unknown', params: { reason: 'insufficient evidence' }, rationale: 'Routing to a human to avoid premature action.', estimatedCostUsdDelta: 0, reversible: true, riskClass: 'safe' },
      confidence: 0.6,
    };
  }
}

function verifierByCtx(ctx: ScenarioCtx): unknown {
  switch (ctx) {
    case 'memleak': return { thought: 'Predicted error rate < 0.5%, p95 < 220ms within 90s.', predictedKpis: { errorRatePct: 0.4, p95LatencyMs: 215, recoverySec: 90 }, disagreementPct: 6, confidence: 0.88 };
    case 'dbpool': return { thought: 'Pool wait time < 0.5s within 60s of restart.', predictedKpis: { errorRatePct: 0.6, p95LatencyMs: 230, recoverySec: 55 }, disagreementPct: 4, confidence: 0.9 };
    case 'cve': return { thought: 'Suspicious header pattern blocked at edge with negligible false positives.', predictedKpis: { errorRatePct: 0.1, p95LatencyMs: 200, recoverySec: 30 }, disagreementPct: 5, confidence: 0.86 };
    case 'finops': return { thought: 'Right-size has no measurable performance impact at observed p99.', predictedKpis: { errorRatePct: 0.2, p95LatencyMs: 190, recoverySec: 0 }, disagreementPct: 8, confidence: 0.78 };
    case 'drift': return { thought: 'Gradual weight shift restores IaC parity within policy bounds.', predictedKpis: { errorRatePct: 0.3, p95LatencyMs: 210, recoverySec: 60 }, disagreementPct: 7, confidence: 0.82 };
    case 'cascading': return { thought: 'Retry storm subsides as weights shift; SLO burn rate drops below 2x.', predictedKpis: { errorRatePct: 0.4, p95LatencyMs: 240, recoverySec: 80 }, disagreementPct: 9, confidence: 0.81 };
    case 'ddos': return { thought: 'Login-failure rate normalises; legitimate traffic unaffected.', predictedKpis: { errorRatePct: 0.2, p95LatencyMs: 200, recoverySec: 45 }, disagreementPct: 6, confidence: 0.85 };
    default: return { thought: 'Outcome uncertain; recommend HITL.', predictedKpis: { errorRatePct: 1.0, p95LatencyMs: 300, recoverySec: 120 }, disagreementPct: 20, confidence: 0.6 };
  }
}

export async function llm(opts: LlmCallOpts): Promise<LlmResult> {
  const allowed = opts.allowedProviders ?? ['vertex', 'anthropic', 'stub'];
  if (env.FORCE_STUB) return callStub(opts);

  const errors: Record<string, string> = {};
  if (allowed.includes('vertex') && env.ALLOW_VERTEX) {
    try { return await callVertex(opts); }
    catch (err) { errors.vertex = String(err); log.warn('vertex_call_failed', { err: errors.vertex }); }
  }
  if (allowed.includes('anthropic') && env.ALLOW_CLAUDE) {
    try { return await callAnthropic(opts); }
    catch (err) { errors.anthropic = String(err); log.warn('anthropic_call_failed', { err: errors.anthropic }); }
  }
  if (allowed.includes('stub')) return callStub(opts);
  throw new Error('llm_no_provider_available: ' + JSON.stringify(errors));
}

export function safeJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  try { return JSON.parse(text) as T; } catch {}
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as T; } catch { return null; }
}
