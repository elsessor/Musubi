export function AuthBrand() {
  return (
    <header aria-label="Musubi" className="mb-6 flex items-center gap-3 sm:hidden">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-soft">
        <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
          <path d="M13 2L4 14h7l-1 8 10-13h-7l1-7z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-lg font-extrabold leading-6 text-brand">Musubi</p>
        <p className="text-xs font-medium text-slate-500">For campus organizations</p>
      </div>
    </header>
  );
}
