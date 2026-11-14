"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { MediaCarousel } from "@/components/ui/MediaCarousel";
import { CommentSection } from "@/components/CommentSection";
import { DIETARY_LABELS } from "@/lib/dietary";
import type { PublicProfile, Recipe } from "@/lib/types";

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [saved, setSaved] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiFetch<{ recipe: Recipe }>(`/api/recipes/${id}`)
      .then((res) => setRecipe(res.recipe))
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    if (recipe) {
      apiFetch<{ profile: PublicProfile }>(`/api/users/${recipe.author.username}`).then((res) => setProfile(res.profile));
    }
  }, [recipe]);

  if (notFound) return <p className="text-ink-soft">Recipe not found.</p>;
  if (!recipe) return <p className="text-ink-soft">Loading...</p>;

  const isOwner = user?.id === recipe.authorId;

  async function rate(stars: number) {
    setMyRating(stars);
    const res = await apiFetch<{ avgRating: number; ratingCount: number }>(`/api/recipes/${id}/rating`, {
      method: "POST",
      body: { stars },
    });
    setRecipe((prev) => (prev ? { ...prev, avgRating: String(res.avgRating), ratingCount: res.ratingCount } : prev));
  }

  async function toggleFollow() {
    if (!profile) return;
    if (profile.isFollowing) {
      await apiFetch(`/api/users/${recipe!.author.username}/follow`, { method: "DELETE" });
    } else {
      await apiFetch(`/api/users/${recipe!.author.username}/follow`, { method: "POST" });
    }
    setProfile({ ...profile, isFollowing: !profile.isFollowing });
  }

  async function toggleSave() {
    if (saved) {
      await apiFetch(`/api/users/saved/${id}`, { method: "DELETE" });
    } else {
      await apiFetch(`/api/users/saved/${id}`, { method: "POST" });
    }
    setSaved(!saved);
  }

  async function handleDelete() {
    try {
      await apiFetch(`/api/recipes/${id}`, { method: "DELETE" });
      router.push("/");
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="terracotta">{DIETARY_LABELS[recipe.dietaryType]}</Badge>
          {recipe.cuisineRegion && <Badge>{recipe.cuisineRegion}</Badge>}
          {recipe.courseType && <Badge>{recipe.courseType}</Badge>}
        </div>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">{recipe.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
          <Link href={`/profile/${recipe.author.username}`} className="font-medium text-terracotta-dark hover:underline">
            by {recipe.author.username}
          </Link>
          <StarRating value={Math.round(Number(recipe.avgRating) * 2) / 2} readOnly size="sm" />
          <span>({recipe.ratingCount})</span>
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {recipe.viewCount} views
          </span>
        </div>
        {recipe.description && <p className="mt-3 text-ink-soft">{recipe.description}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {user && !isOwner && profile && (
          <Button variant="secondary" onClick={toggleFollow}>
            {profile.isFollowing ? "Unfollow" : "Follow"}
          </Button>
        )}
        {user && (
          <Button variant="secondary" onClick={toggleSave}>
            {saved ? "Remove from saved" : "Save recipe"}
          </Button>
        )}
        {isOwner && (
          <>
            <Link href={`/recipes/${id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-8 [grid-template-areas:'media'_'instructions'_'info'] sm:grid-cols-3 sm:items-start sm:gap-x-8 sm:gap-y-6 sm:[grid-template-areas:'media_instructions_instructions'_'info_instructions_instructions']">
        <div className="-mx-4 sm:mx-0 [grid-area:media]">
          {recipe.media.length > 0 ? (
            <MediaCarousel media={recipe.media} alt={recipe.title} />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-ink/5 text-sm text-ink-soft sm:aspect-[16/9]">
              No image available
            </div>
          )}
        </div>

        <div className="[grid-area:instructions]">
          {recipe.instructions.length > 0 && (
            <>
              <h2 className="mb-2 font-heading text-xl font-semibold">Instructions</h2>
              <ol className="flex flex-col gap-3">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-terracotta-light text-sm font-semibold text-terracotta-dark">
                      {i + 1}
                    </span>
                    <p className="text-ink-soft">{step}</p>
                  </li>
                ))}
              </ol>
            </>
          )}

          {user && (
            <div className="mt-6">
              <p className="mb-1 text-sm font-medium text-ink-soft">Your rating</p>
              <StarRating value={myRating} onChange={rate} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 [grid-area:info]">
          {!!recipe.ingredients?.length && (
            <div>
              <h2 className="mb-2 font-heading text-xl font-semibold">Ingredients</h2>
              <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
                {recipe.ingredients.map((ri) => (
                  <li key={ri.ingredient.id}>
                    {ri.ingredient.name}
                    {ri.quantity ? ` — ${ri.quantity}` : ""}
                    {ri.optional ? " (optional)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!recipe.utensils?.length && (
            <div>
              <h2 className="mb-2 font-heading text-xl font-semibold">Utensils</h2>
              <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
                {recipe.utensils.map((ru) => <li key={ru.utensil.id}>{ru.utensil.name}</li>)}
              </ul>
            </div>
          )}

          <div>
            <h2 className="mb-2 font-heading text-xl font-semibold">Nutrition (per serving)</h2>
            <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
              <li>{recipe.calories} cal</li>
              {recipe.protein && <li>Protein: {recipe.protein}g</li>}
              {recipe.carbs && <li>Carbs: {recipe.carbs}g</li>}
              {recipe.fat && <li>Fat: {recipe.fat}g</li>}
            </ul>

            <ul className="mt-5 flex flex-col gap-1.5 text-sm text-ink-soft">
              <li>Prep time: {recipe.prepTimeMins} min</li>
              <li>Cook time: {recipe.cookTimeMins} min</li>
              <li>Total time: {recipe.totalTimeMins} min</li>
              <li>Cost per serving: ${Number(recipe.costPerServing).toFixed(2)}</li>
            </ul>
          </div>
        </div>
      </div>

      <CommentSection recipeId={id} />
    </div>
  );
}
