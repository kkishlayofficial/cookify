"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiUrl } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { ChatMessage, Conversation, UserSearchResult } from "@/lib/types";

function ChatPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ conversations: Conversation[] }>("/api/chat/conversations").then((res) => setConversations(res.conversations));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    function onMessage(message: ChatMessage) {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    }

    // Only the sender's and the already-open conversation's rooms receive
    // "message:new"; the left-hand unread badge instead relies on
    // "chat:new-message", which is pushed to every participant regardless of
    // which conversation (if any) they currently have open. It only carries the
    // conversation id, so the list is re-fetched to pick up the new unread
    // count and last-message preview together.
    function onNewMessage({ conversationId }: { conversationId: string }) {
      if (conversationId === activeId) return;
      apiFetch<{ conversations: Conversation[] }>("/api/chat/conversations").then((res) => setConversations(res.conversations));
    }

    socket.on("message:new", onMessage);
    socket.on("chat:new-message", onNewMessage);
    return () => {
      socket.off("message:new", onMessage);
      socket.off("chat:new-message", onNewMessage);
    };
  }, [user, activeId]);

  useEffect(() => {
    if (!activeId) return;
    getSocket().emit("conversation:join", activeId);
    apiFetch<{ messages: ChatMessage[] }>(`/api/chat/conversations/${activeId}/messages`).then((res) => setMessages(res.messages));
    // Marks the messages in this conversation read server-side so the header's
    // unread badge (which re-syncs from the server on leaving /chat) stays accurate.
    apiFetch(`/api/chat/conversations/${activeId}/read`, { method: "POST" });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)));
    return () => {
      getSocket().emit("conversation:leave", activeId);
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Debounced live user search as the "new conversation" box is typed into.
  useEffect(() => {
    if (!userQuery.trim()) return;
    const handle = setTimeout(() => {
      apiFetch<{ users: UserSearchResult[] }>(`/api/users/search?q=${encodeURIComponent(userQuery.trim())}`).then((res) =>
        setUserResults(res.users),
      );
    }, 250);
    return () => clearTimeout(handle);
  }, [userQuery]);

  async function startConversation(username: string) {
    const res = await apiFetch<{ conversation: Conversation }>(`/api/chat/conversations/with/${username}`, {
      method: "POST",
    });
    setConversations((prev) => (prev.some((c) => c.id === res.conversation.id) ? prev : [res.conversation, ...prev]));
    setActiveId(res.conversation.id);
    setUserQuery("");
    setUserResults([]);
  }

  // Arriving from a profile page's "Message" button (/chat?with=<username>) opens
  // that conversation directly instead of landing on the empty inbox state.
  useEffect(() => {
    if (!user) return;
    const withUsername = searchParams.get("with");
    if (!withUsername) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startConversation(withUsername).then(() => {
      router.replace("/chat");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeId || !user) return;
    const body = draft.trim();
    // Optimistic update: show the message immediately without waiting for the
    // server echo. The `message:new` handler deduplicates by id, so the real
    // message replaces the placeholder once the server responds.
    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        conversationId: activeId,
        senderId: user.id,
        body,
        createdAt: new Date().toISOString(),
        sender: { id: user.id, username: user.username, avatarUrl: user.avatarUrl },
      },
    ]);
    setDraft("");
    getSocket().emit("message:send", { conversationId: activeId, body }, (res: { ok: boolean }) => {
      // Remove the optimistic placeholder. The server's message:new broadcast
      // adds the real message (with its server id) via the onMessage handler,
      // which deduplicates — keeping the placeholder around and also replacing
      // it caused two entries with the same server id.
      if (res?.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }
    });
  }

  if (!user) return <p className="text-ink-soft">Please log in to use chat.</p>;

  return (
    <div className="grid h-[70vh] grid-cols-1 overflow-hidden rounded-2xl border border-ink/10 bg-white sm:grid-cols-[260px_1fr]">
      <div className="flex flex-col border-r border-ink/10">
        <div className="relative border-b border-ink/10 p-3">
          <Input
            placeholder="Message a user by username"
            value={userQuery}
            onChange={(e) => {
              setUserQuery(e.target.value);
              if (!e.target.value.trim()) setUserResults([]);
            }}
          />
          {userResults.length > 0 && (
            <div className="absolute inset-x-3 top-full z-10 mt-1 overflow-hidden rounded-xl border border-ink/10 bg-white shadow-lg">
              {userResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => startConversation(u.username)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-cream"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u.avatarUrl ? apiUrl(u.avatarUrl) : "/avatar-placeholder.svg"}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                  <span className="text-sm font-medium">{u.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && <p className="p-3 text-sm text-ink-soft">No conversations yet.</p>}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-cream ${activeId === c.id ? "bg-cream" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.otherUser?.avatarUrl ? apiUrl(c.otherUser.avatarUrl) : "/avatar-placeholder.svg"}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${c.unreadCount > 0 ? "font-bold" : "font-medium"}`}>{c.otherUser?.username}</p>
                <p className={`truncate text-xs ${c.unreadCount > 0 ? "font-bold text-ink" : "text-ink-soft"}`}>
                  {c.lastMessage?.body}
                </p>
              </div>
              {c.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-terracotta px-1.5 text-xs font-semibold text-cream">
                  {c.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        {activeId ? (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      m.senderId === user.id ? "self-end bg-terracotta text-cream" : "self-start bg-cream-dark text-ink"
                    }`}
                  >
                    {m.body}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>
            <form onSubmit={sendMessage} className="flex gap-2 border-t border-ink/10 p-3">
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message..." />
              <Button type="submit">Send</Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-ink-soft">No conversations yet.</div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  );
}
