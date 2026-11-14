"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { ApiRequestError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { PASSWORD_RULES } from "@/lib/passwordRules";

export default function SignupPage() {
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
      setError(err instanceof ApiRequestError ? err.message : "Create your account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h1 className="font-heading text-2xl font-semibold">Create your account</h1>
          {error && <p className="rounded-lg bg-berry-light px-3 py-2 text-sm text-berry">{error}</p>}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="-mt-2 text-xs text-ink-soft">{PASSWORD_RULES}</p>
          <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Textarea placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          <Button type="submit" disabled={submitting}>
            Create account
          </Button>
          <p className="text-center text-sm text-ink-soft">
            Already have an account?{" "}
            <Link href="/login" className="text-terracotta-dark hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
