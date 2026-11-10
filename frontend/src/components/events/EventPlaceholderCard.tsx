export function EventPlaceholderCard() {
  return <article aria-label="Event layout placeholder" className="min-w-0 rounded-2xl border border-dashed border-slate-300 bg-white p-3 sm:p-5">
    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">Event status</span>
    <h2 className="mt-4 text-sm font-semibold text-slate-500">Event name</h2>
    <p className="mt-1 text-xs leading-5 text-slate-400">Event description and purpose</p>
    <div className="my-4 h-1.5 rounded-full bg-slate-100" aria-hidden="true" />
    <dl className="space-y-2 text-xs text-slate-400">
      {["Committee", "Start date", "End date", "Members", "Task progress"].map((label) => <div key={label} className="flex flex-wrap justify-between gap-x-2 gap-y-1"><dt>{label}</dt><dd>—</dd></div>)}
    </dl>
  </article>;
}
