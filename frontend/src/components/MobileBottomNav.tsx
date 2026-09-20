"use client";

import Link from "next/link";
import Icon from "./Icon";
import UnreadBadge from "./UnreadBadge";
import { useActiveOrders } from "@/lib/useActiveOrders";

// Only mounted for the Track tab (customers), so agents/admins never fetch
// customer orders just to render a nav bar.
function TrackLiveDot() {
  const orders = useActiveOrders();
  if (!orders || orders.length === 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-orange ring-2 ring-surface-2" />
    </span>
  );
}

/**
 * Primary mobile navigation — Shop/Track/History/Wallet/Settings as a fixed
 * bottom tab bar, the pattern every food-delivery app trains users to expect
 * (and the only way Track was reachable on mobile before this: the Shop
 * header's account menu never listed it). Desktop keeps the sidebar; this is
 * `md:hidden` and additive — it doesn't replace the hamburger drawer, which
 * still owns sign-in/account/logout.
 */
function MobileBottomNav({ navItems, activeKey }: any) {
  return (
    <nav
      // The app's card shape (white, rounded-3xl, border, soft shadow), lifted
      // off the bottom edge by a safe-area-aware offset.
      className="fixed inset-x-3 z-40 flex items-stretch rounded-3xl border border-line bg-surface px-1 shadow-sm md:hidden"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      {navItems.map((item: any) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors active:bg-ink/[0.03]"
          >
            {/* Active = the same solid peach the sidebar's active row uses,
                not a translucent tint. Everything else is quiet. */}
            <span
              className={
                "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors " +
                (active ? "bg-brand-orange text-[#1A1A1A]" : "text-ink/45")
              }
            >
              <Icon name={item.icon} className="h-[1.3rem] w-[1.3rem]" />
              {item.key === "track" && <TrackLiveDot />}
              {item.key === "messages" && <UnreadBadge className="absolute -right-1.5 -top-1 ring-2 ring-surface" />}
            </span>
            <span className={"text-[0.65rem] leading-none " + (active ? "font-bold text-ink" : "font-semibold text-ink/50")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
