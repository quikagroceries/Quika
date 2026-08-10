'use client';

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Icon from "@/components/Icon";

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
  const fileInputRef = useRef(null);

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
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {onCollapse && (
            <button
              onClick={onCollapse}
              aria-label="Close chat"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          )}
          <p className="text-lg font-bold text-slate-900">Chat</p>
        </div>
        <div className="flex items-center gap-1">
          {onVoiceCall && (
            <button
              onClick={onVoiceCall}
              aria-label="Voice call"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            >
              <Icon name="phone" className="h-5 w-5" />
            </button>
          )}
          {onVideoCall && (
            <button
              onClick={onVideoCall}
              aria-label="Video call"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            >
              <Icon name="video" className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 sm:px-6">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">No messages yet.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myUserId;
          return (
            <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
              <div
                className={
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm sm:max-w-[65%] " +
                  (mine
                    ? "bg-brand-orange text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-900 rounded-bl-sm")
                }
              >
                {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                {m.image_url && (
                  <img
                    src={m.image_url}
                    alt="attachment"
                    className={"block max-w-full rounded-lg" + (m.text ? " mt-1.5" : "")}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200 px-4 py-3 sm:px-6">
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
              className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
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
            className="min-h-[44px] flex-1 rounded-full border border-slate-300 px-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-brand-orange"
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
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
