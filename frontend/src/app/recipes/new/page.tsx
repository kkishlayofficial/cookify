"use client";

import { useTranslations } from "next-intl";
import { RecipeForm } from "@/components/RecipeForm";

export default function NewRecipePage() {
  const t = useTranslations("Upload");
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-3xl font-semibold">{t("title")}</h1>
      <RecipeForm />
    </div>
  );
}
