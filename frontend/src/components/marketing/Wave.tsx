"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Wave divider — both layers are solid `bg-*` (CSS mask for the scallop).
 * Avoids SVG fill stretch banding / color offsets.
 * `from` = peaks (previous band), `to` = scallops (next band)
 * Scallop loops horizontally forever (one tile = 50% of the 200%-wide layer).
 */
export default function Wave({
  from = "bg-canvas",
  to = "bg-ink",
}: {
  from?: string;
  to?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={"wave-divider " + from} aria-hidden>
      <motion.div
        className={"wave-divider__scallop " + to}
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 14, ease: "linear", repeat: Infinity }
        }
      />
    </div>
  );
}
