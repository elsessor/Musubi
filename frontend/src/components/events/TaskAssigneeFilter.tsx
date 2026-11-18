"use client";

import { UserRound } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";

export type TaskAssigneeScope = "all" | "mine";

export function TaskAssigneeFilter({ value, onChange, mobile = false }: {
  value: TaskAssigneeScope;
  onChange: (value: TaskAssigneeScope) => void;
  mobile?: boolean;
}) {
  return <CustomSelect
    tourId="task-assignee-filter"
    ariaLabel="Filter tasks by assignee"
    value={value}
    onChange={(value) => onChange(value as TaskAssigneeScope)}
    options={[{ value: "all", label: "All assignees" }, { value: "mine", label: "My tasks" }]}
    icon={<UserRound aria-hidden="true" size={14} />}
    containerClassName={mobile ? "w-full min-w-0" : "w-40 min-w-0"}
    buttonClassName={`min-h-11 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 ${mobile ? "" : "sm:min-h-9"}`}
    dropdownClassName="[&_button]:min-h-11"
    portal={!mobile}
  />;
}
