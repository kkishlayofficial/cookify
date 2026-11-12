"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { TagInput } from "@/components/ui/TagInput";
import { DualRangeSlider } from "@/components/ui/DualRangeSlider";
import { Button } from "@/components/ui/Button";
import type { DietaryType, RecipeFilters, SortOption } from "@/lib/types";

const DIETARY_TYPES: DietaryType[] = ["VEGAN", "VEGETARIAN", "EGGETARIAN", "PESCETARIAN", "JAIN", "NON_VEGETARIAN"];

type Props = {
  filters: RecipeFilters;
  onChange: (next: RecipeFilters) => void;
  onApply: () => void;
};

export function FilterPanel({ filters, onChange, onApply }: Props) {
  const t = useTranslations();

  function toggleDietary(type: DietaryType) {
    const has = filters.dietaryType.includes(type);
    onChange({
      ...filters,
      dietaryType: has ? filters.dietaryType.filter((d) => d !== type) : [...filters.dietaryType, type],
    });
  }

  return (
    <Card className="flex flex-col gap-5 p-5">
      <h2 className="font-heading text-lg font-semibold">{t("Explore.filters")}</h2>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">{t("Explore.ingredientsIHave")}</label>
        <TagInput
          value={filters.ingredients}
          onChange={(v) => onChange({ ...filters, ingredients: v })}
          placeholder={t("Explore.addIngredient")}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">{t("Explore.utensilsIHave")}</label>
        <TagInput
          value={filters.utensils}
          onChange={(v) => onChange({ ...filters, utensils: v })}
          placeholder={t("Explore.addUtensil")}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">{t("Explore.dietaryType")}</label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_TYPES.map((type) => {
            const active = filters.dietaryType.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleDietary(type)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-terracotta bg-terracotta text-cream"
                    : "border-ink/15 bg-white text-ink-soft hover:border-terracotta/50"
                }`}
              >
                {t(`Dietary.${type}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">{t("Explore.costRange")}</label>
        <DualRangeSlider
          min={0}
          max={20}
          step={0.5}
          value={filters.costRange}
          onChange={(v) => onChange({ ...filters, costRange: v })}
          formatValue={(n) => `$${n.toFixed(2)}`}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">{t("Explore.timeRange")}</label>
        <DualRangeSlider
          min={0}
          max={180}
          step={5}
          value={filters.timeRange}
          onChange={(v) => onChange({ ...filters, timeRange: v })}
          formatValue={(n) => `${n} ${t("Common.minutes")}`}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">{t("Explore.calorieRange")}</label>
        <DualRangeSlider
          min={0}
          max={2000}
          step={50}
          value={filters.calorieRange}
          onChange={(v) => onChange({ ...filters, calorieRange: v })}
          formatValue={(n) => `${n} ${t("Common.calories")}`}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">{t("Explore.sortBy")}</label>
        <Select value={filters.sort} onChange={(e) => onChange({ ...filters, sort: e.target.value as SortOption })}>
          <option value="newest">{t("Explore.sortNewest")}</option>
          <option value="popularity">{t("Explore.sortPopularity")}</option>
          <option value="rating">{t("Explore.sortRating")}</option>
        </Select>
      </div>

      <Button type="button" onClick={onApply} className="w-full">
        {t("Common.search")}
      </Button>
    </Card>
  );
}
