import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";
import { notifyFollowersOfNewRecipe } from "@/modules/notifications/notifications.service";
import type { createRecipeSchema, searchRecipesSchema, updateRecipeSchema } from "@/modules/recipes/recipes.validation";

type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
type SearchQuery = z.infer<typeof searchRecipesSchema>;

const RECIPE_CARD_INCLUDE = {
  author: { select: { id: true, username: true, avatarUrl: true } },
  media: { orderBy: { order: "asc" as const } },
};

const RECIPE_DETAIL_INCLUDE = {
  ...RECIPE_CARD_INCLUDE,
  ingredients: { include: { ingredient: true } },
  utensils: { include: { utensil: true } },
};

async function connectIngredients(ingredients: CreateRecipeInput["ingredients"]) {
  return Promise.all(
    ingredients.map(async (item) => {
      const ingredient = await prisma.ingredient.upsert({
        where: { name: item.name.toLowerCase() },
        create: { name: item.name.toLowerCase() },
        update: {},
      });
      return { ingredientId: ingredient.id, quantity: item.quantity, optional: item.optional };
    }),
  );
}

async function connectUtensils(names: string[]) {
  return Promise.all(
    names.map(async (name) => {
      const utensil = await prisma.utensil.upsert({
        where: { name: name.toLowerCase() },
        create: { name: name.toLowerCase() },
        update: {},
      });
      return { utensilId: utensil.id };
    }),
  );
}

export async function createRecipe(authorId: string, input: CreateRecipeInput) {
  const ingredientLinks = await connectIngredients(input.ingredients);
  const utensilLinks = await connectUtensils(input.utensils);

  const recipe = await prisma.recipe.create({
    data: {
      title: input.title,
      description: input.description,
      instructions: input.instructions,
      authorId,
      dietaryType: input.dietaryType,
      cuisineRegion: input.cuisineRegion,
      courseType: input.courseType,
      prepTimeMins: input.prepTimeMins,
      cookTimeMins: input.cookTimeMins,
      totalTimeMins: input.prepTimeMins + input.cookTimeMins,
      servings: input.servings,
      costPerServing: input.costPerServing,
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      difficulty: input.difficulty,
      ingredients: { create: ingredientLinks },
      utensils: { create: utensilLinks },
    },
    include: RECIPE_DETAIL_INCLUDE,
  });

  await notifyFollowersOfNewRecipe(recipe.id, authorId);

  return recipe;
}

async function assertOwnerOrAdmin(recipeId: string, requesterId: string, isAdmin: boolean) {
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe || recipe.isRemoved) throw ApiError.notFound("Recipe not found");
  if (recipe.authorId !== requesterId && !isAdmin) {
    throw ApiError.forbidden("You can only modify your own recipes");
  }
  return recipe;
}

export async function updateRecipe(recipeId: string, requesterId: string, isAdmin: boolean, input: UpdateRecipeInput) {
  await assertOwnerOrAdmin(recipeId, requesterId, isAdmin);

  const data: Record<string, unknown> = { ...input };
  delete data.ingredients;
  delete data.utensils;

  if (input.prepTimeMins !== undefined || input.cookTimeMins !== undefined) {
    const current = await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId } });
    const prep = input.prepTimeMins ?? current.prepTimeMins;
    const cook = input.cookTimeMins ?? current.cookTimeMins;
    data.totalTimeMins = prep + cook;
  }

  if (input.ingredients) {
    await prisma.recipeIngredient.deleteMany({ where: { recipeId } });
    const links = await connectIngredients(input.ingredients);
    data.ingredients = { create: links };
  }
  if (input.utensils) {
    await prisma.recipeUtensil.deleteMany({ where: { recipeId } });
    const links = await connectUtensils(input.utensils);
    data.utensils = { create: links };
  }

  return prisma.recipe.update({ where: { id: recipeId }, data, include: RECIPE_DETAIL_INCLUDE });
}

export async function deleteRecipe(recipeId: string, requesterId: string, isAdmin: boolean) {
  await assertOwnerOrAdmin(recipeId, requesterId, isAdmin);
  await prisma.recipe.delete({ where: { id: recipeId } });
}

export async function addRecipeMedia(
  recipeId: string,
  requesterId: string,
  isAdmin: boolean,
  files: { path: string; mimetype: string }[],
) {
  await assertOwnerOrAdmin(recipeId, requesterId, isAdmin);

  const existingCount = await prisma.recipeMedia.count({ where: { recipeId } });
  const media = await prisma.$transaction(
    files.map((file, index) =>
      prisma.recipeMedia.create({
        data: {
          recipeId,
          type: file.mimetype.startsWith("video/") ? "VIDEO" : "PHOTO",
          url: `/uploads/${file.path.split("/").pop()}`,
          order: existingCount + index,
        },
      }),
    ),
  );
  return media;
}

/** Recency-weighted "trending" score, recalculated whenever a recipe is viewed. */
function computePopularityScore(viewCount: number, createdAt: Date): number {
  const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return viewCount / Math.pow(ageHours + 2, 1.5);
}

export async function getRecipeById(recipeId: string, viewerId?: string) {
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId }, include: RECIPE_DETAIL_INCLUDE });
  if (!recipe || recipe.isRemoved) throw ApiError.notFound("Recipe not found");

  if (viewerId !== recipe.authorId) {
    const viewCount = recipe.viewCount + 1;
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { viewCount, popularityScore: computePopularityScore(viewCount, recipe.createdAt) },
    });
    recipe.viewCount = viewCount;
  }

  return recipe;
}

export async function searchRecipes(query: SearchQuery) {
  const where: import("@/generated/prisma/client").Prisma.RecipeWhereInput = {
    isRemoved: false,
  };

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { author: { username: { contains: query.q, mode: "insensitive" } } },
    ];
  }
  if (query.dietaryType?.length) where.dietaryType = { in: query.dietaryType };
  if (query.cuisineRegion) where.cuisineRegion = { equals: query.cuisineRegion, mode: "insensitive" };
  if (query.courseType) where.courseType = { equals: query.courseType, mode: "insensitive" };
  if (query.difficulty) where.difficulty = query.difficulty;
  if (query.minCost !== undefined || query.maxCost !== undefined) {
    where.costPerServing = { gte: query.minCost, lte: query.maxCost };
  }
  if (query.minTimeMins !== undefined || query.maxTimeMins !== undefined) {
    where.totalTimeMins = { gte: query.minTimeMins, lte: query.maxTimeMins };
  }
  if (query.minCalories !== undefined || query.maxCalories !== undefined) {
    where.calories = { gte: query.minCalories, lte: query.maxCalories };
  }
  // "Search by ingredients/utensils I have": every REQUIRED ingredient/utensil on the
  // recipe must be in the set the user selected (none of them may fall outside it).
  if (query.ingredients?.length) {
    const lower = query.ingredients.map((i) => i.toLowerCase());
    where.ingredients = { none: { optional: false, ingredient: { name: { notIn: lower } } } };
  }
  if (query.utensils?.length) {
    const lower = query.utensils.map((u) => u.toLowerCase());
    where.utensils = { none: { utensil: { name: { notIn: lower } } } };
  }

  const orderBy =
    query.sort === "popularity"
      ? { popularityScore: "desc" as const }
      : query.sort === "rating"
        ? { avgRating: "desc" as const }
        : { createdAt: "desc" as const };

  const [total, items] = await Promise.all([
    prisma.recipe.count({ where }),
    prisma.recipe.findMany({
      where,
      include: RECIPE_CARD_INCLUDE,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}
