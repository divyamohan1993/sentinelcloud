'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-[12.5px] rounded-md bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-accent-2)] text-white px-3 py-1.5"
    >Print / Save PDF</button>
  );
}
