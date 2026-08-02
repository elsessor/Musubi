export type DashboardNavItem = {
  id: string;
  label: string;
  href: string;
  badge?: number;
};

export type DashboardKPI = {
  id: string;
  label: string;
  value: number;
  icon: "target" | "briefcase" | "users" | "clock";
  accent: "blue" | "purple" | "green" | "orange";
};

export type DashboardGoalStatus = "In Progress" | "Completed" | "Pending";

export type DashboardGoal = {
  id: string;
  title: string;
  dueDate: string;
  progress: number;
  status: DashboardGoalStatus;
};

export type DashboardActivity = {
  id: string;
  title: string;
  time: string;
  icon: "check" | "users" | "goal" | "spark" | "assign" | "edit";
};

export type DashboardUser = {
  name: string;
  roleLabel: string;
  organizationName: string;
  academicYear: string;
  greetingDate: string;
};