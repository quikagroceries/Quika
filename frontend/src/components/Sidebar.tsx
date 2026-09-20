"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "./Icon";
import Avatar from "./Avatar";
import UnreadBadge from "./UnreadBadge";
import RoleSwitch from "./RoleSwitch";
import squiggleLeaf from "@/assets/illustrations/decorative-squiggle-leaf.png";
import squiggle1 from "@/assets/illustrations/decorative-squiggle-1.png";
import garlic from "@/assets/illustrations/garlic.png";
import netBag from "@/assets/illustrations/net-bag.png";
import navShop from "@/assets/illustrations/shop.png";
import navTrack from "@/assets/illustrations/track.png";
import navHistory from "@/assets/illustrations/history.png";
import navWallet from "@/assets/illustrations/wallet.png";
import navSettings from "@/assets/illustrations/settings.png";

const COLLAPSE_KEY = "qyka_sidebar_collapsed";

// Only the customer nav's five keys have a matching custom illustration -
// admin/agent share this same Sidebar with entirely different nav keys
// (dashboard/orders/markets/…), which fall through to the plain Icon SVGs
// below unchanged.
const NAV_ICON_IMAGES: Record<string, any> = {
  shop: navShop,
  track: navTrack,
  history: navHistory,
  wallet: navWallet,
  settings: navSettings,
};

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
  // Labels stay mounted at lg+ and slide/fade between states rather than
  // snapping via `display` - so the whole rail reads as one smooth
  // collapse/expand, width and contents moving together. Below lg they're
  // always gone (icon-only rail), hence the leading `hidden`.
  const labelInline =
    "hidden min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-premium lg:block " +
    (expanded ? "lg:max-w-[168px] lg:opacity-100" : "lg:max-w-0 lg:opacity-0");
  const labelBlock =
    "hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-premium lg:block " +
    (expanded ? "lg:max-h-[1200px] lg:opacity-100" : "lg:max-h-0 lg:opacity-0 lg:pointer-events-none");
  const alignStart = expanded ? "lg:justify-start lg:gap-3" : "lg:justify-center lg:gap-0";

  return (
    <aside
      className={
        // `grain-overlay` is NOT on this element on purpose - its CSS forces
        // `position: relative`, which silently overrides `sticky` here
        // (same specificity, so whichever rule lands later in the
        // stylesheet wins, not source order in this string) and breaks the
        // whole "stays put while content scrolls" behavior. The texture
        // lives on the inner scroll wrapper below instead, which has no
        // position of its own to clobber.
        // `bg-surface-2` (warm off-white, rgb 253/250/245) - `bg-canvas`
        // was the exact same cream as the page (no separation but a 1px
        // border), and plain `bg-surface` (pure white) read as too stark/
        // clinical against the rest of the warm palette. `surface-2` sits
        // between the two: still clearly lighter than the page so the rail
        // reads as its own floating panel, without the harsh white.
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line-strong bg-surface-2 shadow-xs transition-[width] duration-300 ease-premium md:flex md:w-[72px] " +
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
        // `bg-[rgb(241,236,224)]` - effectively `bg-canvas`, matching the
        // page behind it.
        // `z-[70]`, not `z-10`: the page-wide paper texture
        // (`.grain-overlay-light::after`, a `position: fixed` viewport
        // layer at `z-index: 60`, `multiply` at 0.4) was painting straight
        // over this button, rendering it at ~0.815x its declared color -
        // which reads as the button being semi-transparent/muddy rather
        // than a solid control. Sitting above z-60 makes it paint as its
        // true flat color. Safe against the other fixed layers: the bag
        // drawer's overlay (z-50/51) is `lg:hidden` while this is
        // `lg:flex`, so they're never on screen together, and Modal
        // (z-[1900]) still covers it.
        className="absolute -right-3 top-8 z-[70] hidden h-6 w-6 items-center justify-center rounded-full border border-line-strong bg-[rgb(241,236,224)] text-ink shadow-xs transition-colors lg:flex"
      >
        <Icon name="chevronDown" className={"h-3.5 w-3.5 transition-transform " + (collapsed ? "-rotate-90" : "rotate-90")} />
      </button>

      <div className="grain-overlay-light flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className={"flex h-16 shrink-0 items-center px-2 transition-[padding] duration-300 ease-premium " + (expanded ? "lg:px-5" : "")}>
          <Link
            href={navItems[0]?.href || "/"}
            className={"flex flex-1 items-center justify-center " + (expanded ? "lg:justify-start" : "")}
            aria-label="Qyka home"
          >
            {/* Icon-only at every collapsed/rail width; the full wordmark
                only once there's real room for it (lg+, expanded) - same
                show/hide-at-breakpoint idiom RoleSwitch below already uses
                for its compact/full swap, not a new pattern. */}
            {/* Same mark as the expanded wordmark below (`/logo.png`, the
                current Qyka "Q" basket mark) - this used to be
                `/favicon.png`, a leftover pre-rename asset (still reads
                "QUIKA" on a black tile) that never got swapped when the
                brand renamed to Qyka. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              className={"h-9 w-9 shrink-0 object-contain " + (expanded ? "lg:hidden" : "")}
            />
            {/* Expanded only: the mark plus a real text wordmark (Bagel Fat
                One, decorative display face - logo use only, never body
                text) instead of a second baked-in logo image. Collapsed/
                rail stays icon-only above. */}
            {expanded && (
              <div className="hidden items-center gap-2 lg:flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
                <div className="leading-none">
                  <p className="font-logo text-2xl leading-none text-ink">Qyka</p>
                  <p className="font-logo text-xs leading-none tracking-wide text-muted">Groceries</p>
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Top accent - a lone squiggle tucked at the header/nav boundary,
            so illustrations start appearing right away instead of only
            after a long gap of nav rows. Rotated a few degrees off-axis so
            it reads as a doodle, not a lined-up icon. */}
        {expanded && (
          <div className="hidden justify-end pb-1 pr-4 lg:flex" aria-hidden>
            <Image
              src={squiggle1}
              alt=""
              className="pointer-events-none w-11 rotate-[8deg] opacity-[0.28]"
            />
          </div>
        )}

        {/* Collapsed/icon-only rail (both the md-width responsive rail and
            the lg+ manual collapse) had zero illustrations - the blocks
            above are gated behind `lg:flex` on top of `expanded`, so
            neither icon-only state ever showed one. A single small centered
            accent here, sized for the ~72px column instead of the
            expanded rail's wider art. */}
        {!expanded && (
          <div className="flex shrink-0 justify-center pb-2" aria-hidden>
            <Image
              src={squiggle1}
              alt=""
              className="pointer-events-none w-7 rotate-[8deg] opacity-[0.26]"
            />
          </div>
        )}

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

        <nav className="shrink-0 space-y-1 px-2 py-1 lg:px-3">
          {navItems.map((item: any) => {
            const active = item.key === activeKey;
            return (
              <Link
                key={item.key}
                href={item.href}
                title={item.label}
                className={
                  // rounded-2xl (16px), matching Button.tsx's radius per
                  // the design-system spec - was rounded-full (pill).
                  "flex w-full items-center justify-center gap-3 rounded-2xl border px-2 py-2 min-h-[44px] text-sm font-bold transition-[color,background-color,border-color,padding] duration-300 ease-premium " +
                  alignStart + " " + (expanded ? "lg:pr-4" : "") + " " +
                  // Active pill gets a ring in the same `border-line-strong`
                  // color as the sidebar's own edge, so the selected state
                  // reads as "outlined the same way this whole rail is,"
                  // not a separate one-off treatment. Inactive rows keep a
                  // transparent border so the layout doesn't shift by the
                  // border width when a row becomes active.
                  // Solid `bg-brand-orange` now, not the translucent `/15`
                  // wash - matching the header's Active Order pill and the
                  // "Order in progress" banner, both solidified this same
                  // pass for the same reason (translucent fills let the
                  // page's own texture/backdrop bleed through and read as
                  // muddy). Icon well flips to a solid white circle so it
                  // still reads as a distinct accent against the peach.
                  (active
                    ? "border-line-strong bg-brand-orange text-[#1A1A1A]"
                    : "border-transparent text-ink/50 hover:bg-ink/[0.05] hover:text-ink")
                }
              >
                <span
                  className={
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150 " +
                    (active ? "bg-surface text-brand-orange-dark" : "")
                  }
                >
                  {NAV_ICON_IMAGES[item.key] ? (
                    // Full-color custom illustrations, not currentColor
                    // SVGs - "grayed out while inactive" means an actual
                    // `grayscale` filter + reduced opacity here, switching
                    // to full color/opacity only for the active item.
                    <Image
                      src={NAV_ICON_IMAGES[item.key]}
                      alt=""
                      className={
                        "h-6 w-6 object-contain transition-all duration-200 " +
                        (active ? "grayscale-0 opacity-100" : "grayscale opacity-40")
                      }
                    />
                  ) : (
                    <Icon name={item.icon} className="h-[18px] w-[18px]" />
                  )}
                </span>
                <span className={labelInline}>{item.label}</span>
                {item.key === "messages" && <UnreadBadge className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Trimmed to 2 accents here (was 5) - a lone diagonal pair, not a
            cluster, so the rail reads as "sparse illustration" rather than
            "icon soup". Still a genuine flex-1 column for the same reason
            as before: nav above is `shrink-0`, so this is the only box that
            gives on Admin's longer 8-item list, clipping via
            `overflow-hidden` instead of ever overlapping a real nav link. */}
        {expanded && (
          <div
            className="hidden min-h-0 flex-1 flex-col justify-around gap-1 overflow-hidden px-3 py-3 lg:flex"
            aria-hidden
          >
            <Image
              src={garlic}
              alt=""
              className="pointer-events-none w-10 shrink-0 self-start -translate-x-1 -rotate-12 opacity-[0.26]"
            />
            <Image
              src={netBag}
              alt=""
              className="pointer-events-none w-12 shrink-0 self-end translate-x-1 -rotate-[8deg] opacity-[0.3]"
            />
          </div>
        )}

        {/* One quiet accent at the true bottom of the scroll wrapper (was
            3 - grapes/pineapple dropped) tying this rail back to the auth
            screens' illustration language, without stacking up right above
            the account/logout row. */}
        {expanded && (
          <div className="hidden shrink-0 justify-end px-4 pb-4 lg:flex" aria-hidden>
            <Image
              src={squiggleLeaf}
              alt=""
              className="pointer-events-none w-20 -translate-y-1 rotate-3 opacity-[0.3]"
            />
          </div>
        )}

        {/* Second collapsed-rail accent, pinned to the bottom via
            `mt-auto` (there's no flex-1 middle spacer in this state to
            absorb the leftover space the way the expanded rail's does). */}
        {!expanded && (
          <div className="mt-auto flex shrink-0 justify-center pb-3" aria-hidden>
            <Image
              src={garlic}
              alt=""
              className="pointer-events-none w-7 -rotate-6 opacity-[0.24]"
            />
          </div>
        )}
      </div>

      <div className={"border-t border-line-strong p-3 transition-[padding] duration-300 ease-premium " + (expanded ? "lg:p-4" : "")}>
        {guest ? (
          <Link
            href="/login?next=/shop"
            className={"flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-orange px-3 min-h-[44px] text-sm font-bold text-[#1A1A1A] " + alignStart}
          >
            <Icon name="user" className="h-5 w-5 shrink-0" />
            <span className={labelInline}>Sign in</span>
          </Link>
        ) : (
          <>
            <Link
              href={navItems.find((i: any) => i.key === "settings")?.href || "/settings"}
              className={"mb-2 flex w-full items-center justify-center gap-2 rounded-2xl px-2 py-1.5 text-ink/55 hover:bg-canvas " + alignStart}
            >
              <Avatar src={user?.avatar_url} name={user?.full_name} className="h-9 w-9" />
              <span className={"truncate text-sm " + labelInline}>{user?.full_name || user?.phone}</span>
            </Link>
            <button
              onClick={onLogout}
              className={"flex w-full items-center justify-center gap-3 rounded-2xl px-3 min-h-[44px] text-sm font-semibold text-ink/55 hover:bg-canvas hover:text-ink " + alignStart}
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
