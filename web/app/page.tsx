import Link from 'next/link';
import { SCENARIOS } from '@/lib/scenarios';
import { ScenarioCard } from '@/components/ScenarioCard';
import { Stat } from '@/components/Stat';
import { Section } from '@/components/Section';

export const dynamic = 'force-static';

const gaps = [
  ['G1', 'Tool Selector Critic', 'A second small model verifies every tool call against the registry before dispatch.'],
  ['G2', 'Topology-Aware Reasoner', 'Logs, metrics and traces are joined over a service-graph, not in isolation.'],
  ['G3', 'Adversarial Debate', 'A Devil’s Advocate is contractually pinned to disagree, breaking groupthink.'],
  ['G4', 'Blast Radius Calculator', 'BFS over dependencies; actions above 70/100 are gated to humans.'],
  ['G5', 'Counterfactual Memory', 'Rejected alternatives are stored alongside accepted actions for next time.'],
  ['G6', 'Semantic Policy Engine', 'Plain-English constitution with deterministic and LLM-validated checks.'],
  ['G7', 'Deterministic Scenarios', 'Seeded fixtures so KPI claims are reproducible byte-for-byte.'],
  ['G8', 'Cost-Risk Optimizer', 'Pareto over price, eviction probability and workload tolerance.'],
  ['G9', 'Episodic Memory + PRM', 'Past resolutions retrieved by similarity. Per-step quality scored.'],
  ['G10', 'Confidence Calibration', 'Auto-act only above class-specific thresholds; below = human-on-the-loop.'],
  ['G11', 'WAF Rule Synthesizer', 'Given a CVE, drafts a ModSecurity / Cloud Armor rule with TTL and cite.'],
  ['G12', 'Multimodal Ingestor', 'OTLP, JSON logs, metrics, PR diffs, chat — one normalized envelope.'],
];

export default function Home() {
  return (
    <>
      <Hero />
      <Section
        kicker="The seven scenarios"
        title="Pick an incident. Watch the agents debate, decide and act."
        sub="Every scenario is a deterministic fixture. The same run will look the same to your reviewer and to the next person who clones the repo."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map(s => (
            <ScenarioCard
              key={s.id}
              id={s.id}
              title={s.title}
              oneLiner={s.oneLiner}
              severity={s.severity}
              category={s.category}
              signalCount={s.signals.length}
              groundTruthAction={s.groundTruthAction}
            />
          ))}
        </div>
      </Section>

      <Section
        kicker="The work"
        title="Twelve research gaps. Twelve modules. One closed loop."
        sub="Each module maps to a real, named gap that current AIOps work struggles with. Click into Architecture for the full mapping."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gaps.map(([id, name, desc]) => (
            <div key={id} className="glass p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-mono text-[var(--color-accent)]">{id}</span>
                <h3 className="text-[14.5px] font-semibold tracking-tight">{name}</h3>
              </div>
              <p className="mt-1.5 text-[13.5px] text-[var(--color-fg-2)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        kicker="What we measure"
        title="KPIs you can audit"
        sub="No vibes. Every claim is a number with a definition and a source-of-truth file."
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Stat label="MTTR (auto)" value="< 5 min" hint="incident start → fully resolved" accent="good" />
          <Stat label="Noise Reduction" value="> 90%" hint="alerts auto-suppressed or auto-resolved" accent="good" />
          <Stat label="Drift Latency" value="< 60 s" hint="manual change → AI reverts" accent="accent" />
          <Stat label="Deployment Success" value="> 99.9%" hint="no-rollback rate" accent="good" />
          <Stat label="Tool-Call Validity" value="> 99%" hint="critic-verified" accent="good" />
          <Stat label="Hallucination Rate" value="< 1%" hint="verifier disagreement" accent="warn" />
          <Stat label="Cost Saved" value="USD" hint="cumulative since deploy" accent="accent" />
          <Stat label="Confidence Calib." value="0.99" hint="critical-class threshold" accent="accent" />
        </div>
      </Section>

      <Section
        kicker="Open and reproducible"
        title="The whole thing is on GitHub."
        sub="Source, scenarios, prompts, KPI math — none of it is a black box. Fork it, run it, prove the numbers, write the next paper."
      >
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://github.com/divyamohan1993/sentinelcloud"
            target="_blank" rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-line-strong)] bg-white/[0.04] px-4 py-2.5 text-[14px] hover:bg-white/[0.08] transition-colors">
            View on GitHub
          </a>
          <Link href="/research"
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-accent-2)] px-4 py-2.5 text-[14px] text-white">
            Read the research report
          </Link>
          <Link href="/docs"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-line)] bg-transparent px-4 py-2.5 text-[14px] hover:bg-white/[0.04]">
            Deploy your own
          </Link>
        </div>
      </Section>
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="grid-bg absolute inset-0 opacity-50" />
      <div aria-hidden className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[var(--color-accent-2)]/30 blur-3xl" />
      <div aria-hidden className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[var(--color-accent)]/20 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 pt-16 md:pt-24 pb-12 md:pb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line-strong)] bg-white/[0.04] px-3 py-1 text-[11.5px] text-[var(--color-fg-2)]">
          <span className="dot live" /> Capstone v1.0 · May 2026 · BTech CSE Cloud Computing
        </div>
        <h1 className="mt-6 text-[44px] md:text-[64px] font-semibold tracking-tight leading-[1.04]">
          The autonomous DevOps engineer
          <br />
          <span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text text-transparent">that thinks before it acts.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-[15.5px] md:text-[16.5px] text-[var(--color-fg-2)] leading-relaxed">
          SentinelCloud is a closed-loop multi-agent system. It observes signals, debates the root cause, predicts the outcome of a fix, gates the action against a written constitution, and only then acts — or pauses for a human if it is not sure enough. Every step is logged, every claim is a measurable KPI.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/demo"
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-accent-2)] px-5 py-3 text-[15px] font-medium text-white shadow-[0_0_30px_rgba(124,92,255,0.4)]">
            Run a live demo
          </Link>
          <Link href="/architecture"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-line-strong)] bg-white/[0.04] px-5 py-3 text-[15px] hover:bg-white/[0.08] transition-colors">
            See the architecture
          </Link>
          <span className="text-[12.5px] text-[var(--color-fg-3)] ml-2">No login. No keys required.</span>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Stat label="Layers" value="3" hint="perception → reasoning → actuation" accent="accent" />
          <Stat label="Agents" value="6" hint="analyst, devil, safety, strategist, verifier, critic" accent="accent" />
          <Stat label="Scenarios" value="7" hint="reliability, FinOps, security, drift" accent="accent" />
          <Stat label="Gaps closed" value="12" hint="from 2025–2026 AIOps literature" accent="accent" />
        </div>
      </div>
    </section>
  );
}
