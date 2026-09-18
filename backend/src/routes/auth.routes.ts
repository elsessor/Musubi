import { Router } from "express";

<<<<<<< HEAD
import { auditLogsController, createEventController, createOrganizationController, eventsController, joinOrganizationController, loginController, meController, membersController, myOrganizationJoinRequestController, onboardingController, organizationController, organizationDirectoryController, organizationJoinRequestsController, organizationManagementDetailController, organizationMembersController, organizationRequestsController, organizationsController, reassignMemberController, reviewOrganizationJoinRequestController, reviewOrganizationRequestController, updateEventController, updateMemberRoleController, updateOrganizationController } from "../controllers/auth.controller.js";
=======
import { addOrganizationCommitteeMembersController, adminMembersController, adminMembersStreamController, atomizeGoalController, auditLogsController, auditLogsStreamController, bulkUpdateAdminMembersRoleController, clearEventsController, createEventController, createOrganizationCommitteeController, createOrganizationController, getEventsController, joinOrganizationController, loginController, meController, myOrganizationJoinRequestController, onboardingController, organizationCommitteesController, organizationController, organizationDirectoryController, organizationJoinRequestsController, organizationManagementDetailController, organizationMembersController, organizationRequestsController, organizationsController, reviewOrganizationJoinRequestController, reviewOrganizationRequestController, updateAdminMemberController, updateEventController, updateOrganizationController } from "../controllers/auth.controller.js";
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/onboarding", onboardingController);
authRouter.get("/me", requireAuth, meController);
<<<<<<< HEAD
authRouter.get("/members", membersController);
authRouter.patch("/members/:id/role", updateMemberRoleController);
authRouter.patch("/members/:id/reassign", reassignMemberController);
authRouter.get("/audit-logs", auditLogsController);
authRouter.get("/events", eventsController);
authRouter.post("/events", createEventController);
authRouter.patch("/events/:id", updateEventController);
=======
authRouter.post("/atomize", atomizeGoalController);
authRouter.get("/events", requireAuth, getEventsController);
authRouter.post("/events", requireAuth, createEventController);
authRouter.patch("/events/:eventId", requireAuth, updateEventController);
authRouter.delete("/organizations/:organizationId/events", requireAuth, clearEventsController);
>>>>>>> ae4f7a49c2e30de3085b723d9a17a60cf92c8322
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
authRouter.get("/organizations/:organizationId/committees", organizationCommitteesController);
authRouter.post("/organizations/:organizationId/committees", createOrganizationCommitteeController);
authRouter.post("/organizations/:organizationId/committees/:committeeId/members", addOrganizationCommitteeMembersController);
authRouter.get("/organizations/:organizationId/join-requests", organizationJoinRequestsController);
authRouter.patch("/organizations/:organizationId/join-requests/:requestId", reviewOrganizationJoinRequestController);
authRouter.get("/organizations/:organizationId", organizationController);
authRouter.get("/organizations/:organizationId/management", organizationManagementDetailController);
authRouter.patch("/organizations/:organizationId", updateOrganizationController);
