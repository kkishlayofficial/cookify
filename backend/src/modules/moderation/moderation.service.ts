import leoProfanity from "leo-profanity";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/modules/notifications/notifications.service";

const BAN_THRESHOLD = 3;

/**
 * leo-profanity only matches whole tokens against its dictionary (by design,
 * to avoid false positives like "cumin"/"classic"/"scunthorpe"). That means
 * common inflected forms of a bad word - "shitting", "fucked", "fuckers" -
 * slip through whenever the inflected form isn't *also* listed verbatim.
 *
 * Rather than falling back to substring matching (which would reintroduce
 * exactly those false positives), we expand the dictionary with the regular
 * English inflections (-s/-ed/-ing/-er, including consonant-doubling e.g.
 * "shit" -> "shitting") of every word already in it. Matching stays
 * whole-token, so "cumin" etc. remain unaffected.
 */
const EXTRA_ROOT_WORDS = ["motherfuck"];

function doubledConsonantForm(word: string): string | null {
  const vowels = new Set(["a", "e", "i", "o", "u"]);
  const last = word[word.length - 1];
  const secondLast = word[word.length - 2];
  const thirdLast = word[word.length - 3];
  if (
    word.length >= 3 &&
    /^[a-z]$/.test(last) &&
    !vowels.has(last) &&
    last !== "w" &&
    last !== "x" &&
    last !== "y" &&
    vowels.has(secondLast) &&
    !vowels.has(thirdLast)
  ) {
    return word + last;
  }
  return null;
}

function generateInflections(word: string): string[] {
  if (!/^[a-z]+$/.test(word)) return [];

  const variants = new Set<string>([`${word}s`, `${word}ed`, `${word}ing`, `${word}er`, `${word}y`]);

  const doubled = doubledConsonantForm(word);
  if (doubled) {
    variants.add(`${doubled}ed`);
    variants.add(`${doubled}ing`);
    variants.add(`${doubled}er`);
  }

  return Array.from(variants);
}

const baseWords = [...leoProfanity.list(), ...EXTRA_ROOT_WORDS];
const inflectedWords = baseWords.flatMap(generateInflections);
leoProfanity.add([...EXTRA_ROOT_WORDS, ...inflectedWords]);

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
