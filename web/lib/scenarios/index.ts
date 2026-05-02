// Deterministic scenario fixtures (Gap G7 — reproducibility).
// Each scenario is byte-for-byte stable so KPI claims are auditable.

import type { Scenario, Topology } from '../types';

const baseTopology: Topology = {
  nodes: [
    { id: 'gw', name: 'edge-gateway', kind: 'gateway', region: 'asia-east1', criticality: 'critical', monthlyCostUsd: 320 },
    { id: 'cdn', name: 'cdn-asia', kind: 'cdn', region: 'asia-east1', criticality: 'high', monthlyCostUsd: 110 },
    { id: 'web', name: 'web-frontend', kind: 'service', region: 'asia-east1', replicas: 6, criticality: 'high', monthlyCostUsd: 180 },
    { id: 'api', name: 'payments-api', kind: 'service', region: 'asia-east1', replicas: 5, criticality: 'critical', monthlyCostUsd: 410 },
    { id: 'auth', name: 'auth-svc', kind: 'service', region: 'asia-east1', replicas: 4, criticality: 'critical', monthlyCostUsd: 220 },
    { id: 'fraud', name: 'fraud-check', kind: 'service', region: 'asia-east1', replicas: 3, criticality: 'high', monthlyCostUsd: 260 },
    { id: 'cache', name: 'session-cache', kind: 'cache', region: 'asia-east1', criticality: 'high', monthlyCostUsd: 95 },
    { id: 'pgsql', name: 'orders-db', kind: 'database', region: 'asia-east1', criticality: 'critical', monthlyCostUsd: 540 },
    { id: 'mq', name: 'orders-queue', kind: 'queue', region: 'asia-east1', criticality: 'high', monthlyCostUsd: 70 },
    { id: 'reports', name: 'reports-batch', kind: 'service', region: 'asia-east1', replicas: 2, criticality: 'medium', monthlyCostUsd: 140 },
  ],
  edges: [
    { from: 'gw', to: 'cdn', rel: 'calls' }, { from: 'gw', to: 'web', rel: 'calls', rps: 1200 },
    { from: 'web', to: 'api', rel: 'calls', rps: 900 }, { from: 'web', to: 'auth', rel: 'calls', rps: 600 },
    { from: 'api', to: 'auth', rel: 'calls', rps: 800 }, { from: 'api', to: 'fraud', rel: 'calls', rps: 700 },
    { from: 'api', to: 'cache', rel: 'reads', rps: 1500 }, { from: 'api', to: 'pgsql', rel: 'writes', rps: 300 },
    { from: 'api', to: 'mq', rel: 'writes', rps: 200 }, { from: 'fraud', to: 'cache', rel: 'reads', rps: 500 },
    { from: 'reports', to: 'pgsql', rel: 'reads', rps: 30 },
  ],
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'memleak',
    title: 'Memory leak in payments-api v2.4',
    oneLiner: 'Heap climbs 5%/min only on v2.4 pods; OOMKilled events follow.',
    category: 'reliability',
    severity: 'high',
    groundTruthRootCause: 'Unbounded in-memory cache introduced in payments-api v2.4 deployment.',
    groundTruthAction: 'rollback',
    expectedKpiBoundsHint: 'MTTR < 5 min, blast radius ≤ 60.',
    topology: baseTopology,
    signals: [
      { id: 'sig-mem-1', ts: Date.now() - 11 * 60 * 1000, kind: 'metric', source: 'prometheus', service: 'payments-api', severity: 'medium', payload: { metric: 'process_resident_memory_bytes', value: 712_000_000, pod: 'payments-api-7c-v24', ratePctPerMin: 5.1 } },
      { id: 'sig-mem-2', ts: Date.now() - 6 * 60 * 1000, kind: 'metric', source: 'prometheus', service: 'payments-api', severity: 'high', payload: { metric: 'process_resident_memory_bytes', value: 1_180_000_000, pod: 'payments-api-7c-v24' } },
      { id: 'sig-restart-1', ts: Date.now() - 3 * 60 * 1000, kind: 'event', source: 'k8s', service: 'payments-api', severity: 'high', payload: { reason: 'OOMKilled', pod: 'payments-api-7c-v24', count: 4 } },
      { id: 'sig-deploy-1', ts: Date.now() - 70 * 60 * 1000, kind: 'event', source: 'argocd', service: 'payments-api', severity: 'low', payload: { revision: 'v2.4', user: 'cd-bot' } },
      { id: 'sig-trace-1', ts: Date.now() - 2 * 60 * 1000, kind: 'trace', source: 'otel', service: 'payments-api', severity: 'medium', payload: { spanName: 'cache.put', p99LatencyMs: 38, growthPctPerMin: 2.4 } },
      { id: 'sig-log-1', ts: Date.now() - 1 * 60 * 1000, kind: 'log', source: 'cloud-logging', service: 'payments-api', severity: 'high', payload: { msg: 'context deadline exceeded calling fraud-check', count: 217 } },
    ],
  },
  {
    id: 'dbpool',
    title: 'orders-db connection pool exhausted',
    oneLiner: 'Connection wait time spikes; reports-batch holding stale connections.',
    category: 'reliability',
    severity: 'high',
    groundTruthRootCause: 'reports-batch v0.9 leaks connections after a long-running query path.',
    groundTruthAction: 'restart_pods',
    topology: baseTopology,
    signals: [
      { id: 'sig-pool-1', ts: Date.now() - 7 * 60 * 1000, kind: 'metric', source: 'prometheus', service: 'orders-db', severity: 'high', payload: { metric: 'pg_pool_wait_seconds', value: 4.8 } },
      { id: 'sig-pool-2', ts: Date.now() - 3 * 60 * 1000, kind: 'metric', source: 'prometheus', service: 'orders-db', severity: 'critical', payload: { metric: 'pg_pool_active', value: 198, max: 200 } },
      { id: 'sig-conn-1', ts: Date.now() - 4 * 60 * 1000, kind: 'metric', source: 'prometheus', service: 'reports-batch', severity: 'medium', payload: { metric: 'pg_open_conns', value: 76, normalAvg: 12 } },
      { id: 'sig-log-2', ts: Date.now() - 90 * 1000, kind: 'log', source: 'cloud-logging', service: 'payments-api', severity: 'high', payload: { msg: 'pq: too many clients already', count: 412 } },
    ],
  },
  {
    id: 'cve',
    title: 'Zero-day CVE-2026-30412 in libcrypto-flex',
    oneLiner: 'Newly disclosed RCE; no patch yet. Fleet-wide WAF rule must hold the line.',
    category: 'security',
    severity: 'critical',
    groundTruthRootCause: 'CVE-2026-30412 path traversal in libcrypto-flex 1.2.x.',
    groundTruthAction: 'waf_rule',
    topology: baseTopology,
    signals: [
      { id: 'sig-cve-1', ts: Date.now() - 18 * 60 * 1000, kind: 'alert', source: 'nvd', service: 'edge-gateway', severity: 'critical', payload: { cve: 'CVE-2026-30412', cvss: 9.8, vector: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', summary: 'Path traversal in libcrypto-flex auth header parser' } },
      { id: 'sig-cve-2', ts: Date.now() - 8 * 60 * 1000, kind: 'log', source: 'edge-gateway', service: 'edge-gateway', severity: 'high', payload: { suspicious: 'X-Auth: ../../etc/passwd', count: 23 } },
      { id: 'sig-sbom-1', ts: Date.now() - 5 * 60 * 1000, kind: 'audit', source: 'sbom', service: 'fleet', severity: 'high', payload: { affected: ['payments-api', 'auth-svc', 'fraud-check'], lib: 'libcrypto-flex@1.2.7' } },
    ],
  },
  {
    id: 'finops',
    title: 'reports-batch over-provisioned by 6×',
    oneLiner: 'Average CPU 4%; nightly burst handled by a single pod. Right-size opportunity.',
    category: 'finops',
    severity: 'medium',
    groundTruthRootCause: 'Static 4 vCPU × 16 GB allocation; 30-day p95 utilization is 4% / 12%.',
    groundTruthAction: 'right_size',
    topology: baseTopology,
    signals: [
      { id: 'sig-fin-1', ts: Date.now() - 30 * 60 * 1000, kind: 'metric', source: 'cloud-monitoring', service: 'reports-batch', severity: 'low', payload: { metric: 'cpu_p95_30d_pct', value: 4 } },
      { id: 'sig-fin-2', ts: Date.now() - 30 * 60 * 1000, kind: 'metric', source: 'cloud-monitoring', service: 'reports-batch', severity: 'low', payload: { metric: 'mem_p95_30d_pct', value: 12 } },
      { id: 'sig-fin-3', ts: Date.now() - 30 * 60 * 1000, kind: 'metric', source: 'billing', service: 'reports-batch', severity: 'low', payload: { monthlyCostUsd: 142, projectedSavingsUsd: 96 } },
    ],
  },
  {
    id: 'drift',
    title: 'Manual mesh weight change detected',
    oneLiner: 'Out-of-band Istio change moved 60% traffic to canary. IaC reconciliation needed.',
    category: 'drift',
    severity: 'high',
    groundTruthRootCause: 'kubectl apply executed manually by user "intern@" at 03:14 UTC.',
    groundTruthAction: 'mesh_weight',
    topology: baseTopology,
    signals: [
      { id: 'sig-drift-1', ts: Date.now() - 2 * 60 * 1000, kind: 'audit', source: 'k8s-audit', service: 'payments-api', severity: 'high', payload: { user: 'intern@', verb: 'patch', resource: 'virtualservice', diff: { weights: { v23: 40, v24: 60 } } } },
      { id: 'sig-drift-2', ts: Date.now() - 90 * 1000, kind: 'metric', source: 'prometheus', service: 'payments-api', severity: 'medium', payload: { metric: 'http_5xx_ratio', value: 0.012 } },
    ],
  },
  {
    id: 'cascading',
    title: 'Cascading failure: fraud-check timeout',
    oneLiner: 'fraud-check 504s storm payments-api retries; gateway error budget burning fast.',
    category: 'reliability',
    severity: 'critical',
    groundTruthRootCause: 'fraud-check upstream model serving p99 spiked 12x; payments-api retry storm.',
    groundTruthAction: 'mesh_weight',
    topology: baseTopology,
    signals: [
      { id: 'sig-casc-1', ts: Date.now() - 4 * 60 * 1000, kind: 'metric', source: 'prometheus', service: 'fraud-check', severity: 'critical', payload: { metric: 'http_p99_ms', value: 4800, baseline: 380 } },
      { id: 'sig-casc-2', ts: Date.now() - 3 * 60 * 1000, kind: 'metric', source: 'prometheus', service: 'payments-api', severity: 'high', payload: { metric: 'retry_rate_per_sec', value: 920 } },
      { id: 'sig-casc-3', ts: Date.now() - 90 * 1000, kind: 'alert', source: 'slo', service: 'edge-gateway', severity: 'critical', payload: { sloId: 'gateway-availability-99.95', burnRate: 14.2 } },
    ],
  },
  {
    id: 'ddos',
    title: 'Layer-7 anomalous traffic from one ASN',
    oneLiner: 'Anomalous 8× spike in /api/checkout from a single ASN. Likely credential stuffing.',
    category: 'security',
    severity: 'high',
    groundTruthRootCause: 'Credential-stuffing campaign targeting /api/checkout from ASN 13335 IP range.',
    groundTruthAction: 'waf_rule',
    topology: baseTopology,
    signals: [
      { id: 'sig-ddos-1', ts: Date.now() - 6 * 60 * 1000, kind: 'metric', source: 'edge-gateway', service: 'edge-gateway', severity: 'high', payload: { metric: 'req_rate_by_asn{13335}', value: 1240, baseline: 150 } },
      { id: 'sig-ddos-2', ts: Date.now() - 4 * 60 * 1000, kind: 'log', source: 'edge-gateway', service: 'edge-gateway', severity: 'high', payload: { msg: '401 Unauthorized', count: 9420, path: '/api/checkout' } },
      { id: 'sig-ddos-3', ts: Date.now() - 60 * 1000, kind: 'metric', source: 'auth-svc', service: 'auth-svc', severity: 'medium', payload: { metric: 'login_failure_rate', value: 0.71 } },
    ],
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find(s => s.id === id);
}
