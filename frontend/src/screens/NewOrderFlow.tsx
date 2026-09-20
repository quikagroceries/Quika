"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import AuthSheet from "@/components/AuthSheet";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import Input from "@/components/Input";
import MarketPicker from "@/components/MarketPicker";
import ListBuilder from "@/components/ListBuilder";
import { useAuth } from "@/components/AuthProvider";
import { useShop, type ShopListDraft } from "@/components/shop/ShopContext";
import HeroBanner from "@/components/HeroBanner";
import { ActiveOrderBanner } from "@/components/ActiveOrderBanner";
import SectionHeader from "@/components/SectionHeader";
import DeliveryAddressPicker from "@/components/DeliveryAddressPicker";
import FlowSteps, { type FlowStepKey } from "@/components/FlowSteps";
import { clearGuestDraft, loadGuestDraft, saveGuestDraft } from "@/lib/guestDraft";
import { matchSlugToApiMarket } from "@/lib/marketDirectory";
import personShoppingList from "@/assets/illustrations/person-shopping-list.png";
import { SHOP_CHIPS } from "@/lib/heroChips";
import { illustrationForItem } from "@/lib/foodVisuals";

import riderScooter from "@/assets/illustrations/rider-scooter-basket-1.png";
import weighingScale from "@/assets/illustrations/vendor-weighing-scale.png";

function CheckoutHero({
  isSuper,
  eyebrow,
  title,
  body,
  step,
  onStepClick,
  actions,
}: {
  isSuper: boolean;
  eyebrow: string;
  title: string;
  body: string;
  step: 3 | 4;
  onStepClick?: (key: FlowStepKey) => void;
  actions?: React.ReactNode;
}) {
  // The same illustrated HeroBanner Shop/Track/History use, with the step
  // tracker riding in its `leading` slot - this used to be a tinted
  // photo-style card (TONE_COVER bg) with a bare row of progress bars, the
  // one hero in the app not built from the illustration system.
  return (
    <HeroBanner
      compact
      leading={<FlowSteps current={step === 3 ? "address" : "quote"} onStepClick={onStepClick} />}
      eyebrow={`Step ${step} of 4 · ${eyebrow}`}
      title={title}
      body={body}
      illustration={step === 3 ? riderScooter : weighingScale}
      actions={actions}
      banner={<ActiveOrderBanner />}
    />
  );
}

const DELIVERY_QUOTE = 3600;
const COMBINED_FEE_ESTIMATE = 2000;
const DEPOSIT_THRESHOLD = 10000;
const DEPOSIT_RATE = 0.3;

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
    listDraft,
    setListDraft,
    setSearchQuery,
    markets,
    marketsLoading,
    pickMarket,
    address,
    setAddress,
    deliveryCoords,
    setDeliveryCoords,
    setBrowseStall,
  } = useShop();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const pendingPlaceRef = useRef(false);
  const stagedList = listDraft;
  // Read the stored draft ONCE, during the first render - before any effect
  // (including the save effect below) can overwrite it with the not-yet-
  // hydrated in-memory state. Everything that restores from the draft uses
  // this snapshot instead of re-reading localStorage later.
  const [bootDraft] = useState(() => loadGuestDraft());
  // ListBuilder reads `initial` only when it mounts, and reports its own
  // (empty) draft back on mount. If it mounted before the stored draft was
  // restored - which an effect can only do AFTER the first render - it
  // would start empty and (under StrictMode's double-run of mount effects)
  // overwrite the restored list with that empty draft. So it isn't mounted
  // until `hydrated` is true, at which point `stagedList` is already the
  // restored one.
  const [hydrated, setHydrated] = useState(false);
  // True once the saved market has been restored (or found not to exist).
  // The restore happens after the market list loads, so until then "no
  // market" doesn't mean "none chosen" - the flow guard below waits on this.
  const [marketSettled, setMarketSettled] = useState(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const draft = bootDraft;
    if (draft) {
      // A stored "market" step with no list belongs to the old market-first
      // flow - send it to the list.
      if (draft.step) {
        setStep(draft.step === "market" && !draft.stagedList ? "list" : draft.step);
      }
      if (draft.stagedList) {
        setListDraft(draft.stagedList as ShopListDraft);
      }
      if (draft.address) setAddress(draft.address);
      if (draft.deliveryCoords) setDeliveryCoords(draft.deliveryCoords);
    }
    setHydrated(true);
  }, [bootDraft, setStep, setListDraft, setAddress, setDeliveryCoords]);

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
      setMarketSettled(true);
      return;
    }
    // List-first: a market from the draft or a ?market= deep link is only
    // pre-selected — it never advances the step. The customer still lands on
    // the list (or wherever their saved draft left them).
    const draft = bootDraft;
    if (draft?.marketId) {
      const found = markets.find((m: any) => m.id === draft.marketId);
      if (found) {
        setMarket(found);
        setHandoffReady(true);
        setMarketSettled(true);
        return;
      }
    }
    if (marketSlug) {
      const matched = matchSlugToApiMarket(marketSlug, markets);
      if (matched) setMarket(matched);
    }
    setHandoffReady(true);
    setMarketSettled(true);
  }, [markets, marketsLoading, marketSlug, setMarket]);

  useEffect(() => {
    if (!hydrated) return;
    saveGuestDraft({
      marketId: market?.id || null,
      step,
      stagedList: listDraft,
      address,
      deliveryCoords,
      marketSlug: marketSlug || null,
    });
  }, [hydrated, market, step, listDraft, address, deliveryCoords, marketSlug]);

  // Flow guards — can't be past the list without a list, or past the market
  // step without a market.
  useEffect(() => {
    if ((step === "address" || step === "quote") && !stagedList) {
      setStep("list");
    } else if ((step === "address" || step === "quote") && !market && marketSettled) {
      // Wait for the market handoff to finish: the saved market is restored
      // asynchronously once the market list loads, so "no market yet" only
      // means "no market" AFTER that - checking earlier bounced a refresh on
      // the delivery/quote steps back to Choose market.
      setStep("market");
    }
  }, [step, stagedList, market, setStep, marketSettled]);

  // Clear search when leaving the market-browse step
  useEffect(() => {
    if (step !== "market") setSearchQuery("");
  }, [step, setSearchQuery]);

  function handleListContinue(payload: ShopListDraft) {
    setListDraft(payload);
    setBrowseStall(null);
    setStep(market ? "address" : "market");
  }

  function summarize(list: ShopListDraft) {
    const lines = list.items.map((it: any, i: number) => {
      const qty = it.quantity ? ` x${it.quantity}` : "";
      const price = it.listed_price != null ? ` — ₦${it.listed_price}${qty}` : "";
      return `${i + 1}. ${it.description}${price}`;
    });
    return ["Market list", ...lines].join("\n");
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
        dropoff_latitude: deliveryCoords?.lat ?? null,
        dropoff_longitude: deliveryCoords?.lng ?? null,
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

  const isSuper = market ? (market.venue_type || "local_market") === "supermarket" : false;

  // "Your list · N items · edit" - the same standing reminder (and way back to
  // the list) in the hero of every step after the first, instead of a
  // different back-button on each page.
  const listChip = (
    <button
      type="button"
      onClick={() => setStep("list")}
      className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-sunken-2"
    >
      <Icon name="basket" className="h-3.5 w-3.5 text-brand-orange-dark" />
      Your list · {stagedList?.itemCount ?? 0} item
      {(stagedList?.itemCount ?? 0) === 1 ? "" : "s"}
      <span className="font-semibold text-faint">· edit</span>
    </button>
  );

  // Step 1 — compose the list. The landing screen. No market required yet.
  if (step === "list") {
    return (
      <div className="w-full px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <HeroBanner
          leading={<FlowSteps current="list" />}
          eyebrow={isSuper ? "Step 1 of 4 · Supermarket cart" : "Step 1 of 4 · Your list"}
          title={isSuper ? "Add your items" : "What do you need from the market?"}
          body={
            "Write it the way you'd tell someone — the item, and roughly what you expect to pay." +
            (market ? "" : " You'll choose the market next.")
          }
          illustration={personShoppingList}
          banner={<ActiveOrderBanner />}
          actions={
            market ? (
              <button
                type="button"
                onClick={() => setStep("market")}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-sunken-2"
              >
                <Icon name="pin" className="h-3.5 w-3.5 text-muted" />
                Shopping at {market.name}
                <span className="font-semibold text-faint">· change</span>
              </button>
            ) : undefined
          }
          chips={SHOP_CHIPS}
        />
        {hydrated && (
          <ListBuilder
            standalone
            initial={stagedList}
            marketId={market?.id}
            marketName={market?.name}
            pricingMode={isSuper ? "fixed" : "estimate"}
            onContinue={handleListContinue}
            onDraftChange={setListDraft}
          />
        )}
      </div>
    );
  }

  // Step 2 — choose where the agent shops the (already composed) list.
  if (step === "market") {
    return (
      <div className="flex w-full flex-col">
        <MarketPicker
          flowSteps={<FlowSteps current="market" onStepClick={(key) => setStep(key)} />}
          heroActions={listChip}
          markets={markets}
          loading={marketsLoading}
          onSelect={pickMarket}
          onCancel={onCancel}
          title="Which market?"
          subtitle="Where should your agent shop your list?"
        />
      </div>
    );
  }

  if (step === "address") {
    if (!stagedList) {
      return <div className="flex min-h-[30vh] items-center justify-center text-ink/50">Loading list…</div>;
    }
    const savedAddress = user?.default_delivery_address;
    return (
      <div className="w-full px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <CheckoutHero
          isSuper={isSuper}
          eyebrow="Delivery"
          title="Where to?"
          body={`We'll deliver your haul from ${market?.name || "the market"} here.`}
          step={3}
          onStepClick={(key) => setStep(key)}
          actions={listChip}
        />

        <DeliveryAddressPicker
          address={address}
          setAddress={setAddress}
          coords={deliveryCoords}
          setCoords={setDeliveryCoords}
          savedAddress={savedAddress}
          market={
            market?.latitude != null && market?.longitude != null
              ? { lat: market.latitude, lng: market.longitude, name: market.name }
              : null
          }
          onContinue={() => setStep("quote")}
        />
      </div>
    );
  }

  if (!market || !stagedList) {
    // Guard effect will redirect on the next tick.
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-ink/50">Loading…</div>
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
  const isSuperQuote = (market.venue_type || "") === "supermarket";

  return (
    <div className="w-full px-4 py-6 md:px-6 md:py-8 lg:px-8">
      <CheckoutHero
        isSuper={isSuperQuote}
        eyebrow="Estimate"
        title={isSuperQuote ? "Your total" : "Your estimate"}
        body={
          isSuperQuote
            ? `Shelf prices at ${market.name} — closer to a fixed cart than open-air bargaining.`
            : `Not a fixed catalogue total — your agent bargains real prices at ${market.name}.`
        }
        step={4}
        onStepClick={(key) => setStep(key)}
        actions={listChip}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6">
        {stagedList.items?.length > 0 && (
          <Card className="p-0">
            <div className="p-5 pb-3">
              <SectionHeader icon="basket" title="Your list" subtitle="What your agent will shop for." />
            </div>
            {/* Paper list, like the live shopping feed - dashed rules, no bars. */}
            <div className="max-h-[28rem] divide-y divide-dashed divide-line-strong overflow-y-auto border-t border-dashed border-line-strong">
              {stagedList.items.map((it: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sunken-2 p-1">
                      <Image src={illustrationForItem(it.description)} alt="" className="h-full w-full object-contain" />
                    </div>
                    <span className="min-w-0 truncate text-sm font-semibold text-ink">
                      {it.description}
                      {it.quantity != null && (
                        <span className="ml-1.5 text-xs font-semibold text-faint">×{it.quantity}</span>
                      )}
                    </span>
                  </div>
                  {it.listed_price != null ? (
                    <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                      ₦{Number(it.listed_price).toLocaleString()}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-semibold text-faint">from budget</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="lg:sticky lg:top-24">
          <SectionHeader icon="chart" title="Estimate" className="mb-3" />
          <div className="space-y-1.5 text-muted">
            <div className="flex justify-between">
              <span>Goods estimate</span>
              <span className="font-semibold tabular-nums text-ink">₦{goodsTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery quote</span>
              <span className="font-semibold tabular-nums text-ink">₦{DELIVERY_QUOTE.toFixed(2)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-faint">Service fee calculated when shopping finishes.</p>

          {depositAmount > 0 && (
            <div className="mb-3 mt-3 flex items-start gap-2.5 rounded-2xl bg-brand-orange/[0.12] px-3 py-3 text-sm text-ink/80">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[#1A1A1A]">
                <Icon name="alert" className="h-3.5 w-3.5" />
              </span>
              <span>
                {mustPrepay ? (
                  <>
                    Because a previous order wasn&apos;t paid, this order requires full payment upfront —
                    ₦{depositAmount.toFixed(2)}.
                  </>
                ) : (
                  <>
                    This estimate is over ₦10,000 — a 30% deposit (₦{depositAmount.toFixed(2)}) will be
                    required before shopping can start.
                  </>
                )}
              </span>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <Button onClick={handleGetQuote} busy={busy} fullWidth className="mt-3 text-lg">
            Get My Quote
          </Button>
          {!token && (
            <p className="mt-3 text-center text-xs text-faint">
              Phone sign-in starts here — only when real money enters the flow.
            </p>
          )}
        </Card>
      </div>

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
