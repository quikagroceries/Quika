"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

// Lets callers hide Google-specific chrome (dividers, "or" copy) entirely
// when no Client ID is configured, instead of this component just rendering
// null and leaving orphaned surrounding UI behind.
export const GOOGLE_SIGN_IN_ENABLED = Boolean(CLIENT_ID);

declare global {
  interface Window {
    google?: any;
  }
}

/** Renders Google's own "Continue with Google" button (Identity Services) —
 * hidden entirely when NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't set, so an
 * unconfigured environment just falls back to phone-only sign-in. */
export default function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const renderButton = useCallback(() => {
    if (!window.google?.accounts?.id || !wrapRef.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (resp: { credential: string }) => onCredential(resp.credential),
    });
    const width = Math.min(400, Math.max(200, wrapRef.current.offsetWidth || 300));
    wrapRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(wrapRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      width,
      text: "continue_with",
    });
  }, [onCredential]);

  useEffect(() => {
    if (scriptReady) renderButton();
  }, [scriptReady, renderButton]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={wrapRef} className="flex w-full justify-center" />
    </>
  );
}
