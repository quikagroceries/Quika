"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import EmptyState from "./EmptyState";
import MarketArt from "@/components/shop/MarketArt";
import VendorPage from "@/components/shop/VendorPage";
import { stallTypeLabel } from "@/lib/stallCatalog";
import { stallTone, vendorTags } from "@/lib/vendorVisuals";
import { useShop } from "@/components/shop/ShopContext";
import type { ShopListDraft } from "@/components/shop/ShopContext";

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

/**
 * Stall discovery — 4-up grid after market pick.
 * When embedded, lives inside MarketPicker (left rail + banner stay).
 */
function VendorPicker({
  market,
  onSelectVendor,
  onShopWholeMarket,
  onChangeMarket,
  preferredVendorId,
  onContinueWithSeededList,
  embedded = false,
}: {
  market: any;
  onSelectVendor: (v: Vendor) => void;
  onShopWholeMarket: () => void;
  onChangeMarket: () => void;
  preferredVendorId?: string | null;
  onContinueWithSeededList: (v: Vendor, draft: ShopListDraft) => void;
  embedded?: boolean;
}) {
  const { searchQuery, browseStall, setBrowseStall, stallTypeFilter, setStallTypeFilter } = useShop();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const stallHistoryRef = useRef(false);
  const pendingAfterStallRef = useRef<(() => void) | null>(null);

  const browseVendor = useMemo(() => {
    if (!browseStall) return null;
    return vendors.find((v) => v.id === browseStall.id) || (browseStall as Vendor);
  }, [browseStall, vendors]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    // Keep browseStall when remounting (e.g. back from list → same stall)
    stallHistoryRef.current = false;
    pendingAfterStallRef.current = null;
    api
      .getMarketVendors(market.id)
      .then((rows: Vendor[]) => {
        if (!cancelled) setVendors(rows || []);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || "Could not load stalls");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [market.id]);

  useEffect(() => {
    function onPopState() {
      if (!stallHistoryRef.current) return;
      stallHistoryRef.current = false;
      setBrowseStall(null);
      const next = pendingAfterStallRef.current;
      pendingAfterStallRef.current = null;
      next?.();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setBrowseStall]);

  function openStall(v: Vendor) {
    stallHistoryRef.current = true;
    window.history.pushState({ quikaStall: v.id }, "");
    setBrowseStall(v);
  }

  function closeStall() {
    if (stallHistoryRef.current) {
      window.history.back();
      return;
    }
    setBrowseStall(null);
  }

  function leaveStallThen(next: () => void) {
    if (stallHistoryRef.current) {
      pendingAfterStallRef.current = next;
      window.history.back();
      return;
    }
    setBrowseStall(null);
    next();
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vendors.filter((v) => {
      const tone = stallTone(v.stall_description, v.name);
      if (stallTypeFilter !== "all" && tone !== stallTypeFilter) return false;
      if (!q) return true;
      return [v.name, v.stall_description].some((s) => String(s || "").toLowerCase().includes(q));
    });
  }, [vendors, searchQuery, stallTypeFilter]);

  if (browseVendor) {
    return (
      <VendorPage
        embedded={embedded}
        vendor={browseVendor}
        market={market}
        onBack={closeStall}
        onContinueWithList={(draft) => {
          const v = browseVendor;
          leaveStallThen(() => onContinueWithSeededList(v, draft));
        }}
        onCustomList={() => {
          const v = browseVendor;
          leaveStallThen(() => onSelectVendor(v));
        }}
      />
    );
  }

  const filters = [
    { id: "all", label: "All stalls" },
    { id: "produce", label: "Produce" },
    { id: "protein", label: "Protein" },
    { id: "provisions", label: "Provisions" },
  ];

  return (
    <div className={embedded ? "w-full" : "w-full px-4 py-5 md:px-6 md:py-6 lg:px-8"}>
      {!embedded && (
        <button
          type="button"
          onClick={onChangeMarket}
          className="mb-4 text-sm font-semibold text-[#6b635a] transition hover:text-ink"
        >
          ← Markets
        </button>
      )}

      <div className="mb-5">
        {embedded ? (
          <>
            <p className="shop-label">Stalls</p>
            <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink md:text-2xl">
              Choose a stall
            </h2>
          </>
        ) : (
          <>
            <p className="shop-label">{market.name}</p>
            <h1 className="shop-title mt-1">Choose a stall</h1>
          </>
        )}
        <p className="shop-sub mt-2 max-w-xl">
          {embedded
            ? "Open a stall for suggested picks and a full catalogue — or use the sidebar to shop the whole market."
            : "Browse vendors in a grid — open a stall for suggested picks and a full catalogue, or continue across the whole market."}
        </p>
        {!embedded && (
          <button
            type="button"
            onClick={onShopWholeMarket}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-[#ddd6cb] bg-white px-4 text-sm font-bold text-ink shadow-[0_1px_2px_rgba(33,26,20,0.06)] transition hover:border-brand-orange/40 hover:bg-[#fff8f5]"
          >
            Shop whole market →
          </button>
        )}
      </div>

      {!embedded && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStallTypeFilter(f.id)}
              className={
                "inline-flex shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition " +
                (stallTypeFilter === f.id
                  ? "bg-ink text-white"
                  : "bg-[#f0eeeb] text-ink hover:bg-[#e8e4df]")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i}>
              <div className="aspect-[4/3] animate-pulse rounded-xl bg-[#ece8e2]" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-[#ece8e2]" />
              <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-[#f0eeeb]" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="store"
          title={searchQuery ? "No stalls match" : "No stalls listed yet"}
          subtitle={
            embedded
              ? "Use Shop whole market in the sidebar — your list is enough for the agent."
              : "Shop the whole market instead — your list is enough for the agent."
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {filtered.map((v) => {
            const tone = stallTone(v.stall_description, v.name);
            const tags = vendorTags(v.stall_description);
            const selected = preferredVendorId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => openStall(v)}
                className="group text-left transition duration-200"
              >
                <span
                  className={
                    "relative block overflow-hidden rounded-xl ring-1 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgba(33,26,20,0.1)] " +
                    (selected
                      ? "ring-brand-orange/50"
                      : "ring-[#ebe7e0] group-hover:ring-[#ddd6cb]")
                  }
                >
                  <MarketArt
                    tone={tone}
                    title={v.name}
                    image={COVER[tone] || COVER.mixed}
                    className="aspect-[4/3] w-full"
                  />
                  {selected && (
                    <span className="absolute left-2 top-2 rounded bg-brand-orange px-2 py-1 text-[0.65rem] font-bold text-white">
                      Soft prefer
                    </span>
                  )}
                </span>
                <span className="mt-2 block truncate text-sm font-bold text-ink md:text-[0.95rem]">
                  {v.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[#6b635a]">
                  {stallTypeLabel(v.stall_description, v.name)}
                </span>
                {tags.length > 0 && (
                  <span className="mt-1 block truncate text-[0.7rem] text-[#8a8178]">
                    {tags.join(" · ")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!loading && !embedded && (
        <p className="mt-8 text-center text-sm text-[#8a8178]">
          Not sure which stall?{" "}
          <button
            type="button"
            onClick={onShopWholeMarket}
            className="font-bold text-brand-orange hover:underline"
          >
            Shop the whole market
          </button>
        </p>
      )}
    </div>
  );
}

export default VendorPicker;
