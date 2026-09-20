"use client";

import Image from "next/image";
import { TONE_COVER, marketInitials, type MarketArtTone } from "@/lib/vendorVisuals";

import marketStallProduce from "@/assets/illustrations/market-stall-produce.png";
import vendorStallFish from "@/assets/illustrations/vendor-stall-fish.png";
import vendorStallPantry from "@/assets/illustrations/vendor-stall-pantry-jars.png";
import marketCartVendor from "@/assets/illustrations/market-cart-vendor.png";
import groceryBasket from "@/assets/illustrations/grocery-basket.png";
import produceCrate from "@/assets/illustrations/produce-crate.png";
import vendorStallDairy from "@/assets/illustrations/vendor-stall-dairy.png";

const TONE_ILLUSTRATIONS: Record<MarketArtTone, any> = {
  produce: marketStallProduce,
  protein: vendorStallFish,
  provisions: vendorStallPantry,
  mixed: marketCartVendor,
};

/**
 * Market & Stall cover art tile — utilizes meaningful illustration assets
 * and subtle atmospheric gradients while retaining clarity and craft.
 */
export function MarketArt({
  tone,
  title,
  image,
  className = "",
  compact = false,
  featured = false,
}: {
  tone: MarketArtTone;
  title?: string;
  image?: string | null;
  className?: string;
  compact?: boolean;
  featured?: boolean;
}) {
  const { bg, fg } = TONE_COVER[tone] || TONE_COVER.mixed;
  const initials = marketInitials(title);
  const showPhoto = Boolean(image);
  const illustration = TONE_ILLUSTRATIONS[tone] || groceryBasket;

  if (compact) {
    return (
      <span
        className={"relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl " + className}
        style={{ backgroundColor: bg, color: fg }}
        aria-hidden
      >
        {showPhoto ? (
          <img src={image!} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Image
            src={illustration}
            alt=""
            className="h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
          />
        )}
      </span>
    );
  }

  return (
    <span
      className={
        "group relative flex items-end justify-between overflow-hidden rounded-2xl " +
        className
      }
      style={{ backgroundColor: bg, color: fg }}
      aria-hidden
    >
      {showPhoto ? (
        <>
          <img
            src={image!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(20,12,8,0.65) 0%, rgba(20,12,8,0.2) 50%, transparent 75%)",
            }}
          />
          <span
            className={
              "relative font-display font-extrabold leading-none tracking-tight text-white " +
              (featured ? "p-4 text-3xl sm:p-5 sm:text-4xl" : "p-3.5 text-2xl sm:text-3xl")
            }
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
          >
            {initials}
          </span>
        </>
      ) : (
        <>
          {/* Subtle atmospheric gradient */}
          <span
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background: `radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.7), transparent 60%), radial-gradient(90% 70% at 0% 100%, ${fg}20, transparent 60%)`,
            }}
          />

          {/* Meaningful Contextual Illustration */}
          <div className="absolute -right-2 -bottom-2 h-3/4 w-3/4 max-w-[150px] transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1">
            <Image
              src={illustration}
              alt=""
              className="h-full w-full object-contain drop-shadow-sm"
              priority={featured}
            />
          </div>

          {/* Monogram Badge */}
          <div className="relative z-10 p-3.5 sm:p-4">
            <span
              className={
                "inline-block font-display font-extrabold leading-none tracking-tight " +
                (featured ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl")
              }
              style={{ opacity: 0.95 }}
            >
              {initials}
            </span>
          </div>
        </>
      )}
    </span>
  );
}

export default MarketArt;
