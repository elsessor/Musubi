import type {
  DashboardActivity,
  DashboardGoal,
  DashboardKPI,
  DashboardNavItem,
  DashboardUser
} from "@/types/dashboard";

export const dashboardUser: DashboardUser = {
  name: "Hans San Miguel",
  roleLabel: "President",
  organizationName: "University Student Council",
  academicYear: "AY 2025–2026",
  greetingDate: "Sunday, August 2, 2026"
};

export const dashboardNavItems: DashboardNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "events", label: "Events & Tasks", href: "/dashboard/events" },
  { id: "organization", label: "Organization", href: "/dashboard/organization" },
  { id: "analytics", label: "Analytics", href: "/dashboard/analytics" },
  { id: "notifications", label: "Notifications", href: "/dashboard/notifications", badge: 2 },
  { id: "settings", label: "Settings", href: "/dashboard/settings" }
];

export const dashboardKpis: DashboardKPI[] = [
  { id: "active-goals", label: "Active Goals", value: 4, icon: "target", accent: "blue" },
  {
    id: "total-subtasks",
    label: "Total Sub-Tasks",
    value: 34,
    icon: "briefcase",
    accent: "purple"
  },
  {
    id: "members-available",
    label: "Members Available",
    value: 4,
    icon: "users",
    accent: "green"
  },
  {
    id: "pending-delegations",
    label: "Pending Delegations",
    value: 7,
    icon: "clock",
    accent: "orange"
  }
];

export const dashboardGoals: DashboardGoal[] = [
  {
    id: "goal-1",
    title: "Launch Annual University Culture Week",
    dueDate: "Due Jun 28, 2026",
    progress: 54,
    status: "In Progress"
  },
  {
    id: "goal-2",
    title: "Organize Freshmen Orientation Campaign",
    dueDate: "Due Jun 10, 2026",
    progress: 100,
    status: "Completed"
  },
  {
    id: "goal-3",
    title: "Produce End-of-Year Publication Newsletter",
    dueDate: "Due Jul 15, 2026",
    progress: 18,
    status: "Pending"
  },
  {
    id: "goal-4",
    title: "Coordinate Inter-Org Sports Fest Logistics",
    dueDate: "Due Jul 5, 2026",
    progress: 41,
    status: "In Progress"
  },
  {
    id: "goal-5",
    title: "Set Up Fundraising Drive for Disaster Relief",
    dueDate: "Due Jul 20, 2026",
    progress: 8,
    status: "Pending"
  }
];

export const dashboardActivities: DashboardActivity[] = [
  {
    id: "activity-1",
    title: "Sub-task 'Venue Booking' marked as Done",
    time: "2 min ago",
    icon: "check"
  },
  {
    id: "activity-2",
    title: "Luis Garcia reassigned to 'Speaker Coordination'",
    time: "18 min ago",
    icon: "assign"
  },
  {
    id: "activity-3",
    title: "New goal 'Disaster Relief Drive' created",
    time: "1 hr ago",
    icon: "goal"
  },
  {
    id: "activity-4",
    title: "AI atomized 'Culture Week' into 8 sub-tasks",
    time: "3 hr ago",
    icon: "spark"
  },
  {
    id: "activity-5",
    title: "Beatrice Lim accepted 'Poster Design' task",
    time: "5 hr ago",
    icon: "users"
  },
  {
    id: "activity-6",
    title: "Freshmen Orientation goal marked Completed",
    time: "Yesterday",
    icon: "check"
  }
];