"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProfileOverview, type ProfileOverviewUser } from "@/components/dashboard/ProfileOverview";
import { getOrganizationMembers, getOrganization, type OrganizationMember } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/useLogout";
import { getDashboardNavItems } from "@/utils/routes";
import { getProfileReturnPath } from "@/utils/profileNavigation";
import type { ProfileTask } from "@/utils/profileMetrics";

export function MemberProfileClient() {
  const search = useSearchParams();
  const memberId = search.get("memberId");
  const backHref = getProfileReturnPath(search.get("returnTo"));
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const authLoading = useAuthStore((state) => state.loading);
  const logout = useLogout();
  const [member, setMember] = useState<OrganizationMember | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isOwner = Boolean(memberId && memberId === (firebaseUser?.uid || profile?.uid));
  const canViewPerformance = isOwner || profile?.role === "Student Leader" || profile?.role === "Admin";

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/sign-in");
    else if (!authLoading && isOwner) router.replace(`/dashboard/profile?${new URLSearchParams({ returnTo: backHref })}`);
  }, [authLoading, profile, isOwner, router, backHref]);

  useEffect(() => {
    if (authLoading || !firebaseUser || !profile || isOwner) return;
    if (!memberId || !profile.organizationId) {
      setMember(null); setError("This profile is unavailable."); setLoading(false); return;
    }
    let cancelled = false;
    let pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const [members, organization] = await Promise.all([
          getOrganizationMembers(firebaseUser!, profile!.organizationId!),
          getOrganization(firebaseUser!, profile!.organizationId!)
        ]);
        if (cancelled) return;
        const selected = members.find((item) => item.id === memberId) || null;
        setMember(selected);
        setOrganizationName(organization.name);
        setError(selected ? "" : "This member is not in your organization.");
      } catch (cause) {
        if (!cancelled) { setMember(null); setError(cause instanceof Error ? cause.message : "Unable to load this profile."); }
      } finally { pending = false; if (!cancelled) setLoading(false); }
    }
    setMember(null); setLoading(true); setError("");
    void load();
    const interval = setInterval(() => { if (!document.hidden) void load(); }, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [authLoading, firebaseUser, memberId, profile, isOwner]);

  const tasks = useMemo(() => (member?.assignedTasks || []).map((task) => ({
    ...task, eventId: task.eventId || "", eventTitle: task.eventTitle || ""
  }) as ProfileTask), [member]);

  if (authLoading || !profile || isOwner) return <p role="status" className="p-8 text-sm text-slate-500">Loading profile…</p>;
  const user: ProfileOverviewUser = {
    fullName: member?.name || "", email: "", yearLevel: "", program: "", birthdate: "",
    role: member?.role || "", position: member?.position || "", organizationName,
    profilePicture: member?.profilePicture || null, skills: member?.skills || [], status: member?.availability || ""
  };
  const viewer = {
    id: firebaseUser?.uid || profile.uid, name: profile.fullName, role: profile.role,
    roleLabel: profile.position || profile.role, organizationName: profile.organizationName || organizationName,
    academicYear: `AY ${new Date().getFullYear()}–${new Date().getFullYear() + 1}`,
    greetingDate: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date())
  };
  return <DashboardLayout user={viewer} navItems={getDashboardNavItems(profile.role)} activeNavId="organization" kpis={[]} goals={[]} activities={[]} notificationCount={0} onLogout={logout}>
    <div className="mx-auto max-w-7xl space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
        <ArrowLeft size={16} />{backHref.startsWith("/dashboard/organization/committees?") ? "Back to committee" : "Back to organization members"}
      </Link>
      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</p>
        : <ProfileOverview key={memberId} user={user} tasks={tasks} loading={loading} tasksLoading={loading} profileError="" tasksError="" title="Member profile" showPerformance={canViewPerformance} showPersonalDetails={false} committee={member?.committeeName || "Not assigned"} />}
    </div>
  </DashboardLayout>;
}
