import { useState, useRef, useEffect } from "react";
import { api } from "./api";
import Chat from "./Chat";
import Call from "./Call";
import Icon from "./components/Icon";

// The chat icon that sits where "Call" used to be, in the order screen's
// header. Collapsed by default - the order detail/task list is the primary
// view - opens as a full-screen overlay on tap, not a side panel. Voice and
// video call actions live inside the chat's own header (Call renders
// full-screen too, taking over from the chat while active).
//
// Chat stays mounted the whole time regardless of collapse state (only its
// container's visibility toggles, never unmounted - same convention as
// MobileDrawer), so its poll keeps running and the unread badge on this
// icon stays accurate even while collapsed.
function ChatPanel({ orderId }) {
  const [open, setOpen] = useState(false);
  const [callMode, setCallMode] = useState(null); // null | "voice" | "video"
  const [messages, setMessages] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [seenCount, setSeenCount] = useState(0);
  const firstLoadRef = useRef(true);

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
    return <Call orderId={orderId} onClose={() => setCallMode(null)} mode={callMode} />;
  }

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label={unread > 0 ? `Open chat, ${unread} unread message${unread === 1 ? "" : "s"}` : "Open chat"}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-brand-green text-brand-green transition-colors hover:bg-brand-green/5"
      >
        <Icon name="chat" className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <div className={open ? "fixed inset-0 z-[1500]" : "hidden"}>
        <Chat
          orderId={orderId}
          onMessages={handleMessages}
          onCollapse={() => setOpen(false)}
          onVoiceCall={() => setCallMode("voice")}
          onVideoCall={() => setCallMode("video")}
        />
      </div>
    </>
  );
}

export default ChatPanel;
