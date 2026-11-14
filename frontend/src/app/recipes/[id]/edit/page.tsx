"use client";

import { use, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { RecipeForm } from "@/components/RecipeForm";
import type { Recipe } from "@/lib/types";

export default function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    apiFetch<{ recipe: Recipe }>(`/api/recipes/${id}`).then((res) => setRecipe(res.recipe));
  }, [id]);

  if (!recipe) return <p className="text-ink-soft">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-3xl font-semibold">Edit recipe</h1>
      <RecipeForm recipe={recipe} />
    </div>
  );
}
