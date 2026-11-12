"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiUrl, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { Comment } from "@/lib/types";

export function CommentSection({ recipeId }: { recipeId: string }) {
  const t = useTranslations("Recipe");
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ comments: Comment[] }>(`/api/comments/recipe/${recipeId}`).then((res) => setComments(res.comments));
  }, [recipeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ comment: Comment }>(`/api/comments/recipe/${recipeId}`, {
        method: "POST",
        body: { body },
      });
      setComments((prev) => [res.comment, ...prev]);
      setBody("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t("addComment"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold">{t("comments")}</h2>

      {user && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {error && <p className="rounded-lg bg-berry-light px-3 py-2 text-sm text-berry">{error}</p>}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("addComment")}
            rows={2}
            required
          />
          <Button type="submit" disabled={submitting} className="self-end">
            {t("postComment")}
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 border-b border-ink/10 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={comment.user.avatarUrl ? apiUrl(comment.user.avatarUrl) : "/avatar-placeholder.svg"}
              alt={comment.user.username}
              className="h-9 w-9 rounded-full bg-cream-dark object-cover"
            />
            <div>
              <p className="text-sm font-medium">{comment.user.username}</p>
              <p className="text-sm text-ink-soft">{comment.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
