import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";
import { createNotification } from "@/modules/notifications/notifications.service";

export async function rateRecipe(recipeId: string, userId: string, stars: number) {
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe || recipe.isRemoved) throw ApiError.notFound("Recipe not found");

  await prisma.rating.upsert({
    where: { recipeId_userId: { recipeId, userId } },
    create: { recipeId, userId, stars },
    update: { stars },
  });

  const aggregate = await prisma.rating.aggregate({ where: { recipeId }, _avg: { stars: true }, _count: true });
  const avgRating = aggregate._avg.stars ?? 0;
  const ratingCount = aggregate._count;
  await prisma.recipe.update({
    where: { id: recipeId },
    data: { avgRating, ratingCount },
  });

  if (recipe.authorId !== userId) {
    const rater = await prisma.user.findUnique({ where: { id: userId } });
    const owner = await prisma.user.findUnique({ where: { id: recipe.authorId } });
    if (owner && rater) {
      await createNotification(
        owner.id,
        "RATING_RECEIVED",
        { recipeId, stars, fromUsername: rater.username },
        {
          to: owner.email,
          subject: `${rater.username} rated your recipe ${stars}\u2605`,
          text: `${rater.username} gave "${recipe.title}" a ${stars}-star rating.`,
        },
      );
    }
  }

  return { avgRating, ratingCount: aggregate._count };
}
