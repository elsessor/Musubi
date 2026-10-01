"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { POPULAR_SKILLS, SKILL_OPTIONS } from "@/utils/profileOptions";

export function SkillsPicker({ selectedSkills, onChange }: { selectedSkills: string[]; onChange: (skills: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filteredSkills = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search ? SKILL_OPTIONS.filter((skill) => skill.toLowerCase().includes(search)) : SKILL_OPTIONS;
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const containsSkill = (skill: string) => selectedSkills.some((selected) => selected.toLowerCase() === skill.toLowerCase());
  const selectSkill = (skill: string) => {
    onChange(containsSkill(skill)
      ? selectedSkills.filter((selected) => selected.toLowerCase() !== skill.toLowerCase())
      : [...selectedSkills, skill]);
    setQuery("");
  };
  const toggleSkill = (skill: string) => {
    selectSkill(skill);
  };
  const addCustomSkill = () => {
    const skill = query.trim();
    if (skill && !containsSkill(skill)) onChange([...selectedSkills, skill]);
    setQuery("");
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Skills &amp; competencies</p>
        <p className="mt-1 text-xs text-slate-500">Search skills, select quick picks, or add a custom skill.</p>
      </div>

      <div>
        <span className="text-[11px] font-semibold text-slate-400">Popular quick picks</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {POPULAR_SKILLS.map((skill) => {
            const active = containsSkill(skill);
            return (
              <button
                key={skill}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSkill(skill)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${active ? "border-[#244775] bg-[#244775] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}
              >
                {active ? "✓ " : "+ "}{skill}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={containerRef} className="relative">
        <div className={`flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border bg-white p-2 ${isOpen ? "border-[#244775] ring-2 ring-[#244775]/15" : "border-slate-200"}`} onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}>
          <Search className="ml-1 size-4 shrink-0 text-slate-400" />
          {selectedSkills.map((skill) => (
            <span key={skill} className="inline-flex items-center gap-1 rounded-lg bg-[#e8edf5] px-2.5 py-1 text-xs font-bold text-[#193960]">
              {skill}
              <button type="button" aria-label={`Remove ${skill}`} onClick={(event) => { event.stopPropagation(); toggleSkill(skill); }} className="rounded p-0.5 text-slate-500 hover:text-rose-600">
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
                return;
              }
              if (event.key !== "Enter") return;
              event.preventDefault();
              const exact = SKILL_OPTIONS.find((skill) => skill.toLowerCase() === query.trim().toLowerCase());
              if (exact) toggleSkill(exact);
              else addCustomSkill();
              setQuery("");
            }}
            placeholder={selectedSkills.length ? "Add more skills..." : "Search or enter a skill..."}
            className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button type="button" aria-label="Toggle skill list" onClick={(event) => { event.stopPropagation(); setIsOpen((open) => !open); }} className="ml-auto p-1 text-slate-400 hover:text-slate-600">
            <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {isOpen ? (
          <div className="mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-[#dce3ed] bg-white py-1 shadow-lg">
            {query.trim() && !SKILL_OPTIONS.some((skill) => skill.toLowerCase() === query.trim().toLowerCase()) && !containsSkill(query.trim()) ? (
              <button type="button" onMouseDown={(event) => { event.preventDefault(); addCustomSkill(); }} className="flex w-full items-center justify-between border-b border-slate-100 px-3.5 py-2.5 text-left text-[13px] font-medium text-[#244775] hover:bg-[#edf3fc]">
                <span>Add custom skill: “{query.trim()}”</span><span className="rounded bg-[#244775] px-2 py-0.5 text-[11px] font-bold text-white">+ Add</span>
              </button>
            ) : null}
            {filteredSkills.map((skill) => {
              const active = containsSkill(skill);
              return (
                <button key={skill} type="button" onMouseDown={(event) => { event.preventDefault(); selectSkill(skill); }} className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] ${active ? "bg-[#edf3fc] font-semibold text-[#1d3b63]" : "text-slate-700 hover:bg-[#f3f6fa]"}`}>
                  <span>{skill}</span>{active ? <Check className="size-3.5 text-[#244775]" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
