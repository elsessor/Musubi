"use client";

import { Calendar, ChevronLeft, Filter, LayoutGrid, Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import type { Event, Task, TaskStatus } from "./types";
import { KanbanColumn } from "./KanbanColumn";

const STATUSES: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];

type KanbanBoardProps = {
  event: Event;
  onBack: () => void;
};

export function KanbanBoard({ event, onBack }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(event.tasks);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [search, setSearch] = useState("");

  const visibleTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function getColumnTasks(status: TaskStatus) {
    return visibleTasks.filter((t) => t.status === status);
  }

  function handleDrop(targetStatus: TaskStatus) {
    if (!draggedId) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === draggedId ? { ...t, status: targetStatus } : t))
    );
    setDraggedId(null);
  }

  const completedCount = tasks.filter((t) => t.status === "Completed").length;

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
        <button type="button" onClick={onBack} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <ChevronLeft size={15} />
          Events
        </button>
        <span>/</span>
        <span className="font-medium text-slate-800">{event.title}</span>
      </div>

      {/* Event header card */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{event.title}</h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 ring-1 ring-blue-200">
                {event.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                {event.startDate} – {event.endDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={12} />
                {event.memberCount} members
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                {tasks.length} tasks
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">{event.progress}%</p>
            <p className="text-xs text-slate-500">complete</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
            style={{ width: `${event.progress}%` }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Status filter pills */}
        <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {(["All", ...STATUSES] as const).map((s) => {
            const count = s === "All" ? tasks.length : tasks.filter((t) => t.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === s
                    ? "bg-slate-900 text-white shadow"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s} <span className="ml-0.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Committee pill */}
        <button type="button" className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
          <Filter size={12} />
          All Committees
        </button>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="h-8 rounded-xl bg-white pl-8 pr-3 text-xs text-slate-700 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
            ⚡ Workflow
          </button>
          <button type="button" className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
            ◈ Statuses
          </button>
          <button type="button" className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700">
            <Plus size={13} />
            Add Task
          </button>
          <div className="flex items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <button type="button" className="px-2.5 py-2 text-slate-600 hover:text-blue-600">
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Kanban board — horizontal scroll */}
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getColumnTasks(status)}
            onAddTask={() => {}}
            onDragStart={(id) => setDraggedId(id)}
            onDrop={handleDrop}
          />
        ))}

        {/* + New Status column */}
        <div className="flex min-w-[64px] flex-col items-center justify-start pt-12">
          <button
            type="button"
            className="flex flex-col items-center gap-1 rounded-xl p-4 text-slate-400 transition-colors hover:bg-white hover:text-slate-600 hover:shadow-sm"
          >
            <Plus size={18} />
            <span className="text-[10px] font-medium">New<br />Status</span>
          </button>
        </div>
      </div>

      {/* Completion summary footer */}
      <p className="mt-2 text-center text-xs text-slate-400">
        {completedCount} of {tasks.length} tasks completed
      </p>
    </div>
  );
}
