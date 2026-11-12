import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";
import { isNsfw, issueWarning } from "@/modules/moderation/moderation.service";
import { createNotification } from "@/modules/notifications/notifications.service";

const COMMENT_AUTHOR_SELECT = { id: true, username: true, avatarUrl: true } as const;

export async function createComment(recipeId: string, userId: string, body: string) {
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe || recipe.isRemoved) throw ApiError.notFound("Recipe not found");

  if (isNsfw(body)) {
    const blocked = await prisma.comment.create({
      data: { recipeId, userId, body, status: "BLOCKED_NSFW", isRemoved: true },
    });

    const { banned } = await issueWarning(userId, "Posted a comment flagged as inappropriate (NSFW filter)", blocked.id);

    // The recipe owner is emailed a warning that a blocked comment was attempted on their recipe.
    const owner = await prisma.user.findUnique({ where: { id: recipe.authorId } });
    if (owner) {
      await createNotification(
        owner.id,
        "WARNING",
        { recipeId, reason: "A comment on your recipe was blocked by the content filter" },
        {
          to: owner.email,
          subject: "A comment on your recipe was blocked",
          text: `A comment on your recipe "${recipe.title}" was blocked by our content filter and was not published.`,
        },
      );
    }

    throw ApiError.badRequest(
      banned
        ? "Your comment was blocked and your account has been banned after repeated violations."
        : "Your comment was blocked for containing inappropriate content. You have received a warning.",
      "COMMENT_BLOCKED_NSFW",
    );
  }

  const comment = await prisma.comment.create({
    data: { recipeId, userId, body },
    include: { user: { select: COMMENT_AUTHOR_SELECT } },
  });

  if (recipe.authorId !== userId) {
    const author = await prisma.user.findUnique({ where: { id: userId } });
    const owner = await prisma.user.findUnique({ where: { id: recipe.authorId } });
    if (owner && author) {
      await createNotification(
        owner.id,
        "NEW_COMMENT",
        { recipeId, commentId: comment.id, fromUsername: author.username },
        {
          to: owner.email,
          subject: `${author.username} commented on your recipe`,
          text: `${author.username} commented on "${recipe.title}": "${body}"`,
        },
      );
    }
  }

  return comment;
}

export async function listComments(recipeId: string) {
  return prisma.comment.findMany({
    where: { recipeId, isRemoved: false, status: "VISIBLE" },
    include: { user: { select: COMMENT_AUTHOR_SELECT } },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteComment(commentId: string, requesterId: string, isAdmin: boolean) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw ApiError.notFound("Comment not found");
  if (comment.userId !== requesterId && !isAdmin) throw ApiError.forbidden("You can only delete your own comments");
  await prisma.comment.delete({ where: { id: commentId } });
}
