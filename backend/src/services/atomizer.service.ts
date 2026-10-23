import { z } from "genkit";
import { ai } from "../config/genkit.js";
import { writeAuditLog } from "../utils/auditLog.js";

export const TaskItemSchema = z.object({
  title: z.string().describe("Actionable task title"),
  dependencyIndexes: z.array(z.number().int().min(0).max(9)).optional().default([]).describe("Zero-based indexes of earlier tasks that must be completed first; empty for independent tasks"),
  description: z.string().describe("Specific, actionable 1-2 sentence description explaining step-by-step what needs to be done for this subtask"),
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
1. Make tasks realistic, actionable, and tailored specifically to the goal description. Provide unique, detailed 1-2 sentence descriptions for each subtask explaining what steps to take.
2. Assign appropriate priority levels: Low, Medium, High, or Critical.
3. Suggest clear assignees (e.g., "Logistics Lead", "Ana Reyes", "Marco Dela Cruz", "Finance Officer").
4. Provide sensible deadline offsets (1 to 20 days from today).
5. Calculate a realistic AI Match Score (between 65% and 98%) reflecting suitability.
6. Order prerequisites before dependent tasks. For each task, include dependencyIndexes with the zero-based indexes of only the earlier tasks that truly must be completed first. Use [] for independent tasks. Allow parallel work; do not make every task depend on the previous task.
`;

    const primaryModel = process.env.GEMINI_MODEL?.trim() || "googleai/gemini-3.8-flash";
    const candidateModels = Array.from(new Set([
      primaryModel,
      "googleai/gemini-3.8-flash",
      "googleai/gemini-3.7-flash",
      "googleai/gemini-3.6-flash",
      "googleai/gemini-3.5-flash",
      "googleai/gemini-3.5-flash-lite"
    ]));

    let lastError: unknown = null;

    // Helper delay for rate limit / service unavailable retries
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const withTimeout = <T>(promise: Promise<T>, ms: number, errMsg: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errMsg)), ms))
      ]);

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const { output } = await withTimeout(
            ai.generate({
              model,
              prompt,
              output: { schema: AtomizeGoalOutputSchema }
            }),
            75000,
            `Model ${model} request timed out after 75s`
          );
          if (output) return { ...output, tasks: output.tasks.map((task, index) => ({ ...task,
            dependencyIndexes: [...new Set(task.dependencyIndexes || [])].filter((dependency) => dependency >= 0 && dependency < index)
          })) };
        } catch (err) {
          lastError = err;
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[Atomizer] Model ${model} attempt ${attempt} failed:`, errMsg);
          
          if (errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("Quota")) {
            await delay(1500 * attempt);
          } else {
            // Non-transient error or timeout for this model, skip to next candidate model
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
      targetType: "Event",
      targetName: input.eventName,
      context: {
        taskCount: result.tasks.length,
        goalDescription: input.goalDescription
      }
    });
  }

  return result;
}

export const RerollSubtaskOutputSchema = z.object({
  title: z.string().describe("Fresh, actionable subtask title"),
  description: z.string().describe("Specific 1-2 sentence description explaining step-by-step what needs to be done"),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).describe("Priority level"),
  assigneeName: z.string().describe("Suggested assignee role or skill lead"),
  dueDateOffsetDays: z.number().int().min(1).max(30).describe("Suggested due date offset in days"),
  matchScore: z.number().int().min(50).max(100).describe("AI confidence score percentage between 50 and 100"),
  requiredSkills: z.array(z.string()).describe("Array of 2-4 required skills")
});

export type RerollSubtaskInput = {
  eventName: string;
  goalDescription?: string;
  existingTaskTitle: string;
  existingTaskDescription?: string;
  uid?: string;
  userName?: string;
  userRole?: string;
};

export const rerollSubtaskFlow = ai.defineFlow(
  {
    name: "rerollSubtaskFlow",
    inputSchema: z.object({
      eventName: z.string(),
      goalDescription: z.string().optional(),
      existingTaskTitle: z.string(),
      existingTaskDescription: z.string().optional()
    }),
    outputSchema: RerollSubtaskOutputSchema
  },
  async (input: { eventName: string; goalDescription?: string; existingTaskTitle: string; existingTaskDescription?: string }) => {
    const prompt = `
You are an expert AI Task Orchestrator for campus student organizations.
Generate a NEW, alternate, distinct actionable subtask to replace the previous subtask "${input.existingTaskTitle}" for the event "${input.eventName}".

Context / Event Goal: "${input.goalDescription || input.eventName}"
Previous Task to Replace: "${input.existingTaskTitle}" - "${input.existingTaskDescription || ""}"

Requirements:
1. Provide a fresh title that approaches this operational requirement from a new angle or replaces it with a critical missing item.
2. Provide a 1-2 sentence actionable description detailing step-by-step execution.
3. Choose a priority: Low, Medium, High, or Critical.
4. Suggest 2 to 4 required skills (e.g., "Logistics", "Budgeting", "Public Relations", "Catering", "AV Operations", "Graphics", "Security", "Coordination", "Technical Setup").
5. Calculate a realistic AI Match Score between 75% and 98%.
`;

    const primaryModel = process.env.GEMINI_MODEL?.trim() || "googleai/gemini-3.8-flash";
    const candidateModels = Array.from(new Set([
      primaryModel,
      "googleai/gemini-3.8-flash",
      "googleai/gemini-3.7-flash",
      "googleai/gemini-3.6-flash",
      "googleai/gemini-3.5-flash",
      "googleai/gemini-3.5-flash-lite"
    ]));

    let lastError: unknown = null;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const withTimeout = <T>(promise: Promise<T>, ms: number, errMsg: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errMsg)), ms))
      ]);

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const { output } = await withTimeout(
            ai.generate({
              model,
              prompt,
              output: { schema: RerollSubtaskOutputSchema }
            }),
            60000,
            `Model ${model} re-roll timed out after 60s`
          );
          if (output) return output;
        } catch (err) {
          lastError = err;
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[Atomizer Reroll] Model ${model} attempt ${attempt} failed:`, errMsg);
          if (errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("Quota")) {
            await delay(1200 * attempt);
          } else {
            break;
          }
        }
      }
    }

    throw new Error(
      lastError instanceof Error
        ? `Genkit AI re-roll failed: ${lastError.message}`
        : "Genkit AI model returned an empty response for re-roll."
    );
  }
);

export async function runRerollSubtaskFlow(input: RerollSubtaskInput) {
  const result = await rerollSubtaskFlow({
    eventName: input.eventName,
    goalDescription: input.goalDescription,
    existingTaskTitle: input.existingTaskTitle,
    existingTaskDescription: input.existingTaskDescription
  });

  if (input.uid) {
    writeAuditLog({
      actorUID: input.uid,
      actorName: input.userName ?? "Student Leader",
      actorRole: input.userRole ?? "Student Leader",
      action: `AI Re-rolled single subtask for "${input.eventName}" (Replaced "${input.existingTaskTitle}" with "${result.title}")`,
      actionCategory: "AI Agent Actions",
      targetType: "Event",
      targetName: input.eventName
    });
  }

  return result;
}
