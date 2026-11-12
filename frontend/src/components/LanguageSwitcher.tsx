"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { locales, localeLabels } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      aria-label="Language"
      value={locale}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        });
      }}
      className="cursor-pointer rounded-full border border-cream/40 bg-transparent px-3 py-1.5 text-sm text-cream focus:outline-none"
    >
      {locales.map((l) => (
        <option key={l} value={l} className="text-ink">
          {localeLabels[l]}
        </option>
      ))}
    </select>
  );
}
