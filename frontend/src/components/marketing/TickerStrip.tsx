"use client";

import Marquee from "@/components/marketing/Marquee";

const TONES = {
  ink: "bg-ink text-white",
  orange: "bg-brand-orange text-[#1A1A1A]",
  green: "bg-brand-green text-white",
  gold: "bg-gold text-ink",
  canvas: "bg-canvas text-ink",
} as const;

/** The site's recurring section-divider motif — a manifest/ledger ticker
 * instead of blank whitespace between sections. */
export default function TickerStrip({
  items,
  tone = "ink",
  speed = 46,
  reverse = false,
}: {
  items: readonly string[];
  tone?: keyof typeof TONES;
  speed?: number;
  reverse?: boolean;
}) {
  return (
    <div className={"border-y border-black/10 py-3 " + TONES[tone]}>
      <Marquee speed={speed} reverse={reverse}>
        {items.map((item, i) => (
          <span key={i} className="mx-4 flex items-center gap-4 font-display text-sm font-extrabold uppercase tracking-[0.14em]">
            {item}
            <span aria-hidden className="text-[0.6em] opacity-50">
              ✦
            </span>
          </span>
        ))}
      </Marquee>
    </div>
  );
}
