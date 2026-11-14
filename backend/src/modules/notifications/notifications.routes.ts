import { Router } from "express";
import { param } from "@/lib/params";
import { requireAuth, type AuthenticatedRequest } from "@/middleware/auth";
import * as notificationsService from "@/modules/notifications/notifications.service";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const notifications = await notificationsService.listNotifications(req.user!.id);
  res.json({ notifications });
});

notificationsRouter.get("/unread-count", requireAuth, async (req: AuthenticatedRequest, res) => {
  const count = await notificationsService.getUnreadNotificationCount(req.user!.id);
  res.json({ count });
});

notificationsRouter.post("/read-all", requireAuth, async (req: AuthenticatedRequest, res) => {
  await notificationsService.markAllNotificationsRead(req.user!.id);
  res.status(204).send();
});

notificationsRouter.post("/:id/read", requireAuth, async (req: AuthenticatedRequest, res) => {
  await notificationsService.markNotificationRead(req.user!.id, param(req, "id"));
  res.status(204).send();
});
