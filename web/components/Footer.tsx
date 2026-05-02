import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-line)] mt-24">
      <div className="mx-auto max-w-7xl px-5 py-10 grid gap-6 md:grid-cols-4 text-[13.5px] text-[var(--color-fg-2)]">
        <div>
          <div className="text-[var(--color-fg)] font-semibold mb-2">SentinelCloud</div>
          <p className="leading-relaxed">A closed-loop multi-agent system for autonomous cloud DevOps. Capstone build, May 2026.</p>
        </div>
        <div>
          <div className="text-[var(--color-fg)] font-semibold mb-2">Project</div>
          <ul className="space-y-1.5">
            <li><Link href="/architecture">Architecture</Link></li>
            <li><Link href="/research">Research</Link></li>
            <li><Link href="/docs">Docs</Link></li>
            <li><a href="https://github.com/divyamohan1993/sentinelcloud" target="_blank" rel="noreferrer noopener">GitHub</a></li>
          </ul>
        </div>
        <div>
          <div className="text-[var(--color-fg)] font-semibold mb-2">Author</div>
          <ul className="space-y-1.5">
            <li>Rohit Kumar — GF202220522</li>
            <li>BTech CSE Cloud Computing</li>
            <li>Galgotias University</li>
          </ul>
        </div>
        <div>
          <div className="text-[var(--color-fg)] font-semibold mb-2">Mentor</div>
          <ul className="space-y-1.5">
            <li>Divya Mohan</li>
            <li><a href="https://dmj.one" target="_blank" rel="noreferrer noopener">dmj.one</a></li>
            <li>contact@dmj.one</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--color-line)]">
        <div className="mx-auto max-w-7xl px-5 py-4 text-[12px] text-[var(--color-fg-3)] flex flex-wrap items-center justify-between gap-2">
          <span>© 2026 SentinelCloud · MIT License</span>
          <span>Built with Next.js 15, Vertex AI Gemini, Cloud Run · asia-east1</span>
        </div>
      </div>
    </footer>
  );
}
