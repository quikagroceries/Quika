"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import AuthSheet from "@/components/AuthSheet";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import Input from "@/components/Input";
import MarketPicker from "@/components/MarketPicker";
import VendorPicker from "@/components/VendorPicker";
import ListBuilder from "@/components/ListBuilder";
import { useAuth } from "@/components/AuthProvider";
import { useShop, type ShopListDraft } from "@/components/shop/ShopContext";
import { clearGuestDraft, loadGuestDraft, saveGuestDraft } from "@/lib/guestDraft";
import { matchSlugToApiMarket } from "@/lib/marketDirectory";

const DELIVERY_QUOTE = 3600;
const COMBINED_FEE_ESTIMATE = 2000;
const DEPOSIT_THRESHOLD = 30000;
const DEPOSIT_RATE = 0.2;

function NewOrderFlow({ user, onCancel, onOrderPlaced }: any) {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const marketSlug = searchParams.get("market");
  const hydratedRef = useRef(false);
  const [handoffReady, setHandoffReady] = useState(!marketSlug);

  const {
    step,
    setStep,
    market,
    setMarket,
    vendor,
    setVendor,
    listDraft,
    setListDraft,
    setSearchQuery,
    markets,
    marketsLoading,
    pickMarket,
    address,
    setAddress,
    setBrowseStall,
  } = useShop();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const pendingPlaceRef = useRef(false);
  const stagedList = listDraft;

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const draft = loadGuestDraft();
    if (!draft) return;
    if (draft.step) setStep(draft.step);
    if (draft.stagedList) setListDraft(draft.stagedList as ShopListDraft);
    if (draft.address) setAddress(draft.address);
    if (draft.vendorId && draft.vendorName) {
      setVendor({ id: draft.vendorId, name: draft.vendorName });
    }
  }, [setStep, setListDraft, setVendor, setAddress]);

  useEffect(() => {
    if (user?.default_delivery_address && !address.trim()) {
      setAddress(user.default_delivery_address);
    }
  }, [user?.default_delivery_address]); // eslint-disable-line react-hooks/exhaustive-deps

  // Landing handoff / draft restore
  useEffect(() => {
    if (marketsLoading) return;
    if (!markets?.length) {
      setHandoffReady(true);
      return;
    }
    const draft = loadGuestDraft();
    if (draft?.marketId) {
      const found = markets.find((m: any) => m.id === draft.marketId);
      if (found) {
        setMarket(found);
        const isSuper = (found.venue_type || "local_market") === "supermarket";
        if (!draft.step || draft.step === "market") {
          setStep(isSuper ? "list" : "vendors");
        } else if (draft.step === "vendors" && isSuper) {
          setStep("list");
        }
        setHandoffReady(true);
        return;
      }
    }
    if (marketSlug) {
      const matched = matchSlugToApiMarket(marketSlug, markets);
      if (matched) {
        setMarket(matched);
        const isSuper = (matched.venue_type || "local_market") === "supermarket";
        if (!draft?.step || draft.step === "market") {
          setStep(isSuper ? "list" : "vendors");
        }
      }
    }
    setHandoffReady(true);
  }, [markets, marketsLoading, marketSlug, setMarket, setStep]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveGuestDraft({
      marketId: market?.id || null,
      vendorId: vendor?.id || null,
      vendorName: vendor?.name || null,
      step,
      stagedList: listDraft,
      address,
      marketSlug: marketSlug || null,
    });
  }, [market, vendor, step, listDraft, address, marketSlug]);

  useEffect(() => {
    if (step === "vendors" && market && (market.venue_type || "") === "supermarket") {
      setStep("list");
    }
  }, [step, market, setStep]);

  useEffect(() => {
    if ((step === "address" || step === "quote") && !stagedList) setStep("list");
  }, [step, stagedList, setStep]);

  // Clear search when leaving browse steps
  useEffect(() => {
    if (step !== "market" && step !== "vendors") setSearchQuery("");
  }, [step, setSearchQuery]);

  function handleSelectVendor(v: {
    id: string;
    name: string;
    stall_description?: string | null;
  }) {
    setBrowseStall(null);
    setVendor(v);
    setStep("list");
  }

  function handleContinueWithSeededList(
    v: { id: string; name: string; stall_description?: string | null },
    draft: ShopListDraft
  ) {
    setBrowseStall(null);
    setVendor(v);
    setListDraft(draft);
    setStep("list");
  }

  function handleShopWholeMarket() {
    setBrowseStall(null);
    setVendor(null);
    setStep("list");
  }

  function handleBackToMarkets() {
    setBrowseStall(null);
    setStep("market");
  }

  function handleBackFromList() {
    const isSuper = (market?.venue_type || "local_market") === "supermarket";
    if (isSuper) {
      setBrowseStall(null);
      setStep("market");
      return;
    }
    // Came from a stall → reopen that stall; whole-market list → stall grid
    if (vendor) {
      setBrowseStall({
        id: vendor.id,
        name: vendor.name,
        stall_description: vendor.stall_description ?? null,
      });
      setStep("vendors");
      return;
    }
    setBrowseStall(null);
    setStep("vendors");
  }

  function handleListContinue(payload: ShopListDraft) {
    setListDraft(payload);
    setStep("address");
  }

  function summarize(list: ShopListDraft) {
    const lines = list.items.map((it: any, i: number) => {
      const qty = it.quantity ? ` x${it.quantity}` : "";
      const price = it.listed_price != null ? ` — ₦${it.listed_price}${qty}` : "";
      return `${i + 1}. ${it.description}${price}`;
    });
    const header = vendor
      ? `Market list · prefer ${vendor.name}`
      : "Market list · whole market";
    return [header, ...lines].join("\n");
  }

  async function placeOrderNow() {
    setError("");
    setBusy(true);
    let created;
    try {
      created = await api.createOrder({
        market_id: market.id,
        delivery_address: address,
        listed_items_total: stagedList!.unstructuredTotal,
        items: stagedList!.items,
      });
    } catch (e: any) {
      setError("Could not get quote: " + e.message);
      setBusy(false);
      pendingPlaceRef.current = false;
      return;
    }
    try {
      await api.sendMessage(created.id, { text: summarize(stagedList!) });
    } catch {
      // ignore
    }
    clearGuestDraft();
    pendingPlaceRef.current = false;
    onOrderPlaced(created.id);
  }

  async function handleGetQuote() {
    if (!token) {
      pendingPlaceRef.current = true;
      setAuthOpen(true);
      return;
    }
    await placeOrderNow();
  }

  async function handleAuthSuccess() {
    setAuthOpen(false);
    if (pendingPlaceRef.current) await placeOrderNow();
  }

  const awaitingHandoff = Boolean(marketSlug) && !market && !handoffReady;

  if (awaitingHandoff) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink/50">
        <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p>Opening your market…</p>
      </div>
    );
  }

  if (!market || step === "market" || step === "vendors" || step === "list") {
    const isSuper = market ? (market.venue_type || "local_market") === "supermarket" : false;
    return (
      <MarketPicker
        markets={markets}
        loading={marketsLoading}
        onSelect={pickMarket}
        onCancel={onCancel}
        title="Which market?"
        subtitle="Choose where your agent shops. Then pick a stall or shop the whole market."
        vendorsPanel={
          step === "vendors" && market ? (
            <VendorPicker
              embedded
              market={market}
              preferredVendorId={vendor?.id}
              onSelectVendor={handleSelectVendor}
              onShopWholeMarket={handleShopWholeMarket}
              onChangeMarket={handleBackToMarkets}
              onContinueWithSeededList={handleContinueWithSeededList}
            />
          ) : null
        }
        listPanel={
          step === "list" && market ? (
            <div className="w-full min-w-0">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="shop-label">{isSuper ? "Supermarket cart" : "Your list"}</p>
                  <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink md:text-2xl">
                    {isSuper ? "Add items" : "Compose your list"}
                  </h2>
                  <p className="shop-sub mt-2 max-w-2xl">
                    {isSuper ? (
                      <>
                        Fixed prices at <span className="font-semibold text-ink">{market.name}</span>.
                      </>
                    ) : (
                      <>
                        Estimates for {market.name}
                        {vendor ? (
                          <>
                            {" "}
                            · soft prefer <span className="font-semibold text-ink">{vendor.name}</span>
                          </>
                        ) : null}
                        .
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBackFromList}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[#ddd6cb] bg-white px-4 text-sm font-bold text-ink transition hover:bg-[#faf9f7] lg:hidden"
                >
                  ←{" "}
                  {isSuper
                    ? "Markets"
                    : vendor
                      ? vendor.name
                      : "Stalls"}
                </button>
              </div>
              <ListBuilder
                embedded
                initial={stagedList}
                marketName={market.name}
                pricingMode={isSuper ? "fixed" : "estimate"}
                onContinue={handleListContinue}
                onDraftChange={setListDraft}
              />
            </div>
          ) : null
        }
      />
    );
  }

  if (step === "address") {
    if (!stagedList) {
      return <div className="flex min-h-[30vh] items-center justify-center text-ink/50">Loading list…</div>;
    }
    const savedAddress = user?.default_delivery_address;
    return (
      <div className="w-full max-w-md px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <Button variant="neutral" onClick={() => setStep("list")} className="mb-4">
          ← Edit list
        </Button>
        <p className="shop-label">Delivery</p>
        <h1 className="shop-title mt-1">Where to?</h1>
        <p className="shop-sub mt-2 mb-6">Where should we deliver your haul?</p>

        <Card className="rounded-2xl border border-[#ebe7e0] bg-white shadow-none">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Icon name="pin" className="h-4 w-4 text-brand-orange" />
              Delivery address
            </span>
            <Input
              placeholder="e.g. 12 Allen Avenue, Ikeja — a landmark helps"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          {savedAddress && address.trim() !== savedAddress && (
            <button
              type="button"
              onClick={() => setAddress(savedAddress)}
              className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand-orange hover:underline"
            >
              <Icon name="pin" className="h-3.5 w-3.5" />
              Use saved address: {savedAddress}
            </button>
          )}

          <Button onClick={() => setStep("quote")} disabled={!address.trim()} fullWidth className="mt-4">
            Continue to quote
          </Button>
        </Card>
      </div>
    );
  }

  if (!market || !stagedList) {
    return (
      <MarketPicker
        markets={markets}
        loading={marketsLoading}
        onSelect={pickMarket}
        onCancel={onCancel}
      />
    );
  }

  const goodsTotal = Number(stagedList.goodsTotal);
  const estimatedValue = goodsTotal + DELIVERY_QUOTE + COMBINED_FEE_ESTIMATE;
  const mustPrepay = !!user?.must_prepay;
  const depositAmount = mustPrepay
    ? estimatedValue
    : estimatedValue > DEPOSIT_THRESHOLD
      ? goodsTotal * DEPOSIT_RATE
      : 0;

  return (
    <div className="w-full max-w-md px-4 py-6 md:px-6 md:py-8 lg:px-8">
      <Button variant="neutral" onClick={() => setStep("address")} className="mb-4">
        ← Back
      </Button>
      <p className="shop-label">Estimate</p>
      <h1 className="shop-title mt-1">
        {(market.venue_type || "") === "supermarket" ? "Your total" : "Your estimate"}
      </h1>
      <p className="shop-sub mt-2 mb-6">
        {(market.venue_type || "") === "supermarket"
          ? `Shelf prices at ${market.name} — closer to a fixed cart than open-air bargaining.`
          : `Not a fixed catalogue total — your agent bargains real prices at ${market.name}.`}
      </p>

      <Card className="rounded-2xl border-2 border-brand-orange bg-white shadow-none">
        <div className="space-y-1 text-[#6b635a]">
          <div className="flex justify-between">
            <span>Goods estimate</span>
            <span className="font-semibold">₦{goodsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery quote</span>
            <span className="font-semibold">₦{DELIVERY_QUOTE.toFixed(2)}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink/40">Service fee calculated when shopping finishes.</p>

        {depositAmount > 0 && (
          <p className="mt-3 mb-3 rounded-shop bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {mustPrepay ? (
              <>
                Because a previous order wasn&apos;t paid, this order requires full payment upfront —
                ₦{depositAmount.toFixed(2)}.
              </>
            ) : (
              <>
                This estimate is over ₦30,000 — a 20% deposit (₦{depositAmount.toFixed(2)}) will be
                required before shopping can start.
              </>
            )}
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-shop bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <Button onClick={handleGetQuote} busy={busy} fullWidth className="mt-3 text-lg">
          Get My Quote
        </Button>
        {!token && (
          <p className="mt-3 text-center text-xs text-ink/40">
            Phone sign-in starts here — only when real money enters the flow.
          </p>
        )}
      </Card>

      <AuthSheet
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          pendingPlaceRef.current = false;
        }}
        onSuccess={handleAuthSuccess}
        title="Sign in to get your quote"
        subtitle="Your list is saved. We only ask for your phone when money is involved."
      />
    </div>
  );
}

export default NewOrderFlow;
