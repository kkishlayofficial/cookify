"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type DevMail = {
  id: string;
  to: string;
  subject: string;
  body: string;
  previewUrl: string | null;
  createdAt: string;
};

export default function DevMailPage() {
  const [email, setEmail] = useState("");
  const [mail, setMail] = useState<DevMail[]>([]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiFetch<{ mail: DevMail[] }>(`/api/dev-mail?to=${encodeURIComponent(email)}`);
    setMail(res.mail);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 font-heading text-3xl font-semibold">Dev Mailbox</h1>
      <p className="mb-6 text-sm text-ink-soft">
        For local testing/demo purposes only. Shows every email the backend has &quot;sent&quot; via its Ethereal test
        account (2FA codes, password resets, follow/rating/warning/ban notifications).
      </p>
      <form onSubmit={search} className="mb-6 flex gap-2">
        <Input placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit">Search</Button>
      </form>
      <div className="flex flex-col gap-3">
        {mail.map((m) => (
          <Card key={m.id} className="p-4">
            <p className="text-xs text-ink-soft">
              {new Date(m.createdAt).toLocaleString()} &middot; to {m.to}
            </p>
            <p className="mt-1 font-medium">{m.subject}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{m.body}</p>
            {m.previewUrl && (
              <a href={m.previewUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-terracotta-dark underline">
                View full email
              </a>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
