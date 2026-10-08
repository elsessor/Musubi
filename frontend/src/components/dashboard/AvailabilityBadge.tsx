import { getAvailabilityLabel, getAvailabilityTheme } from "@/utils/availabilityTheme";
import { cn } from "@/utils/cn";

export function AvailabilityBadge({ value, className }: { value?: string | null; className?: string }) {
  const theme = getAvailabilityTheme(value);
  return <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold", theme.badge, className)}>
    <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${theme.dot}`} />
    <span className="min-w-0 break-words">{getAvailabilityLabel(value)}</span>
  </span>;
}
