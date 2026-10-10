import type { OrganizationMember } from "@/services/auth.service";
import type { Subtask } from "@/components/events/types";

export function uniqueOrganizationMembers(members: OrganizationMember[]): OrganizationMember[] {
  return Array.from(new Map(members.map((member) => [member.id, member])).values());
}

export function resolveSubtaskAssignee(subtask: Pick<Subtask, "assignedMemberUID" | "assigneeName">, members: OrganizationMember[]): OrganizationMember | undefined {
  if (subtask.assignedMemberUID) return members.find((member) => member.id === subtask.assignedMemberUID);
  const name = subtask.assigneeName?.trim().toLowerCase();
  if (!name || name === "unassigned") return undefined;
  const matches = uniqueOrganizationMembers(members).filter((member) => member.name.trim().toLowerCase() === name);
  return matches.length === 1 ? matches[0] : undefined;
}
