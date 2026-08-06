"use client";

import { AuditLogsView } from "@/components/dashboard/AuditLogsView";

export default function AdminAuditLogsPage() {
  return <AuditLogsView requiredRole="Admin" />;
}
