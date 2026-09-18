import { Router } from "express";

import { auditLogsController, createEventController, createOrganizationController, eventsController, joinOrganizationController, loginController, meController, membersController, myOrganizationJoinRequestController, onboardingController, organizationController, organizationDirectoryController, organizationJoinRequestsController, organizationManagementDetailController, organizationMembersController, organizationRequestsController, organizationsController, reassignMemberController, reviewOrganizationJoinRequestController, reviewOrganizationRequestController, updateEventController, updateMemberRoleController, updateOrganizationController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/onboarding", onboardingController);
authRouter.get("/me", requireAuth, meController);
authRouter.get("/members", membersController);
authRouter.patch("/members/:id/role", updateMemberRoleController);
authRouter.patch("/members/:id/reassign", reassignMemberController);
authRouter.get("/audit-logs", auditLogsController);
authRouter.get("/events", eventsController);
authRouter.post("/events", createEventController);
authRouter.patch("/events/:id", updateEventController);
authRouter.get("/org-requests", organizationRequestsController);
authRouter.patch("/org-requests/:requestId", reviewOrganizationRequestController);
authRouter.get("/organizations/directory", organizationDirectoryController);
authRouter.post("/organizations/join", joinOrganizationController);
authRouter.post("/organizations", createOrganizationController);
authRouter.get("/organizations", organizationsController);
authRouter.get("/organizations/join-requests/me", myOrganizationJoinRequestController);
authRouter.get("/organizations/:organizationId/members", organizationMembersController);
authRouter.get("/organizations/:organizationId/join-requests", organizationJoinRequestsController);
authRouter.patch("/organizations/:organizationId/join-requests/:requestId", reviewOrganizationJoinRequestController);
authRouter.get("/organizations/:organizationId", organizationController);
authRouter.get("/organizations/:organizationId/management", organizationManagementDetailController);
authRouter.patch("/organizations/:organizationId", updateOrganizationController);
