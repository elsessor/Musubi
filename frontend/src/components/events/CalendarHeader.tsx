"use client";

import { Calendar, CalendarDays, CalendarRange, Check, ChevronDown, ChevronLeft, ChevronRight, Columns3, LayoutGrid, List, type LucideIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CALENDAR_PERIODS, getCalendarHeading, type CalendarDisplayOptions, type CalendarPeriod } from "@/utils/calendarViews";

type CalendarHeaderProps = {
  date: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  period: CalendarPeriod;
  onPeriodChange: (period: CalendarPeriod) => void;
  options: CalendarDisplayOptions;
  onOptionsChange: (options: CalendarDisplayOptions) => void;
  itemLabel: "events" | "tasks";
};

const VIEW_ICONS: Record<CalendarPeriod, LucideIcon> = {
  day: Calendar,
  week: Columns3,
  month: CalendarDays,
  year: LayoutGrid,
  schedule: List,
  "four-days": CalendarRange
};

export function CalendarHeader({ date, onPrevious, onNext, onToday, period, onPeriodChange, options, onOptionsChange, itemLabel }: CalendarHeaderProps) {
  const navigationLabel = period === "four-days" ? "4 days" : period === "schedule" ? "30 days" : period;
  const ActiveViewIcon = VIEW_ICONS[period];
  const displayOptions: { key: keyof CalendarDisplayOptions; label: string }[] = [
    { key: "showWeekends", label: "Show weekends" },
    ...(itemLabel === "events" ? [{ key: "showGoogleCalendar" as const, label: "Show Google Calendar" }] : []),
    { key: "showCancelled", label: `Show cancelled ${itemLabel}` },
    { key: "showCompleted", label: `Show completed ${itemLabel}` }
  ];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:border-slate-200 sm:px-4 sm:py-4">
      <h2 className="text-sm font-bold text-slate-900 sm:text-base">
        {getCalendarHeading(date, period, options.showWeekends)}
      </h2>
      <div role="group" aria-label="Calendar navigation" className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onToday} className="min-h-11 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 sm:min-h-8">
            Today
          </button>
          <div className="flex items-center gap-1">
            <button type="button" aria-label={`Previous ${navigationLabel}`} onClick={onPrevious} className="flex size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 sm:size-8">
              <ChevronLeft size={16} />
            </button>
            <button type="button" aria-label={`Next ${navigationLabel}`} onClick={onNext} className="flex size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 sm:size-8">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Calendar view and display options" className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 data-[state=open]:border-blue-300 data-[state=open]:bg-blue-50 data-[state=open]:text-blue-700 sm:min-h-8">
              <ActiveViewIcon aria-hidden="true" className="size-3.5 text-blue-600" />
              {CALENDAR_PERIODS.find((entry) => entry.value === period)?.label}
              <ChevronDown aria-hidden="true" className="ml-1 size-3.5 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="w-60 max-w-[calc(100vw-1.5rem)] rounded-2xl border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
            <DropdownMenuLabel className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Calendar view</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={period} onValueChange={(value) => onPeriodChange(value as CalendarPeriod)} className="space-y-0.5">
              {CALENDAR_PERIODS.map((entry) => {
                const ViewIcon = VIEW_ICONS[entry.value];
                const selected = entry.value === period;
                return (
                  <DropdownMenuRadioItem key={entry.value} value={entry.value} className={`min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors [&>span:first-child]:hidden sm:min-h-9 ${selected ? "bg-blue-50 text-blue-700 focus:bg-blue-100 focus:text-blue-700" : "text-slate-600 focus:bg-slate-50 focus:text-slate-900"}`}>
                    <ViewIcon aria-hidden="true" className={`size-4 ${selected ? "text-blue-600" : "text-slate-400"}`} />
                    <span className="flex-1">{entry.label}</span>
                    {selected ? <Check aria-hidden="true" className="size-3.5 text-blue-600" /> : null}
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator className="mx-2 my-2 bg-slate-100" />
            <DropdownMenuLabel className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Display options</DropdownMenuLabel>
            {displayOptions.map((option) => {
              const isChecked = options[option.key] ?? true;
              return (
                <DropdownMenuCheckboxItem
                  key={option.key}
                  checked={isChecked}
                  onCheckedChange={(checked) => onOptionsChange({ ...options, [option.key]: checked === true })}
                  onSelect={(event) => event.preventDefault()}
                  className={`min-h-11 cursor-pointer rounded-lg py-2 pl-9 pr-3 text-xs font-medium text-slate-600 transition-colors focus:bg-slate-50 focus:text-slate-900 [&>span:first-child]:grid [&>span:first-child]:size-4 [&>span:first-child]:place-items-center [&>span:first-child]:rounded [&>span:first-child]:border [&>span:first-child_svg]:size-3 sm:min-h-9 ${isChecked ? "[&>span:first-child]:border-blue-200 [&>span:first-child]:bg-blue-50 [&>span:first-child]:text-blue-600" : "[&>span:first-child]:border-slate-300 [&>span:first-child]:bg-white"}`}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
