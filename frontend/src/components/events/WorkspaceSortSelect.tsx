"use client";

import { ArrowDownWideNarrow, Clock } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { EventSortMode, TaskSortMode } from "@/utils/workspaceSort";

type Props = { calendar?: boolean } & (
  { kind: "events"; value: EventSortMode; onChange: (value: EventSortMode) => void }
  | { kind: "tasks"; value: TaskSortMode; onChange: (value: TaskSortMode) => void }
);

export function WorkspaceSortSelect(props: Props) {
  const options = props.kind === "events" ? [
    { value: "upcoming", label: "Upcoming first", description: "Ongoing events, then the nearest upcoming dates." },
    { value: "latest", label: "Latest event date", description: "Latest scheduled start dates first." },
    { value: "created", label: "Recently created", description: "Newest event records first." },
    { value: "updated", label: "Recently updated", description: "Most recently modified first." },
    { value: "name", label: "Event name (A–Z)", description: "Alphabetical order." }
  ] : [
    { value: "attention", label: "Needs attention" },
    { value: "deadline", label: "Nearest deadline" },
    { value: "priority", label: "Highest priority" },
    { value: "name", label: "Task name (A–Z)" }
  ];
  return <CustomSelect
    tourId={`${props.kind === "events" ? "event" : "task"}-sort`}
    ariaLabel={`Sort ${props.kind}`}
    value={props.calendar ? "schedule" : props.value}
    options={props.calendar ? [{ value: "schedule", label: "Scheduled time" }] : options}
    disabled={props.calendar}
    onChange={(value) => {
      if (props.kind === "events") props.onChange(value as EventSortMode);
      else props.onChange(value as TaskSortMode);
    }}
    icon={props.calendar ? <Clock aria-hidden="true" size={14} /> : <ArrowDownWideNarrow aria-hidden="true" size={14} />}
    containerClassName="w-full min-w-0 sm:w-44"
    buttonClassName="min-h-11 rounded-xl bg-white px-3 text-xs text-slate-700 sm:min-h-9"
    dropdownClassName="[&_button]:min-h-11"
    portal
  />;
}
