import { Router } from "express";
import { param } from "@/lib/params";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "@/middleware/auth";
import { validate, getValidatedQuery } from "@/middleware/validate";
import { uploadRecipeMedia } from "@/middleware/upload";
import * as recipesService from "@/modules/recipes/recipes.service";
import * as ratingsService from "@/modules/recipes/ratings.service";
import { createRecipeSchema, ratingSchema, searchRecipesSchema, updateRecipeSchema } from "@/modules/recipes/recipes.validation";

export const recipesRouter = Router();

recipesRouter.get("/", optionalAuth, validate({ query: searchRecipesSchema }), async (req: AuthenticatedRequest, res) => {
  const query = getValidatedQuery<Parameters<typeof recipesService.searchRecipes>[0]>(req);
  const result = await recipesService.searchRecipes(query, req.user?.id);
  res.json(result);
});

recipesRouter.post("/", requireAuth, validate({ body: createRecipeSchema }), async (req: AuthenticatedRequest, res) => {
  const recipe = await recipesService.createRecipe(req.user!.id, req.body);
  res.status(201).json({ recipe });
});

recipesRouter.get("/:id", optionalAuth, async (req: AuthenticatedRequest, res) => {
  const recipe = await recipesService.getRecipeById(param(req, "id"), req.user?.id);
  res.json({ recipe });
});

recipesRouter.patch("/:id", requireAuth, validate({ body: updateRecipeSchema }), async (req: AuthenticatedRequest, res) => {
  const recipe = await recipesService.updateRecipe(param(req, "id"), req.user!.id, req.user!.role === "ADMIN", req.body);
  res.json({ recipe });
});

recipesRouter.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await recipesService.deleteRecipe(param(req, "id"), req.user!.id, req.user!.role === "ADMIN");
  res.status(204).send();
});

recipesRouter.post(
  "/:id/media",
  requireAuth,
  uploadRecipeMedia.array("files", 10),
  async (req: AuthenticatedRequest, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const media = await recipesService.addRecipeMedia(param(req, "id"), req.user!.id, req.user!.role === "ADMIN", files);
    res.status(201).json({ media });
  },
);

recipesRouter.post("/:id/rating", requireAuth, validate({ body: ratingSchema }), async (req: AuthenticatedRequest, res) => {
  const result = await ratingsService.rateRecipe(param(req, "id"), req.user!.id, req.body.stars);
  res.json(result);
});
