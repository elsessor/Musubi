import type { OrganizationMember } from "@/services/auth.service";
import type { Subtask } from "@/components/events/types";

export type DelegationMatch = {
  member: OrganizationMember;
  score: number;
  matchedSkills: string[];
  explanation: string;
};

/**
 * Heuristically finds the best matching OrganizationMember for a given subtask
 * based on required skills, position/role relevance, and task context.
 */
export function findBestMemberForSubtask(
  subtask: { title: string; description?: string; requiredSkills?: string[] },
  members: OrganizationMember[],
  assignedCounts?: Record<string, number>
): DelegationMatch | null {
  if (!members || members.length === 0) return null;

  const reqSkills = (subtask.requiredSkills || []).map((s) => s.toLowerCase().trim());
  const titleLower = (subtask.title || "").toLowerCase();
  const descLower = (subtask.description || "").toLowerCase();

  const matches: DelegationMatch[] = members.map((member) => {
    let score = 55; // Base heuristic score
    const matchedSkills: string[] = [];

    const memberSkills = (member.skills || []).map((s) => s.toLowerCase().trim());
    const memberPosition = (member.position || "").toLowerCase();

    // 1. Skill Overlap Matching (+20 per matched skill)
    reqSkills.forEach((req) => {
      const isMatch = memberSkills.some(
        (ms) => ms === req || ms.includes(req) || req.includes(ms)
      );
      if (isMatch) {
        matchedSkills.push(req);
        score += 20;
      }
    });

    // 2. Position & Role Relevance (+15 if position matches subtask title/description)
    if (memberPosition) {
      const positionKeywords = memberPosition.split(/\s+/);
      const isPosMatch = positionKeywords.some(
        (kw) => kw.length > 2 && (titleLower.includes(kw) || descLower.includes(kw))
      );
      if (isPosMatch) {
        score += 15;
      }
    }

    // 3. Workload Balance Heuristic (-5 for each task currently assigned)
    if (assignedCounts && assignedCounts[member.name]) {
      score -= Math.min(25, assignedCounts[member.name] * 5);
    }

    // Cap score between 65 and 99
    score = Math.min(99, Math.max(65, score));

    let explanation = "";
    if (matchedSkills.length > 0) {
      explanation = `Matched skills: ${matchedSkills.join(", ")} (${score}% match)`;
    } else {
      explanation = `${member.position || member.role} (${score}% match)`;
    }

    return {
      member,
      score,
      matchedSkills,
      explanation
    };
  });

  // Sort descending by score
  matches.sort((a, b) => b.score - a.score);

  return matches[0] || null;
}

/**
 * Heuristically delegates a set of subtasks across organization members.
 */
export function delegateSubtasksHeuristically(
  subtasks: Subtask[],
  members: OrganizationMember[]
): Subtask[] {
  if (!members || members.length === 0) return subtasks;

  const assignedCounts: Record<string, number> = {};

  return subtasks.map((st) => {
    const match = findBestMemberForSubtask(st, members, assignedCounts);
    if (!match) return st;

    assignedCounts[match.member.name] = (assignedCounts[match.member.name] || 0) + 1;

    return {
      ...st,
      assigneeName: match.member.name,
      aiMetadata: {
        ...st.aiMetadata,
        confidenceScore: match.score
      }
    };
  });
}
