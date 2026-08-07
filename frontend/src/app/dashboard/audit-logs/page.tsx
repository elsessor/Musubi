"use client";

import { AuditLogsView } from "@/components/dashboard/AuditLogsView";

export default function StudentLeaderAuditLogsPage() {
  return <AuditLogsView requiredRole="Student Leader" />;
}
