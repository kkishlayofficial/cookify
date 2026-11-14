import { z } from "zod";

export const dietaryTypeEnum = z.enum([
  "VEGAN",
  "VEGETARIAN",
  "EGGETARIAN",
  "PESCETARIAN",
  "JAIN",
  "NON_VEGETARIAN",
]);

export const difficultyEnum = z.enum(["EASY", "MEDIUM", "HARD"]);

const ingredientInput = z.object({
  name: z.string().min(1).max(80),
  quantity: z.string().max(60).optional(),
  optional: z.coerce.boolean().default(false),
});

export const createRecipeSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  instructions: z.array(z.string().min(1).max(1000)).min(1, "At least one instruction step is required"),
  dietaryType: dietaryTypeEnum,
  cuisineRegion: z.string().max(60).optional(),
  courseType: z.string().max(60).optional(),
  prepTimeMins: z.coerce.number().int().min(0).max(1440),
  cookTimeMins: z.coerce.number().int().min(0).max(1440),
  servings: z.coerce.number().int().min(1).max(100).default(1),
  costPerServing: z.coerce.number().min(0).max(100000),
  calories: z.coerce.number().int().min(0).max(20000),
  protein: z.coerce.number().min(0).max(2000).optional(),
  carbs: z.coerce.number().min(0).max(2000).optional(),
  fat: z.coerce.number().min(0).max(2000).optional(),
  difficulty: difficultyEnum.default("MEDIUM"),
  ingredients: z.array(ingredientInput).default([]),
  utensils: z.array(z.string().min(1).max(60)).default([]),
});

export const updateRecipeSchema = createRecipeSchema.partial();

const toArray = (v: unknown) => (Array.isArray(v) ? v : v === undefined ? undefined : [v]);

export const searchRecipesSchema = z.object({
  q: z.string().max(120).optional(),
  ingredients: z.preprocess(toArray, z.array(z.string()).optional()),
  utensils: z.preprocess(toArray, z.array(z.string()).optional()),
  dietaryType: z.preprocess(toArray, z.array(dietaryTypeEnum).optional()),
  cuisineRegion: z.string().max(60).optional(),
  courseType: z.string().max(60).optional(),
  minCost: z.coerce.number().min(0).optional(),
  maxCost: z.coerce.number().min(0).optional(),
  minTimeMins: z.coerce.number().int().min(0).optional(),
  maxTimeMins: z.coerce.number().int().min(0).optional(),
  minCalories: z.coerce.number().int().min(0).optional(),
  maxCalories: z.coerce.number().int().min(0).optional(),
  difficulty: difficultyEnum.optional(),
  sort: z.enum(["popularity", "newest", "rating"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const ratingSchema = z.object({
  // Half-star increments: 0.5, 1, 1.5, ... 5.
  stars: z.coerce.number().min(0.5).max(5).multipleOf(0.5),
});
