"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiUrl, ApiRequestError } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { CommentSection } from "@/components/CommentSection";
import type { PublicProfile, Recipe } from "@/lib/types";

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
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
  if (!recipe) return <p className="text-ink-soft">{t("Common.loading")}</p>;

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
          <Badge tone="terracotta">{t(`Dietary.${recipe.dietaryType}`)}</Badge>
          {recipe.cuisineRegion && <Badge>{recipe.cuisineRegion}</Badge>}
          {recipe.courseType && <Badge>{recipe.courseType}</Badge>}
        </div>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">{recipe.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
          <Link href={`/profile/${recipe.author.username}`} className="font-medium text-terracotta-dark hover:underline">
            {t("Recipe.by")} {recipe.author.username}
          </Link>
          <StarRating value={Math.round(Number(recipe.avgRating))} readOnly size="sm" />
          <span>({recipe.ratingCount})</span>
        </div>
        {recipe.description && <p className="mt-3 text-ink-soft">{recipe.description}</p>}
      </div>

      {recipe.media.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {recipe.media.map((m) =>
            m.type === "VIDEO" ? (
              <video key={m.id} controls className="aspect-square w-full rounded-xl object-cover">
                <source src={apiUrl(m.url)} />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m.id} src={apiUrl(m.url)} alt={recipe.title} className="aspect-square w-full rounded-xl object-cover" />
            ),
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {user && !isOwner && profile && (
          <Button variant="secondary" onClick={toggleFollow}>
            {profile.isFollowing ? t("Recipe.unfollow") : t("Recipe.follow")}
          </Button>
        )}
        {user && (
          <Button variant="secondary" onClick={toggleSave}>
            {saved ? t("Recipe.unsave") : t("Recipe.save")}
          </Button>
        )}
        {isOwner && (
          <>
            <Link href={`/recipes/${id}/edit`}>
              <Button variant="secondary">{t("Common.edit")}</Button>
            </Link>
            <Button variant="danger" onClick={handleDelete}>
              {t("Common.delete")}
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="mb-2 font-heading text-xl font-semibold">{t("Recipe.ingredients")}</h2>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
            {recipe.ingredients?.map((ri) => (
              <li key={ri.ingredient.id}>
                {ri.ingredient.name}
                {ri.quantity ? ` — ${ri.quantity}` : ""}
                {ri.optional ? " (optional)" : ""}
              </li>
            ))}
          </ul>

          <h2 className="mb-2 mt-5 font-heading text-xl font-semibold">{t("Recipe.utensils")}</h2>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
            {recipe.utensils?.map((ru) => <li key={ru.utensil.id}>{ru.utensil.name}</li>)}
          </ul>

          <h2 className="mb-2 mt-5 font-heading text-xl font-semibold">{t("Recipe.nutrition")}</h2>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
            <li>{recipe.calories} {t("Common.calories")}</li>
            {recipe.protein && <li>Protein: {recipe.protein}g</li>}
            {recipe.carbs && <li>Carbs: {recipe.carbs}g</li>}
            {recipe.fat && <li>Fat: {recipe.fat}g</li>}
          </ul>

          <ul className="mt-5 flex flex-col gap-1.5 text-sm text-ink-soft">
            <li>{t("Recipe.prepTime")}: {recipe.prepTimeMins} {t("Common.minutes")}</li>
            <li>{t("Recipe.cookTime")}: {recipe.cookTimeMins} {t("Common.minutes")}</li>
            <li>{t("Recipe.totalTime")}: {recipe.totalTimeMins} {t("Common.minutes")}</li>
            <li>{t("Recipe.cost")}: ${Number(recipe.costPerServing).toFixed(2)}</li>
          </ul>
        </div>

        <div className="sm:col-span-2">
          <h2 className="mb-2 font-heading text-xl font-semibold">{t("Recipe.instructions")}</h2>
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

          {user && (
            <div className="mt-6">
              <p className="mb-1 text-sm font-medium text-ink-soft">{t("Recipe.yourRating")}</p>
              <StarRating value={myRating} onChange={rate} />
            </div>
          )}

          <div className="mt-8">
            <CommentSection recipeId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
