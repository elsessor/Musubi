"use client";

import {
  BookOpen,
  Calendar,
  Clock,
  Filter,
  HelpCircle,
  Layers,
  Plus,
  Sparkles,
  Users,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AIAtomizationProgress } from "@/components/goals/AIAtomizationProgress";
import { GoalCreationForm } from "@/components/goals/GoalCreationForm";
import { GoalReviewScreen } from "@/components/goals/GoalReviewScreen";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { INITIAL_PROMPT_CHAIN_STEPS, runAIAtomizationPromptChain } from "@/services/aiAtomizationService";
import type { GoalDraft, PromptChainStep } from "@/types/goal";
import { getDashboardNavItems } from "@/utils/routes";
import { Button } from "@/components/ui/Button";

const INITIAL_DEMO_GOALS: GoalDraft[] = [
  {
    id: "g-101",
    title: "Campus Culture Week 2026",
    description: "Organize a campus-wide culture week celebration across all departments featuring food stalls, traditional performances, and workshops.",
    targetDate: "2026-09-15",
    priority: "High",
    committeeScope: "Org-Wide",
    status: "In Progress",
    createdAt: "2026-08-01",
    subtasks: [
      {
        id: "st-1",
        title: "Finalize Venue Reservation & Department Booth Permits",
        description: "Coordinate with university grounds office to allocate quad space for departmental cultural booths.",
        committeeScope: "Logistics",
        priority: "Urgent",
        estimatedHours: 6,
        complexity: "M",
        dependencies: []
      },
      {
        id: "st-2",
        title: "Publish Cultural Performance Schedule & Registration",
        description: "Schedule student performance slots and organize sound & stage equipment requirements.",
        committeeScope: "Program",
        priority: "High",
        estimatedHours: 8,
        complexity: "L",
        dependencies: ["st-1"]
      }
    ],
    aiMetadata: {
      promptChainSteps: INITIAL_PROMPT_CHAIN_STEPS.map((s) => ({ ...s, status: "completed" as const })),
      executionTimeMs: 2980,
      model: "Musubi Atomizer v2.4"
    }
  }
];

export default function EventsAndTasksPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const showToast = useToastStore((state) => state.showToast);

  const [activeTab, setActiveTab] = useState<"events" | "atomizer">("atomizer");
  const [atomizerStep, setAtomizerStep] = useState<"form" | "atomizing" | "review">("form");
  const [goals, setGoals] = useState<GoalDraft[]>(INITIAL_DEMO_GOALS);
  const [activeGoalDraft, setActiveGoalDraft] = useState<GoalDraft | null>(null);

  const [promptChainSteps, setPromptChainSteps] = useState<PromptChainStep[]>(INITIAL_PROMPT_CHAIN_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const userRole = profile?.role ?? "Student Leader";

  const dashboardUser = {
    name: profile?.fullName ?? "Student Leader",
    role: userRole,
    roleLabel: profile?.position ?? userRole,
    organizationName: "",
    academicYear: "AY 2025–2026",
    greetingDate: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  };

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("musubi_goals");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGoals([...parsed, ...INITIAL_DEMO_GOALS]);
        }
      }
    } catch {
      // fallback
    }
  }, []);

  const handleStartAtomization = async (draft: GoalDraft) => {
    setActiveGoalDraft(draft);
    setAtomizerStep("atomizing");
    setPromptChainSteps(INITIAL_PROMPT_CHAIN_STEPS);
    setCurrentStepIndex(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await runAIAtomizationPromptChain({
        goal: draft,
        signal: controller.signal,
        onStepChange: (updatedSteps, activeIdx) => {
          setPromptChainSteps(updatedSteps);
          setCurrentStepIndex(activeIdx);
        }
      });

      setActiveGoalDraft(result.goal);
      setAtomizerStep("review");
      showToast({
        title: "Atomization Complete!",
        description: "Subtasks generated via multi-stage prompt chaining.",
        tone: "success"
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        showToast({
          title: "Atomization Cancelled",
          description: "Generation process was stopped. You can edit parameters and try again.",
          tone: "info"
        });
        setAtomizerStep("form");
      } else {
        showToast({
          title: "Atomization Failed",
          description: "An error occurred during prompt chaining. Please try again.",
          tone: "error"
        });
        setAtomizerStep("form");
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancelAtomization = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    } else {
      setAtomizerStep("form");
    }
  };

  const handleSaveGoal = (finalGoal: GoalDraft) => {
    const updatedGoals = [finalGoal, ...goals];
    setGoals(updatedGoals);
    try {
      sessionStorage.setItem("musubi_goals", JSON.stringify(updatedGoals));
    } catch {
      // fallback
    }

    showToast({
      title: "Goal & Subtasks Saved",
      description: `"${finalGoal.title}" saved to your workspace!`,
      tone: "success"
    });

    setAtomizerStep("form");
    setActiveTab("events");
  };

  return (
    <DashboardLayout
      activeNavId="events"
      activities={[]}
      goals={[]}
      kpis={[]}
      navItems={getDashboardNavItems(userRole)}
      notificationCount={2}
      onLogout={() => router.push("/")}
      user={dashboardUser}
    >
      <div className="space-y-6 relative pb-16">
        {/* Top Header & Context */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Events &amp; Tasks</h1>
          <p className="text-sm font-medium text-slate-500">
            University Student Council · AY 2025–2026 · Friday, August 7, 2026
          </p>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="border-b border-slate-200/80">
          <nav className="-mb-px flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("events")}
              className={`flex items-center gap-2 pb-3.5 pt-2 text-base font-bold transition border-b-2 ${
                activeTab === "events"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              <BookOpen className="size-5" />
              <span>Events &amp; Tasks</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("atomizer")}
              className={`flex items-center gap-2 pb-3.5 pt-2 text-base font-bold transition border-b-2 ${
                activeTab === "atomizer"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              <Zap className="size-5 text-blue-600" />
              <span>AI Task Atomizer</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-extrabold text-blue-600">
                AI
              </span>
            </button>
          </nav>
        </div>

        {/* Tab 1 Content: Events & Tasks Listing */}
        {activeTab === "events" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Workspace Events &amp; Goals ({goals.length})</h2>
              <Button
                type="button"
                onClick={() => {
                  setActiveTab("atomizer");
                  setAtomizerStep("form");
                }}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2"
              >
                <Plus className="size-4" />
                New Goal (AI Atomizer)
              </Button>
            </div>

            <div className="grid gap-4">
              {goals.map((goal, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">{goal.title}</h3>
                    <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold border border-blue-200">
                      {goal.status || "In Progress"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{goal.description}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-semibold text-slate-500">
                    <span>{goal.subtasks?.length ?? 0} Atomized Subtasks</span>
                    <span>Target Date: {goal.targetDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2 Content: AI Task Atomizer Form / Loading / Review */}
        {activeTab === "atomizer" && (
          <div>
            {atomizerStep === "form" && (
              <GoalCreationForm
                initialValues={activeGoalDraft ?? undefined}
                onSubmit={handleStartAtomization}
              />
            )}

            {atomizerStep === "atomizing" && activeGoalDraft && (
              <AIAtomizationProgress
                goal={activeGoalDraft}
                steps={promptChainSteps}
                currentStepIndex={currentStepIndex}
                onCancel={handleCancelAtomization}
              />
            )}

            {atomizerStep === "review" && activeGoalDraft && (
              <GoalReviewScreen
                goal={activeGoalDraft}
                onEdit={() => setAtomizerStep("form")}
                onSave={handleSaveGoal}
              />
            )}
          </div>
        )}

        {/* Bottom-Right Floating Help Action Button */}
        <div className="fixed bottom-6 right-6 z-30">
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition"
            title="Help & Info"
          >
            <HelpCircle className="size-6" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
