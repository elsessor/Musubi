import type { OrganizationMember } from "@/services/auth.service";
import type { Subtask } from "@/components/events/types";

export type DelegationMatch = {
  member: OrganizationMember;
  score: number;
  matchedSkills: string[];
  explanation: string;
};

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
 * Heuristically finds the best matching OrganizationMember for a given subtask
 * based on onboarding skills, position/role relevance, and task context.
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
  const fullTaskText = `${titleLower} ${descLower} ${reqSkills.join(" ")}`;

  const matches: DelegationMatch[] = members.map((member) => {
    let score = 50;
    const matchedSkills: string[] = [];

    const memberSkills = member.skills || [];
    const memberPosition = (member.position || "").toLowerCase();

    // 1. Match against member's onboarding skills
    memberSkills.forEach((skill) => {
      const skillLower = skill.toLowerCase().trim();
      let matched = false;

      // Direct match with requiredSkills or task text
      if (reqSkills.some((req) => req === skillLower || skillLower.includes(req) || req.includes(skillLower))) {
        matched = true;
      } else {
        // Synonym & keyword check
        const keywords = SKILL_KEYWORDS[skill] || [skillLower];
        if (keywords.some((kw) => fullTaskText.includes(kw))) {
          matched = true;
        }
      }

      if (matched && !matchedSkills.includes(skill)) {
        matchedSkills.push(skill);
        score += 20;
      }
    });

    // 2. Position & Role Relevance (+15 if position matches keywords in task)
    let positionMatched = false;
    if (memberPosition) {
      const positionKeywords = memberPosition
        .split(/\s+/)
        .filter((kw) => kw.length > 2 && kw !== "member" && kw !== "organization");
      positionMatched = positionKeywords.some((kw) => titleLower.includes(kw) || descLower.includes(kw));
      if (positionMatched) {
        score += 15;
      }
    }

    // 3. Workload Balance Heuristic (-5 for each task currently assigned)
    if (assignedCounts && assignedCounts[member.name]) {
      score -= Math.min(20, assignedCounts[member.name] * 5);
    }

    // Dynamic Score Ranges based on match strength
    if (matchedSkills.length > 0) {
      // Direct Onboarding Skill match -> 75% to 98%
      score = Math.min(98, Math.max(75, score));
    } else if (positionMatched) {
      // Role match -> 65% to 80%
      score = Math.min(80, Math.max(65, score));
    } else {
      // Capacity fallback -> 50% to 64%
      score = Math.min(64, Math.max(50, score));
    }

    let explanation = "";
    if (matchedSkills.length > 0) {
      explanation = `Matched onboarding skill(s): ${matchedSkills.join(", ")}`;
    } else if (positionMatched) {
      explanation = `Matched role: ${member.position || member.role}`;
    } else if (member.skills && member.skills.length > 0) {
      explanation = `Assigned by availability (Member skills: ${member.skills.slice(0, 2).join(", ")})`;
    } else {
      explanation = "Assigned based on team availability";
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
 * Heuristically delegates a set of subtasks across organization members using onboarding skills.
 */
export function delegateSubtasksHeuristically(
  subtasks: Subtask[],
  members: OrganizationMember[]
): Subtask[] {
  if (!members || members.length === 0) return subtasks;

  const assignedCounts: Record<string, number> = {};

  return subtasks.map((st) => {
    // If subtask has no required skills, infer them dynamically
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
