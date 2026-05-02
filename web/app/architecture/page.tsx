import { Section } from '@/components/Section';

export const dynamic = 'force-static';

const layers = [
  {
    name: 'Perception',
    desc: 'Multimodal ingestion. OTLP traces, JSON logs, Prometheus metrics, GitHub PR diffs, Slack threads — every stream becomes a uniform Signal.',
    items: ['OTLP receiver', 'Log shipper', 'Metrics scraper', 'GitHub webhook', 'Slack/Teams adapter'],
  },
  {
    name: 'Reasoning',
    desc: 'A finite state machine over six agents: Analyst, Devil’s Advocate, Strategist, Tool-Call Critic, Safety, Verifier — plus a Narrator for human summaries.',
    items: ['Analyst', 'Devil’s Advocate', 'Strategist', 'Critic', 'Safety / Compliance', 'Verifier', 'Narrator'],
  },
  {
    name: 'Actuation',
    desc: 'Every action goes through a tool registry with deny-by-default policy. Real cluster connectors are pluggable; demo uses faithful simulations.',
    items: ['GitOps PR opener', 'Cloud SDK shim', 'Mesh weight toggler', 'WAF rule writer', 'Cache purger', 'Feature-flag flipper'],
  },
];

const phases = [
  { name: 'INGEST', what: 'Normalize signals; recall episodic memory.' },
  { name: 'ANALYZE', what: 'Analyst hypothesises root cause grounded in signals.' },
  { name: 'DEBATE', what: 'Devil’s Advocate disagrees by contract; groupthink penalty paid up front.' },
  { name: 'STRATEGIZE', what: 'Strategist proposes one action with rationale, cost delta, risk.' },
  { name: 'CRITIC', what: 'Tool-call critic validates the proposed action against its tool card.' },
  { name: 'SAFETY', what: 'Safety agent reads the constitution and lists violations or returns []. ' },
  { name: 'POLICY GATE', what: 'Deterministic + LLM policy checks. If any clause fails, route to human review.' },
  { name: 'VERIFY', what: 'Verifier independently predicts the outcome; disagreement >X% blocks auto-act.' },
  { name: 'CONFIDENCE GATE', what: 'Fused calibrated confidence vs. risk-class threshold + blast radius.' },
  { name: 'ACT', what: 'Either auto-actuate or pause for human-on-the-loop with a natural-language summary.' },
  { name: 'VERIFY OUTCOME', what: 'Compare predicted vs. observed KPIs; adjust calibration.' },
  { name: 'LEARN', what: 'Episode + rejected alternatives + quality score persisted to memory.' },
];

const gaps = [
  ['G1', 'Single-LLM hallucinated commands', 'Tool Selector Critic'],
  ['G2', 'Brittle root-cause analysis', 'Topology-Aware Reasoner'],
  ['G3', 'Debate collapses to consensus', 'Adversarial Debate'],
  ['G4', 'No blast-radius awareness', 'Blast Radius Calculator'],
  ['G5', 'No counterfactual reasoning', 'Counterfactual Memory'],
  ['G6', 'Regex-only policy gates', 'Semantic Policy Engine'],
  ['G7', 'Non-reproducible benchmarks', 'Deterministic Scenario Engine'],
  ['G8', 'FinOps ignores eviction risk', 'Cost-Risk Optimizer'],
  ['G9', 'No learning loop', 'Episodic Memory + PRM'],
  ['G10', 'Uncalibrated confidence', 'Confidence Calibration Gate'],
  ['G11', 'Reactive security', 'WAF Rule Synthesizer'],
  ['G12', 'Single-modal ingestion', 'Multimodal Ingestor'],
];

export default function Architecture() {
  return (
    <>
      <Section
        kicker="Architecture"
        title="The three-layer brain."
        sub="Seeing is one layer. Thinking is another. Acting is a third. SentinelCloud separates them so each can be measured and replaced independently."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {layers.map(l => (
            <div key={l.name} className="glass p-5">
              <div className="text-[11px] uppercase tracking-widest text-[var(--color-accent)]">{l.name}</div>
              <p className="mt-2 text-[14px] text-[var(--color-fg-2)] leading-relaxed">{l.desc}</p>
              <ul className="mt-3 space-y-1 text-[12.5px] text-[var(--color-fg-2)]">
                {l.items.map(i => <li key={i}>· {i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section
        kicker="State machine"
        title="One run, twelve phases, every phase audited."
        sub="A run is not free-form chain-of-thought. It is a finite state machine. Every transition is a measurable, replayable event."
      >
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {phases.map((p, i) => (
            <li key={p.name} className="glass p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-mono text-[var(--color-fg-3)]">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[12.5px] font-semibold tracking-wider uppercase">{p.name}</span>
              </div>
              <p className="text-[13.5px] text-[var(--color-fg-2)] leading-relaxed">{p.what}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        kicker="The honest map"
        title="Twelve gaps. Twelve modules."
        sub="Each gap is a documented criticism of current AIOps work. Each module is the file that closes it."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px] text-left">
            <thead className="text-[11.5px] uppercase tracking-wider text-[var(--color-fg-3)]">
              <tr>
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Gap</th>
                <th className="py-2 pr-4">Module</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {gaps.map(([id, gap, mod]) => (
                <tr key={id}>
                  <td className="py-2.5 pr-4 font-mono text-[var(--color-accent)]">{id}</td>
                  <td className="py-2.5 pr-4 text-[var(--color-fg-2)]">{gap}</td>
                  <td className="py-2.5 pr-4 text-[var(--color-fg)]">{mod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
