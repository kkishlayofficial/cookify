"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FilterPanel } from "@/components/FilterPanel";
import { RecipeCard } from "@/components/RecipeCard";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";
import { DEFAULT_FILTERS, type RecipeFilters, type SearchResult } from "@/lib/types";

function buildQuery(filters: RecipeFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  filters.ingredients.forEach((i) => params.append("ingredients", i));
  filters.utensils.forEach((u) => params.append("utensils", u));
  filters.dietaryType.forEach((d) => params.append("dietaryType", d));
  if (filters.cuisineRegion) params.set("cuisineRegion", filters.cuisineRegion);
  if (filters.courseType) params.set("courseType", filters.courseType);
  params.set("minCost", String(filters.costRange[0]));
  params.set("maxCost", String(filters.costRange[1]));
  params.set("minTimeMins", String(filters.timeRange[0]));
  params.set("maxTimeMins", String(filters.timeRange[1]));
  params.set("minCalories", String(filters.calorieRange[0]));
  params.set("maxCalories", String(filters.calorieRange[1]));
  params.set("sort", filters.sort);
  return params.toString();
}

export default function ExplorePage() {
  const t = useTranslations();
  const [filters, setFilters] = useState<RecipeFilters>(DEFAULT_FILTERS);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);

  const runSearch = useCallback((current: RecipeFilters) => {
    setLoading(true);
    apiFetch<SearchResult>(`/api/recipes?${buildQuery(current)}`)
      .then(setResult)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Initial data fetch on mount - the standard, correct use of an effect
    // for synchronizing with an external system (the backend API). runSearch
    // is intentionally omitted from deps: it's stable (wrapped in
    // useCallback with no deps) and this should only run once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runSearch(DEFAULT_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-3xl font-semibold">{t("Explore.title")}</h1>
        <form
          className="flex w-full max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(filters);
          }}
        >
          <Input
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder={t("Explore.searchPlaceholder")}
          />
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <FilterPanel filters={filters} onChange={setFilters} onApply={() => runSearch(filters)} />

        <div>
          {loading ? (
            <p className="text-ink-soft">{t("Common.loading")}</p>
          ) : !result || result.items.length === 0 ? (
            <p className="text-ink-soft">{t("Explore.noResults")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
