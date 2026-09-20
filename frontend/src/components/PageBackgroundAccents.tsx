"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

import tomatoes from "@/assets/illustrations/tomatoes.png";
import garlic from "@/assets/illustrations/garlic.png";
import bananas from "@/assets/illustrations/bananas-1.png";
import pepper from "@/assets/illustrations/pepper.png";
import onion from "@/assets/illustrations/onion.png";
import carrot from "@/assets/illustrations/carrot.png";
import okra from "@/assets/illustrations/okra.png";
import eggs from "@/assets/illustrations/eggs.png";
import garri from "@/assets/illustrations/garri.png";
import riceBag from "@/assets/illustrations/rice-bag.png";
import crayfish from "@/assets/illustrations/crayfish.png";
import basket from "@/assets/illustrations/grocery-basket.png";
import netBag from "@/assets/illustrations/net-bag.png";
import produceCrate from "@/assets/illustrations/produce-crate.png";
import cartVendor from "@/assets/illustrations/market-cart-vendor.png";
import vendorScale from "@/assets/illustrations/vendor-weighing-scale.png";
import stallPantry from "@/assets/illustrations/vendor-stall-pantry-jars.png";
import stallDairy from "@/assets/illustrations/vendor-stall-dairy.png";
import riderScooter from "@/assets/illustrations/rider-scooter-basket-2.png";
import riderBicycle from "@/assets/illustrations/rider-bicycle.png";
import deliveryRoute from "@/assets/illustrations/delivery-map-route.png";
import deliveryDrone from "@/assets/illustrations/delivery-drone.png";
import truckCold from "@/assets/illustrations/truck-cold-delivery.png";
import mapPin from "@/assets/illustrations/map-pin-storefront.png";
import reviewBubble from "@/assets/illustrations/review-rating-bubble.png";
import bellAlert from "@/assets/illustrations/notification-bell-alert.png";
import handshake from "@/assets/illustrations/handshake.png";
import orderHandoff from "@/assets/illustrations/order-handoff-vendor-customer.png";
import phoneList from "@/assets/illustrations/phone-shopping-list.png";
import customerPhone from "@/assets/illustrations/customer-checking-phone.png";
import conversation from "@/assets/illustrations/agent-customer-conversation.png";
import wallet from "@/assets/illustrations/wallet.png";
import trackIcon from "@/assets/illustrations/track.png";
import historyIcon from "@/assets/illustrations/history.png";
import settingsIcon from "@/assets/illustrations/settings.png";
import squiggle1 from "@/assets/illustrations/decorative-squiggle-1.png";
import squiggle2 from "@/assets/illustrations/decorative-squiggle-2.png";
import squiggleLeaf from "@/assets/illustrations/decorative-squiggle-leaf.png";
import squiggleArrow from "@/assets/illustrations/decorative-squiggle-arrow.png";

// A scatter, not a strip. Five fixed "slots" anchored around the edges and
// corners of the viewport, each with its own size,
// tilt and phone/desktop visibility. A page theme is just an ordered list of
// illustrations poured into those slots, so every screen in the app gets the
// same well-spread rhythm and only the subject matter changes.
//
// The layer is `sticky` at viewport height inside a full-height wrapper, so
// it behaves like wallpaper: it's there at every scroll depth (the old
// version was pinned to the top few hundred px and mostly hid behind hero
// cards, leaving long pages bare further down). Content sits above it
// (z-10), so accents only show where the page is genuinely empty.
type Slot = { pos: string; size: string; rot: string; opacity: number; phone?: boolean };

// Every slot is anchored to a screen edge or corner and deliberately bleeds
// off it, so a crop reads as "this continues off-screen" instead of "a card
// happens to be sitting on it". Nothing is placed mid-page behind content
// (that's what made the first version look like random half-hidden clutter).
// Order = prominence: the first theme items land in the biggest corners.
const SLOTS: Slot[] = [
  { pos: "-right-3 -bottom-3", size: "w-36 md:w-56", rot: "rotate-6", opacity: 0.3, phone: true },
  { pos: "-left-3 -bottom-3", size: "w-32 md:w-52", rot: "-rotate-6", opacity: 0.3 },
  { pos: "-right-2 top-[3%]", size: "w-24 md:w-32", rot: "rotate-12", opacity: 0.26, phone: true },
  { pos: "right-[14%] bottom-1", size: "w-20 md:w-28", rot: "-rotate-6", opacity: 0.24 },
  { pos: "left-[13%] bottom-2", size: "w-20 md:w-24", rot: "rotate-6", opacity: 0.24 },
];

type Variant = "customer" | "agent" | "admin";
type Theme = { items: any[]; strength?: number };

// Fresh produce and market goods - the default "this is a grocery app" set.
const PRODUCE: Theme = {
  items: [tomatoes, garlic, bananas, pepper, basket, onion, carrot, cartVendor, squiggle1, okra, squiggleLeaf, netBag],
};

const THEMES: Record<string, Theme> = {
  // ---- customer
  "customer:shop": {
    items: [cartVendor, vendorScale, tomatoes, garlic, pepper, bananas, riceBag, garri, crayfish, squiggle1, eggs, squiggle2],
  },
  "customer:track": {
    items: [deliveryRoute, riderScooter, deliveryDrone, mapPin, truckCold, riderBicycle, produceCrate, netBag, squiggleArrow, tomatoes, squiggle2, garlic],
  },
  "customer:messages": {
    items: [conversation, phoneList, customerPhone, bellAlert, squiggle1, handshake, garlic, bananas, squiggle2, tomatoes, squiggleLeaf, pepper],
  },
  "customer:wallet": {
    items: [wallet, handshake, orderHandoff, squiggle2, basket, reviewBubble, produceCrate, tomatoes, squiggle1, garlic, squiggleLeaf, onion],
  },
  // Utility page: deliberately sparse.
  "customer:settings": { items: [squiggleLeaf, squiggleArrow, garlic, netBag, squiggle1, onion], strength: 0.85 },

  // ---- agent: the working-the-market set
  "agent:home": {
    items: [stallPantry, vendorScale, cartVendor, phoneList, produceCrate, netBag, squiggle1, tomatoes, orderHandoff, garlic, squiggle2, onion],
  },
  "agent:history": {
    items: [reviewBubble, produceCrate, stallDairy, bellAlert, squiggle1, basket, carrot, squiggle2, okra, netBag, squiggleLeaf, tomatoes],
  },
  "agent:messages": {
    items: [conversation, phoneList, customerPhone, bellAlert, squiggle1, handshake, garlic, cartVendor, squiggle2, tomatoes, squiggleLeaf, pepper],
  },
  "agent:dashboard": {
    items: [wallet, handshake, reviewBubble, orderHandoff, vendorScale, produceCrate, squiggle1, tomatoes, stallPantry, squiggle2, squiggleLeaf, garlic],
  },
  "agent:settings": { items: [squiggleLeaf, squiggleArrow, garlic, netBag, squiggle1, onion], strength: 0.85 },

  // ---- admin: same family, much quieter and fewer - it's a working tool
  "admin:default": {
    items: [trackIcon, historyIcon, settingsIcon, mapPin, wallet, handshake, squiggle1, squiggle2],
    strength: 0.55,
  },
};

function pickTheme(variant: Variant, activeKey?: string): Theme {
  return (
    THEMES[`${variant}:${activeKey}`] ??
    (variant === "admin" ? THEMES["admin:default"] : variant === "agent" ? THEMES["agent:home"] : PRODUCE)
  );
}

/** Wallpaper of quiet, page-appropriate illustrations behind the content.
 * `z-0` here + `z-10` on the content (see AppShell / ShopShell) keeps both in
 * one explicit stacking context, so the layering is reliable. */
export function PageBackgroundAccents({ activeKey }: { activeKey?: string }) {
  const pathname = usePathname() || "";
  const variant: Variant = pathname.startsWith("/admin") ? "admin" : pathname.startsWith("/agent") ? "agent" : "customer";
  const theme = pickTheme(variant, activeKey);
  const strength = theme.strength ?? 1;

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {/* max-h-full so a short page never grows extra scroll from this layer. */}
      <div className="sticky top-0 h-screen max-h-full overflow-hidden">
        {theme.items.slice(0, SLOTS.length).map((src, i) => {
          const s = SLOTS[i];
          return (
            <Image
              key={i}
              src={src}
              alt=""
              className={"absolute " + s.pos + " " + s.size + " " + s.rot + (s.phone ? "" : " hidden md:block")}
              style={{ opacity: Math.min(0.32, s.opacity * strength) }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default PageBackgroundAccents;
