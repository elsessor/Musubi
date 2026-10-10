import { Router } from "express";
import { checkDueNudgesController, sendNudgeEmailController } from "../controllers/email.controller.js";

export const emailRouter = Router();

emailRouter.post("/nudge", sendNudgeEmailController);
emailRouter.post("/check-due-nudges", checkDueNudgesController);
emailRouter.get("/check-due-nudges", checkDueNudgesController);
