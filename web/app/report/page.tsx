import Link from 'next/link';
import { COVER, REPORT_SECTIONS, VIVA_QUESTIONS, REFERENCES, type ReportSection } from '@/lib/capstone';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Capstone Report',
  description: 'SentinelCloud capstone project report. Submitted under the Yogananda School of AI format.',
};

function renderSection(s: ReportSection, depth = 1): React.ReactNode {
  const HeadingTag = (depth === 1 ? 'h2' : depth === 2 ? 'h3' : 'h4') as keyof React.JSX.IntrinsicElements;
  const headingClass =
    depth === 1
      ? 'text-[24px] md:text-[28px] font-semibold tracking-tight mt-12 mb-4'
      : depth === 2
        ? 'text-[18px] md:text-[20px] font-semibold tracking-tight mt-7 mb-3'
        : 'text-[16px] font-semibold tracking-tight mt-5 mb-2';
  return (
    <section key={s.id} id={s.id} className="scroll-mt-20">
      <HeadingTag className={headingClass}>
        {s.number ? <span className="text-[var(--color-accent)] mr-2">{s.number}.</span> : null}
        {s.title}
      </HeadingTag>
      {s.body?.map((p, i) => (
        <p key={i} className="text-[14.5px] md:text-[15px] text-[var(--color-fg-2)] leading-[1.75] mb-3">{p}</p>
      ))}
      {s.bullets && (
        <ul className="my-3 space-y-2">
          {s.bullets.map((b, i) => (
            <li key={i} className="text-[14px] md:text-[15px] text-[var(--color-fg-2)] leading-relaxed flex gap-2.5">
              <span className="text-[var(--color-accent)] mt-1">·</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {s.code && <pre className="code my-4 text-[12.5px] whitespace-pre-wrap"><code>{s.code}</code></pre>}
      {s.table && (
        <div className="my-4 overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead className="text-[11px] uppercase tracking-wider text-[var(--color-fg-3)]">
              <tr>
                {s.table.head.map((h, i) => (
                  <th key={i} className="text-left py-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {s.table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className={`py-2 pr-4 ${j === 0 ? 'font-mono text-[var(--color-accent)]' : 'text-[var(--color-fg-2)]'}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {s.subsections?.map(sub => renderSection(sub, depth + 1))}
    </section>
  );
}

const FIGURES = [
  { id: 'fig-1', label: 'Figure 1', caption: 'Three-layer brain: perception, reasoning, actuation.' },
  { id: 'fig-2', label: 'Figure 2', caption: 'Twelve-phase orchestrator state machine.' },
  { id: 'fig-3', label: 'Figure 3', caption: 'Confidence calibration formula and class-specific thresholds.' },
  { id: 'fig-4', label: 'Figure 4', caption: 'Blast radius BFS over service graph with depth falloff.' },
  { id: 'fig-5', label: 'Figure 5', caption: 'AgentTurn TypeScript envelope (single source of truth).' },
];

const TABLES = [
  { id: 'tbl-1', label: 'Table 1', caption: 'Twelve research gaps mapped to twelve modules.' },
  { id: 'tbl-2', label: 'Table 2', caption: 'Stack of choices, with the one-line justification each.' },
  { id: 'tbl-3', label: 'Table 3', caption: 'Per-scenario pilot results: path, MTTR, blast radius, hallucination rate.' },
  { id: 'tbl-4', label: 'Table 4', caption: 'Policy constitution clauses and the action kinds they apply to.' },
  { id: 'tbl-5', label: 'Table 5', caption: 'Tool registry: kind, parameter schema, reversibility, risk class.' },
];

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-[12.5px] text-[var(--color-fg-2)] hover:text-white">← Back to site</Link>
        <div className="flex items-center gap-3">
          <Link href="/pitch" className="text-[12.5px] rounded-md border border-[var(--color-line-strong)] bg-white/[0.04] px-3 py-1.5 hover:bg-white/[0.08]">Pitch deck →</Link>
          <a href="/SentinelCloud_Capstone_Report.docx" download
            className="text-[12.5px] rounded-md bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-accent-2)] text-white px-3 py-1.5 inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4m-4 8h16" /></svg>
            Download .docx
          </a>
          <PrintButton />
          <a href="https://github.com/Code-with-ME-Rohit/sentinelcloud/blob/main/docs/CAPSTONE_REPORT.md"
            target="_blank" rel="noreferrer noopener"
            className="text-[12.5px] text-[var(--color-fg-2)] hover:text-white">Markdown ↗</a>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        {/* TOC sidebar */}
        <aside className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
          <div className="text-[10.5px] uppercase tracking-widest text-[var(--color-fg-3)] mb-2">Contents</div>
          <ul className="space-y-1.5 text-[13px]">
            <li><a href="#cover" className="text-[var(--color-fg-2)] hover:text-white">Cover page</a></li>
            <li><a href="#acknowledgement" className="text-[var(--color-fg-2)] hover:text-white">Acknowledgement</a></li>
            <li><a href="#abstract" className="text-[var(--color-fg-2)] hover:text-white">Abstract</a></li>
            <li><a href="#toc" className="text-[var(--color-fg-2)] hover:text-white">Table of Contents</a></li>
            <li><a href="#figures" className="text-[var(--color-fg-2)] hover:text-white">List of Figures</a></li>
            <li><a href="#tables" className="text-[var(--color-fg-2)] hover:text-white">List of Tables</a></li>
            {REPORT_SECTIONS.filter(s => s.number).map(s => (
              <li key={s.id}><a href={`#${s.id}`} className="text-[var(--color-fg-2)] hover:text-white">{s.number}. {s.title}</a></li>
            ))}
            <li><a href="#viva" className="text-[var(--color-fg-2)] hover:text-white">Viva questions</a></li>
            <li><a href="#references" className="text-[var(--color-fg-2)] hover:text-white">References</a></li>
          </ul>
        </aside>

        {/* Report body */}
        <article className="report-body max-w-3xl mx-auto lg:mx-0">
          {/* Cover page */}
          <section id="cover" className="text-center py-10 border-b border-[var(--color-line)] page-break-after">
            <div className="text-[12px] uppercase tracking-[0.2em] text-[var(--color-fg-3)] mb-4">Capstone Project Report</div>
            <h1 className="text-[40px] md:text-[52px] font-semibold tracking-tight">{COVER.title}</h1>
            <div className="mt-2 text-[18px] md:text-[22px] text-[var(--color-fg-2)]">{COVER.subtitle}</div>
            <div className="mt-10 text-[14px] text-[var(--color-fg-2)] leading-relaxed">
              Synopsis submitted for the partial fulfilment of the degree of
              <br /><b>Bachelor of Technology (CSE)</b>
              <br />Cloud Computing Specialisation
            </div>
            <dl className="mx-auto mt-10 max-w-md text-left grid grid-cols-[max-content_1fr] gap-x-5 gap-y-2.5 text-[14px]">
              <dt className="text-[var(--color-fg-3)]">Name of Student</dt><dd>{COVER.studentName}</dd>
              <dt className="text-[var(--color-fg-3)]">Registration Number</dt><dd className="font-mono">{COVER.registrationNumber}</dd>
              <dt className="text-[var(--color-fg-3)]">Course with Specialization</dt><dd>BTech CSE - Cloud Computing</dd>
              <dt className="text-[var(--color-fg-3)]">Semester</dt><dd>{COVER.semester}</dd>
              <dt className="text-[var(--color-fg-3)]">Capstone Mentor</dt><dd>{COVER.mentorName}</dd>
              <dt className="text-[var(--color-fg-3)]">Submission</dt><dd>{COVER.submission}</dd>
            </dl>
            <div className="mt-12 text-[13px] text-[var(--color-fg-2)] uppercase tracking-wider leading-relaxed">
              {COVER.school}<br />
              {COVER.university}<br />
              {COVER.location}
            </div>
            <div className="mt-8 text-[12px] text-[var(--color-fg-3)]">
              Live: <a href={COVER.liveUrl} className="underline">{COVER.liveUrl}</a>
              <br />Source: <a href={COVER.repoUrl} className="underline">{COVER.repoUrl}</a>
            </div>
          </section>

          {/* Acknowledgement, Abstract */}
          {renderSection(REPORT_SECTIONS[0])}
          {renderSection(REPORT_SECTIONS[1])}

          {/* Table of Contents */}
          <section id="toc" className="mt-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight mb-4">Table of Contents</h2>
            <ol className="space-y-2 text-[14px]">
              <li><a className="hover:text-white" href="#acknowledgement">Acknowledgement</a></li>
              <li><a className="hover:text-white" href="#abstract">Abstract</a></li>
              <li><a className="hover:text-white" href="#figures">List of Figures</a></li>
              <li><a className="hover:text-white" href="#tables">List of Tables</a></li>
              {REPORT_SECTIONS.filter(s => s.number).map(s => (
                <li key={s.id}><a className="hover:text-white" href={`#${s.id}`}>{s.number}. {s.title}</a></li>
              ))}
              <li><a className="hover:text-white" href="#viva">Viva questions</a></li>
              <li><a className="hover:text-white" href="#references">References</a></li>
            </ol>
          </section>

          {/* List of Figures */}
          <section id="figures" className="mt-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight mb-4">List of Figures</h2>
            <ol className="space-y-2 text-[14px] text-[var(--color-fg-2)]">
              {FIGURES.map(f => (
                <li key={f.id}><span className="text-[var(--color-accent)] font-mono mr-2">{f.label}.</span>{f.caption}</li>
              ))}
            </ol>
          </section>

          {/* List of Tables */}
          <section id="tables" className="mt-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight mb-4">List of Tables</h2>
            <ol className="space-y-2 text-[14px] text-[var(--color-fg-2)]">
              {TABLES.map(t => (
                <li key={t.id}><span className="text-[var(--color-accent)] font-mono mr-2">{t.label}.</span>{t.caption}</li>
              ))}
            </ol>
          </section>

          {/* Numbered sections */}
          {REPORT_SECTIONS.filter(s => s.number).map(s => renderSection(s))}

          {/* Viva questions */}
          <section id="viva" className="mt-12 scroll-mt-20">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight mb-4">Viva Questions</h2>
            <p className="text-[14.5px] text-[var(--color-fg-2)] leading-relaxed mb-6">
              These ten questions follow the Yogananda School of AI capstone format and are answered here as part of the report itself, in the order specified by the template.
            </p>
            <ol className="space-y-7">
              {VIVA_QUESTIONS.map((vq, i) => (
                <li key={i}>
                  <div className="flex gap-3">
                    <span className="text-[var(--color-accent)] font-mono text-[14px] shrink-0 pt-0.5">Q{i + 1}.</span>
                    <div className="font-semibold text-[15px] md:text-[16px]">{vq.q}</div>
                  </div>
                  <p className="mt-2 ml-9 text-[14.5px] text-[var(--color-fg-2)] leading-[1.75]">{vq.a}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* References */}
          <section id="references" className="mt-12 scroll-mt-20">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight mb-4">References</h2>
            <ol className="space-y-2 text-[13.5px] text-[var(--color-fg-2)]">
              {REFERENCES.map((r, i) => (
                <li key={r.key} className="flex gap-2.5">
                  <span className="text-[var(--color-accent)] font-mono shrink-0">[{i + 1}]</span>
                  <span><b className="text-[var(--color-fg)]">[{r.key}]</b> {r.text}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-16 pt-6 border-t border-[var(--color-line)] text-[12.5px] text-[var(--color-fg-3)]">
            Submitted May 2026 by {COVER.studentName} ({COVER.registrationNumber}). Mentor: {COVER.mentorName}, {COVER.mentorAffiliation}. License: MIT.
          </div>
        </article>
      </div>

      {/* Print stylesheet */}
      <style>{`
        @media print {
          .report-body { color: #111; max-width: none; margin: 0; }
          .report-body * { color: #111 !important; background: white !important; border-color: #ccc !important; }
          aside, header, footer, button, a[href^="http"]::after { display: none !important; }
          .page-break-after { page-break-after: always; }
          .code { white-space: pre-wrap; word-wrap: break-word; }
        }
      `}</style>
    </div>
  );
}
