type RecordData = Record<string, any>;

export function getInvitationApplicantUID(data: RecordData): string | null {
  const uid = data.requestedByUID || data.invitedUID;
  return typeof uid === "string" && uid.trim() && !uid.includes("/") ? uid : null;
}

export function invitationAsJoinRequest(source: RecordData, user: RecordData): RecordData {
  const requestedByUID = getInvitationApplicantUID(source);
  if (!requestedByUID || typeof source.organizationId !== "string" || !source.organizationId.trim() || source.organizationId.includes("/")) {
    throw new Error("Missing applicant or organization ID.");
  }
  if (typeof source.email !== "string" || source.email.trim().toLowerCase() !== String(user.email || "").trim().toLowerCase()) {
    throw new Error("The invitation email does not match its applicant.");
  }
  if (!["pending", "accepted", "rejected"].includes(source.status)) throw new Error("Unsupported request status.");
  const name = source.name || user.fullName || user.name;
  if (typeof name !== "string" || !name.trim()) throw new Error("Applicant name is missing.");
  const submittedAt = source.submittedAt ?? source.sentAt;
  if (!submittedAt) throw new Error("Original submission time is missing.");
  const skills = source.skills ?? user.skills;
  const request: RecordData = {
    organizationId: source.organizationId,
    requestedByUID,
    name: name.trim(),
    email: source.email,
    position: typeof source.position === "string" ? source.position : typeof user.position === "string" ? user.position : null,
    skills: Array.isArray(skills) ? skills.filter((skill): skill is string => typeof skill === "string") : [],
    status: source.status,
    submittedAt
  };
  if (source.reviewedAt !== undefined) request.reviewedAt = source.reviewedAt;
  if (typeof source.reviewedByUID === "string") request.reviewedByUID = source.reviewedByUID;
  return request;
}
