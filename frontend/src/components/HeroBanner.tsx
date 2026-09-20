"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import squiggle1 from "@/assets/illustrations/decorative-squiggle-1.png";
import squiggle2 from "@/assets/illustrations/decorative-squiggle-2.png";

/**
 * The app's one page-hero shape, lifted straight out of ShopHeroSpotlight so
 * every section leads the same way Shop does: a warm illustrated card, not a
 * plain heading over a list.
 *
 * The pieces that make it read as "Qyka" rather than a generic panel, all
 * copied from the Shop hero rather than reinvented:
 *   - `rounded-3xl border-line bg-surface shadow-sm` card
 *   - two blurred ambient glow blobs (peach + cream) bleeding off the corners
 *   - quiet squiggle doodles tucked in the margins
 *   - a peach pill badge (optionally with a live pulse dot) above the title
 *   - `font-display` extrabold headline + muted body
 *   - a real illustration holding the right-hand column
 *   - an optional `chips` strip below a DASHED divider, each chip a soft
 *     `bg-sunken-2/70` tile - never an outlined alert box
 */
export type HeroChip = {
  src: any;
  title: string;
  body: string;
};

function HeroBanner({
  eyebrow,
  live = false,
  badge,
  leading,
  title,
  body,
  illustration,
  illustrationAlt = "",
  actions,
  chips,
  children,
  compact = false,
  banner,
}: {
  eyebrow?: string;
  /** adds the pulsing dot to the pill - for genuinely live/in-progress states */
  live?: boolean;
  /** replaces the default peach pill entirely (e.g. market avatar + status badge) */
  badge?: ReactNode;
  /** rendered above everything, inside the card - the order screen's back button */
  leading?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  illustration?: any;
  illustrationAlt?: string;
  actions?: ReactNode;
  chips?: HeroChip[];
  children?: ReactNode;
  /** Denser variant for pages where the action below is the point (delivery, estimate). */
  compact?: boolean;
  /** Shown ABOVE the hero on phones only (the active-order card); desktop has the header pill for that. */
  banner?: ReactNode;
}) {
  return (
    <>
      {banner && <div className="md:hidden">{banner}</div>}
    <div className={"relative overflow-hidden rounded-3xl border border-line bg-surface shadow-sm " + (compact ? "mb-4 p-5" : "mb-6 p-6 sm:p-8")}>
      {/* Ambient glow - the thing that stops this reading as a flat white box */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-brand-orange/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-64 w-64 rounded-full bg-[#F9E0CC]/40 blur-3xl" />

      <Image
        src={squiggle1}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -left-3 top-4 hidden w-14 -rotate-12 opacity-[0.16] sm:block"
      />
      <Image
        src={squiggle2}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-2 bottom-6 hidden w-16 rotate-12 opacity-[0.14] lg:block"
      />

      {leading && <div className={"relative z-10 " + (compact ? "mb-3" : "mb-4")}>{leading}</div>}

      <div className="relative z-10 grid items-center gap-6 lg:grid-cols-12">
        <div className={illustration ? "lg:col-span-7" : "lg:col-span-12"}>
          {badge ?? (
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/15 px-3 py-1 text-xs font-bold text-brand-orange-dark">
              {live && <span className="flex h-2 w-2 animate-pulse rounded-full bg-brand-orange" />}
              {eyebrow}
            </div>
          )}

          <h1 className={"font-display font-extrabold tracking-tight text-ink " + (compact ? "mt-3 text-xl sm:text-2xl lg:text-3xl" : "mt-4 text-2xl sm:text-3xl lg:text-4xl")}>
            {title}
          </h1>

          {body && <p className={"leading-relaxed text-muted " + (compact ? "mt-1.5 text-sm" : "mt-3 text-sm sm:text-base")}>{body}</p>}

          {actions && <div className={"flex flex-wrap items-center gap-3 " + (compact ? "mt-4" : "mt-6")}>{actions}</div>}
        </div>

        {illustration && (
          <div className="flex justify-center lg:col-span-5">
            <div className={"relative max-w-full " + (compact ? "w-24 sm:w-32" : "w-40 sm:w-52")}>
              <Image
                src={illustration}
                alt={illustrationAlt}
                className="h-auto w-full object-contain drop-shadow-md"
                priority
              />
            </div>
          </div>
        )}
      </div>

      {children && <div className="relative z-10 mt-6">{children}</div>}

      {chips && chips.length > 0 && (
        // Dashed divider + soft tinted tiles, exactly the Shop hero's own
        // badge strip - no borders, no alert-box look.
        <div className="relative z-10 mt-6 grid grid-cols-1 gap-3 border-t border-dashed border-line-strong pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {chips.map((chip) => (
            <div
              key={chip.title}
              className="flex items-center gap-3 rounded-2xl bg-sunken-2/70 p-3 transition hover:bg-sunken-2"
            >
              <div className="h-10 w-10 shrink-0">
                <Image src={chip.src} alt="" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <h4 className="truncate text-xs font-bold text-ink">{chip.title}</h4>
                <p className="truncate text-[11px] text-muted">{chip.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

export default HeroBanner;