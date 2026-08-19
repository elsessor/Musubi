"use client";

import { CalendarDays, Zap } from "lucide-react";
import { useState } from "react";
import { AtomizerForm } from "./AtomizerForm";
import { EventsDashboard } from "./EventsDashboard";
import { KanbanBoard } from "./KanbanBoard";
import { MOCK_EVENTS } from "./mockData";
import type { Event, Task } from "./types";

type Tab = "events" | "atomizer";

export function EventsTasksView() {
  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  function handleSelectEvent(event: Event) {
    setSelectedEvent(event);
    setActiveTab("events");
  }

  function handleBack() {
    setSelectedEvent(null);
  }

  function handleUpdateEvent(updatedEvent: Event) {
    setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    if (selectedEvent?.id === updatedEvent.id) {
      setSelectedEvent(updatedEvent);
    }
  }

  function handlePublishGoalTasks(targetEventId: string, publishedTasks: Task[]) {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== targetEventId && ev.id !== "culture-week") return ev;
        const mergedTasks = [...publishedTasks, ...ev.tasks];
        const completedCount = mergedTasks.filter((t) => t.status === "Completed").length;
        const computedProgress = Math.round((completedCount / mergedTasks.length) * 100);

        return {
          ...ev,
          progress: computedProgress,
          tasks: mergedTasks
        };
      })
    );

    const targetEv = events.find((e) => e.id === targetEventId) || events[0];
    if (targetEv) {
      setSelectedEvent({
        ...targetEv,
        tasks: [...publishedTasks, ...targetEv.tasks]
      });
    }
    setActiveTab("events");
  }

  return (
    <div className="flex h-full flex-col">
      {/* 2-Tab navigation */}
      <div className="mb-5 flex items-center gap-1 border-b border-slate-200">
        <TabButton
          icon={<CalendarDays size={14} />}
          label="Events & Tasks"
          active={activeTab === "events"}
          onClick={() => {
            setActiveTab("events");
          }}
        />
        <TabButton
          icon={<Zap size={14} className="text-blue-500" />}
          label="AI Task Atomizer"
          badge="AI"
          active={activeTab === "atomizer"}
          onClick={() => {
            setActiveTab("atomizer");
            setSelectedEvent(null);
          }}
        />
      </div>

      {/* View content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "atomizer" ? (
          <AtomizerForm
            events={events}
            onPublishGoalTasks={handlePublishGoalTasks}
          />
        ) : selectedEvent ? (
          <KanbanBoard
            event={selectedEvent}
            onBack={handleBack}
            onUpdateEvent={handleUpdateEvent}
          />
        ) : (
          <EventsDashboard
            events={events}
            onSelectEvent={handleSelectEvent}
            onNewEvent={() => console.log("create new event")}
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
        active ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
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
