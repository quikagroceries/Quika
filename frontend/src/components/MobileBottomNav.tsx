"use client";

import Link from "next/link";
import Icon from "./Icon";

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
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-ink/8 bg-white/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      {navItems.map((item: any) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors active:bg-ink/[0.03]"
          >
            <span className={"flex h-6 w-6 items-center justify-center " + (active ? "text-ink" : "text-ink/40")}>
              <Icon name={item.icon} className="h-[1.35rem] w-[1.35rem]" />
            </span>
            <span
              className={
                "text-[0.65rem] leading-none " + (active ? "font-bold text-ink" : "font-semibold text-ink/40")
              }
            >
              {item.label}
            </span>
            <span className={"mt-0.5 h-1 w-1 rounded-full " + (active ? "bg-brand-green" : "bg-transparent")} />
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
