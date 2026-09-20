"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LANDING } from "@/content/landing";

interface AnnouncementBarProps {
  text?: string;
  link?: { label: string; href: string };
}

export default function AnnouncementBar({ text, link }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(true); // Default true to avoid hydration mismatch, then check storage
  
  const contentText = text || LANDING.announcement.text;
  const contentLink = link || LANDING.announcement.link;

  useEffect(() => {
    const isDismissed = sessionStorage.getItem("qyka-announcement-dismissed") === "true";
    setDismissed(isDismissed);
  }, []);

  if (dismissed || !contentText) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem("qyka-announcement-dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="relative flex h-9 items-center justify-center bg-canvas-deep px-8 text-xs font-semibold text-ink">
      <div className="flex items-center gap-2">
        <span>{contentText}</span>
        {contentLink && (
          <Link
            href={contentLink.href}
            className="group flex items-center gap-1 font-bold text-brand-orange-dark hover:underline"
          >
            {contentLink.label}
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        )}
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}
