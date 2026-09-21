import { z } from "genkit";
import { ai } from "../config/genkit.js";
import { writeAuditLog } from "../utils/auditLog.js";

export const TaskItemSchema = z.object({
  title: z.string().describe("Actionable task title"),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).describe("Priority level of the task"),
  assigneeName: z.string().describe("Suggested assignee or committee role"),
  dueDateOffsetDays: z.number().int().min(1).max(30).describe("Suggested due date offset in days from today"),
  matchScore: z.number().int().min(50).max(100).describe("AI confidence score percentage between 50 and 100")
});

export const AtomizeGoalOutputSchema = z.object({
  tasks: z.array(TaskItemSchema).min(3).max(10).describe("Broken down actionable tasks for the event")
});

export type AtomizeInput = {
  eventName: string;
  goalDescription: string;
  defaultStatus?: string;
  uid?: string;
  userName?: string;
  userRole?: string;
};

export const atomizeGoalFlow = ai.defineFlow(
  {
    name: "atomizeGoalFlow",
    inputSchema: z.object({
      eventName: z.string(),
      goalDescription: z.string(),
      defaultStatus: z.string().optional()
    }),
    outputSchema: AtomizeGoalOutputSchema
  },
  async (input: { eventName: string; goalDescription: string; defaultStatus?: string }) => {
    const prompt = `
You are an expert AI Task Orchestrator for student governance and campus organizations.
Break down the macro-goal for the campus event "${input.eventName}" into 4 to 8 concrete, actionable tasks.

Macro-Goal Description:
"${input.goalDescription}"

Guidelines:
1. Make tasks realistic, actionable, and tailored specifically to the goal description.
2. Assign appropriate priority levels: Low, Medium, High, or Critical.
3. Suggest clear assignees (e.g., "Logistics Lead", "Ana Reyes", "Marco Dela Cruz", "Finance Officer").
4. Provide sensible deadline offsets (1 to 20 days from today).
5. Calculate a realistic AI Match Score (between 65% and 98%) reflecting suitability.
`;

    const candidateModels = [
      "googleai/gemini-3.6-flash",
      "googleai/gemini-3.5-flash",
      "googleai/gemini-3.5-flash-lite",
      "googleai/gemini-3.7-flash",
      "googleai/gemini-flash-latest"
    ];

    let lastError: unknown = null;

    // Helper delay for rate limit / service unavailable retries
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const { output } = await ai.generate({
            model,
            prompt,
            output: { schema: AtomizeGoalOutputSchema }
          });
          if (output) return output;
        } catch (err) {
          lastError = err;
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[Atomizer] Model ${model} attempt ${attempt} failed:`, errMsg);
          
          if (errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("Quota")) {
            await delay(1500 * attempt);
          } else {
            // Non-transient error for this model (e.g. 404 or unsupported), skip to next model
            break;
          }
        }
      }
    }

    throw new Error(
      lastError instanceof Error
        ? `Genkit AI generation failed: ${lastError.message}`
        : "Genkit AI model returned an empty response."
    );
  }
);

export async function runAtomizerFlow(input: AtomizeInput) {
  const result = await atomizeGoalFlow({
    eventName: input.eventName,
    goalDescription: input.goalDescription,
    defaultStatus: input.defaultStatus
  });

  if (input.uid) {
    writeAuditLog({
      actorUID: input.uid,
      actorName: input.userName ?? "Student Leader",
      actorRole: input.userRole ?? "Student Leader",
      action: `AI Task Atomizer generated ${result.tasks.length} tasks for "${input.eventName}" via Genkit`,
      actionCategory: "AI Agent Actions",
      targetType: "Event Goal",
      targetName: input.eventName,
      context: {
        taskCount: result.tasks.length,
        goalDescription: input.goalDescription
      }
    });
  }

  return result;
}
