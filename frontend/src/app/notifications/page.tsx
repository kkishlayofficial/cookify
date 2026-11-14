"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import type { NotificationItem } from "@/lib/types";

const TYPE_ICONS: Record<string, string> = {
  NEW_RECIPE_FROM_FOLLOWED: "🍽️",
  WARNING: "⚠️",
  BAN: "⛔",
  RATING_RECEIVED: "⭐",
  NEW_COMMENT: "💬",
  NEW_MESSAGE: "✉️",
};

function describe(n: NotificationItem): string {
  const payload = n.payload as Record<string, unknown>;
  switch (n.type) {
    case "NEW_RECIPE_FROM_FOLLOWED":
      return payload.event === "NEW_FOLLOWER"
        ? `${payload.followerUsername} started following you`
        : `${payload.authorUsername} uploaded "${payload.recipeTitle}"`;
    case "WARNING":
      return `Warning: ${payload.reason}`;
    case "BAN":
      return "Your account was banned for repeated policy violations";
    case "RATING_RECEIVED":
      return `${payload.fromUsername} rated your recipe ${payload.stars}\u2605`;
    case "NEW_COMMENT":
      return `${payload.fromUsername} commented on your recipe`;
    default:
      return n.type;
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    apiFetch<{ notifications: NotificationItem[] }>("/api/notifications").then((res) => setNotifications(res.notifications));
  }, []);

  async function markRead(id: string) {
    await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  }

  async function markAllRead() {
    await apiFetch("/api/notifications/read-all", { method: "POST" });
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
  }

  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold">Notifications</h1>
        {hasUnread && (
          <button onClick={markAllRead} className="cursor-pointer text-sm text-terracotta-dark hover:underline">
            Mark all as read
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <p className="text-ink-soft">You&apos;re all caught up.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`flex items-center justify-between gap-3 p-4 ${n.readAt ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{TYPE_ICONS[n.type] ?? "🔔"}</span>
                <p className="text-sm">{describe(n)}</p>
              </div>
              {!n.readAt && (
                <button onClick={() => markRead(n.id)} className="cursor-pointer text-xs text-terracotta-dark hover:underline">
                  Mark as read
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
