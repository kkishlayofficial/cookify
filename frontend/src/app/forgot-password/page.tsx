"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null | false>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ devMailPreviewUrl: string | null }>("/api/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setSent(res.devMailPreviewUrl);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8">
        <h1 className="font-heading text-2xl font-semibold">{t("forgotPassword")}</h1>
        {sent !== false ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-ink-soft">
              If that email exists, we&apos;ve sent a reset link.
            </p>
            {sent && (
              <a href={sent} target="_blank" rel="noreferrer" className="text-sm text-terracotta-dark underline">
                View the email (Ethereal preview)
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {error && <p className="rounded-lg bg-berry-light px-3 py-2 text-sm text-berry">{error}</p>}
            <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" disabled={submitting}>
              {t("sendResetLink")}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
