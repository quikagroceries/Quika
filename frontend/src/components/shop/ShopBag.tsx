"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useShop } from "./ShopContext";
import { illustrationForItem } from "@/lib/foodVisuals";
import netBag from "@/assets/illustrations/net-bag.png";
import squiggleLeaf from "@/assets/illustrations/decorative-squiggle-leaf.png";
import garlic from "@/assets/illustrations/garlic.png";
import personShoppingList from "@/assets/illustrations/person-shopping-list.png";

/** The bag's actual header/content/footer - shared by both the mobile
 * overlay drawer and the desktop layout panel, so the two don't silently
 * drift apart into two different-looking bags. Both are fixed-height
 * cards now (`h-screen` on their own wrapper `<aside>`): header and footer
 * are `shrink-0` flex children, the item list in between is the only
 * `flex-1 overflow-y-auto` piece - a persistent side panel scrolling
 * independently of the page behind it, same as Gmail's reading pane or
 * Slack's thread panel, not a popover that hides itself away. */
export function BagBody({ onClose }: { onClose: () => void }) {
  const { listDraft, market, vendor, step, setStep, setBagOpen } = useShop();
  const items = listDraft?.items || [];
  const empty = !listDraft || listDraft.itemCount === 0;

  return (
    <>
      {/* Header - `bg-canvas` (warm cream), not the plain white it was
          inheriting from the `<aside>`'s own `bg-surface` - every other
          piece of chrome in the app (ShopHeader, Sidebar, the collapse
          toggle) has moved onto the cream/canvas family over this pass;
          this was the one holdout. Border removed per request. `shrink-0`
          keeps it pinned at the top of the fixed-height card (see the
          `<aside>`s this is rendered inside). */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 overflow-hidden bg-canvas px-6 py-4">
        {/* Small accent doodles, same family used on the empty state below
            and throughout the rest of the shell - this header was the one
            surface with zero illustration presence even after the rest of
            the panel picked them up. */}
        <Image
          src={squiggleLeaf}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-3 -top-3 z-0 w-16 rotate-12 opacity-[0.16]"
        />
        <div className="relative z-10">
          <h2 className="font-display text-xl font-extrabold text-ink">Personal Shopping Bag</h2>
          <p className="mt-0.5 text-xs text-muted">
            {market?.name || "No market selected yet"}
            {vendor ? ` · ${vendor.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-ink/50 hover:bg-ink/5 active:bg-ink/10"
          aria-label="Close bag"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      {/* Content - `bg-canvas`, matching the app's actual page background
          rather than the `bg-sunken-2/50` cool grey tint this used to have.
          NO `grain-overlay-light` here on purpose: that class's `::after`
          is `position: fixed; inset: 0; z-index: 60`, i.e. a whole-VIEWPORT
          layer, not a texture scoped to its parent. It's built to be used
          once per page-level chrome. Putting it here meant two extra
          full-screen `multiply` layers (this body renders twice - mobile
          overlay + desktop panel) painting over the entire app at all
          times, since this component is always mounted now. Three stacked
          grain layers is what made everything, the sidebar's collapse
          toggle especially, look muddy/washed out. */}
      <div className="relative flex-1 overflow-y-auto bg-canvas p-6">
        {/* Background accents - previously only shown in the empty state;
            moved out here so the filled list gets the same quiet
            illustration presence instead of being the one bare, all-white
            stretch in an otherwise illustrated app. Fixed to the content
            area (not scrolling with the item list) via their own absolute
            positioning against this `relative` parent. */}
        <Image
          src={squiggleLeaf}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -left-2 top-2 z-0 w-16 -rotate-6 opacity-[0.16]"
        />
        <Image
          src={garlic}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-2 bottom-4 z-0 w-14 rotate-12 opacity-[0.16]"
        />
        {empty ? (
          <div className="relative z-10">
            <EmptyState
              image={netBag}
              title="Your bag is empty"
              subtitle="Add fresh produce, staples, or groceries. Your personal agent will shop and bargain the best prices for you."
              actionLabel="Start Writing List"
              onAction={() => {
                setBagOpen(false);
                setStep("list");
              }}
              className="relative z-10 border-none bg-transparent shadow-none"
            />
            {/* Moved down from the header - sits below the empty-state
                card instead of floating in a corner up top. Flowing
                normally (not absolutely positioned) so it just settles
                underneath whatever height the empty-state content ends up
                being, centered like a closing flourish. */}
            <Image
              src={personShoppingList}
              alt=""
              aria-hidden
              className="pointer-events-none mx-auto mt-6 w-24 -rotate-3 opacity-[0.16]"
            />
          </div>
        ) : (
          <ul className="relative z-10 space-y-2.5">
            {items.map((it: any, i: number) => {
              const img = illustrationForItem(it.description);
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-xs"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken-2 p-1.5">
                      <Image src={img} alt="" className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{it.description}</p>
                      <p className="text-xs text-muted">
                        {it.quantity > 1 ? `Qty: ${it.quantity} · ` : ""}
                        {it.listed_price != null
                          ? `Est. ₦${Number(it.listed_price).toLocaleString()}`
                          : "Price estimate pending"}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer - `shrink-0`, the last flex child in the fixed-height
          card, so it's always at the true bottom of the drawer regardless
          of how long the item list above it is. Styled as a floating
          banner now (rounded-2xl card, margin on all sides, shadow-lg)
          instead of a flush full-width bar - same "floating chrome"
          language as ListBuilder's own bottom dock (`rounded-2xl border
          bg-surface shadow-xs`, `sticky bottom-4`), just resting in its
          own natural flow position here instead of needing its own
          sticky (the fixed-height card around it already handles that). */}
      <div className="relative z-10 shrink-0 bg-canvas px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="rounded-2xl border border-line-strong bg-surface p-5 shadow-lg">
          {!empty && (
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Estimated Goods Total
              </span>
              <span className="font-display text-2xl font-extrabold text-ink">
                ₦{Number(listDraft?.goodsTotal || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {step === "list" ? (
              <Button fullWidth onClick={() => setBagOpen(false)}>
                Continue Editing
              </Button>
            ) : (
              <Button
                fullWidth
                onClick={() => {
                  setBagOpen(false);
                  setStep("list");
                }}
              >
                {empty ? "Build Your List" : "Edit List"}
              </Button>
            )}

            {!market && !empty && step !== "list" && step !== "market" && (
              <Button
                fullWidth
                variant="neutral"
                onClick={() => {
                  setBagOpen(false);
                  setStep("market");
                }}
              >
                Choose Market
              </Button>
            )}

            <Link
              href="/"
              className="py-1 text-center text-xs font-bold text-muted transition hover:text-ink"
              onClick={() => setBagOpen(false)}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export function ShopBag() {
  const { bagOpen, setBagOpen } = useShop();

  useEffect(() => {
    if (!bagOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setBagOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [bagOpen, setBagOpen]);

  function close() {
    setBagOpen(false);
  }

  // Phone sheet: lock the page behind it (the backdrop is tappable, but
  // without this the page still scrolls under your thumb), and let the
  // handle drag the sheet down to dismiss - the gesture a bottom sheet
  // trains everyone to try.
  useEffect(() => {
    if (!bagOpen || window.matchMedia("(min-width: 1024px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [bagOpen]);

  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);
  function onDragStart(e: React.TouchEvent) {
    dragStart.current = e.touches[0].clientY;
  }
  function onDragMove(e: React.TouchEvent) {
    if (dragStart.current == null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStart.current));
  }
  function onDragEnd() {
    if (dragY > 90) close();
    setDragY(0);
    dragStart.current = null;
  }

  return (
    <>
      {/* Below `lg`: unchanged overlay drawer, with a dimmed backdrop and
          body-scroll lock - there's no spare width on a phone/tablet
          screen to "shift" a layout into, so it still floats on top like
          a real modal. Body scroll only locks here, not on the desktop
          panel below, since that one no longer blocks the page underneath. */}
      <div
        onClick={close}
        aria-hidden="true"
        className={
          "fixed inset-0 z-50 bg-ink/40 transition-opacity duration-300 ease-premium lg:hidden " +
          (bagOpen ? "opacity-100" : "pointer-events-none opacity-0")
        }
      />
      {/* `duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]` - the same
          back-out overshoot curve the quick-add pop-in/icon-jump
          animations already use, applied here to the slide itself instead
          of `ease-premium`'s pure ease-out. It overshoots past
          `translate-x-0` before settling back, which is what actually
          reads as "bouncy" rather than just fast. */}
      {/* Below `sm`: a bottom sheet (rounded top, capped at 85% of the screen
          so the page stays visible behind it, drag-down to dismiss). From `sm`
          to `lg` there's room for the side drawer, so it stays that. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your personal shopping bag"
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        className={
          "fixed inset-x-0 bottom-0 z-[51] flex max-h-[85dvh] w-full transform flex-col overflow-hidden rounded-t-3xl border-t border-line-strong bg-surface shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] " +
          "sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0 lg:hidden " +
          (bagOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full")
        }
      >
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center bg-canvas pb-1 pt-2.5 sm:hidden"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
          aria-hidden="true"
        >
          <span className="h-1.5 w-10 rounded-full bg-ink/20" />
        </div>
        <BagBody onClose={close} />
      </aside>

      {/* `lg` and up: a real layout panel, not a popover. Width animates
          from 0 to its full size (the same `transition-[width]` convention
          the Sidebar itself uses to collapse/expand) - as a flex sibling
          of the header+main column in ShopShell, growing this panel
          visibly pushes that column narrower instead of floating on top
          of it behind a dimmed backdrop. No backdrop, no scroll lock, no
          `aria-modal` here - the rest of the page stays fully visible and
          interactive while this is open, so it isn't a modal.

          `sticky top-0 h-screen` (same fixed-height card as the mobile
          drawer, minus the `fixed`/backdrop): the footer needs to be
          reliably "at the bottom of the drawer" regardless of list length,
          which a `sticky bottom-0` footer can't guarantee - it only visibly
          sticks once the panel's own content is taller than the viewport,
          so on a short list it just sits wherever the last item ends,
          nowhere near the bottom edge. Pinning the whole panel to viewport
          height and letting the item list scroll internally (like Gmail's
          reading pane or Slack's thread panel - a persistent side panel is
          expected to scroll independently of the page behind it) puts the
          header and footer at fixed positions always, list length aside.
          `w-0` + `overflow-hidden` on this same wrapper clips the
          fixed-width inner content while collapsed. */}
      {/* Reverted to `ease-premium`, no overshoot - the bounce curve
          applied to `width` (a real layout dimension) caused the panel to
          briefly render WIDER than its 26rem content during the overshoot
          (confirmed earlier: measured up to 457px against a 416px target).
          That extra sliver is the aside's own `bg-surface` (white) fill,
          painted past where the real content covers it - on a page whose
          actual background is cream, that reads as a stray flash of
          "browser white", not a bounce. `transform`-based bounces
          (the mobile drawer's slide) don't have this problem since they
          don't repaint extra box area; animating `width` fundamentally
          does. Kept the bounce there, dropped it here. */}
      <aside
        aria-label="Your personal shopping bag"
        aria-hidden={!bagOpen}
        className={
          "sticky top-0 hidden h-screen shrink-0 self-start overflow-hidden border-l border-line-strong bg-surface shadow-xs transition-[width] duration-300 ease-premium lg:flex " +
          (bagOpen ? "w-[26rem]" : "w-0")
        }
      >
        <div className="flex h-full w-[26rem] shrink-0 flex-col">
          <BagBody onClose={close} />
        </div>
      </aside>
    </>
  );
}

export default ShopBag;
