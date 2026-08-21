"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { CalendarDays, Plus, X, Zap } from "lucide-react";
import { AtomizerForm } from "./AtomizerForm";
import { EventsDashboard } from "./EventsDashboard";
import { KanbanBoard } from "./KanbanBoard";
import type { Event } from "./types";

import { getFirebaseDb } from "@/firebase/config";
import { useAuthStore } from "@/store/authStore";
import { clearMockEventsFirestore, createEventFirestore, subscribeEventsFirestore } from "@/services/events.service";

type Tab = "events" | "atomizer";

export function EventsTasksView() {
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const isLeader = profile?.role === "Student Leader" || profile?.role === "Admin";

  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [effectiveOrgId, setEffectiveOrgId] = useState<string | null>(profile?.organizationId ?? null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [committee, setCommittee] = useState("Executive");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (profile?.organizationId) {
      setEffectiveOrgId(profile.organizationId);
      return;
    }
    if (firebaseUser?.uid) {
      void getDoc(doc(getFirebaseDb(), "users", firebaseUser.uid)).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.organizationId === "string" && data.organizationId.trim()) {
            setEffectiveOrgId(data.organizationId);
          }
        }
      }).catch(() => {});
    }
  }, [firebaseUser?.uid, profile?.organizationId]);

  useEffect(() => {
    const unsubscribe = subscribeEventsFirestore(firebaseUser, effectiveOrgId, (realtimeEvents) => {
      setEvents(realtimeEvents);
      setSelectedEvent((currentSelected) => {
        if (!currentSelected) return null;
        const updated = realtimeEvents.find((e) => e.id === currentSelected.id);
        return updated || currentSelected;
      });
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [firebaseUser, effectiveOrgId]);

  const currentTab = isLeader ? activeTab : "events";

  function handleSelectEvent(event: Event) {
    setSelectedEvent(event);
    setActiveTab("events");
  }

  function handleBack() {
    setSelectedEvent(null);
  }

  function handleNewEvent() {
    setIsModalOpen(true);
  }

  async function handleCreateEventSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await createEventFirestore(firebaseUser, effectiveOrgId || profile?.organizationId || "default-org", {
        title: title.trim(),
        description: description.trim(),
        status: "Active",
        committee: committee.trim(),
        startDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        endDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        memberCount: 1,
        progress: 0,
        tasks: []
      });
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error("Failed to create event:", err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab navigation */}
      <div className="mb-5 flex items-center gap-1 border-b border-slate-200">
        <TabButton
          icon={<CalendarDays size={14} />}
          label="Events & Tasks"
          active={currentTab === "events"}
          onClick={() => { setActiveTab("events"); }}
        />
        {isLeader && (
          <TabButton
            icon={<Zap size={14} className="text-blue-500" />}
            label="AI Task Atomizer"
            badge="AI"
            active={currentTab === "atomizer"}
            onClick={() => { setActiveTab("atomizer"); setSelectedEvent(null); }}
          />
        )}
      </div>

      {/* View content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {currentTab === "atomizer" && isLeader ? (
          <AtomizerForm events={events} />
        ) : selectedEvent ? (
          <KanbanBoard event={selectedEvent} onBack={handleBack} />
        ) : (
          <EventsDashboard
            events={events}
            isLeader={isLeader}
            onSelectEvent={handleSelectEvent}
            onNewEvent={handleNewEvent}
            onClearEvents={() => clearMockEventsFirestore(firebaseUser, effectiveOrgId || profile?.organizationId)}
          />
        )}
      </div>

      {/* Create Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Event</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateEventSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  EVENT TITLE
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Campus Cultural Night 2026"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of the event goals and activities..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  COMMITTEE
                </label>
                <select
                  value={committee}
                  onChange={(e) => setCommittee(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Executive">Executive</option>
                  <option value="Sports">Sports</option>
                  <option value="Academic Affairs">Academic Affairs</option>
                  <option value="Student Life">Student Life</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus size={14} />
                  {creating ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab Button ────────────────────────────────────────────────────────────────

type TabButtonProps = {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  active: boolean;
  onClick: () => void;
};

function TabButton({ icon, label, badge, active, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 pb-3 pt-1 text-sm font-medium transition-colors ${
        active
          ? "text-blue-600"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {icon}
      {label}
      {badge && (
        <span className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
      {/* Active underline */}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
      )}
    </button>
  );
}
