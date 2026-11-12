import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { env } from "@/config/env";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";
import { authRouter } from "@/modules/auth/auth.routes";
import { usersRouter } from "@/modules/users/users.routes";
import { recipesRouter } from "@/modules/recipes/recipes.routes";
import { commentsRouter } from "@/modules/comments/comments.routes";
import { notificationsRouter } from "@/modules/notifications/notifications.routes";
import { chatRouter } from "@/modules/chat/chat.routes";
import { devMailRouter } from "@/modules/devmail/devmail.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/recipes", recipesRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/dev-mail", devMailRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
