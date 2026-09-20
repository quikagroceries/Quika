"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";

// Backs the order chat the same way ShopContext backs the shopping bag: one
// piece of state that lives above the page (here, in ChatProvider), a
// trigger button anywhere in the tree (ChatPanel) that just registers
// "this page's order is X" and asks to open/close, and a single dock
// (ChatDock, mounted once per shell) that actually renders the panel - as a
// mobile overlay OR, on desktop, a real layout sibling that pushes the page
// narrower, exactly like ShopBag's own two variants. Splitting it this way
// is what lets the dock live at the shell level (so its width can affect
// the whole page) while the trigger stays wherever the order screen wants it.
//
// `messages`/`myUserId`/`seenCount` live here (not in ChatPanel) because the
// poll needs to keep running - and the unread badge needs to keep updating -
// even while the panel is visually collapsed, the same "always mounted,
// only visibility toggles" approach ChatPanel used before this refactor.
// Moving them here just lets ChatDock be the one place that's always
// mounted, instead of ChatPanel doing its own separate polling too.

// `person` = who is on the other end (name + photo), when the registering page
// knows - the chat header shows it instead of a generic "Chat".
export type ChatPerson = { full_name?: string | null; avatar_url?: string | null } | null;
type Registration = { orderId: string; label: string; person: ChatPerson } | null;

type ChatContextValue = {
  registration: Registration;
  open: boolean;
  messages: any[];
  myUserId: any;
  unread: number;
  callMode: "voice" | "video" | null;
  register: (orderId: string, label: string, person?: ChatPerson) => void;
  unregister: (orderId: string) => void;
  openChat: () => void;
  closeChat: () => void;
  handleMessages: (msgs: any[]) => void;
  setCallMode: (mode: "voice" | "video" | null) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<Registration>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [myUserId, setMyUserId] = useState<any>(null);
  const [seenCount, setSeenCount] = useState(0);
  const [callMode, setCallMode] = useState<"voice" | "video" | null>(null);
  const firstLoadRef = useRef(true);
  const messagesRef = useRef<any[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    api.me().then((u) => setMyUserId(u.id)).catch(() => {});
  }, []);

  const register = useCallback((orderId: string, label: string, person: ChatPerson = null) => {
    setRegistration((r) =>
      r &&
      r.orderId === orderId &&
      r.label === label &&
      r.person?.full_name === person?.full_name &&
      r.person?.avatar_url === person?.avatar_url
        ? r
        : { orderId, label, person }
    );
  }, []);

  const unregister = useCallback((orderId: string) => {
    setRegistration((r) => (r && r.orderId === orderId ? null : r));
    setOpen(false);
    setMessages([]);
    setSeenCount(0);
    setCallMode(null);
    firstLoadRef.current = true;
  }, []);

  const handleMessages = useCallback((msgs: any[]) => {
    setMessages(msgs);
    // Whatever's already there the first time this ever polls counts as
    // "seen" - only messages that arrive on LATER polls, while still
    // collapsed, count toward the unread badge.
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      setSeenCount(msgs.length);
    }
  }, []);

  const openChat = useCallback(() => {
    setOpen(true);
    setSeenCount(messagesRef.current.length);
  }, []);

  const closeChat = useCallback(() => setOpen(false), []);

  const unread = open ? 0 : messages.slice(seenCount).filter((m) => m.sender_id !== myUserId).length;

  const value = useMemo(
    () => ({
      registration,
      open,
      messages,
      myUserId,
      unread,
      callMode,
      register,
      unregister,
      openChat,
      closeChat,
      handleMessages,
      setCallMode,
    }),
    [registration, open, messages, myUserId, unread, callMode, register, unregister, openChat, closeChat, handleMessages]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

export function useChatOptional() {
  return useContext(ChatContext);
}
