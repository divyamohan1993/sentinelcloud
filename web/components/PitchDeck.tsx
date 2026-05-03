'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { PitchSlide } from '@/lib/capstone';

export function PitchDeck({ slides, cover }: {
  slides: PitchSlide[];
  cover: { studentName: string; registrationNumber: string; mentorName: string; mentorAffiliation: string; submission: string };
}) {
  const [i, setI] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const total = slides.length;

  const go = useCallback((delta: number) => {
    setI(prev => Math.max(0, Math.min(total - 1, prev + delta)));
  }, [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === 'Home') { e.preventDefault(); setI(0); }
      else if (e.key === 'End') { e.preventDefault(); setI(total - 1); }
      else if (e.key.toLowerCase() === 'f') { toggleFs(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, total]);

  const toggleFs = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFs(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFs(false)).catch(() => {});
    }
  };

  const slide = slides[i];

  return (
    <div className="fixed inset-0 bg-[var(--color-bg)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-[var(--color-line)] bg-[rgba(6,7,19,0.7)] backdrop-blur-sm">
        <Link href="/" className="text-[12.5px] text-[var(--color-fg-2)] hover:text-white">← Back to site</Link>
        <div className="text-[11.5px] text-[var(--color-fg-3)] font-mono tabular-nums">
          slide {i + 1} / {total}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setI(0)} className="text-[12px] text-[var(--color-fg-2)] hover:text-white px-2 py-1 rounded hover:bg-white/[0.04]">⏮</button>
          <button onClick={() => go(-1)} disabled={i === 0} className="text-[12px] text-[var(--color-fg-2)] disabled:opacity-30 hover:text-white px-2 py-1 rounded hover:bg-white/[0.04]">◀</button>
          <button onClick={() => go(1)} disabled={i === total - 1} className="text-[12px] text-[var(--color-fg-2)] disabled:opacity-30 hover:text-white px-2 py-1 rounded hover:bg-white/[0.04]">▶</button>
          <button onClick={toggleFs} title="F for fullscreen" className="text-[12px] text-[var(--color-fg-2)] hover:text-white px-2 py-1 rounded hover:bg-white/[0.04]">{isFs ? '⤡' : '⤢'}</button>
          <a href="/report" className="text-[12px] text-[var(--color-fg-2)] hover:text-white px-2 py-1 rounded hover:bg-white/[0.04]">Report</a>
        </div>
      </div>

      {/* Slide canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div aria-hidden className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-[var(--color-accent-2)]/15 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 -left-32 h-[600px] w-[600px] rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
        <div aria-hidden className="grid-bg absolute inset-0 opacity-30" />

        <div className="relative h-full overflow-y-auto" key={i}>
          <div className="mx-auto max-w-5xl px-6 md:px-12 py-10 md:py-16 animate-[fadeIn_0.35s_ease-out]">
            {slide.kicker && (
              <div className="text-[11.5px] uppercase tracking-[0.18em] text-[var(--color-accent)] mb-4">
                {slide.kicker}
              </div>
            )}
            <h1 className="text-[36px] md:text-[56px] font-semibold leading-[1.05] tracking-tight">
              {slide.title}
            </h1>
            {slide.body && (
              <div className="mt-6 space-y-3">
                {slide.body.map((p, idx) => (
                  <p key={idx} className="text-[16px] md:text-[18px] text-[var(--color-fg-2)] leading-relaxed max-w-3xl">{p}</p>
                ))}
              </div>
            )}
            {slide.bullets && (
              <ul className="mt-7 space-y-3">
                {slide.bullets.map((b, idx) => (
                  <li key={idx} className="flex gap-3 text-[15.5px] md:text-[17px] text-[var(--color-fg-2)] leading-relaxed">
                    <span className="text-[var(--color-accent)] mt-[3px]">▸</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {slide.code && (
              <pre className="code mt-6 text-[13px] md:text-[14px] whitespace-pre"><code>{slide.code}</code></pre>
            )}
            {slide.table && (
              <div className="mt-7 overflow-x-auto">
                <table className="w-full text-[14px] md:text-[15px]">
                  <thead className="text-[11.5px] uppercase tracking-wider text-[var(--color-fg-3)]">
                    <tr>
                      {slide.table.head.map((h, idx) => (
                        <th key={idx} className="text-left py-2 pr-5 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {slide.table.rows.map((row, idx) => (
                      <tr key={idx}>
                        {row.map((cell, jdx) => (
                          <td key={jdx} className={`py-2.5 pr-5 ${jdx === 0 ? 'font-mono text-[13px] text-[var(--color-accent)]' : 'text-[var(--color-fg-2)]'}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {slide.footer && (
              <div className="mt-10 pt-5 border-t border-[var(--color-line)] text-[12.5px] text-[var(--color-fg-3)]">
                {slide.footer}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-5 h-9 border-t border-[var(--color-line)] bg-[rgba(6,7,19,0.7)] backdrop-blur-sm text-[11px] text-[var(--color-fg-3)]">
        <span>{cover.studentName} · {cover.registrationNumber} · Mentor: {cover.mentorName}, {cover.mentorAffiliation}</span>
        <span className="hidden md:inline">
          <span className="kbd">←</span> <span className="kbd">→</span> navigate · <span className="kbd">F</span> fullscreen
        </span>
      </div>

      {/* Dots indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-6 bg-[var(--color-accent)]' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
