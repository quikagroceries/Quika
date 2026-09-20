"use client";

import Image from "next/image";
import riderScooter from "@/assets/illustrations/rider-scooter-basket-2.png";
import deliveryRoute from "@/assets/illustrations/delivery-map-route.png";
import deliveryDrone from "@/assets/illustrations/delivery-drone.png";
import truckColdDelivery from "@/assets/illustrations/truck-cold-delivery.png";
import riderBicycle from "@/assets/illustrations/rider-bicycle.png";
import mapPinStorefront from "@/assets/illustrations/map-pin-storefront.png";
import reviewBubble from "@/assets/illustrations/review-rating-bubble.png";
import bellAlert from "@/assets/illustrations/notification-bell-alert.png";
import produceCrate from "@/assets/illustrations/produce-crate.png";
import handshake from "@/assets/illustrations/handshake.png";
import orderHandoff from "@/assets/illustrations/order-handoff-vendor-customer.png";
import squiggleLeaf from "@/assets/illustrations/decorative-squiggle-leaf.png";
import squiggle2 from "@/assets/illustrations/decorative-squiggle-2.png";
import squiggleArrow from "@/assets/illustrations/decorative-squiggle-arrow.png";
import marketCartVendor from "@/assets/illustrations/market-cart-vendor.png";
import vendorScale from "@/assets/illustrations/vendor-weighing-scale.png";

type Accent = { src: any; className: string };

// One themed set per section, tied to what that page is actually for (not
// interchangeable produce icons everywhere) - Track gets the delivery
// journey, Wallet gets the money-changing-hands motifs, History gets
// past-orders/feedback, Settings stays deliberately quiet (a utility page,
// not a moment to sell the brand). Shop gets its own set too (market cart +
// scale, distinct from what ShopHeroSpotlight/header already use) - it was
// deliberately left out at first on the assumption the hero card already
// carried enough, but Shop renders through ShopShell (its own `bare` chrome,
// not AppShell's PageContainer), which this component was never wired into
// - so in practice it had nothing, not "already covered".
// Left pieces use a small POSITIVE offset (left-2/left-4), never negative -
// a negative left bleeds into the sidebar's own box (x < 0 relative to this
// column lands under the sidebar, which paints first and can leave the
// accent effectively invisible there). Top offsets start at top-28+ so
// nothing sits under the page label/ActiveOrderBanner row (~0-140px),
// which is real, opaque content that would hide an accent placed under it
// anyway (correct, since content > decoration) but that's wasted here.
const THEMES: Record<string, Accent[]> = {
  // Shop's hero card alone runs ~480px tall (measured), so top-28/top-64
  // like every other page would land squarely behind its opaque bg-surface
  // - invisible again, the same class of bug as before just from a
  // different cause. Placed below it instead, at the right edge of the
  // Quick-Add chip row's own wrapped space (measured empty there at 1280
  // width) rather than guessing.
  shop: [
    { src: marketCartVendor, className: "absolute -right-6 top-[47rem] w-32 -rotate-3 opacity-[0.11]" },
    { src: vendorScale, className: "absolute -right-4 top-[54rem] w-24 rotate-6 opacity-[0.1]" },
  ],
  // First three sit in the top ~350px (above/beside the order cards
  // grid); the next three are new - pushed into the middle-to-lower part
  // of the page (top-[30rem] through top-[46rem]), which previously had
  // nothing at all once the order cards grid ended, just blank cream for
  // the rest of the viewport on any account with more than a couple of
  // orders.
  track: [
    { src: deliveryRoute, className: "absolute -right-6 top-28 w-40 -rotate-3 opacity-[0.14]" },
    { src: riderScooter, className: "absolute left-2 top-64 w-36 rotate-6 opacity-[0.13]" },
    { src: deliveryDrone, className: "absolute right-10 top-[22rem] w-20 -rotate-6 opacity-[0.11]" },
    { src: mapPinStorefront, className: "absolute left-4 top-[30rem] w-28 -rotate-6 opacity-[0.12]" },
    { src: truckColdDelivery, className: "absolute -right-4 top-[37rem] w-36 rotate-3 opacity-[0.11]" },
    { src: riderBicycle, className: "absolute left-10 top-[44rem] w-32 -rotate-3 opacity-[0.12]" },
  ],
  history: [
    { src: reviewBubble, className: "absolute -right-4 top-28 w-28 rotate-3 opacity-[0.14]" },
    { src: bellAlert, className: "absolute left-4 top-64 w-24 -rotate-6 opacity-[0.12]" },
    { src: produceCrate, className: "absolute right-6 top-[24rem] w-28 rotate-6 opacity-[0.11]" },
  ],
  wallet: [
    { src: handshake, className: "absolute -right-6 top-28 w-32 -rotate-3 opacity-[0.14]" },
    { src: orderHandoff, className: "absolute left-2 top-64 w-32 rotate-6 opacity-[0.12]" },
    { src: squiggle2, className: "absolute right-10 top-[22rem] w-14 rotate-12 opacity-[0.18]" },
  ],
  settings: [
    { src: squiggleLeaf, className: "absolute -right-4 top-28 w-16 rotate-6 opacity-[0.16]" },
    { src: squiggleArrow, className: "absolute left-4 top-56 w-20 -rotate-6 opacity-[0.13]" },
  ],
};

/** Quiet, page-appropriate illustration accents behind the real content -
 * pinned near the top of the content column (visible on load regardless of
 * how long the page scrolls). `z-0` here + `z-10` on PageContainer's <main>
 * (see AppShell) puts both in the same explicit stacking context so the
 * comparison is reliable - a plain `relative` ancestor with no z-index of
 * its own does NOT create a new stacking context, so z-index here would
 * otherwise resolve against a much higher, unpredictable ancestor. */
export function PageBackgroundAccents({ activeKey }: { activeKey?: string }) {
  const items = activeKey ? THEMES[activeKey] : null;
  if (!items) return null;
  // Shop's and Track's accents both sit much further down the page than
  // every other section's, so their boxes need real height too - harmless
  // elsewhere since unused extra height just sizes an invisible,
  // overflow-hidden box.
  const boxHeight =
    activeKey === "shop" ? "h-[62rem]" : activeKey === "track" ? "h-[52rem]" : "h-[520px]";
  return (
    <div className={"pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden " + boxHeight} aria-hidden>
      {items.map((item, i) => (
        <Image key={i} src={item.src} alt="" className={item.className} />
      ))}
    </div>
  );
}

export default PageBackgroundAccents;
