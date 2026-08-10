"use client";

/**
 * Bolt-in-Basket illustration system — derived from the Quika logo:
 * orange basket, white lightning bolt, green produce silhouettes.
 * Variants react to context (hero fill, hover bounce, CTA stamp).
 */

function Bolt({ className = "text-white" }: any) {
  return (
    <path
      className={className}
      d="M14.2 2.5 6.8 13.1h5.1L9.6 21.5l8.8-12.2h-5.4L14.2 2.5Z"
      fill="currentColor"
    />
  );
}

/** Compact bolt mark for stamps / badges */
export function BoltMark({ className = "h-5 w-5", bouncing = false, iconClassName = "h-[55%] w-[55%]" }: any) {
  return (
    <span
      className={
        "inline-flex items-center justify-center rounded-full bg-brand-orange text-white " +
        (bouncing ? "transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-6" : "") +
        " " +
        className
      }
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className={iconClassName} aria-hidden>
        <Bolt />
      </svg>
    </span>
  );
}

function ProduceIcons({ filling }: any) {
  const items = [
    { d: "M8 14c0-3 2-5 4-5s4 2 4 5c0 2.5-1.8 4.5-4 4.5S8 16.5 8 14Z", x: 18, y: 8, delay: "0s" }, // fruit
    { d: "M4 18c1-6 3-10 5-11l1 1c-1 2-2 6-2 10H4Zm6-1c.5-5 2-9 4-11l1.2.8c-1.5 2-2.7 5.5-3 10.2H10Z", x: 38, y: 2, delay: "0.08s" }, // bread-ish
    { d: "M12 4c-1 3-1 6 0 9 1-3 1-6 0-9Zm-3 3c-.5 3 0 6 1 8M15 7c.5 3 0 6-1 8", x: 62, y: 4, delay: "0.16s" }, // greens
    { d: "M10 6h4v14c0 1.5-1 2.5-2 2.5s-2-1-2-2.5V6Zm1-3h2v3h-2V3Z", x: 88, y: 0, delay: "0.24s" }, // bottle
    { d: "M4 14c4-1 8-4 10-8 1 3-1 7-4 10l-6-2Z", x: 112, y: 10, delay: "0.32s" }, // carrot
    { d: "M8 10c2-3 6-3 8 0 2 3 0 7-4 8-4-1-6-5-4-8Z", x: 138, y: 6, delay: "0.4s" }, // leafy
  ];

  return (
    <g className="text-brand-green">
      {items.map((it, i) => (
        <g
          key={i}
          transform={`translate(${it.x} ${it.y})`}
          className={filling ? "bolt-produce" : ""}
          style={filling ? { animationDelay: it.delay } : undefined}
        >
          <path d={it.d} fill="currentColor" transform="scale(1.15)" />
        </g>
      ))}
    </g>
  );
}

/**
 * Hero / section centerpiece — basket fills with produce, bolt pulses.
 * @param {"hero"|"inline"|"mini"} size
 */
export function BoltBasket({ size = "hero", filling = true, className = "" }: any) {
  const dims = {
    hero: { w: 280, h: 300, className: "w-[220px] sm:w-[260px] md:w-[300px]" },
    inline: { w: 160, h: 172, className: "w-36 sm:w-40" },
    mini: { w: 88, h: 96, className: "w-20" },
  }[size];

  return (
    <div className={"relative " + dims.className + " " + className} aria-hidden>
      <svg viewBox="0 0 200 220" className="h-auto w-full drop-shadow-lg" role="img">
        <title>Quika basket with bolt</title>
        {/* Produce rising into basket */}
        <g transform="translate(10 8)">
          <ProduceIcons filling={filling} />
        </g>

        {/* Basket body */}
        <path
          d="M28 108h144l-14 86H42L28 108Z"
          fill="#E8541E"
          className={filling ? "bolt-basket-settle" : ""}
        />
        {/* Basket rim */}
        <path d="M22 108h156l-6 12H28l-6-12Z" fill="#C2430F" />

        {/* White bolt cut through basket */}
        <g transform="translate(76 128) scale(2.05)" className={filling ? "bolt-pulse" : ""}>
          <Bolt className="text-white" />
        </g>
      </svg>
    </div>
  );
}

/** Category tile icon — mini basket with one produce hint */
export function CategoryBasket({ kind = "produce", className = "" }: any) {
  const accents = {
    produce: "#0E7A3C",
    proteins: "#C2430F",
    pantry: "#F2B705",
    household: "#5B7C99",
  };
  const fill = accents[kind] || accents.produce;

  return (
    <svg viewBox="0 0 80 80" className={"h-16 w-16 " + className} aria-hidden>
      <circle cx="40" cy="22" r="10" fill={fill} opacity="0.9" />
      <path d="M14 38h52l-6 32H20L14 38Z" fill="#E8541E" />
      <path d="M12 38h56l-3 6H15l-3-6Z" fill="#C2430F" />
      <g transform="translate(28 46) scale(1.1)">
        <Bolt className="text-white" />
      </g>
    </svg>
  );
}
