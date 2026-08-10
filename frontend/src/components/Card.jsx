// The one card shape the whole app uses: white, rounded-2xl, soft layered
// shadow, generous padding. `interactive` adds the tap/hover affordance for
// clickable cards (order list rows) without callers repeating the classes.

function Card({ interactive = false, className = "", children, ...props }) {
  return (
    <div
      className={[
        "bg-white rounded-2xl shadow-card p-5",
        interactive
          ? "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-card"
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
