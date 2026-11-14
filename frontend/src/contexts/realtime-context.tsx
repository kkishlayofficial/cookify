"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";

type RealtimeContextValue = {
  unreadNotifications: number;
  unreadMessages: number;
  refreshUnreadNotifications: () => Promise<void>;
  refreshUnreadMessages: () => Promise<void>;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const refreshUnreadNotifications = useCallback(async () => {
    if (!user) return;
    const res = await apiFetch<{ count: number }>("/api/notifications/unread-count");
    setUnreadNotifications(res.count);
  }, [user]);

  const refreshUnreadMessages = useCallback(async () => {
    if (!user) return;
    const res = await apiFetch<{ count: number }>("/api/chat/unread-count");
    setUnreadMessages(res.count);
  }, [user]);

  // Seed both counts from the server on login/reload, since the live socket
  // events only cover what arrives *after* this provider mounts. Logging out
  // is handled by deriving the displayed count as 0 below rather than resetting
  // state here, since the raw counts just go stale (and unused) until next login.
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUnreadNotifications();
    refreshUnreadMessages();
  }, [user, refreshUnreadNotifications, refreshUnreadMessages]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    // The raw counts always track real server-side unread state; whether
    // they're actually shown on the page (vs. suppressed while already on
    // /notifications or /chat) is decided at render time below.
    function onNotification() {
      setUnreadNotifications((count) => count + 1);
    }
    function onNewMessage() {
      setUnreadMessages((count) => count + 1);
    }

    socket.on("notification:new", onNotification);
    socket.on("chat:new-message", onNewMessage);
    return () => {
      socket.off("notification:new", onNotification);
      socket.off("chat:new-message", onNewMessage);
    };
  }, [user]);

  // Visiting a conversation marks it read server-side (see the chat page), and
  // marking a notification read is an explicit per-item click (see the
  // notifications page) - neither guarantees everything shown got marked read,
  // so re-sync the raw count from the server on the way out of either page.
  const wasOnChatRef = useRef(false);
  const wasOnNotificationsRef = useRef(false);
  useEffect(() => {
    if (!user) return;

    if (pathname === "/notifications") {
      wasOnNotificationsRef.current = true;
    } else if (wasOnNotificationsRef.current) {
      wasOnNotificationsRef.current = false;
      refreshUnreadNotifications();
    }

    if (pathname === "/chat") {
      wasOnChatRef.current = true;
    } else if (wasOnChatRef.current) {
      wasOnChatRef.current = false;
      refreshUnreadMessages();
    }
  }, [pathname, user, refreshUnreadNotifications, refreshUnreadMessages]);

  // Suppressed while logged out (stale counts from a previous session) or
  // while already on the page that surfaces these items.
  const displayedUnreadNotifications = !user || pathname === "/notifications" ? 0 : unreadNotifications;
  const displayedUnreadMessages = !user || pathname === "/chat" ? 0 : unreadMessages;

  return (
    <RealtimeContext.Provider
      value={{
        unreadNotifications: displayedUnreadNotifications,
        unreadMessages: displayedUnreadMessages,
        refreshUnreadNotifications,
        refreshUnreadMessages,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within RealtimeProvider");
  return ctx;
}
