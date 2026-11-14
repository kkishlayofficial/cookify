"use client";

import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { TagInput } from "@/components/ui/TagInput";
import { DualRangeSlider } from "@/components/ui/DualRangeSlider";
import { Button } from "@/components/ui/Button";
import { DIETARY_LABELS } from "@/lib/dietary";
import type { DietaryType, RecipeFilters, SortOption } from "@/lib/types";
import { VEG_DIETARY_TYPES } from "@/lib/types";

const DIETARY_TYPES: DietaryType[] = ["VEGAN", "VEGETARIAN", "EGGETARIAN", "PESCETARIAN", "JAIN", "NON_VEGETARIAN"];

type Props = {
  filters: RecipeFilters;
  onChange: (next: RecipeFilters) => void;
  onApply: (next?: RecipeFilters) => void;
  onReset: () => void;
};

export function FilterPanel({ filters, onChange, onApply, onReset }: Props) {
  function toggleDietary(type: DietaryType) {
    const has = filters.dietaryType.includes(type);
    onChange({
      ...filters,
      dietaryType: has ? filters.dietaryType.filter((d) => d !== type) : [...filters.dietaryType, type],
    });
  }

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold">Filters</h2>
        <div className="flex rounded-full border border-ink/15 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => { const next = { ...filters, vegOnly: false }; onChange(next); onApply(next); }}
            className={`rounded-full px-3 py-1 transition-colors ${
              !filters.vegOnly ? "bg-terracotta text-cream" : "text-ink-soft hover:text-ink"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => {
              const next = {
                ...filters,
                vegOnly: true,
                dietaryType: filters.dietaryType.filter((d) => VEG_DIETARY_TYPES.includes(d)),
              };
              onChange(next);
              onApply(next);
            }}
            className={`rounded-full px-3 py-1 transition-colors ${
              filters.vegOnly ? "bg-sage text-cream" : "text-ink-soft hover:text-ink"
            }`}
          >
            Veg
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">Ingredients I have</label>
        <TagInput
          value={filters.ingredients}
          onChange={(v) => onChange({ ...filters, ingredients: v })}
          placeholder="Add ingredient and press Enter"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">Utensils I have</label>
        <TagInput
          value={filters.utensils}
          onChange={(v) => onChange({ ...filters, utensils: v })}
          placeholder="Add utensil and press Enter"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">Diet</label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_TYPES.map((type) => {
            const active = filters.dietaryType.includes(type);
            const disabled = filters.vegOnly && !VEG_DIETARY_TYPES.includes(type);
            return (
              <button
                key={type}
                type="button"
                disabled={disabled}
                onClick={() => toggleDietary(type)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  disabled
                    ? "cursor-not-allowed border-ink/10 bg-ink/5 text-ink-soft/50"
                    : "cursor-pointer " +
                      (active
                        ? "border-terracotta bg-terracotta text-cream"
                        : "border-ink/15 bg-white text-ink-soft hover:border-terracotta/50")
                }`}
              >
                {DIETARY_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">Cost per serving</label>
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
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">Total time (min)</label>
        <DualRangeSlider
          min={0}
          max={180}
          step={5}
          value={filters.timeRange}
          onChange={(v) => onChange({ ...filters, timeRange: v })}
          formatValue={(n) => `${n} min`}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">Calories</label>
        <DualRangeSlider
          min={0}
          max={2000}
          step={50}
          value={filters.calorieRange}
          onChange={(v) => onChange({ ...filters, calorieRange: v })}
          formatValue={(n) => `${n} cal`}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">Sort by</label>
        <Select value={filters.sort} onChange={(e) => onChange({ ...filters, sort: e.target.value as SortOption })}>
          <option value="newest">Newest</option>
          <option value="popularity">Most popular</option>
          <option value="rating">Top rated</option>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Button type="button" onClick={() => onApply(filters)} className="w-full">
          Search
        </Button>
        <Button type="button" variant="ghost" onClick={onReset} className="w-full">
          Reset filters
        </Button>
      </div>
    </Card>
  );
}
