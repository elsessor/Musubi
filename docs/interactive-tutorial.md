# Musubi interactive tutorial

The tutorial is separate from the existing `/onboarding` account and organization setup flow. After authentication, it waits for the matching role's dashboard shell to be ready before offering a welcome dialog. Admins receive a four-step introduction; leaders and members receive five steps. Help / User Guide in the header offers restart, resume, a longer feature walkthrough, and expandable role-specific instructions.

The feature walkthrough covers:

- Admin: dashboard, organization requests and reviews, organizations, accounts, audit logs, settings, and replay.
- Student Leader: events and tasks, AI Task Atomizer, generated assignment explanations, member requests, committees, announcements, analytics, reminders, settings, and profile.
- Organization Member: assigned tasks, task details and status updates, organization information, announcements, reminders, settings, and profile.

Only existing pages and controls are used. There is no dedicated invitation page or “Why Assigned?” button in this interface; the instructions reference membership requests and the explanation shown when editing generated subtasks. AI suggestions remain subject to human review. No tour step submits forms, generates AI output, creates sample data, or changes assignments. Only read-only tab controls are opened automatically.

## Persistence and access

`GET /auth/tutorial` and `PUT /auth/tutorial` use the existing authentication middleware. The endpoint reads the account's stored role, accesses only the authenticated UID, and updates only `users/{uid}.tutorials["{role}:v1"]`. The PUT payload is strictly validated and includes an expected role, so queued writes fail safely if the account's role changes. No new collection or Firestore security rule is required.

Each record stores the version, current tour (`quick` or `features`), zero-based step, status (`in_progress`, `completed`, `dismissed`), acknowledgment flag, and server update time. Completion and dismissal suppress automatic onboarding. Acknowledgment survives replay so an interrupted replay does not turn a returning user into a first-time user. An unfinished first tour can be resumed from the welcome dialog.

Browser storage uses `musubi:tutorial:{encoded UID}:{role}:v1`, with session memory if localStorage is unavailable. Account sync failures are caught and shown in the guide. Locally newer progress is reconciled on a later load. Writes are serialized to keep rapid navigation from overwriting a final dismissal or completion. When both the API and browser storage are unavailable, progress lasts only for the current page session.

## UI and accessibility

Existing Radix dialogs provide modal semantics, keyboard focus containment, Escape handling, and cleanup. The tour returns focus to the header Help button. An SVG overlay leaves the actual target visible with a blue outline while blocking background interaction. Desktop steps prefer visible sidebar navigation; mobile steps highlight the page with an instruction panel near the bottom. Tooltip placement responds to target position and panel size, stays within the viewport, and supports reduced motion. Scroll and resize listeners are removed on exit. Target lookup times out after three seconds and leaves readable instructions and navigation available.

## Files

Created:

- `frontend/src/components/onboarding/TutorialProvider.tsx`
- `frontend/src/components/onboarding/GuidedTour.tsx`
- `frontend/src/config/tutorial.ts`
- `frontend/src/services/tutorial.service.ts`
- `backend/src/controllers/tutorial.controller.ts`
- `backend/src/utils/tutorialStatus.ts`
- `backend/tests/tutorial.test.ts`
- `docs/interactive-tutorial.md`

Modified:

- `frontend/src/app/providers.tsx`: persistent tutorial provider across routes.
- `frontend/src/components/dashboard/DashboardLayout.tsx`: role and readiness markers.
- `frontend/src/components/dashboard/DashboardPage.tsx`: wait for dashboard profile loading.
- `frontend/src/components/dashboard/TopHeader.tsx`: Help entry and profile target.
- `frontend/src/components/dashboard/Sidebar.tsx`: stable navigation targets.
- `frontend/src/components/events/EventsPage.tsx`: wait for profile loading.
- `frontend/src/components/events/EventsDashboard.tsx`: stable create-event target.
- `frontend/src/components/events/EventsTasksView.tsx`: safe tab targets.
- `frontend/src/app/dashboard/organization/page.tsx`: safe organization tab targets.
- `frontend/src/components/ui/dialog.tsx`: optional overlay class for tutorial stacking.
- `backend/src/routes/auth.routes.ts`: authenticated tutorial endpoints.

No dependencies were added.

## Validation

From `backend`, run `node --import tsx --test tests/tutorial.test.ts`. Tests cover the actual route configurations, role isolation, first-time eligibility, dismissal/completion and interrupted replay, versioned account keys, validation, API cache behavior, unavailable browser storage, offline recovery, ordered writes, and remote role mismatches.

Also run `npm run typecheck` in both projects, `npm run lint` in frontend, and `npm run build` in both projects. The full suite is `node --import tsx --test tests/*.test.ts` from backend. Existing task UI tests currently have eight failures because their `statusUtils` mock omits `getTaskStatusDescription`; those tests and their task components were not changed by this feature.

Implementation verification: nine tutorial tests passed, both project type checks passed, lint passed with existing warnings, and both production builds passed. The final frontend build used a temporary isolated output directory after the shared `.next` directory produced missing-chunk errors. The original Next and TypeScript configuration files were restored afterward; generated verification output was moved to the ignored `frontend/node_modules/.cache/musubi-tutorial-verify` directory.

Manual verification still requires authenticated accounts for all three roles and a browser:

1. With no tutorial record for the current version, sign in and verify the welcome appears only once the role dashboard is ready. Verify no tutorial on auth/setup screens.
2. Start, go forward/back across pages, open the AI and organization tabs in the feature walkthrough, and finish. Refresh or sign in elsewhere and confirm completion suppresses the welcome.
3. Dismiss via Maybe Later, Close, and Escape; verify no automatic reopening on navigation or subsequent sign-in. Replay through Help without clearing storage.
4. Interrupt the first tour with a refresh and resume it. Interrupt a replay after prior completion and confirm no automatic welcome.
5. At desktop and 320px/mobile widths, verify spotlight alignment, tooltip visibility, scrolling, missing-target instructions, keyboard focus containment/restoration, screen reader announcements, and reduced-motion behavior.
6. Switch accounts/roles, test an empty organization and records with no tasks, and disconnect the API to verify safe instructions and browser persistence. A feature that needs a real task explains how to use it without opening an arbitrary record.

No browser automation framework or authenticated browser session is supplied in this repository, so these visual and live-account checks are not represented as completed automated verification.
