"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Mount animation for above-the-fold / hero content (whileInView often skips) */
export function HeroIn({
  children,
  className = "",
  delay = 0,
  y = 28,
  duration = 0.7,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Scroll-triggered reveal — fade + direction + optional scale */
export function Reveal({
  children,
  className = "",
  delay = 0,
  x = 0,
  y = 36,
  scale,
  duration = 0.75,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  x?: number;
  y?: number;
  scale?: number;
  duration?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y, scale: scale ?? 1 }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px", amount: 0.15 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className = "",
  stagger = 0.1,
  delay = 0,
  /** Use mount animation instead of whileInView (heroes / first screen) */
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  immediate?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      {...(immediate
        ? { animate: "show" }
        : {
            whileInView: "show",
            viewport: { once: true, margin: "0px 0px -8% 0px", amount: 0.12 },
          })}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
  y = 40,
  x = 0,
  scale = 0.94,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  x?: number;
  scale?: number;
}) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y, x, scale },
        show: {
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
          transition: { duration: 0.7, ease: EASE },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function ClipReveal({
  children,
  direction = "up",
  delay = 0,
  className,
}: {
  children: ReactNode;
  direction?: "up" | "left" | "right";
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  const clipVariants = {
    hidden: {
      clipPath: direction === "up"
        ? "inset(100% 0% 0% 0%)"
        : direction === "left"
          ? "inset(0% 100% 0% 0%)"
          : "inset(0% 0% 0% 100%)",
    },
    visible: {
      clipPath: "inset(0% 0% 0% 0%)",
      transition: { duration: 0.8, ease: EASE, delay },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-15%" }}
      variants={clipVariants}
    >
      {children}
    </motion.div>
  );
}
