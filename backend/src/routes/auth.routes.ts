import { Router } from "express";

import { loginController, meController, onboardingController, organizationController, organizationManagementDetailController, organizationRequestsController, organizationsController, reviewOrganizationRequestController, updateOrganizationController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/onboarding", onboardingController);
authRouter.get("/me", requireAuth, meController);
authRouter.get("/org-requests", organizationRequestsController);
authRouter.patch("/org-requests/:requestId", reviewOrganizationRequestController);
authRouter.get("/organizations", organizationsController);
authRouter.get("/organizations/:organizationId", organizationController);
authRouter.get("/organizations/:organizationId/management", organizationManagementDetailController);
authRouter.patch("/organizations/:organizationId", updateOrganizationController);
