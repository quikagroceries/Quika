'use client';

import { useCallback, useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { api } from "@/lib/api";
import Icon from "@/components/Icon";

// Voice/video prototype: proves a call connects between the two roles over
// HTTPS. Not production-hardened (no reconnect UX, no device picker screen,
// no recording, etc.) - see the task note on ngrok for testing across
// two real phones, since camera/mic require HTTPS (localhost is exempt,
// which is why same-machine testing works without a tunnel). The chrome
// around LiveKit's own prebuilt VideoConference widget (header, connecting/
// error states) is fully custom to match the rest of the app; the widget
// itself is retinted to the brand palette via [data-lk-theme] overrides in
// globals.css rather than rebuilt control-by-control.
function Call({ orderId, onClose, mode = "video" }: any) {
  const [tokenData, setTokenData] = useState<any>(null);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState("");
  // Distinguishes "never connected" from "was connected, then hung up" -
  // LiveKitRoom fires onDisconnected in BOTH cases (a failed initial
  // connection attempt also ends in a disconnected state), so without this
  // a bad connection would silently close the call instead of showing the
  // error state below.
  const [everConnected, setEverConnected] = useState(false);

  const loadToken = useCallback(() => {
    setError("");
    setConnecting(true);
    setTokenData(null);
    api
      .getCallToken(orderId)
      .then((d) => {
        setTokenData(d);
        setConnecting(false);
      })
      .catch((e) => {
        setError("Could not start call: " + e.message);
        setConnecting(false);
      });
  }, [orderId]);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-[#17110c]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <Icon name={mode === "voice" ? "phone" : "video"} className="h-4 w-4" />
          </span>
          <p className="font-display text-base font-bold text-white">
            {mode === "voice" ? "Voice call" : "Video call"}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Leave call"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <Icon name="alert" className="h-6 w-6" />
          </span>
          <p className="font-display text-lg font-bold text-white">Couldn&apos;t connect</p>
          <p className="max-w-sm text-sm text-white/60">{error}</p>
          <p className="max-w-sm text-xs text-white/35">
            If this says LiveKit isn&apos;t configured, the backend needs
            LIVEKIT_URL/LIVEKIT_API_KEY/LIVEKIT_API_SECRET set.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={loadToken}
              className="rounded-full bg-brand-orange px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-orange-dark"
            >
              Try again
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
            >
              Leave
            </button>
          </div>
        </div>
      )}

      {!error && connecting && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-white/70">
          <svg className="h-8 w-8 animate-spin text-brand-orange" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p>Connecting…</p>
        </div>
      )}

      {tokenData && (
        <LiveKitRoom
          serverUrl={tokenData.url}
          token={tokenData.token}
          connect
          audio
          video={mode !== "voice"}
          data-lk-theme="default"
          onConnected={() => setEverConnected(true)}
          onDisconnected={() => {
            if (everConnected) {
              onClose();
            } else {
              setTokenData(null);
              setError("Could not reach the call server. Check your connection and try again.");
            }
          }}
          onError={(e) => setError("Call error: " + e.message)}
          className="flex-1"
        >
          <VideoConference />
        </LiveKitRoom>
      )}
    </div>
  );
}

export default Call;
