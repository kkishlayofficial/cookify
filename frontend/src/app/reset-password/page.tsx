"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PASSWORD_RULES } from "@/lib/passwordRules";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/auth/reset-password", { method: "POST", body: { token, newPassword } });
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-8">
      <h1 className="font-heading text-2xl font-semibold">Reset your password</h1>
      {done ? (
        <p className="mt-4 text-sm text-sage">Password updated! Redirecting to login...</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {error && <p className="rounded-lg bg-berry-light px-3 py-2 text-sm text-berry">{error}</p>}
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <p className="-mt-2 text-xs text-ink-soft">{PASSWORD_RULES}</p>
          <Button type="submit" disabled={submitting || !token}>
            Save
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
