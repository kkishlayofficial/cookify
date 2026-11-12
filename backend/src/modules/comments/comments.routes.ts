import { Router } from "express";
import { param } from "@/lib/params";
import { requireAuth, type AuthenticatedRequest } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { createCommentSchema } from "@/modules/comments/comments.validation";
import * as commentsService from "@/modules/comments/comments.service";

export const commentsRouter = Router();

commentsRouter.get("/recipe/:recipeId", async (req, res) => {
  const comments = await commentsService.listComments(param(req, "recipeId"));
  res.json({ comments });
});

commentsRouter.post(
  "/recipe/:recipeId",
  requireAuth,
  validate({ body: createCommentSchema }),
  async (req: AuthenticatedRequest, res) => {
    const comment = await commentsService.createComment(param(req, "recipeId"), req.user!.id, req.body.body);
    res.status(201).json({ comment });
  },
);

commentsRouter.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await commentsService.deleteComment(param(req, "id"), req.user!.id, req.user!.role === "ADMIN");
  res.status(204).send();
});
