import { Router, raw } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import type { AuthenticatedRequest } from "../types/auth.types.js";
import { AppError } from "../utils/AppError.js";
import { addTaskFileForUser, addTaskLinkForUser, downloadTaskFileForUser, rateTaskForUser, updateTaskStatusForUser } from "../services/task.service.js";

export const taskRouter = Router();
const taskPath = "/events/:eventId/tasks/:taskId";

taskRouter.patch(`${taskPath}/status`, requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    response.json(await updateTaskStatusForUser(request.authUser!.uid, request.params.eventId, request.params.taskId, request.body));
  } catch (error) { next(error); }
});

taskRouter.post(`${taskPath}/rate`, requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    response.json(await rateTaskForUser(request.authUser!.uid, request.params.eventId, request.params.taskId, request.body));
  } catch (error) { next(error); }
});

taskRouter.post(`${taskPath}/attachments/links`, requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) throw new AppError("Enter a valid link.", 400);
    response.status(201).json(await addTaskLinkForUser(request.authUser!.uid, request.params.eventId, request.params.taskId, request.body));
  } catch (error) { next(error); }
});

taskRouter.post(`${taskPath}/attachments/files`, requireAuth, raw({ type: "application/octet-stream", limit: "5mb" }), async (request: AuthenticatedRequest, response, next) => {
  try {
    let name: string;
    try { name = decodeURIComponent(request.header("X-File-Name") || ""); }
    catch { throw new AppError("Enter a valid file name.", 400); }
    response.status(201).json(await addTaskFileForUser(request.authUser!.uid, request.params.eventId, request.params.taskId, name, request.header("X-File-Type"), request.body));
  } catch (error) { next(error); }
});

taskRouter.get(`${taskPath}/attachments/:attachmentId`, requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const { attachment, bytes } = await downloadTaskFileForUser(request.authUser!.uid, request.params.eventId, request.params.taskId, request.params.attachmentId);
    const asciiName = attachment.name.replace(/[^a-zA-Z0-9._ -]/g, "_");
    response.setHeader("Content-Type", attachment.contentType || "application/octet-stream");
    response.setHeader("Content-Disposition", `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(attachment.name)}`);
    response.setHeader("Cache-Control", "private, no-store");
    response.send(bytes);
  } catch (error) { next(error); }
});
