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
