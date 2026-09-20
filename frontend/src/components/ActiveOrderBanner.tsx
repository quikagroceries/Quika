"use client";

import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import MarketArt from "@/components/shop/MarketArt";
import { useActiveOrders } from "@/lib/useActiveOrders";
import { summarizeOrderStatus } from "@/lib/orderStatus";
import { marketTone } from "@/lib/vendorVisuals";
import { coverImageForMarket } from "@/lib/marketDirectory";

// The five beats of an order, left to right. Where an order is right now maps
// onto one of them (see stepIndex) so the card can show real progress, not
// just a sentence.
const STEPS = ["Agent", "Shopping", "Payment", "Packing", "Delivery"];

function stepIndex(status: string): number {
  switch (status) {
    case "agent_assigned":
    case "shopping":
      return 1;
    case "awaiting_payment":
      return 2;
    case "paid":
    case "packed":
      return 3;
    case "out_for_delivery":
      return 4;
    default:
      return 0; // draft / proposed: still finding an agent
  }
}

function MarketDot({ order, className }: { order: any; className: string }) {
  const m = order.market;
  return m ? (
    <MarketArt
      tone={marketTone(m.name, m.city)}
      title={m.name}
      image={coverImageForMarket(m)}
      compact
      className={className}
    />
  ) : (
    <span className={"flex items-center justify-center bg-brand-orange/15 text-brand-orange-dark " + className}>
      <Icon name="store" className="h-5 w-5" />
    </span>
  );
}

/**
 * The live-order card for phones, above a page's hero (HeroBanner's `banner`
 * slot, which is mobile-only - desktop has the header's Active Order pill).
 * One order: the market's art, a "Live" chip, what's happening now, and a
 * five-step progress rail. Several: stacked market avatars and a count.
 * A white card like every other card in the app; peach is the accent (live
 * dot, progress, arrow), not a whole slab of colour competing with the hero.
 * Never renders on /orders/* or /track - both already ARE this information.
 */
export function ActiveOrderBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const orders = useActiveOrders();

  if (pathname?.startsWith("/orders/") || pathname === "/track") return null;
  if (!orders || orders.length === 0) return null;

  const multiple = orders.length > 1;
  // Prefer whichever order is furthest along / most likely to need eyes on
  // it right now - actively being shopped beats one still waiting on an agent.
  const primary =
    orders.find((o: any) => o.status === "out_for_delivery") ||
    orders.find((o: any) => o.status === "shopping") ||
    orders.find((o: any) => o.status === "awaiting_payment") ||
    orders[0];

  const href = multiple ? "/track" : `/orders/${primary.id}`;
  const marketName = primary.market?.name || primary.marketName;
  const current = stepIndex(primary.status);
  // The market already has its own line above the title, so the sentence
  // leaves it out (summarizeOrderStatus only adds " at <market>" when given one).
  const title = multiple ? `${orders.length} orders in progress` : summarizeOrderStatus({ ...primary, marketName: undefined });

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="mb-3 block w-full rounded-3xl border border-line bg-surface p-4 text-left shadow-sm transition active:scale-[0.99]"
    >
      <span className="flex items-center gap-3">
        {multiple ? (
          <span className="flex shrink-0 -space-x-3">
            {orders.slice(0, 3).map((o: any) => (
              <MarketDot key={o.id} order={o} className="h-11 w-11 rounded-full ring-2 ring-surface" />
            ))}
          </span>
        ) : (
          <MarketDot order={primary} className="h-11 w-11 shrink-0 rounded-full" />
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-brand-orange-dark">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-orange" />
              </span>
              Live
            </span>
            {!multiple && marketName && (
              <span className="truncate text-xs font-semibold text-muted">{marketName}</span>
            )}
          </span>
          <span className="mt-1 block truncate font-display text-sm font-extrabold text-ink">{title}</span>
        </span>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[#1A1A1A]">
          <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
        </span>
      </span>

      {multiple ? (
        <span className="mt-3 block text-xs font-semibold text-muted">Tap to see them all</span>
      ) : (
        <span className="mt-3 block">
          <span className="flex gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={current + 1}>
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={
                  "h-1.5 flex-1 rounded-full " +
                  (i < current
                    ? "bg-brand-orange"
                    : i === current
                      ? "animate-pulse bg-brand-orange/60"
                      : "bg-sunken-2")
                }
              />
            ))}
          </span>
          <span className="mt-1.5 flex items-center justify-between text-[0.7rem] font-semibold">
            <span className="text-ink">{STEPS[current]}</span>
            <span className="text-faint">
              Step {current + 1} of {STEPS.length}
            </span>
          </span>
        </span>
      )}
    </button>
  );
}

export default ActiveOrderBanner;
