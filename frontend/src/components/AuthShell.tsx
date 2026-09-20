"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Card from "@/components/Card";
// A layered mosaic, not a single flat row: the 8-beat "market delivery"
// story (a customer's list, an agent conversation, the market, the cart,
// the rider) carries the composition at full size/opacity, the four
// squiggle doodles sit *between* consecutive beats as connective tissue
// suggesting motion from one to the next, and a handful of the sharpest
// produce icons fill the leftover corners as smaller, quieter texture -
// three tiers of visual weight instead of everything competing equally.
import personShoppingList from "@/assets/illustrations/person-shopping-list.png";
import riderBicycle from "@/assets/illustrations/rider-bicycle.png";
import riderScooterBasket from "@/assets/illustrations/rider-scooter-basket-2.png";
import vendorStallFish from "@/assets/illustrations/vendor-stall-fish.png";
import shoppingCart from "@/assets/illustrations/shopping-cart.png";
import sceneAgentLaptop from "@/assets/illustrations/scene-agent-laptop-delivery.png";
import agentCustomerConversation from "@/assets/illustrations/agent-customer-conversation.png";
import phoneShoppingList from "@/assets/illustrations/phone-shopping-list.png";
import squiggle1 from "@/assets/illustrations/decorative-squiggle-1.png";
import squiggle2 from "@/assets/illustrations/decorative-squiggle-2.png";
import squiggleArrow from "@/assets/illustrations/decorative-squiggle-arrow.png";
import squiggleLeaf from "@/assets/illustrations/decorative-squiggle-leaf.png";
import artichoke from "@/assets/illustrations/artichoke.png";
import grapes from "@/assets/illustrations/grapes.png";
import pineapple from "@/assets/illustrations/pineapple.png";
import garlic from "@/assets/illustrations/garlic.png";
import onion from "@/assets/illustrations/onion.png";
import raspberries from "@/assets/illustrations/raspberries.png";

// Arranged clockwise around the card as one flow rather than a loose
// scatter - 9 o'clock through to the anchor at ~4:30, each position the
// next beat in the story:
//   9:00 list → 10:30 order placed → 12:00 agent confirms → 1:30 agent
//   shops the market → 3:00 order packed → 4:30 (anchor) agent logs the
//   delivery → 6:00 rider dispatched → 7:30 delivered. Squiggles bridge
// each consecutive pair; a produce icon anchors each far corner.
const LEFT: { src: any; top: string; left: string; w: string; op: string; flip?: boolean }[] = [
  { src: artichoke, top: "4%", left: "3%", w: "w-16", op: "opacity-60" }, // corner texture
  { src: personShoppingList, top: "48%", left: "6%", w: "w-40", op: "opacity-90" }, // 9:00 - make a list
  { src: squiggleLeaf, top: "34%", left: "25%", w: "w-14", op: "opacity-70" }, // 9:00 → 10:30 connector
  { src: phoneShoppingList, top: "20%", left: "15%", w: "w-28", op: "opacity-90" }, // 10:30 - place the order
  { src: squiggleArrow, top: "8%", left: "27%", w: "w-14", op: "opacity-70" }, // 10:30 → 12:00 connector
  { src: riderScooterBasket, top: "76%", left: "15%", w: "w-40", op: "opacity-90" }, // 7:30 - delivered
  { src: grapes, top: "92%", left: "6%", w: "w-14", op: "opacity-60" }, // corner texture
];

const RIGHT: { src: any; top: string; right: string; w: string; op: string; flip?: boolean; priority?: boolean }[] = [
  { src: pineapple, top: "4%", right: "3%", w: "w-16", op: "opacity-60" }, // corner texture
  { src: vendorStallFish, top: "20%", right: "15%", w: "w-40", op: "opacity-90" }, // 1:30 - agent shops the market
  { src: squiggle1, top: "36%", right: "22%", w: "w-14", op: "opacity-70" }, // 1:30 → 3:00 connector
  // `priority` here isn't about LCP - it's a fix: this asset's lazy-load
  // (IntersectionObserver-gated, like every other decorative image) never
  // actually fires in some page loads even though it's on-screen and the
  // file itself is fine, so it forces eager loading instead of leaving it
  // to a race that occasionally never resolves.
  { src: shoppingCart, top: "50%", right: "6%", w: "w-36", op: "opacity-90", priority: true }, // 3:00 - order packed
  { src: garlic, top: "70%", right: "26%", w: "w-14", op: "opacity-55" }, // 3:00 → anchor texture
];

// 12:00, at the very top of the canvas - the agent confirming with the
// customer, the step right before shopping starts. Onion balances the band
// on the opposite side from the squiggle connector below-left of it.
const TOP: { src: any; top: string; left: string; w: string; op: string }[] = [
  { src: agentCustomerConversation, top: "2%", left: "38%", w: "w-32", op: "opacity-90" },
  { src: onion, top: "10%", left: "60%", w: "w-12", op: "opacity-55" },
];

// 6:00, below the card - the rider dispatched, between "packed" (right) and
// "delivered" (left) so the circle actually reads left-to-right in order.
const BOTTOM: { src: any; top: string; left: string; w: string; op: string }[] = [
  { src: riderBicycle, top: "88%", left: "42%", w: "w-32", op: "opacity-90" },
  { src: squiggle2, top: "80%", left: "26%", w: "w-14", op: "opacity-70" }, // 6:00 → 7:30 connector
  { src: raspberries, top: "94%", left: "24%", w: "w-12", op: "opacity-55" }, // corner texture
];

const CENTER: { src: any; top: string; left: string; w: string; op: string }[] = [];

/**
 * Hand-drawn flourishes covering the whole screen as a background layer —
 * side margins, top/bottom bands, and a center column tucked behind the
 * card itself — sized and opacity'd to read as a bold, considered scene
 * (few, bigger, confident pieces) rather than a dense sprinkle of tiny
 * faint dots. Hidden below `lg` where there isn't room for them without
 * crowding the form.
 */
function Flourishes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
      {LEFT.map((it, i) => (
        <Image key={"l" + i} src={it.src} alt="" className={`absolute ${it.w} ${it.op}`} style={{ top: it.top, left: it.left }} />
      ))}
      {RIGHT.map((it, i) => (
        <Image
          key={"r" + i}
          src={it.src}
          alt=""
          className={`absolute ${it.w} ${it.op} ${it.flip ? "-scale-x-100" : ""}`}
          style={{ top: it.top, right: it.right }}
          priority={it.priority}
        />
      ))}
      {TOP.map((it, i) => (
        <Image key={"t" + i} src={it.src} alt="" className={`absolute ${it.w} ${it.op}`} style={{ top: it.top, left: it.left }} />
      ))}
      {BOTTOM.map((it, i) => (
        <Image key={"b" + i} src={it.src} alt="" className={`absolute ${it.w} ${it.op}`} style={{ top: it.top, left: it.left }} />
      ))}
      {CENTER.map((it, i) => (
        <Image key={"c" + i} src={it.src} alt="" className={`absolute ${it.w} ${it.op}`} style={{ top: it.top, left: it.left }} />
      ))}
      <Image
        src={sceneAgentLaptop}
        alt=""
        className="absolute bottom-0 right-[3%] w-[380px] opacity-95"
      />
    </div>
  );
}

/**
 * Single-column chrome for every sidebar-less page — login, profile setup,
 * agent registration, guarantor verification. Just the focused form,
 * centered on the canvas, with small illustration flourishes from the
 * moodboard set scattered around it — no editorial side panel.
 */
function AuthShell({
  children,
  size = "md",
}: {
  children: ReactNode;
  /** card max-width — "md" for the OTP/setup flows, "lg" for the multi-step wizard. */
  size?: "sm" | "md" | "lg";
}) {
  const maxW = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-md";

  return (
    <div className="force-light grain-overlay relative flex min-h-screen flex-col overflow-hidden bg-canvas">
      <Flourishes />
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-12">
        <div className={"w-full " + maxW}>
          <Card className="rounded-2xl p-7 shadow-lg sm:p-8">{children}</Card>
        </div>
      </div>
    </div>
  );
}

export default AuthShell;
