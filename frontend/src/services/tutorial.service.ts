import type { User } from "firebase/auth";
import type { UserRole } from "../types/auth";
import { isTutorialStatus, tutorialKey, type TutorialStatus } from "../config/tutorial";
import { mergeOnboarding } from "../config/onboardingProgress";

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
    ...(status ? { body: JSON.stringify({ role, version: status.version, status: status.status, step: status.step, tour: status.tour, acknowledged: status.acknowledged, seenPages: status.seenPages, onboarding: status.onboarding }) } : {}),
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
    const seenPages = [...new Set([...(remote?.seenPages ?? []), ...(local?.seenPages ?? [])])];
    const latest = local && (!remote || local.updatedAt > remote.updatedAt) ? local : remote;
    const onboarding = mergeOnboarding(remote?.onboarding, local?.onboarding);
    const merged = latest ? { ...latest, ...(seenPages.length ? { seenPages } : {}), ...(onboarding ? { onboarding } : {}) } : latest;
    // A local dismissal/completion during an outage should survive a stale server record.
    if (merged && (!remote || (local && local.updatedAt > remote.updatedAt) || JSON.stringify(onboarding) !== JSON.stringify(remote.onboarding) || seenPages.some((id) => !remote.seenPages?.includes(id)))) {
      cache(user.uid, role, merged);
      const saved = await request(user, role, "PUT", merged);
      if (saved.role !== role) return { status: merged, localOnly: true };
      if (isTutorialStatus(saved.tutorial)) {
        cache(user.uid, role, saved.tutorial);
        return { status: saved.tutorial, localOnly: false };
      }
      return { status: merged, localOnly: false };
    }
    if (merged) cache(user.uid, role, merged);
    return { status: merged, localOnly: false };
  } catch { return { status: localTutorial(user.uid, role) ?? local, localOnly: true }; }
}

export function saveTutorial(user: User, role: UserRole, status: TutorialStatus): Promise<boolean> {
  cache(user.uid, role, status);
  const key = tutorialKey(user.uid, role);
  // Serialize writes so rapid Next/Skip clicks cannot overwrite final status.
  const job = (pending.get(key) ?? Promise.resolve()).then(async () => {
    try {
      const result = await request(user, role, "PUT", status);
      if (result.role !== role) return false;
      if (isTutorialStatus(result.tutorial)) {
        const latest = localTutorial(user.uid, role) ?? status;
        const onboarding = mergeOnboarding(result.tutorial.onboarding, latest.onboarding);
        const seenPages = [...new Set([...(result.tutorial.seenPages ?? []), ...(latest.seenPages ?? [])])];
        cache(user.uid, role, { ...latest, ...(onboarding ? { onboarding } : {}), ...(seenPages.length ? { seenPages } : {}) });
      }
      return true;
    } catch { return false; }
  });
  pending.set(key, job);
  void job.finally(() => { if (pending.get(key) === job) pending.delete(key); });
  return job;
}
