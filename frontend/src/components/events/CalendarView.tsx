"use client";

import { useState, type ReactNode } from "react";
import { addCalendarDays, getCalendarDates, isCalendarItemVisible, isCalendarWeekend, moveCalendarDate, type CalendarDisplayOptions, type CalendarPeriod } from "@/utils/calendarViews";
import { isSameCalendarDay } from "@/utils/calendarSchedule";
import { CalendarHeader } from "./CalendarHeader";
import { getStatusTheme, type CustomStatusConfig } from "./statusUtils";

type CalendarViewProps<T> = {
  items: T[];
  itemLabel: "events" | "tasks";
  getId: (item: T) => string;
  getTitle: (item: T) => string;
  getStatus: (item: T) => string;
  getDescription?: (item: T) => string | undefined;
  isScheduled: (item: T, date: Date) => boolean;
  onSelect: (item: T) => void;
  renderDetails?: (item: T) => ReactNode;
  renderActions?: (item: T) => ReactNode;
  renderCompactIndicator?: (item: T) => ReactNode;
  customStatuses?: CustomStatusConfig[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

export function CalendarView<T>({ items, itemLabel, getId, getTitle, getStatus, getDescription, isScheduled, onSelect, renderDetails, renderActions, renderCompactIndicator, customStatuses }: CalendarViewProps<T>) {
  const [date, setDate] = useState(() => new Date());
  const [period, setPeriod] = useState<CalendarPeriod>("month");
  const [options, setOptions] = useState<CalendarDisplayOptions>({ showWeekends: true, showCancelled: true, showCompleted: true });
  const today = new Date();
  const visibleItems = items.filter((item) => isCalendarItemVisible(getStatus(item), options));
  const dates = getCalendarDates(date, period, options.showWeekends);
  const weekdays = WEEKDAYS.filter((_, index) => options.showWeekends || (index !== 0 && index !== 6));
  const entriesFor = (day: Date) => visibleItems.filter((item) => isScheduled(item, day));

  function visibleMonthDate(next: Date, showWeekends: boolean): Date {
    if (showWeekends || !isCalendarWeekend(next)) return next;
    const monday = addCalendarDays(next, next.getDay() === 6 ? 2 : 1);
    return monday.getMonth() === next.getMonth() ? monday : addCalendarDays(next, next.getDay() === 6 ? -1 : -2);
  }

  function navigate(direction: -1 | 1) {
    const next = moveCalendarDate(date, period, direction, options.showWeekends);
    setDate(period === "month" ? visibleMonthDate(next, options.showWeekends) : next);
  }

  function changeOptions(next: CalendarDisplayOptions) {
    setOptions(next);
    if (period === "month") setDate(visibleMonthDate(date, next.showWeekends));
  }

  function changePeriod(next: CalendarPeriod) {
    if (next === "month") setDate(visibleMonthDate(date, options.showWeekends));
    setPeriod(next);
  }

  function resetToday() {
    const now = new Date();
    setDate(period === "month" ? visibleMonthDate(now, options.showWeekends) : now);
  }

  function renderEntry(item: T, compact = false) {
    const status = getStatus(item);
    const theme = getStatusTheme(status, customStatuses);
    return compact ? (
      <button key={getId(item)} type="button" onClick={() => onSelect(item)} title={`${getTitle(item)} (${status})`} className={`mt-1 block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-semibold hover:opacity-90 ${theme.bg} ${theme.text}`}>
        {renderCompactIndicator?.(item)}{getTitle(item)}
      </button>
    ) : (
      <div key={getId(item)} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <button type="button" onClick={() => onSelect(item)} className="flex min-h-11 w-full min-w-0 flex-col gap-2 p-3 text-left transition hover:bg-slate-50">
          <span className="break-words text-sm font-semibold text-slate-900">{getTitle(item)}</span>
          {getDescription?.(item) ? <span className="line-clamp-2 break-words text-xs leading-5 text-slate-500">{getDescription(item)}</span> : null}
          <span className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${theme.badge}`}>{status}</span>
            {renderDetails?.(item)}
          </span>
        </button>
        {renderActions ? <div className="px-3 pb-3 empty:hidden">{renderActions(item)}</div> : null}
      </div>
    );
  }

  function renderDayList(day: Date) {
    const entries = entriesFor(day);
    return (
      <section key={dateKey(day)} aria-label={`${itemLabel} for ${day.toLocaleDateString("en-US")}`} className="space-y-2">
        <h3 className="text-sm font-bold text-slate-800">{day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · {entries.length} {itemLabel}</h3>
        {entries.length ? entries.map((item) => renderEntry(item)) : <p className="py-4 text-sm text-slate-500">No {itemLabel} scheduled for this day.</p>}
      </section>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-0 sm:p-0">
      <CalendarHeader date={date} period={period} onPeriodChange={changePeriod} options={options} onOptionsChange={changeOptions} itemLabel={itemLabel} onPrevious={() => navigate(-1)} onNext={() => navigate(1)} onToday={resetToday} />

      {period === "month" ? (
        <>
          <div className="grid text-center text-xs font-semibold uppercase text-slate-400 sm:border-b sm:border-slate-200 sm:bg-slate-50/50 sm:py-2.5 sm:text-[11px] sm:text-slate-500" style={{ gridTemplateColumns: `repeat(${weekdays.length}, minmax(0, 1fr))` }}>
            {weekdays.map((weekday) => <div key={weekday} className="py-1 sm:py-0"><span className="sm:hidden" aria-label={weekday}>{weekday[0]}</span><span className="hidden sm:inline">{weekday}</span></div>)}
          </div>
          <div className="grid gap-1 sm:hidden" style={{ gridTemplateColumns: `repeat(${weekdays.length}, minmax(0, 1fr))` }}>
            {dates.map((day) => day.getMonth() !== date.getMonth() ? <div key={dateKey(day)} /> : (
              <button key={dateKey(day)} type="button" aria-pressed={isSameCalendarDay(day, date)} aria-label={`${day.toLocaleDateString("en-US", { month: "long", day: "numeric" })}, ${entriesFor(day).length} ${itemLabel}`} onClick={() => setDate(day)} className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold ${isSameCalendarDay(day, date) ? "bg-blue-600 text-white" : isSameCalendarDay(day, today) ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}>
                {day.getDate()}
                <span aria-hidden="true" className={`size-1 rounded-full ${entriesFor(day).length ? isSameCalendarDay(day, date) ? "bg-white" : "bg-blue-500" : "bg-transparent"}`} />
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-3 sm:hidden">{renderDayList(date)}</div>
          <div className="hidden divide-x divide-y divide-slate-100 sm:grid" style={{ gridTemplateColumns: `repeat(${weekdays.length}, minmax(0, 1fr))` }}>
            {dates.map((day) => {
              const currentMonth = day.getMonth() === date.getMonth();
              return (
                <div key={dateKey(day)} className={`min-h-[90px] min-w-0 p-2 ${currentMonth ? "bg-white" : "bg-slate-50/40"}`}>
                  <span className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${isSameCalendarDay(day, today) ? "bg-blue-600 font-bold text-white shadow-sm" : currentMonth ? "text-slate-700" : "text-slate-400"}`}>{day.getDate()}</span>
                  {currentMonth ? entriesFor(day).map((item) => renderEntry(item, true)) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {period === "day" ? <div className="p-1 sm:p-4">{renderDayList(date)}</div> : null}

      {period === "week" || period === "four-days" ? (
        <div className="overflow-x-auto">
          <div className="grid gap-px bg-slate-100" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`, minWidth: dates.length * 120 }}>
            {dates.map((day) => (
              <section key={dateKey(day)} className="min-h-48 min-w-0 bg-white p-2">
                <h3 className={`mb-3 rounded-lg py-2 text-center text-xs font-semibold ${isSameCalendarDay(day, today) ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}>{day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</h3>
                {entriesFor(day).length ? entriesFor(day).map((item) => renderEntry(item, true)) : <p className="text-center text-[11px] text-slate-400">No {itemLabel}</p>}
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {period === "year" ? (
        <div className="grid gap-4 p-1 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
          {Array.from({ length: 12 }, (_, month) => {
            const monthDate = new Date(date.getFullYear(), month, 1);
            return (
              <section key={month} className="min-w-0 rounded-xl border border-slate-200 p-3">
                <button type="button" onClick={() => { setDate(visibleMonthDate(monthDate, options.showWeekends)); setPeriod("month"); }} className="mb-2 min-h-11 w-full rounded-lg text-left text-sm font-bold text-slate-800 hover:bg-slate-50 sm:min-h-8">{monthDate.toLocaleDateString("en-US", { month: "long" })}</button>
                <div className="grid text-center text-[10px] text-slate-400" style={{ gridTemplateColumns: `repeat(${weekdays.length}, minmax(0, 1fr))` }}>{weekdays.map((weekday) => <span key={weekday} aria-label={weekday}>{weekday[0]}</span>)}</div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${weekdays.length}, minmax(0, 1fr))` }}>
                  {getCalendarDates(monthDate, "month", options.showWeekends).map((day) => day.getMonth() !== month ? <div key={dateKey(day)} /> : (
                    <button key={dateKey(day)} type="button" onClick={() => { setDate(day); setPeriod("day"); }} aria-label={`${day.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}, ${entriesFor(day).length} ${itemLabel}`} className={`flex min-h-11 flex-col items-center justify-center rounded-lg text-xs hover:bg-blue-50 sm:min-h-8 ${isSameCalendarDay(day, today) ? "bg-blue-50 font-bold text-blue-700" : "text-slate-600"}`}>
                      {day.getDate()}<span aria-hidden="true" className={`mt-1 size-1 rounded-full ${entriesFor(day).length ? "bg-blue-500" : "bg-transparent"}`} />
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {period === "schedule" ? (
        <div className="space-y-5 p-1 sm:p-4">
          {dates.some((day) => entriesFor(day).length) ? dates.filter((day) => entriesFor(day).length).map(renderDayList) : <p className="py-4 text-sm text-slate-500">No {itemLabel} scheduled for this period.</p>}
        </div>
      ) : null}
    </div>
  );
}
