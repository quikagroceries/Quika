'use client';

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { formatDayDivider, formatClockTime } from "@/lib/dateFormat";

const POLL_MS = 5000;
const QUICK_REPLIES = ["Hello", "On it", "Almost done", "Thank you"];

// Always rendered full-screen by ChatPanel now (never embedded as a side
// card), so this owns its own header (close + voice/video call icons)
// instead of sitting inside a <Card>.
function Chat({ orderId, onMessages, onCollapse, onVoiceCall, onVideoCall }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [myUserId, setMyUserId] = useState<any>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<any>(null); // kept so "Retry" can resend it
  const [preview, setPreview] = useState<any>(null);
  const fileInputRef = useRef(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.me().then((u) => setMyUserId(u.id)).catch(() => {});
  }, []);

  async function poll() {
    try {
      const msgs = await api.getMessages(orderId);
      setMessages(msgs);
      onMessages?.(msgs); // lets a wrapping ChatPanel track unread count
    } catch {
      // A failed poll shouldn't interrupt whatever screen this chat sits on.
    }
  }

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one interval per orderId, matches Notifications.jsx's poll pattern
  }, [orderId]);

  // Keep the latest message in view - a new message arriving mid-poll
  // shouldn't require a manual scroll to notice.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function handleSend() {
    if (!text.trim()) return;
    setError(""); setBusy(true);
    try {
      await api.sendMessage(orderId, { text: text.trim() });
      setText("");
      await poll();
    } catch (e) {
      setError("Could not send: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Never block the chat on a failed upload: keep the file so "Retry" can
  // resend the SAME file without the customer/agent having to re-pick it.
  async function uploadAndSend(file) {
    setError(""); setUploading(true);
    try {
      const url = await api.uploadChatImage(file);
      await api.sendMessage(orderId, { image_url: url });
      setPendingFile(null);
      await poll();
    } catch (e) {
      setPendingFile(file);
      setError("Photo upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  function handleFilePicked(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // lets the same file be picked again later if needed
    if (!file) return;
    uploadAndSend(file);
  }

  async function sendQuickReply(reply) {
    setError(""); setBusy(true);
    try {
      await api.sendMessage(orderId, { text: reply });
      await poll();
    } catch (e) {
      setError("Could not send: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[#ebe7e0] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {onCollapse && (
            <button
              onClick={onCollapse}
              aria-label="Close chat"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#8a8178] hover:bg-[#f0eeeb]"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          )}
          <p className="text-lg font-bold text-ink">Chat</p>
        </div>
        <div className="flex items-center gap-1">
          {onVoiceCall && (
            <button
              onClick={onVoiceCall}
              aria-label="Voice call"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#6b635a] hover:bg-[#f0eeeb]"
            >
              <Icon name="phone" className="h-5 w-5" />
            </button>
          )}
          {onVideoCall && (
            <button
              onClick={onVideoCall}
              aria-label="Video call"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#6b635a] hover:bg-[#f0eeeb]"
            >
              <Icon name="video" className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-4 py-3 sm:px-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0eeeb] text-[#8a8178]">
              <Icon name="chat" className="h-6 w-6" />
            </span>
            <p className="font-display text-base font-bold text-ink">No messages yet</p>
            <p className="max-w-[220px] text-sm text-[#8a8178]">
              Say hello, or send a quick reply below to get things started.
            </p>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === myUserId;
          const prev = messages[i - 1];
          const showDivider = !prev || formatDayDivider(prev.created_at) !== formatDayDivider(m.created_at);
          // Consecutive bubbles from the same sender sit closer together and
          // drop the redundant tail corner, like every modern chat UI - only
          // the last bubble in a run gets the "pointed" corner + timestamp.
          const next = messages[i + 1];
          const lastInRun = !next || next.sender_id !== m.sender_id || formatDayDivider(next.created_at) !== formatDayDivider(m.created_at);
          return (
            <div key={m.id}>
              {showDivider && (
                <div className="my-3 flex items-center justify-center">
                  <span className="rounded-full bg-[#f0eeeb] px-3 py-1 text-[0.7rem] font-semibold text-[#8a8178]">
                    {formatDayDivider(m.created_at)}
                  </span>
                </div>
              )}
              <div className={"flex " + (mine ? "justify-end" : "justify-start") + (lastInRun ? " mb-2" : " mb-0.5")}>
                <div className="max-w-[80%] sm:max-w-[65%]">
                  <div
                    className={
                      "rounded-2xl px-3 py-2 text-sm " +
                      (mine
                        ? "bg-brand-orange text-white " + (lastInRun ? "rounded-br-sm" : "")
                        : "bg-[#f0eeeb] text-ink " + (lastInRun ? "rounded-bl-sm" : ""))
                    }
                  >
                    {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                    {m.image_url && (
                      <button
                        type="button"
                        onClick={() => setPreview(m.image_url)}
                        className={"block max-w-full" + (m.text ? " mt-1.5" : "")}
                      >
                        <img src={m.image_url} alt="attachment" className="block max-h-64 w-full rounded-lg object-cover" />
                      </button>
                    )}
                  </div>
                  {lastInRun && m.created_at && (
                    <div className={"mt-0.5 text-[0.7rem] text-[#8a8178] " + (mine ? "text-right" : "text-left")}>
                      {formatClockTime(m.created_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="Attachment" className="max-h-full max-w-full rounded-lg" />
          <button
            onClick={() => setPreview(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <Icon name="close" className="h-6 w-6" />
          </button>
        </div>
      )}

      <div className="border-t border-[#ebe7e0] px-4 py-3 sm:px-6">
        {error && (
          <div className="mb-2">
            <p className="mb-1 text-sm text-red-600">{error}</p>
            {pendingFile && (
              <Button variant="neutral" onClick={() => uploadAndSend(pendingFile)} busy={uploading} className="text-sm">
                Retry photo upload
              </Button>
            )}
          </div>
        )}

        <div className="mb-2 flex gap-2 overflow-x-auto pb-0.5">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              onClick={() => sendQuickReply(reply)}
              disabled={busy}
              className="shrink-0 whitespace-nowrap rounded-full border border-[#ebe7e0] bg-white px-3 py-1.5 text-sm font-semibold text-[#6b635a] transition-colors hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
            >
              {reply}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            className="min-h-[44px] flex-1 rounded-full border border-[#ddd6cb] px-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-brand-orange"
          />

          {/* capture="environment" opens the rear camera directly on a phone. */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFilePicked}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={uploading}
            aria-label="Send a photo"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0eeeb] text-[#6b635a] hover:bg-[#e8e4df] disabled:opacity-50"
          >
            {uploading ? "…" : <Icon name="camera" className="h-5 w-5" />}
          </button>

          <button
            onClick={handleSend}
            disabled={busy || !text.trim()}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white hover:bg-brand-orange-dark disabled:opacity-50"
          >
            <Icon name="send" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
