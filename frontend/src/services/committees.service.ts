import type { User } from "firebase/auth";
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";

import { getFirebaseDb } from "@/firebase/config";

export type CommitteeRecord = {
  id: string;
  orgId: string;
  name: string;
  headMemberUID?: string;
  description?: string;
  createdAt: string | null;
};

function normalizeCommittee(id: string, data: Record<string, unknown>): CommitteeRecord {
  const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
  return {
    id,
    orgId: typeof data.orgId === "string" ? data.orgId : "",
    name: typeof data.name === "string" ? data.name : "Untitled committee",
    headMemberUID: typeof data.headMemberUID === "string" ? data.headMemberUID : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : null
  };
}

export function subscribeCommitteesFirestore(orgId: string, onData: (committees: CommitteeRecord[]) => void) {
  return onSnapshot(
    query(collection(getFirebaseDb(), "committees"), where("orgId", "==", orgId)),
    (snapshot) => onData(snapshot.docs.map((committee) => normalizeCommittee(committee.id, committee.data())))
  );
}

export async function createCommitteeFirestore(
  user: User,
  orgId: string,
  input: Pick<CommitteeRecord, "name" | "description"> & { headMemberUID?: string }
): Promise<string> {
  if (!orgId.trim()) throw new Error("An organization is required to create a committee.");

  const document = await addDoc(collection(getFirebaseDb(), "committees"), {
    orgId: orgId.trim(),
    name: input.name.trim(),
    headMemberUID: input.headMemberUID ?? user.uid,
    description: input.description?.trim() ?? "",
    createdAt: serverTimestamp()
  });
  return document.id;
}
