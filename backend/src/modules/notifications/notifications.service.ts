import { prisma } from "@/lib/prisma";
import { trySendMail } from "@/lib/mailer";
import { emitToUser } from "@/lib/realtime";
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

  // Drives the header's unread badge in real time; the row above is already
  // the durable record, so a missed/late socket delivery just means the badge
  // catches up on the next unread-count fetch instead of losing the notification.
  emitToUser(userId, "notification:new", notification);

  // The in-app notification row is the business record and is already committed above;
  // email delivery is a best-effort side effect and must never fail the request. Only
  // successfully delivered emails are marked `emailedAt`, so a future retry/outbox sweep
  // can target exactly the ones that didn't go out, without re-sending ones that did.
  if (email) {
    const { delivered } = await trySendMail(email.to, email.subject, email.text);
    if (delivered) {
      await prisma.notification.update({ where: { id: notification.id }, data: { emailedAt: new Date() } });
    }
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

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
