import { parseScheduleDate } from "./dateRange";
import type { OrganizationMember } from "@/services/auth.service";
import type { Event, Task, TaskPriority, TaskStatus } from "@/components/events/types";

export interface TaskReuseOptions {
  shiftDates?: boolean;
  resetAssignees?: boolean;
  targetStatus?: TaskStatus;
  replaceYears?: boolean;
  targetRoster?: OrganizationMember[];
  overrideDueDate?: string;
}

/**
 * Formats a Date object to the standard application date-time string:
 * "MMM D, YYYY at HH:mm AM/PM"
 */
export function formatScheduleDateTime(date: Date): string {
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const hour = String(date.getHours() % 12 || 12).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const ampm = date.getHours() >= 12 ? "PM" : "AM";
  return `${day} at ${hour}:${minute} ${ampm}`;
}

/**
 * Extracts the 4-digit year from a date string or event title
 */
export function extractYear(dateOrTitle?: string | null): number | null {
  if (!dateOrTitle) return null;
  const match = dateOrTitle.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

/**
 * Replaces old years with new years in a string (e.g., "General Assembly 2024" -> "General Assembly 2025")
 */
export function replaceYearInText(text: string, oldYear?: number | null, newYear?: number | null): string {
  if (!text || !oldYear || !newYear || oldYear === newYear) return text;
  
  // Replace Academic Year patterns: AY 2024-2025 -> AY 2025-2026
  const ayRegex = new RegExp(`AY\\s*${oldYear}[-–](${oldYear + 1})`, "gi");
  let updated = text.replace(ayRegex, `AY ${newYear}–${newYear + 1}`);

  // Replace standalone 4-digit year
  const yearRegex = new RegExp(`\\b${oldYear}\\b`, "g");
  updated = updated.replace(yearRegex, String(newYear));

  return updated;
}

/**
 * Computes shifted start and due dates based on the difference between the source and target event start dates.
 */
export function computeShiftedDates(
  taskStart: string | undefined,
  taskDue: string | undefined,
  sourceEventStart: string | undefined,
  targetEventStart: string | undefined
): { startDate?: string; dueDate: string } {
  const srcStart = parseScheduleDate(sourceEventStart);
  const tgtStart = parseScheduleDate(targetEventStart);
  const now = new Date();

  // If both event start dates are known, use the difference between them
  let shiftMs = 0;
  if (srcStart && tgtStart) {
    shiftMs = tgtStart.getTime() - srcStart.getTime();
  } else if (tgtStart) {
    // If only target event start date is known, schedule relative to target event kickoff
    shiftMs = tgtStart.getTime() - now.getTime();
  }

  const parsedTaskDue = parseScheduleDate(taskDue);
  const parsedTaskStart = parseScheduleDate(taskStart);

  let newDueDate: Date;
  if (parsedTaskDue) {
    newDueDate = new Date(parsedTaskDue.getTime() + shiftMs);
    // If the shifted date ended up in the past, push it into the future relative to now or target start
    if (newDueDate.getTime() < now.getTime() && tgtStart && tgtStart.getTime() > now.getTime()) {
      newDueDate = new Date(tgtStart.getTime());
    }
  } else if (tgtStart) {
    newDueDate = new Date(tgtStart.getTime());
  } else {
    // Default 7 days from now
    newDueDate = new Date(now.getTime() + 7 * 86400000);
  }

  let newStartDate: Date | undefined;
  if (parsedTaskStart) {
    newStartDate = new Date(parsedTaskStart.getTime() + shiftMs);
    if (newStartDate.getTime() >= newDueDate.getTime()) {
      newStartDate = new Date(newDueDate.getTime() - 2 * 86400000);
    }
  }

  return {
    startDate: newStartDate ? formatScheduleDateTime(newStartDate) : undefined,
    dueDate: formatScheduleDateTime(newDueDate)
  };
}

/**
 * Clones and sanitizes an array of tasks for reuse in a target event.
 * Re-maps internal task dependency IDs so chains like A -> B remain linked with new IDs.
 */
export function prepareTasksForReuse(
  selectedTasks: Task[],
  sourceEvent: Event,
  targetEvent: Pick<Event, "startDate" | "endDate" | "title">,
  options: TaskReuseOptions = {}
): Task[] {
  const {
    shiftDates = true,
    resetAssignees = true,
    targetStatus = "To Do",
    replaceYears = true,
    targetRoster = [],
    overrideDueDate
  } = options;

  const sourceYear = extractYear(sourceEvent.startDate) || extractYear(sourceEvent.title);
  const targetYear = extractYear(targetEvent.startDate) || extractYear(targetEvent.title);

  // Generate a map of oldId -> newId to preserve dependency chains
  const idMap = new Map<string, string>();
  for (const task of selectedTasks) {
    const newId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${Math.floor(Math.random() * 1000)}`;
    idMap.set(task.id, newId);
  }

  return selectedTasks.map((task) => {
    const newId = idMap.get(task.id) || `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Text replacement for year
    let title = task.title;
    let description = task.description || "";
    if (replaceYears && sourceYear && targetYear) {
      title = replaceYearInText(title, sourceYear, targetYear);
      description = replaceYearInText(description, sourceYear, targetYear);
    }

    // Date computation
    let startDate = task.startDate;
    let dueDate = task.dueDate;

    if (overrideDueDate) {
      dueDate = overrideDueDate;
    } else if (shiftDates) {
      const shifted = computeShiftedDates(task.startDate, task.dueDate, sourceEvent.startDate, targetEvent.startDate);
      startDate = shifted.startDate;
      dueDate = shifted.dueDate;
    }

    // Assignee handling
    let assignee = task.assignee;
    let assignedMemberUID: string | null = null;
    let assignedMemberName: string | null = null;

    if (resetAssignees) {
      assignee = {
        initials: "UN",
        color: "bg-slate-400",
        name: "Unassigned"
      };
      assignedMemberUID = null;
      assignedMemberName = null;
    } else {
      // Try to find matching member in current roster
      const matchingMember = targetRoster.find(
        (m) =>
          (task.assignedMemberUID && m.id === task.assignedMemberUID) ||
          (task.assignee?.name && m.name.toLowerCase() === task.assignee.name.toLowerCase())
      );
      if (matchingMember) {
        assignee = {
          initials: matchingMember.name
            .split(/\s+/)
            .map((n: string) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase(),
          color: "bg-blue-600",
          name: matchingMember.name
        };
        assignedMemberUID = matchingMember.id;
        assignedMemberName = matchingMember.name;
      } else {
        assignee = {
          initials: "UN",
          color: "bg-slate-400",
          name: "Unassigned"
        };
      }
    }

    // Remap dependency IDs if both parent and child were copied
    const remappedDependsOn = (task.dependsOnTaskIds || [])
      .map((oldId) => idMap.get(oldId))
      .filter((id): id is string => Boolean(id));

    const cloned: Task = {
      ...task,
      id: newId,
      title,
      description,
      status: targetStatus,
      startDate,
      dueDate,
      originalStartDate: startDate,
      originalDueDate: dueDate,
      assignee,
      assignedMemberUID,
      assignedMemberName,
      dependsOnTaskIds: remappedDependsOn,
      blockedBy: remappedDependsOn.length,
      blockedByTaskTitles: [],
      
      // Clean up past execution metadata
      completedAt: null,
      performanceReview: null,
      priorityChangeRequest: null,
      nudges: [],
      attachments: [],
      archivedAt: null,
      archivedByUID: null,
      dueDateHistory: []
    };

    return cloned;
  });
}
