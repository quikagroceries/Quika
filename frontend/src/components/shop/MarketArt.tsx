"use client";

import { TONE_COVER, marketInitials, type MarketArtTone } from "@/lib/vendorVisuals";

/**
 * Market cover tile — photo when available, monogram fallback otherwise.
 */
function MarketArt({
  tone,
  title,
  image,
  className = "",
  compact = false,
  featured = false,
}: {
  tone: MarketArtTone;
  title?: string;
  /** Atmospheric cover image (not claimed as venue photography). */
  image?: string | null;
  className?: string;
  compact?: boolean;
  /** Local markets get slightly richer covers (flagship). */
  featured?: boolean;
}) {
  const { bg, fg } = TONE_COVER[tone];
  const initials = marketInitials(title);
  const showPhoto = Boolean(image);

  if (compact) {
    return (
      <span
        className={"relative flex items-center justify-center overflow-hidden " + className}
        style={{ backgroundColor: bg, color: fg }}
        aria-hidden
      >
        {showPhoto ? (
          <img src={image!} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <span
          className={
            "relative text-sm font-extrabold tracking-tight " + (showPhoto ? "text-white" : "")
          }
          style={showPhoto ? { textShadow: "0 1px 4px rgba(0,0,0,0.45)" } : undefined}
        >
          {initials}
        </span>
      </span>
    );
  }

  return (
    <span
      className={"relative flex items-end overflow-hidden " + className}
      style={{ backgroundColor: bg, color: fg }}
      aria-hidden
    >
      {showPhoto ? (
        <>
          <img
            src={image!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(20,12,8,0.55) 0%, rgba(20,12,8,0.18) 45%, transparent 70%), linear-gradient(90deg, rgba(20,12,8,0.2) 0%, transparent 40%)",
            }}
          />
          <span
            className={
              "relative font-display font-extrabold leading-none tracking-tight text-white " +
              (featured ? "p-4 text-3xl sm:p-5 sm:text-4xl" : "p-3.5 text-2xl sm:text-3xl")
            }
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}
          >
            {initials}
          </span>
        </>
      ) : (
        <>
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: featured ? 0.5 : 0.35,
              background:
                "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.2), transparent 55%), radial-gradient(90% 70% at 0% 100%, rgba(0,0,0,0.25), transparent 50%)",
            }}
          />
          <span
            className={
              "relative font-display font-extrabold leading-none tracking-tight " +
              (featured ? "p-5 text-5xl sm:text-6xl" : "p-4 text-4xl sm:text-5xl")
            }
            style={{ opacity: 0.92 }}
          >
            {initials}
          </span>
        </>
      )}
    </span>
  );
}

export default MarketArt;
