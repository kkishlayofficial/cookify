import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { apiUrl } from "@/lib/api";
import type { Recipe } from "@/lib/types";

const VEG_DIETARY = new Set(["VEGAN", "VEGETARIAN", "EGGETARIAN", "JAIN"]);

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const t = useTranslations();
  const cover = recipe.media[0];
  const isVeg = VEG_DIETARY.has(recipe.dietaryType);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
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
          <Badge tone={isVeg ? "sage" : "berry"}>{t(`Dietary.${recipe.dietaryType}`)}</Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-lg font-semibold leading-snug text-ink group-hover:text-terracotta-dark">
          {recipe.title}
        </h3>
        <p className="text-xs text-ink-soft">
          {t("Recipe.by")} {recipe.author.username}
        </p>

        <div className="mt-1 flex items-center gap-2">
          <StarRating value={Math.round(Number(recipe.avgRating))} readOnly size="sm" />
          <span className="text-xs text-ink-soft">({recipe.ratingCount})</span>
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-2 text-xs text-ink-soft">
          <Badge>{recipe.totalTimeMins} {t("Common.minutes")}</Badge>
          <Badge>${Number(recipe.costPerServing).toFixed(2)}</Badge>
          <Badge>{recipe.calories} {t("Common.calories")}</Badge>
        </div>
      </div>
    </Link>
  );
}
