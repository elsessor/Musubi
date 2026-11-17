# Campus Workflow Backend

Express backend for Firebase Authentication, Firestore-backed user profiles, and app JWT issuance.

## Development

```bash
npm install
npm run dev
```

Required `.env` keys:

```env
PORT=5000
FIREBASE_SERVICE_ACCOUNT_PATH=./.firebase-service-account.json
JWT_SECRET=replace-with-a-long-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

Do not commit the Firebase service account JSON.

## Test accounts

Run from `backend` using its configured Firebase project and Admin credentials:

```bash
npm run seed:test-accounts
npm run seed:test-accounts -- --apply
```

The first command previews the setup without writing. The second provisions
`test1@university.edu.ph` through `test20@university.edu.ph`, all with password
`testaccount123_` (override with `TEST_ACCOUNT_PASSWORD` when provisioning).
Credentials are saved locally in `.local-test-accounts/credentials.csv` and
`credentials.json`, both ignored by Git. The setup migrates the earlier
studentleader/orgmember test addresses in place, preserving UIDs and practice
assignments. It refuses conflicts with unrelated accounts or records.

All 20 accounts have verified emails and start at role selection. Users choose
Student Leader or Organization Member, enter position/year/program, and add
skills. Completing setup automatically activates membership in
**Musubi Test Organization**, without a membership request. Two committees, one practice event,
one assigned task per account, and a welcome announcement make the workspace
usable immediately. Re-running setup preserves existing practice data. Ordinary
leader/member permissions still apply; these accounts are not admins.

Joining the test organization from the organization picker also accepts marked
test accounts immediately, including any earlier pending requests. The join API
returns the updated profile so the workspace unlocks without waiting for a live
profile update. Normal accounts and requests to other organizations still require
leader approval.

Every new Firebase sign-in resets profile setup and both roles' walkthroughs.
After choosing a role and completing profile setup, Get Started appears on the
dashboard. Page refreshes, token refreshes, and duplicate session exchanges preserve
the chosen role, skills, and current attempt. The backend checks exact reserved emails, the
Admin-provisioned suite marker, and stored UID binding. Email patterns alone
never grant test behavior.
Shared tasks and other practice changes remain between sign-ins. Restart the
backend after adding the login hook. AI and Google Calendar
still require their normal provider configuration and, for Calendar, user consent.

### Deploying test-account changes

Changing Firestore records or testing the local service does not update the hosted
backend. Publish the backend source to the Render service and wait for its build
to finish, then run `npm run check:deployment` from `backend`. This checks the
hosted `/health` capabilities and fails if Render still serves the older code.

Build and publish the frontend to Firebase Hosting as well. Its `.env.production`
points production builds to Render while `.env` can keep the local development
API. A production build must not point hosted browsers to `localhost:5000`.

Task attachments use the existing Firestore database. Files and photos are limited
to 5 MB each and stored as binary chunks in `taskFiles/{attachmentId}/chunks`;
the subtask stores only attachment metadata. Links are saved with the subtask.
Authenticated downloads check organization access. No Storage bucket is required.
Clicking an attachment opens a private preview for supported images, PDFs, text,
audio, and video. Other file types remain downloadable. Links show a preview card
with an action to open the website.

Custom event status colors and ordering are stored on the organization through
`GET/PATCH /auth/event-status-settings`. Members can read settings; leaders can
save them. Task status colors remain scoped to their event. Event responses
include the organization color settings so dashboard, profile, and analytics
panels use the same colors as the event/task views.

Members use the task status endpoint and may attach files or links only to their
assigned subtasks. Event/task editing endpoints remain restricted to leaders.

Run the permissions, attachments/previews, workflow colors, and profile checks with:

```bash
node --import tsx --test tests/*.test.ts
```
