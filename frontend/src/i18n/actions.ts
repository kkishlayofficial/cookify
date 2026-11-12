"use server";

import { cookies } from "next/headers";
import { locales, type Locale } from "@/i18n/config";

export async function setLocale(locale: string) {
  if (!(locales as readonly string[]).includes(locale)) return;
  const store = await cookies();
  store.set("locale", locale as Locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });
}
