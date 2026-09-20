'use client';

import { useEffect, useRef } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import HeroBanner from "@/components/HeroBanner";
import Icon from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { useChat } from "@/components/chat/ChatContext";
import { usePageSearch } from "@/components/PageSearchContext";
import { useConversations } from "@/lib/useConversations";
import { formatClockTime, formatDayDivider } from "@/lib/dateFormat";
import conversationArt from "@/assets/illustrations/agent-customer-conversation.png";

function whenLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString() ? formatClockTime(iso) : formatDayDivider(iso);
}

// The messages inbox: every order chat you're part of, newest first, with the
// person on the other end, the last message and an unread count. Tapping a row
// opens that order's chat in the same docked panel the order page uses (it
// pushes the page on desktop, slides over on a phone) - no second chat UI.
// Works for both sides: a customer sees their agents, an agent sees their
// customers; `orderHref` says where "view order" goes for each.
function Messages({ orderHref, agent = false }: { orderHref: (orderId: string) => string; agent?: boolean }) {
  const { conversations } = useConversations();
  const { register, unregister, openChat, myUserId, registration, open: chatOpen } = useChat();
  const search = usePageSearch("Search messages…");
  // The conversation this page put into the dock, so leaving the page (or
  // switching rows) unregisters it and its messages don't leak into another.
  const openedRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (openedRef.current) unregister(openedRef.current);
    },
    [unregister]
  );

  function open(c: any) {
    if (openedRef.current && openedRef.current !== c.order_id) unregister(openedRef.current);
    openedRef.current = c.order_id;
    register(c.order_id, agent ? "Chat with customer" : "Chat with agent", c.other);
    openChat();
  }

  const shown = (conversations || []).filter(
    (c) =>
      !search ||
      [c.other?.full_name, c.market_name, c.last_message?.text, String(c.order_status || "").replaceAll("_", " ")].some((v) =>
        String(v || "").toLowerCase().includes(search)
      )
  );

  return (
    <div>
      <HeroBanner
        eyebrow="Messages"
        title={agent ? "Your customers, one tap away." : "Talk to whoever's shopping for you."}
        body={
          agent
            ? "Every conversation on the orders you're shopping - photos, price questions, substitutions."
            : "Every conversation with your agents in one place - open one to reply, send a photo, or ask about a price."
        }
        illustration={conversationArt}
      />

      {conversations === null && (
        <div className="divide-y divide-dashed divide-line-strong rounded-3xl border border-line bg-surface shadow-sm">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {conversations !== null && conversations.length === 0 && (
        <EmptyState
          icon="chat"
          title="No messages yet"
          subtitle={
            agent
              ? "When you're assigned an order, your chat with the customer shows up here."
              : "Once an agent accepts your order you can chat with them here."
          }
        />
      )}

      {conversations !== null && conversations.length > 0 && shown.length === 0 && (
        <EmptyState icon="chat" title="No matches" subtitle={`No conversations match “${search}”.`} />
      )}

      {shown.length > 0 && (
        <div className="divide-y divide-dashed divide-line-strong overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          {shown.map((c) => {
            const mine = c.last_message.sender_id === myUserId;
            const preview = c.last_message.text || (c.last_message.has_image ? "Photo" : "");
            const unread = c.unread > 0;
            // The conversation whose chat is open right now.
            const selected = chatOpen && registration?.orderId === c.order_id;
            return (
              <div
                key={c.order_id}
                className={
                  "flex items-stretch transition-colors " +
                  (selected ? "bg-brand-orange/10 shadow-[inset_3px_0_0_0_#EE9A5A]" : "")
                }
                aria-current={selected ? "true" : undefined}
              >
                <button
                  type="button"
                  onClick={() => open(c)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left transition hover:bg-sunken-2/60"
                >
                  <Avatar src={c.other?.avatar_url} name={c.other?.full_name} className="h-12 w-12 text-sm" iconClassName="h-5 w-5" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={"truncate text-sm text-ink " + (unread ? "font-extrabold" : "font-bold")}>
                        {c.other?.full_name || (agent ? "Customer" : "Your agent")}
                      </span>
                      <span className={"shrink-0 text-xs " + (unread ? "font-bold text-brand-orange-dark" : "text-faint")}>
                        {whenLabel(c.last_message.created_at)}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {[c.market_name, String(c.order_status || "").replaceAll("_", " ")].filter(Boolean).join(" · ")}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={"min-w-0 flex-1 truncate text-sm " + (unread ? "font-semibold text-ink" : "text-muted")}>
                        {c.last_message.has_image && !c.last_message.text && (
                          <Icon name="camera" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                        )}
                        {mine ? "You: " : ""}
                        {preview}
                      </span>
                      {unread && (
                        <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-brand-orange px-1.5 text-[11px] font-bold text-[#1A1A1A]">
                          {c.unread > 9 ? "9+" : c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
                <Link
                  href={orderHref(c.order_id)}
                  aria-label="View order"
                  title="View order"
                  className="flex w-12 shrink-0 items-center justify-center text-faint transition hover:bg-sunken-2/60 hover:text-ink"
                >
                  <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Messages;
