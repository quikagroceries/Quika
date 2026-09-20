"use client";

import dynamic from "next/dynamic";
import Chat from "@/screens/Chat";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { CHAT_READ_EVENT } from "@/lib/useConversations";
import { useChat } from "./ChatContext";

const Call = dynamic(() => import("@/screens/Call"), { ssr: false });

/**
 * The chat's actual panel - mounted once at the shell level (AppShell,
 * alongside ShopBag) rather than wherever the trigger button happens to
 * sit. That's what lets the desktop variant behave like ShopBag's own
 * docked panel: a real flex sibling of the page content whose width
 * animates open, visibly pushing the page narrower, instead of a `fixed`
 * overlay floating on top of everything behind a dimmed backdrop.
 *
 * Deliberately ONE `<aside>` (not two, one per breakpoint, the way ShopBag
 * does it) - ShopBag's BagBody has no data fetching of its own, so mounting
 * it twice is free. `<Chat>` polls the network every few seconds; mounting
 * it in two places at once would double every request. Instead this same
 * element just carries both behaviors via responsive classes: `fixed`
 * slide-in below `lg`, `sticky` width-animated layout sibling at `lg` and
 * up - same DOM node, same single poll, different CSS per breakpoint.
 *
 * Renders nothing until some page's ChatPanel has registered an order (see
 * ChatContext) - most of the app never touches this at all.
 */
function ChatDock() {
  const { registration, open, messages, callMode, closeChat, handleMessages, setCallMode } = useChat();

  // While the panel is OPEN the conversation is being read: tell the server
  // (so unread badges clear), on opening and again whenever something new
  // arrives. A collapsed panel keeps polling for the unread badge but must NOT
  // mark anything read - that's the whole point of the badge.
  const openOrderId = open ? registration?.orderId : null;
  useEffect(() => {
    if (!openOrderId) return;
    api
      .markChatRead(openOrderId)
      .then(() => window.dispatchEvent(new Event(CHAT_READ_EVENT)))
      .catch(() => {});
  }, [openOrderId, messages.length]);

  if (!registration) return null;

  if (callMode) {
    return <Call orderId={registration.orderId} onClose={() => setCallMode(null)} mode={callMode} />;
  }

  return (
    <>
      {/* Dimmed backdrop - mobile only, matches ShopBag's own mobile
          variant exactly (`bg-ink/40`, same easing, `lg:hidden`). There's
          nothing to dim at `lg`+: the panel there is part of the layout,
          not floating on top of it. */}
      <div
        onClick={closeChat}
        aria-hidden="true"
        className={
          "fixed inset-0 z-[1500] bg-ink/40 transition-opacity duration-300 ease-premium lg:hidden " +
          (open ? "opacity-100" : "pointer-events-none opacity-0")
        }
      />
      <aside
        role="dialog"
        aria-label="Chat with agent"
        aria-modal={open || undefined}
        aria-hidden={!open}
        className={
          // Shared
          "flex w-full max-w-md flex-col border-l border-line-strong bg-surface " +
          // Below lg: fixed full-height overlay, slides in via translate-x.
          "fixed inset-y-0 right-0 z-[1501] transform shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] " +
          (open ? "translate-x-0" : "translate-x-full") +
          // lg and up: a real layout panel, a flex sibling of the page
          // content (see AppShell) - width animates 0 -> 26rem instead of
          // sliding over, so opening it visibly narrows the page. No
          // backdrop/scroll-lock/modal semantics up here - the rest of the
          // page stays interactive, same as ShopBag's own desktop aside.
          //
          // `lg:w-[26rem]`/`lg:w-0` must stay mutually exclusive (not one
          // fixed + one conditional) - both in the class list at once
          // compile to two `width` rules at the SAME media query, and which
          // one wins then depends on Tailwind's generated CSS order, not on
          // string order here. That's what made the panel stick open: the
          // `open` class always won regardless of state, so closing never
          // visibly did anything at this breakpoint.
          " lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:shrink-0 lg:translate-x-0 lg:transform-none lg:overflow-hidden lg:shadow-xs lg:transition-[width] lg:duration-300 lg:ease-premium " +
          (open ? "lg:w-[26rem]" : "lg:w-0")
        }
      >
        <div className="flex h-full w-full max-w-md shrink-0 flex-col lg:w-[26rem] lg:max-w-none">
          <Chat
            key={registration.orderId}
            orderId={registration.orderId}
            person={registration.person}
            label={registration.label}
            onMessages={handleMessages}
            onCollapse={closeChat}
            onVoiceCall={() => setCallMode("voice")}
            onVideoCall={() => setCallMode("video")}
          />
        </div>
      </aside>
    </>
  );
}

export default ChatDock;
