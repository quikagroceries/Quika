"use client";

import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { useActiveOrders } from "@/lib/useActiveOrders";

function summarize(order: any): string {
  const at = order.marketName ? ` at ${order.marketName}` : "";
  switch (order.status) {
    case "draft":
      return "Pick up where you left off — list not sent yet";
    case "proposed":
      return "Finding you an agent";
    case "agent_assigned":
      return `Agent assigned${at} — shopping starts soon`;
    case "shopping": {
      const items = order.items || [];
      const bought = items.filter((it: any) => it.confirmed_price != null).length;
      return `Agent is shopping${at} — ${bought} of ${items.length} bought`;
    }
    case "awaiting_payment":
      return "Shopping done — balance due";
    case "paid":
      return "Packing your order";
    case "packed":
      return "Packed, waiting for pickup";
    case "out_for_delivery":
      return "Out for delivery";
    default:
      return "In progress";
  }
}

/**
 * Surfaces the customer's own in-progress order(s) wherever they land, so
 * "how's my order going" never requires a detour through History first.
 * One data source (useActiveOrders), two visual weights: `hero` for the
 * Shop page (its own home), `compact` everywhere else - a page like Wallet
 * or Settings has its own job to do, so the nudge stays a line, not a block.
 * Never renders on /orders/* or /track itself - both already ARE this
 * information, repeating it there would just be noise.
 */
export function ActiveOrderBanner({ variant = "compact" }: { variant?: "hero" | "compact" }) {
  const pathname = usePathname();
  const router = useRouter();
  const orders = useActiveOrders();

  if (pathname?.startsWith("/orders/") || pathname === "/track") return null;
  if (!orders || orders.length === 0) return null;

  const multiple = orders.length > 1;
  // Prefer whichever order is furthest along / most likely to need eyes on
  // it right now - actively being shopped beats one still waiting on an agent.
  const primary =
    orders.find((o) => o.status === "shopping") ||
    orders.find((o) => o.status === "awaiting_payment") ||
    orders[0];

  const title = multiple ? `${orders.length} orders in progress` : summarize(primary);
  const href = multiple ? "/track" : `/orders/${primary.id}`;

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={() => router.push(href)}
        className="mx-4 mt-5 mb-0 flex max-w-[calc(100%-2rem)] items-center justify-between gap-4 rounded-2xl bg-[#211A14] px-5 py-4 text-left transition hover:brightness-110 sm:px-7 sm:py-5 md:mx-6 md:max-w-[calc(100%-3rem)] lg:mx-8 lg:max-w-[calc(100%-4rem)]"
      >
        <div className="min-w-0 flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange">
            <Icon name="pin" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">
              Order in progress
            </p>
            <p className="mt-0.5 truncate font-display text-base font-extrabold text-white sm:text-lg">
              {title}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink">
          Track →
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="mb-4 flex w-full items-center gap-3 rounded-xl border border-brand-orange/25 bg-brand-orange/5 px-4 py-3 text-left transition hover:bg-brand-orange/10"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange">
        <Icon name="pin" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink">{title}</span>
        <span className="block text-xs text-[#8a8178]">Tap to track</span>
      </span>
      <Icon name="chevronDown" className="h-4 w-4 shrink-0 -rotate-90 text-[#8a8178]" />
    </button>
  );
}

export default ActiveOrderBanner;
