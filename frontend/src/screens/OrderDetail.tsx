'use client';

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import ChatPanel from "@/screens/ChatPanel";
import DeliveryTracking from "@/screens/DeliveryTracking";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import PurchaseChecklist from "@/components/PurchaseChecklist";
import ShoppingFeed from "@/components/ShoppingFeed";
import StatusBadge from "@/components/StatusBadge";
import PaymentChooser from "@/components/PaymentChooser";
import StarRating from "@/components/StarRating";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import HeroBanner from "@/components/HeroBanner";
import Avatar from "@/components/Avatar";
import SectionHeader from "@/components/SectionHeader";
import MarketArt from "@/components/shop/MarketArt";
import agentCustomerConversation from "@/assets/illustrations/agent-customer-conversation.png";
import personShoppingList from "@/assets/illustrations/person-shopping-list.png";
import riderScooter from "@/assets/illustrations/rider-scooter-basket-2.png";
import orderHandoff from "@/assets/illustrations/order-handoff-vendor-customer.png";
import { isChatAvailable, isExceptionOrder, isRateable, summarizeOrderStatus } from "@/lib/orderStatus";
import { marketTone, TONE_COVER } from "@/lib/vendorVisuals";
import { coverImageForMarket } from "@/lib/marketDirectory";
import { illustrationForItem } from "@/lib/foodVisuals";

const POLL_MS = 5000;

// Mirrors app/orders/fees.py's flat placeholders (DELIVERY_FEE_FLAT,
// COMBINED_BASE_FEE) - same constants already duplicated in NewOrderFlow.jsx
// for the same reason: pre-shopping, the API only returns the single
// combined estimated_value, not a delivery/fee split, so these let the
// pre-shopping estimate card below show a believable breakdown.
const DELIVERY_QUOTE = 3600;
const COMBINED_FEE_ESTIMATE = 2000;

// Statuses before finish_shopping has ever run - items_total/combined_fee/
// delivery_fee/grand_total are all still their unset 0.00 defaults, so the
// "final bill" card would be actively misleading (₦0.00 everywhere, and
// amount_due would even go negative once a deposit's been paid against a
// grand_total that's still zero). Show the pre-shopping estimate instead.
const UNPRICED_STATUSES = new Set(["draft", "proposed", "agent_assigned", "shopping"]);

// "Post-payment" per the user's own spec - PAID and every status after it,
// not merely post-shopping (which already includes awaiting_payment, where
// nothing's been bought-for-real yet either). Also exactly the range the
// status/tracking screen covers - packaging starts the moment it's paid, so
// there's no gap where the customer is left without a status screen.
const PAID_OR_LATER = new Set(["paid", "packed", "out_for_delivery", "delivered", "closed"]);


// On return from a Paystack redirect, the URL carries one of these,
// depending on which payment moment sent the customer there.
function pendingCheckoutRef() {
  const params = new URLSearchParams(window.location.search);
  const balance = params.get("order_ref");
  const deposit = params.get("order_deposit_ref");
  return balance ? { kind: "balance", reference: balance } : deposit ? { kind: "deposit", reference: deposit } : null;
}

function OrderDetail({ orderId, onBack, onTopUpWallet }: any) {
  const [order, setOrder] = useState<any>(null);
  // The order itself only carries market_id - this resolves it to the full
  // market row (name, city, venue_type) so the header can lead with the
  // market's identity the same way Shop's own cards do, instead of a bare
  // order id. Best-effort: a failed lookup just falls back to the id.
  const [market, setMarket] = useState<any>(null);
  const [authorization, setAuthorization] = useState<any>(null);
  // An unread overage_approval notification for THIS order, if any - drives
  // the persistent alert state below so a dismissed/missed toast still
  // leaves a clear "your agent needs approval" signal on the order itself.
  const [pendingOverage, setPendingOverage] = useState<any>(null);
  const [raiseAmount, setRaiseAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [walletBalance, setWalletBalance] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  // Propose->accept assignment: who's currently proposed, and the message
  // from the last "see another" outcome (only-option / nobody-left), which
  // needs to persist on screen rather than flash-and-vanish like a toast.
  const [proposedAgent, setProposedAgent] = useState<any>(null);
  // The agent actually shopping this order (name + photo), for the hero chip.
  const [assignedAgent, setAssignedAgent] = useState<any>(null);
  const assignedAgentIdRef = useRef<string | null>(null);
  const [assignmentNotice, setAssignmentNotice] = useState("");
  // #7: agent rating - `rating` is the already-submitted one (if any), null
  // while none exists yet. draftStars/draftComment hold the in-progress form.
  const [rating, setRating] = useState<any>(null);
  const [draftStars, setDraftStars] = useState(0);
  const [draftComment, setDraftComment] = useState("");
  // Dismissing the rating pop-up (without submitting) just closes it for
  // this viewing - it isn't persisted, so reopening the order later will
  // prompt again as long as it's still unrated. Never true once a real
  // rating exists (handleSubmitRating below never needs to touch this).
  const [ratingPromptDismissed, setRatingPromptDismissed] = useState(false);
  // Lazy init from the URL - true only when we've just landed back from
  // Paystack for THIS payment, so the effect below has something to verify.
  const [verifyingPayment, setVerifyingPayment] = useState(() => pendingCheckoutRef() !== null);
  const loadedRef = useRef(false); // has the FIRST load ever succeeded?

  // While shopping is in progress there's a live spending cap to show.
  async function loadAuthorization() {
    try {
      setAuthorization(await api.getAuthorization(orderId));
    } catch {
      setAuthorization(null);
    }
  }

  // Vendor transfers carry the purchase photos. Polled while shopping so the
  // live feed's photos appear as the agent attaches them, not only post-pay.
  async function loadPurchases() {
    try {
      setPurchases(await api.getPurchases(orderId));
    } catch {
      // best-effort — keep whatever's already shown on a transient failure
    }
  }

  // Who's currently proposed, while the order is awaiting the customer's
  // accept/see-another decision.
  async function loadProposedAgent() {
    try {
      setProposedAgent(await api.getProposedAgent(orderId));
    } catch {
      setProposedAgent(null);
    }
  }

  // Mirrors Notifications.jsx's toast filter (unread overage_approval), just
  // scoped to this order and persisted on the card instead of a dismissable
  // pop-up - see the comment on pendingOverage above.
  async function loadPendingOverage() {
    try {
      const notes = await api.getNotifications();
      const match = notes.find(
        (n) => !n.is_read && n.kind === "overage_approval" && n.order_id === orderId
      );
      setPendingOverage(match || null);
    } catch {
      // best-effort - don't blank out an already-shown alert on a transient failure
    }
  }

  // #7: whether this order already has a rating - null means "not yet rated".
  async function loadRating() {
    try {
      setRating(await api.getRating(orderId));
    } catch {
      setRating(null);
    }
  }

  // Reload the order (and authorization, if relevant) from the server. Used
  // both for the initial load and for periodic polling below, so changes the
  // OTHER participant makes (agent/customer) show up here without a manual
  // reload - never throws: a background poll failing shouldn't blank out an
  // already-working screen, so a load failure only surfaces if nothing has
  // ever loaded successfully yet.
  async function refresh() {
    try {
      const fresh = await api.getOrder(orderId);
      setOrder(fresh);
      loadedRef.current = true;
      setError("");
      if (fresh.status === "shopping") {
        await loadAuthorization();
        await loadPendingOverage();
      }
      if (fresh.status === "shopping" || fresh.status === "awaiting_payment") {
        await loadPurchases();
      }
      if (fresh.status === "proposed") {
        await loadProposedAgent();
      }
      // Fetch the assigned agent once per agent (not every 5s poll); a
      // re-assignment changes agent_id and refetches.
      if (fresh.agent_id && assignedAgentIdRef.current !== fresh.agent_id) {
        assignedAgentIdRef.current = fresh.agent_id;
        api.getOrderAgent(orderId).then(setAssignedAgent).catch(() => {});
      } else if (!fresh.agent_id && assignedAgentIdRef.current) {
        assignedAgentIdRef.current = null;
        setAssignedAgent(null);
      }
      if (isRateable(fresh.status)) {
        await loadRating();
      }
    } catch {
      if (!loadedRef.current) setError("Could not load the order.");
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one interval per orderId, matches Chat.jsx's poll pattern
  }, [orderId]);

  useEffect(() => {
    api.getWalletBalance().then((d) => setWalletBalance(d.balance)).catch(() => {});
  }, []);

  // Market never changes for a given order, so this only needs to run once
  // it's known (not on every poll tick).
  useEffect(() => {
    if (!order?.market_id) return;
    api
      .getMarkets()
      .then((list: any[]) => setMarket(list.find((m) => m.id === order.market_id) || null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when the order's market changes
  }, [order?.market_id]);

  // Purchase photos never change once shopping's finished, so this only
  // needs to run once the order first reaches PAID (not on every poll tick).
  useEffect(() => {
    if (!order || !PAID_OR_LATER.has(order.status)) return;
    api.getPurchases(orderId).then(setPurchases).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when status crosses into paid-or-later
  }, [orderId, order?.status]);

  // On return from a Paystack redirect (either payment moment), reconcile
  // right away instead of waiting on a webhook that may never reach a local
  // dev server and can lag even in production - same reasoning as Wallet.jsx's
  // ?funded= handling, just keyed to whichever of the two references is in
  // the URL. Runs once, for the specific payment this screen was reopened for.
  useEffect(() => {
    const pending = pendingCheckoutRef();
    if (!pending) return;
    const verify = pending.kind === "deposit"
      ? api.verifyDepositCheckout(orderId, pending.reference)
      : api.verifyBalanceCheckout(orderId, pending.reference);
    verify
      .then(() => refresh())
      .catch(() => setError("Could not confirm payment yet. If you were charged, this will update shortly."))
      .finally(() => {
        setVerifyingPayment(false);
        window.history.replaceState(null, "", window.location.pathname);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, right after returning from Paystack for this order
  }, []);

  async function handlePayBalanceWallet() {
    setError(""); setBusy(true);
    try {
      await api.payBalance(orderId);
      await refresh();
    } catch (e) {
      setError("Payment failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePayBalanceTransfer() {
    setError(""); setBusy(true);
    try {
      const data = await api.checkoutBalance(orderId);
      // Paystack callback returns to /orders/{id}?order_ref=… so this screen
      // remounts and verifies from the URL — no pending-order localStorage.
      window.location.href = data.authorization_url;
    } catch (e) {
      setError("Could not start payment: " + e.message);
      setBusy(false);
    }
  }

  async function handlePayDepositWallet() {
    setError(""); setBusy(true);
    try {
      await api.payDeposit(orderId);
      await refresh();
    } catch (e) {
      setError("Deposit payment failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePayDepositTransfer() {
    setError(""); setBusy(true);
    try {
      const data = await api.checkoutDeposit(orderId);
      window.location.href = data.authorization_url;
    } catch (e) {
      setError("Could not start payment: " + e.message);
      setBusy(false);
    }
  }

  async function handleDecide(itemId, decision) {
    setError(""); setBusy(true);
    try {
      await api.decideItem(orderId, itemId, decision);
      await refresh();
    } catch (e) {
      setError("Could not record your choice: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelivery() {
    setError(""); setBusy(true);
    try {
      await api.confirmDelivery(orderId);
      await refresh();
    } catch (e) {
      setError("Could not confirm delivery: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // #7: feedback only - never touches assignment or agent pay, purely a
  // rating record for this order.
  async function handleSubmitRating() {
    setError(""); setBusy(true);
    try {
      await api.rateAgent(orderId, draftStars, draftComment.trim() || null);
      setDraftStars(0);
      setDraftComment("");
      await loadRating();
    } catch (e) {
      setError("Could not submit your rating: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAcceptAgent() {
    setError(""); setBusy(true);
    try {
      await api.acceptProposedAgent(orderId);
      setAssignmentNotice("");
      setProposedAgent(null);
      await refresh();
    } catch (e) {
      setError("Could not accept this agent: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSeeAnother() {
    setError(""); setBusy(true);
    try {
      const result = await api.seeAnotherAgent(orderId);
      if (result.outcome === "only_option") {
        setAssignmentNotice(`No other agents available in this market — ${proposedAgent?.full_name || "this agent"} is your only option.`);
      } else if (result.outcome === "none") {
        setAssignmentNotice("No agents available for this market right now.");
      } else {
        setAssignmentNotice("");
      }
      setOrder(result.order);
      if (result.order.status === "proposed") await loadProposedAgent();
      else setProposedAgent(null);
    } catch (e) {
      setError("Could not look for another agent: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRaiseCap() {
    setError(""); setBusy(true);
    try {
      await api.raiseCap(orderId, raiseAmount);
      if (pendingOverage) await api.markRead(pendingOverage.id).catch(() => {});
      setRaiseAmount("");
      setPendingOverage(null);
      await refresh();
    } catch (e) {
      setError("Could not approve increase: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // #5: per-item overage - a single item's real price came in above what
  // was listed for it (distinct from the whole-order cap above).
  async function handleItemOverageDecide(itemId, decision) {
    setError(""); setBusy(true);
    try {
      await api.decideItemOverage(orderId, itemId, decision);
      await refresh();
    } catch (e) {
      setError("Could not record your decision: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Mid-order item addition - unlike the other handlers here, this one
  // deliberately does NOT catch its own errors into the page-level `error`
  // banner: ShoppingFeed's add-item modal shows the failure inline (wrong
  // place to lose a half-filled form to a banner at the top of the page),
  // so the error needs to propagate back to it, not be swallowed here.
  async function handleAddItem(item) {
    setBusy(true);
    try {
      await api.addOrderItem(orderId, item);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-faint">
        <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p>Loading order…</p>
      </div>
    );
  }

  const items = order.items || [];
  const depositPaid = !!order.deposit_paid_at;
  const needsDeposit = Number(order.deposit_amount) > 0 && !depositPaid;
  const isPriced = !UNPRICED_STATUSES.has(order.status);
  // Amount due must never render negative - a paid deposit can equal but
  // never exceed grand_total once shopping's finished (finish_shopping caps
  // it), but clamp defensively anyway rather than trust that invariant here.
  const amountDue = isPriced
    ? Math.max(0, Number(order.grand_total) - (depositPaid ? Number(order.deposit_amount) : 0))
    : 0;
  // Summary, not a dump: combined fee + EMTL + transfer fees fold into one
  // "Fees" line for the customer. The full per-transfer breakdown still
  // exists in the database untouched - this just isn't the screen for it.
  const fees = Number(order.combined_fee) + Number(order.emtl_total) + Number(order.transfer_fees_total);
  const goodsEstimate = Math.max(0, Number(order.estimated_value) - DELIVERY_QUOTE - COMBINED_FEE_ESTIMATE);
  // Derived from the REAL order, never hardcoded - a flagged (must_prepay)
  // customer's deposit is 100% of the estimate, not the normal 20%, and a
  // fixed "20%" string here would just be wrong for them. See
  // orders.fees.required_deposit for the source of truth this mirrors.
  const depositPct = Number(order.estimated_value) > 0
    ? Math.round((Number(order.deposit_amount) / Number(order.estimated_value)) * 100)
    : 0;
  const isPaidOrLater = PAID_OR_LATER.has(order.status);
  // The live shopping view: the agent is buying (or has just finished and the
  // bill's coming). Purchases + real prices + savings tally in place of the
  // plain pre-shopping list.
  const showShoppingFeed = order.status === "shopping" || order.status === "awaiting_payment";
  const pendingDecisionCount = items.filter((it) => it.availability === "unavailable").length;
  // #5: items with a pending per-item overage - derived straight from the
  // order itself (not a notification fetch), so it's always in sync with
  // what the agent can actually see, and survives a missed/dismissed toast.
  const pendingItemOverages = items.filter((it) => it.availability === "overage_pending");
  // #1: chat is scoped to the shopping window - see isChatAvailable.
  const showChat = isChatAvailable(order.status);
  // Cancelled/cancelled_unpaid/disputed - none of these are "unpriced" (so
  // isPriced is true) and none are PAID_OR_LATER, so without an explicit
  // check they fell through BOTH gates at once: the pre-shopping "Your
  // list / Deposit / Order estimate" row AND the priced "Order summary"
  // card rendered simultaneously, showing two conflicting views of the
  // same stopped order. Give exception statuses their own dedicated card
  // instead of relying on the normal statuses' gates to happen to exclude them.
  const isException = isExceptionOrder(order.status);

  // Light tint now, not a dark-ink fallback - cream/white surfaces only,
  // per the app's no-dark-surfaces rule. Text over this hero is dark ink,
  // not white, to match.
  const heroBody = isPaidOrLater
    ? "Live delivery status below — packaging, handover code, and confirm on arrival."
    : "Your agent is on it — items and any approvals needed appear below as they come in.";

  // State-aware hero art: the illustration should show what's actually
  // happening to this order right now, not one generic image for every
  // status.
  const heroIllustration =
    order.status === "delivered" || order.status === "closed"
      ? orderHandoff
      : order.status === "out_for_delivery" || order.status === "packed" || order.status === "paid"
        ? riderScooter
        : order.status === "shopping" || order.status === "awaiting_payment"
          ? agentCustomerConversation
          : personShoppingList;

  return (
    // `animate-reveal-up` - a one-time entrance (fade + rise, the app's
    // premium easing) that plays when this screen actually mounts, i.e.
    // once per navigation into an order, not on every 5s poll refresh
    // (React doesn't replay a CSS animation on a re-render of the same DOM
    // node, only on a genuine mount). Gives "opening an order" its own
    // distinct, deliberate feel instead of the plain instant page-swap it
    // had before - the same tool ShopHeroSpotlight-adjacent screens
    // already reach for elsewhere.
    <div className="animate-reveal-up">
      {/* The same illustrated HeroBanner the Shop page and Track lead with -
          this used to be a market cover PHOTO behind a gradient bleed, which
          was the one banner in the app not built from the illustration
          system everything else uses. The market's identity now rides in the
          badge row (its own art + name + status) and the right-hand column
          carries a state-aware illustration instead: who's doing what to
          your order right now. */}
      <HeroBanner
        leading={
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-surface pl-2.5 pr-4 text-sm font-bold text-ink transition hover:bg-sunken-2"
          >
            <Icon name="chevronDown" className="h-4 w-4 rotate-90" />
            Back
          </button>
        }
        badge={
          <div className="flex flex-wrap items-center gap-2">
            {market ? (
              <MarketArt
                tone={marketTone(market.name, market.city)}
                title={market.name}
                image={coverImageForMarket(market)}
                compact
                className="h-8 w-8 shrink-0 rounded-full"
              />
            ) : null}
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              {market?.name || "Order"} · #{order.id.slice(0, 8)}
            </span>
            <StatusBadge status={order.status} />
          </div>
        }
        title={summarizeOrderStatus({ ...order, marketName: market?.name })}
        body={heroBody}
        illustration={heroIllustration}
        illustrationAlt=""
        actions={
          !isException && (assignedAgent || showChat) ? (
            <>
              {assignedAgent && (
                <div className="inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-surface py-1 pl-1 pr-4">
                  <Avatar src={assignedAgent.avatar_url} name={assignedAgent.full_name} className="h-9 w-9" />
                  <span className="min-w-0 leading-tight">
                    <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-faint">Your agent</span>
                    <span className="block truncate text-sm font-bold text-ink">{assignedAgent.full_name || "Your agent"}</span>
                  </span>
                </div>
              )}
              {/* Labelled - an icon alone left people guessing what it was.
                  Mounted only here: ChatPanel registers this order with the
                  shell's ChatDock on mount, so it must render exactly once. */}
              {showChat && <ChatPanel orderId={orderId} variant="pill" label="Chat with agent" person={assignedAgent} />}
            </>
          ) : undefined
        }
      />

      {verifyingPayment && (
        <p className="mb-4 rounded-lg bg-brand-orange/15 px-3 py-2 text-sm text-brand-orange-dark">Confirming your payment…</p>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {/* Stopped order - cancelled, cancelled-unpaid, or under dispute. One
          plain card explaining what happened, nothing else: no item list,
          no payment prompts, no money summary that might mix pre-shopping
          estimate numbers with whatever the order happened to reach before
          it stopped. Red, not peach - this is PROBLEM territory per
          StatusBadge's own color mapping, not a normal in-progress state. */}
      {isException && (
        <Card className="border-transparent bg-red-50">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
              <Icon name="alert" className="h-4 w-4" />
            </span>
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">
              {order.status === "disputed" ? "Order under review" : "Order cancelled"}
            </p>
          </div>
          <p className="text-ink/80">
            {order.status === "disputed"
              ? "Our team is looking into this order. If you have photos or details that could help, send them in chat or reach support."
              : order.status === "cancelled_unpaid"
                ? "This order was cancelled after payment wasn't completed in time."
                : "This order was cancelled."}
          </p>
        </Card>
      )}

      {/* Propose->accept, as a focused modal: blurs the page and demands a
          decision (Accept / See another) rather than sitting inline as one
          card among several. Only opens once any required deposit is
          already paid (#8 - deposit before assignment) - while a deposit is
          still owed, the deposit card further down is the only thing shown;
          the agent stays hidden until it's cleared. No `onClose` on
          purpose: this can only be resolved via Accept or See another, not
          dismissed. No photo infrastructure exists in this app, so only
          name/phone are shown. */}
      <Modal open={order.status === "proposed" && !needsDeposit} title="Your shopping agent">
        {proposedAgent ? (
          <div className="mb-3 flex items-center gap-3">
            <Avatar src={proposedAgent.avatar_url} name={proposedAgent.full_name} className="h-14 w-14 text-base" iconClassName="h-6 w-6" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{proposedAgent.full_name || "Unnamed agent"}</p>
              <p className="text-sm text-faint">{proposedAgent.phone}</p>
            </div>
          </div>
        ) : (
          <p className="mb-3 text-sm text-faint">Looking for an available agent…</p>
        )}
        {assignmentNotice && (
          <p className="mb-3 rounded-lg bg-brand-orange/15 px-3 py-2 text-sm text-brand-orange-dark">{assignmentNotice}</p>
        )}
        <div className="flex gap-2">
          <Button onClick={handleAcceptAgent} busy={busy} disabled={!proposedAgent} className="flex-1">
            Accept
          </Button>
          <Button variant="neutral" onClick={handleSeeAnother} busy={busy} disabled={!proposedAgent} className="flex-1">
            See another
          </Button>
        </div>
      </Modal>

      {!isException && (
      <>
      {/* Anything that blocks progress or needs an immediate decision stays
          full-width, above the two-column split below - these are never
          "just another card" among the order's normal content. */}
      <div className="space-y-4">
        {/* #5: per-item overage - persistent, must-respond, one card per
            pending item so several overages at once are never hidden behind
            each other. The agent keeps shopping other items while this
            waits; an unanswered one is simply skipped, never bought. */}
        {pendingItemOverages.map((item) => {
          const extra = Number(item.overage_requested_price) - Number(item.listed_price);
          return (
            // Soft peach tile + icon well, NOT a 2px outlined alert box -
            // nothing in the Shop design uses a thick coloured border, and
            // attention here reads better as warmth than as a warning frame.
            <Card key={item.id} className="border-transparent bg-brand-orange/[0.12]">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[#1A1A1A]">
                  <Icon name="alert" className="h-4 w-4" />
                </span>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-orange-dark">
                  Price approval needed
                </p>
              </div>
              <div className="mb-3 flex items-center gap-3 rounded-2xl bg-surface/70 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken-2 p-1.5">
                  <Image src={illustrationForItem(item.description)} alt="" className="h-full w-full object-contain" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{item.description}</p>
                  <p className="text-sm text-muted">
                    ₦{item.overage_requested_price} at the stall · ₦{extra.toFixed(2)} over your ₦
                    {item.listed_price}
                  </p>
                </div>
              </div>
              <p className="mb-3 text-sm text-muted">
                You can hop on a call to confirm the price with the seller directly.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleItemOverageDecide(item.id, "approved")}
                  busy={busy}
                  className="flex-1"
                >
                  Approve extra ₦{extra.toFixed(2)}
                </Button>
                <Button
                  variant="neutral"
                  onClick={() => handleItemOverageDecide(item.id, "declined")}
                  busy={busy}
                  className="flex-1"
                >
                  Skip this item
                </Button>
              </div>
            </Card>
          );
        })}

      </div>

      {/* "Your list", "Deposit required" and "Order estimate" in one row -
          this is the pre-shopping trio: nothing's been bought yet, so there's
          no live feed/final bill to show, just what you asked for, what it'll
          roughly cost, and what's standing between here and an agent
          shopping it. Once shopping actually starts, the list becomes the
          live ShoppingFeed and the deposit's already paid, so this row only
          makes sense before that - same condition the old plain "Your list"
          view used. */}
      {!isPaidOrLater && !showShoppingFeed && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="flex flex-col">
            <SectionHeader icon="basket" title="Your list ({items.length})" className="mb-3" />
            <div className="-mx-5 max-h-64 divide-y divide-dashed divide-line-strong overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} id={`item-${item.id}`} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sunken-2 p-1">
                    <Image src={illustrationForItem(item.description)} alt="" className="h-full w-full object-contain" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{item.description}</p>
                    {item.requested_note && (
                      <p className="truncate text-xs text-faint">{item.requested_note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Prominent: while proposed, this is the ONLY step standing
              between here and the agent-selection modal above, which stays
              closed until it's paid (#8: deposit before assignment). Once
              agent_assigned, it's still here in case it's somehow still
              unpaid (shopping can't start until it is - agent's
              start-shopping 402s otherwise). */}
          {needsDeposit && (
            <Card className="border-transparent bg-brand-orange/[0.12]">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[#1A1A1A]">
                  <Icon name="wallet" className="h-4 w-4" />
                </span>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-orange-dark">
                  Deposit required
                </p>
              </div>
              <p className="mb-3 text-sm text-ink/80">
                {depositPct >= 99
                  ? "Full payment upfront (a previous order wasn't paid) "
                  : `${depositPct}% upfront `}
                {order.status === "proposed"
                  ? "before you can see and accept your shopping agent."
                  : "before shopping can start."}
              </p>
              <PaymentChooser
                amountDue={Number(order.deposit_amount)}
                walletBalance={walletBalance}
                onPayWallet={handlePayDepositWallet}
                onPayTransfer={handlePayDepositTransfer}
                onTopUp={onTopUpWallet}
                busy={busy}
              />
            </Card>
          )}

          <Card>
            <SectionHeader icon="chart" title="Order estimate" className="mb-2" />
            <div className="space-y-1 text-muted">
              <div className="flex justify-between"><span>Goods estimate</span><span className="font-semibold">₦{goodsEstimate.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Delivery quote</span><span className="font-semibold">₦{DELIVERY_QUOTE.toFixed(2)}</span></div>
              {/* No grand total shown here on purpose - the service fee is
                  time-based and unknown until shopping finishes, so a number
                  shown now wouldn't match the real bill later. See the same
                  reasoning in NewOrderFlow.jsx's quote screen. */}
              {depositPaid && (
                <div className="flex justify-between">
                  <span>Deposit</span>
                  <span className="font-semibold">₦{order.deposit_amount} (paid)</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Status</span>
                <StatusBadge status={order.status} />
              </div>
            </div>
            <p className="mt-2 text-xs text-faint">Final fees and total are set once shopping is finished.</p>
          </Card>
        </div>
      )}

      {/* Everything else splits into "what's happening" (wide, left - the
          timeline and the items themselves) and "manage this order"
          (narrow, right - chat, payment, the money summary), the way an
          order-tracking page should read instead of one long undifferentiated
          stack of cards. On mobile the sidebar surfaces FIRST (chat and
          payment shouldn't require scrolling past the whole item list to
          find), and it stays in view while scrolling on desktop. */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          {/* Status/tracking screen — vertical timeline, packaging countdown,
              packing photos, handover code, confirm-delivery action. Covers
              PAID onward, so the customer is never in the dark right after
              paying. */}
          {isPaidOrLater && (
            <DeliveryTracking
              order={order}
              onConfirmDelivery={handleConfirmDelivery}
              busy={busy}
            />
          )}

          {/* Aggregate signal so a decision-needed item is never just
              something to stumble across while scrolling the list below. */}
          {!isPaidOrLater && pendingDecisionCount > 0 && (
            <button
              onClick={() => {
                const first = items.find((it) => it.availability === "unavailable");
                if (first) document.getElementById(`item-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-brand-orange/[0.12] px-4 py-3 text-left transition hover:bg-brand-orange/20"
            >
              {/* `text-[#1A1A1A]` (dark ink), not `text-white` - white on
                  the light `brand-orange` fill is weak contrast; every
                  other solid-peach fill in the app (Button's primary
                  variant, the sidebar's active pill) pairs it with dark
                  ink text instead, per the same convention. */}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-[#1A1A1A]">
                {pendingDecisionCount}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-ink">
                  {pendingDecisionCount === 1 ? "1 item needs your decision" : `${pendingDecisionCount} items need your decision`}
                </span>
                <span className="block text-xs text-muted">Tap to jump to it</span>
              </span>
              <Icon name="chevronDown" className="h-4 w-4 shrink-0 -rotate-90 text-brand-orange-dark" />
            </button>
          )}

          {/* Post-payment: bought/not-bought checklist with each stall's
              purchase photo as proof. While shopping (or awaiting payment):
              the live feed — real prices vs the customer's estimate, photos,
              a running savings tally. Before shopping starts: the plain list. */}
          {isPaidOrLater ? (
            <PurchaseChecklist items={items} purchases={purchases} />
          ) : showShoppingFeed ? (
            <ShoppingFeed
              items={items}
              purchases={purchases}
              onDecide={handleDecide}
              onAddItem={handleAddItem}
              busy={busy}
              status={order.status}
            />
          ) : null}
        </div>

        <div className="order-1 flex flex-col gap-4 lg:order-2 lg:sticky lg:top-6">
          {/* Spending cap: only relevant while shopping is in progress. Alert
              state (brand-orange border, headline, the agent's actual
              message) whenever there's an unread overage_approval for this
              order - persists here regardless of whether the toast was
              dismissed. */}
          {order.status === "shopping" && authorization && (
            <Card className={pendingOverage ? "border-transparent bg-brand-orange/[0.12]" : ""}>
              {pendingOverage ? (
                <>
                  <div className="mb-2 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[#1A1A1A]">
                      <Icon name="alert" className="h-4 w-4" />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-orange-dark">
                      Your agent needs approval
                    </p>
                  </div>
                  <p className="mb-3 text-ink/80">{pendingOverage.message}</p>
                </>
              ) : (
                // Icon-well + title, the same "feature badge" pattern
                // ShopHeroSpotlight's own cards use, instead of a bare bold
                // line of text - every right-column card gets this now.
                <SectionHeader icon="wallet" title="Spending approval" className="mb-3" />
              )}
              <div className="flex justify-between text-muted">
                <span>Cap</span>
                <span className="font-semibold">₦{authorization.cap}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Spent so far</span>
                <span className="font-semibold">₦{authorization.spent}</span>
              </div>
              <Input
                placeholder="Amount to approve (₦)"
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(e.target.value)}
                className="mt-3 mb-2"
              />
              <Button onClick={handleRaiseCap} busy={busy} disabled={!raiseAmount} fullWidth>
                {pendingOverage ? "Approve increase now" : "Approve increase"}
              </Button>
            </Card>
          )}

          {order.status === "awaiting_payment" && (
            <Card>
              <SectionHeader icon="wallet" title="Pay balance" className="mb-3" />
              <PaymentChooser
                amountDue={amountDue}
                walletBalance={walletBalance}
                onPayWallet={handlePayBalanceWallet}
                onPayTransfer={handlePayBalanceTransfer}
                onTopUp={onTopUpWallet}
                busy={busy}
              />
            </Card>
          )}

          {/* Money summary — a summary, not the raw per-transfer breakdown.
              The full ledger (every transfer, fee, EMTL line) stays in the
              database exactly as recorded; this is just the readable version.
              Pre-shopping, none of items_total/combined_fee/delivery_fee/
              grand_total exist yet (finish_shopping is what sets them) - show
              the estimate instead of a card full of misleading ₦0.00 lines. */}
          {isPriced ? (
            <Card>
              <SectionHeader icon="chart" title="Order summary" className="mb-2" />
              <div className="space-y-1 text-muted">
                <div className="flex justify-between"><span>Goods total</span><span className="font-semibold">₦{order.items_total}</span></div>
                <div className="flex justify-between"><span>Fees</span><span className="font-semibold">₦{fees.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span className="font-semibold">₦{order.delivery_fee}</span></div>
                <div className="flex justify-between border-t border-line pt-1 text-ink">
                  <span className="font-semibold">Grand total</span>
                  <span className="font-bold">₦{order.grand_total}</span>
                </div>
                {Number(order.deposit_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>Deposit</span>
                    <span className="font-semibold">₦{order.deposit_amount} {depositPaid ? "(paid)" : "(unpaid)"}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg text-ink">
                  <span className="font-semibold">Amount due</span>
                  <span className="font-bold">₦{amountDue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </Card>
          ) : showShoppingFeed ? (
            // Pre-shopping, this same card lives in the "Your list / Deposit
            // required / Order estimate" row above instead - it only
            // reappears here once shopping's actually under way (still
            // unpriced, but the row above no longer renders since the list
            // has become the live ShoppingFeed by then).
            <Card>
              <SectionHeader icon="chart" title="Order estimate" className="mb-2" />
              <div className="space-y-1 text-muted">
                <div className="flex justify-between"><span>Goods estimate</span><span className="font-semibold">₦{goodsEstimate.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Delivery quote</span><span className="font-semibold">₦{DELIVERY_QUOTE.toFixed(2)}</span></div>
                {depositPaid && (
                  <div className="flex justify-between">
                    <span>Deposit</span>
                    <span className="font-semibold">₦{order.deposit_amount} (paid)</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Status</span>
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <p className="mt-2 text-xs text-faint">Final fees and total are set once shopping is finished.</p>
            </Card>
          ) : null}

          {/* #7: agent rating - customer feedback only, once the order is
              genuinely finished. Never feeds assignment or agent pay. Once
              submitted, just a small read-only display here - the pop-up
              prompt (below, outside this list) is only for COLLECTING one. */}
          {isRateable(order.status) && rating && (
            <Card>
              <SectionHeader icon="star" title="Your rating" className="mb-2" />
              <StarRating value={rating.stars} readOnly size={22} />
              {rating.comment && <p className="mt-2 text-sm text-muted">{rating.comment}</p>}
            </Card>
          )}
        </div>
      </div>
      </>
      )}

      {/* #7: the rating pop-up itself - a prompt, not an inline section.
          Feedback only, so it's freely dismissible (onClose) rather than
          forced like the agent-selection modal above. */}
      <Modal
        open={isRateable(order.status) && !rating && !ratingPromptDismissed}
        onClose={() => setRatingPromptDismissed(true)}
        title="Rate your agent"
      >
        <StarRating value={draftStars} onChange={setDraftStars} />
        <textarea
          value={draftComment}
          onChange={(e) => setDraftComment(e.target.value)}
          placeholder="Optional comment"
          rows={3}
          className="mt-3 w-full rounded-xl border border-line-strong px-4 py-3 text-base text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-brand-orange"
        />
        <Button
          onClick={handleSubmitRating}
          busy={busy}
          disabled={draftStars === 0}
          fullWidth
          className="mt-3"
        >
          Submit rating
        </Button>
      </Modal>
    </div>
  );
}

export default OrderDetail;
