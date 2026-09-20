"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useSharedQuery } from "@/lib/sharedQuery";

const POLL_MS = 15000;
// Fired after a chat is marked read so every badge/list refreshes at once
// instead of waiting out its poll.
export const CHAT_READ_EVENT = "qyka:chat-read";

/** The messages inbox for the signed-in customer or agent: conversations
 * (newest activity first) and the total unread count for badges. One shared
 * poll serves every badge and the Messages page. `null` while loading /
 * signed out. */
export function useConversations() {
  const { token, user } = useAuth();
  const ready = !!token && !!user;
  const { data, refresh } = useSharedQuery<any[]>(ready ? `conversations:${user.id}` : null, () => api.getConversations(), POLL_MS);

  useEffect(() => {
    if (!ready) return;
    window.addEventListener(CHAT_READ_EVENT, refresh);
    return () => window.removeEventListener(CHAT_READ_EVENT, refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh is stable per key
  }, [ready, user?.id]);

  const conversations = ready ? data ?? null : null;
  const unreadTotal = (conversations || []).reduce((n, c) => n + (c.unread || 0), 0);
  return { conversations, unreadTotal, refresh };
}
