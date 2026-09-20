/** A horizontal wavy rule, filling `flex-1` like the `border-t
 * border-dashed` spans it replaces - CSS has no `border-style: wavy`, so
 * this is a tiled SVG sine-wave background instead. Same
 * `border-line-strong` color (`#E0DDD3`) as the dashed dividers elsewhere,
 * for a direct side-by-side comparison. Purely decorative dividers only
 * (like the "or" rule here) - the dashed style stays wherever it carries
 * real meaning (the delivery timeline's "not yet reached" segments). */
function WavyDivider({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={"h-[6px] flex-1 " + className}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='6' viewBox='0 0 16 6'%3E%3Cpath d='M0 3 Q4 0 8 3 T16 3' stroke='%23E0DDD3' fill='none' stroke-width='1.5'/%3E%3C/svg%3E\")",
        backgroundRepeat: "repeat-x",
        backgroundPosition: "center",
      }}
    />
  );
}

export default WavyDivider;
