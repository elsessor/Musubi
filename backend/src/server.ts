import { app } from "./app.js";
import { env } from "./config/env.js";
import { runDueNudgesCheck } from "./controllers/email.controller.js";

app.listen(env.port, () => {
  console.log(`Auth backend running on http://localhost:${env.port}`);

  // Background automated checker for adviser-recommended 3-day and 1-day nudges
  const NUDGE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
  setInterval(() => {
    runDueNudgesCheck().catch((err) => console.warn("[Auto-Nudge] Background check error:", err));
  }, NUDGE_CHECK_INTERVAL_MS);

  // Initial check shortly after boot (15s)
  setTimeout(() => {
    runDueNudgesCheck().catch((err) => console.warn("[Auto-Nudge] Initial check error:", err));
  }, 15000);
});
