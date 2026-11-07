import type { User } from "firebase/auth";
import type { UserRole } from "../types/auth";
import { isTutorialStatus, tutorialKey, type TutorialStatus } from "../config/tutorial";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
const memory = new Map<string, TutorialStatus>();
const pending = new Map<string, Promise<unknown>>();

export function localTutorial(uid: string, role: UserRole): TutorialStatus | null {
  const key = tutorialKey(uid, role);
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (isTutorialStatus(stored)) return stored;
  } catch { /* Private browsing and unavailable storage still work for this session. */ }
  return memory.get(key) ?? null;
}

function cache(uid: string, role: UserRole, status: TutorialStatus) {
  const key = tutorialKey(uid, role);
  memory.set(key, status);
  try { localStorage.setItem(key, JSON.stringify(status)); } catch { /* Session fallback. */ }
}

async function request(user: User, role: UserRole, method: "GET" | "PUT", status?: TutorialStatus) {
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}/auth/tutorial`, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(status ? { body: JSON.stringify({ role, version: status.version, status: status.status, step: status.step, tour: status.tour, acknowledged: status.acknowledged }) } : {}),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error("Tutorial sync unavailable");
  return response.json() as Promise<{ role: UserRole; tutorial: unknown }>;
}

export async function loadTutorial(user: User, role: UserRole): Promise<{ status: TutorialStatus | null; localOnly: boolean }> {
  const local = localTutorial(user.uid, role);
  try {
    await pending.get(tutorialKey(user.uid, role));
    const result = await request(user, role, "GET");
    if (result.role !== role) return { status: local, localOnly: true };
    const remote = isTutorialStatus(result.tutorial) ? result.tutorial : null;
    // A local dismissal/completion during an outage should survive a stale server record.
    if (local && (!remote || local.updatedAt > remote.updatedAt)) {
      const saved = await request(user, role, "PUT", local);
      if (isTutorialStatus(saved.tutorial)) cache(user.uid, role, saved.tutorial);
      return { status: local, localOnly: false };
    }
    if (remote) cache(user.uid, role, remote);
    return { status: remote, localOnly: false };
  } catch { return { status: local, localOnly: true }; }
}

export function saveTutorial(user: User, role: UserRole, status: TutorialStatus): Promise<boolean> {
  cache(user.uid, role, status);
  const key = tutorialKey(user.uid, role);
  // Serialize writes so rapid Next/Skip clicks cannot overwrite final status.
  const job = (pending.get(key) ?? Promise.resolve()).then(async () => {
    try {
      const result = await request(user, role, "PUT", status);
      return result.role === role;
    } catch { return false; }
  });
  pending.set(key, job);
  void job.finally(() => { if (pending.get(key) === job) pending.delete(key); });
  return job;
}
