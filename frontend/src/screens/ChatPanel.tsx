'use client';

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import Chat from "@/screens/Chat";
import Icon from "@/components/Icon";

const Call = dynamic(() => import("@/screens/Call"), { ssr: false });

// The chat trigger that sits on the order screen. Collapsed by default -
// the order detail/task list is the primary view - opens as a slide-over
// panel (same convention as ShopBag), not a full-screen takeover: the order
// screen stays visible and dimmed behind it, so opening chat never feels
// like leaving the order. Full width only below sm, where there's no room
// for a partial panel anyway. Voice and video call actions live inside the
// chat's own header (Call still renders full-screen while active - a call
// is the one moment that warrants taking over the whole screen).
//
// Chat stays mounted the whole time regardless of collapse state (only its
// container's visibility toggles, never unmounted - same convention as
// MobileDrawer), so its poll keeps running and the unread badge on this
// icon stays accurate even while collapsed.
function ChatPanel({ orderId, variant = "icon", label = "Chat with agent" }: any) {
  const [open, setOpen] = useState(false);
  const [callMode, setCallMode] = useState<any>(null); // null | "voice" | "video"
  const [messages, setMessages] = useState<any[]>([]);
  const [myUserId, setMyUserId] = useState<any>(null);
  const [seenCount, setSeenCount] = useState(0);
  const firstLoadRef = useRef(true);
  // Portal everything full-screen straight to <body> - this trigger can sit
  // inside a `sticky` sidebar column (OrderDetail's), and `position: sticky`
  // unconditionally creates a new CSS stacking context. Left un-portaled,
  // the chat panel/call's `fixed` overlay would be trapped inside that
  // context - its own z-index would only win LOCALLY, so it could still
  // render BELOW an unrelated sibling elsewhere on the page (the hero
  // banner's back button, in practice) despite a much higher z-index.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    api.me().then((u) => setMyUserId(u.id)).catch(() => {});
  }, []);

  function handleMessages(msgs) {
    setMessages(msgs);
    // Whatever's already there the first time this panel ever polls counts
    // as "seen" (nothing to alert about on a fresh page load) - only
    // messages that arrive on LATER polls, while still collapsed, count
    // toward the unread badge.
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      setSeenCount(msgs.length);
    }
  }

  function handleOpen() {
    setOpen(true);
    setSeenCount(messages.length);
  }

  const unread = open ? 0 : messages.slice(seenCount).filter((m) => m.sender_id !== myUserId).length;

  if (callMode) {
    return mounted
      ? createPortal(
          <Call orderId={orderId} onClose={() => setCallMode(null)} mode={callMode} />,
          document.body
        )
      : null;
  }

  const ariaLabel = unread > 0 ? `Open chat, ${unread} unread message${unread === 1 ? "" : "s"}` : "Open chat";

  return (
    <>
      {variant === "button" ? (
        // Labeled, full-width entry point - makes it obvious a chat exists
        // at all, instead of relying on a small icon the other side has to
        // already know to look for. `label` names who's on the other end
        // (customer vs agent), since the same component serves both sides.
        <button
          onClick={handleOpen}
          aria-label={ariaLabel}
          className="relative flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-green px-4 py-3 text-sm font-bold text-brand-green transition-colors hover:bg-brand-green/5"
        >
          <Icon name="chat" className="h-5 w-5" />
          {label}
          {unread > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      ) : (
        <button
          onClick={handleOpen}
          aria-label={ariaLabel}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-brand-green text-brand-green transition-colors hover:bg-brand-green/5"
        >
          <Icon name="chat" className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}

      {mounted &&
        createPortal(
          <div
            className={open ? "fixed inset-0 z-[1500] flex justify-end" : "hidden"}
            role="dialog"
            aria-modal="true"
            aria-label="Chat with agent"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/35"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            />
            <aside className="relative z-[1] flex h-full w-full max-w-md flex-col bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.12)]">
              <Chat
                orderId={orderId}
                onMessages={handleMessages}
                onCollapse={() => setOpen(false)}
                onVoiceCall={() => setCallMode("voice")}
                onVideoCall={() => setCallMode("video")}
              />
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}

export default ChatPanel;
