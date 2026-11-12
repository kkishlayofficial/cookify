import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { isProduction } from "@/config/env";
import { ApiError } from "@/lib/apiError";

/**
 * Dev-only "mailbox" so the Ethereal email integration can be demoed without
 * a real inbox: lists the emails the backend has "sent" (2FA codes, reset
 * links, follow/rating/warning notifications) along with their Ethereal
 * preview links. Disabled in production.
 */
export const devMailRouter = Router();

devMailRouter.get("/", async (req, res) => {
  if (isProduction) throw ApiError.notFound("Not available in production");
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  const mail = await prisma.devMail.findMany({
    where: to ? { to } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ mail });
});
