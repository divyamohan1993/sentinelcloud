export function Brand() {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <span aria-hidden className="relative h-7 w-7 rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] shadow-[0_0_18px_rgba(124,92,255,0.5)]">
        <span className="absolute inset-1 rounded bg-[var(--color-bg)] grid place-items-center">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M12 2 4 5v6c0 5 3.5 9.2 8 11 4.5-1.8 8-6 8-11V5l-8-3Z" />
          </svg>
        </span>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        Sentinel<span className="text-[var(--color-accent)]">Cloud</span>
      </span>
    </span>
  );
}
