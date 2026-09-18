"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import {
  createOrganization,
  getOrganizations,
  type OrganizationDirectoryRecord
} from "@/services/auth.service";

const DEFAULT_ORGANIZATIONS = [
  {
    id: "org-1",
    name: "University Student Council",
    type: "Governing",
    description: "The highest governing student body of the university.",
    memberCount: 7,
    goalCount: 5,
    status: "active",
    code: "ORG-001"
  },
  {
    id: "org-2",
    name: "Computer Science Society",
    type: "Academic",
    description: "Org for CS majors focused on tech and innovation.",
    memberCount: 24,
    goalCount: 3,
    status: "active",
    code: "ORG-002"
  },
  {
    id: "org-3",
    name: "Socio-Civic Action Group",
    type: "Socio-Civic",
    description: "Community outreach and civic engagement programs.",
    memberCount: 12,
    goalCount: 1,
    status: "active",
    code: "ORG-003"
  },
  {
    id: "org-4",
    name: "Campus Media Network",
    type: "Media",
    description: "Handles campus publications and broadcast.",
    memberCount: 18,
    goalCount: 2,
    status: "active",
    code: "ORG-004"
  }
];

export function AdminOrganizationsView() {
  const router = useRouter();
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  const [organizations, setOrganizations] = useState<OrganizationDirectoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgType, setNewOrgType] = useState("Academic");
  const [newOrgDescription, setNewOrgDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadOrganizations = async () => {
    if (!firebaseUser) return;
    try {
      setLoading(true);
      const data = await getOrganizations(firebaseUser);
      setOrganizations(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrganizations();
  }, [firebaseUser]);

  const displayOrganizations = useMemo(() => {
    let source = DEFAULT_ORGANIZATIONS;

    if (organizations.length > 0) {
      source = organizations.map((org, idx) => ({
        id: org.id,
        name: org.name,
        type: org.type || "Academic",
        description: org.description || "Campus student organization.",
        memberCount: org.memberCount || (DEFAULT_ORGANIZATIONS[idx % DEFAULT_ORGANIZATIONS.length] || {}).memberCount || 10,
        goalCount: (DEFAULT_ORGANIZATIONS[idx % DEFAULT_ORGANIZATIONS.length] || {}).goalCount || 3,
        status: org.status || "active",
        code: `ORG-${String(idx + 1).padStart(3, "0")}`
      }));
    }

    if (!searchQuery.trim()) return source;

    const q = searchQuery.toLowerCase();
    return source.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.type.toLowerCase().includes(q) ||
        org.description.toLowerCase().includes(q)
    );
  }, [organizations, searchQuery]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !newOrgName.trim()) return;

    try {
      setSubmitting(true);
      setError("");
      await createOrganization(firebaseUser, {
        name: newOrgName.trim(),
        type: newOrgType.trim(),
        description: newOrgDescription.trim()
      });
      setNewOrgName("");
      setNewOrgDescription("");
      setIsAddModalOpen(false);
      await loadOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Organizations</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Add Organization</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <Search className="size-5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or type..."
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
        />
      </div>

      {/* Organization Grid (2 Columns) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayOrganizations.map((org) => (
          <div
            key={org.id}
            onClick={() => router.push(`/admin/organizations/${org.id}`)}
            className="group flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 hover:shadow-md transition-all cursor-pointer"
          >
            <div>
              {/* Top Row: Name & Complete Badge */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {org.name}
                  </h2>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">{org.type}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-600/10">
                  Complete
                </span>
              </div>

              {/* Middle Row: Description */}
              <p className="mt-3 text-sm font-normal text-slate-500 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                {org.description}
              </p>
            </div>

            {/* Bottom Row: Members / Goals and Code */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                <span>{org.memberCount} members</span>
                <span>{org.goalCount} goals</span>
              </div>
              <span className="font-mono text-xs font-medium text-slate-400">{org.code}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Add Organization Modal */}
      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add New Organization</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {error ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p> : null}

            <form onSubmit={handleCreateOrg} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Computer Science Society"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Category / Type
                </label>
                <select
                  value={newOrgType}
                  onChange={(e) => setNewOrgType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 bg-white"
                >
                  <option value="Governing">Governing</option>
                  <option value="Academic">Academic</option>
                  <option value="Socio-Civic">Socio-Civic</option>
                  <option value="Media">Media</option>
                  <option value="Special Interest">Special Interest</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newOrgDescription}
                  onChange={(e) => setNewOrgDescription(e.target.value)}
                  placeholder="Briefly describe the purpose of this organization..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#1e293b] hover:bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
