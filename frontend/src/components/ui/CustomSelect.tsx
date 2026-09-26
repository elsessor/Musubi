"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/utils";

export type CustomSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
  initials?: string;
  color?: string;
  indicatorClass?: string;
  labelClass?: string;
  selectedClass?: string;
};

export type CustomSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  buttonClassName = "",
  dropdownClassName = ""
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none shadow-2xs select-none cursor-pointer",
          buttonClassName,
          selectedOption?.selectedClass,
          isOpen && "border-blue-500 bg-white ring-2 ring-blue-100"
        )}
      >
        <div className="flex items-center gap-2 truncate text-left">
          {selectedOption?.initials && (
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                selectedOption.color || "bg-blue-600"
              )}
            >
              {selectedOption.initials}
            </span>
          )}
          <span className="truncate">
          {selectedOption ? (
              <span className={cn(selectedOption.labelClass)}>
                {selectedOption.indicatorClass && <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", selectedOption.selectedClass ? "bg-white" : selectedOption.indicatorClass)} />}
                {selectedOption.label}
                {selectedOption.sublabel ? (
                  <span className="text-slate-400 font-normal"> — {selectedOption.sublabel}</span>
                ) : null}
              </span>
            ) : (
              <span className="text-slate-400 font-normal">{placeholder}</span>
            )}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-slate-400 transition-transform duration-200 shrink-0 ml-2",
            isOpen && "rotate-180 text-blue-600"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2",
            dropdownClassName
          )}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs font-medium text-slate-400 text-center">
              No options available
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition select-none cursor-pointer",
                    isSelected
                      ? opt.selectedClass || "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.initials && (
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                          opt.color || "bg-blue-600"
                        )}
                      >
                        {opt.initials}
                      </span>
                    )}
                    <div className="truncate">
                      {opt.indicatorClass && <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", isSelected && opt.selectedClass ? "bg-white" : opt.indicatorClass)} />}
                      <span className={cn(opt.labelClass)}>{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-slate-400 font-normal ml-1"> — {opt.sublabel}</span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-blue-600 shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
