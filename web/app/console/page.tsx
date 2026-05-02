import { Section } from '@/components/Section';
import { DEFAULT_CONSTITUTION } from '@/lib/policy/engine';
import { TOOL_REGISTRY } from '@/lib/actuators';

export const dynamic = 'force-static';

export default function Console() {
  return (
    <>
      <Section
        kicker="Operator console"
        title="The view an SRE actually wants."
        sub="Live policy constitution, registered tools, and the controls a human keeps when SentinelCloud asks for confirmation."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15.5px] font-semibold">Policy constitution</h2>
              <span className="text-[11.5px] text-[var(--color-fg-3)]">{DEFAULT_CONSTITUTION.length} clauses</span>
            </div>
            <ul className="space-y-3">
              {DEFAULT_CONSTITUTION.map(r => (
                <li key={r.id} className="border-t border-[var(--color-line)] pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-[var(--color-accent)]">{r.id}</span>
                    <span className={`text-[10.5px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                      r.severity === 'critical' ? 'border-[#ff6770]/40 text-[#ff6770]' :
                      r.severity === 'high' ? 'border-[#ff9c64]/40 text-[#ff9c64]' :
                      r.severity === 'medium' ? 'border-[#ffc857]/40 text-[#ffc857]' :
                      'border-[#5ce1c7]/40 text-[#5ce1c7]'
                    }`}>{r.severity}</span>
                  </div>
                  <p className="text-[13.5px] text-[var(--color-fg-2)]">{r.text}</p>
                  <div className="mt-1 text-[11.5px] text-[var(--color-fg-3)]">applies to: {r.appliesTo.join(', ')}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15.5px] font-semibold">Tool registry</h2>
              <span className="text-[11.5px] text-[var(--color-fg-3)]">{TOOL_REGISTRY.length} tools</span>
            </div>
            <ul className="space-y-3">
              {TOOL_REGISTRY.map(t => (
                <li key={t.kind} className="border-t border-[var(--color-line)] pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[12.5px] text-[var(--color-accent)]">{t.kind}</span>
                    <span className={`text-[10.5px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                      t.riskClass === 'critical' ? 'border-[#ff6770]/40 text-[#ff6770]' :
                      t.riskClass === 'high' ? 'border-[#ff9c64]/40 text-[#ff9c64]' :
                      t.riskClass === 'medium' ? 'border-[#ffc857]/40 text-[#ffc857]' :
                      'border-[#5ce1c7]/40 text-[#5ce1c7]'
                    }`}>risk {t.riskClass}</span>
                    <span className="text-[10.5px] text-[var(--color-fg-3)]">reversible {t.reversible ? 'yes' : 'no'}</span>
                  </div>
                  <p className="text-[13.5px] text-[var(--color-fg-2)]">{t.description}</p>
                  <pre className="code mt-1.5 text-[11.5px] whitespace-pre-wrap"><code>{t.paramSchema}</code></pre>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
