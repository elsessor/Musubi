import type { User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { getFirebaseDb } from "../firebase/config";

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

export function normalizeAuditLogRecord(id: string, data: Record<string, any>): AuditLogRecord {
  const asIsoString = (val: unknown): string | null => {
    if (val && typeof (val as { toDate?: () => Date }).toDate === "function") {
      return (val as { toDate: () => Date }).toDate().toISOString();
    }
    if (typeof val === "string") return val;
    return null;
  };

  return {
    id,
    orgId: typeof data.orgId === "string" ? data.orgId : null,
    actorUID: typeof data.actorUID === "string" ? data.actorUID : null,
    actorName: typeof data.actorName === "string" ? data.actorName : "System",
    actorRole: typeof data.actorRole === "string" ? data.actorRole : "Automated",
    action: typeof data.action === "string" ? data.action : "System Event",
    actionCategory: typeof data.actionCategory === "string" ? data.actionCategory : "Organization",
    targetType: typeof data.targetType === "string" ? data.targetType : "Entity",
    targetName: typeof data.targetName === "string" ? data.targetName : null,
    changes: data.changes ?? null,
    reason: typeof data.reason === "string" ? data.reason : null,
    context: data.context ?? null,
    metadata: data.metadata ?? null,
    createdAt: asIsoString(data.createdAt)
  };
}

export function subscribeAuditLogsFirestore(
  callbacks: {
    onData: (logs: AuditLogRecord[]) => void;
    onError: (error: Error) => void;
  },
  user?: User | null
) {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isMounted = true;

  const loadLogs = () => {
    void fetchAuditLogs(user ?? null)
      .then((res) => {
        if (isMounted) callbacks.onData(res.logs);
      })
      .catch((err) => {
        if (isMounted) {
          callbacks.onData([]);
          callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
      });
  };

  loadLogs();
  intervalId = setInterval(loadLogs, 4000);

  return () => {
    isMounted = false;
    if (intervalId) clearInterval(intervalId);
  };
}

export async function createAuditLogsStream(
  user: User,
  callbacks: {
    onData: (logs: AuditLogRecord[]) => void;
    onError: () => void;
  }
) {
  const token = await user.getIdToken();
  const stream = new EventSource(`${API_BASE_URL}/auth/audit-logs/stream?token=${encodeURIComponent(token)}`);

  stream.addEventListener("audit_logs", (event) => {
    try {
      const data = JSON.parse(event.data);
      const rawLogs = Array.isArray(data.logs) ? data.logs : [];
      const logs = rawLogs.map((item: any) => normalizeAuditLogRecord(item.id ?? crypto.randomUUID(), item));
      callbacks.onData(logs);
    } catch {
      callbacks.onError();
    }
  });

  // Only treat the connection as failed when EventSource permanently closes.
  // Transient network blips cause readyState === CONNECTING (auto-retry) — ignore those.
  stream.addEventListener("error", () => {
    if (stream.readyState === EventSource.CLOSED) {
      callbacks.onError();
    }
  });
  return () => stream.close();
}

export async function fetchAuditLogs(user: User | null, params?: { page?: number; pageSize?: number; category?: string | null; from?: string | null; to?: string | null }): Promise<{ logs: AuditLogRecord[]; total?: number; page?: number }> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.pageSize) queryParams.set("pageSize", String(params.pageSize));
  if (params?.category) queryParams.set("category", params.category);
  if (params?.from) queryParams.set("from", params.from);
  if (params?.to) queryParams.set("to", params.to);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

  const res = await fetch(`${API_BASE_URL}/auth/audit-logs?${queryParams.toString()}`, { headers });
  if (!res.ok) throw new Error("Unable to load audit logs.");
  const data = await res.json();
  const rawLogs = Array.isArray(data.logs) ? data.logs : [];
  const logs = rawLogs.map((item: any) => normalizeAuditLogRecord(item.id ?? crypto.randomUUID(), item));
  return { logs, total: typeof data.total === "number" ? data.total : undefined, page: typeof data.page === "number" ? data.page : params?.page ?? 1 };
}

