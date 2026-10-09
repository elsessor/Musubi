import { Router } from "express";
import { sendNudgeEmailController } from "../controllers/email.controller.js";

export const emailRouter = Router();

emailRouter.post("/nudge", sendNudgeEmailController);
