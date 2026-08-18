"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ShopStep } from "@/lib/guestDraft";
import { rememberVenue } from "./VenuePopover";

export type ShopListDraft = {
  mode: "detailed" | "freetext";
  rows: {
    item: string;
    price: string;
    qty: string;
    note: string;
    // Set when this row was added from a stall's page — a hint the agent
    // tries to honor, not a binding order (see OrderItem.preferred_stall_id).
    stallId?: string;
    stallName?: string;
  }[];
  budgetText: string;
  budget: string;
  goodsTotal: number;
  itemCount: number;
  items: any[];
  pricedTotal: number;
  unstructuredTotal: number;
  // Sum of free-typed lines whose price was auto-extracted (e.g. "Rice
  // 2000") - distinct from unstructuredTotal, which is the manual estimate
  // covering only the lines nothing could be extracted from.
  autoPricedTotal: number;
};

export type ShopVendor = {
  id: string;
  name: string;
  stall_description?: string | null;
};

type StallBrowse = {
  id: string;
  name: string;
  stall_description?: string | null;
};

type ShopContextValue = {
  step: ShopStep;
  setStep: (s: ShopStep) => void;
  market: any | null;
  setMarket: (m: any | null) => void;
  vendor: ShopVendor | null;
  setVendor: (v: ShopVendor | null) => void;
  browseStall: StallBrowse | null;
  setBrowseStall: (v: StallBrowse | null) => void;
  /** Active stall catalogue category id when browsing a stall (Suggested / All / …). */
  stallCategory: string;
  setStallCategory: (id: string) => void;
  /** Stall-type filter on the market vendor grid (all | produce | protein | provisions). */
  stallTypeFilter: string;
  setStallTypeFilter: (id: string) => void;
  /** List composer mode — driven by left rail when embedded in shop shell. */
  listComposerMode: "detailed" | "freetext";
  setListComposerMode: (m: "detailed" | "freetext") => void;
  listDraft: ShopListDraft | null;
  setListDraft: (d: ShopListDraft | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
  markets: any[];
  setMarkets: (m: any[]) => void;
  marketsLoading: boolean;
  setMarketsLoading: (v: boolean) => void;
  pickMarket: (m: any) => void;
  venueOpen: boolean;
  setVenueOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  openVenuePicker: () => void;
  address: string;
  setAddress: (a: string) => void;
  deliveryCoords: { lat: number; lng: number } | null;
  setDeliveryCoords: (c: { lat: number; lng: number } | null) => void;
  openBag: () => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<ShopStep>("market");
  const [market, setMarket] = useState<any | null>(null);
  const [vendor, setVendor] = useState<ShopVendor | null>(null);
  const [browseStall, setBrowseStallState] = useState<StallBrowse | null>(null);
  const [stallCategory, setStallCategory] = useState("featured");
  const [stallTypeFilter, setStallTypeFilter] = useState("all");
  const [listComposerMode, setListComposerMode] = useState<"detailed" | "freetext">("detailed");
  const [listDraft, setListDraft] = useState<ShopListDraft | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bagOpen, setBagOpen] = useState(false);
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [venueOpen, setVenueOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);

  const setBrowseStall = useCallback((v: StallBrowse | null) => {
    setBrowseStallState(v);
    setStallCategory("featured");
    if (!v) setSearchQuery("");
  }, []);

  const openBag = useCallback(() => setBagOpen(true), []);
  const openVenuePicker = useCallback(() => setVenueOpen(true), []);

  const pickMarket = useCallback(
    (m: any) => {
      setMarket((prev: any) => {
        if (prev?.id !== m.id) setVendor(null);
        return m;
      });
      setBrowseStall(null);
      setStallTypeFilter("all");
      setSearchQuery("");
      setVenueOpen(false);
      rememberVenue(m.id);
      // Straight to the list either way — the classic "send someone to the
      // market" flow is list-first, not a catalogue to browse. Local-market
      // customers can still prefer a specific (real, agent-registered)
      // stall per item right there in the list builder.
      setStep("list");
    },
    [setBrowseStall]
  );

  const value = useMemo(
    () => ({
      step,
      setStep,
      market,
      setMarket,
      vendor,
      setVendor,
      browseStall,
      setBrowseStall,
      stallCategory,
      setStallCategory,
      stallTypeFilter,
      setStallTypeFilter,
      listComposerMode,
      setListComposerMode,
      listDraft,
      setListDraft,
      searchQuery,
      setSearchQuery,
      bagOpen,
      setBagOpen,
      markets,
      setMarkets,
      marketsLoading,
      setMarketsLoading,
      pickMarket,
      venueOpen,
      setVenueOpen,
      openVenuePicker,
      address,
      setAddress,
      deliveryCoords,
      setDeliveryCoords,
      openBag,
    }),
    [
      step,
      market,
      vendor,
      browseStall,
      setBrowseStall,
      stallCategory,
      stallTypeFilter,
      listComposerMode,
      listDraft,
      searchQuery,
      bagOpen,
      markets,
      marketsLoading,
      pickMarket,
      venueOpen,
      openVenuePicker,
      address,
      deliveryCoords,
      openBag,
    ]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}

export function useShopOptional() {
  return useContext(ShopContext);
}
