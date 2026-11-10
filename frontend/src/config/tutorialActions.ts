// Only navigation and opening/closing UI belong here. Saving and business actions
// must never be called by a walkthrough.
export const TUTORIAL_ACTIONS: Record<string, { expected?: string; close?: string }> = {
  "navigation-open": { expected: "nav-dashboard", close: "navigation-close" }, "navigation-close": {},
  "overview-tab": {},
  "event-custom-status": { expected: "custom-status-dialog", close: "custom-status-close" },
  "task-custom-status": { expected: "custom-status-dialog", close: "custom-status-close" },
  "custom-status-close": {},
  "task-filter-panel": { expected: "task-filter-done", close: "task-filter-done" }, "task-filter-done": {},
  "create-event": { expected: "event-title", close: "event-cancel" },
  "event-cancel": {}, "events-tab": {}, "event-filter-panel": { expected: "event-filter-done", close: "event-filter-done" }, "event-filter-done": {},
  "event-card": { expected: "add-task" }, "task-card": { expected: "task-close", close: "task-close" },
  "add-task": { expected: "new-task-title", close: "new-task-cancel" }, "new-task-cancel": {}, "task-close": {},
  "ai-tab": {}, "ai-edit-task": { expected: "ai-review-assignee", close: "ai-review-cancel" }, "ai-review-cancel": {},
  "committees-tab": {}, "committee-create": { expected: "committee-name", close: "committee-cancel" }, "committee-cancel": {},
  "members-tab": {}, "announcements-tab": {}, "announcement-create": { expected: "announcement-title", close: "announcement-cancel" }, "announcement-cancel": {},
  "request-reject": { expected: "request-reason", close: "request-cancel" }, "request-cancel": {},
  "admin-org-add": { expected: "admin-org-name", close: "admin-org-cancel" }, "admin-org-cancel": {},
  "admin-member-edit": { expected: "admin-member-edit-role", close: "admin-member-edit-cancel" }, "admin-member-edit-cancel": {},
  "notifications-all": {}
};
