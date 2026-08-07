"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { GoalReviewScreen } from "@/components/goals/GoalReviewScreen";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { GoalDraft } from "@/types/goal";
import { getDashboardNavItems } from "@/utils/routes";
import { ArrowLeft } from "lucide-react";

export default function GoalReviewRoutePage() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const showToast = useToastStore((state) => state.showToast);
  const [goalDraft, setGoalDraft] = useState<GoalDraft | null>(null);

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
          setGoalDraft(parsed[0]);
        }
      }
    } catch {
      // fallback
    }
  }, []);

  const handleSaveGoal = (finalGoal: GoalDraft) => {
    showToast({
      title: "Goal Approved & Saved",
      description: `"${finalGoal.title}" has been saved.`,
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
        <div className="flex items-center justify-between">
          <Link href="/dashboard/events" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition flex items-center gap-1">
            <ArrowLeft className="size-4" />
            Back to Events &amp; Tasks
          </Link>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
            MSB-FE-013 Review Screen
          </span>
        </div>

        {goalDraft ? (
          <GoalReviewScreen
            goal={goalDraft}
            onEdit={() => router.push("/dashboard/events/new-goal")}
            onSave={handleSaveGoal}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-4">
            <p className="text-slate-600">No goal draft found to review. Create a goal to start AI atomization.</p>
            <Link href="/dashboard/events/new-goal">
              <button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-white font-bold text-sm">
                Create New Goal
              </button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
