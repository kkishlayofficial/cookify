import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { apiUrl } from "@/lib/api";
import { DIETARY_LABELS } from "@/lib/dietary";
import type { Recipe } from "@/lib/types";

const VEG_DIETARY = new Set(["VEGAN", "VEGETARIAN", "EGGETARIAN", "JAIN"]);

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const cover = recipe.media[0];
  const isVeg = VEG_DIETARY.has(recipe.dietaryType);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Full-card link sits behind interactive children */}
      <Link href={`/recipes/${recipe.id}`} className="absolute inset-0 z-0" aria-label={recipe.title} />

      <div className="relative h-44 w-full bg-cream-dark">
        {cover ? (
          <Image
            src={cover.url.startsWith("/uploads") ? apiUrl(cover.url) : cover.url}
            alt={recipe.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🍲</div>
        )}
        <div className="absolute left-3 top-3">
          <Badge tone={isVeg ? "sage" : "berry"}>{DIETARY_LABELS[recipe.dietaryType]}</Badge>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col gap-2 p-4 pointer-events-none">
        <h3 className="font-heading text-lg font-semibold leading-snug text-ink group-hover:text-terracotta-dark">
          {recipe.title}
        </h3>
        <p className="text-xs text-ink-soft">
          by{" "}
          <Link
            href={`/profile/${recipe.author.username}`}
            className="pointer-events-auto font-medium text-terracotta hover:underline"
          >
            {recipe.author.username}
          </Link>
        </p>

        <div className="mt-1 flex items-center gap-2">
          <StarRating value={Math.round(Number(recipe.avgRating) * 2) / 2} readOnly size="sm" />
          <span className="text-xs text-ink-soft">({recipe.ratingCount})</span>
          <span className="text-xs text-ink-soft" title="views">
            <svg className="mr-0.5 inline-block h-3.5 w-3.5 align-[-2px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {recipe.viewCount}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-2 text-xs text-ink-soft">
          <Badge>{recipe.totalTimeMins} min</Badge>
          <Badge>${Number(recipe.costPerServing).toFixed(2)}</Badge>
          <Badge>{recipe.calories} cal</Badge>
        </div>
      </div>
    </div>
  );
}
