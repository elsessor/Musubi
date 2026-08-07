import type { NextFunction, Request, Response } from "express";

import { firebaseAuth } from "../config/firebase.js";
import { runAtomizerFlow } from "../services/atomizer.service.js";
import {
  bulkUpdateMemberRolesForAdmin,
  completeUserOnboarding,
  createOrganization,
  getAdminMemberDirectory,
  getAuditLogs,
  getCurrentUser,
  getMyOrganizationJoinRequest,
  getOrganizationDirectory,
  getOrganizationForUser,
  getOrganizationJoinRequests,
  getOrganizationManagementDetail,
  getOrganizationMembers,
  getOrganizationRequests,
  getOrganizationsForAdmin,
  joinOrganization,
  loginWithFirebaseToken,
  reviewOrganizationJoinRequest,
  reviewOrganizationRequest,
  updateMemberForAdmin,
  updateOrganizationForAdmin,
  watchAdminMemberDirectory,
  watchAuditLogs
} from "../services/auth.service.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { AppError } from "../utils/AppError.js";

function getBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginController(request: Request, response: Response, next: NextFunction) {
  try {
    const idToken = typeof request.body.idToken === "string" ? request.body.idToken : getBearerToken(request);
    if (!idToken) throw new AppError("Firebase ID token is required.", 400);
    const session = await loginWithFirebaseToken(idToken);
    response.status(200).json(session);
  } catch (error) { next(error); }
}

export async function onboardingController(request: Request, response: Response, next: NextFunction) {
  try {
    const idToken = typeof request.body.idToken === "string" ? request.body.idToken : getBearerToken(request);
    if (!idToken) throw new AppError("Firebase ID token is required.", 400);
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const { role, position, organizationId, yearLevel, program, skills, organizationRequest } = request.body as Record<string, unknown>;
    const validOrganizationRequest = organizationRequest === undefined || (
      typeof organizationRequest === "object" && organizationRequest !== null &&
      typeof (organizationRequest as Record<string, unknown>).organizationId === "string" &&
      typeof (organizationRequest as Record<string, unknown>).orgName === "string" &&
      typeof (organizationRequest as Record<string, unknown>).orgType === "string" &&
      typeof (organizationRequest as Record<string, unknown>).description === "string"
    );
    if (
      (role !== "Student Leader" && role !== "Organization Member") ||
      typeof position !== "string" || !position.trim() ||
      !(typeof organizationId === "string" || organizationId === null) ||
      typeof yearLevel !== "string" || typeof program !== "string" ||
      !Array.isArray(skills) || !skills.every((skill) => typeof skill === "string") ||
      !validOrganizationRequest
    ) {
      throw new AppError("Invalid onboarding details.", 400);
    }
    response.status(200).json(await completeUserOnboarding(decodedToken.uid, {
      role, position, organizationId, yearLevel, program, skills,
      organizationRequest: organizationRequest as { organizationId: string; orgName: string; orgType: string; description: string } | undefined
    }));
  } catch (error) { next(error); }
}

export async function meController(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  try {
    if (!request.authUser) throw new AppError("Authentication is required.", 401);
    const user = await getCurrentUser(request.authUser.uid);
    response.status(200).json({ user });
  } catch (error) { next(error); }
}

// ── Organization requests (admin) ─────────────────────────────────────────────

export async function organizationRequestsController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    response.status(200).json({ requests: await getOrganizationRequests(decodedToken.uid) });
  } catch (error) { next(error); }
}

export async function reviewOrganizationRequestController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    const { status, rejectionReason } = request.body as Record<string, unknown>;
    if (status !== "approved" && status !== "rejected") {
      throw new AppError("Status must be 'approved' or 'rejected'.", 400);
    }
    if (!(typeof rejectionReason === "string" || rejectionReason === null || rejectionReason === undefined)) {
      throw new AppError("Invalid rejection reason.", 400);
    }
    if (status === "rejected" && !String(rejectionReason ?? "").trim()) {
      throw new AppError("A rejection reason is required.", 400);
    }
    await reviewOrganizationRequest(
      decodedToken.uid,
      request.params.requestId,
      status,
      typeof rejectionReason === "string" ? rejectionReason : null
    );
    response.status(204).send();
  } catch (error) {
    console.error("[reviewOrganizationRequest] Error:", error);
    next(error);
  }
}

// ── Organizations ─────────────────────────────────────────────────────────────

export async function organizationController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    response.status(200).json({ organization: await getOrganizationForUser(decodedToken.uid, request.params.organizationId) });
  } catch (error) { next(error); }
}

export async function organizationDirectoryController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.status(200).json({ organizations: await getOrganizationDirectory(decoded.uid) });
  } catch (error) { next(error); }
}

export async function joinOrganizationController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    const organizationId = (request.body as Record<string, unknown>).organizationId;
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    if (typeof organizationId !== "string" || !organizationId) throw new AppError("An organization is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.status(201).json({ request: await joinOrganization(decoded.uid, organizationId) });
  } catch (error) { next(error); }
}

export async function createOrganizationController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    const body = request.body as Record<string, unknown>;
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    if (typeof body.name !== "string" || !body.name.trim() || typeof body.type !== "string" || !body.type.trim() || typeof body.description !== "string" || !body.description.trim()) {
      throw new AppError("Name, type, and description are required.", 400);
    }
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.status(201).json(await createOrganization(decoded.uid, { name: body.name, type: body.type, description: body.description }));
  } catch (error) { next(error); }
}

export async function organizationsController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.status(200).json({ organizations: await getOrganizationsForAdmin(decoded.uid) });
  } catch (error) { next(error); }
}

export async function organizationMembersController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.status(200).json({ members: await getOrganizationMembers(decoded.uid, request.params.organizationId) });
  } catch (error) { next(error); }
}

export async function organizationJoinRequestsController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.status(200).json({ requests: await getOrganizationJoinRequests(decoded.uid, request.params.organizationId) });
  } catch (error) { next(error); }
}

export async function myOrganizationJoinRequestController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.status(200).json({ request: await getMyOrganizationJoinRequest(decoded.uid) });
  } catch (error) { next(error); }
}

export async function reviewOrganizationJoinRequestController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    const status = (request.body as Record<string, unknown>).status;
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    if (status !== "accepted" && status !== "rejected") throw new AppError("Invalid join request status.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    await reviewOrganizationJoinRequest(decoded.uid, request.params.organizationId, request.params.requestId, status);
    response.status(204).send();
  } catch (error) { next(error); }
}

export async function updateOrganizationController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    const body = request.body as Record<string, unknown>;
    const allowedStatus = body.setupStatus === undefined || body.setupStatus === "pending" || body.setupStatus === "active" || body.setupStatus === "inactive";
    if (
      !allowedStatus ||
      (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) ||
      (body.type !== undefined && (typeof body.type !== "string" || !body.type.trim())) ||
      (body.description !== undefined && typeof body.description !== "string")
    ) {
      throw new AppError("Invalid organization details.", 400);
    }
    response.status(200).json({
      organization: await updateOrganizationForAdmin(decoded.uid, request.params.organizationId, {
        name: body.name as string | undefined,
        type: body.type as string | undefined,
        description: body.description as string | undefined,
        setupStatus: body.setupStatus as string | undefined
      })
    });
  } catch (error) { next(error); }
}

export async function organizationManagementDetailController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.status(200).json(await getOrganizationManagementDetail(decoded.uid, request.params.organizationId));
  } catch (error) { next(error); }
}

// ── Admin members ─────────────────────────────────────────────────────────────

export async function adminMembersController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.status(200).json(await getAdminMemberDirectory(decoded.uid));
  } catch (error) { next(error); }
}

export async function adminMembersStreamController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = typeof request.query.token === "string" ? request.query.token : getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });
    response.write("retry: 5000\n\n");
    const unsubscribe = await watchAdminMemberDirectory(
      decoded.uid,
      (directory) => {
        response.write(`event: members\n`);
        response.write(`data: ${JSON.stringify(directory)}\n\n`);
      },
      (error) => {
        response.write(`event: error\n`);
        response.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
      }
    );
    request.on("close", () => { unsubscribe(); });
  } catch (error) {
    if (response.headersSent) {
      response.write(`event: error\n`);
      response.write(`data: ${JSON.stringify({ message: error instanceof Error ? error.message : "Internal server error." })}\n\n`);
      response.end();
    } else {
      next(error);
    }
  }
}

export async function updateAdminMemberController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    const body = request.body as Record<string, unknown>;
    const update: Parameters<typeof updateMemberForAdmin>[2] = {};
    if (body.role !== undefined) {
      if (body.role !== "Admin" && body.role !== "Student Leader" && body.role !== "Organization Member") throw new AppError("Invalid role.", 400);
      update.role = body.role;
    }
    if (body.position !== undefined) {
      if (typeof body.position !== "string" || !body.position.trim()) throw new AppError("A position is required.", 400);
      update.position = body.position;
    }
    if (body.organizationId !== undefined) {
      if (!(typeof body.organizationId === "string" || body.organizationId === null)) throw new AppError("Invalid organization.", 400);
      update.organizationId = body.organizationId as string | null;
    }
    if (body.organizationName !== undefined) {
      if (typeof body.organizationName !== "string") throw new AppError("Invalid organization name.", 400);
      update.organizationName = body.organizationName;
    }
    if (body.committeeId !== undefined) {
      if (!(typeof body.committeeId === "string" || body.committeeId === null)) throw new AppError("Invalid committee.", 400);
      update.committeeId = body.committeeId as string | null;
    }
    if (body.committeeName !== undefined) {
      if (typeof body.committeeName !== "string") throw new AppError("Invalid committee name.", 400);
      update.committeeName = body.committeeName;
    }
    await updateMemberForAdmin(decoded.uid, request.params.memberId, update);
    response.status(204).send();
  } catch (error) { next(error); }
}

export async function bulkUpdateAdminMembersRoleController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    const body = request.body as Record<string, unknown>;
    if (body.role !== "Admin" && body.role !== "Student Leader" && body.role !== "Organization Member") throw new AppError("Invalid role.", 400);
    if (!Array.isArray(body.memberIds) || !body.memberIds.every((id) => typeof id === "string")) throw new AppError("Member IDs are required.", 400);
    await bulkUpdateMemberRolesForAdmin(decoded.uid, body.memberIds, body.role);
    response.status(204).send();
  } catch (error) { next(error); }
}

// ── Audit logs ────────────────────────────────────────────────────────────────

export async function auditLogsController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.status(200).json({ logs: await getAuditLogs(decoded.uid) });
  } catch (error) { next(error); }
}

export async function auditLogsStreamController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = typeof request.query.token === "string" ? request.query.token : getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });
    response.write("retry: 5000\n\n");
    const unsubscribe = await watchAuditLogs(
      decoded.uid,
      (logs) => {
        response.write(`event: audit_logs\n`);
        response.write(`data: ${JSON.stringify({ logs })}\n\n`);
      },
      (error) => {
        response.write(`event: error\n`);
        response.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
      }
    );
    request.on("close", () => { unsubscribe(); });
  } catch (error) {
    if (response.headersSent) {
      response.write(`event: error\n`);
      response.write(`data: ${JSON.stringify({ message: error instanceof Error ? error.message : "Internal server error." })}\n\n`);
      response.end();
    } else {
      next(error);
    }
  }
}

// ── AI Task Atomizer ─────────────────────────────────────────────────────────

export async function atomizeGoalController(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);
    if (!token) throw new AppError("Firebase ID token is required.", 400);
    const decoded = await firebaseAuth.verifyIdToken(token);
    const user = await getCurrentUser(decoded.uid);

    const { eventName, goalDescription, defaultStatus } = request.body as Record<string, unknown>;

    if (typeof goalDescription !== "string" || !goalDescription.trim()) {
      throw new AppError("A goal description is required.", 400);
    }

    const result = await runAtomizerFlow({
      eventName: typeof eventName === "string" ? eventName.trim() : "Event Goal",
      goalDescription: goalDescription.trim(),
      defaultStatus: typeof defaultStatus === "string" ? defaultStatus : "To Do",
      uid: user.uid,
      userName: user.fullName,
      userRole: user.role
    });

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
