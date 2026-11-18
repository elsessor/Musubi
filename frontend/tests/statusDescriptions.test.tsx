import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getEventStatusDescription, getTaskStatusDescription } from "../src/components/events/statusUtils";
import { EventCard } from "../src/components/events/EventCard";
import { AddCustomStatusModal } from "../src/components/events/AddCustomStatusModal";
import { TaskGridView } from "../src/components/events/TaskGridView";
import { TaskTableView } from "../src/components/events/TaskTableView";
import { TaskExpandedView } from "../src/components/events/TaskExpandedView";
import { KanbanColumn } from "../src/components/events/KanbanColumn";
import { TaskCalendarView } from "../src/components/events/TaskCalendarView";
import type { CustomStatusConfig } from "../src/components/events/statusUtils";
import type { Event, Task } from "../src/components/events/types";

const status = "Waiting for Approval";
const eventDescription = "The event proposal is waiting for approval from the organization leader. Confirm the venue, budget, and schedule before changing this status.";
const taskDescription = "The submitted output is awaiting review. Keep supporting documents attached until the reviewer provides a decision.";
const eventStatuses: CustomStatusConfig[] = [{ name: status, color: "purple", description: eventDescription }];
const taskStatuses: CustomStatusConfig[] = [{ name: status, color: "amber", description: taskDescription }];
const task = { id: "task", title: "Prepare the event proposal", status, priority: "Medium", description: "Draft the proposal", dueDate: new Date().toISOString() } as Task;
const event = { id: "event", title: "Campus festival", status, startDate: new Date().toISOString(), endDate: new Date().toISOString(), progress: 0, tasks: [task], eventCustomStatuses: eventStatuses } as Event;
const noop = () => {};

test("event and task status descriptions resolve the correct saved definition", () => {
  assert.equal(getEventStatusDescription(" waiting FOR approval ", eventStatuses).description, eventDescription);
  assert.equal(getTaskStatusDescription(status, taskStatuses).description, taskDescription);
  assert.notEqual(getEventStatusDescription(status, eventStatuses).description, getTaskStatusDescription(status, taskStatuses).description);
  assert.match(getEventStatusDescription("Active", eventStatuses).description, /officially launched/);
  assert.match(getEventStatusDescription("Unknown").description, /Unknown/);
});

test("event cards keep a single open-event action without status info controls", () => {
  const html = renderToStaticMarkup(createElement(EventCard, { event, onClick: noop }));
  assert.match(html, /^<button\b/);
  assert.ok(html.includes("Campus festival"));
  assert.ok(html.includes(status));
  assert.doesNotMatch(html, /About event status|data-status-description|lucide-info/);
  assert.ok(!html.includes(eventDescription));
  for (const button of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)) assert.doesNotMatch(button[1], /<button\b/);
});

test("Manage Statuses renders full saved event and task descriptions", () => {
  for (const [type, customStatuses, description] of [["event", eventStatuses, eventDescription], ["task", taskStatuses, taskDescription]] as const) {
    const html = renderToStaticMarkup(createElement(AddCustomStatusModal, { isOpen: true, type, customStatuses: [...customStatuses], statusOrder: [status], defaultStatuses: [], onClose: noop, onAddStatus: noop, onReorderStatusOrder: noop }));
    assert.ok(html.includes(description));
    assert.doesNotMatch(html, /line-clamp-1/);
  }
});

test("task views keep status labels without redundant info controls or definitions", () => {
  const props = { tasks: [task], readOnly: true, customStatuses: taskStatuses, onUpdateStatus: noop };
  const views = [createElement(TaskGridView, props), createElement(TaskTableView, props), createElement(TaskExpandedView, props), createElement(KanbanColumn, { ...props, status }), createElement(TaskCalendarView, props)];
  for (const view of views) {
    const html = renderToStaticMarkup(view);
    assert.doesNotMatch(html, /About task status|data-status-description|lucide-info/);
    assert.ok(!html.includes(taskDescription));
  }
});

test("members can read all default and custom definitions in the same modal without edit controls", () => {
  for (const [type, customStatuses, description, defaultStatus] of [["event", eventStatuses, eventDescription, "Active"], ["task", taskStatuses, taskDescription, "To Do"]] as const) {
    // Include only the custom status in the order to verify missing defaults remain readable.
    const html = renderToStaticMarkup(createElement(AddCustomStatusModal, { isOpen: true, readOnly: true, type, customStatuses: [...customStatuses], statusOrder: [status], defaultStatuses: [defaultStatus], onClose: noop, onAddStatus: noop, onReorderStatusOrder: noop, onDeleteStatus: noop }));
    assert.ok(html.includes(description));
    const definition = type === "event" ? getEventStatusDescription(defaultStatus) : getTaskStatusDescription(defaultStatus);
    assert.ok(html.includes(definition.description));
    assert.match(html, /Status descriptions/);
    assert.match(html, /role="dialog"/);
    assert.doesNotMatch(html, /<form|ADD NEW STATUS|Delete status|Drag to rearrange|draggable="true"/);
    assert.doesNotMatch(html, /line-clamp-/);
  }
});
