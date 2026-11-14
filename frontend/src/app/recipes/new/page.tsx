"use client";

import { RecipeForm } from "@/components/RecipeForm";

export default function NewRecipePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-3xl font-semibold">Upload a recipe</h1>
      <RecipeForm />
    </div>
  );
}
