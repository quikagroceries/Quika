"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "./EmptyState";
import Chip from "./Chip";
import FilterPills from "./FilterPills";
import HeroBanner from "./HeroBanner";
import { ActiveOrderBanner } from "./ActiveOrderBanner";
import StatTile from "./StatTile";
import marketStallArt from "@/assets/illustrations/market-stall-produce.png";
import shoppingCartArt from "@/assets/illustrations/shopping-cart.png";
import Icon from "./Icon";
import MarketArt from "@/components/shop/MarketArt";
import {
  findDirectoryMarket,
  type FoodCategory,
  type VenueType,
} from "@/lib/marketDirectory";
import { marketTone, stallTone, TONE_COVER } from "@/lib/vendorVisuals";
import { catalogForStall, categoriesForCatalog } from "@/lib/stallCatalog";
import { useShopOptional } from "@/components/shop/ShopContext";
import { api } from "@/lib/api";

const VENUE_TYPES: {
  id: VenueType;
  label: string;
  hint: string;
  icon: "store" | "basket";
}[] = [
  { id: "local_market", label: "Local Markets", hint: "Bargain live", icon: "basket" },
  { id: "supermarket", label: "Supermarkets", hint: "Fixed prices", icon: "store" },
];

// Each category carries its own identity — icon + a real accent color, not
// the one brand orange stretched across everything — so the row reads as a
// spread of departments (produce section, butcher counter, spice rack) the
// way a physical market would, and stays scannable at a glance.
// Lets the search box drive the category pills instead of the two controls
// sitting side by side unrelated — type "pepper" and Spices lights up on its
// own. Kept intentionally small/unambiguous; it's a soft suggestion the user
// can always override by tapping a pill directly, not a hard classifier.
const SEARCH_CATEGORY_KEYWORDS: Record<FoodCategory, string[]> = {
  produce: ["tomato", "onion", "vegetable", "carrot", "cabbage", "spinach", "ugu", "okra", "plantain", "banana", "orange", "apple", "cucumber", "lettuce", "fruit"],
  protein: ["chicken", "meat", "beef", "goat", "turkey", "egg", "mutton", "pork", "poultry"],
  fish: ["fish", "titus", "mackerel", "croaker", "catfish", "stockfish", "prawns", "shrimp", "crayfish", "seafood"],
  provisions: ["oil", "salt", "sugar", "maggi", "spaghetti", "macaroni", "noodles", "flour", "milk", "tinned", "canned", "pasta"],
  grains: ["rice", "beans", "garri", "yam", "corn", "maize", "millet", "sorghum", "wheat"],
  spices: ["pepper", "chili", "chilli", "curry", "thyme", "spice", "ginger", "garlic", "seasoning"],
  household: ["soap", "detergent", "tissue", "bleach", "cleaning", "sponge", "disinfectant"],
};

function categoryFromSearch(query: string): FoodCategory | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const [category, words] of Object.entries(SEARCH_CATEGORY_KEYWORDS)) {
    if (words.some((w) => q.includes(w))) return category as FoodCategory;
  }
  return null;
}

const FOOD_FILTERS: { id: FoodCategory | "popular"; label: string }[] = [
  { id: "popular", label: "Popular" },
  { id: "produce", label: "Produce" },
  { id: "protein", label: "Protein" },
  { id: "fish", label: "Fish" },
  { id: "provisions", label: "Provisions" },
  { id: "grains", label: "Grains" },
  { id: "spices", label: "Spices" },
  { id: "household", label: "Household" },
];

type SortMode = "featured" | "az" | "za";

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "featured", label: "Featured first" },
  { id: "az", label: "A–Z" },
  { id: "za", label: "Z–A" },
];

function enrichMarket(m: any) {
  const dir = findDirectoryMarket(m);
  const venueType: VenueType =
    (m.venue_type as VenueType) || dir?.venueType || "local_market";
  return {
    ...m,
    venue_type: venueType,
    blurb: dir?.blurb || (
      venueType === "supermarket"
        ? "Fixed shelf prices — Qyka picks and delivers."
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
      (venueType === "supermarket" ? "/qyka-cat-pantry.jpg" : "/qyka-cat-produce.jpg"),
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
  // The app's one card shape (white, rounded-3xl, border, soft shadow, lift
  // on hover - see Card.tsx), with the market art inset inside it and the
  // details below a dashed divider. This used to be a bare image with loose
  // text underneath it, the only card-like thing in the app that wasn't a
  // card.
  return (
    <button
      type="button"
      onClick={() => onSelect(m)}
      className="group flex w-full flex-col rounded-3xl border border-line bg-surface p-2 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
    >
      <span className="relative block overflow-hidden rounded-2xl">
        <MarketArt
          tone={m.tone}
          title={m.name}
          image={m.image}
          featured={m.featured}
          className="aspect-[4/3] w-full"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-2.5 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-wide text-ink shadow-sm">
          {m.live ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-green" />
              </span>
              {m.venue_type === "supermarket" ? "Fixed price" : "Live now"}
            </>
          ) : (
            "Coming soon"
          )}
        </span>
      </span>
      <span className="block px-3 pb-3 pt-3">
        <span className={"block truncate font-display font-extrabold tracking-tight text-ink " + (wide ? "text-lg" : "text-base")}>
          {m.name}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-sm text-muted">
          <Icon name="pin" className="h-3 w-3 shrink-0 text-faint" />
          <span className="truncate">{m.area}</span>
        </span>
        <span className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-line-strong pt-3">
          <span
            className={
              "inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-bold " +
              (m.isPilot ? "bg-brand-orange/15 text-brand-orange-dark" : "bg-brand-green/10 text-brand-green")
            }
          >
            {m.isPilot ? "Pilot" : "New on Qyka"}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-muted transition group-hover:text-ink">
            Shop here
            <Icon name="chevronDown" className="h-3.5 w-3.5 -rotate-90" />
          </span>
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
      className="mb-4 flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="toolbar"
      aria-label="Refine results"
    >
      <Chip selected={liveOnly} onClick={() => onLiveOnlyChange(!liveOnly)}>
        Live now
      </Chip>

      <div className="relative shrink-0" ref={sortRef}>
        <Chip
          aria-haspopup="listbox"
          aria-expanded={sortOpen}
          selected={sort !== "featured" || sortOpen}
          onClick={() => setSortOpen((o) => !o)}
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
        </Chip>
        {sortOpen && (
          <div
            role="listbox"
            aria-label="Sort venues"
            className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[11rem] overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-[0_12px_28px_rgba(33,26,20,0.12)]"
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
                  "flex w-full px-3.5 py-2 text-left text-sm font-semibold transition hover:bg-sunken-2 " +
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

function MarketSection({
  title,
  items,
  onSelect,
  cardSize = "md",
  sort = "featured",
}: {
  title: string;
  items: any[];
  onSelect: (m: any) => void;
  cardSize?: "md" | "lg";
  sort?: SortMode;
}) {
  const ordered = useMemo(() => sortMarkets(items, sort), [items, sort]);

  if (!ordered.length) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-display text-xl font-extrabold tracking-tight text-ink">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

  let bg = isSuper ? TONE_COVER.produce.bg : TONE_COVER.mixed.bg;
  let image = isSuper ? "/qyka-cat-pantry.jpg" : "/qyka-cat-produce.jpg";
  let imageAlt = isSuper ? "Shelved grocery provisions" : "Open-air market produce";
  let eyebrow = isSuper ? "Supermarkets" : "Local markets";
  let title = isSuper
    ? "Shelf prices. Still Qyka delivery."
    : "Every purchase photographed. Every price real.";
  let body = isSuper
    ? supers > 0
      ? `${supers} supermarket${supers === 1 ? "" : "s"} on Qyka — fixed prices, no stall-hopping.`
      : "Fixed-price shopping when you know exactly what you need."
    : agents > 0 || markets > 0
      ? `${agents} agent${agents === 1 ? "" : "s"} on duty across ${markets} open-air market${markets === 1 ? "" : "s"} — bargaining for you.`
      : "Your agent walks the stalls and bargains. You get the haul — and the receipts.";

  if (listMode && market) {
    const enriched = enrichMarket(market);
    const superList = (market.venue_type || "") === "supermarket";
    // Light tint, not a dark field - cream/white surfaces only, per the
    // app's no-dark-surfaces rule (see vendorVisuals.ts::TONE_COVER).
    bg = superList ? TONE_COVER.produce.bg : TONE_COVER.mixed.bg;
    image = enriched.image || (superList ? "/qyka-cat-pantry.jpg" : "/qyka-trust-basket.jpg");
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
    bg = TONE_COVER[tone].bg;
    image =
      tone === "protein"
        ? "/qyka-cat-protein.jpg"
        : tone === "provisions"
          ? "/qyka-cat-pantry.jpg"
          : tone === "produce"
            ? "/qyka-cat-produce.jpg"
            : "/qyka-trust-basket.jpg";
    imageAlt = stall.name;
    eyebrow = `${market.name} · stall`;
    title = stall.name;
    body =
      stall.stall_description ||
      "Browse suggested picks and the full stall catalogue — bargain estimates, negotiated live.";
  } else if (market) {
    const enriched = enrichMarket(market);
    bg = enriched.venue_type === "supermarket" ? TONE_COVER.produce.bg : TONE_COVER.mixed.bg;
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
      className="relative mb-4 min-h-[132px] overflow-hidden rounded-2xl shadow-md sm:min-h-[150px]"
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

      <div className="relative z-10 flex w-full flex-col justify-center px-5 py-5 sm:w-[52%] sm:px-8 sm:py-6 lg:w-[46%]">
        <p
          className={
            "text-[0.7rem] font-bold uppercase tracking-[0.14em] " +
            (listMode || stall || (!market && !isSuper) ? "text-brand-orange" : "text-ink/55")
          }
        >
          {eyebrow}
        </p>
        <h2 className="mt-1.5 font-display text-xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1.5 text-[0.8rem] leading-snug text-ink/70 line-clamp-2">{body}</p>
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
  flowSteps = null,
  heroActions = null,
}: any) {
  const router = useRouter();
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
  // Once the customer taps a pill directly, their choice wins — search text
  // stops silently overriding it until they switch venue type (a fresh start).
  const foodIsManual = useRef(false);
  function pickFood(id: FoodCategory | "popular") {
    foodIsManual.current = true;
    setFood(id);
  }
  useEffect(() => {
    if (foodIsManual.current) return;
    setFood(categoryFromSearch(searchQuery) || "popular");
  }, [searchQuery]);
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
    foodIsManual.current = false;
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
  // Plain market browse (Step 2 of the order flow) - as opposed to the shell
  // modes that reuse this picker for a stall page or the list composer.
  const browseMode = !isOverlay && !inShell;
  const isLocal = venueType === "local_market";
  const cardSize = isLocal ? "lg" : "md";

  const sectionCopy = isLocal
    ? {
        pilot: {
          title: "Pilot on Qyka",
          subtitle: "Be among the first — these markets are live for early shoppers.",
        },
        live: {
          title: "Open-air, live now",
          subtitle: "Agents bargain stall-to-stall — price is discovered for real.",
        },
        soon: {
          title: "Coming soon",
          subtitle: "Markets joining Qyka next — not live for shopping yet.",
        },
      }
    : {
        pilot: {
          title: "Pilot stores",
          subtitle: "Fixed-price partners open for early Qyka shoppers.",
        },
        live: {
          title: "Open now",
          subtitle: "Fixed shelf prices. Qyka still picks and delivers.",
        },
        soon: {
          title: "Coming soon",
          subtitle: "More stores joining Qyka — not live for shopping yet.",
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

  const marketsBody = (
    <>
      <FilterBar
        liveOnly={liveOnly}
        onLiveOnlyChange={setLiveOnly}
        sort={sort}
        onSortChange={setSort}
      />

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <div className="aspect-[4/3] animate-pulse rounded-2xl bg-sunken-2" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-sunken-2" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-sunken" />
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
        <MarketSection
          title={sectionCopy.pilot.title}
          items={pilots}
          onSelect={onSelect}
          cardSize={cardSize}
          sort={sort}
        />
      )}

      {!loading && liveOthers.length > 0 && (
        <MarketSection
          title={sectionCopy.live.title}
          items={liveOthers}
          onSelect={onSelect}
          cardSize={cardSize}
          sort={sort}
        />
      )}

      {!loading && pilots.length === 0 && live.length > 0 && (
        <MarketSection
          title={sectionCopy.live.title}
          items={live}
          onSelect={onSelect}
          cardSize={cardSize}
          sort={sort}
        />
      )}

      {!loading && comingSoon.length > 0 && (
        <MarketSection
          title={sectionCopy.soon.title}
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
      {!isOverlay && !browseMode && (
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
        <div className="relative z-[1] flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ink">{title || "Change venue"}</h2>
              <p className="mt-0.5 text-sm text-muted">Your list stays when you switch.</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sunken"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="hidden w-[200px] shrink-0 border-r border-line lg:block">
              <div className="space-y-0.5 p-3">
                {VENUE_TYPES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVenueType(v.id)}
                    className={
                      "flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold " +
                      (venueType === v.id ? "bg-brand-orange/15 text-brand-orange-dark" : "text-muted")
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
    <div className="flex min-h-[calc(100vh-4rem)] md:min-h-full">
      <div className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8 lg:px-8">
        {/* Step 2's header, top to bottom: the venue switch (what KIND of
            place - it changes everything below it, so it leads), then the
            flow's step tracker (`flowHeader`, owned by NewOrderFlow), then
            the hero. The hero is the same persistent HeroBanner format the
            rest of the shop uses, and it follows the venue switch: its
            question, copy, art and figures all change with Local Markets vs
            Supermarkets instead of being one static banner. */}
        {browseMode && (
          <>
            {/* Switch on the left, the list summary flexed to the far end of
                the same row - the switch changes what's browsed, the chip
                is the standing "what am I shopping for" reminder. */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="w-full max-w-md sm:w-[26rem]">
                <FilterPills
                  variant="segmented"
                  className=""
                  options={VENUE_TYPES.map((v) => ({ key: v.id, label: `${v.label} · ${counts[v.id] ?? 0}` }))}
                  value={venueType}
                  onChange={selectVenueType}
                />
              </div>
              {heroActions && <div className="ml-auto">{heroActions}</div>}
            </div>

            <HeroBanner
              leading={flowSteps}
              eyebrow={isLocal ? "Step 2 of 4 · Local markets" : "Step 2 of 4 · Supermarkets"}
              title={isLocal ? title || "Which market?" : "Which supermarket?"}
              body={
                isLocal
                  ? subtitle || "Where should your agent shop your list?"
                  : "Where should we shop your list? Fixed shelf prices - Qyka still picks and delivers."
              }
              illustration={isLocal ? marketStallArt : shoppingCartArt}
              banner={<ActiveOrderBanner />}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {isLocal ? (
                  <>
                    <StatTile label="Agents on duty" value={activity?.agents_on_duty ?? "-"} />
                    <StatTile label="Open-air markets" value={activity?.active_markets ?? counts.local_market} />
                    <StatTile label="Prices" value="Bargained live" />
                  </>
                ) : (
                  <>
                    <StatTile label="Supermarkets" value={activity?.active_supermarkets ?? counts.supermarket} />
                    <StatTile label="Prices" value="Fixed shelf" />
                    <StatTile label="Delivery" value="By Qyka" />
                  </>
                )}
              </div>
            </HeroBanner>
          </>
        )}

        {/* Mobile-only: list-composer tools / stall-specific chips — desktop
            already has these via the sidebar. */}
        {(inList || browseStall || inVendors) && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {inList
              ? LIST_TOOLS.map((f) => (
                  <Chip key={f.id} size="sm" selected={shop?.listComposerMode === f.id} onClick={() => shop?.setListComposerMode(f.id)}>{f.label}</Chip>
                ))
              : browseStall
                ? stallNavCats.map((c) => (
                    <Chip key={c.id} size="sm" selected={shop?.stallCategory === c.id} onClick={() => shop?.setStallCategory(c.id)}>{c.label}</Chip>
                  ))
                : STALL_TYPE_FILTERS.map((f) => (
                    <Chip key={f.id} size="sm" selected={shop?.stallTypeFilter === f.id} onClick={() => shop?.setStallTypeFilter(f.id)}>{f.label}</Chip>
                  ))}
          </div>
        )}

        {!browseStall && !inList && inVendors && (
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-ink md:text-[1.75rem]">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-muted">{pageSubtitle}</p>
          </div>
        )}

        {body}
      </div>
    </div>
  );
}

export default MarketPicker;
