"use client";

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MiniCalendarPickerProps = {
  value: string;
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  format?: "medium" | "iso"; // "medium" => "Aug 30, 2026", "iso" => "2026-08-30"
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
  format = "medium"
}: MiniCalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date from string or default to August 2026 / current date
  const parseDate = (val: string): Date => {
    if (!val) return new Date(2026, 7, 15);
    const dt = new Date(val);
    if (!isNaN(dt.getTime())) return dt;

    // Handle string like "Aug 30" or "Aug 30, 2026"
    const match = val.match(/([A-Za-z]+)\s+(\d+)(?:,\s*(\d+))?/);
    if (match) {
      const monthIdx = MONTH_SHORT.findIndex(
        (m) => m.toLowerCase() === match[1].substring(0, 3).toLowerCase()
      );
      const day = parseInt(match[2], 10);
      const year = match[3] ? parseInt(match[3], 10) : 2026;
      if (monthIdx !== -1 && !isNaN(day)) {
        return new Date(year, monthIdx, day);
      }
    }
    return new Date(2026, 7, 15);
  };

  const initialDate = parseDate(value);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    const dt = parseDate(value);
    setViewYear(dt.getFullYear());
    setViewMonth(dt.getMonth());
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  function prevMonth() {
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

  function handleSelectDay(day: number) {
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

    onChange(formatted);
    setIsOpen(false);
  }

  const selectedDateObj = parseDate(value);
  const isSelectedMonth =
    selectedDateObj.getFullYear() === viewYear && selectedDateObj.getMonth() === viewMonth;
  const selectedDay = isSelectedMonth ? selectedDateObj.getDate() : -1;

  // Build calendar cells
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ isBlank: true, day: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ isBlank: false, day: d });
  }

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-white hover:border-blue-400 focus:outline-none ${buttonClassName}`}
      >
        <CalendarIcon size={14} className="text-blue-500 shrink-0" />
        <span className="truncate">{value || placeholder}</span>
      </button>

      {/* Mini Calendar Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span className="text-xs font-extrabold text-slate-800">
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

              const isSelected = cell.day === selectedDay;
              const isToday =
                cell.day === 15 && viewMonth === 7 && viewYear === 2026; // Highlight Aug 15 2026 demo today

              return (
                <button
                  key={`day-${cell.day}`}
                  type="button"
                  onClick={() => handleSelectDay(cell.day)}
                  className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-semibold transition ${
                    isSelected
                      ? "bg-blue-600 font-bold text-white shadow-xs"
                      : isToday
                      ? "bg-blue-50 text-blue-600 font-bold border border-blue-200"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Quick preset footer */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                setViewYear(2026);
                setViewMonth(7);
                handleSelectDay(15);
              }}
              className="font-bold text-blue-600 hover:underline"
            >
              Today (Aug 15)
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
