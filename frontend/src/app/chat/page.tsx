"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiUrl } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { ChatMessage, Conversation } from "@/lib/types";

export default function ChatPage() {
  const t = useTranslations("Chat");
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
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

    socket.on("message:new", onMessage);
    return () => {
      socket.off("message:new", onMessage);
    };
  }, [user]);

  useEffect(() => {
    if (!activeId) return;
    getSocket().emit("conversation:join", activeId);
    apiFetch<{ messages: ChatMessage[] }>(`/api/chat/conversations/${activeId}/messages`).then((res) => setMessages(res.messages));
    return () => {
      getSocket().emit("conversation:leave", activeId);
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUsername.trim()) return;
    const res = await apiFetch<{ conversation: Conversation }>(`/api/chat/conversations/with/${targetUsername.trim()}`, {
      method: "POST",
    });
    setConversations((prev) => (prev.some((c) => c.id === res.conversation.id) ? prev : [res.conversation, ...prev]));
    setActiveId(res.conversation.id);
    setTargetUsername("");
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeId) return;
    getSocket().emit("message:send", { conversationId: activeId, body: draft }, () => {});
    setDraft("");
  }

  if (!user) return <p className="text-ink-soft">Please log in to use chat.</p>;

  return (
    <div className="grid h-[70vh] grid-cols-1 overflow-hidden rounded-2xl border border-ink/10 bg-white sm:grid-cols-[260px_1fr]">
      <div className="flex flex-col border-r border-ink/10">
        <form onSubmit={startConversation} className="flex gap-2 border-b border-ink/10 p-3">
          <Input
            placeholder={t("startConversation")}
            value={targetUsername}
            onChange={(e) => setTargetUsername(e.target.value)}
          />
        </form>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && <p className="p-3 text-sm text-ink-soft">{t("noConversations")}</p>}
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
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.otherUser?.username}</p>
                <p className="truncate text-xs text-ink-soft">{c.lastMessage?.body}</p>
              </div>
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
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("placeholder")} />
              <Button type="submit">{t("send")}</Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-ink-soft">{t("noConversations")}</div>
        )}
      </div>
    </div>
  );
}
