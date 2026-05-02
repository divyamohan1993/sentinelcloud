'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Signal, Topology, RunReport } from '@/lib/types';

type Ev =
  | { type: 'phase'; phase: string }
  | { type: 'turn'; turn: any }
  | { type: 'memory'; episodeIds: string[] }
  | { type: 'blast'; score: number; reason?: string }
  | { type: 'policy'; allowed: boolean; violations: any[] }
  | { type: 'gate'; auto: boolean; threshold: number; reason: string; fusedConfidence: number }
  | { type: 'action'; action: any }
  | { type: 'actuated'; ok: boolean; details: string; artifact?: { type: string; ref: string; preview: string } }
  | { type: 'kpi'; kpis: RunReport['kpis'] }
  | { type: 'narrator'; summary: string }
  | { type: 'done'; report: RunReport }
  | { type: 'error'; message: string };

const PHASES = [
  ['ingest', 'Ingest signals'],
  ['analyze', 'Analyze'],
  ['debate', 'Adversarial debate'],
  ['strategize', 'Strategize'],
  ['verify', 'Tool-call critic'],
  ['safety', 'Safety review'],
  ['policy_gate', 'Policy gate'],
  ['confidence_gate', 'Confidence gate'],
  ['act', 'Act'],
  ['verify_outcome', 'Verify outcome'],
  ['learn', 'Learn'],
  ['done', 'Done'],
] as const;

const sevColor: Record<string, string> = {
  low: 'text-[#5ce1c7]', medium: 'text-[#ffc857]', high: 'text-[#ff9c64]', critical: 'text-[#ff6770]',
};

export function RunStage({ scenarioId, scenarioTitle, scenarioOneLiner, severity, signals, topology }: {
  scenarioId: string; scenarioTitle: string; scenarioOneLiner: string;
  severity: string; signals: Signal[]; topology: Topology;
}) {
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<Ev[]>([]);
  const [phase, setPhase] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => { eventSourceRef.current?.close(); }, []);

  function start() {
    setEvents([]); setError(null); setRunning(true); setPhase('ingest');
    const es = new EventSource(`/api/run/${scenarioId}/stream`);
    eventSourceRef.current = es;
    es.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data) as Ev;
        setEvents(prev => [...prev, ev]);
        if (ev.type === 'phase') setPhase(ev.phase);
        if (ev.type === 'error') setError(ev.message);
      } catch {}
    };
    es.addEventListener('end', () => { setRunning(false); es.close(); });
    es.addEventListener('error', () => { setRunning(false); es.close(); });
  }

  function reset() {
    eventSourceRef.current?.close();
    setRunning(false); setEvents([]); setPhase('idle'); setError(null);
  }

  useEffect(() => {
    if (!stageRef.current) return;
    stageRef.current.scrollTop = stageRef.current.scrollHeight;
  }, [events.length]);

  const turns = events.filter(e => e.type === 'turn').map((e: any) => e.turn);
  const blast = (events.find(e => e.type === 'blast') as any)?.score as number | undefined;
  const gate = events.find(e => e.type === 'gate') as any;
  const policy = events.find(e => e.type === 'policy') as any;
  const action = (events.find(e => e.type === 'action') as any)?.action;
  const actuated = events.find(e => e.type === 'actuated') as any;
  const kpis = (events.find(e => e.type === 'kpi') as any)?.kpis as RunReport['kpis'] | undefined;
  const narrator = (events.find(e => e.type === 'narrator') as any)?.summary as string | undefined;
  const memory = events.find(e => e.type === 'memory') as any;
  const done = events.some(e => e.type === 'done');

  const phaseIdx = useMemo(() => PHASES.findIndex(([p]) => p === phase), [phase]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <Link href="/demo" className="text-[13px] text-[var(--color-fg-2)] hover:text-white">← All scenarios</Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className={`text-[11px] uppercase tracking-widest ${sevColor[severity] ?? ''}`}>{severity} severity</div>
          <h1 className="text-[28px] md:text-[34px] font-semibold tracking-tight">{scenarioTitle}</h1>
          <p className="mt-1.5 text-[14px] text-[var(--color-fg-2)] max-w-3xl">{scenarioOneLiner}</p>
        </div>
        <div className="flex items-center gap-2">
          {!running && !done && (
            <button onClick={start} className="rounded-md bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-accent-2)] px-4 py-2 text-[14px] font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.35)]">Start run</button>
          )}
          {(running || done) && (
            <button onClick={reset} className="rounded-md border border-[var(--color-line-strong)] bg-white/[0.04] px-4 py-2 text-[14px] hover:bg-white/[0.08]">{running ? 'Stop' : 'Run again'}</button>
          )}
        </div>
      </header>

      {/* Phase strip */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5">
        {PHASES.map(([key, label], i) => {
          const reached = phaseIdx >= 0 && i <= phaseIdx;
          const current = i === phaseIdx;
          return (
            <div key={key}
              className={`text-[10.5px] uppercase tracking-wider px-2 py-1.5 rounded text-center ${
                current ? 'bg-[var(--color-accent)]/30 border border-[var(--color-accent)]/40 text-white' :
                reached ? 'bg-white/[0.06] border border-[var(--color-line-strong)] text-[var(--color-fg-2)]' :
                'bg-transparent border border-[var(--color-line)] text-[var(--color-fg-3)]'
              }`}>{label}</div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Live agent transcript */}
        <div className="glass p-4 lg:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Agent transcript</h2>
            <div className="text-[11.5px] text-[var(--color-fg-3)] flex items-center gap-2">
              {running && <><span className="dot live" /> streaming</>}
              {done && <span className="text-[var(--color-good)]">complete</span>}
            </div>
          </div>
          <div ref={stageRef} className="mt-3 max-h-[60vh] overflow-y-auto pr-1 space-y-3">
            {turns.length === 0 && !running && (
              <div className="text-[13.5px] text-[var(--color-fg-3)]">Click <span className="kbd">Start run</span> to begin.</div>
            )}
            {turns.map((t: any, i: number) => <TurnCard key={t.id ?? i} turn={t} />)}
            {error && <div className="text-[13px] text-[var(--color-bad)]">Error: {error}</div>}
            {narrator && (
              <div className="glass-strong p-4 mt-2">
                <div className="text-[10.5px] uppercase tracking-wider text-[var(--color-accent)]">Narrator summary</div>
                <p className="mt-1.5 text-[14px] leading-relaxed">{narrator}</p>
              </div>
            )}
          </div>
        </div>

        {/* Side panels */}
        <div className="space-y-4">
          <SignalPanel signals={signals} />

          <div className="glass p-4">
            <div className="text-[12px] uppercase tracking-wider text-[var(--color-fg-3)]">Blast radius</div>
            <BlastDial score={blast ?? 0} />
            {policy && (
              <div className="mt-4 pt-3 border-t border-[var(--color-line)]">
                <div className="text-[12px] uppercase tracking-wider text-[var(--color-fg-3)] mb-1.5">Policy gate</div>
                <div className={`text-[13.5px] ${policy.allowed ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]'}`}>
                  {policy.allowed ? 'Allowed by constitution' : `Blocked: ${policy.violations?.map((v:any)=>v.id).join(', ')}`}
                </div>
              </div>
            )}
            {gate && (
              <div className="mt-3 pt-3 border-t border-[var(--color-line)]">
                <div className="text-[12px] uppercase tracking-wider text-[var(--color-fg-3)] mb-1.5">Confidence gate</div>
                <div className="text-[13.5px]">
                  fused = <span className="font-mono text-white">{gate.fusedConfidence?.toFixed(2)}</span>
                  &nbsp;vs threshold <span className="font-mono">{gate.threshold?.toFixed(2)}</span>
                </div>
                <div className={`mt-1.5 text-[13px] ${gate.auto ? 'text-[var(--color-good)]' : 'text-[var(--color-warn)]'}`}>
                  {gate.auto ? 'Auto-act' : 'Human-on-the-loop'}
                </div>
                <div className="mt-1 text-[12px] text-[var(--color-fg-3)]">{gate.reason}</div>
              </div>
            )}
          </div>

          {action && (
            <ActionCard action={action} actuated={actuated} />
          )}

          {kpis && <KpiPanel kpis={kpis} />}

          <div className="glass p-4">
            <div className="text-[12px] uppercase tracking-wider text-[var(--color-fg-3)]">Memory recall</div>
            <div className="mt-1.5 text-[13.5px] text-[var(--color-fg-2)]">
              {memory ? `${(memory.episodeIds?.length ?? 0)} prior episodes recalled.` : 'idle'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TurnCard({ turn }: { turn: any }) {
  const role = turn.agent;
  const tone: Record<string, string> = {
    analyst: 'border-[var(--color-accent)]/30 text-[var(--color-accent)]',
    devil: 'border-[#ff6770]/40 text-[#ff6770]',
    safety: 'border-[#5ce1c7]/30 text-[#5ce1c7]',
    strategist: 'border-[var(--color-accent-2)]/40 text-[var(--color-accent-2)]',
    verifier: 'border-[#ffc857]/40 text-[#ffc857]',
    critic: 'border-[#aab1c5]/30 text-[#aab1c5]',
    narrator: 'border-white/30 text-white',
  };
  return (
    <div className="glass p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded border ${tone[role] || ''}`}>{role}</div>
        <div className="text-[11px] text-[var(--color-fg-3)] font-mono tabular-nums">
          conf {turn.confidence?.toFixed?.(2) ?? '—'} · {turn.latencyMs ?? 0}ms
        </div>
      </div>
      <p className="text-[13.5px] leading-relaxed text-[var(--color-fg-2)]">{turn.thought}</p>
      {turn.dissent && <p className="mt-2 text-[13px] text-[#ff9c64]"><b>Dissent:</b> {turn.dissent}</p>}
      {turn.policyViolations?.length > 0 && (
        <ul className="mt-2 text-[12.5px] text-[#ff6770] list-disc list-inside">
          {turn.policyViolations.map((v: string, i: number) => <li key={i}>{v}</li>)}
        </ul>
      )}
      {turn.evidence?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {turn.evidence.slice(0, 6).map((ev: any, i: number) => (
            <span key={i} className="text-[11px] font-mono text-[var(--color-fg-3)] border border-[var(--color-line)] rounded px-1.5 py-0.5">
              {ev.signalId}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SignalPanel({ signals }: { signals: Signal[] }) {
  return (
    <div className="glass p-4">
      <div className="text-[12px] uppercase tracking-wider text-[var(--color-fg-3)] mb-2">Signals ingested</div>
      <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
        {signals.map(s => (
          <li key={s.id} className="text-[12.5px] flex items-center justify-between gap-3">
            <span className="font-mono text-[var(--color-fg-3)]">{s.id}</span>
            <span className="text-[var(--color-fg-2)] truncate">{s.kind} · {s.service}</span>
            <span className={`text-[10.5px] uppercase ${
              s.severity === 'critical' ? 'text-[#ff6770]' :
              s.severity === 'high' ? 'text-[#ff9c64]' :
              s.severity === 'medium' ? 'text-[#ffc857]' : 'text-[#5ce1c7]'
            }`}>{s.severity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BlastDial({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const tone = pct > 70 ? 'var(--color-bad)' : pct > 40 ? 'var(--color-warn)' : 'var(--color-good)';
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[24px] font-semibold tabular-nums" style={{ color: tone }}>{pct}</span>
        <span className="text-[11.5px] text-[var(--color-fg-3)]">/ 100</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: tone }} />
      </div>
      <div className="mt-1.5 text-[11.5px] text-[var(--color-fg-3)]">{pct > 70 ? 'auto-gated to human' : 'within auto-act window'}</div>
    </div>
  );
}

function ActionCard({ action, actuated }: { action: any; actuated?: any }) {
  return (
    <div className="glass-strong p-4">
      <div className="text-[11px] uppercase tracking-wider text-[var(--color-accent)]">Final action</div>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-[13.5px] px-2 py-0.5 rounded bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 text-[var(--color-accent)]">
          {action.kind}
        </span>
        <span className="text-[14px] font-medium">{action.target}</span>
      </div>
      <p className="mt-2 text-[13.5px] text-[var(--color-fg-2)]">{action.rationale}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
        <span><span className="text-[var(--color-fg-3)]">risk</span> · <b>{action.riskClass}</b></span>
        <span><span className="text-[var(--color-fg-3)]">cost Δ</span> · <b className={Number(action.estimatedCostUsdDelta) < 0 ? 'text-[var(--color-good)]' : ''}>${action.estimatedCostUsdDelta}</b></span>
        <span><span className="text-[var(--color-fg-3)]">reversible</span> · <b>{action.reversible ? 'yes' : 'no'}</b></span>
      </div>
      {actuated?.artifact && (
        <pre className="code mt-3 whitespace-pre-wrap text-[12px]"><code>{actuated.artifact.preview}</code></pre>
      )}
      {actuated && (
        <div className="mt-2 text-[12.5px] text-[var(--color-fg-2)]">{actuated.details}</div>
      )}
    </div>
  );
}

function KpiPanel({ kpis }: { kpis: RunReport['kpis'] }) {
  const items: Array<[string, string, 'good' | 'warn' | 'accent']> = [
    ['MTTR', `${kpis.mttrSec}s`, 'good'],
    ['Noise reduction', `${kpis.noiseReductionPct}%`, 'good'],
    ['Drift latency', `${kpis.driftLatencySec}s`, 'accent'],
    ['Deployment success', `${kpis.deploymentSuccessPct}%`, 'good'],
    ['Tool-call validity', `${kpis.toolCallValidityPct}%`, 'good'],
    ['Hallucination', `${kpis.hallucinationRatePct}%`, 'warn'],
    ['Cost saved', `$${kpis.costSavedUsd}`, 'accent'],
  ];
  const tone: Record<string, string> = {
    good: 'var(--color-good)', warn: 'var(--color-warn)', accent: 'var(--color-accent)',
  };
  return (
    <div className="glass p-4">
      <div className="text-[12px] uppercase tracking-wider text-[var(--color-fg-3)] mb-2">Run KPIs</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {items.map(([k, v, t]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-[12.5px] text-[var(--color-fg-2)]">{k}</span>
            <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: tone[t] }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
