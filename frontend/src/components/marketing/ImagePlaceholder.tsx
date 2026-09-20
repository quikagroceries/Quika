"use client";

/**
 * Stand-in for real photography that hasn't been shot yet — labeled so it's
 * obvious in review what to replace and with what. Mirrors AppPhoneSlot's
 * pattern (screens/MarketingPage.tsx): try the real file, fall back to a
 * branded placeholder on error, rather than only ever showing a fake box.
 */
export default function ImagePlaceholder({
  label,
  file,
  className = "",
  tone = "light",
  align = "center",
}: {
  /** What the shot should be, e.g. "Rider on a delivery bike" */
  label: string;
  /** Suggested filename, shown so it's obvious where to drop the real asset */
  file?: string;
  className?: string;
  tone?: "light" | "dark";
  /** "top" keeps the label clear of content overlaid on the lower half (e.g. a card's caption). */
  align?: "center" | "top";
}) {
  const dark = tone === "dark";
  return (
    <div
      className={
        "flex flex-col items-center gap-2 border-2 border-dashed text-center " +
        (align === "top" ? "justify-start pt-10" : "justify-center") +
        " " +
        (dark ? "border-white/20 bg-white/5 text-white/50" : "border-ink/15 bg-ink/[0.03] text-ink/40") +
        " " +
        className
      }
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="m4 17 5-5 4 4 3-3 4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="max-w-[16rem] px-4 text-xs font-semibold leading-snug">{label}</p>
      {file && <p className="font-mono text-[0.65rem] opacity-70">{file}</p>}
    </div>
  );
}
