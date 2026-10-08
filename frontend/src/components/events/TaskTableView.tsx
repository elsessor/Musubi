"use client";

import { AlertTriangle, Calendar, Check, CheckCircle, ChevronDown, ShieldAlert, Sparkles } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "./types";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getOrderedTaskStatuses, getStatusTheme, type CustomStatusConfig } from "./statusUtils";
import { ALL_PRIORITIES, PRIORITY_CONFIG as priorityConfig } from "./priorityUtils";
import { useAuthStore } from "@/store/authStore";
import { canUpdateTaskStatus, canUseTaskPriorityControl } from "@/utils/taskAssignment";
import { TaskAssignee } from "./TaskAssignee";



type TaskTableViewProps = {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onUpdatePriority?: (taskId: string, newPriority: TaskPriority) => void;
  onSelectTask?: (task: Task) => void;
  customStatuses?: CustomStatusConfig[];
  statusOrder?: string[];
};

export function TaskTableView({ tasks, onUpdateStatus, onUpdatePriority, onSelectTask, customStatuses, statusOrder }: TaskTableViewProps) {
  const uid = useAuthStore((state) => state.firebaseUser?.uid ?? state.profile?.uid);
  const fullName = useAuthStore((state) => state.profile?.fullName || state.firebaseUser?.displayName || "");
  const role = useAuthStore((state) => state.profile?.role);
  function canEditStatus(task: Task) { return canUpdateTaskStatus(task, uid, fullName, role); }
  function canEditPriority(task: Task) { return canUseTaskPriorityControl(task, uid, fullName, Boolean(onUpdatePriority)); }
  // Status Dropdown State
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    openUpward: boolean;
  } | null>(null);

  // Priority Dropdown State
  const [openPriorityDropdownId, setOpenPriorityDropdownId] = useState<string | null>(null);
  const [priorityDropdownPos, setPriorityDropdownPos] = useState<{
    top: number;
    left: number;
    openUpward: boolean;
  } | null>(null);

  const allStatuses = getOrderedTaskStatuses(statusOrder, customStatuses, tasks.map((task) => task.status));

  // Close dropdown on scroll or resize outside the menus
  useEffect(() => {
    if (!openDropdownId && !openPriorityDropdownId) return;

    const handleScrollOrResize = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.('[data-popup-menu="true"]')) {
        return;
      }
      setOpenDropdownId(null);
      setDropdownPos(null);
      setOpenPriorityDropdownId(null);
      setPriorityDropdownPos(null);
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [openDropdownId, openPriorityDropdownId]);

  function handleToggleDropdown(taskId: string, e: React.MouseEvent<HTMLButtonElement>) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !canEditStatus(task)) return;
    if (openDropdownId === taskId) {
      setOpenDropdownId(null);
      setDropdownPos(null);
      return;
    }
    setOpenPriorityDropdownId(null);
    setPriorityDropdownPos(null);

    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setDropdownPos({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      openUpward,
    });
    setOpenDropdownId(taskId);
  }

  function handleTogglePriorityDropdown(taskId: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (openPriorityDropdownId === taskId) {
      setOpenPriorityDropdownId(null);
      setPriorityDropdownPos(null);
      return;
    }
    setOpenDropdownId(null);
    setDropdownPos(null);

    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setPriorityDropdownPos({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      openUpward,
    });
    setOpenPriorityDropdownId(taskId);
  }

  const activeTask = tasks.find((t) => t.id === openDropdownId);
  const activePriorityTask = tasks.find((t) => t.id === openPriorityDropdownId);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-700">No tasks found</p>
        <p className="mt-1 text-xs text-slate-400">Add a task or adjust filters to view tasks in table mode.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-3.5">Task Title</th>
              <th scope="col" className="px-4 py-3.5">Committee</th>
              <th scope="col" className="px-4 py-3.5">Status</th>
              <th scope="col" className="px-4 py-3.5">Priority</th>
              <th scope="col" className="px-4 py-3.5">Assignee</th>
              <th scope="col" className="px-4 py-3.5">Due Date</th>
              <th scope="col" className="px-4 py-3.5">Flags / Info</th>
              <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {tasks.map((task) => {
              const pCfg = priorityConfig[task.priority || "Medium"];
              const theme = getStatusTheme(task.status, customStatuses);
              const isStatusOpen = openDropdownId === task.id;
              const isPriorityOpen = openPriorityDropdownId === task.id;

              return (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask?.(task)}
                  className="transition-colors hover:bg-slate-50/80 cursor-pointer"
                >
                  {/* Title & Description */}
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {task.title || task.description}
                    </div>
                    {task.description && task.title && task.description.trim() !== task.title.trim() && (
                      <div className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{task.description}</div>
                    )}
                  </td>

                  {/* Committee */}
                  <td className="px-4 py-3.5">
                    <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 border border-violet-200">
                      {task.committee || "General"}
                    </span>
                  </td>

                  {/* Status Dropdown Trigger */}
                  <td className="px-4 py-3.5">
                    {canEditStatus(task) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDropdown(task.id, e);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${theme.badge
                        } ${isStatusOpen ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                      {task.status}
                      <ChevronDown size={12} className={`transition-transform opacity-60 ${isStatusOpen ? "rotate-180" : ""}`} />
                    </button>
                    ) : <span onClick={(event) => event.stopPropagation()} className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold ${theme.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />{task.status}</span>}
                  </td>

                  {/* Priority Dropdown Trigger */}
                  <td className="px-4 py-3.5">
                    {canEditPriority(task) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePriorityDropdown(task.id, e);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition-all hover:brightness-95 cursor-pointer ${pCfg.classes
                          } ${isPriorityOpen ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {pCfg.label}
                        <ChevronDown size={11} className={`transition-transform opacity-60 ${isPriorityOpen ? "rotate-180" : ""}`} />
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${pCfg.classes}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {pCfg.label}
                      </span>
                    )}
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3.5">
                    <TaskAssignee task={task} className="max-w-[210px]" />
                  </td>

                  {/* Due Date */}
                  <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-400" />
                      {task.dueDate}
                    </div>
                  </td>

                  {/* Flags / Info */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {task.isLeaderOnly && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/80">
                          <ShieldAlert size={10} className="text-amber-500" />
                          Leader Only
                        </span>
                      )}
                      {typeof task.matchPercentage === "number" && task.matchPercentage > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-200/60">
                          <Sparkles size={10} className="text-indigo-500" />
                          {task.matchPercentage}% Match
                        </span>
                      )}
                      {task.blockedBy && task.blockedBy > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                          <AlertTriangle size={10} className="text-rose-500" />
                          Blocked ({task.blockedBy})
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    {canEditStatus(task) && task.status !== "Completed" ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canEditStatus(task)) onUpdateStatus(task.id, "Completed");
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle size={12} />
                        Complete
                      </button>
                    ) : task.status === "Completed" ? (
                      <span className="text-xs font-medium text-emerald-600">Done</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Pop-up Status Dropdown Portal */}
      {openDropdownId && activeTask && canEditStatus(activeTask) && dropdownPos && typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Invisible backdrop */}
            <div
              className="fixed inset-0 z-50 bg-transparent"
              onClick={() => {
                setOpenDropdownId(null);
                setDropdownPos(null);
              }}
            />
            {/* Dropdown Floating Panel */}
            <div
              data-popup-menu="true"
              style={{
                position: "fixed",
                left: `${dropdownPos.left}px`,
                top: `${dropdownPos.top}px`,
                transform: dropdownPos.openUpward ? "translateY(-100%)" : "none",
              }}
              className="z-50 w-44 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Change Status
              </div>
              <div className="space-y-0.5">
                {allStatuses.map((st) => {
                  const stTheme = getStatusTheme(st, customStatuses);
                  const isSelected = activeTask?.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        if (activeTask && canEditStatus(activeTask)) onUpdateStatus(openDropdownId, st);
                        setOpenDropdownId(null);
                        setDropdownPos(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium text-left transition-colors ${isSelected
                          ? `${stTheme.badge} font-semibold ring-1 ring-inset`
                          : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${stTheme.dot}`} />
                        <span className="min-w-0 break-words">{st}</span>
                      </div>
                      {isSelected && <Check size={13} className="ml-2 shrink-0 text-current" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Floating Pop-up Priority Dropdown Portal */}
      {openPriorityDropdownId && activePriorityTask && canEditPriority(activePriorityTask) && priorityDropdownPos && typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Invisible backdrop */}
            <div
              className="fixed inset-0 z-50 bg-transparent"
              onClick={() => {
                setOpenPriorityDropdownId(null);
                setPriorityDropdownPos(null);
              }}
            />
            {/* Dropdown Floating Panel */}
            <div
              data-popup-menu="true"
              style={{
                position: "fixed",
                left: `${priorityDropdownPos.left}px`,
                top: `${priorityDropdownPos.top}px`,
                transform: priorityDropdownPos.openUpward ? "translateY(-100%)" : "none",
              }}
              className="z-50 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Change Priority
              </div>
              <div className="space-y-0.5">
                {ALL_PRIORITIES.map((pr) => {
                  const cfg = priorityConfig[pr];
                  const isSelected = activePriorityTask?.priority === pr;
                  return (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => {
                        if (activePriorityTask && canEditPriority(activePriorityTask)) onUpdatePriority?.(openPriorityDropdownId, pr);
                        setOpenPriorityDropdownId(null);
                        setPriorityDropdownPos(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium text-left transition-colors ${isSelected
                          ? `${cfg.classes} font-bold`
                          : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        <span>{cfg.label}</span>
                      </div>
                      {isSelected && <Check size={13} className="text-current" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
