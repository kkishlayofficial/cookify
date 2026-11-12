import { Router } from "express";
import { param } from "@/lib/params";
import { requireAuth, type AuthenticatedRequest } from "@/middleware/auth";
import * as notificationsService from "@/modules/notifications/notifications.service";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const notifications = await notificationsService.listNotifications(req.user!.id);
  res.json({ notifications });
});

notificationsRouter.post("/:id/read", requireAuth, async (req: AuthenticatedRequest, res) => {
  await notificationsService.markNotificationRead(req.user!.id, param(req, "id"));
  res.status(204).send();
});
