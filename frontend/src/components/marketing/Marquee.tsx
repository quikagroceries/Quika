"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

/**
 * Infinite horizontal ticker — the site's recurring signature device
 * (stands in for the section-divider whitespace most sites default to).
 * Renders the content twice back-to-back and loops the translateX by
 * exactly one copy's width, so the seam is invisible.
 */
export default function Marquee({
  children,
  speed = 60,
  reverse = false,
  className = "",
}: {
  children: ReactNode;
  /** px/second */
  speed?: number;
  reverse?: boolean;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const copy = copyRef.current;
    if (!track || !copy) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const width = copy.offsetWidth;
    const duration = width / speed;
    const tween = gsap.fromTo(
      track,
      { x: reverse ? -width : 0 },
      { x: reverse ? 0 : -width, duration, ease: "none", repeat: -1 }
    );
    return () => {
      tween.kill();
    };
  }, [speed, reverse]);

  return (
    <div className={"flex overflow-hidden " + className} aria-hidden>
      <div ref={trackRef} className="flex shrink-0 will-change-transform">
        <div ref={copyRef} className="flex shrink-0">
          {children}
        </div>
        <div className="flex shrink-0">{children}</div>
      </div>
    </div>
  );
}
