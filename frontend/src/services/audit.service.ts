import type { User } from "firebase/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export type AuditLogRecord = {
  id: string;
  orgId?: string | null;
  actorUID?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  actionCategory?: string | null;
  targetType?: string | null;
  targetName?: string | null;
  changes?: { field?: string; from?: any; to?: any } | Record<string, unknown> | null;
  reason?: string | null;
  context?: { subtaskUID?: string | null; goalUID?: string | null; aiModelUsed?: string | null; confidenceScore?: number | null; previousStatus?: string | null; newStatus?: string | null } | null;
  metadata?: { ipAddress?: string | null; userAgent?: string | null } | null;
  createdAt?: string | null;
};

export async function fetchAuditLogs(user: User | null, params?: { page?: number; pageSize?: number; category?: string | null; from?: string | null; to?: string | null }): Promise<{ logs: AuditLogRecord[]; total?: number; page?: number }> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.category) query.set("category", params.category);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

  const res = await fetch(`${API_BASE_URL}/auth/audit-logs?${query.toString()}`, { headers });
  if (!res.ok) throw new Error("Unable to load audit logs.");
  const data = await res.json();
  return { logs: Array.isArray(data.logs) ? data.logs : [], total: typeof data.total === "number" ? data.total : undefined, page: typeof data.page === "number" ? data.page : params?.page ?? 1 };
}
