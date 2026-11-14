"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiUrl, ApiRequestError } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { TagInput } from "@/components/ui/TagInput";
import { DIETARY_LABELS } from "@/lib/dietary";
import type { DietaryType, Difficulty, Recipe } from "@/lib/types";

type IngredientRow = { name: string; quantity: string; optional: boolean };

type FormState = {
  title: string;
  description: string;
  instructions: string[];
  dietaryType: DietaryType;
  cuisineRegion: string;
  courseType: string;
  prepTimeMins: number;
  cookTimeMins: number;
  servings: number;
  costPerServing: number;
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  difficulty: Difficulty;
  ingredients: IngredientRow[];
  utensils: string[];
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  instructions: [""],
  dietaryType: "VEGETARIAN",
  cuisineRegion: "",
  courseType: "",
  prepTimeMins: 10,
  cookTimeMins: 20,
  servings: 2,
  costPerServing: 2,
  calories: 300,
  protein: "",
  carbs: "",
  fat: "",
  difficulty: "MEDIUM",
  ingredients: [{ name: "", quantity: "", optional: false }],
  utensils: [],
};

function recipeToForm(recipe: Recipe): FormState {
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    instructions: recipe.instructions.length ? recipe.instructions : [""],
    dietaryType: recipe.dietaryType,
    cuisineRegion: recipe.cuisineRegion ?? "",
    courseType: recipe.courseType ?? "",
    prepTimeMins: recipe.prepTimeMins,
    cookTimeMins: recipe.cookTimeMins,
    servings: recipe.servings,
    costPerServing: Number(recipe.costPerServing),
    calories: recipe.calories,
    protein: recipe.protein ?? "",
    carbs: recipe.carbs ?? "",
    fat: recipe.fat ?? "",
    difficulty: recipe.difficulty,
    ingredients: recipe.ingredients?.length
      ? recipe.ingredients.map((ri) => ({ name: ri.ingredient.name, quantity: ri.quantity ?? "", optional: ri.optional }))
      : [{ name: "", quantity: "", optional: false }],
    utensils: recipe.utensils?.map((ru) => ru.utensil.name) ?? [],
  };
}

export function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(recipe ? recipeToForm(recipe) : EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateInstruction(index: number, value: string) {
    const next = [...form.instructions];
    next[index] = value;
    update("instructions", next);
  }

  function updateIngredient(index: number, patch: Partial<IngredientRow>) {
    const next = [...form.ingredients];
    next[index] = { ...next[index], ...patch };
    update("ingredients", next);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setFiles(Array.from(e.target.files));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        instructions: form.instructions.filter((s) => s.trim().length > 0),
        dietaryType: form.dietaryType,
        cuisineRegion: form.cuisineRegion || undefined,
        courseType: form.courseType || undefined,
        prepTimeMins: form.prepTimeMins,
        cookTimeMins: form.cookTimeMins,
        servings: form.servings,
        costPerServing: form.costPerServing,
        calories: form.calories,
        protein: form.protein ? Number(form.protein) : undefined,
        carbs: form.carbs ? Number(form.carbs) : undefined,
        fat: form.fat ? Number(form.fat) : undefined,
        difficulty: form.difficulty,
        ingredients: form.ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({ name: i.name.trim(), quantity: i.quantity || undefined, optional: i.optional })),
        utensils: form.utensils,
      };

      const result = recipe
        ? await apiFetch<{ recipe: Recipe }>(`/api/recipes/${recipe.id}`, { method: "PATCH", body: payload })
        : await apiFetch<{ recipe: Recipe }>("/api/recipes", { method: "POST", body: payload });

      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f));
        await apiFetch(`/api/recipes/${result.recipe.id}/media`, { method: "POST", body: formData, isFormData: true });
      }

      router.push(`/recipes/${result.recipe.id}`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to save recipe");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && <p className="rounded-lg bg-berry-light px-3 py-2 text-sm text-berry">{error}</p>}

      <Input
        placeholder="Recipe title"
        value={form.title}
        onChange={(e) => update("title", e.target.value)}
        required
      />
      <Textarea
        placeholder="Description"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        rows={3}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Select value={form.dietaryType} onChange={(e) => update("dietaryType", e.target.value as DietaryType)}>
          {(["VEGAN", "VEGETARIAN", "EGGETARIAN", "PESCETARIAN", "JAIN", "NON_VEGETARIAN"] as DietaryType[]).map((d) => (
            <option key={d} value={d}>
              {DIETARY_LABELS[d]}
            </option>
          ))}
        </Select>
        <Select value={form.difficulty} onChange={(e) => update("difficulty", e.target.value as Difficulty)}>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </Select>
        <Input
          placeholder="Cuisine / region"
          value={form.cuisineRegion}
          onChange={(e) => update("cuisineRegion", e.target.value)}
        />
        <Input placeholder="Course type" value={form.courseType} onChange={(e) => update("courseType", e.target.value)} />
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Prep time
          <Input type="number" min={0} value={form.prepTimeMins} onChange={(e) => update("prepTimeMins", Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Cook time
          <Input type="number" min={0} value={form.cookTimeMins} onChange={(e) => update("cookTimeMins", Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Servings
          <Input type="number" min={1} value={form.servings} onChange={(e) => update("servings", Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Cost per serving
          <Input
            type="number"
            min={0}
            step={0.1}
            value={form.costPerServing}
            onChange={(e) => update("costPerServing", Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          cal
          <Input type="number" min={0} value={form.calories} onChange={(e) => update("calories", Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Protein (g)
          <Input value={form.protein} onChange={(e) => update("protein", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Carbs (g)
          <Input value={form.carbs} onChange={(e) => update("carbs", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Fat (g)
          <Input value={form.fat} onChange={(e) => update("fat", e.target.value)} />
        </label>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">Ingredients</label>
        <div className="flex flex-col gap-2">
          {form.ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Ingredient name"
                value={ing.name}
                onChange={(e) => updateIngredient(i, { name: e.target.value })}
              />
              <Input
                placeholder="Quantity"
                value={ing.quantity}
                onChange={(e) => updateIngredient(i, { quantity: e.target.value })}
                className="max-w-[120px]"
              />
              <label className="flex items-center gap-1 text-xs text-ink-soft">
                <input type="checkbox" checked={ing.optional} onChange={(e) => updateIngredient(i, { optional: e.target.checked })} />
                optional
              </label>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 cursor-pointer text-sm font-medium text-terracotta-dark"
          onClick={() => update("ingredients", [...form.ingredients, { name: "", quantity: "", optional: false }])}
        >
          + Add ingredient
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">Utensils</label>
        <TagInput value={form.utensils} onChange={(v) => update("utensils", v)} placeholder="Add utensil and press Enter" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">Instructions</label>
        <div className="flex flex-col gap-2">
          {form.instructions.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terracotta-light text-xs font-semibold text-terracotta-dark">
                {i + 1}
              </span>
              <Textarea value={step} onChange={(e) => updateInstruction(i, e.target.value)} rows={1} />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 cursor-pointer text-sm font-medium text-terracotta-dark"
          onClick={() => update("instructions", [...form.instructions, ""])}
        >
          + Add step
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">Photos / videos</label>
        <div
          className="cursor-pointer rounded-xl border-2 border-dashed border-ink/20 bg-white px-4 py-8 text-center text-sm text-ink-soft hover:border-terracotta"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setFiles(Array.from(e.dataTransfer.files));
          }}
        >
          Drag and drop photos or videos, or click to upload
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
        </div>
        {files.length > 0 && <p className="mt-2 text-xs text-ink-soft">{files.length} file(s) selected</p>}
        {recipe?.media.map((m) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={m.id} src={apiUrl(m.url)} alt="" className="mt-2 inline-block h-16 w-16 rounded-lg object-cover" />
        ))}
      </div>

      <Button type="submit" disabled={submitting} className="self-start">
        Publish recipe
      </Button>
    </form>
  );
}
