import { Section } from '@/components/Section';
import Link from 'next/link';

export const dynamic = 'force-static';

const kpis = [
  ['MTTR (auto)', '< 5 min', 'Time from incident detection to fully resolved without human touch.'],
  ['Noise Reduction', '> 90%', 'Fraction of alerts auto-suppressed or auto-resolved.'],
  ['Drift Latency', '< 60 s', 'Time between an out-of-band manual change and SentinelCloud reverting it.'],
  ['Deployment Success', '> 99.9%', 'Fraction of releases that did not need a rollback.'],
  ['Tool-Call Validity', '> 99%', 'Critic-verified rate of well-formed tool invocations.'],
  ['Hallucination Rate', '< 1%', 'Verifier disagreement above threshold flagged as hallucination.'],
  ['Cost Saved (USD)', 'cumulative', 'Sum of cost-delta on accepted actions (right-size, scale-down, spot moves).'],
];

const baselines = [
  ['Single-LLM zero-shot', 'No tools, no debate, free-form chain-of-thought.'],
  ['Single-LLM with tools', 'Tool calling but no critic, no policy gate.'],
  ['Naive debate (no devil)', 'Multiple agents but no contractually-pinned dissenter.'],
  ['SentinelCloud (this work)', 'Adversarial debate, blast radius, semantic policy, calibration, memory.'],
  ['Oracle upper bound', 'Cheats with the ground-truth scenario answer; reports the ceiling.'],
];

export default function Research() {
  return (
    <>
      <Section
        kicker="Research"
        title="Method, metrics, reproducibility."
        sub="The full report sits in the repo. This page is the executive summary you can read in five minutes."
      >
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <article className="glass p-5 prose-invert max-w-none">
            <h3 className="text-[18px] font-semibold mb-2">Problem statement</h3>
            <p className="text-[14.5px] text-[var(--color-fg-2)] leading-relaxed">
              Current AIOps prototypes excel in demos and break in production. They hallucinate commands,
              correlate text without grounding, and collapse into consensus when run as multi-agent debates.
              SentinelCloud is a closed-loop system that treats every step as a measurable contract.
            </p>

            <h3 className="text-[18px] font-semibold mt-6 mb-2">Approach</h3>
            <p className="text-[14.5px] text-[var(--color-fg-2)] leading-relaxed">
              A six-agent state machine separates analysis, dissent, planning, validation, safety, and outcome
              prediction. Actions pass a deterministic policy gate, a calibrated confidence gate, and a
              blast-radius gate before execution. Every run is logged as an episode for memory recall.
            </p>

            <h3 className="text-[18px] font-semibold mt-6 mb-2">Reproducibility</h3>
            <p className="text-[14.5px] text-[var(--color-fg-2)] leading-relaxed">
              Seven scenarios are seeded fixtures. Same input, same orchestrator, same KPIs. The LLM gateway
              has a deterministic stub fallback so the demo runs offline. Source code, prompts, and the policy
              constitution all live in the repo.
            </p>

            <h3 className="text-[18px] font-semibold mt-6 mb-2">Baselines we compare against</h3>
            <ul className="text-[14px] text-[var(--color-fg-2)] space-y-1.5">
              {baselines.map(([b, d]) => (
                <li key={b}><b className="text-[var(--color-fg)]">{b}</b>, {d}</li>
              ))}
            </ul>

            <h3 className="text-[18px] font-semibold mt-6 mb-2">Honest limitations</h3>
            <ul className="text-[14px] text-[var(--color-fg-2)] space-y-1.5 list-disc list-inside">
              <li>Demo runs against simulated topologies. Connector mode against a real GCP / K8s project is implemented but disabled by default.</li>
              <li>LLM cost depends on provider; the gateway falls back to a stub when no provider is reachable.</li>
              <li>The Process Reward Model is heuristic; a learned PRM is future work.</li>
              <li>Evaluation set is seven scenarios, not hundreds. Scale-out is straightforward but out of scope for the capstone window.</li>
            </ul>

            <h3 className="text-[18px] font-semibold mt-6 mb-2">Cite this work</h3>
            <pre className="code text-[12px] whitespace-pre-wrap"><code>{`@misc{kumar2026sentinelcloud,
  title  = {SentinelCloud: A Closed-Loop Multi-Agent System for Autonomous Cloud DevOps},
  author = {Kumar, Rohit},
  year   = {2026},
  note   = {BTech CSE Cloud Computing capstone, Shoolini University},
  url    = {https://sentinelcloud.dmj.one}
}`}</code></pre>
          </article>

          <aside className="space-y-4">
            <div className="glass p-5">
              <h3 className="text-[15px] font-semibold mb-3">Key Performance Indicators</h3>
              <ul className="space-y-3">
                {kpis.map(([k, v, d]) => (
                  <li key={k}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13.5px] font-medium">{k}</span>
                      <span className="text-[13.5px] font-semibold tabular-nums text-[var(--color-accent)]">{v}</span>
                    </div>
                    <p className="text-[12.5px] text-[var(--color-fg-3)] leading-relaxed">{d}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass p-5">
              <h3 className="text-[15px] font-semibold mb-2">Read more</h3>
              <ul className="space-y-1.5 text-[13.5px]">
                <li><a className="underline" href="https://github.com/Code-with-ME-Rohit/sentinelcloud/blob/main/docs/CAPSTONE_REPORT.md">Full capstone report</a></li>
                <li><a className="underline" href="https://github.com/Code-with-ME-Rohit/sentinelcloud/blob/main/docs/GAP_MATRIX.md">Gap matrix</a></li>
                <li><a className="underline" href="https://github.com/Code-with-ME-Rohit/sentinelcloud/blob/main/docs/LITERATURE_REVIEW.md">Literature review</a></li>
                <li><Link className="underline" href="/architecture">Architecture overview</Link></li>
                <li><Link className="underline" href="/docs">Deploy / Run / Connector</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
