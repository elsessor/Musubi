import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileOverview, type ProfileOverviewUser } from "../src/components/dashboard/ProfileOverview";
import { MemberProfileModal } from "../src/components/dashboard/MemberProfileModal";
import { useAuthStore } from "../src/store/authStore";
import { getTourSteps } from "../src/config/tutorial";
import type { ProfileTask } from "../src/utils/profileMetrics";
import type { AuthUserProfile } from "../src/types/auth";

const user: ProfileOverviewUser = { fullName: "Example Student With A Longer Name", email: "student@example.test", role: "Organization Member", position: "Member", organizationName: "Campus Organization", yearLevel: "First Year", program: "Arts", birthdate: "2000-01-01", profilePicture: null, skills: ["Design", "Writing"], status: "Available" };
const now = new Date().toISOString();
const tasks: ProfileTask[] = [4, 5].map((rating, index) => ({ id: `task-${index}`, eventId: "event", eventTitle: "Campus event", title: "Completed assignment", status: "Completed", priority: "Medium", dueDate: "2099-01-01", completedAt: now, assignee: { initials: "ES", color: "bg-blue-600" }, matchPercentage: index ? 100 : 80, performanceReview: { rating, reviewerUID: "leader", reviewedAt: now } }));

test("profile guides explain every visible card and agree with saved rating and completion data", () => {
  const html = renderToStaticMarkup(createElement(ProfileOverview, { user, tasks, loading: false, tasksLoading: false, profileError: "", tasksError: "", onEdit: () => {} }));
  const steps = getTourSteps("Organization Member", "page-profile");
  assert.equal(steps.length, 7);
  for (const step of steps) assert.ok(html.includes(`data-tour="${step.target}"`), step.target);
  for (const target of ["profile-page", "profile-edit", "profile-workload", "profile-reliability", "profile-match", "profile-done", "profile-task-filters"]) assert.ok(html.includes(`data-tour="${target}"`), target);
  assert.match(html, /4\.5/);
  assert.match(html, /90%/);
  assert.match(html, /Top Performer/);
  assert.equal(steps.find((step) => step.target === "profile-statistics")!.details?.length, 4);
  assert.match(steps.find((step) => step.target === "profile-rating")!.description, /average.*recorded leader reviews.*rating count/i);
  assert.match(steps.find((step) => step.target === "profile-completion")!.description, /completion date.*seven-day.*excluded/);
});

test("visiting profiles explain only the cards allowed for the viewer and keep personal details private", () => {
  for (const role of ["Admin", "Student Leader", "Organization Member"] as const) {
    const allowed = role !== "Organization Member";
    const html = renderToStaticMarkup(createElement(ProfileOverview, { user, tasks, loading: false, tasksLoading: false, profileError: "", tasksError: "", title: "Member profile", showPerformance: allowed, showPersonalDetails: false, committee: "Events" }));
    const steps = getTourSteps(role, "page-member-profile");
    assert.equal(steps.length, allowed ? 7 : 4);
    for (const step of steps) assert.ok(html.includes(`data-tour="${step.target}"`), `${role}: ${step.target}`);
    assert.equal(html.includes('data-tour="profile-rating"'), allowed);
    assert.equal(html.includes('data-tour="profile-completion"'), allowed);
    assert.equal(html.includes("Leader rating:"), allowed);
    assert.doesNotMatch(html, /student@example\.test|January 1, 2000|Edit Profile/);
  }
});

test("quick member profiles explain their visible information without exposing private scores", (t) => {
  const snapshot = useAuthStore.getInitialState();
  const previous = snapshot.profile;
  t.after(() => { snapshot.profile = previous; });
  for (const role of ["Organization Member", "Student Leader"] as const) {
    snapshot.profile = { uid: "viewer", fullName: "Viewer", role } as AuthUserProfile;
    const html = renderToStaticMarkup(createElement(MemberProfileModal, { member: { id: "other", initials: "ES", name: user.fullName, role: "Member", committee: "Events", skills: ["Design"], workload: 40, reliability: "100%", availability: "Available", assignedTasks: tasks }, onClose: () => {} }));
    assert.match(html, /How to read this profile/);
    assert.match(html, /View full profile/);
    assert.equal(html.includes("Leader performance rating:"), role === "Student Leader");
    assert.equal(html.includes("Private performance information is not shown"), role === "Organization Member");
  }
});
