"use client";

import { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  User,
  X
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLogout } from "@/hooks/useLogout";
import { getMyProfile, updateMyProfile } from "@/services/auth.service";
import { SearchableCombobox } from "@/components/ui/SearchableCombobox";
import { SkillsPicker } from "@/components/ui/SkillsPicker";
import { subscribeEventsFirestore } from "@/services/events.service";
import type { Event, Task } from "@/components/events/types";
import { getDashboardNavItems } from "@/utils/routes";
import { PROGRAM_OPTIONS, YEAR_LEVEL_OPTIONS } from "@/utils/profileOptions";

type UserProfileData = {
  fullName: string;
  email: string;
  role: string;
  position: string;
  organizationName: string;
  yearLevel: string;
  program: string;
  birthdate: string;
  profilePicture: string | null;
  skills: string[];
  status: string;
};

function asDateInputValue(value: string): string {
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = isoDate ? new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3])) : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLatestAllowedBirthdate(): string {
  const latest = new Date();
  latest.setFullYear(latest.getFullYear() - 17);
  return asDateInputValue(`${latest.getFullYear()}-${String(latest.getMonth() + 1).padStart(2, "0")}-${String(latest.getDate()).padStart(2, "0")}`);
}

function isAtLeastSeventeen(birthdate: string): boolean {
  const value = asDateInputValue(birthdate);
  if (!value) return false;
  const [year, month, day] = value.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age >= 17;
}

function formatBirthdate(value: string): string {
  const inputValue = asDateInputValue(value);
  if (!inputValue) return value;
  const [year, month, day] = inputValue.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function DashboardProfilePage() {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const logout = useLogout();

  const [userData, setUserData] = useState<UserProfileData>({
    fullName: profile?.fullName || firebaseUser?.displayName || "",
    email: profile?.email || firebaseUser?.email || "",
    role: profile?.role || "",
    position: profile?.position || "",
    organizationName: profile?.organizationName || "",
    yearLevel: profile?.yearLevel || "",
    program: profile?.program || "",
    birthdate: profile?.birthdate || "",
    profilePicture: profile?.profilePicture || firebaseUser?.photoURL || null,
    skills: profile?.skills || [],
    status: profile?.availability || profile?.status || ""
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileSaveError, setProfileSaveError] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editYearLevel, setEditYearLevel] = useState("");
  const [editProgram, setEditProgram] = useState("");
  const [editBirthdate, setEditBirthdate] = useState("");
  const [editSkills, setEditSkills] = useState<string[]>([]);

  // Load the signed-in user's saved profile from the authenticated profile endpoint.
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getMyProfile(firebaseUser)
      .then((user) => {
        if (cancelled) return;
        setProfileError("");
        setUserData({
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          position: user.position || "",
          organizationName: user.organizationName || "",
          yearLevel: user.yearLevel || "",
          program: user.program || "",
          birthdate: user.birthdate || "",
          profilePicture: user.profilePicture,
          skills: user.skills,
          status: user.availability || user.status || ""
        });
        setProfile(user);
      })
      .catch((error) => {
        console.error("[ProfilePage] Unable to fetch the signed-in user's profile:", error);
        if (!cancelled) setProfileError("We couldn’t load your saved profile. Please refresh and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, setProfile]);

  // 2. Subscribe to Realtime Firestore Events & Tasks
  useEffect(() => {
    const orgId = profile?.organizationId ?? null;
    const unsubEvents = subscribeEventsFirestore(firebaseUser, orgId, (realtimeEvents) => {
      setEvents(realtimeEvents);
    });
    return () => unsubEvents();
  }, [firebaseUser, profile?.organizationId]);

  // Compute Subtasks for Current Logged-in User
  const { userSubtasks, doneCount, activeCount, pendingCount } = useMemo(() => {
    const userNameLower = (userData.fullName || "").toLowerCase().trim();
    // Flatten all tasks from all events
    const allOrgTasks: (Task & { eventTitle: string })[] = events.flatMap((ev) =>
      (ev.tasks || []).map((t) => ({ ...t, eventTitle: ev.title }))
    );

    // Filter tasks assigned to this user
    const assigned = allOrgTasks.filter((t) => {
      const assigneeName = (t.assignee?.name || t.assignedMemberName || "").toLowerCase().trim();
      return (
        (!!firebaseUser?.uid && t.assignedMemberUID === firebaseUser.uid) ||
        (!!userNameLower && assigneeName === userNameLower)
      );
    });

    const done = assigned.filter((t) => t.status === "Completed" || t.status === "Done").length;
    const active = assigned.filter((t) => t.status === "In Progress" || t.status === "In Review").length;
    const pending = assigned.filter((t) => t.status === "To Do" || t.status === "Pending").length;

    return {
      userSubtasks: assigned,
      doneCount: done,
      activeCount: active,
      pendingCount: pending
    };
  }, [events, userData.fullName, firebaseUser?.uid]);

  // Pagination & Filter States
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "active" | "pending">("all");
  const ITEMS_PER_PAGE = 5;

  const filteredSubtasks = useMemo(() => {
    if (statusFilter === "done") {
      return userSubtasks.filter((t) => t.status === "Completed" || t.status === "Done");
    }
    if (statusFilter === "active") {
      return userSubtasks.filter((t) => t.status === "In Progress" || t.status === "In Review");
    }
    if (statusFilter === "pending") {
      return userSubtasks.filter((t) => t.status === "To Do" || t.status === "Pending");
    }
    return userSubtasks;
  }, [userSubtasks, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSubtasks.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedSubtasks = useMemo(() => {
    const start = (validPage - 1) * ITEMS_PER_PAGE;
    return filteredSubtasks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubtasks, validPage]);

  // Open Edit Modal
  const openEditModal = () => {
    setEditName(userData.fullName);
    setEditPosition(userData.position);
    setEditYearLevel(userData.yearLevel);
    setEditProgram(userData.program);
    setEditBirthdate(asDateInputValue(userData.birthdate));
    setEditSkills([...userData.skills]);
    setProfileSaveError("");
    setIsEditModalOpen(true);
  };

  // Save Edit Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser?.uid) return;
    setProfileSaveError("");
    const birthdateToSave = editBirthdate || userData.birthdate;
    if (birthdateToSave && !isAtLeastSeventeen(birthdateToSave)) {
      setProfileSaveError("You must be at least 17 years old to save your birthdate.");
      return;
    }
    setIsSaving(true);

    try {
      const updatedData = {
        fullName: editName.trim() || userData.fullName,
        position: editPosition.trim() || userData.position,
        yearLevel: editYearLevel.trim() || userData.yearLevel,
        program: editProgram.trim() || userData.program,
        birthdate: birthdateToSave,
        skills: editSkills
      };

      const updatedProfile = await updateMyProfile(firebaseUser, updatedData);

      if (firebaseUser) {
        try {
          await updateProfile(firebaseUser, { displayName: updatedData.fullName });
        } catch {}
      }

      setUserData((prev) => ({ ...prev, ...updatedData }));

      setProfile(updatedProfile);

      setIsEditModalOpen(false);
    } catch (err) {
      console.error("[ProfilePage] Error saving profile:", err);
      const errorCode = typeof err === "object" && err !== null && "code" in err ? String(err.code) : "";
      setProfileSaveError(
        errorCode === "permission-denied"
          ? "You don’t have permission to update this profile. Please contact your administrator."
          : err instanceof Error
          ? err.message
          : "Unable to save your profile. Check your connection and try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const initials = userData.fullName.trim().charAt(0).toUpperCase();

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const dashboardUser = {
    id: firebaseUser?.uid ?? profile?.uid ?? null,
    name: userData.fullName || "",
    role: profile?.role ?? "Organization Member" as const,
    roleLabel: userData.position || userData.role,
    organizationName: userData.organizationName,
    academicYear: `AY ${new Date().getFullYear()}–${new Date().getFullYear() + 1}`,
    greetingDate: formattedDate
  };

  return (
    <DashboardLayout
      user={dashboardUser}
      navItems={getDashboardNavItems(dashboardUser.role)}
      kpis={[]}
      goals={[]}
      activities={[]}
      activeNavId="profile"
      notificationCount={0}
      onLogout={logout}
    >
    <main className="bg-[#f1f5f9] p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {userData.organizationName || "No organization"} · {formattedDate}
            </p>
          </div>

          <button
            type="button"
            onClick={openEditModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs border border-slate-200 hover:bg-slate-50 transition self-start sm:self-auto"
          >
            <Edit2 size={14} className="text-slate-500" />
            Edit Profile
          </button>
        </div>

        {loading ? <p className="text-xs font-medium text-slate-500">Loading your saved profile…</p> : null}
        {profileError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{profileError}</p> : null}

        {/* Hero Banner Card (Dark Navy) */}
        <div className="relative overflow-hidden rounded-3xl bg-[#1e3a5f] p-6 sm:p-8 text-white shadow-xl">
          {/* Subtle Glow Overlay */}
          <div className="absolute -right-16 -top-16 size-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Initials Avatar Box */}
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#2563eb] text-2xl font-bold font-mono text-white shadow-md">
              {initials || "?"}
              {userData.profilePicture ? (
                <img
                  src={userData.profilePicture}
                  alt=""
                  onError={(event) => event.currentTarget.remove()}
                  className="absolute inset-0 size-full rounded-2xl object-cover"
                />
              ) : null}
            </div>

            {/* Profile Information */}
            <div className="flex-1 space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-white">{userData.fullName || "Your profile"}</h2>
              <p className="text-sm font-medium text-slate-300">
                {[userData.position || userData.role, userData.organizationName].filter(Boolean).join(" · ") || "Add your role and organization"}
              </p>
              <p className="text-xs text-slate-400">
                {[userData.program, userData.yearLevel].filter(Boolean).join(" · ") || "Add your program and year level"}
              </p>

              {/* Status & Birthdate Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                    userData.status === "Busy"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : userData.status === "On Leave"
                      ? "bg-slate-700/60 text-slate-300 border-slate-600/50"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      userData.status === "Busy"
                        ? "bg-amber-400"
                        : userData.status === "On Leave"
                        ? "bg-slate-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  {userData.status || "Status not set"}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300 border border-slate-700/60">
                  <span>🎂</span>
                  {userData.birthdate ? formatBirthdate(userData.birthdate) : "Birthdate not provided"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Stats Cards Row (4 Columns) */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Assigned Tasks", value: userSubtasks.length, color: "text-slate-900" },
            { label: "Completed", value: doneCount, color: "text-emerald-600" },
            { label: "In Progress", value: activeCount, color: "text-blue-600" },
            { label: "Pending", value: pendingCount, color: "text-amber-600" }
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-xs">
              <p className={`text-3xl font-extrabold ${metric.color}`}>{metric.value}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Main Content Grid (3 Columns) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column (User Details & Skill Keywords) */}
          <div className="space-y-6 lg:col-span-1">
            {/* User Details Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="divide-y divide-slate-100 text-xs">
                <div className="pb-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    FULL NAME
                  </span>
                  <span className="mt-0.5 block font-bold text-slate-800 text-sm">
                    {userData.fullName}
                  </span>
                </div>

                <div className="py-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    EMAIL
                  </span>
                  <span className="mt-0.5 block font-medium text-slate-700">
                    {userData.email}
                  </span>
                </div>

                <div className="py-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    YEAR LEVEL
                  </span>
                  <span className="mt-0.5 block font-medium text-slate-700">
                    {userData.yearLevel || "Not provided"}
                  </span>
                </div>

                <div className="py-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    PROGRAM
                  </span>
                  <span className="mt-0.5 block font-medium text-slate-700">
                    {userData.program || "Not provided"}
                  </span>
                </div>

                <div className="py-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    BIRTHDATE
                  </span>
                  <span className="mt-0.5 block font-medium text-slate-700">
                    {userData.birthdate ? formatBirthdate(userData.birthdate) : "Not provided"}
                  </span>
                </div>

                <div className="py-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ROLE
                  </span>
                  <span className="mt-0.5 block font-medium text-slate-700">
                    {userData.position || userData.role}
                  </span>
                </div>

                <div className="py-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ORGANIZATION
                  </span>
                  <span className="mt-0.5 block font-medium text-slate-700">
                    {[userData.organizationName, userData.position || userData.role].filter(Boolean).join(" — ") || "Not provided"}
                  </span>
                </div>

              </div>
            </div>

            {/* Skill Keywords Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                SKILL KEYWORDS
              </h3>
              <div className="flex flex-wrap gap-2">
                {userData.skills.length ? userData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full bg-[#f0f4f8] px-3.5 py-1 text-xs font-semibold text-slate-700"
                  >
                    {skill}
                  </span>
                )) : <p className="text-sm text-slate-500">No skills added yet. Edit your profile to add skills.</p>}
              </div>
            </div>
          </div>

          {/* Right Column (Monthly Completion Bar Chart & Subtasks List) */}
          <div className="space-y-6 lg:col-span-2">
            {/* ALL SUB-TASKS Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  ALL SUB-TASKS
                </h3>

                <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-full transition ${
                      statusFilter === "all"
                        ? "bg-slate-900 text-white font-extrabold"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    All ({userSubtasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter(statusFilter === "done" ? "all" : "done");
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-full transition ${
                      statusFilter === "done"
                        ? "bg-emerald-600 text-white font-extrabold"
                        : "text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {doneCount} done
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter(statusFilter === "active" ? "all" : "active");
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-full transition ${
                      statusFilter === "active"
                        ? "bg-blue-600 text-white font-extrabold"
                        : "text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    {activeCount} active
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter(statusFilter === "pending" ? "all" : "pending");
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-full transition ${
                      statusFilter === "pending"
                        ? "bg-amber-600 text-white font-extrabold"
                        : "text-amber-600 hover:bg-amber-50"
                    }`}
                  >
                    {pendingCount} pending
                  </button>
                </div>
              </div>

              {/* Subtasks List */}
              {paginatedSubtasks.length === 0 ? (
                <div className="py-12 text-center text-xs font-medium text-slate-400">
                  No sub-tasks found matching the selected filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {paginatedSubtasks.map((task) => {
                    const status = task.status || "To Do";
                    const isDone = status === "Completed" || status === "Done";
                    const isInProgress = status === "In Progress" || status === "In Review";

                    const matchScore = typeof task.matchPercentage === "number" ? task.matchPercentage : null;

                    return (
                      <div
                        key={task.id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 leading-relaxed">
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            {task.eventTitle ? <span className="text-slate-400 font-medium">• {task.eventTitle}</span> : null}
                            {matchScore !== null ? <span className="font-bold text-blue-600">{matchScore}% match</span> : null}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isDone ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600 border border-emerald-200/60">
                              Done
                            </span>
                          ) : isInProgress ? (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-600 border border-blue-200/60">
                              In Progress
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-600 border border-amber-200/60">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Numbered Pagination Bar */}
              {filteredSubtasks.length > 0 && (
                <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">
                    Showing {Math.min((validPage - 1) * ITEMS_PER_PAGE + 1, filteredSubtasks.length)}–
                    {Math.min(validPage * ITEMS_PER_PAGE, filteredSubtasks.length)} of{" "}
                    {filteredSubtasks.length} sub-tasks
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={validPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Previous Page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`flex size-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                          validPage === pageNum
                            ? "bg-[#2563eb] text-white shadow-xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={validPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Next Page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <User size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Edit Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              {profileSaveError ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{profileSaveError}</p> : null}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                    Position / Role
                  </label>
                  <input
                    type="text"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                    Year Level
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {YEAR_LEVEL_OPTIONS.map((yearLevel) => (
                      <button
                        key={yearLevel}
                        type="button"
                        aria-pressed={editYearLevel === yearLevel}
                        onClick={() => setEditYearLevel(yearLevel)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${editYearLevel === yearLevel ? "border-[#244775] bg-[#244775] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}
                      >
                        {yearLevel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                  Program
                </label>
                <SearchableCombobox
                  value={editProgram}
                  onChange={setEditProgram}
                  options={PROGRAM_OPTIONS}
                  placeholder="Choose or type your program"
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                  Birthdate
                </label>
                <input
                  type="date"
                  value={editBirthdate}
                  max={getLatestAllowedBirthdate()}
                  onChange={(event) => {
                    setEditBirthdate(event.target.value);
                    setProfileSaveError("");
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-slate-500">You must be at least 17 years old.</p>
              </div>

              {/* Skill Keywords */}
              <SkillsPicker selectedSkills={editSkills} onChange={setEditSkills} />

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#2563eb] px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
    </DashboardLayout>
  );
}
