'use client';

// RULE (keep every card in the app on this): a top-level card is exactly
// this shape - rounded-3xl, border-line, shadow-sm, bg-surface. Only tiles
// nested INSIDE a card (stat tiles, item wells) drop to rounded-2xl, and
// alerts are a soft peach tint with no border (never a thick outline).
// The one card shape the whole app uses: white, rounded-3xl (24px, per the
// design-system spec extracted from the auth reference screen), a light
// border (so the edge reads clearly even on the white/canvas backgrounds it
// sits on) plus a barely-there shadow for lift rather than a heavy floating
// one. `interactive` adds the tap/hover affordance for clickable cards
// (order list rows) without callers repeating the classes.

function Card({ interactive = false, className = "", children, ...props }: any) {
  return (
    <div
      className={[
        "bg-surface rounded-3xl border border-line shadow-sm p-5",
        interactive
          ? "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm"
          : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
