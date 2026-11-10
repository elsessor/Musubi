import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, description, icon: Icon = Inbox, children }: {
  title: string;
  description: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return <div role="status" className="flex min-h-52 min-w-0 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center sm:px-6">
    <Icon aria-hidden="true" className="mb-3 size-8 text-slate-300" />
    <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
    <p className="mt-2 max-w-md text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>
    {children && <div className="mt-3">{children}</div>}
  </div>;
}
