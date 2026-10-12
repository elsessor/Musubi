import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import * as dependencies from "../../frontend/src/utils/taskDependencies.js";
import * as assignment from "../../frontend/src/utils/taskAssignment.js";
import * as dates from "../../frontend/src/utils/dateRange.js";
import * as timing from "../../frontend/src/utils/taskTiming.js";
import * as eventMembers from "../../frontend/src/utils/eventMembers.js";
import * as claims from "../../frontend/src/utils/taskClaims.js";
import * as calendarViews from "../../frontend/src/utils/calendarViews.js";
import * as calendarSchedule from "../../frontend/src/utils/calendarSchedule.js";

type Node = { type: any; props: Record<string, any> };
function children(node: any): Node[] {
  if (Array.isArray(node)) return node.flatMap(children);
  if (!node || typeof node !== "object") return [];
  return [node, ...children(node.props?.children)];
}

// Exercise real render functions and their callbacks without a browser or Firebase.
function ui(file: string, role = "Student Leader", extraMocks: Record<string, any> = {}) {
  const state: any[] = [];
  let cursor = 0;
  const react = { useState: (initial: any) => {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
    return [state[index], (next: any) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
  }, createContext: (value: any) => ({ value, Provider: "ContextProvider" }), useContext: (context: any) => context.value,
  useId: () => "dependency-test", useEffect: () => {}, useMemo: (value: () => any) => value(), useRef: () => ({ current: null }) };
  const auth = { firebaseUser: { uid: "member" }, profile: { uid: "member", fullName: "Member", role, organizationId: "org" } };
  const toast = { showToast: () => {} };
  const useAuthStore = Object.assign((selector: (value: any) => any) => selector(auth), { getState: () => auth });
  const useToastStore = Object.assign((selector: (value: any) => any) => selector(toast), { getState: () => toast });
  const components = new Proxy({}, { get: (_target, name) => String(name) });
  const mocks: Record<string, any> = {
    react, "react/jsx-runtime": { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }), Fragment: "Fragment" },
    "react-dom": { createPortal: (node: any) => node }, "lucide-react": components,
    "@/utils/taskDependencies": dependencies, "@/utils/taskAssignment": assignment, "@/utils/dateRange": dates,
    "@/utils/eventMembers": eventMembers, "@/utils/taskTiming": timing,
    "@/utils/taskClaims": claims,
    "@/store/authStore": { useAuthStore }, "@/store/toastStore": { useToastStore },
    "./priorityUtils": { ALL_PRIORITIES: ["Low", "Medium", "High", "Critical"], PRIORITY_CONFIG: new Proxy({}, { get: (_target, name) => ({ label: name, classes: "", dot: "" }) }) },
    "./statusUtils": { getStatusTheme: () => ({ badge: "", dot: "", border: "" }), getOrderedTaskStatuses: () => ["To Do", "In Progress", "In Review", "Completed"] }
  };
  const filename = resolve(__dirname, "../../frontend/src/components/events", file);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: Record<string, (props: any) => Node> = {};
  new Function("exports", "require", code)(exports, (name: string) => extraMocks[name] || mocks[name] || components);
  return { render: (name: string, props: any) => { cursor = 0; return exports[name](props); } };
}

const allTasks = () => dependencies.withTaskDependencyState([
  { id: "a", title: "Approve budget", status: "To Do", assignee: { initials: "M", color: "bg-blue-600" }, priority: "Medium", dueDate: "", assignedMemberUID: "member" },
  { id: "b", title: "Purchase materials", status: "To Do", assignee: { initials: "M", color: "bg-blue-600" }, priority: "Medium", dueDate: "", assignedMemberUID: "member", dependsOnTaskIds: ["a"] }
]);
const find = (tree: Node, predicate: (node: Node) => boolean) => children(tree).find(predicate)!;

test("task views include deadline indicators and task details offer archive with confirmation", async () => {
  const task = { ...allTasks()[0], dueDate: "2020-01-01" };
  for (const [file, name] of [["TaskCard.tsx", "TaskCard"], ["TaskGridView.tsx", "TaskGridView"], ["TaskTableView.tsx", "TaskTableView"], ["TaskExpandedView.tsx", "TaskExpandedView"]]) {
    const tree = ui(file).render(name, { task, tasks: [task], onUpdateStatus: () => {} });
    assert.equal(find(tree, node => node.type === "OverdueBadge").props.task.id, task.id);
  }
  let archived = "", closed = 0;
  const props = { task, tasks: [task], eventId: "event", isLeader: true, canEdit: true, onAttachmentsUpdated: () => {}, onClose: () => { closed++; },
    onUpdateTask: () => { throw new Error("Archive must not change task status."); }, onArchiveTask: (id: string) => { archived = id; } };
  const render = ui("TaskDetailModal.tsx");
  let tree = render.render("TaskDetailModal", props);
  assert.equal(children(tree).some(node => node.props.children === "Cancel task"), false);
  const archiveButton = find(tree, node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Archive task"));
  archiveButton.props.onClick();
  assert.equal(archived, "");
  tree = render.render("TaskDetailModal", props);
  let confirm = find(tree, node => node.type === "ConfirmArchiveModal");
  confirm.props.onCancel();
  assert.equal(archived, "");
  archiveButton.props.onClick();
  tree = render.render("TaskDetailModal", props);
  confirm = find(tree, node => node.type === "ConfirmArchiveModal");
  await confirm.props.onConfirm();
  assert.equal(archived, task.id); assert.equal(task.status, "To Do"); assert.equal(closed, 1);
  const memberTree = ui("TaskDetailModal.tsx", "Organization Member").render("TaskDetailModal", { ...props, isLeader: false });
  assert.equal(children(memberTree).some(node => node.props.children === "Cancel task"), false);
});

test("overdue badge names blockers and review and completed-late indicators do not replace status", () => {
  const render = ui("overdue.tsx");
  const task = { ...allTasks()[1], dueDate: "2020-01-01" };
  let badge = render.render("OverdueBadge", { task });
  assert.match(badge.props["aria-label"], /Overdue.*Blocked/);
  assert.match(badge.props.title, /Approve budget/);
  badge = render.render("OverdueBadge", { task: { ...task, status: "In Review" } });
  assert.match(badge.props["aria-label"], /Awaiting review/);
  badge = render.render("OverdueBadge", { task: { ...task, status: "Completed", completedAt: "2020-01-02T00:00:00Z" } });
  assert.match(badge.props["aria-label"], /Completed late/);
  assert.equal(render.render("OverdueBadge", { task: { ...task, status: "Cancelled" } }), null);
});

test("member assignee dropdown offers only self, requests confirmation and blocks forged selections", () => {
  let requested = "";
  const context = { event: { orgId: "org", status: "Planning" }, assigning: false,
    onRequestAssignment: (id: string) => { requested = id; } };
  const mocks = { react: { createContext: () => ({}), useContext: () => context } };
  const member = ui("TaskSelfAssignmentSelect.tsx", "Organization Member", mocks);
  const task = { ...allTasks()[0], assignedMemberUID: null, assignedMemberName: null, assignee: { name: "" } };
  let select = member.render("TaskSelfAssignmentSelect", { task });
  assert.equal(select.type, "CustomSelect");
  assert.deepEqual(select.props.options.map((option: any) => option.value), ["", "member"]);
  assert.equal(select.props.options[1].label, "Member");
  select.props.onChange("");
  select.props.onChange("other");
  assert.equal(requested, "");
  select.props.onChange("member");
  assert.equal(requested, task.id);
  assert.equal(member.render("TaskSelfAssignmentSelect", { task }).props.value, ""); // Wait for confirmation and the server.
  context.assigning = true;
  requested = "";
  select = member.render("TaskSelfAssignmentSelect", { task });
  assert.equal(select.props.disabled, true);
  select.props.onChange("member");
  assert.equal(requested, "");
  context.assigning = false;
  for (const blocked of [
    { task, readOnly: true }, { task: { ...task, isLeaderOnly: true } },
    { task: { ...task, priority: "Critical" } }, { task: { ...task, assignedMemberUID: "other" } },
    { task: { ...task, status: "Completed" } }, { task: { ...task, archivedAt: "archived" } }
  ]) assert.equal(member.render("TaskSelfAssignmentSelect", blocked).type, "TaskAssignee");
  for (const role of ["Admin", "Student Leader"]) assert.equal(ui("TaskSelfAssignmentSelect.tsx", role, mocks).render("TaskSelfAssignmentSelect", { task }).type, "TaskAssignee");
  context.event.orgId = "other";
  assert.equal(member.render("TaskSelfAssignmentSelect", { task }).type, "TaskAssignee");
});

test("task cards show assignments and task details expose the member self-assignment dropdown", () => {
  const task = { ...allTasks()[0], assignedMemberUID: null };
  for (const [file, name] of [
    ["TaskCard.tsx", "TaskCard"], ["TaskGridView.tsx", "TaskGridView"],
    ["TaskTableView.tsx", "TaskTableView"], ["TaskExpandedView.tsx", "TaskExpandedView"]
  ]) {
    const tree = ui(file, "Organization Member").render(name, { task, tasks: [task], eventId: "event", canEdit: false, isLeader: false,
      onUpdateTask: () => {}, onAttachmentsUpdated: () => {}, onUpdateStatus: () => {}, onClose: () => {} });
    assert.equal(find(tree, n => n.type === "TaskAssignee").props.task.id, task.id);
    assert.equal(children(tree).some(n => n.type === "TaskClaimButton"), false);
  }
  const detail = ui("TaskDetailModal.tsx", "Organization Member").render("TaskDetailModal", { task, tasks: [task], eventId: "event", canEdit: false, isLeader: false,
    onUpdateTask: () => {}, onAttachmentsUpdated: () => {}, onClose: () => {} });
  assert.equal(find(detail, n => n.type === "TaskSelfAssignmentSelect").props.task.id, task.id);
  assert.equal(children(detail).some(n => n.type === "TaskClaimButton"), false);
  const tree = ui("TaskCalendarView.tsx", "Organization Member").render("TaskCalendarView", { tasks: [task], onUpdateStatus: () => {} });
  const calendar = find(tree, n => n.type === "CalendarView");
  assert.equal(calendar.props.renderActions, undefined);
});

test("leaders can choose themselves or other members in task details and save the chosen identity", async () => {
  const task = { ...allTasks()[0], assignedMemberUID: null, assignedMemberName: null };
  const roster = [{ id: "member", name: "Leader", position: "President", initials: "L", color: "bg-blue-600" },
    { id: "other", name: "Other Member", position: "Member", initials: "OM", color: "bg-blue-600" }];
  for (const selected of roster) {
    let saved: any;
    const render = ui("TaskDetailModal.tsx", "Student Leader");
    const props = { task, tasks: [task], eventId: "event", roster, isLeader: true, canEdit: true,
      onUpdateTask: (next: any) => { saved = next; }, onAttachmentsUpdated: () => {}, onClose: () => {} };
    let tree = render.render("TaskDetailModal", props);
    const select = find(tree, node => node.type === "CustomSelect" && node.props.options.some((option: any) => option.value === "other"));
    assert.equal(select.props.disabled, false);
    select.props.onChange(selected.id);
    tree = render.render("TaskDetailModal", props);
    await find(tree, node => node.type === "form").props.onSubmit({ preventDefault: () => {} });
    assert.equal(saved.assignedMemberUID, selected.id);
    assert.equal(saved.assignedMemberName, selected.name);
  }
});

test("self-assignment requires confirmation, cancellation never writes, and duplicate confirms produce one request", async () => {
  const unassigned = { ...allTasks()[0], assignedMemberUID: null, assignedMemberName: null };
  let writes = 0, release: (task: any) => void = () => {};
  const render = ui("KanbanBoard.tsx", "Organization Member", {
    "./TaskSelfAssignmentSelect": { TaskSelfAssignmentContext: { Provider: "AssignmentProvider" } },
    "@/services/events.service": { claimTaskInEvent: async () => {
      writes++;
      return new Promise(resolve => { release = resolve; });
    } }
  });
  const updates: any[] = [];
  const props = { event: { id: "event", orgId: "org", title: "Event", status: "Planning", tasks: [unassigned], progress: 0 },
    isLeader: false, onBack: () => {}, onUpdateEvent: (event: any) => updates.push(event) };
  let tree = render.render("KanbanBoard", props);
  const context = find(tree, n => n.type === "AssignmentProvider").props.value;
  context.onRequestAssignment(unassigned.id);
  assert.equal(writes, 0);
  tree = render.render("KanbanBoard", props);
  let modal = find(tree, n => n.type === "ConfirmTaskAssignmentModal");
  assert.equal(modal.props.task.title, unassigned.title);
  modal.props.onCancel();
  tree = render.render("KanbanBoard", props);
  assert.equal(children(tree).some(n => n.type === "ConfirmTaskAssignmentModal"), false);
  assert.equal(writes, 0);
  find(tree, n => n.type === "AssignmentProvider").props.value.onRequestAssignment(unassigned.id);
  tree = render.render("KanbanBoard", props);
  modal = find(tree, n => n.type === "ConfirmTaskAssignmentModal");
  const pending = modal.props.onConfirm();
  await modal.props.onConfirm();
  modal.props.onCancel(); // Cancellation is blocked while the request is in flight.
  assert.equal(writes, 1);
  tree = render.render("KanbanBoard", props);
  assert.equal(find(tree, n => n.type === "AssignmentProvider").props.value.assigning, true);
  assert.equal(find(tree, n => n.type === "ConfirmTaskAssignmentModal").props.pending, true);
  release({ ...unassigned, assignedMemberUID: "member", assignedMemberName: "Member" });
  await pending;
  tree = render.render("KanbanBoard", props);
  assert.equal(find(tree, n => n.type === "TaskGridView").props.tasks[0].assignedMemberUID, "member");
  assert.equal(find(tree, n => n.type === "AssignmentProvider").props.value.assigning, false);
  assert.equal(children(tree).some(n => n.type === "ConfirmTaskAssignmentModal"), false);
  assert.equal(updates.at(-1).memberCount, 1);
  assert.equal(updates.at(-1).tasks[0].status, "To Do");
});

test("calendar actions are siblings of the detail button, never nested buttons", () => {
  const task = allTasks()[0];
  let selected = "";
  const render = ui("CalendarView.tsx", "Organization Member", {
    "@/utils/calendarViews": calendarViews, "@/utils/calendarSchedule": calendarSchedule
  });
  const tree = render.render("CalendarView", { items: [task], itemLabel: "tasks", getId: (item: any) => item.id,
    getTitle: (item: any) => item.title, getStatus: (item: any) => item.status, isScheduled: () => true,
    onSelect: (item: any) => { selected = item.id; },
    renderActions: () => ({ type: "button", props: { "aria-label": "Example action" } }) });
  const action = find(tree, node => node.props["aria-label"] === "Example action");
  assert.ok(action);
  for (const button of children(tree).filter(node => node.type === "button")) {
    assert.equal(children(button.props.children).some(node => node.type === "button"), false);
  }
  find(tree, node => node.type === "button" && children(node.props.children).some(child => child.props.children === task.title)).props.onClick();
  assert.equal(selected, task.id);
});

test("a rejected self-assignment refreshes a competing assignment and keeps the confirmation open with an error", async () => {
  const task = { ...allTasks()[0], assignedMemberUID: null, assignedMemberName: null };
  const event = { id: "event", orgId: "org", title: "Event", status: "Active", tasks: [task], progress: 0 };
  const refreshed = { ...event, tasks: [{ ...task, assignedMemberUID: "other", assignedMemberName: "Other Member" }] };
  const updates: any[] = [];
  let reads = 0;
  const render = ui("KanbanBoard.tsx", "Organization Member", {
    "./TaskSelfAssignmentSelect": { TaskSelfAssignmentContext: { Provider: "AssignmentProvider" } },
    "@/services/events.service": {
      claimTaskInEvent: async () => { throw new Error("This task has already been assigned."); },
      invalidateEventsCache: () => {}, fetchEvents: async () => { reads++; return [refreshed]; }
    }
  });
  const props = { event, isLeader: false, onBack: () => {}, onUpdateEvent: (next: any) => updates.push(next) };
  let tree = render.render("KanbanBoard", props);
  find(tree, node => node.type === "AssignmentProvider").props.value.onRequestAssignment(task.id);
  tree = render.render("KanbanBoard", props);
  await find(tree, node => node.type === "ConfirmTaskAssignmentModal").props.onConfirm();
  tree = render.render("KanbanBoard", props);
  assert.equal(reads, 1);
  const modal = find(tree, node => node.type === "ConfirmTaskAssignmentModal");
  assert.match(modal.props.error, /already been assigned/);
  assert.equal(modal.props.disabled, true);
  assert.equal(modal.props.pending, false);
  assert.equal(find(tree, node => node.type === "AssignmentProvider").props.value.assigning, false);
  assert.equal(find(tree, node => node.type === "TaskGridView").props.tasks[0].assignedMemberUID, "other");
  assert.equal(updates.at(-1).tasks[0].assignedMemberUID, "other");
});

test("assignment confirmation exposes Cancel and Confirm, blocks dismissal and repeat submission while pending", async () => {
  let confirms = 0, cancels = 0, escaped = false;
  const render = ui("ConfirmTaskAssignmentModal.tsx", "Organization Member");
  const props = { task: allTasks()[0], pending: false, error: "Temporary connection failure.",
    onCancel: () => { cancels++; }, onConfirm: async () => { confirms++; } };
  let tree = render.render("ConfirmTaskAssignmentModal", props);
  assert.equal(find(tree, node => node.props.role === "alert").props.children, props.error);
  const button = find(tree, node => node.type === "button" && node.props.onClick);
  button.props.onClick();
  assert.equal(confirms, 1);
  tree.props.onOpenChange(false);
  assert.equal(cancels, 1);
  tree = render.render("ConfirmTaskAssignmentModal", { ...props, pending: true });
  for (const button of children(tree).filter(node => node.type === "button")) assert.equal(button.props.disabled, true);
  find(tree, node => node.type === "button" && node.props.onClick).props.onClick();
  tree.props.onOpenChange(false);
  find(tree, node => node.type === "Content").props.onEscapeKeyDown({ preventDefault: () => { escaped = true; } });
  assert.equal(confirms, 1);
  assert.equal(cancels, 1);
  assert.equal(escaped, true);
  tree = render.render("ConfirmTaskAssignmentModal", { ...props, disabled: true });
  find(tree, node => node.type === "button" && node.props.onClick).props.onClick();
  assert.equal(confirms, 1);
});

test("card dependency indicators retain prerequisite names after completion and expose blockers", () => {
  const tasks = allTasks();
  const render = ui("TaskDependencies.tsx", "Student Leader", {
    react: { createContext: () => ({ value: tasks }), useContext: (context: any) => context.value }
  });
  assert.equal(render.render("TaskDependencyBadge", { task: tasks[0] }), null);
  let badge = render.render("TaskDependencyBadge", { task: tasks[1] });
  assert.match(badge.props["aria-label"], /Depends on: Approve budget/);
  assert.match(badge.props["aria-label"], /Waiting for: Approve budget/);
  assert.match(badge.props.className, /amber/);
  tasks[0].status = "Completed";
  const ready = dependencies.withTaskDependencyState(tasks)[1];
  badge = render.render("TaskDependencyBadge", { task: ready });
  assert.match(badge.props["aria-label"], /Depends on: Approve budget/);
  assert.match(badge.props["aria-label"], /All prerequisites completed/);
  assert.match(badge.props.className, /emerald/);
  const compact = render.render("TaskDependencyBadge", { task: ready, compact: true });
  assert.equal(find(compact, (node) => node.type === "span" && node.props.children === 1).props.children, 1);
  assert.equal(compact.props["aria-label"], badge.props["aria-label"]);
});

test("task cards in every view retain dependency indicators when prerequisites are complete", () => {
  const tasks = allTasks();
  tasks[0].status = "Completed";
  const ready = dependencies.withTaskDependencyState(tasks)[1];
  for (const [file, component] of [
    ["TaskCard.tsx", "TaskCard"], ["TaskGridView.tsx", "TaskGridView"],
    ["TaskTableView.tsx", "TaskTableView"], ["TaskExpandedView.tsx", "TaskExpandedView"]
  ]) {
    const render = ui(file);
    const tree = render.render(component, { task: ready, tasks: [ready], onUpdateStatus: () => {} });
    assert.equal(find(tree, (node) => node.type === "TaskDependencyBadge").props.task.id, ready.id);
  }
  const calendar = ui("TaskCalendarView.tsx");
  const tree = calendar.render("TaskCalendarView", { tasks: [ready], onUpdateStatus: () => {} });
  const view = find(tree, (node) => node.type === "CalendarView");
  assert.equal(find(view.props.renderDetails(ready), (node) => node.type === "TaskDependencyBadge").props.task.id, ready.id);
  const compact = view.props.renderCompactIndicator(ready);
  assert.equal(find(compact, node => node.type === "TaskDependencyBadge").props.compact, true);
  assert.equal(find(compact, node => node.type === "OverdueBadge").props.compact, true);
});

test("new tasks keep unset dates empty and create reminder dates only for an explicit deadline", async () => {
  const start = "Oct 8, 2070 at 09:00 AM", due = "Oct 9, 2070 at 10:00 AM";
  for (const [startDate, dueDate, clear] of [["", "", false], [start, "", false], ["", due, false], [start, due, true]] as const) {
    let saved: any;
    const render = ui("AddTaskModal.tsx");
    const props = { eventName: "Campus event", onAddTask: (task: any) => { saved = task; }, onClose: () => {} };
    let tree = render.render("AddTaskModal", props);
    find(tree, node => node.type === "input" && node.props.type === "text").props.onChange({ target: { value: "Arrange chairs" } });
    const pickers = children(tree).filter(node => node.type === "MiniCalendarPicker");
    pickers[0].props.onChange(startDate);
    pickers[1].props.onChange(dueDate);
    if (clear) { pickers[0].props.onChange(""); pickers[1].props.onChange(""); }
    tree = render.render("AddTaskModal", props);
    await find(tree, node => node.type === "form").props.onSubmit({ preventDefault: () => {} });
    assert.ok(saved);
    assert.equal(saved.startDate, clear ? "" : startDate);
    assert.equal(saved.dueDate, clear ? "" : dueDate);
    if (!dueDate || clear) assert.deepEqual(saved.nudges, []);
    else {
      assert.equal(saved.nudges.length, 2);
      assert.ok(saved.nudges.every((nudge: any) => /^\d{4}-\d{2}-\d{2}$/.test(nudge.triggerDate)));
    }
  }
});

test("task forms report equal or reversed times, block saves, and recover after correcting the deadline", async () => {
  for (const [file, component] of [
    ["AddTaskModal.tsx", "AddTaskModal"],
    ["TaskDetailModal.tsx", "TaskDetailModal"],
    ["AtomizedTaskEditModal.tsx", "AtomizedTaskEditModal"]
  ]) {
    const render = ui(file, "Student Leader", {
      "@/utils/heuristicDelegation": { findBestMemberForSubtask: () => null },
      "@/utils/subtaskAssignment": { uniqueOrganizationMembers: (members: any[]) => members, resolveSubtaskAssignee: () => null }
    });
    let saved = 0, closed = 0;
    const save = () => { saved++; };
    const task = { ...allTasks()[0], description: "Review the budget", startDate: "Oct 8, 2070 at 09:00 AM", dueDate: "Oct 8, 2070 at 10:00 AM", requiredSkills: [], estimatedDays: 1 };
    const props = { eventId: "event", eventName: "Campus event", task, tasks: [task], subtask: task, subtasks: [task], members: [],
      isLeader: true, canEdit: true, onAddTask: save, onUpdateTask: save, onSave: save, onClose: () => { closed++; }, onAttachmentsUpdated: () => {} };
    let tree = render.render(component, props);
    if (component === "AddTaskModal") {
      find(tree, (node) => node.type === "input" && node.props.type === "text").props.onChange({ target: { value: "Test task" } });
    }
    const start = "Oct 8, 2070 at 09:00 AM";
    const pickers = children(tree).filter((node) => node.type === "MiniCalendarPicker");
    pickers[0].props.onChange(start);
    for (const due of [start, "Oct 8, 2070 at 08:59 AM"]) {
      pickers[1].props.onChange(due);
      tree = render.render(component, props);
      assert.match(find(tree, (node) => node.props.role === "alert").props.children, /deadline must be later than/);
      assert.equal(find(tree, (node) => node.props.type === "submit").props.disabled, true);
      await find(tree, (node) => node.type === "form").props.onSubmit({ preventDefault: () => {} });
      assert.equal(saved, 0);
      assert.equal(closed, 0);
    }
    pickers[1].props.onChange("Oct 8, 2070 at 09:01 AM");
    tree = render.render(component, props);
    assert.equal(children(tree).some(node => String(node.props.id || "").endsWith("deadline-reason")), false);
    assert.equal(children(tree).some((node) => node.props.role === "alert"), false);
    assert.equal(find(tree, (node) => node.props.type === "submit").props.disabled, false);
    await find(tree, (node) => node.type === "form").props.onSubmit({ preventDefault: () => {} });
    assert.equal(saved, 1);
  }
});

test("prerequisite selection excludes self, disables circular links, and emits task IDs", () => {
  const render = ui("TaskDependencies.tsx");
  const tasks = [{ id: "a", title: "Budget", status: "To Do" }, { id: "b", title: "Materials", dependsOnTaskIds: ["a"] }, { id: "c", title: "Venue" }];
  let selected: string[] = [];
  const tree = render.render("TaskDependencySelector", { taskId: "a", tasks, value: [], onChange: (ids: string[]) => { selected = ids; } });
  const controls = children(tree).filter((node) => node.type === "input" && node.props.type === "checkbox");
  assert.equal(controls.length, 2);
  assert.equal(controls[0].props.disabled, true);
  assert.equal(controls[1].props.disabled, false);
  controls[1].props.onChange({ target: { checked: true } });
  assert.deepEqual(selected, ["c"]);
});

test("atomizer publishing preserves prerequisite IDs and waits for successful persistence", async () => {
  const goal = { id: "draft", eventName: "Campus event", description: "Organize the event", status: "Draft", subtasks: allTasks().map((task) => ({ ...task, requiredSkills: [], estimatedDays: 3 })) };
  const draft = { selectedEventId: "event", isCreateFromDescription: false, newEventTitle: "", defaultStatus: "To Do", goalDescription: "Organize the event", isAtomizing: false, errorMsg: "", activeGoalDraft: goal, customStatuses: [], statusOrder: [] };
  let release!: () => void;
  const persisted = new Promise<void>((resolve) => { release = resolve; });
  let published: any[] = [];
  const render = ui("AtomizerForm.tsx", "Student Leader", {
    "@/store/atomizerDraftStore": { DEFAULT_ATOMIZER_STATUSES: ["To Do"], EMPTY_ATOMIZER_DRAFT: draft, useAtomizerDraftStore: (selector: (value: any) => any) => selector({
      drafts: new Proxy({}, { get: () => draft }), updateDraft: (_scope: string, change: any) => Object.assign(draft, typeof change === "function" ? change(draft) : change)
    }) },
    "@/utils/subtaskAssignment": { resolveSubtaskAssignee: () => undefined }
  });
  const tree = render.render("AtomizerForm", { events: [{ id: "event", tasks: [] }], onPublishGoalTasks: async (_id: string, tasks: any[]) => { published = tasks; await persisted; } });
  const review = find(tree, (node) => node.type === "SubtaskReviewScreen");
  const save = review.props.onPublishGoal({ ...goal, status: "Active" });
  assert.deepEqual(published[1].dependsOnTaskIds, ["a"]);
  assert.equal(draft.activeGoalDraft.status, "Draft");
  release();
  await save;
  assert.equal(draft.activeGoalDraft.status, "Active");
});

test("failed atomizer publishing leaves the draft editable", async () => {
  const goal = { id: "draft", eventName: "Campus event", status: "Draft", subtasks: allTasks().map((task) => ({ ...task, requiredSkills: [], estimatedDays: 3, isAiGenerated: true })) };
  let updates = 0;
  const render = ui("SubtaskReviewScreen.tsx", "Student Leader", {
    "./starterTemplates": { validateSubtaskSafeguards: () => [] },
    "@/utils/subtaskAssignment": { resolveSubtaskAssignee: () => undefined }
  });
  const props = { goalDraft: goal, members: [], onDraftChange: () => { updates++; }, onPublishGoal: async () => { throw new Error("Task prerequisite changed. Please review."); } };
  let tree = render.render("SubtaskReviewScreen", props);
  const publish = find(tree, (node) => node.type === "button" && typeof node.props.className === "string" && node.props.className.includes("col-span-2"));
  publish.props.onClick();
  tree = render.render("SubtaskReviewScreen", props);
  const confirm = find(tree, (node) => node.type?.name === "OldPublishGoalModal");
  await confirm.props.onConfirm();
  assert.equal(updates, 0);
  tree = render.render("SubtaskReviewScreen", props);
  assert.ok(find(tree, (node) => node.type?.name === "OldPublishGoalModal"));
});

test("member prerequisite details contain no editable controls", () => {
  const render = ui("TaskDependencies.tsx", "Organization Member");
  const tree = render.render("TaskDependencySelector", { taskId: "b", tasks: allTasks(), value: ["a"], readOnly: true });
  assert.equal(children(tree).filter((node) => node.type === "input").length, 0);
  assert.equal(children(tree).filter((node) => node.type === "label").length, 1);
});

test("task detail status options block starting and completing for leaders and members", () => {
  for (const role of ["Student Leader", "Organization Member"]) {
    const render = ui("TaskDetailModal.tsx", role);
    const tasks = allTasks();
    const tree = render.render("TaskDetailModal", { eventId: "event", task: tasks[1], tasks, isLeader: role === "Student Leader", canEdit: true, onUpdateTask: () => {}, onClose: () => {}, onAttachmentsUpdated: () => {} });
    const status = find(tree, (node) => node.type === "CustomSelect" && node.props.value === "To Do");
    assert.equal(status.props.options.find((option: any) => option.value === "In Progress").disabled, true);
    assert.equal(status.props.options.find((option: any) => option.value === "Completed").disabled, true);
    assert.equal(status.props.options.find((option: any) => option.value === "To Do").disabled, false);
    const selector = find(tree, (node) => node.type === "TaskDependencySelector");
    assert.equal(selector.props.readOnly, role === "Organization Member");
  }
});

test("detail submission rechecks dependencies even if a disabled status is forced", async () => {
  const render = ui("TaskDetailModal.tsx", "Organization Member");
  const tasks = allTasks();
  let saved = 0, closed = 0;
  const props = { eventId: "event", task: tasks[1], tasks, isLeader: false, canEdit: true, onUpdateTask: () => { saved++; }, onClose: () => { closed++; }, onAttachmentsUpdated: () => {} };
  let tree = render.render("TaskDetailModal", props);
  find(tree, (node) => node.type === "CustomSelect" && node.props.value === "To Do").props.onChange("Completed");
  tree = render.render("TaskDetailModal", props);
  await find(tree, (node) => node.type === "form").props.onSubmit({ preventDefault: () => {} });
  assert.equal(saved, 0);
  assert.equal(closed, 0);
  tree = render.render("TaskDetailModal", props);
  assert.ok(find(tree, (node) => node.props.role === "alert"));
});

test("a rejected server save leaves the detail modal open; successful saves close it", async () => {
  for (const successful of [false, true]) {
    const render = ui("TaskDetailModal.tsx", "Organization Member");
    const tasks = allTasks();
    let closed = 0;
    const tree = render.render("TaskDetailModal", { eventId: "event", task: tasks[1], tasks, isLeader: false, canEdit: true, onUpdateTask: async () => successful, onClose: () => { closed++; }, onAttachmentsUpdated: () => {} });
    await find(tree, (node) => node.type === "form").props.onSubmit({ preventDefault: () => {} });
    assert.equal(closed, successful ? 1 : 0);
  }
});

test("expanded view disables completion and working statuses even when only the blocked task is visible", () => {
  const render = ui("TaskExpandedView.tsx", "Organization Member");
  const tree = render.render("TaskExpandedView", { tasks: [allTasks()[1]], onUpdateStatus: () => {} });
  const select = find(tree, (node) => node.type === "CustomSelect");
  assert.equal(select.props.options.find((option: any) => option.value === "Completed").disabled, true);
  const complete = find(tree, (node) => node.type === "button" && node.props.title === "Complete prerequisites first");
  assert.equal(complete.props.disabled, true);
});

test("grid and table completion actions are disabled for blocked tasks", () => {
  for (const [file, name] of [["TaskGridView.tsx", "TaskGridView"], ["TaskTableView.tsx", "TaskTableView"]]) {
    const render = ui(file, "Organization Member");
    const tree = render.render(name, { tasks: [allTasks()[1]], onUpdateStatus: () => {} });
    const complete = find(tree, (node) => node.type === "button" && node.props.title === "Complete prerequisites first");
    assert.equal(complete.props.disabled, true);
  }
});

test("the shared board blocks status writes, then unlocks dependent cards when their prerequisite completes", async () => {
  for (const role of ["Student Leader", "Organization Member"]) {
    let writes = 0;
    const tasks = allTasks();
    const render = ui("KanbanBoard.tsx", role, { "@/services/events.service": {
      updateEventFirestore: async () => { writes++; },
      updateTaskStatus: async (_user: unknown, _eventId: string, id: string, status: string) => { writes++; return { ...tasks.find((task) => task.id === id), status }; }
    } });
    const props = { event: { id: "event", title: "Campus event", tasks, status: "Active", progress: 0, memberCount: 1 }, isLeader: role === "Student Leader", onBack: () => {} };
    let tree = render.render("KanbanBoard", props);
    let grid = find(tree, (node) => node.type === "TaskGridView");
    assert.equal(grid.props.tasks[1].blockedBy, 1);
    assert.equal(await grid.props.onUpdateStatus("b", "Completed"), false);
    assert.equal(writes, 0);
    assert.equal(await grid.props.onUpdateStatus("a", "Completed"), true);
    assert.equal(writes, 1);
    tree = render.render("KanbanBoard", props);
    grid = find(tree, (node) => node.type === "TaskGridView");
    assert.equal(grid.props.tasks[1].blockedBy, 0);
    assert.equal(await grid.props.onUpdateStatus("b", "In Progress"), true);
    assert.equal(writes, 2);
  }
});

test("archive hides a subtask from active cards, exposes it in Archived, and restores the same record", async () => {
  let saved: any;
  const render = ui("KanbanBoard.tsx", "Student Leader", { "@/services/events.service": {
    updateEventFirestore: async (_user: unknown, _event: string, payload: any) => { saved = payload; }
  } });
  const tasks = allTasks();
  const props = { event: { id: "event", title: "Event", status: "Active", tasks, progress: 0 }, isLeader: true, onBack: () => {} };
  let tree = render.render("KanbanBoard", props);
  find(tree, (node) => node.type === "TaskGridView").props.onSelectTask(tasks[1]);
  tree = render.render("KanbanBoard", props);
  assert.equal(await find(tree, (node) => node.type === "TaskDetailModal").props.onArchiveTask("b"), true);
  assert.equal(saved.tasks.length, 2);
  assert.ok(saved.tasks[1].archivedAt);
  assert.equal(saved.tasks[1].status, "To Do");
  assert.deepEqual(saved.tasks[1].dependsOnTaskIds, ["a"]);
  tree = render.render("KanbanBoard", props);
  assert.deepEqual(find(tree, (node) => node.type === "TaskGridView").props.tasks.map((task: any) => task.id), ["a"]);
  const pill = (label: string) => find(tree, (node) => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes(label));
  pill("Archived").props.onClick();
  tree = render.render("KanbanBoard", props);
  const grid = find(tree, (node) => node.type === "TaskGridView");
  assert.deepEqual(grid.props.tasks.map((task: any) => task.id), ["b"]);
  grid.props.onSelectTask(grid.props.tasks[0]);
  tree = render.render("KanbanBoard", props);
  const detail = find(tree, (node) => node.type === "TaskDetailModal");
  assert.equal(detail.props.canEdit, false);
  assert.equal(await detail.props.onArchiveTask("b"), true);
  assert.equal(saved.tasks[1].archivedAt, null);
  tree = render.render("KanbanBoard", props);
  pill("All Tasks").props.onClick();
  tree = render.render("KanbanBoard", props);
  assert.equal(find(tree, (node) => node.type === "TaskGridView").props.tasks.length, 2);
});

test("archived task panels offer Restore and hide Save and nudge actions", () => {
  const render = ui("TaskDetailModal.tsx", "Student Leader");
  const task = { ...allTasks()[0], archivedAt: "2070-10-08T10:00:00Z" };
  const tree = render.render("TaskDetailModal", { task, tasks: [task], members: [], isLeader: true, canEdit: false,
    onArchiveTask: () => {}, onClose: () => {}, onUpdateTask: () => {} });
  assert.ok(find(tree, (node) => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Restore task")));
  assert.equal(children(tree).some((node) => node.props.type === "submit"), false);
  assert.equal(children(tree).some((node) => node.props.children === "Send Nudge Email"), false);
});

test("archived events expose read-only cards and no add or review actions", () => {
  const render = ui("KanbanBoard.tsx");
  const tree = render.render("KanbanBoard", { event: { id: "event", title: "Archived event", status: "Archived", tasks: allTasks(), progress: 0 }, isLeader: true, onBack: () => {} });
  assert.equal(find(tree, (node) => node.type === "TaskGridView").props.readOnly, true);
  assert.equal(children(tree).some((node) => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Add Task")), false);
});
