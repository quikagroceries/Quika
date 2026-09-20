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
// List-first flow: List → Market → Delivery → Quote. The list and market
// steps don't render this hero, so `step` here is only ever 3 or 4, but the
// full 4-segment track still gives an honest "you're almost there" read.
const CHECKOUT_STEPS = ["List", "Market", "Delivery", "Quote"] as const;

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
  step: 3 | 4;
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
          Step {step} of 4 · {eyebrow}
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
    // loadGuestDraft already normalizes legacy steps; additionally, a stored
    // "market" step with no list belongs to the old market-first flow —
    // send it to the list.
    if (draft.step) {
      setStep(draft.step === "market" && !draft.stagedList ? "list" : draft.step);
    }
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
    // List-first: a market from the draft or a ?market= deep link is only
    // pre-selected — it never advances the step. The customer still lands on
    // the list (or wherever their saved draft left them).
    const draft = loadGuestDraft();
    if (draft?.marketId) {
      const found = markets.find((m: any) => m.id === draft.marketId);
      if (found) {
        setMarket(found);
        setHandoffReady(true);
        return;
      }
    }
    if (marketSlug) {
      const matched = matchSlugToApiMarket(marketSlug, markets);
      if (matched) setMarket(matched);
    }
    setHandoffReady(true);
  }, [markets, marketsLoading, marketSlug, setMarket]);

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

  // Flow guards — can't be past the list without a list, or past the market
  // step without a market.
  useEffect(() => {
    if ((step === "address" || step === "quote") && !stagedList) {
      setStep("list");
    } else if ((step === "address" || step === "quote") && !market) {
      setStep("market");
    }
  }, [step, stagedList, market, setStep]);

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

  // Step 1 — compose the list. The landing screen. No market required yet.
  if (step === "list") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-12 lg:px-8">
        <div className="mb-6">
          <p className="shop-label">{isSuper ? "Supermarket cart" : "Step 1 · Your list"}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
            {isSuper ? "Add your items" : "What do you need from the market?"}
          </h1>
          <p className="shop-sub mt-2 max-w-xl">
            Write it the way you&apos;d tell someone — the item, and roughly what you expect to pay.
            {market ? "" : " You&apos;ll choose the market next."}
          </p>
          {market && (
            <button
              type="button"
              onClick={() => setStep("market")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#ddd6cb] bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-[#faf9f7]"
            >
              <Icon name="pin" className="h-3.5 w-3.5 text-brand-green" />
              Shopping at {market.name}
              <span className="font-semibold text-[#8a8178]">· change</span>
            </button>
          )}
        </div>
        <ListBuilder
          standalone
          initial={stagedList}
          marketId={market?.id}
          marketName={market?.name}
          pricingMode={isSuper ? "fixed" : "estimate"}
          onContinue={handleListContinue}
          onDraftChange={setListDraft}
        />
      </div>
    );
  }

  // Step 2 — choose where the agent shops the (already composed) list.
  if (step === "market") {
    return (
      <div className="flex w-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe7e0] px-4 py-3 md:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setStep("list")}
            className="inline-flex items-center gap-2 text-sm font-bold text-ink transition hover:text-brand-orange"
          >
            <span aria-hidden>←</span>
            Your list · {stagedList?.itemCount ?? 0} item
            {(stagedList?.itemCount ?? 0) === 1 ? "" : "s"}
          </button>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a8178]">
            Step 2 · Choose market
          </span>
        </div>
        <MarketPicker
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
      <div className="mx-auto w-full max-w-lg px-4 py-8 md:px-6 md:py-12">
        <Button variant="neutral" onClick={() => setStep("list")} className="mb-4">
          ← Edit list
        </Button>
        <CheckoutHero
          isSuper={isSuper}
          eyebrow="Delivery"
          title="Where to?"
          body={`We'll deliver your haul from ${market?.name || "the market"} here.`}
          step={3}
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
        step={4}
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
                  This estimate is over ₦30,000 — a 20% deposit (₦{depositAmount.toFixed(2)}) will be
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
