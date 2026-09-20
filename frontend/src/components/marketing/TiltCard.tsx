"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

/**
 * Pointer-following 3D tilt + lift — the "extrude" feel on the site's
 * highest-value cards (get-started tiles, belief/pillar cards). Pure CSS
 * transforms via GSAP quickTo, so it stays 60fps; skipped entirely for
 * prefers-reduced-motion and touch (no hover to tilt toward anyway).
 */
export default function TiltCard({
  children,
  className = "",
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const rotateX = gsap.quickTo(el, "rotateX", { duration: 0.4, ease: "power3.out" });
    const rotateY = gsap.quickTo(el, "rotateY", { duration: 0.4, ease: "power3.out" });
    const lift = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

    function onMove(e: PointerEvent) {
      const box = el!.getBoundingClientRect();
      const px = (e.clientX - box.left) / box.width - 0.5;
      const py = (e.clientY - box.top) / box.height - 0.5;
      rotateX(-py * max);
      rotateY(px * max);
      lift(-4);
    }
    function onLeave() {
      rotateX(0);
      rotateY(0);
      lift(0);
    }

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [max]);

  return (
    <div style={{ perspective: 1000 }} className={className}>
      <div ref={ref} style={{ transformStyle: "preserve-3d", willChange: "transform" }} className="h-full">
        {children}
      </div>
    </div>
  );
}
