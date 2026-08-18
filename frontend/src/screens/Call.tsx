'use client';

import { useState, useEffect } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { api } from "@/lib/api";

// Voice/video prototype: proves a call connects between the two roles over
// HTTPS. Not production-hardened (no reconnect UX, no device picker screen,
// no recording, etc.) - see the task note on ngrok for testing across
// two real phones, since camera/mic require HTTPS (localhost is exempt,
// which is why same-machine testing works without a tunnel).
function Call({ orderId, onClose, mode = "video" }: any) {
  const [tokenData, setTokenData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getCallToken(orderId)
      .then(setTokenData)
      .catch((e) => setError("Could not start call: " + e.message));
  }, [orderId]);

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-black">
      <button
        onClick={onClose}
        className="m-2 min-h-[44px] self-start rounded-xl bg-white/10 px-4 text-white hover:bg-white/20"
      >
        ← Leave call
      </button>

      {error && (
        <div className="p-4 text-white">
          <p className="text-red-400">{error}</p>
          <p className="text-sm text-[#8a8178]">
            If this says LiveKit isn&apos;t configured, the backend needs
            LIVEKIT_URL/LIVEKIT_API_KEY/LIVEKIT_API_SECRET set.
          </p>
        </div>
      )}

      {!error && !tokenData && (
        <p className="p-4 text-white">Connecting…</p>
      )}

      {tokenData && (
        <LiveKitRoom
          serverUrl={tokenData.url}
          token={tokenData.token}
          connect
          audio
          video={mode !== "voice"}
          onDisconnected={onClose}
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
