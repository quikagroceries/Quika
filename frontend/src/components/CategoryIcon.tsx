'use client';

import type { CSSProperties, ReactElement } from "react";

// Flat, multi-color illustrated icons for the market category filters —
// unlike Icon.tsx's single-stroke/currentColor set, these carry their own
// fixed fill palette per icon (Icons8-style "flat color" look), so no
// external icon assets or attribution are needed. One real object per
// category, same convention as Icon.tsx: basic shapes, not traced art.
const CATEGORY_ICONS: Record<string, ReactElement> = {
  popular: (
    <>
      <path
        d="M12 2.7l2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 16.4l-5.4 3.1 1-6.1-4.4-4.3 6.1-.8Z"
        fill="#F5A623"
        stroke="#C97A0A"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 5.4l1.7 3.5 3.8.5-2.8 2.7.7 3.8L12 14l-.2.1V5.5Z"
        fill="#FFD066"
      />
    </>
  ),
  produce: (
    <>
      <path
        d="M12.3 9.5c1.6-1 4-.6 4.9 1 1.4 2.4-.2 8.3-3 10.3-.9.6-1.9.6-2.8 0-2.8-2-4.4-7.9-3-10.3.9-1.6 2.9-1.9 4.5-1"
        fill="#F0862B"
        stroke="#C96A1C"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path d="M11.3 9c-.6-2 .3-3.8 2-4.6.4 1.8-.1 3.6-1.4 4.8Z" fill="#3D7D3D" stroke="#2C5E2C" strokeWidth="0.5" />
      <path d="M13 8.6c.9-1.7 2.7-2.4 4.5-2 -.7 1.7-2.3 2.7-4.2 2.6Z" fill="#4C9A4C" stroke="#2C5E2C" strokeWidth="0.5" />
    </>
  ),
  protein: (
    <>
      <path
        d="M9.5 4.3c1.6-1.6 4.2-1.7 6-.3 2 1.6 2.3 4.6.6 6.6l-.4.4-4-3.9c-1.7-1.7-2.9-2-2.2-2.8Z"
        fill="#F1E4CE"
        stroke="#C9B98E"
        strokeWidth="0.6"
      />
      <path
        d="M15.8 10.8c1.9 1.9 1.9 4.9.1 6.7-1.7 1.7-4.6 1.6-6.5-.3-1.9-1.9-2.5-4.7-1.2-6 .8-.8 1.7-.1 2.7.9"
        fill="#C98A56"
        stroke="#A5693A"
        strokeWidth="0.7"
      />
      <path
        d="M9 15.5 5.4 19a1.9 1.9 0 0 0 2.7 2.7L11.6 18"
        fill="#C98A56"
        stroke="#A5693A"
        strokeWidth="0.7"
      />
    </>
  ),
  fish: (
    <>
      <path
        d="M2.5 12c3.2-3.6 7.3-5 11-5 2.8 0 4.6 1.8 5.5 5-.9 3.2-2.7 5-5.5 5-3.7 0-7.8-1.4-11-5Z"
        fill="#2E8FB0"
        stroke="#1F6E8C"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path d="M4 12c2.3-2.2 5.2-3.4 8-3.6-1.6 1-2.6 2.2-2.9 3.6.3 1.4 1.3 2.6 2.9 3.6-2.8-.2-5.7-1.4-8-3.6Z" fill="#8FD3E8" />
      <path d="M19 12 22.5 9.3 21.5 12 22.5 14.7Z" fill="#1F6E8C" />
      <circle cx="6.3" cy="12" r="0.9" fill="#0B3B4A" />
    </>
  ),
  provisions: (
    <>
      <path
        d="M8.3 8.5h7.4l1.4 3-.9 8.4a1.6 1.6 0 0 1-1.6 1.4H9.4a1.6 1.6 0 0 1-1.6-1.4l-.9-8.4Z"
        fill="#D8B26B"
        stroke="#AD8949"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path d="M8.3 8.5h7.4l1.4 3H6.9Z" fill="#C89E52" stroke="#AD8949" strokeWidth="0.7" strokeLinejoin="round" />
      <path d="M10 4.8c0-1 .9-1.8 2-1.8s2 .8 2 1.8-.9 2-2 2.7c-1.1-.7-2-1.7-2-2.7Z" fill="#7A5230" />
      <line x1="9" y1="14" x2="15" y2="14" stroke="#AD8949" strokeWidth="0.7" />
    </>
  ),
  spices: (
    <>
      <path d="M10.8 4.8c0-.9.7-1.6 1.6-1.6" fill="none" stroke="#4C9A4C" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M10.8 4.8c3 0 3.9 2 5.2 2.4 2 .7 3.4 2.6 3.4 4.9 0 3.5-3.2 7.3-6.3 7.3-2.7 0-4.9-2.5-4.9-5.5 0-3.3 1.4-5.3 2.6-9.1Z"
        fill="#D8432E"
        stroke="#A8301F"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path d="M9.6 8.6c-.9 2.7-1.6 4.5-1.6 6.5 0 1.7.9 3.2 2.2 4.1-2.3-.6-3.9-2.8-3.9-5.5 0-2.4.9-3.9 1.9-6.2.4.4.9.8 1.4 1.1Z" fill="#EA6A52" />
    </>
  ),
  household: (
    <>
      <path d="M10.5 2.5h3l.3 3.2h-3.6Z" fill="#B8C4CC" stroke="#8FA0AC" strokeWidth="0.6" strokeLinejoin="round" />
      <path
        d="M9.3 5.7h5.4l1 2.6-.6 11.3a1.4 1.4 0 0 1-1.4 1.3H10.3a1.4 1.4 0 0 1-1.4-1.3l-.6-11.3Z"
        fill="#6FB3D9"
        stroke="#3E82AC"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path d="M8.3 12.5h7.4l-.5 6.6a1.4 1.4 0 0 1-1.4 1.3H10.3a1.4 1.4 0 0 1-1.4-1.3Z" fill="#B7DCEC" />
      <line x1="8.9" y1="9" x2="15.1" y2="9" stroke="#3E82AC" strokeWidth="0.7" />
    </>
  ),
};

function CategoryIcon({
  name,
  className = "h-6 w-6",
  style,
}: {
  name: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (name === "grains") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/grains.png" alt="" className={className} style={style} />
    );
  }
  const shape = CATEGORY_ICONS[name];
  if (!shape) return null;
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      {shape}
    </svg>
  );
}

export default CategoryIcon;
