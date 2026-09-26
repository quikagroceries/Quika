"use client";

import { useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import { motion, useInView, useScroll, useSpring, useTransform } from "framer-motion";

export type RiderArt = {
  src: StaticImageData;
  /** Tailwind width classes for this illustration. */
  size: string;
  /** Vehicles get a quick engine-bump while they drive. */
  bump?: boolean;
};

/**
 * A narrator illustration on the bottom edge of a section, with a speech bubble.
 *  - ride:  drives end to end across the section as you scroll past.
 *  - pulse: parks at `at`% and loops a tap ripple with a "+1", for the
 *           tap-to-add section.
 *  - still: parks at `at`% and pops in once, no movement.
 * The parent section must be `relative`.
 */
export function SectionRider({
  caption,
  art,
  mode = "ride",
  dir = "ltr",
  at = 8,
  corner = false,
  first = false,
}: {
  caption: string;
  art: RiderArt;
  mode?: "ride" | "pulse" | "still";
  dir?: "ltr" | "rtl";
  at?: number;
  /** Park in the section's top-right, beside its heading, instead of on the bottom edge. */
  corner?: boolean;
  first?: boolean;
}) {
  const lane = useRef<HTMLDivElement>(null);
  const seen = useInView(lane, { once: mode === "still", margin: "0px 0px -10% 0px" });
  const { scrollY } = useScroll();
  const { scrollYProgress } = useScroll({ target: lane, offset: ["start 96%", "end 30%"] });
  // The hero sits at the top of the page, so it rides on raw scroll distance
  // and starts from the left edge the moment the page loads.
  const raw = useTransform(scrollY, [0, 520], [0, 1], { clamp: true });
  const progress = useSpring(first ? raw : scrollYProgress, { stiffness: 110, damping: 26, mass: 0.4 });

  const rtl = dir === "rtl";
  const pos = useTransform(progress, (v) => (rtl ? 1 - v : v));
  const left = useTransform(pos, (v) => `${v * 100}%`);
  const x = useTransform(pos, (v) => `${(v - 1) * 100}%`);
  const rideBubble = useTransform(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);

  const bubbleCls =
    "absolute bottom-full left-1/2 mb-1 w-max max-w-[13rem] -translate-x-1/2 rounded-2xl border border-line bg-surface px-3 py-1.5 text-center font-display text-xs font-bold text-ink shadow-md sm:text-sm";
  const laneCls =
    "pointer-events-none absolute bottom-0 left-1/2 z-20 h-40 w-screen -translate-x-1/2 [overflow-x:clip] [overflow-y:visible] motion-reduce:hidden";

  if (corner) {
    return (
      <div ref={lane} aria-hidden className="pointer-events-none absolute left-1/2 top-0 z-20 h-24 w-screen -translate-x-1/2 motion-reduce:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={seen ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ right: "max(1rem, calc((100vw - 72rem) / 2 + 1.5rem))" }}
          className={`absolute top-2 ${art.size}`}
        >
          <p className="absolute right-full top-1/2 mr-3 hidden w-max max-w-[13rem] -translate-y-1/2 rounded-2xl border border-line bg-surface px-3 py-1.5 text-center font-display text-sm font-bold text-ink shadow-md sm:block">
            {caption}
          </p>
          <motion.div
            animate={seen ? { scale: [1, 1.09, 1], rotate: [0, -3, 0] } : undefined}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image src={art.src} alt="" className="h-auto w-full" />
          </motion.div>
          {seen && (
            <>
              <motion.span
                className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-orange"
                animate={{ scale: [0.4, 1.7], opacity: [0.7, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.span
                className="absolute -top-1 -right-1 rounded-full bg-brand-orange px-1.5 py-0.5 font-display text-[10px] font-extrabold text-[#1A1A1A]"
                animate={{ y: [4, -12], opacity: [0, 1, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", times: [0, 0.25, 1] }}
              >
                +1
              </motion.span>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  if (mode === "ride") {
    return (
      <div ref={lane} aria-hidden className={laneCls}>
        <motion.div style={{ left, x }} className={`absolute bottom-1 ${art.size}`}>
          <motion.p style={{ opacity: rideBubble }} className={bubbleCls}>
            {caption}
          </motion.p>
          <motion.div
            animate={art.bump ? { y: [0, -2, 0] } : undefined}
            transition={art.bump ? { duration: 0.32, repeat: Infinity, ease: "easeInOut" } : undefined}
            style={{ scaleX: rtl ? -1 : 1 }}
          >
            <Image src={art.src} alt="" className="h-auto w-full" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={lane} aria-hidden className={laneCls}>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={seen ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 18, scale: 0.94 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ left: `${at}%` }}
        className={`absolute bottom-1 ${art.size}`}
      >
        <p className={bubbleCls}>{caption}</p>
        <motion.div
          animate={mode === "pulse" && seen ? { scale: [1, 1.09, 1], rotate: [0, -3, 0] } : undefined}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image src={art.src} alt="" className="h-auto w-full" />
        </motion.div>
        {mode === "pulse" && seen && (
          <>
            <motion.span
              className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-orange"
              animate={{ scale: [0.4, 1.7], opacity: [0.7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              className="absolute -top-2 right-2 rounded-full bg-brand-orange px-2 py-0.5 font-display text-xs font-extrabold text-[#1A1A1A]"
              animate={{ y: [6, -22], opacity: [0, 1, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", times: [0, 0.25, 1] }}
            >
              +1
            </motion.span>
          </>
        )}
      </motion.div>
    </div>
  );
}
