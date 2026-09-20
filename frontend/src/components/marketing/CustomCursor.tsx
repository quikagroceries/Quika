"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * Magnetic label cursor — a small dot that expands into a text pill
 * ("View", "Apply"…) over anything tagged `data-cursor="Label"`. Desktop
 * fine-pointer only; never mounts its effects (or hides the OS cursor) on
 * touch devices or reduced-motion.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);
    document.documentElement.classList.add("custom-cursor-active");

    const dot = dotRef.current!;
    const x = gsap.quickTo(dot, "x", { duration: 0.35, ease: "power3.out" });
    const y = gsap.quickTo(dot, "y", { duration: 0.35, ease: "power3.out" });

    function onMove(e: MouseEvent) {
      x(e.clientX);
      y(e.clientY);
      const target = (e.target as HTMLElement)?.closest("[data-cursor]") as HTMLElement | null;
      setLabel(target?.dataset.cursor || "");
    }
    function onDown() {
      gsap.to(dot, { scale: 0.85, duration: 0.15 });
    }
    function onUp() {
      gsap.to(dot, { scale: 1, duration: 0.15 });
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={dotRef}
      aria-hidden
      className={
        "pointer-events-none fixed left-0 top-0 z-[70] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-white transition-[width,height,background-color] duration-200 " +
        (label ? "h-16 w-16 text-xs font-bold" : "h-3 w-3")
      }
    >
      {label}
    </div>
  );
}
