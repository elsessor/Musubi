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
