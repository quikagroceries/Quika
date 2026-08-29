"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import RoleSwitch from "./RoleSwitch";

const favicon = "/favicon.png";
const COLLAPSE_KEY = "quika_sidebar_collapsed";

// Portal targets for a section's own contextual nav (currently just Shop,
// via ShopSideRail) to mount INTO this same sidebar column instead of a
// second column bolted on next to it. Two slots: one right beside the logo
// for a workspace-style switcher (Shop's local-market/supermarket toggle),
// one below the main nav for step-specific tools (list-composer, etc).
export const SIDEBAR_BRAND_EXTRA_ID = "app-sidebar-brand-extra";
export const SIDEBAR_SHOP_EXTRA_ID = "app-sidebar-shop-extra";

/**
 * Adaptive app sidebar — Shop / History / Wallet / Settings, on every
 * customer page including /shop. Two ways it narrows to icon-only: the
 * responsive rail (md width, no choice in it) and this collapse toggle
 * (lg+, a deliberate choice the user makes and that persists across
 * visits) - collapsing just holds the lg+ column at the same icon-only
 * width the rail already uses, rather than introducing a third layout.
 */
function Sidebar({ navItems, activeKey, user, onLogout, roleSwitch, guest = false }: any) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }

  const expanded = !collapsed;
  // Only ever adds "hidden lg:inline"/"hidden lg:block" back in when NOT
  // collapsed - collapsed forces icon-only at every width, same as the
  // classes below just never gaining their lg: variant.
  const labelInline = expanded ? "hidden lg:inline" : "hidden";
  const labelBlock = expanded ? "hidden lg:block" : "hidden";
  const alignStart = expanded ? "lg:justify-start" : "";

  return (
    <aside
      className={
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-ink/8 bg-white md:flex md:w-[72px] " +
        (expanded ? "lg:w-[240px]" : "")
      }
    >
      {/* Collapse toggle: pinned to the sidebar's own edge (half over the
          border), not squeezed into the header row alongside the logo -
          a row-based button would have nowhere to go once collapsed down
          to icon-only width, making itself unreachable the moment it's
          clicked. Pinning it to the edge keeps it in the same reachable
          spot at every width, the same convention VSCode/Notion/Linear
          use. Only meaningful at lg+ - below that the rail is already
          icon-only with nothing further to collapse. */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-pressed={collapsed}
        className="absolute -right-3 top-8 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/50 shadow-sm transition-colors hover:text-ink lg:flex"
      >
        <Icon name="chevronDown" className={"h-3.5 w-3.5 transition-transform " + (collapsed ? "-rotate-90" : "rotate-90")} />
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className={"flex items-center px-2 py-6 " + (expanded ? "lg:px-5" : "")}>
          <Link
            href={navItems[0]?.href || "/"}
            className={"flex flex-1 items-center justify-center " + alignStart}
            aria-label="Quika home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={favicon} alt="" className="h-14 w-14 shrink-0 object-contain" />
          </Link>
        </div>

        {/* Workspace-style switcher slot, right below the brand mark —
            only at the labeled (lg+, expanded) width, same reasoning as the
            slot below. */}
        <div id={SIDEBAR_BRAND_EXTRA_ID} className={labelBlock} />

        {roleSwitch && (
          <>
            <div className={"px-4 pb-3 " + labelBlock}>
              <RoleSwitch {...roleSwitch} />
            </div>
            <div className={"flex justify-center pb-3 md:flex " + (expanded ? "lg:hidden" : "")}>
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
                  "flex w-full items-center justify-center gap-3 rounded-full px-2 py-2 min-h-[44px] text-sm font-bold transition-colors duration-150 " +
                  alignStart + " " + (expanded ? "lg:pr-4" : "") + " " +
                  (active ? "text-ink" : "text-ink/50 hover:bg-ink/[0.03] hover:text-ink")
                }
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
                  style={active ? { backgroundColor: `${color}26`, color } : undefined}
                >
                  <Icon name={item.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className={labelInline}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Only at the labeled (lg+, expanded) width — the icon-only rail
            has no room for a section's contextual filters/tools. */}
        <div id={SIDEBAR_SHOP_EXTRA_ID} className={labelBlock} />
      </div>

      <div className={"border-t border-ink/8 p-3 " + (expanded ? "lg:p-4" : "")}>
        {guest ? (
          <Link
            href="/login?next=/shop"
            className={"flex w-full items-center justify-center gap-3 rounded-xl bg-brand-green px-3 min-h-[44px] text-sm font-bold text-white " + alignStart}
          >
            <Icon name="user" className="h-5 w-5 shrink-0" />
            <span className={labelInline}>Sign in</span>
          </Link>
        ) : (
          <>
            <Link
              href={navItems.find((i: any) => i.key === "settings")?.href || "/settings"}
              className={"mb-2 flex w-full items-center justify-center gap-2 rounded-xl px-2 py-1.5 text-ink/55 hover:bg-canvas " + alignStart}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-ink/50">
                <Icon name="user" className="h-4 w-4" />
              </span>
              <span className={"truncate text-sm " + labelBlock}>{user?.phone}</span>
            </Link>
            <button
              onClick={onLogout}
              className={"flex w-full items-center justify-center gap-3 rounded-xl px-3 min-h-[44px] text-sm font-semibold text-ink/55 hover:bg-canvas hover:text-ink " + alignStart}
            >
              <Icon name="logout" className="h-5 w-5 shrink-0" />
              <span className={labelInline}>Log out</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
