"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ShopListDraft } from "@/components/shop/ShopContext";
import { useShop } from "@/components/shop/ShopContext";
import {
  bargainMid,
  catalogForStall,
  categoriesForCatalog,
  formatBargainRange,
  stallTypeLabel,
  suggestedForStall,
  type StallCatalogItem,
} from "@/lib/stallCatalog";
import { stallTone } from "@/lib/vendorVisuals";

type Vendor = {
  id: string;
  market_id: string;
  name: string;
  stall_description?: string | null;
};

const COVER: Record<string, string> = {
  produce: "/quika-cat-produce.jpg",
  protein: "/quika-cat-protein.jpg",
  provisions: "/quika-cat-pantry.jpg",
  mixed: "/quika-trust-basket.jpg",
};

function money(n: number) {
  return (Number(n) || 0).toFixed(2);
}

function draftFromCart(qtyById: Record<string, number>, catalog: StallCatalogItem[]): ShopListDraft {
  const rows = catalog
    .filter((it) => (qtyById[it.id] || 0) > 0)
    .map((it) => ({
      item: it.name,
      price: String(bargainMid(it)),
      qty: String(qtyById[it.id]),
      note: it.unit ? `bargain est. / ${it.unit}` : "bargain estimate",
    }));

  const pricedTotal = rows.reduce(
    (sum, r) => sum + (Number(r.price) || 0) * (Number(r.qty) || 0),
    0
  );

  return {
    mode: "detailed",
    rows: rows.length ? rows : [{ item: "", price: "", qty: "1", note: "" }],
    budgetText: "",
    budget: "",
    goodsTotal: pricedTotal,
    pricedTotal,
    unstructuredTotal: 0,
    itemCount: rows.length,
    items: rows.map((r) => ({
      description: r.item.trim(),
      listed_price: money((Number(r.price) || 0) * (Number(r.qty) || 0)),
      quantity: Number(r.qty) || 1,
      requested_note: r.note.trim() || null,
    })),
  };
}

function ItemCard({
  item,
  qty,
  onAdd,
  onDec,
  onInc,
}: {
  item: StallCatalogItem;
  qty: number;
  onAdd: () => void;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-xl">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-[#ebe7e0] bg-[#f0eeeb]">
        <img
          src={item.image}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        {item.featured && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-brand-green px-2 py-1 text-[0.65rem] font-bold text-white shadow-sm">
            Suggested
          </span>
        )}
        {qty === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add ${item.name}`}
            className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl font-light leading-none text-ink shadow-[0_2px_8px_rgba(33,26,20,0.18)] transition hover:scale-105"
          >
            +
          </button>
        ) : (
          <div className="absolute bottom-2.5 right-2.5 flex h-9 items-center gap-0.5 rounded-full bg-white pl-1 pr-1 shadow-[0_2px_8px_rgba(33,26,20,0.18)]">
            <button
              type="button"
              aria-label="Decrease"
              onClick={onDec}
              className="flex h-7 w-7 items-center justify-center rounded-full text-base font-bold text-ink hover:bg-[#f0eeeb]"
            >
              −
            </button>
            <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums text-ink">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase"
              onClick={onInc}
              className="flex h-7 w-7 items-center justify-center rounded-full text-base font-bold text-ink hover:bg-[#f0eeeb]"
            >
              +
            </button>
          </div>
        )}
      </div>
      <h3 className="mt-2.5 truncate text-[0.95rem] font-bold leading-snug text-ink">{item.name}</h3>
      <p className="mt-0.5 text-sm text-[#6b635a]">{formatBargainRange(item)}</p>
    </article>
  );
}

/**
 * Stall detail content. When embedded, parent MarketPicker owns left rail + banner.
 */
function VendorPage({
  vendor,
  market,
  onBack,
  onContinueWithList,
  onCustomList,
  embedded = false,
}: {
  vendor: Vendor;
  market: { name?: string };
  onBack: () => void;
  onContinueWithList: (draft: ShopListDraft) => void;
  onCustomList: () => void;
  embedded?: boolean;
}) {
  const { searchQuery, setSearchQuery, stallCategory, setStallCategory } = useShop();
  const tone = stallTone(vendor.stall_description, vendor.name);
  const catalog = useMemo(
    () => catalogForStall(vendor.stall_description, vendor.name),
    [vendor.stall_description, vendor.name]
  );
  const suggested = useMemo(
    () => suggestedForStall(vendor.stall_description, vendor.name),
    [vendor.stall_description, vendor.name]
  );
  const categories = useMemo(() => categoriesForCatalog(catalog), [catalog]);

  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [localQuery, setLocalQuery] = useState("");
  const carouselRef = useRef<HTMLDivElement>(null);
  const activeCat = stallCategory || "featured";

  useEffect(() => {
    setQtyById({});
    setStallCategory("featured");
    setLocalQuery("");
  }, [vendor.id, setStallCategory]);

  const q = (localQuery || searchQuery).trim().toLowerCase();

  const cartCount = Object.values(qtyById).reduce((a, b) => a + b, 0);
  const cartEstimate = catalog.reduce(
    (sum, it) => sum + bargainMid(it) * (qtyById[it.id] || 0),
    0
  );

  const visible = useMemo(() => {
    let items: StallCatalogItem[];
    if (activeCat === "featured") items = suggested;
    else if (activeCat === "all") items = catalog;
    else items = catalog.filter((it) => it.category === activeCat);
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q));
  }, [activeCat, catalog, suggested, q]);

  const sectionTitle =
    categories.find((c) => c.id === activeCat)?.label ||
    (activeCat === "featured" ? "Suggested" : "Items");

  function setQty(id: string, next: number) {
    setQtyById((cur) => {
      const n = Math.max(0, Math.min(99, next));
      if (n === 0) {
        const { [id]: _, ...rest } = cur;
        return rest;
      }
      return { ...cur, [id]: n };
    });
  }

  function scrollCarousel(dir: -1 | 1) {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 320), behavior: "smooth" });
  }

  return (
    <div className={"relative w-full " + (cartCount > 0 && !embedded ? "pb-28" : "pb-6")}>
      {!embedded && (
        <div className="relative mb-5">
          <div className="relative h-40 overflow-hidden rounded-2xl sm:h-48 md:h-56">
            <img
              src={COVER[tone] || COVER.mixed}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Identity + controls — banner already named the stall when embedded */}
      <div>
        {!embedded && (
          <button
            type="button"
            onClick={onBack}
            className="mb-3 text-sm font-semibold text-[#6b635a] transition hover:text-ink"
          >
            ← Stalls
          </button>
        )}
        {embedded && (
          <button
            type="button"
            onClick={onBack}
            className="mb-3 text-sm font-semibold text-[#6b635a] transition hover:text-ink lg:hidden"
          >
            ← Stalls
          </button>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            {embedded ? (
              <h2 className="font-display text-xl font-extrabold tracking-tight text-ink md:text-2xl">
                Stall catalogue
              </h2>
            ) : (
              <h1 className="shop-title">{vendor.name}</h1>
            )}
            <p className="mt-1.5 text-sm text-[#6b635a]">
              <span className="font-semibold text-ink">{market?.name}</span>
              <span className="mx-1.5 text-[#cfc8be]">·</span>
              {stallTypeLabel(vendor.stall_description, vendor.name)}
              {vendor.stall_description ? (
                <>
                  <span className="mx-1.5 text-[#cfc8be]">·</span>
                  <span>{vendor.stall_description}</span>
                </>
              ) : null}
            </p>
            <p className="mt-2 max-w-2xl text-sm text-[#6b635a]">
              Bargain estimates — your agent negotiates the real price at this stall.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:max-w-md">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8178]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="M20 20l-3-3" />
                </svg>
              </span>
              <input
                value={localQuery}
                onChange={(e) => {
                  setLocalQuery(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                placeholder={`Search in ${vendor.name}`}
                className="shop-input"
                aria-label={`Search in ${vendor.name}`}
              />
            </div>
            {/* Desktop rail already has “Write my own list”; keep a mobile shortcut */}
            <button
              type="button"
              onClick={onCustomList}
              className={
                "inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[#ddd6cb] bg-white px-4 text-sm font-bold text-ink transition hover:bg-[#faf9f7] " +
                (embedded ? "lg:hidden" : "")
              }
            >
              Own list
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-[#ebe7e0] py-3 text-sm text-[#6b635a]">
          <span className="font-semibold text-ink">Soft prefer this stall</span>
          <span className="hidden text-[#cfc8be] sm:inline" aria-hidden>
            |
          </span>
          <span>Agent can still shop the wider market if needed</span>
          <span className="hidden text-[#cfc8be] sm:inline" aria-hidden>
            |
          </span>
          <span>Estimates, not shelf prices</span>
        </div>
      </div>

      {/* Category chips — only when not embedded (shell owns nav) */}
      {!embedded && (
        <div className="sticky top-16 z-20 -mx-4 mt-4 border-b border-[#ebe7e0] bg-white/95 px-4 py-2.5 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setStallCategory(c.id)}
                className={"shop-chip " + (activeCat === c.id ? "shop-chip-active" : "")}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink md:text-2xl">
            {sectionTitle}
          </h2>
          {activeCat === "featured" && visible.length > 4 && (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                aria-label="Scroll left"
                onClick={() => scrollCarousel(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd6cb] bg-white text-ink transition hover:bg-[#faf9f7]"
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
                onClick={() => scrollCarousel(1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd6cb] bg-white text-ink transition hover:bg-[#faf9f7]"
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
          )}
        </div>

        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#8a8178]">
            No items in this category{q ? " match your search" : ""}.
          </p>
        ) : activeCat === "featured" ? (
          <div
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {visible.map((it) => (
              <div key={it.id} className="w-[42%] shrink-0 snap-start sm:w-[30%] md:w-[23%] lg:w-[22%]">
                <ItemCard
                  item={it}
                  qty={qtyById[it.id] || 0}
                  onAdd={() => setQty(it.id, 1)}
                  onDec={() => setQty(it.id, (qtyById[it.id] || 0) - 1)}
                  onInc={() => setQty(it.id, (qtyById[it.id] || 0) + 1)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-5">
            {visible.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                qty={qtyById[it.id] || 0}
                onAdd={() => setQty(it.id, 1)}
                onDec={() => setQty(it.id, (qtyById[it.id] || 0) - 1)}
                onInc={() => setQty(it.id, (qtyById[it.id] || 0) + 1)}
              />
            ))}
          </div>
        )}

        {activeCat === "featured" && !q && (
          <div className="mt-10 space-y-10">
            {categories
              .filter((c) => c.id !== "featured" && c.id !== "all")
              .map((c) => {
                const items = catalog.filter((it) => it.category === c.id);
                if (!items.length) return null;
                return (
                  <section key={c.id}>
                    <button
                      type="button"
                      onClick={() => setStallCategory(c.id)}
                      className="mb-4 flex w-full items-center justify-between text-left"
                    >
                      <h2 className="font-display text-xl font-extrabold tracking-tight text-ink md:text-2xl">
                        {c.label}
                      </h2>
                      <span className="text-sm font-semibold text-brand-orange">See all</span>
                    </button>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-5">
                      {items.slice(0, 4).map((it) => (
                        <ItemCard
                          key={it.id}
                          item={it}
                          qty={qtyById[it.id] || 0}
                          onAdd={() => setQty(it.id, 1)}
                          onDec={() => setQty(it.id, (qtyById[it.id] || 0) - 1)}
                          onInc={() => setQty(it.id, (qtyById[it.id] || 0) + 1)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <div
          className={
            embedded
              ? "sticky bottom-0 z-20 -mx-4 mt-8 border-t border-[#ebe7e0] bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8"
              : "fixed inset-x-0 bottom-0 z-30 border-t border-[#ebe7e0] bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(33,26,20,0.08)] backdrop-blur md:px-6 lg:px-8"
          }
        >
          <div
            className={
              "flex w-full items-center gap-3 " + (embedded ? "" : "mx-auto max-w-3xl")
            }
          >
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#8a8178]">
                Your estimate · {cartCount} item{cartCount === 1 ? "" : "s"}
              </p>
              <p className="truncate font-display text-xl font-extrabold tabular-nums text-ink">
                ₦{cartEstimate.toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onContinueWithList(draftFromCart(qtyById, catalog))}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-brand-orange px-5 text-sm font-bold text-white transition hover:brightness-105"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorPage;
