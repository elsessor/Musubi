import type { OrganizationMember } from "@/services/auth.service";
import type { Subtask } from "@/components/events/types";

export type DelegationMatch = {
  member: OrganizationMember;
  score: number; // Display confidence percentage (50 - 98)
  compositeScore: number; // CS_m raw score
  skillMatchScore: number; // S_m (Jaccard Similarity)
  workloadScore: number; // W_m (A_m / A_max)
  reliabilityScore: number; // R_m (C_ontime / C_total)
  matchedSkills: string[];
  explanation: string;
};

// Model Weights & Safeguard Parameters
const W1_SKILL = 0.50;
const W2_WORKLOAD = 0.30;
const W3_RELIABILITY = 0.20;
const A_MAX_THRESHOLD = 5; // Default max active uncompleted subtasks threshold

// Map of common onboarding skill names to keywords and synonyms for smart matching
const SKILL_KEYWORDS: Record<string, string[]> = {
  "Logistics & Supply Chain": ["logistics", "supply chain", "permits", "permit", "venue", "location", "equipment", "transport", "reservation", "inventory", "hall", "room", "logistics lead"],
  "Venue & Stage Operations": ["venue", "stage", "setup", "hall", "audio", "av", "sound", "light", "equipment", "reservation", "tech equipment", "lan", "hackathon"],
  "Graphic Design": ["design", "graphic", "graphics", "poster", "flyer", "banner", "branding", "pubmat", "visual", "layout", "logo", "infographic"],
  "UI/UX Design": ["ui", "ux", "wireframe", "interface", "app design", "user experience"],
  "Photography": ["photo", "photography", "camera", "pictures", "headshots", "event coverage"],
  "Videography": ["video", "videography", "recording", "filming", "coverage", "livestream"],
  "Video Editing": ["video editing", "editor", "reels", "teaser", "aftermovie"],
  "Social Media Management": ["social media", "instagram", "facebook", "posts", "pubmat", "announcements", "caption", "campaign", "promotions"],
  "Public Relations": ["pr", "public relations", "outreach", "media", "press", "communications", "promotion", "promotions"],
  "Content Creation": ["content", "copywriting", "writing", "articles", "posts", "pubmat", "scripts"],
  "Copywriting": ["copywriting", "writing", "caption", "announcement", "text", "description"],
  "Budgeting": ["budget", "budgeting", "cost", "financial", "pricing", "quotation", "expense"],
  "Finance": ["finance", "treasury", "money", "funds", "budget", "billing", "treasurer"],
  "Sponsorship & Fundraising": ["sponsorship", "sponsor", "fundraising", "donations", "partnerships", "sponsors"],
  "Accounting": ["accounting", "bookkeeping", "receipts", "disbursement", "audit"],
  "Registration & Check-in": ["registration", "check-in", "attendees", "ticketing", "tickets", "rsvp", "google form", "participant"],
  "Protocol & Security": ["security", "safety", "protocol", "bouncers", "crowd control", "first aid", "marshal", "crowd management"],
  "Catering & Hospitality": ["catering", "food", "snacks", "drinks", "hospitality", "refreshments", "meals", "bento"],
  "Event Planning": ["event planning", "program", "coordination", "schedule", "runthrough", "timeline", "host", "emcee", "activities"],
  "Web Development": ["web", "website", "frontend", "backend", "developer", "coding", "landing page", "portal"],
  "Mobile App Development": ["app", "mobile", "ios", "android", "flutter", "react native"],
  "Software Engineering": ["software", "engineering", "system", "code", "database", "hackathon"],
  "Legal Research & Drafting": ["legal", "contract", "mou", "moa", "agreement", "permit", "policy"],
  "Documentation & Record Keeping": ["documentation", "minutes", "record", "archive", "report", "docs"]
};

/**
 * Infer onboarding-compatible required skills from task title and description
 */
export function inferSkillsFromTask(title: string, description: string = ""): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const detected: string[] = [];

  for (const [skillName, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      detected.push(skillName);
    }
  }

  return detected.length > 0 ? Array.from(new Set(detected)).slice(0, 3) : ["Event Planning", "Communication"];
}

/**
 * 1. Skill Match Score (S_m): Jaccard Similarity S_m = |K_T ∩ K_m| / |K_T ∪ K_m|
 */
export function calculateJaccardSkillSimilarity(
  taskSkills: string[],
  memberSkills: string[],
  fullTaskText: string = ""
): { similarity: number; matchedSkills: string[] } {
  if (!taskSkills || taskSkills.length === 0) {
    return { similarity: 0, matchedSkills: [] };
  }

  const kT = new Set(taskSkills.map((s) => s.toLowerCase().trim()));
  const km = new Set((memberSkills || []).map((s) => s.toLowerCase().trim()));
  const matchedSkills: string[] = [];

  (memberSkills || []).forEach((skill) => {
    const sLower = skill.toLowerCase().trim();
    let isMatch = false;

    if (kT.has(sLower) || Array.from(kT).some((req) => req.includes(sLower) || sLower.includes(req))) {
      isMatch = true;
    } else {
      const keywords = SKILL_KEYWORDS[skill] || [sLower];
      if (keywords.some((kw) => fullTaskText.includes(kw))) {
        isMatch = true;
      }
    }

    if (isMatch && !matchedSkills.includes(skill)) {
      matchedSkills.push(skill);
      km.add(sLower);
    }
  });

  const intersectionSize = matchedSkills.length;
  const unionSet = new Set([...Array.from(kT), ...Array.from(km)]);
  const unionSize = unionSet.size || 1;

  const similarity = Math.min(1.0, Math.max(0.0, intersectionSize / unionSize));
  return { similarity, matchedSkills };
}

/**
 * Deterministic Heuristic Model:
 * Computes Composite Match Score CS_m = (w1 * S_m) - (w2 * W_m) + (w3 * R_m)
 * Enforces Burnout Safeguards (W_m <= 1.0) & Tie-Breaker rules.
 */
export function findBestMemberForSubtask(
  subtask: { title: string; description?: string; requiredSkills?: string[]; assigneeName?: string },
  members: OrganizationMember[],
  assignedCounts?: Record<string, number>,
  maxThreshold: number = A_MAX_THRESHOLD
): DelegationMatch | null {
  if (!members || members.length === 0) return null;

  const reqSkills = (subtask.requiredSkills || []).map((s) => s.toLowerCase().trim());
  const titleLower = (subtask.title || "").toLowerCase();
  const descLower = (subtask.description || "").toLowerCase();
  const currentAssigneeLower = (subtask.assigneeName || "").toLowerCase().trim();
  const fullTaskText = `${titleLower} ${descLower} ${reqSkills.join(" ")} ${currentAssigneeLower}`;

  type ScoredCandidate = DelegationMatch & {
    rawAm: number;
  };

  const candidateScores: ScoredCandidate[] = members.map((member) => {
    // 1. Skill Match Score (S_m) via Jaccard Similarity
    const { similarity: jaccardSm, matchedSkills } = calculateJaccardSkillSimilarity(
      reqSkills.length > 0 ? reqSkills : inferSkillsFromTask(subtask.title, subtask.description),
      member.skills || [],
      fullTaskText
    );

    let Sm = jaccardSm;
    const memberNameLower = (member.name || "").toLowerCase().trim();
    const memberPositionLower = (member.position || "").toLowerCase().trim();

    if (currentAssigneeLower && memberNameLower && (memberNameLower === currentAssigneeLower || currentAssigneeLower.includes(memberNameLower))) {
      Sm = Math.max(Sm, 0.95);
    } else if (memberPositionLower && titleLower.includes(memberPositionLower)) {
      Sm = Math.max(Sm, 0.75);
    }

    // 2. Workload Score (W_m = A_m / A_max)
    const Am = (assignedCounts ? assignedCounts[member.name] || 0 : 0) + (member.activeTasksCount || 0);
    const Wm = Am / maxThreshold;

    // 3. Reliability Indicator (R_m = C_ontime / C_total, default 1.0)
    let Rm = 1.0;
    if (typeof member.completedTotal === "number" && member.completedTotal > 0) {
      const onTime = typeof member.completedOnTime === "number" ? member.completedOnTime : member.completedTotal;
      Rm = Math.min(1.0, Math.max(0.0, onTime / member.completedTotal));
    }

    // 4. Composite Match Score Formula: CS_m = (w1 * S_m) - (w2 * W_m) + (w3 * R_m)
    const CSm = (W1_SKILL * Sm) - (W2_WORKLOAD * Wm) + (W3_RELIABILITY * Rm);

    // Human-readable AI confidence match score (50% - 98%)
    let displayScore = Math.round(((CSm + 0.30) / 1.0) * 100);
    if (matchedSkills.length > 0 || Sm >= 0.7) {
      displayScore = Math.min(98, Math.max(75, displayScore));
    } else {
      displayScore = Math.min(65, Math.max(50, displayScore));
    }

    let explanation = "";
    if (matchedSkills.length > 0) {
      explanation = `Jaccard Skill Similarity S_m = ${Sm.toFixed(2)} (${matchedSkills.join(", ")})`;
    } else if (Sm >= 0.7) {
      explanation = `Matched role/name: ${member.name} (${member.position || member.role})`;
    } else {
      explanation = `Assigned by capacity: W_m = ${Wm.toFixed(2)} (${Am}/${maxThreshold} tasks), R_m = ${Rm.toFixed(2)}`;
    }

    return {
      member,
      score: displayScore,
      compositeScore: CSm,
      skillMatchScore: Sm,
      workloadScore: Wm,
      reliabilityScore: Rm,
      rawAm: Am,
      matchedSkills,
      explanation
    };
  });

  // Decision Criteria 1: Burnout Safeguard (W_m <= 1.0)
  let eligiblePool = candidateScores.filter((c) => c.workloadScore <= 1.0);
  // Fallback if ALL members exceed max workload: select from full pool to prevent unassigned tasks
  if (eligiblePool.length === 0) {
    eligiblePool = candidateScores;
  }

  // Decision Criteria 2 & 3: Select highest positive CS_m, tie-broken by lowest absolute Workload Score (W_m)
  eligiblePool.sort((a, b) => {
    const diff = b.compositeScore - a.compositeScore;
    if (Math.abs(diff) > 0.0001) {
      return diff;
    }
    // Tie-breaker: candidate with lower absolute Workload Score (W_m)
    return a.workloadScore - b.workloadScore;
  });

  const winner = eligiblePool[0];
  if (!winner) return null;

  return {
    member: winner.member,
    score: winner.score,
    compositeScore: winner.compositeScore,
    skillMatchScore: winner.skillMatchScore,
    workloadScore: winner.workloadScore,
    reliabilityScore: winner.reliabilityScore,
    matchedSkills: winner.matchedSkills,
    explanation: winner.explanation
  };
}

/**
 * Heuristically delegates a set of subtasks across organization members using onboarding skills & Jaccard model.
 */
export function delegateSubtasksHeuristically(
  subtasks: Subtask[],
  members: OrganizationMember[]
): Subtask[] {
  if (!members || members.length === 0) return subtasks;

  const assignedCounts: Record<string, number> = {};

  return subtasks.map((st) => {
    const effectiveSkills =
      st.requiredSkills && st.requiredSkills.length > 0
        ? st.requiredSkills
        : inferSkillsFromTask(st.title, st.description);

    const match = findBestMemberForSubtask(
      { ...st, requiredSkills: effectiveSkills },
      members,
      assignedCounts
    );

    if (!match) return { ...st, requiredSkills: effectiveSkills };

    assignedCounts[match.member.name] = (assignedCounts[match.member.name] || 0) + 1;

    return {
      ...st,
      assigneeName: match.member.name,
      requiredSkills: effectiveSkills,
      aiMetadata: {
        ...st.aiMetadata,
        confidenceScore: match.score
      }
    };
  });
}
