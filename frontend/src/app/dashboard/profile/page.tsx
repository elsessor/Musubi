"use client";

import { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  User,
  X
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProfileOverview, type ProfileOverviewUser } from "@/components/dashboard/ProfileOverview";
import { useLogout } from "@/hooks/useLogout";
import { getMyProfile, updateMyProfile } from "@/services/auth.service";
import { SearchableCombobox } from "@/components/ui/SearchableCombobox";
import { SkillsPicker } from "@/components/ui/SkillsPicker";
import { subscribeEventsFirestore } from "@/services/events.service";
import type { Event } from "@/components/events/types";
import { getAssignedProfileTasks } from "@/utils/profileMetrics";
import { getDashboardNavItems } from "@/utils/routes";
import { PROGRAM_OPTIONS, YEAR_LEVEL_OPTIONS } from "@/utils/profileOptions";
import { useToastStore } from "@/store/toastStore";
import { getProfileReturnPath } from "@/utils/profileNavigation";

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

export default function DashboardProfilePage() {
  const router = useRouter();
  const authLoading = useAuthStore((state) => state.loading);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const showToast = useToastStore((state) => state.showToast);
  const logout = useLogout();

  function handleBack() {
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    if (returnTo) router.push(getProfileReturnPath(returnTo));
    else if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  }

  const [userData, setUserData] = useState<ProfileOverviewUser>({
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
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");
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
  // Sync state whenever profile store or firebaseUser loads
  useEffect(() => {
    if (profile || firebaseUser) {
      setUserData((prev) => ({
        ...prev,
        fullName: profile?.fullName ?? firebaseUser?.displayName ?? "",
        email: profile?.email ?? firebaseUser?.email ?? "",
        role: profile?.role ?? "",
        position: profile?.position ?? "",
        organizationName: profile?.organizationName ?? "",
        yearLevel: profile?.yearLevel ?? "",
        program: profile?.program ?? "",
        birthdate: profile?.birthdate ?? "",
        profilePicture: profile?.profilePicture ?? firebaseUser?.photoURL ?? null,
        skills: profile?.skills ?? [],
        status: profile?.availability || profile?.status || ""
      }));
    }
  }, [firebaseUser, profile]);

  // Load the signed-in user's profile through the authenticated API.
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

  // Poll saved organization tasks through the authenticated API.
  useEffect(() => {
    const orgId = profile?.organizationId ?? null;
    setEvents([]);
    setTasksError("");
    if (!firebaseUser || !orgId) {
      setTasksLoading(false);
      return;
    }
    setTasksLoading(true);
    const unsubEvents = subscribeEventsFirestore(firebaseUser, orgId, (realtimeEvents) => {
      setEvents(realtimeEvents);
      setTasksLoading(false);
      setTasksError("");
    }, () => {
      setTasksLoading(false);
      setTasksError("We couldn't load your tasks. Please refresh and try again.");
    });
    return () => unsubEvents();
  }, [firebaseUser, profile?.organizationId]);

  const userSubtasks = useMemo(() => getAssignedProfileTasks(events, firebaseUser?.uid || "", userData.fullName), [events, firebaseUser?.uid, userData.fullName]);

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
        } catch { }
      }

      setUserData((prev) => ({ ...prev, ...updatedData }));

      setProfile(updatedProfile);
      showToast({
        title: "Profile updated",
        description: "Your profile changes have been saved.",
        tone: "success"
      });

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
      <section>
        <div className="mx-auto mb-5 max-w-7xl">
          <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <ArrowLeft size={16} />Back
          </button>
        </div>
        <ProfileOverview user={userData} tasks={userSubtasks} loading={loading || authLoading} tasksLoading={tasksLoading} profileError={profileError} tasksError={tasksError} onEdit={openEditModal} />

        {/* Edit Profile Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-2 backdrop-blur-xs sm:p-4">
            <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex min-w-0 items-center gap-2.5">
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

              <form onSubmit={handleSaveProfile} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
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

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      <select
                        value={editYearLevel}
                        onChange={(event) => setEditYearLevel(event.target.value)}
                        className="h-10 w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                      >
                        <option value="" disabled>Choose year level</option>
                        {YEAR_LEVEL_OPTIONS.map((yearLevel) => <option key={yearLevel} value={yearLevel}>{yearLevel}</option>)}
                      </select>
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

                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
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
      </section>
    </DashboardLayout>
  );
}
