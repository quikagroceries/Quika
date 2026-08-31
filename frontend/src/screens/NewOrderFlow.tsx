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
import ListBuilder from "@/components/ListBuilder";
import { useAuth } from "@/components/AuthProvider";
import { useShop, type ShopListDraft } from "@/components/shop/ShopContext";
import { clearGuestDraft, loadGuestDraft, saveGuestDraft } from "@/lib/guestDraft";
import { matchSlugToApiMarket } from "@/lib/marketDirectory";

// Same dark-banner visual language as the shop shell's ShopHeroBanner
// (MarketPicker.tsx) — kept local and simple (no market image lookup) since
// these two steps are a focused, distraction-free hand-off to payment, not
// part of the browsing shell.
const CHECKOUT_STEPS = ["List", "Delivery", "Quote"] as const;

function CheckoutHero({
  isSuper,
  eyebrow,
  title,
  body,
  step,
}: {
  isSuper: boolean;
  eyebrow: string;
  title: string;
  body: string;
  /** Which of the 3 checkout steps this screen is (1-indexed) — list itself
      never renders this hero, so this only ever shows 2 or 3, but the full
      3-segment track still gives an honest "you're almost there" read. */
  step: 2 | 3;
}) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        {CHECKOUT_STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <span
                className={
                  "h-1 flex-1 rounded-full transition-colors duration-300 " +
                  (done || current ? "bg-brand-orange" : "bg-ink/10")
                }
              />
            </div>
          );
        })}
      </div>
      <div
        className="relative overflow-hidden rounded-2xl px-5 py-6 shadow-md sm:px-7 sm:py-8"
        style={{ backgroundColor: isSuper ? "#1A2E1F" : "#211A14" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">
          Step {step} of 3 · {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/70">{body}</p>
      </div>
    </div>
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
    // "vendors" is a retired step from an older build — coerce any stale
    // stored draft straight to the list rather than a step that no longer exists.
    if (draft.step) setStep(draft.step === "vendors" ? "list" : draft.step);
    if (draft.stagedList) setListDraft(draft.stagedList as ShopListDraft);
    if (draft.address) setAddress(draft.address);
  }, [setStep, setListDraft, setAddress]);

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
        if (!draft.step || draft.step === "market" || draft.step === "vendors") {
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
        if (!draft?.step || draft.step === "market" || draft.step === "vendors") {
          setStep("list");
        }
      }
    }
    setHandoffReady(true);
  }, [markets, marketsLoading, marketSlug, setMarket, setStep]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveGuestDraft({
      marketId: market?.id || null,
      step,
      stagedList: listDraft,
      address,
      marketSlug: marketSlug || null,
    });
  }, [market, step, listDraft, address, marketSlug]);

  useEffect(() => {
    if ((step === "address" || step === "quote") && !stagedList) setStep("list");
  }, [step, stagedList, setStep]);

  // Clear search when leaving the market-browse step
  useEffect(() => {
    if (step !== "market") setSearchQuery("");
  }, [step, setSearchQuery]);

  function handleBackFromList() {
    setBrowseStall(null);
    setStep("market");
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

  if (!market || step === "market" || step === "list") {
    const isSuper = market ? (market.venue_type || "local_market") === "supermarket" : false;
    return (
      <MarketPicker
        markets={markets}
        loading={marketsLoading}
        onSelect={pickMarket}
        onCancel={onCancel}
        title="Which market?"
        subtitle="Choose where your agent shops, then build your list."
        listPanel={
          step === "list" && market ? (
            <div className="w-full min-w-0">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="shop-label">{isSuper ? "Supermarket cart" : "Your list"}</p>
                  <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink md:text-2xl">
                    {isSuper ? "Add items" : "Compose your list"}
                  </h2>
                  {/* Which market this is stays the header's and the hero
                      banner's job — this line explains the PRICING model
                      instead of repeating a name already stated twice above. */}
                  <p className="shop-sub mt-2 max-w-2xl">
                    {isSuper
                      ? "Shelf prices — closer to checkout than open-air bargaining."
                      : "Real prices come from bargaining at the market, not a catalogue."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBackFromList}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[#ddd6cb] bg-white px-4 text-sm font-bold text-ink transition hover:bg-[#faf9f7] lg:hidden"
                >
                  ← Markets
                </button>
              </div>
              <ListBuilder
                embedded
                initial={stagedList}
                marketId={market.id}
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
    const isSuper = (market?.venue_type || "local_market") === "supermarket";
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-8 md:px-6 md:py-12">
        <Button variant="neutral" onClick={() => setStep("list")} className="mb-4">
          ← Edit list
        </Button>
        <CheckoutHero
          isSuper={isSuper}
          eyebrow="Delivery"
          title="Where to?"
          body={`We'll deliver your haul from ${market?.name || "the market"} here.`}
          step={2}
        />

        <Card>
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
  const isSuperQuote = (market.venue_type || "") === "supermarket";

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 md:px-6 md:py-12">
      <Button variant="neutral" onClick={() => setStep("address")} className="mb-4">
        ← Back
      </Button>
      <CheckoutHero
        isSuper={isSuperQuote}
        eyebrow="Estimate"
        title={isSuperQuote ? "Your total" : "Your estimate"}
        body={
          isSuperQuote
            ? `Shelf prices at ${market.name} — closer to a fixed cart than open-air bargaining.`
            : `Not a fixed catalogue total — your agent bargains real prices at ${market.name}.`
        }
        step={3}
      />

      {stagedList.items?.length > 0 && (
        <Card className="mb-4">
          <p className="font-display text-base font-bold text-ink">Your list</p>
          <p className="mb-3 text-xs text-[#8a8178]">What your agent will shop for.</p>
          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {stagedList.items.map((it: any, i: number) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-3 border-b border-[#f0eeeb] pb-1.5 last:border-0 last:pb-0"
              >
                <span className="min-w-0 truncate text-sm text-ink">
                  {it.description}
                  {it.quantity != null && (
                    <span className="ml-1.5 text-xs font-semibold text-[#8a8178]">×{it.quantity}</span>
                  )}
                </span>
                {it.listed_price != null ? (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                    ₦{Number(it.listed_price).toLocaleString()}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-[#8a8178]">from budget</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="border-2 border-brand-orange shadow-lg">
        <div className="space-y-1.5 text-[#6b635a]">
          <div className="flex justify-between">
            <span>Goods estimate</span>
            <span className="font-semibold tabular-nums text-ink">₦{goodsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery quote</span>
            <span className="font-semibold tabular-nums text-ink">₦{DELIVERY_QUOTE.toFixed(2)}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink/40">Service fee calculated when shopping finishes.</p>

        {depositAmount > 0 && (
          <p className="mt-3 mb-3 flex items-start gap-2 rounded-shop bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
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
