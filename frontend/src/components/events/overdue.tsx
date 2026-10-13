"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { getTaskTiming, type ScheduledTask } from "@/utils/taskTiming";

export function getOverdueDays(task: ScheduledTask, now = new Date()) {
  const timing = getTaskTiming(task, now);
  return timing.kind === "overdue" && timing.deadline ? Math.max(1, Math.floor((now.getTime() - timing.deadline.getTime()) / 86400000)) : 0;
}

export function OverdueBadge({ task, compact = false }: { task: ScheduledTask; compact?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const timing = getTaskTiming(task, now);
  if (!["overdue", "awaiting-review", "completed-late"].includes(timing.kind)) return null;
  const title = timing.kind === "overdue" && task.blockedBy ? `${timing.label}. Waiting for: ${(task.blockedByTaskTitles || []).join(", ") || "unfinished prerequisites"}`
    : timing.kind === "completed-late" ? "The recorded submission or completion was after its deadline." : timing.label;
  const color = timing.kind === "overdue" ? "bg-rose-50 text-rose-700 ring-rose-200" : timing.kind === "awaiting-review" ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-amber-50 text-amber-700 ring-amber-200";
  return <span title={title} aria-label={`${timing.label}. ${title}`} className={`inline-flex items-center gap-1 rounded-full ${compact ? "mr-1 px-1" : "px-2"} py-0.5 text-[10px] font-bold ring-1 ${color}`}><AlertTriangle size={10} />{compact ? null : timing.label}</span>;
}
