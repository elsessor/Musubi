import { Router } from "express";

import { adminMembersController, adminMembersStreamController, auditLogsController, auditLogsStreamController, bulkUpdateAdminMembersRoleController, createOrganizationController, joinOrganizationController, loginController, meController, myOrganizationJoinRequestController, onboardingController, organizationController, organizationDirectoryController, organizationJoinRequestsController, organizationManagementDetailController, organizationMembersController, organizationRequestsController, organizationsController, reviewOrganizationJoinRequestController, reviewOrganizationRequestController, updateAdminMemberController, updateOrganizationController } from "../controllers/auth.controller.js";
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
authRouter.get("/organizations/join-requests/me", myOrganizationJoinRequestController);
authRouter.get("/members", adminMembersController);
authRouter.get("/members/stream", adminMembersStreamController);
authRouter.get("/audit-logs", auditLogsController);
authRouter.get("/audit-logs/stream", auditLogsStreamController);
authRouter.patch("/members/bulk-role", bulkUpdateAdminMembersRoleController);
authRouter.patch("/members/:memberId", updateAdminMemberController);
authRouter.get("/organizations/:organizationId/members", organizationMembersController);
authRouter.get("/organizations/:organizationId/join-requests", organizationJoinRequestsController);
authRouter.patch("/organizations/:organizationId/join-requests/:requestId", reviewOrganizationJoinRequestController);
authRouter.get("/organizations/:organizationId", organizationController);
authRouter.get("/organizations/:organizationId/management", organizationManagementDetailController);
authRouter.patch("/organizations/:organizationId", updateOrganizationController);
