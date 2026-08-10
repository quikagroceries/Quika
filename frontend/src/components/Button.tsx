'use client';

// One button, three looks — primary (orange filled), secondary (green
// outline), neutral/"ghost" (gray). Every screen should use this instead of
// raw <button className="..."> so the brand styling stays consistent in one
// place — see the styling-pass notes on why this comes before screen work.

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 min-h-[44px] " +
  "font-semibold text-base transition-all duration-150 select-none " +
  "active:scale-[0.98] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

const VARIANTS = {
  // Primary: main buttons, key actions (Pay, Send, Place order, Finish shopping).
  primary:
    "bg-brand-orange text-white shadow-sm hover:bg-brand-orange-dark hover:shadow " +
    "active:bg-brand-orange-dark focus-visible:ring-brand-orange",
  // Secondary: confirmations / lower-emphasis positive actions.
  secondary:
    "border-2 border-brand-green text-brand-green bg-white " +
    "hover:bg-brand-green/5 active:bg-brand-green/10 focus-visible:ring-brand-green",
  // Neutral ("ghost"): Cancel, Back, Log out, Dismiss — anything low-emphasis.
  neutral:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 " +
    "active:bg-slate-300 focus-visible:ring-slate-400",
};

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function Button({
  variant = "primary",
  fullWidth = false,
  busy = false,
  disabled = false,
  className = "",
  children,
  ...props
}: any) {
  return (
    <button
      disabled={disabled || busy}
      className={[
        BASE,
        VARIANTS[variant] || VARIANTS.primary,
        fullWidth ? "w-full" : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

export default Button;
