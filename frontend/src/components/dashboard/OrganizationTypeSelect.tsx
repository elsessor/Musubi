"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ORGANIZATION_TYPES } from "@/utils/organizationOptions";

const addTypeValue = "__musubi_add_organization_type__";

export function OrganizationTypeSelect({ value, onChange, disabled = false, buttonClassName }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  buttonClassName?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [addedTypes, setAddedTypes] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const types = Array.from(new Set([...ORGANIZATION_TYPES, ...addedTypes, ...(value ? [value] : [])]));

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  function addType() {
    const name = draft.trim();
    if (disabled || !name || name === addTypeValue) return;
    const selected = types.find((type) => type.toLowerCase() === name.toLowerCase()) || name;
    setAddedTypes((previous) => previous.includes(selected) ? previous : [...previous, selected]);
    onChange(selected);
    setAdding(false);
    setDraft("");
  }

  return <div className="space-y-2">
    <CustomSelect
      value={value}
      onChange={(selected) => {
        if (selected === addTypeValue) { setDraft(""); setAdding(true); }
        else { onChange(selected); setAdding(false); }
      }}
      options={[...types.map((type) => ({ value: type, label: type })), { value: addTypeValue, label: "+ Add specific type", labelClass: "text-blue-600" }]}
      placeholder="Select a type"
      disabled={disabled}
      buttonClassName={buttonClassName}
    />
    {adding && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label htmlFor={inputId} className="text-xs font-semibold text-slate-600">Specific organization type</label>
      <input
        id={inputId}
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={80}
        disabled={disabled}
        placeholder="e.g. Environmental Advocacy"
        className="mt-2 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); addType(); }
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setAdding(false); }
        }}
      />
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={disabled} onClick={() => setAdding(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
        <button type="button" disabled={disabled || !draft.trim() || draft.trim() === addTypeValue} onClick={addType} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Add type</button>
      </div>
    </div>}
  </div>;
}
