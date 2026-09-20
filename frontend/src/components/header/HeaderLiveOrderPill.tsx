"use client";

import { usePathname, useRouter } from "next/navigation";
import { useActiveOrders } from "@/lib/useActiveOrders";
import { summarizeOrderStatus } from "@/lib/orderStatus";

export function HeaderLiveOrderPill({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const orders = useActiveOrders();

  // Hide when already on the track or order detail page
  if (pathname?.startsWith("/orders/") || pathname === "/track") return null;
  if (!orders || orders.length === 0) return null;

  const multiple = orders.length > 1;
  const primary =
    orders.find((o) => o.status === "shopping") ||
    orders.find((o) => o.status === "awaiting_payment") ||
    orders.find((o) => o.status === "out_for_delivery") ||
    orders[0];

  const title = multiple ? `${orders.length} orders in progress` : summarizeOrderStatus(primary);
  const href = multiple ? "/track" : `/orders/${primary.id}`;

  if (compact) {
    // Back to the normal solid `bg-brand-orange` (the dark variants didn't
    // land) - same fill Button.tsx's primary variant uses, dark ink text
    // on top per that same convention.
    return (
      <button
        type="button"
        onClick={() => router.push(href)}
        className="relative flex h-10 items-center gap-1.5 rounded-full bg-brand-orange px-3 text-xs font-bold text-[#1A1A1A] shadow-xs transition hover:bg-brand-orange-dark active:scale-95"
        title={title}
        aria-label="View active order"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1A1A1A]/40 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1A1A1A]"></span>
        </span>
        <span className="hidden sm:inline">Active Order</span>
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    );
  }

  // `bg-surface` (solid white) + `border-line-strong`, not a translucent
  // peach wash - same "floating chrome" fix as the compact variant and
  // ActiveOrderBanner above. Peach stays as the accent (the live dot, the
  // inner "Track" pill), not the whole button's fill.
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="group relative flex h-10 items-center gap-2.5 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-left text-xs font-semibold text-brand-orange-dark shadow-xs transition hover:bg-sunken-2 focus:outline-none focus:ring-2 focus:ring-[#D9702F]/30"
      aria-label="Track active order"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D9702F] opacity-75"></span>
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#D9702F]"></span>
      </span>

      <div className="flex max-w-[14rem] items-center gap-1.5 truncate lg:max-w-[18rem]">
        <span className="truncate font-bold text-ink">{title}</span>
      </div>

      <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-[#1A1A1A] transition group-hover:bg-brand-orange-dark">
        Track
        <svg viewBox="0 0 20 20" className="h-3 w-3 fill-current" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </button>
  );
}

export default HeaderLiveOrderPill;
