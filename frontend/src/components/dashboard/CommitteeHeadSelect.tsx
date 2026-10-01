"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { OrganizationMember } from "@/services/auth.service";

type CommitteeHeadSelectProps = {
  members: OrganizationMember[];
  value: string | null;
  placeholder: string;
  onChange: (memberId: string | null) => void;
};

export function CommitteeHeadSelect({ members, value, placeholder, onChange }: CommitteeHeadSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedMember = members.find((member) => member.id === value);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function choose(memberId: string | null) {
    onChange(memberId);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm text-slate-700 outline-none transition focus:border-[#2868ed] focus:ring-2 focus:ring-[#2868ed]/15 ${open ? "border-[#2868ed]" : "border-slate-200"}`}
      >
        <span className={`min-w-0 truncate ${selectedMember ? "" : "text-slate-400"}`}>
          {selectedMember ? `${selectedMember.name} — ${selectedMember.position || selectedMember.role}` : placeholder}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl" role="listbox" aria-label="Committee head">
          <button type="button" role="option" aria-selected={!value} onClick={() => choose(null)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50">
            <span>{placeholder === "Choose a head (optional)" ? placeholder : "No head assigned"}</span>
            {!value ? <Check className="size-4 text-[#2868ed]" /> : null}
          </button>
          {members.map((member) => {
            const selected = member.id === value;
            return (
              <button key={member.id} type="button" role="option" aria-selected={selected} onClick={() => choose(member.id)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${selected ? "bg-blue-50 text-[#214574]" : "text-slate-700 hover:bg-slate-50"}`}>
                <span className="min-w-0 truncate">{member.name} <span className="text-slate-500">— {member.position || member.role}</span></span>
                {selected ? <Check className="size-4 shrink-0 text-[#2868ed]" /> : null}
              </button>
            );
          })}
          {!members.length ? <p className="px-3 py-4 text-center text-sm text-slate-500">No organization members available.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
