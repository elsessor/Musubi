"use client";

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MiniCalendarPickerProps = {
  value: string;
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  format?: "medium" | "iso"; // "medium" => "Sep 23, 2026", "iso" => "2026-09-23"
  includeTime?: boolean; // If true, adds time selector (e.g., 09:00 AM)
  minDate?: Date;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function MiniCalendarPicker({
  value,
  onChange,
  placeholder = "Select date",
  className = "",
  buttonClassName = "",
  format = "medium",
  includeTime = false,
  minDate
}: MiniCalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const now = new Date();
  const earliestDate = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null;
  const isBeforeMinDate = (date: Date) => !!earliestDate && date < earliestDate;

  // Helper to parse string into Date & Time components
  const parseDate = (val: string): { date: Date; hour: number; minute: number; ampm: "AM" | "PM" } => {
    let dt = new Date();
    let hour = 9;
    let minute = 0;
    let ampm: "AM" | "PM" = "AM";

    if (!val || !val.trim()) {
      return { date: now, hour, minute, ampm };
    }

    // Extract time if present (e.g. "9:30 AM" or "14:30")
    const timeMatch = val.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const period = timeMatch[3]?.toUpperCase() as "AM" | "PM" | undefined;

      if (period) {
        ampm = period;
        hour = h >= 1 && h <= 12 ? h : 9;
      } else {
        if (h >= 12) {
          ampm = "PM";
          hour = h === 12 ? 12 : h - 12;
        } else {
          ampm = "AM";
          hour = h === 0 ? 12 : h;
        }
      }
      minute = !isNaN(m) && m >= 0 && m < 60 ? m : 0;
    }

    // Try standard JS date parsing
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      let yr = parsed.getFullYear();
      if (yr === 2001 && !val.includes("2001")) {
        yr = now.getFullYear();
      }
      dt = new Date(yr, parsed.getMonth(), parsed.getDate());
      return { date: dt, hour, minute, ampm };
    }

    // Handle month short string e.g. "Aug 30", "Sep 23, 2026"
    const match = val.match(/([A-Za-z]+)\s+(\d+)(?:,\s*(\d+))?/);
    if (match) {
      const monthIdx = MONTH_SHORT.findIndex(
        (m) => m.toLowerCase() === match[1].substring(0, 3).toLowerCase()
      );
      const day = parseInt(match[2], 10);
      const year = match[3] ? parseInt(match[3], 10) : now.getFullYear();
      if (monthIdx !== -1 && !isNaN(day)) {
        dt = new Date(year, monthIdx, day);
        return { date: dt, hour, minute, ampm };
      }
    }

    return { date: now, hour, minute, ampm };
  };

  const parsedInfo = parseDate(value);
  const [viewYear, setViewYear] = useState(parsedInfo.date.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedInfo.date.getMonth());
  const [selectedDay, setSelectedDay] = useState(parsedInfo.date.getDate());
  const [selectedHour, setSelectedHour] = useState(parsedInfo.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsedInfo.minute);
  const [selectedAmPm, setSelectedAmPm] = useState<"AM" | "PM">(parsedInfo.ampm);

  useEffect(() => {
    const info = parseDate(value);
    setViewYear(info.date.getFullYear());
    setViewMonth(info.date.getMonth());
    setSelectedDay(info.date.getDate());
    setSelectedHour(info.hour);
    setSelectedMinute(info.minute);
    setSelectedAmPm(info.ampm);
  }, [value]);

  // Recalculate floating position
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverHeight = includeTime ? 380 : 300;
    const popoverWidth = 288; // 72 * 4 = 288px

    let top = rect.bottom + 6;
    if (top + popoverHeight > window.innerHeight - 10 && rect.top > popoverHeight) {
      top = Math.max(10, rect.top - popoverHeight - 6);
    }

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popoverWidth - 10);
    }

    setPopoverPos({ top, left });
  };

  const handleToggleOpen = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close when clicking outside or scrolling parents
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, includeTime]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  function prevMonth() {
    const previousMonth = new Date(viewYear, viewMonth - 1, 1);
    if (earliestDate && previousMonth < new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1)) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function formatAndEmit(day: number, h = selectedHour, m = selectedMinute, period = selectedAmPm) {
    const selectedDate = new Date(viewYear, viewMonth, day);
    let formatted = "";

    if (format === "iso") {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(selectedDate.getDate()).padStart(2, "0");
      formatted = `${yyyy}-${mm}-${dd}`;
    } else {
      const monthStr = MONTH_SHORT[selectedDate.getMonth()];
      formatted = `${monthStr} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
    }

    if (includeTime) {
      const hhStr = String(h).padStart(2, "0");
      const mmStr = String(m).padStart(2, "0");
      formatted += ` at ${hhStr}:${mmStr} ${period}`;
    }

    onChange(formatted);
  }

  function handleSelectDay(day: number) {
    if (isBeforeMinDate(new Date(viewYear, viewMonth, day))) return;
    setSelectedDay(day);
    formatAndEmit(day);
    if (!includeTime) {
      setIsOpen(false);
    }
  }

  function handleSelectToday() {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(today.getDate());
    formatAndEmit(today.getDate());
    if (!includeTime) {
      setIsOpen(false);
    }
  }

  const selectedDateObj = parsedInfo.date;
  const isSelectedMonth =
    selectedDateObj.getFullYear() === viewYear && selectedDateObj.getMonth() === viewMonth;

  // Build calendar cells
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ isBlank: true, day: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ isBlank: false, day: d });
  }

  return (
    <div className={`relative inline-block w-full ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        className={`flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-white hover:border-blue-400 focus:outline-none ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon size={14} className="text-blue-500 shrink-0" />
          <span className="truncate">{value || placeholder}</span>
        </div>
        {includeTime && <Clock size={12} className="text-slate-400 shrink-0" />}
      </button>

      {/* Floating Pop-out Mini Calendar Popover Portal */}
      {isOpen && popoverPos && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              zIndex: 99999
            }}
            className="w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
              <span className="text-xs font-extrabold text-slate-900">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                  title="Previous Month"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                  title="Next Month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-0.5">{wd}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, idx) => {
                if (cell.isBlank) {
                  return <div key={`blank-${idx}`} className="h-7 w-7" />;
                }

                const isSelected = isSelectedMonth && cell.day === selectedDay;
                const isToday =
                  cell.day === now.getDate() &&
                  viewMonth === now.getMonth() &&
                  viewYear === now.getFullYear();
                const isDisabled = isBeforeMinDate(new Date(viewYear, viewMonth, cell.day));

                return (
                  <button
                    key={`day-${cell.day}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectDay(cell.day)}
                    className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? "bg-blue-600 font-bold text-white shadow-xs"
                        : isToday
                        ? "bg-blue-50 text-blue-600 font-bold border border-blue-200"
                        : isDisabled
                        ? "cursor-not-allowed text-slate-300"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Optional Time Selector Bar */}
            {includeTime && (
              <div className="mt-3 border-t border-slate-100 pt-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-blue-500" /> Time Selection
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80">
                  {/* Hours dropdown */}
                  <select
                    value={selectedHour}
                    onChange={(e) => {
                      const h = parseInt(e.target.value, 10);
                      setSelectedHour(h);
                      formatAndEmit(selectedDay, h, selectedMinute, selectedAmPm);
                    }}
                    className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}
                      </option>
                    ))}
                  </select>

                  <span className="font-bold text-slate-400">:</span>

                  {/* Minutes dropdown (00-59 continuous, no gaps) */}
                  <select
                    value={selectedMinute}
                    onChange={(e) => {
                      const m = parseInt(e.target.value, 10);
                      setSelectedMinute(m);
                      formatAndEmit(selectedDay, selectedHour, m, selectedAmPm);
                    }}
                    className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 max-h-36 overflow-y-auto"
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>

                  {/* AM / PM selector */}
                  <div className="flex rounded-lg bg-white p-0.5 border border-slate-200 text-xs font-bold">
                    {(["AM", "PM"] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => {
                          setSelectedAmPm(period);
                          formatAndEmit(selectedDay, selectedHour, selectedMinute, period);
                        }}
                        className={`px-2 py-0.5 rounded-md transition ${
                          selectedAmPm === period
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Preset & Close Actions */}
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={handleSelectToday}
                className="font-bold text-blue-600 hover:underline"
              >
                Set Today ({now.toLocaleDateString("en-US", { month: "short", day: "numeric" })})
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-slate-900 px-3 py-1 font-bold text-white hover:bg-slate-800 transition"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
