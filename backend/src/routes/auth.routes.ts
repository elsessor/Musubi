import { Router } from "express";

import { allMembersController, createOrganizationController, inviteOrganizationMemberController, joinOrganizationController, loginController, meController, myOrganizationJoinRequestController, onboardingController, organizationController, organizationDirectoryController, organizationJoinRequestsController, organizationManagementDetailController, organizationMembersController, organizationRequestsController, organizationsController, reviewOrganizationJoinRequestController, reviewOrganizationRequestController, updateMemberAssignmentController, updateOrganizationMemberController, updateOrganizationController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/onboarding", onboardingController);
authRouter.get("/me", requireAuth, meController);
authRouter.get("/org-requests", organizationRequestsController);
authRouter.patch("/org-requests/:requestId", reviewOrganizationRequestController);
authRouter.get("/organizations/directory", organizationDirectoryController);
authRouter.post("/organizations/join", joinOrganizationController);
authRouter.post("/organizations", createOrganizationController);
authRouter.get("/organizations", organizationsController);
authRouter.get("/members", allMembersController);
authRouter.patch("/members/:memberId", updateMemberAssignmentController);
authRouter.get("/organizations/join-requests/me", myOrganizationJoinRequestController);
authRouter.get("/organizations/:organizationId/members", organizationMembersController);
authRouter.patch("/organizations/:organizationId/members/:memberId", updateOrganizationMemberController);
authRouter.post("/organizations/:organizationId/invitations", inviteOrganizationMemberController);
authRouter.get("/organizations/:organizationId/join-requests", organizationJoinRequestsController);
authRouter.patch("/organizations/:organizationId/join-requests/:requestId", reviewOrganizationJoinRequestController);
authRouter.get("/organizations/:organizationId", organizationController);
authRouter.get("/organizations/:organizationId/management", organizationManagementDetailController);
authRouter.patch("/organizations/:organizationId", updateOrganizationController);
