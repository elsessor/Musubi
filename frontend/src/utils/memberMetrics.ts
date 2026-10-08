import type { Event } from "@/components/events/types";
import { getAssignedProfileTasks, getProfileMetrics, getProfileTaskStatus } from "./profileMetrics";

export function computeMemberStats(memberName: string, memberId: string, events: Event[], explicitStatus?: string) {
  const memberTasks = getAssignedProfileTasks(events, memberId, memberName);
  const activeTasks = memberTasks.filter((task) => ["active", "pending"].includes(getProfileTaskStatus(task)));
  const metrics = getProfileMetrics(memberTasks);
  const availability = explicitStatus && ["Available", "Busy", "On Leave"].includes(explicitStatus)
    ? explicitStatus : activeTasks.length >= 4 ? "Busy" : "Available";
  return {
    memberTasks,
    activeTasks,
    workload: metrics.workload,
    reliability: metrics.reliability === null ? "—" : `${metrics.reliability}%`,
    availability
  };
}
