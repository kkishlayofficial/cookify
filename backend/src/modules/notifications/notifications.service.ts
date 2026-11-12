import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import type { NotificationType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export async function createNotification(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>,
  email?: { to: string; subject: string; text: string },
) {
  const notification = await prisma.notification.create({
    data: { userId, type, payload: payload as Prisma.InputJsonValue },
  });

  if (email) {
    await sendMail(email.to, email.subject, email.text);
    await prisma.notification.update({ where: { id: notification.id }, data: { emailedAt: new Date() } });
  }

  return notification;
}

export async function notifyFollowersOfNewRecipe(recipeId: string, authorId: string) {
  const [author, recipe, followers] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: authorId } }),
    prisma.recipe.findUniqueOrThrow({ where: { id: recipeId } }),
    prisma.follow.findMany({ where: { followedId: authorId }, include: { follower: true } }),
  ]);

  await Promise.all(
    followers.map((f) =>
      createNotification(
        f.followerId,
        "NEW_RECIPE_FROM_FOLLOWED",
        { recipeId, recipeTitle: recipe.title, authorId, authorUsername: author.username },
        {
          to: f.follower.email,
          subject: `${author.username} just uploaded a new recipe on COOKify`,
          text: `${author.username} uploaded "${recipe.title}". Check it out on COOKify!`,
        },
      ),
    ),
  );
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}
