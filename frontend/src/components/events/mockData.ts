import type { Event } from "./types";

export const MOCK_EVENTS: Event[] = [
  {
    id: "culture-week",
    title: "Culture Week",
    description: "Annual University Culture Week celebration across all departments.",
    status: "Active",
    startDate: "Jun 20, 2026",
    endDate: "Jun 28, 2026",
    memberCount: 6,
    progress: 62,
    committee: "Executive",
    tasks: [
      {
        id: "t1",
        title: "Coordinate booth participation",
        status: "To Do",
        priority: "Medium",
        dueDate: "Jun 27",
        assignee: { initials: "AR", color: "bg-violet-500" },
        blockedBy: 1
      },
      {
        id: "t2",
        title: "Set up registration system",
        status: "To Do",
        priority: "High",
        dueDate: "Jun 31",
        assignee: { initials: "MG", color: "bg-emerald-500" }
      },
      {
        id: "t3",
        title: "Recruit and brief event volunteers",
        status: "To Do",
        priority: "Medium",
        dueDate: "Jun 25",
        assignee: { initials: "PU", color: "bg-sky-500" },
        blockedBy: 2
      },
      {
        id: "t4",
        title: "Secure venue and permits",
        status: "In Progress",
        priority: "High",
        dueDate: "Jun 20",
        assignee: { initials: "LS", color: "bg-amber-500" }
      },
      {
        id: "t5",
        title: "Prepare budget proposal",
        status: "In Progress",
        priority: "Critical",
        dueDate: "Jun 17",
        assignee: { initials: "LT", color: "bg-rose-500" }
      },
      {
        id: "t6",
        title: "Design promotional materials",
        status: "Completed",
        priority: "Medium",
        dueDate: "Jun 18",
        assignee: { initials: "RL", color: "bg-indigo-500" }
      }
    ]
  },
  {
    id: "inter-org-sports",
    title: "Inter-Org Sports Fest",
    description: "Inter-organizational sports tournament and activities.",
    status: "Active",
    startDate: "Jun 26, 2026",
    endDate: "Jul 5, 2026",
    memberCount: 5,
    progress: 44,
    committee: "Sports",
    tasks: [
      {
        id: "s1",
        title: "Book sports facilities",
        status: "In Progress",
        priority: "High",
        dueDate: "Jun 22",
        assignee: { initials: "KL", color: "bg-teal-500" }
      },
      {
        id: "s2",
        title: "Register participating teams",
        status: "To Do",
        priority: "Medium",
        dueDate: "Jun 24",
        assignee: { initials: "BM", color: "bg-orange-500" }
      }
    ]
  },
  {
    id: "leadership-summit",
    title: "Leadership Summit",
    description: "Annual leadership development summit for student council officers.",
    status: "Planning",
    startDate: "Jul 15, 2026",
    endDate: "Jul 16, 2026",
    memberCount: 12,
    progress: 18,
    committee: "Executive",
    tasks: []
  },
  {
    id: "induction-ceremony",
    title: "Induction Ceremony",
    description: "Official induction of new student council members for AY 2026-2027.",
    status: "Planning",
    startDate: "Aug 1, 2026",
    endDate: "Aug 1, 2026",
    memberCount: 20,
    progress: 5,
    committee: "Executive",
    tasks: []
  },
  {
    id: "recognition-night",
    title: "Recognition Night",
    description: "Annual recognition of outstanding students and organizations.",
    status: "Planning",
    startDate: "Aug 20, 2026",
    endDate: "Aug 20, 2026",
    memberCount: 8,
    progress: 0,
    committee: "Academic Affairs",
    tasks: []
  },
  {
    id: "acquaintance-party",
    title: "Acquaintance Party",
    description: "Welcome party for incoming freshmen and new members.",
    status: "Completed",
    startDate: "May 10, 2026",
    endDate: "May 10, 2026",
    memberCount: 15,
    progress: 100,
    committee: "Student Life",
    tasks: []
  }
];
