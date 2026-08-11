"use client";

/**
 * Quiet market atmosphere:
 * — sparse soft discs (no empty/dashed rings)
 * — outline food glyphs (reference style)
 * — a few small solid brand accents for finesse
 */

/** Few soft discs + tiny solid color dots. No empty ring outlines. */
export function SoftCircles({
  tone = "canvas",
}: {
  tone?: "canvas" | "ink" | "green";
}) {
  if (tone === "ink") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-20 top-16 h-40 w-40 rounded-full bg-white/[0.03]" />
        <div className="absolute -right-12 bottom-20 h-32 w-32 rounded-full bg-brand-orange/[0.07]" />
        <span className="absolute left-[18%] top-[22%] h-2 w-2 rounded-full bg-brand-orange/45" />
        <span className="absolute right-[20%] top-[58%] h-1.5 w-1.5 rounded-full bg-gold/50" />
        <span className="absolute bottom-[18%] left-[40%] h-2.5 w-2.5 rounded-full bg-brand-green/35" />
      </div>
    );
  }

  if (tone === "green") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-16 top-12 h-36 w-36 rounded-full bg-white/[0.05]" />
        <div className="absolute -left-10 bottom-16 h-28 w-28 rounded-full bg-brand-green-dark/20" />
        <span className="absolute left-[15%] top-[30%] h-2 w-2 rounded-full bg-gold/55" />
        <span className="absolute right-[22%] top-[48%] h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="absolute bottom-[22%] left-[55%] h-2 w-2 rounded-full bg-brand-orange/40" />
      </div>
    );
  }

  // canvas — very light, sparse
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-14 top-20 h-32 w-32 rounded-full bg-brand-orange/[0.05]" />
      <div className="absolute -right-10 bottom-24 h-28 w-28 rounded-full bg-brand-green/[0.06]" />
      <span className="absolute right-[16%] top-[28%] h-2 w-2 rounded-full bg-brand-orange/40" />
      <span className="absolute left-[22%] top-[62%] h-1.5 w-1.5 rounded-full bg-gold/45" />
      <span className="absolute bottom-[20%] right-[36%] h-2 w-2 rounded-full bg-brand-green/35" />
    </div>
  );
}

type FoodTone = "ink" | "green";

type IconSpec = {
  id: string;
  top: string;
  left?: string;
  right?: string;
  size: number;
  rotate: number;
  opacity: number;
  kind: FoodKind;
  /** outline = reference line-art; accent = small solid brand pop */
  style: "outline" | "accent";
  accent?: "orange" | "green" | "gold";
};

type FoodKind =
  | "pepper"
  | "fish"
  | "tomato"
  | "leaf"
  | "onion"
  | "basket"
  | "yam"
  | "chili"
  | "okra"
  | "corn";

const INK_LAYOUT: IconSpec[] = [
  { id: "i1", kind: "pepper", top: "9%", left: "4%", size: 38, rotate: -16, opacity: 0.28, style: "outline" },
  { id: "i2", kind: "basket", top: "12%", right: "5%", size: 36, rotate: 14, opacity: 0.24, style: "outline" },
  { id: "i3", kind: "fish", top: "26%", left: "6%", size: 42, rotate: 10, opacity: 0.22, style: "outline" },
  { id: "i4", kind: "leaf", top: "30%", right: "8%", size: 30, rotate: -20, opacity: 0.26, style: "outline" },
  { id: "i5", kind: "chili", top: "44%", left: "3%", size: 34, rotate: -26, opacity: 0.24, style: "outline" },
  { id: "i6", kind: "tomato", top: "48%", right: "4%", size: 28, rotate: 18, opacity: 0.22, style: "outline" },
  { id: "i7", kind: "onion", top: "62%", left: "7%", size: 32, rotate: 12, opacity: 0.2, style: "outline" },
  { id: "i8", kind: "corn", top: "66%", right: "6%", size: 34, rotate: -12, opacity: 0.22, style: "outline" },
  { id: "i9", kind: "yam", top: "80%", left: "5%", size: 30, rotate: 22, opacity: 0.2, style: "outline" },
  { id: "i10", kind: "okra", top: "84%", right: "10%", size: 28, rotate: -8, opacity: 0.22, style: "outline" },
  // small colored accents
  { id: "ia1", kind: "tomato", top: "20%", left: "16%", size: 14, rotate: 0, opacity: 0.55, style: "accent", accent: "orange" },
  { id: "ia2", kind: "leaf", top: "54%", right: "15%", size: 12, rotate: 20, opacity: 0.5, style: "accent", accent: "green" },
  { id: "ia3", kind: "pepper", top: "72%", left: "18%", size: 13, rotate: -15, opacity: 0.45, style: "accent", accent: "gold" },
];

const GREEN_LAYOUT: IconSpec[] = [
  { id: "g1", kind: "leaf", top: "10%", left: "5%", size: 36, rotate: -12, opacity: 0.32, style: "outline" },
  { id: "g2", kind: "pepper", top: "14%", right: "6%", size: 34, rotate: 16, opacity: 0.28, style: "outline" },
  { id: "g3", kind: "basket", top: "28%", left: "4%", size: 38, rotate: 8, opacity: 0.26, style: "outline" },
  { id: "g4", kind: "corn", top: "32%", right: "7%", size: 32, rotate: -18, opacity: 0.3, style: "outline" },
  { id: "g5", kind: "fish", top: "48%", left: "5%", size: 40, rotate: 14, opacity: 0.24, style: "outline" },
  { id: "g6", kind: "chili", top: "52%", right: "5%", size: 30, rotate: -28, opacity: 0.28, style: "outline" },
  { id: "g7", kind: "onion", top: "68%", left: "8%", size: 30, rotate: 10, opacity: 0.26, style: "outline" },
  { id: "g8", kind: "tomato", top: "72%", right: "8%", size: 28, rotate: -14, opacity: 0.28, style: "outline" },
  { id: "g9", kind: "okra", top: "86%", left: "6%", size: 26, rotate: 20, opacity: 0.24, style: "outline" },
  { id: "g10", kind: "yam", top: "88%", right: "12%", size: 28, rotate: -10, opacity: 0.26, style: "outline" },
  { id: "ga1", kind: "leaf", top: "22%", left: "17%", size: 13, rotate: 0, opacity: 0.55, style: "accent", accent: "gold" },
  { id: "ga2", kind: "tomato", top: "58%", right: "16%", size: 12, rotate: 12, opacity: 0.5, style: "accent", accent: "orange" },
  { id: "ga3", kind: "pepper", top: "78%", left: "20%", size: 12, rotate: -18, opacity: 0.48, style: "accent", accent: "green" },
];

const ACCENT: Record<"orange" | "green" | "gold", string> = {
  orange: "#E8541E",
  green: "#0E7A3C",
  gold: "#F2B705",
};

function FoodGlyph({
  kind,
  color,
  filled,
}: {
  kind: FoodKind;
  color: string;
  filled?: boolean;
}) {
  const stroke = color;
  const fill = filled ? color : "none";
  const sw = filled ? 0.8 : 1.35;

  switch (kind) {
    case "pepper":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5c1.1 0 1.9.7 2.1 1.6.7-.2 1.6.3 1.6 1.2 0 3.8-2 9.8-3.7 11.2C10.3 17.6 8.2 11.6 8.2 7.8c0-.9.8-1.4 1.6-1.2C10.1 5.7 10.9 5 12 5Z" />
          <path d="M11.4 4.2c.3-.9 1-.1.4 1.4" />
        </g>
      );
    case "fish":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 12c2.8-3.6 6.6-5.4 10.5-5.4 2.8 0 5.1 1.1 6.5 2.7l-2 1.1L21 12l-2.5 1.6 2 1.1c-1.4 1.6-3.7 2.7-6.5 2.7-3.9 0-7.7-1.8-10.5-5.4Z" />
          <circle cx="8.8" cy="11.2" r="0.7" fill={stroke} stroke="none" />
        </g>
      );
    case "tomato":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="13.2" r="6.2" />
          <path d="M12 7c0-1.2.8-2 1.8-2.3M12 7c0-1.1-.8-1.9-1.8-2.2M10 7.6c1.3.5 2.9.5 4.2 0" />
        </g>
      );
    case "leaf":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5.5 18.5C5.5 10.5 10 5 18.5 5 18.5 13.5 13 18.5 5.5 19.5Z" />
          <path d="M7.8 16.2C10 13 13.8 9.2 17.5 7" />
        </g>
      );
    case "onion":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6.5c3.2 0 5.5 2.9 5.5 6.5S15 20.5 12 20.5 6.5 16.7 6.5 13 8.8 6.5 12 6.5Z" />
          <path d="M10.8 5.5c.3-1.1.9-1.8 1.2-1.8s.9.7 1.2 1.8" />
        </g>
      );
    case "basket":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5.5 10.5h13l-1.1 8.2a1.2 1.2 0 0 1-1.2 1H7.8a1.2 1.2 0 0 1-1.2-1L5.5 10.5Z" />
          <path d="M4.5 10.5h15" />
          <path d="M8.2 10.5V9A3.8 3.8 0 0 1 12 5.2 3.8 3.8 0 0 1 15.8 9v1.5" />
        </g>
      );
    case "yam":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="12" rx="5" ry="8.2" transform="rotate(-26 12 12)" />
          <path d="M9.2 8.5c1 .6 2 .6 3 0M8.8 12c1.2.5 2.4.5 3.6 0" />
        </g>
      );
    case "chili":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 4c1 .2 1.7 1.2 1.5 2.2L10.2 19.5c-.3.8-1.3 1.1-2 .6-.7-.4-.9-1.4-.5-2.1L13 5.2C13.3 4.4 14.2 4 15.2 4Z" transform="translate(-1 0)" />
          <path d="M14.5 4.5c.6-1 1.6-1.5 2.4-1.2" />
        </g>
      );
    case "okra":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.8c2 1.8 3.4 5 3.4 8.6S14 19.2 12 20.2c-2-1-3.4-4.2-3.4-7.8S10 5.6 12 3.8Z" />
          <path d="M12 7v10M10 10c1.2.4 2.6.4 3.8 0M9.8 13.5c1.4.4 3 .4 4.4 0" />
        </g>
      );
    case "corn":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.5c2.2 1.4 3.2 4.4 3.2 8s-1 6.8-3.2 8.2c-2.2-1.4-3.2-4.6-3.2-8.2s1-6.6 3.2-8Z" />
          <path d="M10.2 8h3.6M10 11h4M10 14h4M10.2 17h3.6" />
        </g>
      );
    default:
      return null;
  }
}

/** Outline food glyphs + a few small solid accents for wave bands */
export function FoodScatter({ tone }: { tone: FoodTone }) {
  const layout = tone === "ink" ? INK_LAYOUT : GREEN_LAYOUT;
  const outlineColor = tone === "ink" ? "#9A9084" : "#C5E0CF";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {layout.map((icon) => {
        const color =
          icon.style === "accent" && icon.accent ? ACCENT[icon.accent] : outlineColor;
        return (
          <svg
            key={icon.id}
            viewBox="0 0 24 24"
            width={icon.size}
            height={icon.size}
            className="absolute"
            style={{
              top: icon.top,
              left: icon.left,
              right: icon.right,
              opacity: icon.opacity,
              transform: `rotate(${icon.rotate}deg)`,
            }}
          >
            <FoodGlyph kind={icon.kind} color={color} filled={icon.style === "accent"} />
          </svg>
        );
      })}
    </div>
  );
}
