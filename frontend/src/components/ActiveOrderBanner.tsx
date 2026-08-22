"use client";

import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { useActiveOrders } from "@/lib/useActiveOrders";
import { summarizeOrderStatus } from "@/lib/orderStatus";

/**
 * Surfaces the customer's own in-progress order(s) wherever they land, so
 * "how's my order going" never requires a detour through History first.
 * Same dark card, icon well, eyebrow/title, and "Track →" pill as Shop's own
 * home page - and sized to match: a fixed-width card meant to sit BESIDE a
 * page's <h1>/subtitle in a flex row (stacking below it on mobile), not a
 * full-width strip above the header. Callers own that row; see History/
 * Wallet/Settings for the exact pattern. Never renders on /orders/* or
 * /track itself - both already ARE this information, repeating it there
 * would just be noise.
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
    orders.find((o) => o.status === "shopping") ||
    orders.find((o) => o.status === "awaiting_payment") ||
    orders[0];

  const title = multiple ? `${orders.length} orders in progress` : summarizeOrderStatus(primary);
  const href = multiple ? "/track" : `/orders/${primary.id}`;

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="flex shrink-0 items-center justify-between gap-4 rounded-2xl bg-[#211A14] px-5 py-4 text-left transition hover:brightness-110 lg:w-[340px]"
    >
      <div className="min-w-0 flex items-center gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange">
          <Icon name="pin" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
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

export default ActiveOrderBanner;
