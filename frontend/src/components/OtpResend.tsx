"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/Icon";

type Channel = "sms" | "whatsapp" | "voice";

const CHANNELS: { key: Channel; label: string; sent: string; icon: "chat" | "phone" }[] = [
  { key: "whatsapp", label: "Send via WhatsApp", sent: "WhatsApp", icon: "chat" },
  { key: "voice", label: "Call me with the code", sent: "a phone call", icon: "phone" },
  { key: "sms", label: "Resend SMS", sent: "SMS", icon: "phone" },
];

// The backend rejects with "429: {"detail":...}" / "502: ..." - pull the
// human sentence back out instead of showing the raw status line.
function friendlyError(e: any): string {
  const raw = String(e?.message || "");
  const status = raw.slice(0, 3);
  try {
    const detail = JSON.parse(raw.slice(5))?.detail;
    if (typeof detail === "string") return detail;
  } catch {
    /* not JSON */
  }
  if (status === "429") return "Please wait a moment before asking for another code.";
  return "Couldn't send that code. Try another option.";
}

/**
 * SMS is the cheap first attempt; when it hasn't arrived after
 * `fallbackAfterSeconds` this offers WhatsApp / a call (and a plain resend).
 * Owns its own request so the parent only has to absorb the response (new
 * dev code, expiry, channel) via `onSent`. `sentKey` changes whenever ANY
 * code is sent, which restarts the countdown.
 */
export default function OtpResend({
  identifier,
  sentChannel,
  sentKey,
  fallbackAfterSeconds = 45,
  onSent,
}: {
  identifier: string;
  sentChannel: string;
  sentKey: number;
  fallbackAfterSeconds?: number;
  onSent: (data: any) => void;
}) {
  const [left, setLeft] = useState(fallbackAfterSeconds);
  const [busy, setBusy] = useState<Channel | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  // Restart the wait every time a fresh code goes out.
  useEffect(() => {
    setLeft(fallbackAfterSeconds);
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [sentKey, fallbackAfterSeconds]);

  // Email has no other route.
  if (sentChannel === "email") return null;

  async function resend(channel: Channel) {
    setError("");
    setNote("");
    setBusy(channel);
    try {
      const data = await api.requestOtp(identifier, channel);
      onSent(data);
      setNote(`New code on its way by ${CHANNELS.find((c) => c.key === channel)?.sent}.`);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  const waiting = left > 0;
  // Don't offer the route the last code just used as the "other way".
  const options = CHANNELS.filter((c) => c.key !== sentChannel || c.key === "sms");

  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      {waiting ? (
        <p className="text-sm text-muted" aria-live="polite">
          Didn&apos;t get it? You can try another way in{" "}
          <span className="font-semibold tabular-nums text-ink">{left}s</span>.
        </p>
      ) : (
        <>
          <p className="mb-2 text-sm font-semibold text-ink">Still no code? Get it another way</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {options.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => resend(c.key)}
                disabled={busy !== null}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-line-strong bg-canvas px-4 text-sm font-semibold text-ink transition hover:border-brand-orange disabled:opacity-50"
              >
                <Icon name={c.icon} className="h-4 w-4" />
                {busy === c.key ? "Sending…" : c.label}
              </button>
            ))}
          </div>
        </>
      )}
      {note && <p className="mt-2 text-sm text-muted" aria-live="polite">{note}</p>}
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
