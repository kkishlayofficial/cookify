"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { ApiRequestError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const { login, verifyTwoFactor } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [devMailPreview, setDevMailPreview] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await login(email, password, rememberDevice);
      if (res.twoFactorRequired) {
        setPendingUserId(res.userId);
        setDevMailPreview(res.devMailPreviewUrl);
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t("loginTitle"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingUserId) return;
    setError(null);
    setSubmitting(true);
    try {
      await verifyTwoFactor(pendingUserId, code, rememberDevice);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t("twoFactorTitle"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8">
        {!pendingUserId ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <h1 className="font-heading text-2xl font-semibold">{t("loginTitle")}</h1>
            {error && <p className="rounded-lg bg-berry-light px-3 py-2 text-sm text-berry">{error}</p>}
            <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input
              type="password"
              placeholder={t("password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)} />
              {t("rememberDevice")}
            </label>
            <Button type="submit" disabled={submitting}>
              {t("loginButton")}
            </Button>
            <div className="flex justify-between text-sm">
              <Link href="/forgot-password" className="text-terracotta-dark hover:underline">
                {t("forgotPassword")}
              </Link>
              <span className="text-ink-soft">
                {t("noAccount")}{" "}
                <Link href="/signup" className="text-terracotta-dark hover:underline">
                  {t("signupButton")}
                </Link>
              </span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <h1 className="font-heading text-2xl font-semibold">{t("twoFactorTitle")}</h1>
            <p className="text-sm text-ink-soft">{t("twoFactorHint")}</p>
            {devMailPreview && (
              <a href={devMailPreview} target="_blank" rel="noreferrer" className="text-sm text-terracotta-dark underline">
                View the email (Ethereal preview)
              </a>
            )}
            {error && <p className="rounded-lg bg-berry-light px-3 py-2 text-sm text-berry">{error}</p>}
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("verificationCode")}
              maxLength={6}
              required
            />
            <Button type="submit" disabled={submitting}>
              {t("verifyButton")}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
