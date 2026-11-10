import type { TourStep } from "./tutorial";

export function getCalendarConnectionSteps(route: string): TourStep[] {
  return [
    {
      id: "calendar-connect", title: "Connect Google Calendar", route, target: "settings-calendar",
      description: "Select Connect Google Calendar, choose a Google account, and review the requested permissions. After authorization, return to Settings and confirm the Connected label and linked email.",
      highlightTargets: ["settings-calendar", "settings-calendar-connect", "settings-calendar-account"]
    },
    {
      id: "calendar-sync", title: "Sync and view schedules", route, target: "settings-calendar-actions",
      description: "Once connected, Sync All Events adds or updates campus events and tasks in your Google calendar. Archived items are excluded. Select Open Calendar to check the entries in a new tab.",
      highlightTargets: ["settings-calendar-actions", "settings-calendar-sync", "settings-calendar-open"]
    },
    {
      id: "calendar-disconnect", title: "Manage or reconnect your account", route, target: "settings-calendar-actions",
      description: "Disconnect stops future calendar access; existing Google Calendar entries remain. To change accounts or resolve a permission error, disconnect, then connect again and review the permissions.",
      highlightTargets: ["settings-calendar-actions", "settings-calendar-disconnect"]
    }
  ];
}
