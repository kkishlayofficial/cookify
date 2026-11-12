"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Header() {
  const t = useTranslations("Nav");
  const { user, logout } = useAuth();

  return (
    <header className="bg-terracotta text-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="font-heading text-2xl font-semibold tracking-tight">
          COOKify
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium sm:flex">
          <Link href="/" className="hover:underline">
            {t("explore")}
          </Link>
          {user && (
            <>
              <Link href="/recipes/new" className="hover:underline">
                {t("upload")}
              </Link>
              <Link href="/chat" className="hover:underline">
                {t("chat")}
              </Link>
              <Link href="/notifications" className="hover:underline">
                {t("notifications")}
              </Link>
              <Link href={`/profile/${user.username}`} className="hover:underline">
                {t("profile")}
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <button
              onClick={() => logout()}
              className="cursor-pointer rounded-full border border-cream/50 px-4 py-1.5 text-sm font-medium hover:bg-cream/10"
            >
              {t("logout")}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-cream/10">
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-cream px-4 py-1.5 text-sm font-medium text-terracotta-dark hover:bg-cream/90"
              >
                {t("signup")}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav row */}
      {user && (
        <nav className="flex items-center gap-4 overflow-x-auto border-t border-cream/20 px-4 py-2 text-sm font-medium sm:hidden">
          <Link href="/recipes/new">{t("upload")}</Link>
          <Link href="/chat">{t("chat")}</Link>
          <Link href="/notifications">{t("notifications")}</Link>
          <Link href={`/profile/${user.username}`}>{t("profile")}</Link>
        </nav>
      )}
    </header>
  );
}
