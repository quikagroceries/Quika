"use client";

import Link from "next/link";
import Icon from "./Icon";
import RoleSwitch from "./RoleSwitch";

const favicon = "/favicon.png";

// Portal targets for a section's own contextual nav (currently just Shop,
// via ShopSideRail) to mount INTO this same sidebar column instead of a
// second column bolted on next to it. Two slots: one right beside the logo
// for a workspace-style switcher (Shop's local-market/supermarket toggle),
// one below the main nav for step-specific tools (list-composer, etc).
export const SIDEBAR_BRAND_EXTRA_ID = "app-sidebar-brand-extra";
export const SIDEBAR_SHOP_EXTRA_ID = "app-sidebar-shop-extra";

/** Adaptive app sidebar — Shop / History / Wallet / Settings, on every customer page including /shop. */
function Sidebar({ navItems, activeKey, user, onLogout, roleSwitch, guest = false }: any) {
  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-ink/8 bg-white md:flex md:w-[72px] lg:w-[240px]">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Link
          href={navItems[0]?.href || "/"}
          className="flex items-center justify-center gap-3 px-2 py-6 lg:justify-start lg:px-5"
          aria-label="Quika home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={favicon} alt="" className="h-11 w-11 shrink-0 object-contain" />
          <span className="hidden font-display text-2xl font-extrabold tracking-tight text-ink lg:inline">
            Quika
          </span>
        </Link>

        {/* Workspace-style switcher slot, right below the brand mark —
            only at the labeled (lg+) width, same reasoning as the slot below. */}
        <div id={SIDEBAR_BRAND_EXTRA_ID} className="hidden lg:block" />

        {roleSwitch && (
          <>
            <div className="hidden px-4 pb-3 lg:block">
              <RoleSwitch {...roleSwitch} />
            </div>
            <div className="flex justify-center pb-3 md:flex lg:hidden">
              <RoleSwitch {...roleSwitch} compact />
            </div>
          </>
        )}

        <nav className="space-y-1 px-2 py-1 lg:px-3">
          {navItems.map((item: any) => {
            const active = item.key === activeKey;
            const color = item.color || "#0E7A3C";
            return (
              <Link
                key={item.key}
                href={item.href}
                title={item.label}
                style={active ? { backgroundColor: `${color}16` } : undefined}
                className={
                  "flex w-full items-center justify-center gap-3 rounded-full px-2 py-2 min-h-[44px] text-sm font-bold transition-colors duration-150 lg:justify-start lg:pr-4 " +
                  (active ? "text-ink" : "text-ink/50 hover:bg-ink/[0.03] hover:text-ink")
                }
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
                  style={active ? { backgroundColor: `${color}26`, color } : undefined}
                >
                  <Icon name={item.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Only at the labeled (lg+) width — the icon-only rail has no room
            for a section's contextual filters/tools. */}
        <div id={SIDEBAR_SHOP_EXTRA_ID} className="hidden lg:block" />
      </div>

      <div className="border-t border-ink/8 p-3 lg:p-4">
        {guest ? (
          <Link
            href="/login?next=/shop"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-brand-green px-3 min-h-[44px] text-sm font-bold text-white lg:justify-start"
          >
            <Icon name="user" className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">Sign in</span>
          </Link>
        ) : (
          <>
            <Link
              href={navItems.find((i: any) => i.key === "settings")?.href || "/settings"}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl px-2 py-1.5 text-ink/55 hover:bg-canvas lg:justify-start"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-ink/50">
                <Icon name="user" className="h-4 w-4" />
              </span>
              <span className="hidden truncate text-sm lg:block">{user?.phone}</span>
            </Link>
            <button
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-3 rounded-xl px-3 min-h-[44px] text-sm font-semibold text-ink/55 hover:bg-canvas hover:text-ink lg:justify-start"
            >
              <Icon name="logout" className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">Log out</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
