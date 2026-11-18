import type { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../config/firebase.js";
import { getNotificationsForUser, markNotificationsRead } from "../services/notifications.service.js";
import { AppError } from "../utils/AppError.js";

async function authenticatedUid(request: Request) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError("Firebase ID token is required.", 401);
  return (await firebaseAuth.verifyIdToken(header.slice(7))).uid;
}

export async function notificationsController(request: Request, response: Response, next: NextFunction) {
  try { response.json({ notifications: await getNotificationsForUser(await authenticatedUid(request)) }); }
  catch (error) { next(error); }
}

export async function readNotificationsController(request: Request, response: Response, next: NextFunction) {
  try {
    const uid = await authenticatedUid(request);
    const ids: unknown = request.body?.ids;
    if (!Array.isArray(ids) || ids.length > 200 || ids.some((id) => typeof id !== "string" || !id || id.includes("/"))) throw new AppError("Provide up to 200 valid notification IDs.", 400);
    await markNotificationsRead(uid, ids);
    response.status(204).send();
  } catch (error) { next(error); }
}
