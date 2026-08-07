"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AIAtomizationProgress } from "@/components/goals/AIAtomizationProgress";
import { GoalCreationForm } from "@/components/goals/GoalCreationForm";
import { GoalReviewScreen } from "@/components/goals/GoalReviewScreen";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { INITIAL_PROMPT_CHAIN_STEPS, runAIAtomizationPromptChain } from "@/services/aiAtomizationService";
import type { GoalDraft, PromptChainStep } from "@/types/goal";
import { getDashboardNavItems } from "@/utils/routes";

export default function NewGoalPage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const showToast = useToastStore((state) => state.showToast);

  const [step, setStep] = useState<"form" | "atomizing" | "review">("form");
  const [goalDraft, setGoalDraft] = useState<GoalDraft | null>(null);
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

  const handleStartAtomization = async (draft: GoalDraft) => {
    setGoalDraft(draft);
    setStep("atomizing");
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

      setGoalDraft(result.goal);
      setStep("review");
      showToast({
        title: "Subtasks Generated Successfully!",
        description: "AI Prompt Chaining complete. Review subtasks below.",
        tone: "success"
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        showToast({
          title: "AI Generation Cancelled",
          description: "Goal atomization was cancelled. You can modify parameters and try again.",
          tone: "info"
        });
        setStep("form");
      } else {
        showToast({
          title: "Generation Error",
          description: "Failed to run prompt chaining sequence. Please try again.",
          tone: "error"
        });
        setStep("form");
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    } else {
      setStep("form");
    }
  };

  const handleSaveGoal = (finalGoal: GoalDraft) => {
    // Save created goal to sessionStorage / local storage for persistence demo
    try {
      const existingStr = sessionStorage.getItem("musubi_goals");
      const existing = existingStr ? JSON.parse(existingStr) : [];
      sessionStorage.setItem("musubi_goals", JSON.stringify([finalGoal, ...existing]));
    } catch {
      // fallback ignore
    }

    showToast({
      title: "Goal Created & Published",
      description: `"${finalGoal.title}" with ${finalGoal.subtasks?.length ?? 0} subtasks saved!`,
      tone: "success"
    });

    router.push("/dashboard/events");
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
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Breadcrumb Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Link href="/dashboard/events" className="hover:text-slate-900 transition flex items-center gap-1">
              <ArrowLeft className="size-4" />
              Events &amp; Tasks
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">New Goal &amp; AI Atomization</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className={`px-2 py-0.5 rounded-full ${step === "form" ? "bg-blue-600 text-white" : "bg-slate-200"}`}>
              1. Form
            </span>
            <span>→</span>
            <span className={`px-2 py-0.5 rounded-full ${step === "atomizing" ? "bg-blue-600 text-white" : "bg-slate-200"}`}>
              2. AI Atomization
            </span>
            <span>→</span>
            <span className={`px-2 py-0.5 rounded-full ${step === "review" ? "bg-emerald-600 text-white" : "bg-slate-200"}`}>
              3. Review (MSB-FE-013)
            </span>
          </div>
        </div>

        {/* Dynamic View State */}
        {step === "form" && (
          <GoalCreationForm
            initialValues={goalDraft ?? undefined}
            onSubmit={handleStartAtomization}
          />
        )}

        {step === "atomizing" && goalDraft && (
          <AIAtomizationProgress
            goal={goalDraft}
            steps={promptChainSteps}
            currentStepIndex={currentStepIndex}
            onCancel={handleCancel}
          />
        )}

        {step === "review" && goalDraft && (
          <GoalReviewScreen
            goal={goalDraft}
            onEdit={() => setStep("form")}
            onSave={handleSaveGoal}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
