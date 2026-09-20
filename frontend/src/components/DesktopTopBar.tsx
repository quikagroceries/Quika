"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SearchField from "./SearchField";
import { usePageSearchContext } from "./PageSearchContext";
import HeaderLiveOrderPill from "./header/HeaderLiveOrderPill";
import HeaderWalletChip from "./header/HeaderWalletChip";
import Icon from "./Icon";
import { useShopOptional } from "./shop/ShopContext";
import { useChatOptional } from "./chat/ChatContext";
import BagPeek from "./shop/BagPeek";
import squiggle2 from "@/assets/illustrations/decorative-squiggle-2.png";
import dotArrow from "@/assets/illustrations/decorative-dot-arrow.png";
import squiggleArrow from "@/assets/illustrations/decorative-squiggle-arrow.png";

export interface DesktopTopBarProps {
  title?: string;
  ctaLabel?: string;
  ctaHref?: string;
  showSearch?: boolean;
}

export function DesktopTopBar({
  title,
  ctaLabel,
  ctaHref,
  showSearch = true,
}: DesktopTopBarProps) {
  const hasCta = Boolean(ctaLabel && ctaHref);
  // `useShopOptional`, not `useShop` - this bar is shared with admin/agent
  // shells too, which have no `ShopProvider` above them. Bag button only
  // renders when the context actually exists (customer pages).
  const shop = useShopOptional();
  // `useChatOptional` - same reason as `useShopOptional`, this bar is
  // shared with shells that have no ChatProvider above them either (there
  // isn't one currently, but ChatDock lives in AppShell alongside ShopBag,
  // so this stays defensive the same way).
  const chat = useChatOptional();
  const pageSearch = usePageSearchContext();
  // Chat's docked panel and the bag's docked panel both want to be a
  // `sticky` flex sibling of the page content - two of those open at once
  // would fight over the same layout role. While chat is docked open, the
  // bag button opens a small peek dropdown here instead (see BagPeek) so
  // both stay usable without one shoving the other off the page.
  const [bagPeekOpen, setBagPeekOpen] = useState(false);

  function handleBagClick() {
    if (chat?.open) {
      setBagPeekOpen((v) => !v);
    } else {
      shop?.openBag();
    }
  }

  return (
    // Matches ShopHeader's own chrome exactly now: a flush, edge-to-edge
    // `sticky top-0` bar with `border-b border-line-strong` and `bg-canvas`
    // (cream), not a floating `rounded-2xl` card with margin and a white
    // `bg-surface` fill sitting `top-4` below the viewport edge. Was the
    // one page header in the app using a different chrome language from
    // the one Shop itself uses.
    <div className="sticky top-0 z-40 hidden shrink-0 md:block">
      <header className="relative flex h-16 w-full items-center gap-3 border-b border-line-strong bg-canvas px-4 md:px-6 lg:px-8">
        {/* Accents live in their OWN clipped layer now, not `overflow-
            hidden` on the `<header>` itself - that clipped every dropdown
            in this bar too (HeaderUserMenu's account menu, the page search's
            results list), since they're `position: absolute; top-full`
            DESCENDANTS of this same header, extending below its 64px
            height. `overflow-hidden` doesn't distinguish "this child is
            decoration" from "this child is a popover that's supposed to
            hang below the bar" - it clips both. `inset-0 overflow-hidden`
            on a layer confined to the header's own box (not the header
            element itself) keeps the accents clipped to it while leaving
            the header free to let real popovers render below, unclipped. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <Image
            src={squiggleArrow}
            alt=""
            className="absolute -left-3 -bottom-3 hidden w-14 -rotate-12 opacity-[0.3] md:block"
          />
          <Image
            src={squiggle2}
            alt=""
            className="absolute -right-2 -top-3 hidden w-16 rotate-12 opacity-[0.3] md:block"
          />
          <Image
            src={dotArrow}
            alt=""
            className="absolute left-1/2 -top-3 hidden w-14 -translate-x-1/2 -rotate-6 opacity-[0.18] lg:block"
          />
        </div>

        {/* Left Section: Page Title - was `<HeaderLocationPicker />`
            (the delivery-address control), unconditionally shown on every
            page using this bar: Track, History, Wallet, Settings all
            asked "where should this deliver to" even though none of them
            involve choosing a delivery address. That's Shop's own concern
            (ShopHeader has its own venue/address popover for it) - this
            generic bar just needed the page's name, which it already had
            wired up but hid behind a `2xl:` breakpoint no normal window
            width reaches. */}
        {title && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-display text-base font-bold text-ink truncate max-w-[12rem]">
              {title}
            </span>
          </div>
        )}

        {/* Center Section: Active Omnisearch Bar with Live Loader - the one
            thing on this bar that MUST have real room, so it's the only
            flex-growing element; everything else here is shrink-0 with a
            deliberately trimmed footprint (location picker capped smaller,
            live-order pill in `compact` mode) so they can't crowd it out
            the way the first pass did (search measured 121px wide before
            this fix - a real bug, not just tight spacing). */}
        {/* The page decides what this searches (see PageSearchContext); a
            page with nothing to search leaves the slot empty. The wrapper
            always renders so the right-hand controls stay right. */}
        <div className="min-w-0 flex-1">
          {showSearch && pageSearch?.placeholder && (
            <SearchField
              value={pageSearch.query}
              onChange={pageSearch.setQuery}
              placeholder={pageSearch.placeholder}
            />
          )}
        </div>

        {/* Right Section: CTA + Live Activity + Wallet + Bag */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Shop button - first thing after the search bar now, not last
              in the row. */}
          {hasCta ? (
            <Link
              href={ctaHref!}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-orange px-4 text-xs font-bold text-[#1A1A1A] shadow-xs transition hover:bg-brand-orange-dark active:bg-brand-orange-dark"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              {ctaLabel}
            </Link>
          ) : (
            <Link
              href="/shop"
              className="hidden items-center gap-1.5 rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-[#1A1A1A] shadow-xs transition hover:bg-brand-orange-dark active:bg-brand-orange-dark sm:inline-flex"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span>New Order</span>
            </Link>
          )}

          {/* Live Active Order Pulse (if user has active shopping order) -
              compact mode specifically to leave the search bar room. */}
          <HeaderLiveOrderPill compact />

          {/* Wallet Balance Chip - wrapped (not classed directly) so
              `hidden`/`lg:block` don't fight the component's own hardcoded
              `flex` at identical specificity, which is unreliable. */}
          <div className="hidden lg:block">
            <HeaderWalletChip />
          </div>

          {/* Bag trigger - same control ShopHeader's own basket button
              uses (border-line-strong, bg-surface, the item-count badge),
              now on every page that shares this bar instead of only
              existing on Shop. The bag panel itself already persists
              across navigation (AppShell's `shopBag` prop); this was the
              missing other half - no way to actually open/see it once
              you'd navigated off Shop. Gated on `shop` existing since this
              bar is shared with admin/agent, which have no ShopProvider. */}
          {shop && (
            <div className="relative">
              <button
                type="button"
                onClick={handleBagClick}
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-ink shadow-xs transition hover:border-brand-orange/40 hover:bg-brand-orange/10"
                aria-label={`Shopping list${shop.listDraft?.itemCount ? `, ${shop.listDraft.itemCount} items` : ""}`}
                aria-expanded={bagPeekOpen}
              >
                <Icon name="basket" className="h-[18px] w-[18px]" />
                {Boolean(shop.listDraft?.itemCount) && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[0.65rem] font-bold text-[#1A1A1A] shadow-sm">
                    {shop.listDraft!.itemCount > 99 ? "99+" : shop.listDraft!.itemCount}
                  </span>
                )}
              </button>
              {bagPeekOpen && <BagPeek onClose={() => setBagPeekOpen(false)} />}
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default DesktopTopBar;
