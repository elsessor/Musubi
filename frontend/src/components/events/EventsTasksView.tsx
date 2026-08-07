"use client";

import { CalendarDays, Zap } from "lucide-react";
import { useState } from "react";
import { AtomizerForm } from "./AtomizerForm";
import { EventsDashboard } from "./EventsDashboard";
import { KanbanBoard } from "./KanbanBoard";
import { MOCK_EVENTS } from "./mockData";
import type { Event } from "./types";

type Tab = "events" | "atomizer";

// ── View modes ────────────────────────────────────────────────────────────────
// "dashboard" → EventsDashboard (View 1)
// "kanban"    → KanbanBoard for a specific event (View 3)
// The tab controls whether we see the atomizer (View 2) or the events views

export function EventsTasksView() {
  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const events = MOCK_EVENTS; // swap for real data later

  function handleSelectEvent(event: Event) {
    setSelectedEvent(event);
    setActiveTab("events"); // stay on events tab, just switch sub-view
  }

  function handleBack() {
    setSelectedEvent(null);
  }

  function handleNewEvent() {
    // Future: open creation modal
    console.log("create new event");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab navigation */}
      <div className="mb-5 flex items-center gap-1 border-b border-slate-200">
        <TabButton
          icon={<CalendarDays size={14} />}
          label="Events & Tasks"
          active={activeTab === "events"}
          onClick={() => { setActiveTab("events"); }}
        />
        <TabButton
          icon={<Zap size={14} className="text-blue-500" />}
          label="AI Task Atomizer"
          badge="AI"
          active={activeTab === "atomizer"}
          onClick={() => { setActiveTab("atomizer"); setSelectedEvent(null); }}
        />
      </div>

      {/* View content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "atomizer" ? (
          <AtomizerForm events={events} />
        ) : selectedEvent ? (
          <KanbanBoard event={selectedEvent} onBack={handleBack} />
        ) : (
          <EventsDashboard
            events={events}
            onSelectEvent={handleSelectEvent}
            onNewEvent={handleNewEvent}
          />
        )}
      </div>
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
