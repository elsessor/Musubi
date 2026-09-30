"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type SearchableComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  className?: string;
};

export function SearchableCombobox({ value, onChange, options, placeholder, className = "" }: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    return query ? options.filter((option) => option.toLowerCase().includes(query)) : options;
  }, [options, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          className={`${className} pr-9`}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show options"
          onClick={() => setIsOpen((previous) => !previous)}
          className="absolute right-2.5 text-slate-400 transition hover:text-slate-600"
        >
          <ChevronDown className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 ? (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#dce3ed] bg-white py-1 shadow-lg shadow-slate-900/10">
          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] transition ${
                value === option ? "bg-[#edf3fc] font-semibold text-[#1d3b63]" : "text-slate-700 hover:bg-[#f3f6fa] hover:text-[#12213a]"
              }`}
            >
              <span>{option}</span>
              {value === option ? <Check className="size-3.5 text-[#244775]" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
