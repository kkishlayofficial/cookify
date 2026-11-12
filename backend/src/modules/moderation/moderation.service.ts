import leoProfanity from "leo-profanity";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/modules/notifications/notifications.service";

const BAN_THRESHOLD = 3;

export function isNsfw(text: string): boolean {
  return leoProfanity.check(text);
}

/**
 * Issues a warning to a user (e.g. for posting an NSFW comment). On the 3rd
 * warning the account is banned and all of its content is soft-removed
 * (hidden from public queries, not hard-deleted, so moderation history and
 * an audit trail survive).
 */
export async function issueWarning(userId: string, reason: string, sourceCommentId?: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { warningCount: { increment: 1 }, warningsReceived: { create: { reason, sourceCommentId } } },
  });

  if (user.warningCount >= BAN_THRESHOLD) {
    await banUser(userId);
    return { banned: true, warningCount: user.warningCount };
  }

  await createNotification(
    userId,
    "WARNING",
    { reason, warningCount: user.warningCount },
    {
      to: user.email,
      subject: "COOKify warning notice",
      text: `You have received a warning: ${reason}. Your account will be banned after ${BAN_THRESHOLD} warnings (currently ${user.warningCount}/${BAN_THRESHOLD}).`,
    },
  );

  return { banned: false, warningCount: user.warningCount };
}

export async function banUser(userId: string) {
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: userId }, data: { status: "BANNED" } });
    // Cascade: hide (soft-remove) all of the banned user's public content.
    await tx.recipe.updateMany({ where: { authorId: userId }, data: { isRemoved: true } });
    await tx.comment.updateMany({ where: { userId }, data: { isRemoved: true } });
    await tx.device.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
    return updated;
  });

  await createNotification(
    userId,
    "BAN",
    { reason: "Repeated policy violations" },
    {
      to: user.email,
      subject: "Your COOKify account has been banned",
      text: "Your account has been banned after reaching 3 warnings. All of your recipes and comments have been removed from public view.",
    },
  );
}
