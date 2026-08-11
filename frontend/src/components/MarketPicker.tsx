"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "./EmptyState";
import Icon from "./Icon";
import MarketArt from "@/components/shop/MarketArt";
import {
  DIRECTORY_MARKETS,
  type FoodCategory,
  type VenueType,
} from "@/lib/marketDirectory";
import { marketTone, stallTone } from "@/lib/vendorVisuals";
import { catalogForStall, categoriesForCatalog } from "@/lib/stallCatalog";
import { useShopOptional } from "@/components/shop/ShopContext";
import { api } from "@/lib/api";
import ShopSideRail from "@/components/shop/ShopSideRail";

const VENUE_TYPES: {
  id: VenueType;
  label: string;
  hint: string;
  icon: "store" | "basket";
}[] = [
  { id: "local_market", label: "Local Markets", hint: "Bargain live", icon: "basket" },
  { id: "supermarket", label: "Supermarkets", hint: "Fixed prices", icon: "store" },
];

const FOOD_FILTERS: { id: FoodCategory | "popular"; label: string; icon: string }[] = [
  { id: "popular", label: "Popular", icon: "star" },
  { id: "produce", label: "Produce", icon: "basket" },
  { id: "protein", label: "Protein", icon: "flag" },
  { id: "provisions", label: "Provisions", icon: "wallet" },
  { id: "spices", label: "Spices", icon: "store" },
];

type SortMode = "featured" | "az" | "za";

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "featured", label: "Featured first" },
  { id: "az", label: "A–Z" },
  { id: "za", label: "Z–A" },
];

function enrichMarket(m: any) {
  const dir = DIRECTORY_MARKETS.find(
    (d) =>
      m.name?.toLowerCase().includes(d.name.toLowerCase().replace(/\s+market$/, "").slice(0, 8)) ||
      d.name.toLowerCase() === (m.name || "").toLowerCase() ||
      m.name?.toLowerCase().includes(d.name.toLowerCase().slice(0, 10))
  );
  const venueType: VenueType =
    (m.venue_type as VenueType) || dir?.venueType || "local_market";
  return {
    ...m,
    venue_type: venueType,
    blurb: dir?.blurb || (
      venueType === "supermarket"
        ? "Fixed shelf prices — Quika picks and delivers."
        : "Open-air stalls, live bargaining, real market prices."
    ),
    categories: dir?.categories || ["provisions"],
    area: [m.city, m.state].filter(Boolean).join(", "),
    live: m.is_active !== false,
    isPilot: dir?.status === "pilot",
    tone: marketTone(m.name, m.city),
    featured: venueType === "local_market",
    image:
      dir?.image ||
      (venueType === "supermarket" ? "/quika-cat-pantry.jpg" : "/quika-cat-produce.jpg"),
  };
}

function MarketCard({
  m,
  onSelect,
  size = "md",
}: {
  m: any;
  onSelect: (m: any) => void;
  size?: "md" | "lg";
}) {
  const wide = size === "lg";
  return (
    <button
      type="button"
      onClick={() => onSelect(m)}
      className={
        "group shrink-0 snap-start text-left transition duration-200 " +
        (wide ? "w-[300px] sm:w-[340px]" : "w-[240px] sm:w-[260px]")
      }
    >
      <span className="relative block overflow-hidden rounded-xl ring-1 ring-[#ebe7e0] transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgba(33,26,20,0.1)] group-hover:ring-[#ddd6cb]">
        <MarketArt
          tone={m.tone}
          title={m.name}
          image={m.image}
          featured={m.featured}
          className="aspect-[16/10] w-full"
        />
        {m.live ? (
          <span className="absolute left-2.5 top-2.5 rounded bg-brand-orange px-2 py-1 text-[0.7rem] font-bold text-white">
            {m.venue_type === "supermarket" ? "Open · fixed price" : "Live · agent shops"}
          </span>
        ) : (
          <span className="absolute left-2.5 top-2.5 rounded bg-white/95 px-2 py-1 text-[0.7rem] font-bold text-ink">
            Coming soon
          </span>
        )}
      </span>
      <span className="mt-2.5 block pr-1">
        <span className={"block truncate font-bold text-ink " + (wide ? "text-base" : "text-[0.95rem]")}>
          {m.name}
        </span>
        <span className="mt-0.5 block text-sm text-[#6b635a]">{m.area}</span>
        <span className="mt-1.5 block text-xs font-medium text-[#8a8178]">
          {m.isPilot ? "Pilot — be among the first to shop here" : "New on Quika"}
        </span>
      </span>
    </button>
  );
}

function sortPilotsFirst(items: any[]) {
  return [...items].sort((a, b) => Number(Boolean(b.isPilot)) - Number(Boolean(a.isPilot)));
}

function sortMarkets(items: any[], mode: SortMode) {
  if (mode === "az") {
    return [...items].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }
  if (mode === "za") {
    return [...items].sort((a, b) => String(b.name || "").localeCompare(String(a.name || "")));
  }
  return sortPilotsFirst(items);
}

/**
 * Slim refinement strip — under the banner, above carousels.
 * Only honest filters: Live now (is_active) + Sort. No hours → no "Open today".
 */
function FilterBar({
  liveOnly,
  onLiveOnlyChange,
  sort,
  onSortChange,
}: {
  liveOnly: boolean;
  onLiveOnlyChange: (v: boolean) => void;
  sort: SortMode;
  onSortChange: (s: SortMode) => void;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const sortLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label || "Sort";

  useEffect(() => {
    if (!sortOpen) return;
    function onDoc(e: MouseEvent) {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSortOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

  return (
    <div
      className="mb-5 flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="toolbar"
      aria-label="Refine results"
    >
      <button
        type="button"
        aria-pressed={liveOnly}
        onClick={() => onLiveOnlyChange(!liveOnly)}
        className={
          "inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold transition " +
          (liveOnly
            ? "bg-ink text-white"
            : "bg-[#f0eeeb] text-ink hover:bg-[#e8e4df]")
        }
      >
        Live now
      </button>

      <div className="relative shrink-0" ref={sortRef}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={sortOpen}
          onClick={() => setSortOpen((o) => !o)}
          className={
            "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition " +
            (sort !== "featured" || sortOpen
              ? "bg-ink text-white"
              : "bg-[#f0eeeb] text-ink hover:bg-[#e8e4df]")
          }
        >
          {sort === "featured" ? "Sort" : sortLabel}
          <svg
            viewBox="0 0 20 20"
            className={"h-3.5 w-3.5 transition " + (sortOpen ? "rotate-180" : "")}
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {sortOpen && (
          <div
            role="listbox"
            aria-label="Sort venues"
            className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[11rem] overflow-hidden rounded-xl border border-[#ebe7e0] bg-white py-1 shadow-[0_12px_28px_rgba(33,26,20,0.12)]"
          >
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={sort === o.id}
                onClick={() => {
                  onSortChange(o.id);
                  setSortOpen(false);
                }}
                className={
                  "flex w-full px-3.5 py-2 text-left text-sm font-semibold transition hover:bg-[#f7f5f2] " +
                  (sort === o.id ? "text-brand-orange" : "text-ink")
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CarouselSection({
  title,
  subtitle,
  items,
  onSelect,
  cardSize = "md",
  sort = "featured",
}: {
  title: string;
  subtitle?: string;
  items: any[];
  onSelect: (m: any) => void;
  cardSize?: "md" | "lg";
  sort?: SortMode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const ordered = useMemo(() => sortMarkets(items, sort), [items, sort]);

  function updateArrows() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [ordered]);

  function scroll(dir: -1 | 1) {
    scrollerRef.current?.scrollBy({
      left: dir * Math.min(600, (scrollerRef.current?.clientWidth || 400) * 0.85),
      behavior: "smooth",
    });
  }

  if (!ordered.length) return null;

  return (
    <section className="mb-9">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">{title}</h2>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#6b635a]">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            disabled={!canLeft}
            onClick={() => scroll(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd6cb] bg-white text-ink shadow-[0_1px_2px_rgba(33,26,20,0.06)] transition hover:bg-[#faf9f7] disabled:opacity-30"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.83 10l3.94 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            disabled={!canRight}
            onClick={() => scroll(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd6cb] bg-white text-ink shadow-[0_1px_2px_rgba(33,26,20,0.06)] transition hover:bg-[#faf9f7] disabled:opacity-30"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ordered.map((m) => (
          <MarketCard key={m.id} m={m} onSelect={onSelect} size={cardSize} />
        ))}
      </div>
    </section>
  );
}

function ShopHeroBanner({
  venueType,
  activity,
  market,
  stall,
  listMode = false,
  preferredVendor = null,
}: {
  venueType: VenueType;
  activity: { agents_on_duty: number; active_markets: number; active_supermarkets: number } | null;
  market?: any | null;
  stall?: { name: string; stall_description?: string | null } | null;
  listMode?: boolean;
  preferredVendor?: { id: string; name: string } | null;
}) {
  const agents = activity?.agents_on_duty ?? 0;
  const markets = activity?.active_markets ?? 0;
  const supers = activity?.active_supermarkets ?? 0;
  const isSuper = venueType === "supermarket";

  let bg = isSuper ? "#1A2E1F" : "#211A14";
  let image = isSuper ? "/quika-cat-pantry.jpg" : "/quika-cat-produce.jpg";
  let imageAlt = isSuper ? "Shelved grocery provisions" : "Open-air market produce";
  let eyebrow = isSuper ? "Supermarkets" : "Local markets";
  let title = isSuper
    ? "Shelf prices. Still Quika delivery."
    : "Every purchase photographed. Every price real.";
  let body = isSuper
    ? supers > 0
      ? `${supers} supermarket${supers === 1 ? "" : "s"} on Quika — fixed prices, no stall-hopping.`
      : "Fixed-price shopping when you know exactly what you need."
    : agents > 0 || markets > 0
      ? `${agents} agent${agents === 1 ? "" : "s"} on duty across ${markets} open-air market${markets === 1 ? "" : "s"} — bargaining for you.`
      : "Your agent walks the stalls and bargains. You get the haul — and the receipts.";

  if (listMode && market) {
    const enriched = enrichMarket(market);
    const superList = (market.venue_type || "") === "supermarket";
    // Ink field (not orange) so the brand-orange eyebrow stays legible
    bg = superList ? "#1A2E1F" : "#211A14";
    image = enriched.image || (superList ? "/quika-cat-pantry.jpg" : "/quika-trust-basket.jpg");
    imageAlt = market.name;
    eyebrow = superList ? `${market.name} · cart` : `${market.name} · list`;
    title = superList ? "Build your cart" : "Build your list";
    body = superList
      ? "Fixed shelf prices — add items and continue to delivery."
      : preferredVendor
        ? `Soft prefer ${preferredVendor.name}. Add items with bargain estimates — your agent negotiates live.`
        : "Add items with what you expect to pay. Your agent bargains the real prices at the market.";
  } else if (stall && market) {
    const tone = stallTone(stall.stall_description, stall.name);
    bg = tone === "protein" ? "#6B2A22" : tone === "provisions" ? "#5C3A1E" : tone === "produce" ? "#1F4D2E" : "#C2430F";
    image =
      tone === "protein"
        ? "/quika-cat-protein.jpg"
        : tone === "provisions"
          ? "/quika-cat-pantry.jpg"
          : tone === "produce"
            ? "/quika-cat-produce.jpg"
            : "/quika-trust-basket.jpg";
    imageAlt = stall.name;
    eyebrow = `${market.name} · stall`;
    title = stall.name;
    body =
      stall.stall_description ||
      "Browse suggested picks and the full stall catalogue — bargain estimates, negotiated live.";
  } else if (market) {
    const enriched = enrichMarket(market);
    bg = enriched.venue_type === "supermarket" ? "#1A2E1F" : "#211A14";
    image = enriched.image;
    imageAlt = enriched.name;
    eyebrow = enriched.area || (enriched.venue_type === "supermarket" ? "Supermarket" : "Local market");
    title = enriched.name;
    body =
      enriched.blurb ||
      "Choose a stall to browse, or shop the whole market with your list.";
  }

  return (
    <div
      className="relative mb-6 min-h-[200px] overflow-hidden rounded-2xl sm:min-h-[240px]"
      style={{ backgroundColor: bg }}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[60%]">
        <img src={image} alt={imageAlt} className="h-full w-full object-cover object-center" />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${bg} 0%, ${bg} 12%, ${bg}cc 28%, ${bg}66 48%, transparent 72%)`,
          }}
        />
        <div
          className="absolute inset-0 sm:hidden"
          style={{
            background: `linear-gradient(90deg, ${bg} 0%, ${bg}e6 35%, ${bg}99 55%, transparent 85%)`,
          }}
        />
      </div>

      <div className="relative z-10 flex w-full flex-col justify-center px-5 py-7 sm:w-[40%] sm:px-7 sm:py-9">
        <p
          className={
            "text-xs font-bold uppercase tracking-[0.14em] " +
            (listMode || stall || (!market && !isSuper) ? "text-brand-orange" : "text-white/55")
          }
        >
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70 sm:text-base line-clamp-3">{body}</p>
      </div>
    </div>
  );
}

/**
 * Venue-aware market discovery — Local Markets (flagship) vs Supermarkets.
 * Left rail + banner stay mounted; main content swaps for market / stalls / stall / list.
 */
function MarketPicker({
  markets,
  loading,
  onSelect,
  onCancel,
  variant = "page",
  title,
  subtitle,
  query: queryProp,
  vendorsPanel = null,
  listPanel = null,
}: any) {
  const shop = useShopOptional();
  const searchQuery = queryProp ?? shop?.searchQuery ?? "";
  const inVendors = Boolean(vendorsPanel);
  const inList = Boolean(listPanel);
  const inShell = inVendors || inList;
  const activeMarket = inShell ? shop?.market : null;
  const browseStall = inVendors ? shop?.browseStall : null;
  const preferredVendor = inList ? shop?.vendor : null;

  const [venueType, setVenueType] = useState<VenueType>("local_market");
  const [food, setFood] = useState<FoodCategory | "popular">("popular");
  const [liveOnly, setLiveOnly] = useState(true);
  const [sort, setSort] = useState<SortMode>("featured");
  const [activity, setActivity] = useState<{
    agents_on_duty: number;
    active_markets: number;
    active_supermarkets: number;
  } | null>(null);

  useEffect(() => {
    api.getShopActivity().then(setActivity).catch(() => setActivity(null));
  }, []);

  // Keep left-rail venue type in sync with the opened market
  useEffect(() => {
    if (!activeMarket) return;
    const vt = (activeMarket.venue_type || "local_market") as VenueType;
    setVenueType(vt === "supermarket" ? "supermarket" : "local_market");
  }, [activeMarket?.id, activeMarket?.venue_type]);

  function selectVenueType(id: VenueType) {
    setVenueType(id);
    setFood("popular");
    // Leaving a market/list section via the rail returns to venue browse
    if (inShell && shop) {
      shop.setBrowseStall(null);
      shop.setStep("market");
    }
  }

  const enriched = useMemo(() => (markets || []).map(enrichMarket), [markets]);

  const counts = useMemo(() => {
    const local = enriched.filter((m) => m.venue_type === "local_market").length;
    const superN = enriched.filter((m) => m.venue_type === "supermarket").length;
    return { local_market: local, supermarket: superN };
  }, [enriched]);

  const shown = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enriched.filter((m) => {
      if (m.venue_type !== venueType) return false;
      if (liveOnly && !m.live) return false;
      const matchesQ =
        !q ||
        [m.name, m.city, m.state, m.area, m.blurb].some((v) =>
          String(v || "").toLowerCase().includes(q)
        );
      const matchesFood =
        food === "popular" || (m.categories || []).includes(food);
      return matchesQ && matchesFood;
    });
  }, [enriched, searchQuery, venueType, food, liveOnly]);

  const live = shown.filter((m) => m.live);
  const pilots = shown.filter((m) => m.isPilot);
  const liveOthers = live.filter((m) => !m.isPilot);
  const comingSoon = shown.filter((m) => !m.live);
  const isOverlay = variant === "overlay";
  const isLocal = venueType === "local_market";
  const cardSize = isLocal ? "lg" : "md";

  const sectionCopy = isLocal
    ? {
        pilot: {
          title: "Pilot on Quika",
          subtitle: "Be among the first — these markets are live for early shoppers.",
        },
        live: {
          title: "Open-air, live now",
          subtitle: "Agents bargain stall-to-stall — price is discovered for real.",
        },
        soon: {
          title: "Coming soon",
          subtitle: "Markets joining Quika next — not live for shopping yet.",
        },
      }
    : {
        pilot: {
          title: "Pilot stores",
          subtitle: "Fixed-price partners open for early Quika shoppers.",
        },
        live: {
          title: "Open now",
          subtitle: "Fixed shelf prices. Quika still picks and delivers.",
        },
        soon: {
          title: "Coming soon",
          subtitle: "More stores joining Quika — not live for shopping yet.",
        },
      };

  const stallNavCats = useMemo(() => {
    if (!browseStall) return [];
    const items = catalogForStall(browseStall.stall_description, browseStall.name);
    return categoriesForCatalog(items);
  }, [browseStall]);

  const STALL_TYPE_FILTERS = [
    { id: "all", label: "All stalls", icon: "store" as const },
    { id: "produce", label: "Produce", icon: "basket" as const },
    { id: "protein", label: "Protein", icon: "flag" as const },
    { id: "provisions", label: "Provisions", icon: "wallet" as const },
  ];

  const pageTitle = inList
    ? (activeMarket?.venue_type || "") === "supermarket"
      ? "Build your cart"
      : "Build your list"
    : browseStall
      ? browseStall.name
      : activeMarket
        ? activeMarket.name
        : title || (isLocal ? "Local markets" : "Supermarkets");

  const pageSubtitle = inList
    ? preferredVendor
      ? `Soft prefer ${preferredVendor.name} · bargain estimates for ${activeMarket?.name || "this market"}.`
      : (activeMarket?.venue_type || "") === "supermarket"
        ? "Fixed prices — add what you need and continue."
        : "Add items with expected prices. Your agent bargains the rest."
    : browseStall
      ? "Suggested picks and stall catalogue — bargain estimates, negotiated live."
      : activeMarket
        ? "Pick a stall or shop the whole market with your list."
        : subtitle ||
          (isLocal
            ? "Where your agent bargains — stalls optional, prices discovered live."
            : "Fixed prices. Skip the stalls — build a cart and go.");

  const LIST_TOOLS: { id: "detailed" | "freetext"; label: string; icon: "basket" | "flag" }[] = [
    { id: "detailed", label: "Detailed items", icon: "basket" },
    { id: "freetext", label: "Free-text list", icon: "flag" },
  ];

  const railMode = inList
    ? "list"
    : browseStall
      ? "stall"
      : inVendors
        ? "vendors"
        : "browse";

  function goVendors() {
    shop?.setBrowseStall(null);
    shop?.setStep("vendors");
  }

  function backToStallFromList() {
    const v = shop?.vendor;
    if (v) {
      shop?.setBrowseStall({
        id: v.id,
        name: v.name,
        stall_description: v.stall_description ?? null,
      });
    }
    shop?.setStep("vendors");
  }

  function goList() {
    shop?.setBrowseStall(null);
    shop?.setStep("list");
  }

  function shopWholeMarket() {
    shop?.setBrowseStall(null);
    shop?.setVendor(null);
    shop?.setStep("list");
  }

  function writeOwnList() {
    if (browseStall) {
      shop?.setVendor({
        id: browseStall.id,
        name: browseStall.name,
        stall_description: browseStall.stall_description ?? null,
      });
    }
    shop?.setBrowseStall(null);
    shop?.setStep("list");
  }

  const rail = (
    <ShopSideRail
      mode={railMode}
      venueType={venueType}
      venueCounts={counts}
      onSelectVenueType={selectVenueType}
      food={food}
      foodFilters={FOOD_FILTERS}
      onSelectFood={(id) => setFood(id as FoodCategory | "popular")}
      market={activeMarket}
      stall={browseStall}
      preferredVendor={preferredVendor || shop?.vendor}
      stallTypeFilter={shop?.stallTypeFilter || "all"}
      onStallTypeFilter={(id) => shop?.setStallTypeFilter(id)}
      stallTypeFilters={STALL_TYPE_FILTERS}
      stallCategories={stallNavCats}
      stallCategory={shop?.stallCategory || "featured"}
      onStallCategory={(id) => shop?.setStallCategory(id)}
      listComposerMode={shop?.listComposerMode || "detailed"}
      onListComposerMode={(id) => shop?.setListComposerMode(id)}
      listTools={LIST_TOOLS}
      onGoVendors={goVendors}
      onBackToStall={backToStallFromList}
      onGoList={goList}
      onShopWholeMarket={shopWholeMarket}
      onWriteOwnList={writeOwnList}
      onBackToMarkets={() => {
        shop?.setBrowseStall(null);
        shop?.setStep("market");
      }}
      onCloseStall={() => shop?.setBrowseStall(null)}
    />
  );

  const marketsBody = (
    <>
      <FilterBar
        liveOnly={liveOnly}
        onLiveOnlyChange={setLiveOnly}
        sort={sort}
        onSortChange={setSort}
      />

      {loading && (
        <div className="mb-8 flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-[280px] shrink-0">
              <div className="aspect-[16/10] animate-pulse rounded-xl bg-[#ece8e2]" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-[#ece8e2]" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#f0eeeb]" />
            </div>
          ))}
        </div>
      )}

      {!loading && shown.length === 0 && (
        <EmptyState
          icon="store"
          title={liveOnly ? "Nothing live right now" : "Nothing here yet"}
          subtitle={
            liveOnly
              ? "Turn off Live now to see all venues in this category."
              : venueType === "supermarket"
                ? "No supermarkets match — try Popular, or switch to Local Markets."
                : "No markets match — try another category, or clear filters."
          }
        />
      )}

      {!loading && pilots.length > 0 && (
        <CarouselSection
          title={sectionCopy.pilot.title}
          subtitle={sectionCopy.pilot.subtitle}
          items={pilots}
          onSelect={onSelect}
          cardSize={cardSize}
          sort={sort}
        />
      )}

      {!loading && liveOthers.length > 0 && (
        <CarouselSection
          title={sectionCopy.live.title}
          subtitle={sectionCopy.live.subtitle}
          items={liveOthers}
          onSelect={onSelect}
          cardSize={cardSize}
          sort={sort}
        />
      )}

      {!loading && pilots.length === 0 && live.length > 0 && (
        <CarouselSection
          title={sectionCopy.live.title}
          subtitle={sectionCopy.live.subtitle}
          items={live}
          onSelect={onSelect}
          cardSize={cardSize}
          sort={sort}
        />
      )}

      {!loading && comingSoon.length > 0 && (
        <CarouselSection
          title={sectionCopy.soon.title}
          subtitle={sectionCopy.soon.subtitle}
          items={comingSoon}
          onSelect={onSelect}
          cardSize={cardSize}
          sort={sort}
        />
      )}
    </>
  );

  const body = (
    <>
      {!isOverlay && (
        <ShopHeroBanner
          venueType={venueType}
          activity={activity}
          market={activeMarket}
          stall={browseStall}
          listMode={inList}
          preferredVendor={preferredVendor}
        />
      )}
      {inList ? listPanel : inVendors ? vendorsPanel : marketsBody}
    </>
  );

  if (isOverlay) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onCancel} />
        <div className="relative z-[1] flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-[#ebe7e0] px-5 py-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ink">{title || "Change venue"}</h2>
              <p className="mt-0.5 text-sm text-[#6b635a]">Your list stays when you switch.</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#6b635a] hover:bg-[#f0eeeb]"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="hidden w-[200px] shrink-0 border-r border-[#ebe7e0] lg:block">
              <div className="space-y-0.5 p-3">
                {VENUE_TYPES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVenueType(v.id)}
                    className={
                      "flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold " +
                      (venueType === v.id ? "bg-brand-orange/10 text-ink" : "text-[#5c534a]")
                    }
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{body}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {rail}

      <div className="min-w-0 flex-1 bg-white px-4 py-5 md:px-6 lg:px-8">
        {/* Mobile: venue chips only on browse; section tools when deeper */}
        {!inShell && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {VENUE_TYPES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => selectVenueType(v.id)}
                className={
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold " +
                  (venueType === v.id ? "bg-ink text-white" : "bg-[#f0eeeb] text-ink")
                }
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {inList
            ? LIST_TOOLS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => shop?.setListComposerMode(f.id)}
                  className={
                    "inline-flex shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold " +
                    (shop?.listComposerMode === f.id
                      ? "bg-brand-orange/15 text-brand-orange-dark"
                      : "bg-[#f7f5f2] text-[#6b635a]")
                  }
                >
                  {f.label}
                </button>
              ))
            : browseStall
              ? stallNavCats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => shop?.setStallCategory(c.id)}
                    className={
                      "inline-flex shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold " +
                      (shop?.stallCategory === c.id
                        ? "bg-brand-orange/15 text-brand-orange-dark"
                        : "bg-[#f7f5f2] text-[#6b635a]")
                    }
                  >
                    {c.label}
                  </button>
                ))
              : inVendors
                ? STALL_TYPE_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => shop?.setStallTypeFilter(f.id)}
                      className={
                        "inline-flex shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold " +
                        (shop?.stallTypeFilter === f.id
                          ? "bg-brand-orange/15 text-brand-orange-dark"
                          : "bg-[#f7f5f2] text-[#6b635a]")
                      }
                    >
                      {f.label}
                    </button>
                  ))
                : FOOD_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFood(f.id)}
                      className={
                        "inline-flex shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold " +
                        (food === f.id
                          ? "bg-brand-orange/15 text-brand-orange-dark"
                          : "bg-[#f7f5f2] text-[#6b635a]")
                      }
                    >
                      {f.label}
                    </button>
                  ))}
        </div>

        {!browseStall && !inList && (
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-ink md:text-[1.75rem]">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-[#6b635a]">{pageSubtitle}</p>
          </div>
        )}

        {body}
      </div>
    </div>
  );
}

export default MarketPicker;
