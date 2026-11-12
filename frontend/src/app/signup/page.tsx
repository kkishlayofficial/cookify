"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { ApiRequestError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const { signup, login } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ email, username, password, firstName: firstName || undefined, bio: bio || undefined });
      await login(email, password, true);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t("signupTitle"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h1 className="font-heading text-2xl font-semibold">{t("signupTitle")}</h1>
          {error && <p className="rounded-lg bg-berry-light px-3 py-2 text-sm text-berry">{error}</p>}
          <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input placeholder={t("username")} value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input
            type="password"
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="-mt-2 text-xs text-ink-soft">{t("passwordRules")}</p>
          <Input placeholder={t("firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Textarea placeholder={t("bio")} value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          <Button type="submit" disabled={submitting}>
            {t("signupButton")}
          </Button>
          <p className="text-center text-sm text-ink-soft">
            {t("haveAccount")}{" "}
            <Link href="/login" className="text-terracotta-dark hover:underline">
              {t("loginButton")}
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
