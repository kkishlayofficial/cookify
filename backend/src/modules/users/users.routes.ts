import { Router } from "express";
import { param } from "@/lib/params";
import { requireAuth, requireAdmin, optionalAuth, type AuthenticatedRequest } from "@/middleware/auth";
import { uploadAvatar } from "@/middleware/upload";
import * as usersService from "@/modules/users/users.service";
import { banUser } from "@/modules/moderation/moderation.service";
import { prisma } from "@/lib/prisma";

export const usersRouter = Router();

usersRouter.get("/saved", requireAuth, async (req: AuthenticatedRequest, res) => {
  const recipes = await usersService.listSavedRecipes(req.user!.id);
  res.json({ recipes });
});

usersRouter.get("/search", requireAuth, async (req: AuthenticatedRequest, res) => {
  const users = await usersService.searchUsers(String(req.query.q ?? ""), req.user!.id);
  res.json({ users });
});

usersRouter.post("/avatar", requireAuth, uploadAvatar.single("avatar"), async (req: AuthenticatedRequest, res) => {
  const url = `/uploads/${req.file!.filename}`;
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { avatarUrl: url } });
  res.json({ avatarUrl: user.avatarUrl });
});

usersRouter.get("/:username", optionalAuth, async (req: AuthenticatedRequest, res) => {
  const profile = await usersService.getPublicProfile(param(req, "username"), req.user?.id);
  res.json({ profile });
});

usersRouter.get("/:username/recipes", async (req, res) => {
  const recipes = await usersService.listUserRecipes(param(req, "username"));
  res.json({ recipes });
});

usersRouter.post("/:username/follow", requireAuth, async (req: AuthenticatedRequest, res) => {
  await usersService.followUser(req.user!.id, param(req, "username"));
  res.status(204).send();
});

usersRouter.delete("/:username/follow", requireAuth, async (req: AuthenticatedRequest, res) => {
  await usersService.unfollowUser(req.user!.id, param(req, "username"));
  res.status(204).send();
});

usersRouter.post("/saved/:recipeId", requireAuth, async (req: AuthenticatedRequest, res) => {
  await usersService.saveRecipe(req.user!.id, param(req, "recipeId"));
  res.status(204).send();
});

usersRouter.delete("/saved/:recipeId", requireAuth, async (req: AuthenticatedRequest, res) => {
  await usersService.unsaveRecipe(req.user!.id, param(req, "recipeId"));
  res.status(204).send();
});

// Admin moderation: ban a user outright (in addition to the automatic 3-warning ban).
usersRouter.post("/:username/ban", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const target = await prisma.user.findUnique({ where: { username: param(req, "username") } });
  if (!target) return res.status(404).json({ error: { message: "User not found", code: "NOT_FOUND" } });
  await banUser(target.id);
  res.status(204).send();
});
