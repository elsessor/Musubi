"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/utils";

export type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
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
  icon?: React.ReactNode;
  containerClassName?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  direction?: "up" | "down" | "auto";
  portal?: boolean;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  icon,
  containerClassName = "",
  buttonClassName = "",
  dropdownClassName = "",
  disabled = false,
  direction = "auto",
  portal = false
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 224 });

  useLayoutEffect(() => {
    if (!portal || !isOpen || disabled) return;
    function updatePosition() {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upward = direction === "up" || (direction === "auto" && below < 224 && above > below);
      const maxHeight = Math.max(0, Math.min(224, upward ? above : below));
      const width = Math.min(rect.width, window.innerWidth - 24);
      // Measure at the trigger's width before placing an upward-opening menu.
      if (dropdownRef.current) dropdownRef.current.style.width = `${width}px`;
      const height = Math.min((dropdownRef.current?.scrollHeight ?? 224) + 2, maxHeight);
      setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: upward ? rect.top - height - 4 : rect.bottom + 4, width, maxHeight });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [portal, isOpen, disabled, direction, options.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node) && !dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;

    if (!isOpen && containerRef.current) {
      if (direction === "up") {
        setOpenUpward(true);
      } else if (direction === "down") {
        setOpenUpward(false);
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpward(spaceBelow < 240);
      }
    }
    setIsOpen((prev) => !prev);
  };

  const selectedOption = options.find((opt) => opt.value === value);

  const dropdown = isOpen && !disabled ? (
        <div
          ref={dropdownRef}
          style={portal ? { ...position, visibility: position.width ? "visible" : "hidden" } : undefined}
          className={cn(
            "z-50 max-h-56 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl",
            portal ? "fixed z-[70] overscroll-contain transition-none" : "absolute left-0 right-0 transition-colors",
            !portal && (openUpward ? "bottom-full mb-1 animate-in fade-in slide-in-from-bottom-2" : "top-full mt-1 animate-in fade-in slide-in-from-top-2"),
            dropdownClassName
          )}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs font-medium text-slate-400 text-center">No options available</div>
          ) : options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setIsOpen(false); }} className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition select-none cursor-pointer", isSelected ? opt.selectedClass || "bg-blue-50 text-blue-700 font-bold" : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900")}>
                <div className="flex min-w-0 items-center gap-2 truncate">
                  {opt.initials && <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white", opt.color || "bg-blue-600")}>{opt.initials}</span>}
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                    {opt.indicatorClass && <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", opt.indicatorClass)} />}
                    <span className={cn(opt.labelClass)}>{opt.label}</span>
                    {opt.sublabel && <span className="text-slate-400 font-normal ml-1"> — {opt.sublabel}</span>}
                    </div>
                    {opt.description ? <p className="mt-0.5 whitespace-normal break-words text-[11px] font-normal leading-relaxed text-slate-500">{opt.description}</p> : null}
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-current shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      ) : null;

  return (
    <div ref={containerRef} className={cn("relative w-full", containerClassName)}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none shadow-2xs select-none cursor-pointer",
          buttonClassName,
          selectedOption?.selectedClass,
          isOpen && "border-blue-500 bg-white ring-2 ring-blue-100",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <div className="flex items-center gap-2 truncate text-left">
          {icon}
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
                {selectedOption.indicatorClass && <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", selectedOption.indicatorClass)} />}
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

      {dropdown && (portal ? createPortal(dropdown, document.body) : dropdown)}
    </div>
  );
}
