"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText, ScrollTrigger);
}

/**
 * Kinetic headline reveal — splits into lines (each masked by its own
 * overflow-hidden wrapper) and animates them up into place. `mode="load"`
 * fires immediately (hero, above the fold); `mode="scroll"` fires once the
 * element scrolls into view. This is the signature "bespoke" headline
 * treatment used across the marketing site instead of a plain fade-up.
 */
export default function SplitReveal({
  children,
  as: Tag = "h2",
  className = "",
  mode = "scroll",
  delay = 0,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  mode?: "load" | "scroll";
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let split: SplitText | undefined;
    let ctx: gsap.Context | undefined;

    // Fonts loading late can throw off SplitText's line measurement —
    // (re)split after the marketing serif/display fonts are ready.
    const ready = (document as any).fonts?.ready ?? Promise.resolve();
    ready.then(() => {
      if (!ref.current) return;
      split = new SplitText(ref.current, { type: "lines", linesClass: "split-line" });
      gsap.set(split.lines, { yPercent: 0 });

      ctx = gsap.context(() => {
        const tween = gsap.from(split!.lines, {
          yPercent: 110,
          opacity: 0,
          duration: 0.9,
          ease: "power4.out",
          stagger: 0.08,
          delay,
          ...(mode === "scroll"
            ? { scrollTrigger: { trigger: ref.current, start: "top 88%", once: true } }
            : {}),
        });
        return () => tween.kill();
      });
    });

    return () => {
      ctx?.revert();
      split?.revert();
    };
  }, [mode, delay]);

  return (
    <Tag ref={ref as any} className={className}>
      {children}
    </Tag>
  );
}
