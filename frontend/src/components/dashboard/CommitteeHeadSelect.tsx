"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { MemberAvatar } from "@/components/dashboard/MemberAvatar";
import type { OrganizationMember } from "@/services/auth.service";

type CommitteeHeadSelectProps = {
  members: OrganizationMember[];
  value: string | null;
  placeholder: string;
  onChange: (memberId: string | null) => void;
  disabled?: boolean;
};

export function CommitteeHeadSelect({ members, value, placeholder, onChange, disabled = false }: CommitteeHeadSelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 224 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selectedMember = members.find((member) => member.id === value);
  const visible = open && !disabled;

  // Render outside scroll containers, but keep the menu anchored to its field.
  useLayoutEffect(() => {
    if (!visible) return;
    function positionMenu() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 14;
      const above = rect.top - 14;
      const upward = below < 224 && above > below;
      const maxHeight = Math.min(224, Math.max(0, upward ? above : below));
      const height = Math.min(menuRef.current?.scrollHeight ?? 224, maxHeight);
      const width = Math.min(rect.width, window.innerWidth - 24);
      setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: upward ? rect.top - height - 6 : rect.bottom + 6, width, maxHeight });
    }
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [visible, members.length]);

  useEffect(() => {
    if (!visible) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  function choose(memberId: string | null) {
    onChange(memberId);
    setOpen(false);
    buttonRef.current?.focus();
  }

  const optionClass = (selected: boolean) => `flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${selected ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`;

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label="Committee head"
        aria-haspopup="listbox"
        aria-controls={visible ? menuId : undefined}
        aria-expanded={visible}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus());
          }
        }}
        className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm text-slate-700 outline-none transition focus:border-[#2868ed] focus:ring-2 focus:ring-[#2868ed]/15 disabled:cursor-not-allowed disabled:opacity-60 ${visible ? "border-[#2868ed]" : "border-slate-200"}`}
      >
        <span className={`flex min-w-0 items-center gap-3 ${selectedMember ? "" : "text-slate-400"}`}>
          <MemberAvatar member={selectedMember} />
          <span className="truncate">{selectedMember ? `${selectedMember.name} \u2014 ${selectedMember.position || selectedMember.role}` : placeholder}</span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition-transform ${visible ? "rotate-180" : ""}`} />
      </button>
      {visible ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          style={{ ...position, visibility: position.width ? "visible" : "hidden" }}
          className="fixed z-[70] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          role="listbox"
          aria-label="Committee head"
          onKeyDown={(event) => {
            const options = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
            const current = options.indexOf(document.activeElement as HTMLButtonElement);
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
              options[next]?.focus();
            } else if (event.key === "Tab") {
              setOpen(false);
              buttonRef.current?.focus();
            }
          }}
        >
          <button type="button" role="option" aria-selected={!value} onClick={() => choose(null)} className={optionClass(!value)}>
            <span className="flex min-w-0 items-center gap-3"><MemberAvatar /><span>No head assigned</span></span>
            {!value ? <Check className="size-4 shrink-0" /> : null}
          </button>
          {members.map((member) => {
            const selected = member.id === value;
            return (
              <button key={member.id} type="button" role="option" aria-selected={selected} onClick={() => choose(member.id)} className={optionClass(selected)}>
                <span className="flex min-w-0 items-center gap-3"><MemberAvatar member={member} /><span className="min-w-0 break-words"><span className="block font-semibold">{member.name}</span><span className="mt-0.5 block text-xs text-slate-500">{member.position || member.role}</span></span></span>
                {selected ? <Check className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
          {!members.length ? <p className="px-3 py-4 text-center text-sm text-slate-500">No organization members available.</p> : null}
        </div>, document.body
      ) : null}
    </div>
  );
}
