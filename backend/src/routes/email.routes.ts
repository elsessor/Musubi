import { Router } from "express";
import { checkDueNudgesController, sendNudgeEmailController } from "../controllers/email.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const emailRouter = Router();

emailRouter.post("/nudge", requireAuth, sendNudgeEmailController);
emailRouter.post("/check-due-nudges", checkDueNudgesController);
emailRouter.get("/check-due-nudges", checkDueNudgesController);
