"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";
import { SIDEBAR_BRAND_EXTRA_ID, SIDEBAR_SHOP_EXTRA_ID } from "@/components/Sidebar";
import type { VenueType } from "@/lib/marketDirectory";

type NavItem = {
  id: string;
  label: string;
  icon?: "store" | "basket" | "flag" | "wallet" | "star" | "user" | "clock" | "pin";
  hint?: string;
  active?: boolean;
  onClick: () => void;
};

function RailSection({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"mt-6 first:mt-0 " + className}>
      <p className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#8a8178]">
        {label}
      </p>
      {children}
    </div>
  );
}

function RailBtn({ item }: { item: NavItem }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      className={
        "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition " +
        (item.active
          ? "bg-brand-orange/[0.08] font-bold text-ink"
          : "font-medium text-[#5c534a] hover:bg-[#f7f5f2]")
      }
    >
      {item.active && (
        <span
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-orange"
          aria-hidden
        />
      )}
      {item.icon && <Icon name={item.icon} className="h-4 w-4 shrink-0 opacity-70" />}
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug">{item.label}</span>
        {item.hint && (
          <span className="mt-0.5 block text-[0.7rem] font-medium text-[#8a8178]">{item.hint}</span>
        )}
      </span>
    </button>
  );
}

function ContextCard({
  eyebrow,
  title,
  subtitle,
  onBack,
  backLabel,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="mb-1 rounded-2xl border border-[#ebe7e0] bg-[#faf9f7] p-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#8a8178]">
        {eyebrow}
      </p>
      <p className="mt-1 truncate font-display text-base font-extrabold tracking-tight text-ink">
        {title}
      </p>
      {subtitle && <p className="mt-0.5 truncate text-xs text-[#6b635a]">{subtitle}</p>}
      <button
        type="button"
        onClick={onBack}
        className="mt-2.5 text-xs font-bold text-brand-orange hover:underline"
      >
        ← {backLabel}
      </button>
    </div>
  );
}

function Tip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        "rounded-xl bg-[#faf9f7] px-3 py-2.5 text-[0.75rem] leading-relaxed text-[#6b635a] " +
        className
      }
    >
      {children}
    </div>
  );
}

/**
 * Workspace-style switcher, right below the logo — "which kind of shopping"
 * is a more fundamental choice than any of the nav items below it (Local
 * Markets bargains live; Supermarkets are fixed-price), so it gets the same
 * prominent, always-visible treatment a workspace switcher gets in Slack or
 * Notion, not a buried filter row.
 *
 * A segmented toggle, not a dropdown — there are exactly two options, so
 * switching should be one click on the option you want, not open-then-
 * choose. The dropdown this replaced needed two clicks and made you read
 * which of two items was already selected before you could act; this one is
 * scannable and switches on contact, the same one-tap pattern the mobile
 * venue chips already used (see MarketPicker.tsx).
 */
function VenueTypeSwitcher({
  venueType,
  venueCounts,
  onSelect,
}: {
  venueType: VenueType;
  venueCounts: { local_market: number; supermarket: number };
  onSelect: (id: VenueType) => void;
}) {
  const options = [
    { id: "local_market" as VenueType, label: "Local Markets", count: venueCounts.local_market, icon: "basket" as const },
    { id: "supermarket" as VenueType, label: "Supermarkets", count: venueCounts.supermarket, icon: "store" as const },
  ];

  return (
    <div className="px-3 pb-4">
      <div role="group" aria-label="Shop from" className="flex gap-1 rounded-xl border border-[#ebe7e0] bg-[#faf9f7] p-1">
        {options.map((o) => {
          const active = o.id === venueType;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(o.id)}
              className={
                "flex flex-1 min-w-0 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-center transition " +
                (active ? "bg-white text-brand-orange shadow-sm" : "text-ink/55 hover:text-ink")
              }
            >
              <Icon name={o.icon} className="h-4 w-4" />
              <span className="w-full truncate text-xs font-bold leading-none">{o.label}</span>
              <span className="text-[0.65rem] font-medium leading-none opacity-70">{o.count} live</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function usePortalTarget(id: string) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setEl(document.getElementById(id));
  }, [id]);
  return el;
}

/**
 * Shop's contextual nav — a venue-type switcher beside the logo, plus
 * list-composer tools while building a list. Portals into the SAME sidebar
 * column AppShell already renders (Shop/History/Wallet/Settings) instead of
 * opening a second column next to it. Desktop (lg+) only — the portal
 * targets are hidden below that width.
 *
 * Categories live in the content area now (see MarketPicker's filter row),
 * not here - they're a "refine what I'm looking at" concern, the same
 * family as its Live-now/Sort controls, not app-level navigation.
 *
 * `mode` only ever reaches "browse" or "list" today: local-market stall
 * browsing (the "vendors"/"stall" modes this used to also render) was
 * retired in favor of a list-only flow, so those cases are gone rather than
 * kept as dead branches.
 */
export function ShopSideRail({
  mode,
  venueType,
  venueCounts,
  onSelectVenueType,
  market,
  listComposerMode,
  onListComposerMode,
  listTools,
  onBackToMarkets,
}: {
  mode: "browse" | "vendors" | "stall" | "list";
  venueType: VenueType;
  venueCounts: { local_market: number; supermarket: number };
  onSelectVenueType: (id: VenueType) => void;
  market?: any | null;
  listComposerMode: "detailed" | "freetext";
  onListComposerMode: (id: "detailed" | "freetext") => void;
  listTools: { id: "detailed" | "freetext"; label: string; icon: "basket" | "flag" }[];
  onBackToMarkets: () => void;
  // Other props MarketPicker still passes (category/stall-filter plumbing,
  // some left over from the retired stall-browsing modes) are accepted but
  // unused - harmless, and keeps that call site untouched.
  [key: string]: any;
}) {
  const brandTarget = usePortalTarget(SIDEBAR_BRAND_EXTRA_ID);
  const shopTarget = usePortalTarget(SIDEBAR_SHOP_EXTRA_ID);
  const isSuper = (market?.venue_type || "local_market") === "supermarket";

  return (
    <>
      {/* Only in browse mode - once a market's picked, switching venue type
          mid-list doesn't make sense; the ContextCard's back-link covers it. */}
      {brandTarget &&
        mode === "browse" &&
        createPortal(
          <VenueTypeSwitcher venueType={venueType} venueCounts={venueCounts} onSelect={onSelectVenueType} />,
          brandTarget
        )}

      {shopTarget &&
        createPortal(
          <div className="border-t border-ink/8 px-3 py-4">
            {mode === "browse" && (
              <Tip>
                <span className="font-semibold text-ink">Agents shop and deliver for you</span> —
                pick a market, then build your list.
              </Tip>
            )}

            {mode === "list" && market && (
              <>
                {/* No market-name subtitle here on purpose — the header and
                    the hero banner above already state it prominently;
                    repeating it a third time added noise, not orientation.
                    This card's job is just "what step, how do I leave it." */}
                <ContextCard
                  eyebrow={isSuper ? "Cart" : "List"}
                  title={isSuper ? "Build your cart" : "Build your list"}
                  onBack={onBackToMarkets}
                  backLabel="All markets"
                />

                <RailSection label="Compose">
                  <nav className="space-y-0.5">
                    {listTools.map((f) => (
                      <RailBtn
                        key={f.id}
                        item={{
                          id: f.id,
                          label: f.label,
                          icon: f.icon,
                          hint: f.id === "detailed" ? "Item + expected ₦" : "Paste lines + budget",
                          active: listComposerMode === f.id,
                          onClick: () => onListComposerMode(f.id),
                        }}
                      />
                    ))}
                  </nav>
                </RailSection>

                <Tip className="mt-6">
                  {isSuper ? (
                    <>
                      <span className="font-semibold text-ink">Shelf prices</span> — what you enter
                      is closer to checkout. Quika still picks and delivers.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-ink">Your estimate</span> — real prices
                      come from bargaining. Add notes for ripeness, size, or brand.
                    </>
                  )}
                </Tip>
              </>
            )}
          </div>,
          shopTarget
        )}
    </>
  );
}

export default ShopSideRail;
