'use client';

// The one card shape the whole app uses: white, rounded-2xl, a light border
// (so the edge reads clearly even on the white/canvas backgrounds it sits
// on) plus a barely-there shadow for lift rather than a heavy floating one.
// `interactive` adds the tap/hover affordance for clickable cards (order
// list rows) without callers repeating the classes.

function Card({ interactive = false, className = "", children, ...props }: any) {
  return (
    <div
      className={[
        "bg-white rounded-2xl border border-[#ebe7e0] shadow-sm p-5",
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
