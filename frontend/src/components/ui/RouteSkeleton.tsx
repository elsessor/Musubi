function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;
}

export function DashboardRouteSkeleton({ events = false }: { events?: boolean }) {
  return (
    <div className="min-h-screen bg-[#eef1f5]" aria-label="Loading page" role="status">
      <aside className="fixed inset-y-0 left-0 hidden w-[354px] bg-[#213f68] p-7 md:block">
        <Pulse className="h-10 w-36 bg-white/20" />
        <div className="mt-12 space-y-3">{Array.from({ length: 7 }).map((_, i) => <Pulse key={i} className="h-12 w-full bg-white/10" />)}</div>
      </aside>
      <div className="md:ml-[354px]">
        <header className="flex min-h-[76px] items-center justify-between border-b border-slate-200 bg-[#f1f4f8] px-5 sm:px-8 lg:min-h-[108px]">
          <div className="space-y-2"><Pulse className="h-7 w-64" /><Pulse className="h-4 w-80" /></div>
          <Pulse className="size-12 rounded-full" />
        </header>
        <main className="space-y-6 p-5 sm:p-8">
          <div className="flex items-center justify-between"><div className="space-y-2"><Pulse className="h-8 w-64" /><Pulse className="h-4 w-80" /></div><Pulse className="h-10 w-32" /></div>
          {events ? <EventContent /> : <DefaultContent />}
        </main>
      </div>
    </div>
  );
}

export function DashboardContentSkeleton() {
  return <div className="space-y-6" aria-label="Loading page" role="status">
    <div className="flex items-center justify-between"><div className="space-y-2"><Pulse className="h-8 w-64" /><Pulse className="h-4 w-80" /></div><Pulse className="h-10 w-32" /></div>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><Pulse className="h-4 w-24" /><Pulse className="mt-5 h-8 w-20" /><Pulse className="mt-3 h-3 w-28" /></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]"><Pulse className="h-80 rounded-xl bg-white" /><Pulse className="h-80 rounded-xl bg-white" /></div>
  </div>;
}

function DefaultContent() {
  return <>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><Pulse className="h-4 w-24" /><Pulse className="mt-5 h-8 w-20" /><Pulse className="mt-3 h-3 w-28" /></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]"><Pulse className="h-80 rounded-xl bg-white" /><Pulse className="h-80 rounded-xl bg-white" /></div>
  </>;
}

function EventContent() {
  return <div className="space-y-6">
    <div className="flex gap-2 border-b border-slate-200 pb-3"><Pulse className="h-9 w-36" /><Pulse className="h-9 w-28" /></div>
    <div className="flex justify-between"><Pulse className="h-8 w-48" /><Pulse className="h-9 w-32" /></div>
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Pulse className="aspect-video w-full" /><Pulse className="h-5 w-5/6" /><Pulse className="h-4 w-1/2" /><Pulse className="h-9 w-full" /></div>)}</div>
  </div>;
}

export function BasicRouteSkeleton() {
  return <div className="min-h-screen bg-[#eef1f5] p-6 sm:p-10" aria-label="Loading page" role="status"><div className="mx-auto max-w-7xl space-y-6"><Pulse className="h-8 w-64" /><Pulse className="h-4 w-80" /><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Pulse key={i} className="h-48 rounded-xl bg-white" />)}</div></div></div>;
}
