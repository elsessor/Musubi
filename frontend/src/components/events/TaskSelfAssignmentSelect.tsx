"use client";

import { createContext, useContext } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { TaskAssignee } from "./TaskAssignee";
import { useAuthStore } from "@/store/authStore";
import { getTaskClaimError } from "@/utils/taskClaims";
import type { Event, Task } from "./types";

export const TaskSelfAssignmentContext = createContext<{
  event: Event;
  assigning: boolean;
  onRequestAssignment: (taskId: string) => void;
} | null>(null);

export function TaskSelfAssignmentSelect({ task, readOnly = false }: { task: Task; readOnly?: boolean }) {
  const context = useContext(TaskSelfAssignmentContext);
  const profile = useAuthStore(state => state.profile);
  const uid = useAuthStore(state => state.firebaseUser?.uid ?? state.profile?.uid);
  if (!context || readOnly || getTaskClaimError(task, { uid, role: profile?.role, organizationId: profile?.organizationId }, context.event)) return <TaskAssignee task={task} />;
  return (
    <CustomSelect
      value=""
      onChange={(value) => { if (!context.assigning && value === uid) context.onRequestAssignment(task.id); }}
      options={[
        { value: "", label: "No assignee" },
        { value: uid!, label: profile?.fullName || "Assign to me", sublabel: profile?.position || profile?.role || "Organization Member", description: "Assign to me", profilePicture: profile?.profilePicture }
      ]}
      disabled={context.assigning}
      multiline
      portal
      buttonClassName="min-h-11 rounded-xl text-xs"
      dropdownClassName="[&_button]:min-h-11"
    />
  );
}
