"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface AppStoreBadgesProps {
  appStoreUrl?: string;
  playStoreUrl?: string;
  className?: string;
}

export function AppStoreBadges({ appStoreUrl, playStoreUrl, className = "" }: AppStoreBadgesProps) {
  const [deviceOs, setDeviceOs] = useState<"ios" | "android" | "other" | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceOs("ios");
    } else if (/android/.test(ua)) {
      setDeviceOs("android");
    } else {
      setDeviceOs("other");
    }
  }, []);

  const hasStoreLinks = appStoreUrl || playStoreUrl;

  if (hasStoreLinks) {
    return (
      <div className={`flex flex-wrap gap-4 ${className}`}>
        {appStoreUrl && (
          <a 
            href={appStoreUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="transition hover:opacity-80 active:scale-[0.98]"
            aria-label="Download on the App Store"
          >
            {/* Fallback styling for badge in case asset doesn't exist */}
            <div className="flex h-10 w-[120px] items-center justify-center rounded-lg bg-ink text-surface text-xs font-semibold">
              App Store
            </div>
          </a>
        )}
        {playStoreUrl && (
          <a 
            href={playStoreUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="transition hover:opacity-80 active:scale-[0.98]"
            aria-label="Get it on Google Play"
          >
            <div className="flex h-10 w-[135px] items-center justify-center rounded-lg bg-ink text-surface text-xs font-semibold">
              Google Play
            </div>
          </a>
        )}
      </div>
    );
  }

  // PWA fallback
  if (!deviceOs) {
    return <div className={`min-h-[60px] ${className}`} aria-hidden="true" />; // Placeholder while loading
  }

  return (
    <div className={`flex flex-col gap-3 rounded-2xl bg-canvas-deep p-4 border border-line ${className}`}>
      <p className="font-semibold text-ink text-sm">Add to Home Screen</p>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-ink">
            1
          </span>
          <span className="text-sm text-muted">
            Open in {deviceOs === "ios" ? "Safari" : "Chrome"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-ink">
            2
          </span>
          <span className="text-sm text-muted">
            Tap {deviceOs === "ios" ? "Share icon" : "Menu (⋮)"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-ink">
            3
          </span>
          <span className="text-sm text-muted">Select &quot;Add to Home Screen&quot;</span>
        </div>
      </div>
    </div>
  );
}
