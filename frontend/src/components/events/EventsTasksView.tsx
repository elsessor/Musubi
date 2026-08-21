"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { BookOpen, CalendarDays, Plus, X, Zap } from "lucide-react";
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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

    const startFormatted = startDate
      ? new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const endFormatted = endDate
      ? new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    try {
      await createEventFirestore(firebaseUser, effectiveOrgId || profile?.organizationId || "default-org", {
        title: title.trim(),
        description: description.trim(),
        status: "Active",
        committee: committee.trim() || "General",
        startDate: startFormatted,
        endDate: endFormatted,
        memberCount: 1,
        progress: 0,
        tasks: []
      });
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setStartDate("");
      setEndDate("");
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
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            {/* Header with Icon, Title, Subtitle, and Close Button */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500 border border-blue-100/60">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create New Event</h3>
                  <p className="text-xs text-slate-400">Add an organizational event with tasks</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEventSubmit} className="space-y-4">
              {/* EVENT NAME */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  EVENT NAME <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='e.g. "Spring Fundraiser 2026"'
                  className="w-full rounded-xl border border-slate-200/60 bg-[#F0F4F8] px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  DESCRIPTION
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this event about?"
                  className="w-full resize-none rounded-xl border border-slate-200/60 bg-[#F0F4F8] p-3.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* START DATE & END DATE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold tracking-wider uppercase text-slate-400">
                    START DATE <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/60 bg-[#F0F4F8] px-3 py-2.5 text-xs text-slate-700 outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold tracking-wider uppercase text-slate-400">
                    END DATE <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/60 bg-[#F0F4F8] px-3 py-2.5 text-xs text-slate-700 outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* BUTTONS */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !title.trim()}
                  className={`w-full rounded-xl py-2.5 text-xs font-semibold transition-all ${
                    title.trim() && !creating
                      ? "bg-[#9CB0C9] text-white hover:bg-slate-500 active:scale-[0.98]"
                      : "bg-[#CBD5E1] text-white cursor-not-allowed opacity-70"
                  }`}
                >
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
