import badgeRealTime from "@/assets/illustrations/badge-real-time-updates.png";
import badgeHumanFirst from "@/assets/illustrations/concierge.png";
import badgeFreshness from "@/assets/illustrations/badge-fresh-guarantee.png";
import badgeExpress from "@/assets/illustrations/badge-express-delivery.png";

// The four trust chips under the shop-family heroes (Track's empty state and
// Step 1 of the order flow) - one list, so the two can't drift apart.
export const SHOP_CHIPS = [
  { src: badgeRealTime, title: "Real-time updates", body: "Live chat & photo proof" },
  { src: badgeHumanFirst, title: "Human concierge", body: "Trained market bargainers" },
  { src: badgeFreshness, title: "Freshness guarantee", body: "Handpicked prime quality" },
  { src: badgeExpress, title: "Direct delivery", body: "Straight to your doorstep" },
];
