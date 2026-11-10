import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrganizationPreview } from "../src/components/dashboard/OrganizationPreview";
import { EventPlaceholderCard } from "../src/components/events/EventPlaceholderCard";
import { EventWorkspacePreview } from "../src/components/events/EventWorkspacePreview";
import { EventsTasksView } from "../src/components/events/EventsTasksView";
import { AtomizerForm } from "../src/components/events/AtomizerForm";
import { useAuthStore } from "../src/store/authStore";
import { useAtomizerDraftStore } from "../src/store/atomizerDraftStore";
import type { AuthUserProfile } from "../src/types/auth";

function profile(role: AuthUserProfile["role"], organizationId: string | null = null): AuthUserProfile {
  return { uid: "preview-user", fullName: "New User", email: "new@example.test", role, organizationId, onboardingCompleted: true, position: null, profilePicture: null, skills: [] };
}

function serverProfile(t: TestContext) {
  // React's server renderer reads Zustand's initial snapshot rather than live state.
  const snapshot = useAuthStore.getInitialState();
  const previous = { ...snapshot };
  t.after(() => Object.assign(snapshot, previous));
  return (value: AuthUserProfile) => Object.assign(snapshot, { profile: value, loading: false });
}

test("unaffiliated accounts see event views and placeholders, with role-appropriate tabs", (t) => {
  const setProfile = serverProfile(t);
  for (const role of ["Organization Member", "Student Leader"] as const) {
    setProfile(profile(role));
    const html = renderToStaticMarkup(createElement(EventsTasksView));
    assert.match(html, /Events &amp; Tasks/);
    assert.match(html, /Event layout placeholder/);
    assert.match(html, /event-view/);
    assert.match(html, /event-status-filter/);
    assert.doesNotMatch(html, /Join an organization to get started/);
    assert.equal(html.includes("AI Task Atomizer"), role === "Student Leader");
  }
});

test("event placeholders describe the card layout without becoming selectable records", () => {
  const html = renderToStaticMarkup(createElement(EventPlaceholderCard));
  for (const label of ["Event name", "Event status", "Committee", "Start date", "End date", "Members", "Task progress"]) assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /<button|href=|data-tour="event-card"/);
});

test("event placeholders provide a preview action without becoming business records", () => {
  const html = renderToStaticMarkup(createElement(EventPlaceholderCard, { onPreview: () => {} }));
  assert.match(html, /Explore event workspace/);
  assert.doesNotMatch(html, /data-tour="event-card"|href=/);
});

test("event workspace previews expose guide targets without enabling organization writes", () => {
  for (const isLeader of [false, true]) {
    const html = renderToStaticMarkup(createElement(EventWorkspacePreview, { isLeader, onBack: () => {} }));
    for (const target of ["event-workspace", "event-summary", "task-view", "task-committee-filter", "task-status-filter", "task-search", "event-task-workspace"]) assert.ok(html.includes(`data-tour="${target}"`), target);
    assert.match(html, /data-event-id="workspace-preview"/);
    assert.match(html, /Task title/);
    assert.match(html, /aria-label="Task views"/);
    assert.match(html, /aria-label="Filter tasks by status"/);
    for (const label of ["All Tasks", "To Do", "In Progress", "In Review", "Completed", "Archived"]) assert.ok(html.includes(label), label);
    assert.equal((html.match(/aria-label="Task card layout placeholder"/g) ?? []).length, 4);
    assert.match(html, /Show event details/);
    assert.equal(html.includes("Add Task"), isLeader);
    assert.equal(html.includes('data-tour="task-custom-status"'), isLeader);
    if (isLeader) assert.match(html, /disabled=""/);
    assert.doesNotMatch(html, /type="submit"|data-tour="task-card"/);
  }
});

test("every Organization tab retains its layout while a join request is pending", () => {
  const expected = { overview: ["Organization Details", "Organization Settings", "Members Preview", "Events"], members: ["Member Management", "Member Name", "Committee", "Skills", "Availability"], committees: ["Committee name", "Committee head", "Members"], announcements: ["Target audience", "Announcement title", "Posted by"] };
  for (const tab of ["overview", "members", "committees", "announcements"] as const) {
    const html = renderToStaticMarkup(createElement(OrganizationPreview, { tab, isLeader: true, pendingOrganizationName: "Campus Club", onShowMembers: () => {} }));
    assert.match(html, /Campus Club/);
    for (const label of expected[tab]) assert.ok(html.includes(label), `${tab}: ${label}`);
    if (tab !== "overview") assert.match(html, /disabled=""/);
  }
});

test("member previews do not expose leader creation controls", () => {
  for (const tab of ["committees", "announcements"] as const) {
    const html = renderToStaticMarkup(createElement(OrganizationPreview, { tab, isLeader: false, onShowMembers: () => {} }));
    assert.doesNotMatch(html, /New Committee|Post Announcement/);
    assert.match(html, /layout placeholder/);
  }
});

test("filling the AI form cannot enable generation without an organization", (t) => {
  const setProfile = serverProfile(t);
  const snapshot = useAtomizerDraftStore.getInitialState();
  const previous = snapshot.drafts;
  t.after(() => { snapshot.drafts = previous; });
  for (const organizationId of [null, "joined-org"]) {
    setProfile(profile("Student Leader", organizationId));
    const scope = JSON.stringify(["preview-user", organizationId ?? undefined]);
    useAtomizerDraftStore.getState().updateDraft(scope, { goalDescription: "Plan a campus event", eventDate: "2026-12-01", participatingMembers: "4" });
    snapshot.drafts = useAtomizerDraftStore.getState().drafts;
    const html = renderToStaticMarkup(createElement(AtomizerForm, { events: [], members: [] }));
    const generate = html.match(/<button[^>]*data-tour="ai-generate"[^>]*>/)?.[0];
    assert.ok(generate);
    assert.equal(generate.includes('disabled=""'), organizationId === null);
  }
});
