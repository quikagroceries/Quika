"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { EASE } from "@/components/marketing/motion";
import scooterArt from "@/assets/illustrations/rider-scooter-basket-1.png";

/* Small, purposeful landing-page motion. Everything here animates transform /
 * opacity only, and every piece falls back to a static render when the visitor
 * prefers reduced motion (the page also sits inside <MotionConfig
 * reducedMotion="user">, which covers the framer-driven transforms). */

/** Headline that slides up word by word out of a mask. */
export function WordReveal({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden py-[0.08em] -my-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={reduce ? false : { y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, delay: delay + i * 0.08, ease: EASE }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** A hand-drawn-looking underline that draws itself under its parent word. */
export function DrawUnderline({ delay = 0.9, className = "" }: { delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 300 16"
      preserveAspectRatio="none"
      className={"pointer-events-none absolute inset-x-0 -bottom-1 h-3 w-full sm:h-4 " + className}
      aria-hidden
    >
      <motion.path
        d="M3 10 C 60 2, 120 15, 180 7 S 270 4, 297 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        className="text-brand-orange/70"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay, ease: EASE }}
      />
    </svg>
  );
}

/** Gentle endless bob. Position/size classes go on the wrapper; rotation stays on the child. */
export function Float({
  children,
  className = "",
  amp = 6,
  dur = 4,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  amp?: number;
  dur?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -amp, 0] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Springy pop on mount (hero pieces) or when scrolled into view. */
export function PopIn({
  children,
  className = "",
  delay = 0,
  inView = false,
  from = { scale: 0.5, y: 16 },
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  inView?: boolean;
  from?: { scale?: number; y?: number; x?: number };
}) {
  const reduce = useReducedMotion();
  const target = { opacity: 1, scale: 1, x: 0, y: 0 };
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, ...from }}
      {...(inView
        ? { whileInView: target, viewport: { once: true, amount: 0.4 } }
        : { animate: target })}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Falls in from above and lands with a bounce - used to "fill the basket". */
export function DropIn({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: -140, rotate: -25 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ type: "spring", stiffness: 170, damping: 12, mass: 0.9, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Slides in from the side, settling with a small overshoot (the hero scooter). */
export function DriveIn({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { x: "-130%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 70, damping: 15, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Cycles example list lines into a placeholder, typed out. Off while focused / filled. */
export function useTypedPlaceholder(lines: string[], active: boolean): string {
  const reduce = useReducedMotion();
  const [text, setText] = useState(lines[0] ?? "");

  useEffect(() => {
    if (reduce || !active) {
      setText(lines[0] ?? "");
      return;
    }
    let i = 0;
    let c = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const line = lines[i % lines.length];
      c++;
      setText(line.slice(0, c) + (c < line.length ? "|" : ""));
      if (c < line.length) {
        timer = setTimeout(tick, 55);
      } else {
        timer = setTimeout(() => {
          i++;
          c = 0;
          tick();
        }, 1500);
      }
    };
    tick();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lines is a static list
  }, [reduce, active]);

  return text;
}

/* ---- ingredient -> list "fly" ------------------------------------------- */

export const ADD_ITEM_EVENT = "qyka-landing-add-item";
export type AddItemDetail = { line: string; src?: string; from?: { left: number; top: number; width: number; height: number } };

/** Draws the little ingredient that flies from the strip up into the list box. */
export function FlyLayer({ targetId }: { targetId: string }) {
  const [flights, setFlights] = useState<{ id: number; src: string; from: NonNullable<AddItemDetail["from"]>; to: { x: number; y: number } }[]>([]);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onAdd = (e: Event) => {
      const d = (e as CustomEvent<AddItemDetail>).detail;
      if (reduce || !d?.src || !d.from) return;
      const el = document.getElementById(targetId);
      if (!el) return;
      // The page scrolls to the top as this plays, so the landing spot is the
      // box's position in the DOCUMENT (== its viewport position at scrollY 0).
      const r = el.getBoundingClientRect();
      const to = { x: r.left + 28, y: r.top + window.scrollY + 24 };
      const id = Date.now() + Math.random();
      setFlights((f) => [...f, { id, src: d.src!, from: d.from!, to }]);
      setTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), 1100);
    };
    window.addEventListener(ADD_ITEM_EVENT, onAdd);
    return () => window.removeEventListener(ADD_ITEM_EVENT, onAdd);
  }, [reduce, targetId]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]" aria-hidden>
      <AnimatePresence>
        {flights.map((f) => (
          <motion.img
            key={f.id}
            src={f.src}
            alt=""
            className="absolute left-0 top-0 h-14 w-14 object-contain drop-shadow-md"
            initial={{ x: f.from.left, y: f.from.top, scale: 1, opacity: 1, rotate: 0 }}
            animate={{ x: f.to.x, y: f.to.y, scale: 0.55, opacity: [1, 1, 0], rotate: 18 }}
            transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---- the delivery line ---------------------------------------------------- */

/** A dotted road down the left edge of the page; a scooter rides it as you scroll. */
export function DeliveryLine({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start 30%", "end 70%"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  const top = useTransform(p, [0, 1], ["0%", "100%"]);
  // Hidden with CSS (not `return null`) for reduced-motion: a JS branch here
  // renders differently on server and client and breaks hydration.
  return (
    <div className="pointer-events-none absolute bottom-[14rem] left-5 top-[105vh] z-0 hidden w-11 xl:block motion-reduce:hidden" aria-hidden>
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-brand-orange/30" />
      <motion.div style={{ scaleY: p }} className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 origin-top rounded-full bg-brand-orange/70" />
      <motion.div style={{ top }} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface shadow-md">
          <Image src={scooterArt} alt="" className="h-8 w-8 object-contain" />
        </span>
      </motion.div>
    </div>
  );
}

/* ---- chat bubbles that "play" once in view -------------------------------- */

const WHO = ["agent", "you", "agent"] as const;

export function ChatDemo({ lines, className = "" }: { lines: string[]; className?: string }) {
  const CHAT = lines.map((text, i) => ({ who: WHO[i] ?? "agent", text }));
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? CHAT.length : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    const timers = CHAT.map((_, i) => setTimeout(() => setShown(i + 1), 500 + i * 1300));
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce]);

  return (
    <div ref={ref} className={"flex flex-col gap-2 " + className}>
      {CHAT.slice(0, shown).map((m, i) => (
        <motion.div
          key={i}
          initial={reduce ? false : { opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className={
            "max-w-[15rem] rounded-2xl px-3.5 py-2 text-sm font-semibold shadow-md " +
            (m.who === "you"
              ? "self-end rounded-br-md bg-brand-orange text-[#1A1A1A]"
              : "self-start rounded-bl-md border border-line bg-surface text-ink")
          }
        >
          {m.text}
        </motion.div>
      ))}
      {shown > 0 && shown < CHAT.length && !reduce && (
        <div className={"flex gap-1 rounded-2xl border border-line bg-surface px-3 py-2 shadow-sm " + (CHAT[shown].who === "you" ? "self-end" : "self-start")}>
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="h-1.5 w-1.5 rounded-full bg-faint"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.6, delay: d * 0.12, repeat: Infinity }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
