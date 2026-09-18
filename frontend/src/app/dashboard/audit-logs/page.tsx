"use client";

import { AuditLogsView } from "@/components/dashboard/AuditLogsView";

export default function DashboardAuditLogsPage() {
  return <AuditLogsView requiredRole="Student Leader" />;
}
