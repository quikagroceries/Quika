'use client';

import { useEffect } from "react";
import Icon from "@/components/Icon";
import { useChat } from "@/components/chat/ChatContext";

// The chat trigger that sits on the order screen. Just a button now - the
// actual panel is ChatDock, mounted once at the shell level (see AppShell),
// so its desktop variant can be a real layout sibling that pushes the page
// narrower when it opens, the same way ShopBag's own docked panel works,
// instead of a `fixed` overlay floating on top of everything. This button's
// only job is to register "this page's order is X" with ChatContext on
// mount and ask it to open/close - see ChatContext for where the actual
// message polling, unread tracking, and open state live.
function ChatPanel({ orderId, variant = "icon", label = "Chat with agent", person = null }: any) {
  const { registration, unread, openChat, register, unregister } = useChat();

  useEffect(() => {
    register(orderId, label, person);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-register when the order, label or the person's name/photo changes
  }, [orderId, label, person?.full_name, person?.avatar_url]);

  // Unregister only when the order itself goes away - NOT on every person/label
  // update, which would close the panel mid-conversation.
  useEffect(() => () => unregister(orderId), [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only show unread state once this trigger is actually the one registered
  // (defends against a stale badge during the brief window another order's
  // ChatPanel is unmounting while this one mounts).
  const myUnread = registration?.orderId === orderId ? unread : 0;
  const ariaLabel = myUnread > 0 ? `Open chat, ${myUnread} unread message${myUnread === 1 ? "" : "s"}` : "Open chat";

  if (variant === "pill") {
    // Labelled, compact, peach: the primary "talk to them" action on the
    // order page. An icon alone left people guessing what it was.
    return (
      <button
        onClick={openChat}
        aria-label={ariaLabel}
        className="relative inline-flex h-11 items-center gap-2 rounded-full bg-brand-orange px-4 text-sm font-bold text-[#1A1A1A] shadow-xs transition hover:bg-brand-orange-dark active:scale-[0.98]"
      >
        <Icon name="chat" className="h-4 w-4" />
        {label}
        {myUnread > 0 && (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {myUnread > 9 ? "9+" : myUnread}
          </span>
        )}
      </button>
    );
  }

  if (variant === "button") {
    // Labeled, full-width entry point - makes it obvious a chat exists at
    // all, instead of relying on a small icon the other side has to
    // already know to look for. `label` names who's on the other end
    // (customer vs agent), since the same component serves both sides.
    // White card + peach icon well, matching the "Spending approval" /
    // "Order estimate" cards it sits beside - not an olive outline. Olive
    // is a rare success-only accent in this app (order-confirmed states,
    // "Buy elsewhere" secondary actions), not a color for a persistent
    // nav-style action button, which is why it read as out of place here.
    return (
      <button
        onClick={openChat}
        aria-label={ariaLabel}
        className="relative flex w-full items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-3 text-left shadow-sm transition hover:bg-sunken-2"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange-dark">
          <Icon name="chat" className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm font-bold text-ink">{label}</span>
        {myUnread > 0 && (
          <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {myUnread > 9 ? "9+" : myUnread}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={openChat}
      aria-label={ariaLabel}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-brand-orange-dark shadow-xs transition hover:bg-sunken-2"
    >
      <Icon name="chat" className="h-5 w-5" />
      {myUnread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
          {myUnread > 9 ? "9+" : myUnread}
        </span>
      )}
    </button>
  );
}

export default ChatPanel;
