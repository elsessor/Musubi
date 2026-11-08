# Musubi interactive tutorial

The tutorial is separate from the existing `/onboarding` account and organization setup flow. After authentication, it waits for the matching role's dashboard shell to be ready before offering a welcome dialog. Admins receive a four-step introduction; leaders and members receive five steps. Help / User Guide offers the short introduction, a page overview, selectable feature workflows, a control reference, and readable role-specific instructions.

## Feature workflows and control coverage

The 15 selectable workflows explain actual buttons, fields, tabs, dropdowns, filters, and confirmation actions. They cover event creation and browsing, subtask creation, task status updates, AI planning and assignment review, committees, membership, announcements, administrator request review, organization/account management, audit filters, notifications, and settings. The catalog filters both tours and individual steps by role; members do not receive leader-only posting, membership removal, or workflow-management steps.

All manual tutorial access is centralized in the header's **Help / User Guide**. There are no per-page or per-form help buttons. The guide groups content by the authenticated role's real navigation tabs, plus Profile. Each group offers a control tour for that page and its relevant feature workflows. Selecting a page navigates there before collecting its visible controls. The control tour derives labels, uses curated descriptions where available, includes disabled controls with a prerequisite note, explains distinct view/status choices, and groups repeated record actions such as View Profile. Recognized opening controls expand inline into the associated modal or subtab walkthrough. Decorative and unlabeled icons without an identifiable purpose are omitted.

Next automatically opens safe interfaces after explaining their trigger. For example, it highlights New Event, opens the real event form, and then explains the name, description, committee, reuse option, dates, Create, and Cancel controls. A strict action allowlist permits only safe navigation and opening/closing interfaces. Saves, uploads, approvals, rejection confirmations, publication, AI generation, assignment changes, and destructive actions are highlighted and explained while shielded from accidental activation. Users exit the guide before committing real changes. No tutorial fills production forms or creates sample records. Missing or disabled targets retain readable instructions and navigation. Back navigation can reopen a required safe interface; forms opened by the tutorial are closed on exit without submitting. Already open forms are not claimed for automatic cleanup.

Workflow progress is stored, but reopening an interrupted feature guide starts at its safe opening controls so the user can choose a current record and open the appropriate form again. Page overviews can resume at the saved step. Control-reference markers exist only for the active reference and are removed on exit; that reference is rebuilt from the current screen when restarted.

The feature walkthrough covers:

- Admin: dashboard, organization requests and reviews, organizations, accounts, audit logs, settings, and replay.
- Student Leader: events and tasks, AI Task Atomizer, generated assignment explanations, member requests, committees, announcements, analytics, reminders, settings, and profile.
- Organization Member: assigned tasks, task details and status updates, organization information, announcements, reminders, settings, and profile.

Only existing pages and controls are used. There is no dedicated invitation page or “Why Assigned?” button in this interface; the instructions reference membership requests and the explanation shown when editing generated subtasks. AI suggestions remain subject to human review. No tour step submits forms, generates AI output, creates sample data, or changes assignments. Only safe interface navigation and opening/closing controls run automatically.

## Persistence and access

`GET /auth/tutorial` and `PUT /auth/tutorial` use the existing authentication middleware. The endpoint reads the account's stored role, accesses only the authenticated UID, and updates only `users/{uid}.tutorials["{role}:v1"]`. The PUT payload is strictly validated and includes an expected role, so queued writes fail safely if the account's role changes. No new collection or Firestore security rule is required.

Each record stores the version, current tour (`quick`, `features`, `controls`, or a validated workflow ID), zero-based step, status (`in_progress`, `completed`, `dismissed`), acknowledgment flag, and server update time. Completion and dismissal suppress automatic onboarding. Acknowledgment survives replay so an interrupted replay does not turn a returning user into a first-time user. An unfinished first tour can be resumed from the welcome dialog.

Browser storage uses `musubi:tutorial:{encoded UID}:{role}:v1`, with session memory if localStorage is unavailable. Account sync failures are caught and shown in the guide. Locally newer progress is reconciled on a later load. Writes are serialized to keep rapid navigation from overwriting a final dismissal or completion. When both the API and browser storage are unavailable, progress lasts only for the current page session.

## UI and accessibility

Existing Radix dialogs provide the welcome and guide modals. The spotlight uses a portal with dialog semantics, scoped keyboard focus, Escape handling, focus restoration, and cleanup. An SVG overlay leaves the actual target visible with a blue outline. Informational steps shield the application; interactive steps allow only the expected safe control through a cutout, alongside the tutorial controls. The panel moves into native dialog top layers when necessary. Tooltip placement responds to target position and panel size, stays within the viewport, and supports reduced motion; mobile panels move above lower targets to avoid covering them. Scroll, resize, mutation, click, keyboard, and pending timer handlers are removed on exit. Missing targets receive a fallback after three seconds, and late arriving targets can still be found.

## Files

Created:

- `frontend/src/components/onboarding/TutorialProvider.tsx`
- `frontend/src/components/onboarding/GuidedTour.tsx`
- `frontend/src/config/tutorial.ts`
- `frontend/src/services/tutorial.service.ts`
- `frontend/src/config/tutorialWorkflows.ts`
- `frontend/src/config/tutorialActions.ts`
- `frontend/src/components/onboarding/controlGuide.ts`
- `frontend/src/components/onboarding/tourTargets.ts`
- `backend/src/controllers/tutorial.controller.ts`
- `backend/src/utils/tutorialStatus.ts`
- `backend/tests/tutorial.test.ts`
- `backend/tests/tutorialWorkflows.test.ts`
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

Feature-control expansion adds stable selectors and optional `tourId` props to administrator request/organization/account views, notifications and settings, committee/member/announcement components, audit logs, event/task cards and views, task forms, date/selection/dependency controls, and the AI generation/review/editor components. All tutorial-launch buttons remain in Help / User Guide. These changes preserve existing business handlers; the Events & Tasks view additionally accepts a read-only tutorial navigation event to return to the event list.

No dependencies were added.

## Validation

From `backend`, run `node --import tsx --test tests/tutorial.test.ts tests/tutorialWorkflows.test.ts`. The 18 tests cover the actual routes and control selectors, centralized entry points, inline New Event modal instructions, safe automatic opening, rejection of automatic submits, already-open modal handling, role isolation, browser/API tour-ID agreement, visible responsive target selection, disabled controls, control descriptions, first-time eligibility, dismissal/completion and replay, versioned account keys, validation, storage failures, offline recovery, ordered writes, and remote role mismatches.

Also run `npm run typecheck` in both projects, `npm run lint` in frontend, and `npm run build` in both projects. The full suite is `node --import tsx --test tests/*.test.ts` from backend. Existing task UI tests currently have eight failures because their `statusUtils` mock omits `getTaskStatusDescription`. Those failures predate the control-level expansion; their test mocks remain unchanged, and the task component changes add only help entry points and selectors.

Implementation verification: 18 tutorial tests passed, both project type checks passed, lint passed with existing warnings, and both production builds passed. Frontend build and browser verification use temporary isolated output directories to avoid the shared `.next` missing-chunk errors. The original Next and TypeScript configuration files are restored afterward; generated verification output is archived under the ignored `frontend/node_modules/.cache` directory.

Manual verification still requires authenticated accounts for all three roles and a browser:

1. With no tutorial record for the current version, sign in and verify the welcome appears only once the role dashboard is ready. Verify no tutorial on auth/setup screens.
2. Start, go forward/back across pages, open the AI and organization tabs in the feature walkthrough, and finish. Refresh or sign in elsewhere and confirm completion suppresses the welcome.
3. Dismiss via Maybe Later, Close, and Escape; verify no automatic reopening on navigation or subsequent sign-in. Replay through Help without clearing storage.
4. Interrupt the first tour with a refresh and resume it. Interrupt a replay after prior completion and confirm no automatic welcome.
5. At desktop and 320px/mobile widths, verify spotlight alignment, tooltip visibility, scrolling, missing-target instructions, keyboard focus containment/restoration, screen reader announcements, and reduced-motion behavior.
6. Switch accounts/roles, test an empty organization and records with no tasks, and disconnect the API to verify safe instructions and browser persistence. A feature that needs a real task explains how to use it without opening an arbitrary record.

The control-level expansion was additionally checked in headless Chrome using a temporary local fixture and the real committee form. Desktop (1280px) and mobile (375px) checks exercised pointer-driven progression, actual form-field targets, keyboard focus containment, viewport bounds, submit shielding, cancellation/finish cleanup, Escape, missing-target fallback, form-control discovery, exclusion of the guide's own controls, and temporary-marker cleanup. The fixture and browser runner were removed after verification. The remaining manual checks above concern live authenticated roles, real records, and the other workflows; those are not represented as completed browser verification.

The centralized revision was checked again at 1280px and 375px in headless Chrome using the real committee form: Next automatically opens the modal, the guide explains its actual fields, controls remain in the viewport, no form is submitted, and Finish/Escape close the form opened by the tutorial. Temporary browser fixtures and runners were removed afterward.
