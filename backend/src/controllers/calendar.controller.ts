import type { Request, Response, NextFunction } from "express";
import {
  generateGoogleCalendarAuthUrl,
  handleGoogleCalendarCallback,
  getCalendarConnectionStatus,
  disconnectGoogleCalendar,
  syncAllUserEventsToCalendar
} from "../services/calendar.service.js";
import { env } from "../config/env.js";

export async function getConnectUrlController(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = (req as any).user?.uid;
    const returnOrigin = (req.query.returnOrigin as string) || req.headers.origin || env.frontendUrl;
    const url = generateGoogleCalendarAuthUrl(uid, returnOrigin);
    return res.json({ url });
  } catch (error) {
    next(error);
  }
}

export async function calendarCallbackController(req: Request, res: Response) {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const errorParam = req.query.error as string;

  let fallbackOrigin = env.frontendUrl;
  try {
    if (state) {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      if (decoded.returnOrigin) fallbackOrigin = decoded.returnOrigin;
    }
  } catch {
    // Keep fallback
  }

  if (errorParam) {
    return res.redirect(`${fallbackOrigin}/dashboard/settings?calendar=access_denied`);
  }

  if (!code || !state) {
    return res.redirect(`${fallbackOrigin}/dashboard/settings?calendar=missing_code`);
  }

  try {
    const { returnOrigin } = await handleGoogleCalendarCallback(code, state);
    const target = returnOrigin || fallbackOrigin;
    return res.redirect(`${target}/dashboard/settings?calendar=connected`);
  } catch (err: any) {
    console.error("[Calendar Callback Error]", err);
    const message = encodeURIComponent(err?.message || "Authentication failed");
    return res.redirect(`${fallbackOrigin}/dashboard/settings?calendar=error&message=${message}`);
  }
}

export async function calendarStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = (req as any).user?.uid;
    const status = await getCalendarConnectionStatus(uid);
    return res.json(status);
  } catch (error) {
    next(error);
  }
}

export async function disconnectCalendarController(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = (req as any).user?.uid;
    await disconnectGoogleCalendar(uid);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function syncAllEventsController(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = (req as any).user?.uid;
    const result = await syncAllUserEventsToCalendar(uid);
    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
