# Literature Review

**Project:** SentinelCloud
**Author:** Rohit Kumar (BTech CSE, GF202220522)
**Capstone Mentor:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Submission:** May 2026

This review situates SentinelCloud against the body of work on autonomous remediation, multi-agent LLM frameworks, AIOps benchmarks, policy as code, observability, and FinOps. The aim is to be honest about what is settled, what is contested, and where the present capstone makes its modest contribution. References use a keyed `[Author Year]` form. Entries marked *uncertain* indicate that the author has read summaries or vendor write-ups but cannot vouch for a specific paper title or DOI; these are flagged rather than fabricated.

## 1. Scope and method

The search covered work published or widely circulated between January 2023 and April 2026, in the following areas:

1. autonomous remediation, AIOps, self-healing systems
2. multi-agent LLM frameworks and orchestration
3. agent benchmarks for incident response and root-cause analysis
4. policy as code and Constitutional AI
5. observability foundations (OpenTelemetry, eBPF, semantic conventions)
6. FinOps and right-sizing literature

Sources consulted: arXiv (cs.AI, cs.SE, cs.DC), USENIX OSDI / NSDI / ATC proceedings, ACM SIGOPS proceedings (HotOS, SOSP), the OpenTelemetry specification site, Cloud Native Computing Foundation white papers, the FinOps Foundation surveys, vendor engineering blogs (Google SRE, AWS, Microsoft Azure SRE), and a small set of publicly archived incident post-mortems.

Excluded from scope:

- Rule-based legacy AIOps that predates LLM use
- Closed-source vendor agents whose internals are not described in public writing
- Pure prompt-engineering tutorials with no measurement
- Papers behind paywalls where no preprint is available

A note on honesty. Some claims below were verified against the original paper. Others are my best understanding from secondary sources. I mark the latter explicitly. The undergraduate capstone deadline does not justify pretending to first-hand familiarity with papers I have not actually read.

## 2. Autonomous remediation surveys

The autonomous remediation field sits between two longer-standing traditions. On one side, classical AIOps with rule engines, anomaly detectors, and runbook automation. On the other, the LLM-agent line that begins roughly with the public release of capable function-calling models in 2023. The 2024 to 2026 surveys (referenced as [AIOps-Survey 2024], [AIOps-Survey 2025], *both uncertain on exact venue*) try to bridge the two and tend to converge on three concerns:

First, **grounding**. LLMs hallucinate when they reason over text-only telemetry. Surveys repeatedly call for graph-grounded reasoning that joins logs, metrics, and traces over a service topology. SentinelCloud's `runAnalyst` follows that recommendation directly.

Second, **safety**. Autonomous action is regularly cited as the unsolved problem. Surveys note that schema validation alone is not enough and that some form of policy gate plus blast-radius reasoning is needed. Both are present in this work.

Third, **learning loops**. The literature is honest that most deployed agents do not learn between incidents. A persistent episodic store with a per-step reward signal is the recurring recommendation.

A separate strand of work, sometimes called *self-healing* or *closed-loop SRE*, originates from the Google SRE handbook tradition and the Borg / Omega papers. That tradition predates LLMs but informed the closed-loop framing (`observe to diagnose to decide to act to verify to learn`) used in `ARCHITECTURE.md`.

## 3. Multi-agent LLM frameworks

Four frameworks dominate the public conversation in early 2026. Each has a different stance on state, tool use, and inter-agent contracts. Versions are deliberately not cited; this field moves too fast and miscitation would be worse than honest abstraction.

**LangGraph.** A graph-shaped state machine over LangChain primitives. State is explicit and typed. Each node is a function or an LLM call; edges are conditional transitions. The model is well suited to deterministic orchestration where the control flow matters as much as the agent reasoning. SentinelCloud's orchestrator (`web/lib/agents/orchestrator.ts`) follows this pattern explicitly: phases are an enum, transitions are conditional on policy and confidence gates, and the state is passed as `turns[]` rather than as a hidden context.

**AutoGen (Microsoft).** Strength is conversational multi-agent dialogue. Agents talk to each other in turns, and the framework provides a default group-chat manager. Better at debate-style topologies than at strict pipelines. SentinelCloud's adversarial debate (Analyst vs Devil's Advocate) is conceptually similar; the difference is that we run debate as one phase inside a larger state machine rather than as the whole architecture.

**CrewAI.** Sells the role-based abstraction. Agents are described by roles, goals, and tools; a "crew" is a configured group. Lower control over state machine semantics than LangGraph but lower setup cost. SentinelCloud uses role separation in the same spirit (Analyst, Devil, Strategist, Safety, Verifier, Critic, Narrator) but treats each role as a stateless function rather than a stateful agent object.

**OpenAI Swarm.** A minimal orchestration library that emphasises agent handoffs. Conceptually closer to "function call but the function is another agent". Lighter-weight than LangGraph or AutoGen; popular for rapid prototyping. SentinelCloud is not a Swarm clone but shares the principle that an agent invocation is a small, typed thing rather than a long-running stateful object.

A fair reading of the four is that none provides built-in support for the four hardest gaps in this domain: blast-radius gating, calibration-aware auto-act gates, adversarial-dissent contracts, and policy-as-code with constitutional clauses. Each can be retrofitted; none ships with these as primitives. SentinelCloud's contribution is to wire all four into one orchestrator.

## 4. Benchmarks

Three benchmarks recur in agent papers from 2024 onward. I describe each by what it measures, with explicit uncertainty markers where my reading is second-hand.

**AIOpsLab.** A benchmark family from the AIOps research community focused on closed-loop incident response. Measures, in broad terms: detection latency, root-cause precision, action selection accuracy, and end-to-end MTTR on simulated incidents. The benchmark is widely cited. *I have not run AIOpsLab myself; the description is based on the published abstract and follow-on commentary.*

**ITBench.** A collection of IT-operations tasks for evaluating LLM agents. Categories I have seen named include log triage, alert correlation, and runbook execution. *Uncertain on the exact set of tasks and on the scoring rubric. I would not cite a specific number from ITBench without re-reading the paper.*

**RCAEval.** A root-cause-analysis-focused benchmark. Measures whether an agent can identify the originating service or component given a multi-modal trace. The recurring critique reproduced in summaries is that scores below 40 percent on real production traces are common. *Uncertain on the exact reference; I have seen the benchmark name in survey papers but have not held a copy of the original paper.*

The honest position is that these benchmarks are reference points, not yardsticks I claim to beat. SentinelCloud's evaluation rig (`web/lib/scenarios`) is a small reproducibility-first scenario set sized to a capstone, not an attempt to score on AIOpsLab proper. A future contribution would be to wire SentinelCloud into the AIOpsLab driver and report numbers.

## 5. Constitutional AI and policy as code

This area pulls from two distinct traditions.

**Policy as code.** OPA (Open Policy Agent) and the Rego language are the de-facto open standard. Cedar, AWS's policy language, occupies a similar slot for IAM-like decisions. Both express policy as evaluable code over typed inputs. Both are deterministic. Neither, on its own, captures intent-level constraints written in plain English. They are the right tool for "deny if `replicas < 3`" and the wrong tool for "an action is forbidden when its real-world impact violates clause X of our written policy".

**Constitutional AI.** The Anthropic line of work on constitutional training [Anthropic 2022 Constitutional AI, *uncertain on exact citation*] argues that a written constitution can be used at training time to shape model behaviour, and at inference time as a self-critique signal. The applied form most relevant to SentinelCloud is *constitutional self-critique at inference*: the model is asked to check its own output against a list of plain-English clauses. This is what `runSafety` does (`web/lib/agents/agents.ts:66`).

SentinelCloud combines the two. Deterministic checks (`checkDeterministic` at `web/lib/policy/engine.ts:68`) cover the clauses that admit a precise rule (C1, C3, C4, C5, C6 in the current build). The remaining clauses go to the LLM-side judge. Both sides must agree before an action passes the gate (`web/lib/agents/orchestrator.ts:80`). This is a small but pragmatic synthesis, not a research contribution to either field on its own.

## 6. Observability foundations

OpenTelemetry [OTel] is now the cross-vendor baseline for traces, metrics, and logs. The semantic-conventions specification matters more than the wire protocol for our purposes: it is what makes a `service.name` attribute mean the same thing across vendors. Our `Signal` envelope (`web/lib/types.ts`) borrows the semantic-conventions discipline without claiming to ship a full OTel collector.

eBPF appears in two distinct roles in this literature. First, as a low-overhead in-kernel observer that produces telemetry with no source code change. Second, as a runtime safety mechanism that can enforce policy at the syscall layer. Both matter for production AIOps; neither is implemented in this build. The capstone scope is restricted to user-space ingestion.

A useful framing from the OTel community is that observability is *the property of a system that you can ask new questions about it without shipping new code*. Most agent benchmarks fail this test, because they ship telemetry corpora rather than telemetry generators. Our scenarios are still corpora; an ideal future build would let a reviewer ask new questions of a live generator.

## 7. FinOps research direction

FinOps as a named field is younger than the others in this review. The FinOps Foundation surveys [FinOps Foundation 2024, 2025, *uncertain on report titles*] consistently report that:

1. Cost visibility lags actual spend by days or weeks in most organisations.
2. Right-sizing recommendations from cloud vendors are widely ignored, in part because they ignore lifecycle and statefulness.
3. Spot-instance reliability varies enormously by zone, instance family, and time of day, and the variation is rarely surfaced to the recommender.

The academic literature on right-sizing is older and includes a range of bin-packing-style optimisers. The point of departure for newer work is the addition of *risk* as a first-class objective: not just price, but expected eviction loss, warm-up cost, and statefulness penalty.

SentinelCloud's gap G8 names a Cost-Risk Optimizer that does Pareto-style selection over price, eviction probability, and tolerance. The current build does not implement that solver; it gates cost-affecting actions through clause C5 (`web/lib/policy/engine.ts:37`). Honest disclosure: this is the area where the capstone is most clearly future work rather than completed work.

## 8. Synthesis: where SentinelCloud sits in the landscape

The contributions of this capstone are modest and intentionally so. None of the twelve gaps is freshly identified by SentinelCloud. Each is a known gap in the literature, and each module is a small concrete answer that other systems can adopt or critique.

What is new, in aggregate, is the *combination*. Across the public agent frameworks, no off-the-shelf orchestrator ships with all of: typed agent contracts, adversarial-dissent quotas, blast-radius gating, calibration-aware auto-act thresholds, semantic policy clauses with deterministic and LLM-side checks, an episodic memory with per-step reward, and reproducible scenario fixtures. SentinelCloud puts these in one orchestrator file (`web/lib/agents/orchestrator.ts`) and demonstrates them on a small public showcase. The argument is that the *integration* is what is missing in deployed systems, not any single primitive.

The honest limitations are stated in `GAP_MATRIX.md`. The Pareto cost optimiser is not built. The PRM weights are heuristic. The topology builder is offline. The ingestion adapters are stubbed. A senior reviewer should read the residual-risk column of the gap matrix as the work plan for the year after submission.

## References

Citations use `[Key Year]` keys. Where the author has not personally verified the paper, the entry is marked *uncertain*; the entry is included so a reader can search for it, not as a claim of first-hand reading.

- [AIOps-Survey 2024] AIOps survey covering autonomous remediation. Survey paper, *uncertain on exact title and venue*. Likely on arXiv cs.SE.
- [AIOps-Survey 2025] Follow-on AIOps survey covering LLM-era closed-loop systems. *Uncertain on exact title.*
- [AIOpsLab] AIOpsLab benchmark family for closed-loop AIOps agents. Cited in multiple 2024–2026 papers. *Author has not run the benchmark; description is based on secondary sources.*
- [ITBench] IT-operations benchmark for LLM agents. *Uncertain on exact reference.*
- [RCAEval] Root-cause-analysis benchmark for multi-modal traces. *Uncertain on exact reference.*
- [LangGraph] LangGraph project (LangChain ecosystem, in the literal sense). Open source, documented on the project site. No version number cited here on purpose.
- [AutoGen] Microsoft AutoGen multi-agent framework. Open source, documented in Microsoft Research write-ups.
- [CrewAI] CrewAI open-source role-based agent framework. Documented on the project site.
- [OpenAI Swarm] OpenAI Swarm minimal orchestration library. Public reference implementation.
- [Anthropic 2022] Constitutional AI line of work. *Uncertain on exact paper to cite among the line; the foundational write-up is on Anthropic's research site.*
- [OPA] Open Policy Agent and the Rego policy language. CNCF graduated project, public documentation.
- [Cedar] AWS Cedar policy language. Public language reference and white paper.
- [OTel] OpenTelemetry specification, including the semantic-conventions document. Public spec.
- [FinOps Foundation 2024] FinOps Foundation State of FinOps survey. *Uncertain on report title.*
- [FinOps Foundation 2025] Follow-on State of FinOps survey. *Uncertain on report title.*
- [Google SRE Handbook] Site Reliability Engineering, public O'Reilly book maintained by Google.
- [eBPF] eBPF kernel facility and the related cilium / bpftrace tooling. Public Linux kernel documentation.

A future revision of this document will replace each *uncertain* entry with a verified citation, or will remove the entry if the underlying source cannot be confirmed.
