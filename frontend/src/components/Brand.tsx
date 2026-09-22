import Link from "next/link";

/**
 * The one Qyka logo lockup - the Q-basket mark + "Qyka / Groceries" wordmark
 * exactly as the sidebar draws it. Header, footer and auth all use this, so
 * the logo can't drift between the app and the marketing site again.
 */
export default function Brand({
  href = "/",
  size = "md",
  dark = false,
  className = "",
}: {
  href?: string | null;
  size?: "md" | "lg";
  /** The mark is a solid black silhouette - on a dark background it needs
   * inverting to white, and the wordmark needs light text, or both
   * disappear entirely rather than just looking a bit off. */
  dark?: boolean;
  className?: string;
}) {
  const lg = size === "lg";
  const mark = (
    <span className={"flex items-center gap-2 " + className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        className={(lg ? "h-11 w-11" : "h-9 w-9") + " shrink-0 object-contain " + (dark ? "invert" : "")}
      />
      <span className="leading-none">
        <span className={"block font-logo leading-none " + (dark ? "text-white" : "text-ink") + " " + (lg ? "text-3xl" : "text-2xl")}>Qyka</span>
        <span className={"block font-logo leading-none tracking-wide " + (dark ? "text-white/60" : "text-muted") + " " + (lg ? "text-sm" : "text-xs")}>Groceries</span>
      </span>
    </span>
  );
  return href ? (
    <Link href={href} aria-label="Qyka Groceries home" className="inline-flex">
      {mark}
    </Link>
  ) : (
    mark
  );
}
