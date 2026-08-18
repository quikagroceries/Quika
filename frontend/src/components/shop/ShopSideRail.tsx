"use client";

import { useEffect, useRef, useState } from "react";
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

function ChevronDown({ open = false }: { open?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={"h-3.5 w-3.5 shrink-0 text-[#8a8178] transition " + (open ? "rotate-180" : "")}
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Workspace-style switcher, right below the logo — "which kind of shopping"
 * is a more fundamental choice than any of the nav items below it (Local
 * Markets bargains live; Supermarkets are fixed-price), so it gets the same
 * prominent, always-visible treatment a workspace switcher gets in Slack or
 * Notion, not a buried filter row.
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const options = [
    {
      id: "local_market" as VenueType,
      label: "Local Markets",
      hint: `${venueCounts.local_market} live · bargain`,
      icon: "basket" as const,
    },
    {
      id: "supermarket" as VenueType,
      label: "Supermarkets",
      hint: `${venueCounts.supermarket} live · fixed price`,
      icon: "store" as const,
    },
  ];
  const current = options.find((o) => o.id === venueType) || options[0];

  return (
    <div className="relative px-3 pb-4" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={
          "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition " +
          (open
            ? "border-brand-orange/40 bg-[#fff8f5]"
            : "border-[#ebe7e0] bg-[#faf9f7] hover:bg-[#f0eeeb]")
        }
      >
        <Icon name={current.icon} className="h-4 w-4 shrink-0 text-brand-orange" />
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{current.label}</span>
        <ChevronDown open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Shop from"
          className="absolute left-3 right-3 top-[calc(100%-4px)] z-30 overflow-hidden rounded-xl border border-[#ebe7e0] bg-white py-1 shadow-[0_12px_28px_rgba(33,26,20,0.12)]"
        >
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="option"
              aria-selected={o.id === venueType}
              onClick={() => {
                onSelect(o.id);
                setOpen(false);
              }}
              className={
                "flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-[#f7f5f2] " +
                (o.id === venueType ? "text-brand-orange" : "text-ink")
              }
            >
              <Icon name={o.icon} className="h-4 w-4 shrink-0 opacity-70" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{o.label}</span>
              <span className="shrink-0 text-[0.7rem] font-medium text-[#8a8178]">{o.hint}</span>
            </button>
          ))}
        </div>
      )}
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
